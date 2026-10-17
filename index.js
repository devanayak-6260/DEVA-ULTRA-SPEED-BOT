const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore
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

// Safe In-Memory Store setup with fallback
let store;
try {
  if (typeof makeInMemoryStore === "function") {
    store = makeInMemoryStore({ logger: pino({ level: "silent" }) });
  } else {
    throw new Error();
  }
} catch {
  store = { bind: () => {} };
}

// Cached Settings Object
let cachedSettings = null;
function loadSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    cachedSettings = { 
      status: saved.status !== false, 
      online: saved.online === true, 
      prefix: typeof saved.prefix === "string" ? saved.prefix : "." 
    };
  } catch {
    cachedSettings = { status: true, online: false, prefix: "." };
  }
  return cachedSettings;
}

const botSettings = loadSettings();

async function saveSettings() {
  try { 
    await fs.promises.writeFile(SETTINGS_PATH, JSON.stringify(botSettings, null, 2)); 
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
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    emitOwnEvents: true,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false
  });

  sock.ev.on("creds.update", saveCreds);
  if (typeof store.bind === "function") {
    store.bind(sock.ev);
  }

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
        console.log(`
========================================
         👑  𝗗𝗘𝗩𝗔 𝗫𝗠𝗗 𝗕𝗢𝗧 👑
========================================
  WHATSAPP PAIRING CODE FOR +${number}:
  
            >>>  ${code}  <<<
            
  Go to: Linked devices > Link a device
  > Link with phone number instead
========================================`);
      } catch (e) { console.error("PAIRING ERROR:", e?.message || e); }
    }, 3000);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      reconnectingSessions.delete(sessionKey);
      syncOnlinePresence();
      console.log(`
============================================
=                                          =
=         👑  ⟪ 𝗗𝗘𝗩𝗔 𝗫𝗠𝗗 𝗕𝗢𝗧 ⟫ 👑          =
=                                          =
============================================
=                                          =
=   🪀 WhatsApp Connected       :: [ ✅ ]   =
=   📡 Database Connected       :: [ ✔️ ]   =
=   🔌 Plugins Loaded           :: [ ⚡ ]   =
=   ⚙️  Commands Registered     :: [ 🎯 ]   =
=   🚀 Bot Started Successfully :: [ 🔥 ]   =
=                                          =
=  🌐  Status : ONLINE ⚡  |  +${number}   =
=                                          =
============================================
`);
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

  // Commands Handler
  const commands = {
    async menu({ sock, jid, quoted }) {
      await handleMenuCommand({ sock, jid, quoted, botSettings });
    },
    async ping({ sock, jid, quoted }) {
      const started = Date.now();
      await sock.sendMessage(jid, { text: `🏓 Pong!\n⏱️ *_DEVA XMD BOT Sᴘᴇᴇᴅ: ${Date.now() - started} Mꜱ_*` }, { quoted });
    },
    async alive({ sock, jid, quoted }) {
      const totalSeconds = Math.floor((Date.now() - global.botStartTime) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      await sock.sendMessage(jid, {
        text: `I'm here and ready 🚀\nUptime : ${hours} hours ${minutes ? `${minutes} minutes ` : ""}${seconds} seconds`
      }, { quoted });
    },
    async fullpp({ sock, jid, quoted, prefix }) {
      await handleFullppCommand({ sock, jid, quoted, msg: quoted, prefix });
    },
    async online({ sock, jid, quoted, args }) {
      const action = args[0]?.toLowerCase();
      if (action === "on") {
        botSettings.online = true; 
        await saveSettings();
        syncOnlinePresence();
        await sock.sendMessage(jid, { text: "✅ Always Online: ON" }, { quoted });
      } else if (action === "off") {
        botSettings.online = false; 
        await saveSettings();
        syncOnlinePresence();
        await sock.sendMessage(jid, { text: "✅ Always Online: OFF" }, { quoted });
      } else {
        await sock.sendMessage(jid, { text: `⚠️ Usage: ${botSettings.prefix || "."}online on / ${botSettings.prefix || "."}online off` }, { quoted });
      }
    },
    async status({ sock, jid, quoted, args }) {
      const action = args[0]?.toLowerCase();
      if (action === "on" || action === "seen on") {
        botSettings.status = true; 
        await saveSettings();
        await sock.sendMessage(jid, { text: "✅ Auto Status Seen: ON" }, { quoted });
      } else if (action === "off" || action === "seen off") {
        botSettings.status = false; 
        await saveSettings();
        await sock.sendMessage(jid, { text: "✅ Auto Status Seen: OFF" }, { quoted });
      } else {
        await sock.sendMessage(jid, { text: `⚠️ Usage: ${botSettings.prefix || "."}status on / ${botSettings.prefix || "."}status off` }, { quoted });
      }
    }
  };

  const ownerOnlyCommands = new Set(["fullpp", "online", "status", "prefix"]);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages || []) {
      try {
        if (!msg?.message) continue;

        const jid = msg.key?.remoteJid || "";

        if (botSettings.status && (jid === "status@broadcast" || jid.endsWith("@broadcast"))) {
          sock.readMessages([msg.key]).catch(() => {});
          continue;
        }

        if (jid.endsWith("@g.us") || jid.endsWith("@broadcast") || jid.endsWith("@newsletter")) continue;

        const text = getText(msg);
        if (!text) continue;

        const prefix = botSettings.prefix || "";
        const trimmed = text.trim();
        
        let commandText = "";
        let args = [];

        if (prefix && trimmed.startsWith(prefix)) {
          const parts = trimmed.slice(prefix.length).trim().split(/\s+/);
          commandText = parts[0].toLowerCase();
          args = parts.slice(1);
        } else if (!prefix) {
          const parts = trimmed.split(/\s+/);
          commandText = parts[0].toLowerCase();
          args = parts.slice(1);
        } else {
          continue;
        }

        if (ownerOnlyCommands.has(commandText) && !isOwnerCommand(msg, jid, number)) {
          await sock.sendMessage(jid, {
            text: "⛔ Oɴʟʏ ᴛʜᴇ Bᴏᴛ Oᴡɴᴇʀ ᴄᴀɴ ᴜꜱᴇ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ"
          }, { quoted: msg });
          continue;
        }

        if (commandText === "prefix") {
          if (args.length === 0) {
            await sock.sendMessage(jid, { 
              text: `⚠️ *Uꜱaɢᴇ:* \`${prefix || "."}ᴩʀᴇꜰɪx (ꜱyᴍʙᴏʟ)\`\n*E.ɢ.:* \`${prefix || "."}ᴩʀᴇꜰɪx !\` ᴏʀ \`${prefix || "."}ᴩʀᴇꜰɪx nulʟ\`` 
            }, { quoted: msg });
            continue;
          }

          const newSymbol = args[0];

          if (newSymbol.toLowerCase() === "null" || newSymbol.toLowerCase() === "none") {
            botSettings.prefix = "";
            await saveSettings();
            await sock.sendMessage(jid, { text: "✅ Prefix has been successfully *Removed* (No prefix required now)." }, { quoted: msg });
            continue;
          }

          if (newSymbol.length > 3 || /^[a-zA-Z0-9]$/.test(newSymbol)) {
            await sock.sendMessage(jid, { 
              text: "❌ Invalid Prefix! Prefix must be a symbol/emoji (max 3 characters) and cannot be a standard alphabet or number." 
            }, { quoted: msg });
            continue;
          }

          botSettings.prefix = newSymbol;
          await saveSettings();
          await sock.sendMessage(jid, { text: `✅ Prefix successfully changed to: \`${newSymbol}\`` }, { quoted: msg });
          continue;
        }

        const handler = commands[commandText];
        if (handler) {
          await handler({ sock, jid, quoted: msg, args, prefix });
        }
      } catch (e) {}
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
