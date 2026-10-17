Const {
  Default: makeWASocket,
  UseMultiFileAuthState,
  DisconnectReason,
  FetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
Const pino = require("pino");
Const fs = require("fs");
Const path = require("path");
Const { handleMenuCommand } = require("./commands/menu.js");
Const { handleFullppCommand } = require("./commands/fullpp.js");

Const PHONE_NUMBER = String(require("./phone") || "").replace(/\D/g, "");
Const OWNER_NUMBER = PHONE_NUMBER;
Const AUTH_DIR = path.join(__dirname, "auth_info");
Const SESSION_ROOT = path.join(__dirname, "auth_sessions");
Const SESSION_REGISTRY = path.join(SESSION_ROOT, "numbers.json");
Const SETTINGS_PATH = path.join(__dirname, "settings.json");

Const reconnectingSessions = new Set();
If (!global.botStartTime) global.botStartTime = Date.now();

Function loadSettings() {
  Try {
    Const saved = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    Return { 
      Status: saved.status !== false, 
      Online: saved.online === true, 
      Prefix: typeof saved.prefix === "string" ? saved.prefix : "." 
    };
  } catch {
    Return { status: true, online: false, prefix: "." };
  }
}

Const botSettings = loadSettings();

Function saveSettings() {
  Try { 
    Fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ 
      Status: botSettings.status, 
      Online: botSettings.online, 
      Prefix: botSettings.prefix 
    }, null, 2)); 
  } catch (e) { 
    Console.error("SETTINGS SAVE ERROR:", e?.message || e); 
  }
}

Function getText(msg) {
  Let m = msg?.message || {};
  For (let i = 0; i < 5; i++) {
    Const wrapped = m.ephemeralMessage?.message ||
      M.viewOnceMessage?.message ||
      M.viewOnceMessageV2?.message ||
      M.documentWithCaptionMessage?.message;
    If (!wrapped) break;
    M = wrapped;
  }
  Return String(
    M.conversation ||
    M.extendedTextMessage?.text ||
    M.imageMessage?.caption ||
    M.videoMessage?.caption ||
    M.documentMessage?.caption ||
    M.buttonsResponseMessage?.selectedButtonId ||
    M.templateButtonReplyMessage?.selectedId ||
    M.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ""
  ).trim();
}

Function getCommandSenderNumber(msg, jid, sessionNumber) {
  Const senderJid = msg?.key?.fromMe
    ? `${String(sessionNumber || "").replace(/\D/g, "")}@s.whatsapp.net`
    : (msg?.key?.participant || jid || "");
  Return String(senderJid).split("@")[0].replace(/\D/g, "");
}

Function isOwnerCommand(msg, jid, sessionNumber) {
  Const senderNumber = getCommandSenderNumber(msg, jid, sessionNumber);
  Return Boolean(OWNER_NUMBER && senderNumber && senderNumber === OWNER_NUMBER);
}

Function readSessionNumbers() {
  Try {
    Const list = JSON.parse(fs.readFileSync(SESSION_REGISTRY, "utf8"));
    Return Array.isArray(list) ? [...new Set(list.map(v => String(v).replace(/\D/g, "")).filter(v => /^\d{10,15}$/.test(v) && v !== OWNER_NUMBER))] : [];
  } catch { return []; }
}

