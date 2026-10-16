const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { handleMenuCommand } = require("./commands/menu.js");
const { handleFullppCommand } = require("./commands/fullpp.js");

const PHONE_NUMBER = String(require("./phone") || "").replace(/\D/g, "");
const OWNER_NUMBER = PHONE_NUMBER;
const AUTH_DIR = path.join(__dirname, "auth_info");
const SESSION_ROOT = path.join(__dirname, "auth_sessions");
const SESSION_REGISTRY = path.join(SESSION_ROOT, "numbers.json");
const SETTINGS_PATH = path.join(__dirname, "settings.json");

const reconnectingSessions = new Set();
if (!global.botStartTime) global.botStartTime = Date.now();

function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    return { 
      status: saved.status !== false, 
      online: saved.online === true, 
      prefix: typeof saved.prefix === "string" ? saved.prefix : "." 
    };
  } catch {
    return { status: true, online: false, prefix: "." };
  }
}

const botSettings = loadSettings();

function saveSettings() {
  try { 
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ 
      status: botSettings.status, 
      online: botSettings.online, 
      prefix: botSettings.prefix 
    }, null, 2)); 
  } catch (e) { 
    console.error("SETTINGS SAVE ERROR:", e?.message || e); 
  }
}

function getText(msg) {
  let m = msg?.message || {};
  for (let i = 0; i < 5; i++) {
    const wrapped = m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.documentWithCaptionMessage?.message;
    if (!wrapped) break;
    m = wrapped;
  }
  return String(
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ""
  ).trim();
}

function getCommandSenderNumber(msg, jid, sessionNumber) {
  const senderJid = msg?.key?.fromMe
    ? `${String(sessionNumber || "").replace(/\D/g, "")}@s.whatsapp.net`
    : (msg?.key?.participant || jid || "");
  return String(senderJid).split("@")[0].replace(/\D/g, "");
}

function isOwnerCommand(msg, jid, sessionNumber) {
  const senderNumber = getCommandSenderNumber(msg, jid, sessionNumber);
  return Boolean(OWNER_NUMBER && senderNumber && senderNumber === OWNER_NUMBER);
}

function readSessionNumbers() {
  try {
    const list = JSON.parse(fs.readFileSync(SESSION_REGISTRY, "utf8"));
    return Array.isArray(list) ? [...new Set(list.map(v => String(v).replace(/\D/g, "")).filter(v => /^\d{10,15}$/.test(v) && v !== OWNER_NUMBER))] : [];
  } catch { return []; }
}