Async function start(sessionPhone = PHONE_NUMBER, sessionDir = AUTH_DIR) {
  Const number = String(sessionPhone || "").replace(/\D/g, "");
  If (!/^\d{10,15}$/.test(number)) throw new Error("Invalid WhatsApp phone number in phone file.");
  
  Const sessionKey = path.resolve(sessionDir);
  If (reconnectingSessions.has(sessionKey)) return;
  ReconnectingSessions.add(sessionKey);

  Const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  Let version;
  Try { ({ version } = await fetchLatestBaileysVersion()); } catch {}

  Const sock = makeWASocket({
    Auth: state,
    ...(version ? { version } : {}),
    Logger: pino({ level: "silent" }),
    PrintQRInTerminal: false,
    MarkOnlineOnConnect: false,
    EmitOwnEvents: true,
    SyncFullHistory: false,
    GenerateHighQualityLinkPreview: false
  });

  Sock.ev.on("creds.update", saveCreds);

  Let onlinePresenceTimer = null;
  Async function applyOnlinePresence() {
    Try { 
      Await sock.sendPresenceUpdate(botSettings.online ? "available" : "unavailable"); 
    } catch (e) {}
  }

  Function syncOnlinePresence() {
    If (onlinePresenceTimer) clearInterval(onlinePresenceTimer);
    OnlinePresenceTimer = null;
    ApplyOnlinePresence().catch(() => {});
    If (botSettings.online) {
      OnlinePresenceTimer = setInterval(() => {
        ApplyOnlinePresence().catch(() => {});
      }, 25000);
      If (typeof onlinePresenceTimer.unref === "function") onlinePresenceTimer.unref();
    }
  }

  If (!state.creds.registered) {
    SetTimeout(async () => {
      Try {
        Const code = await sock.requestPairingCode(number);
        Console.log(`\nDEVA XMD-BOT pairing code for +${number}: ${code}`);
        Console.log("WhatsApp > Linked devices > Link a device > Link with phone number");
      } catch (e) { console.error("PAIRING ERROR:", e?.message || e); }
    }, 3000);
  }

  Sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    If (connection === "open") {
      ReconnectingSessions.delete(sessionKey);
      SyncOnlinePresence();
      Console.log(`
██████████████████████████████████████

         👑 DEVA XMD BOT 👑

██████████████████████████████████████
✓ WhatsApp Connected
✓ Database Connected
✓ Plugins Loaded
✓ Commands Registered
✓ Bot Started Successfully

Status : ONLINE ✓ +${number}`);
    }
    If (connection === "close") {
      If (onlinePresenceTimer) clearInterval(onlinePresenceTimer);
      OnlinePresenceTimer = null;
      ReconnectingSessions.delete(sessionKey);
      Const statusCode = lastDisconnect?.error?.output?.statusCode;
      If (statusCode !== DisconnectReason.loggedOut) {
        SetTimeout(() => start(number, sessionDir).catch(() => {}), 2000);
      } else {
        Console.error(`WhatsApp session logged out: +${number}`);
      }
    }
  });

  Sock.ev.on("messages.upsert", async ({ messages }) => {
    For (const msg of messages || []) {
      Try {
        If (!msg?.message) continue;

        Const jid = msg.key?.remoteJid || "";

        // Status Seen Handler
        If (botSettings.status && (jid === "status@broadcast" || jid.endsWith("@broadcast"))) {
          Sock.readMessages([msg.key]).catch(() => {});
          Continue;
        }

        If (jid.endsWith("@g.us") || jid.endsWith("@broadcast") || jid.endsWith("@newsletter")) continue;

        Const text = getText(msg);
        If (!text) continue;

        Const prefix = botSettings.prefix || "";
        Const trimmed = text.trim();

        // Prefix validation check
        If (prefix) {
          If (!trimmed.startsWith(prefix)) continue;
        }

        Const commandText = (prefix && trimmed.startsWith(prefix)
          ? Trimmed.slice(prefix.length)
          : Trimmed).trim().toLowerCase();

        Const ownerOnlyCommands = new Set([
          "fullpp",
          "online on", "online off",
          "status on", "status off",
          "status seen on", "status seen off",
          "prefix"
        ]);

        If (ownerOnlyCommands.has(commandText) && !isOwnerCommand(msg, jid, number)) {
          Await sock.sendMessage(jid, {
            Text: "⛔ Oɴʟʏ ᴛʜᴇ Bᴏᴛ Oᴡɴᴇʀ ᴄᴀɴ ᴜꜱᴇ ᴛHɪꜱ Cᴏᴍᴍᴀɴᴅ"
          }, { quoted: msg });
          Continue;
        }

        // Handle dynamic prefix configuration (.prefix <symbol> or .prefix null)
        If (commandText.startsWith("prefix")) {
          Const args = trimmed.split(" ");
          If (args.length > 1) {
            Const newPrefixArg = args[1].trim();
            If (newPrefixArg.toLowerCase() === "null") {
              BotSettings.prefix = "";
              SaveSettings();
              Await sock.sendMessage(jid, { text: "✅ Prefix removed successfully! Now commands work without any prefix." }, { quoted: msg });
            } else {
              BotSettings.prefix = newPrefixArg;
              SaveSettings();
              Await sock.sendMessage(jid, { text: `✅ Prefix updated successfully to: ${botSettings.prefix}` }, { quoted: msg });
            }
          } else {
            Await sock.sendMessage(jid, { text: `⚙️ Current Bot Prefix: ${botSettings.prefix ? botSettings.prefix : "None (Blank)"}` }, { quoted: msg });
          }
          Continue;
        }

        If (commandText === "menu") {
          Await handleMenuCommand({ sock, jid, quoted: msg, botSettings });
          Continue;
        }
        If (commandText === "ping") {
          Const started = Date.now();
          Await sock.sendMessage(jid, { text: `🏓 Pong!\n⏱️ *_DEVA XMD BOT Sᴘᴇᴇᴅ: ${Date.now() - started} Mꜱ_*` }, { quoted: msg });
          Continue;
        }
        If (commandText === "alive") {
          Const totalSeconds = Math.floor((Date.now() - global.botStartTime) / 1000);
          Const hours = Math.floor(totalSeconds / 3600);
          Const minutes = Math.floor((totalSeconds % 3600) / 60);
          Const seconds = totalSeconds % 60;
          Await sock.sendMessage(jid, {
            Text: `I'm here and ready 🚀\nUptime : ${hours} hours ${minutes ? `${minutes} minutes ` : ""}${seconds} seconds`
          }, { quoted: msg });
          Continue;
        }
        If (commandText === "fullpp") {
          Await handleFullppCommand({ sock, jid, quoted: msg, msg, prefix });
          Continue;
        }
        If (commandText === "online on") {
          BotSettings.online = true; saveSettings();
          SyncOnlinePresence();
          Await sock.sendMessage(jid, { text: "✅ Always Online: ON" }, { quoted: msg });
          Continue;
        }
        If (commandText === "online off") {
          BotSettings.online = false; saveSettings();
          SyncOnlinePresence();
          Await sock.sendMessage(jid, { text: "✅ Always Online: OFF" }, { quoted: msg });
          Continue;
        }
        If (commandText === "status on" || commandText === "status seen on") {
          BotSettings.status = true; saveSettings();
          Await sock.sendMessage(jid, { text: "✅ Auto Status Seen: ON" }, { quoted: msg });
          Continue;
        }
        If (commandText === "status off" || commandText === "status seen off") {
          BotSettings.status = false; saveSettings();
          Await sock.sendMessage(jid, { text: "✅ Auto Status Seen: OFF" }, { quoted: msg });
          Continue;
        }
      } catch (e) {
        // Silenced minor message errors
      }
    }
  });
}

Process.on("uncaughtException", () => {});
Process.on("unhandledRejection", () => {});

Start().then(() => {
  For (const number of readSessionNumbers()) {
    Const sessionDir = path.join(SESSION_ROOT, number);
    If (fs.existsSync(path.join(sessionDir, "creds.json"))) {
      Start(number, sessionDir).catch(() => {});
    }
  }
}).catch(() => { process.exit(1); });