async function start(sessionPhone = PHONE_NUMBER, sessionDir = AUTH_DIR) {
  const number = String(sessionPhone || "").replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(number)) throw new Error("Invalid WhatsApp phone number in phone file.");
  
  const sessionKey = path.resolve(sessionDir);
  if (reconnectingSessions.has(sessionKey)) return;
  reconnectingSessions.add(sessionKey);

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch {}

  const sock = makeWASocket({
    auth: state,
    ...(version ? { version } : {}),
    logger: pino({ level: "silent" }), // Silent logger for maximum speed and zero console clutter
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    emitOwnEvents: true,
    syncFullHistory: false, // Disables heavy chat history sync for instant startup
    generateHighQualityLinkPreview: false
  });

  sock.ev.on("creds.update", saveCreds);

  let onlinePresenceTimer = null;
  async function applyOnlinePresence() {
    try { 
      await sock.sendPresenceUpdate(botSettings.online ? "available" : "unavailable"); 
    } catch (e) {}
  }

  function syncOnlinePresence() {
    if (onlinePresenceTimer) clearInterval(onlinePresenceTimer);
    onlinePresenceTimer = null;
    applyOnlinePresence().catch(() => {});
    if (botSettings.online) {
      onlinePresenceTimer = setInterval(() => {
        applyOnlinePresence().catch(() => {});
      }, 25000);
      if (typeof onlinePresenceTimer.unref === "function") onlinePresenceTimer.unref();
    }
  }

  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(number);
        console.log(`\nDEVA XMD-BOT pairing code for +${number}: ${code}`);
        console.log("WhatsApp > Linked devices > Link a device > Link with phone number");
      } catch (e) { console.error("PAIRING ERROR:", e?.message || e); }
    }, 3000);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      reconnectingSessions.delete(sessionKey);
      syncOnlinePresence();
      console.log(`
██████████████████████████████████████

         👑 DEVA XMD BOT 👑

██████████████████████████████████████
✓ WhatsApp Connected
✓ Database Connected
✓ Plugins Loaded
✓ Commands Registered
✓ Bot Started Successfully

Status : ONLINE ✓  +${number}`);
    }
    if (connection === "close") {
      if (onlinePresenceTimer) clearInterval(onlinePresenceTimer);
      onlinePresenceTimer = null;
      reconnectingSessions.delete(sessionKey);
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        setTimeout(() => start(number, sessionDir).catch(() => {}), 2000);
      } else {
        console.error(`WhatsApp session logged out: +${number}`);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages || []) {
      try {
        if (!msg?.message) continue;

        const jid = msg.key?.remoteJid || "";

        // Ultra-fast Status Seen Handler
        if (botSettings.status && (jid === "status@broadcast" || jid.endsWith("@broadcast"))) {
          sock.readMessages([msg.key]).catch(() => {});
          continue;
        }

        // Ignore groups, broadcasts, and newsletters for lightning speed in private chats
        if (jid.endsWith("@g.us") || jid.endsWith("@broadcast") || jid.endsWith("@newsletter")) continue;

        const text = getText(msg);
        if (!text) continue;

        const prefix = botSettings.prefix || ".";
        const trimmed = text.trim();
        const commandText = (trimmed.startsWith(prefix)
          ? trimmed.slice(prefix.length)
          : trimmed).trim().toLowerCase();

        const ownerOnlyCommands = new Set([
          "fullpp",
          "online on", "online off",
          "status on", "status off",
          "status seen on", "status seen off"
        ]);

        if (ownerOnlyCommands.has(commandText) && !isOwnerCommand(msg, jid, number)) {
          await sock.sendMessage(jid, {
            text: "⛔ Oɴʟʏ ᴛʜᴇ Bᴏᴛ Oᴡɴᴇʀ ᴄᴀɴ ᴜꜱᴇ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ"
          }, { quoted: msg });
          continue;
        }

        if (commandText === "menu") {
          await handleMenuCommand({ sock, jid, quoted: msg, botSettings });
          continue;
        }
        if (commandText === "ping") {
          const started = Date.now();
          await sock.sendMessage(jid, { text: `🏓 Pong!\n⏱️ *_DEVA XMD BOT Sᴘᴇᴇᴅ: ${Date.now() - started} Mꜱ_*` }, { quoted: msg });
          continue;
        }
        if (commandText === "alive") {
          const totalSeconds = Math.floor((Date.now() - global.botStartTime) / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          await sock.sendMessage(jid, {
            text: `I'm here and ready 🚀\nUptime : ${hours} hours ${minutes ? `${minutes} minutes ` : ""}${seconds} seconds`
          }, { quoted: msg });
          continue;
        }
        if (commandText === "fullpp") {
          await handleFullppCommand({ sock, jid, quoted: msg, msg, prefix });
          continue;
        }
        if (commandText === "online on") {
          botSettings.online = true; saveSettings();
          syncOnlinePresence();
          await sock.sendMessage(jid, { text: "✅ Always Online: ON" }, { quoted: msg });
          continue;
        }
        if (commandText === "online off") {
          botSettings.online = false; saveSettings();
          syncOnlinePresence();
          await sock.sendMessage(jid, { text: "✅ Always Online: OFF" }, { quoted: msg });
          continue;
        }
        if (commandText === "status on" || commandText === "status seen on") {
          botSettings.status = true; saveSettings();
          await sock.sendMessage(jid, { text: "✅ Auto Status Seen: ON" }, { quoted: msg });
          continue;
        }
        if (commandText === "status off" || commandText === "status seen off") {
          botSettings.status = false; saveSettings();
          await sock.sendMessage(jid, { text: "✅ Auto Status Seen: OFF" }, { quoted: msg });
          continue;
        }
      } catch (e) {
        // Silenced minor message errors to maintain peak performance
      }
    }
  });
}

process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});

start().then(() => {
  for (const number of readSessionNumbers()) {
    const sessionDir = path.join(SESSION_ROOT, number);
    if (fs.existsSync(path.join(sessionDir, "creds.json"))) {
      start(number, sessionDir).catch(() => {});
    }
  }
}).catch(() => { process.exit(1); });
