const https = require("https");

const PHOTO_URL = "https://i.ibb.co/DfLv9vFV/05903ad979cf.jpg";
let cachedPhoto = null;
let photoLoading = false;

// Download the menu image once and keep it in memory.
// Baileys no longer needs to fetch the remote URL for every .menu command.
function warmPhotoCache() {
  if (cachedPhoto || photoLoading) return;
  photoLoading = true;

  const req = https.get(PHOTO_URL, { timeout: 8000 }, (res) => {
    if (res.statusCode !== 200) {
      res.resume();
      photoLoading = false;
      return;
    }
    const chunks = [];
    let total = 0;
    res.on("data", (chunk) => {
      total += chunk.length;
      if (total > 8 * 1024 * 1024) {
        req.destroy(new Error("Menu photo exceeds 8 MB"));
        return;
      }
      chunks.push(chunk);
    });
    res.on("end", () => {
      if (total > 0) cachedPhoto = Buffer.concat(chunks);
      photoLoading = false;
    });
  });

  req.on("timeout", () => req.destroy(new Error("Menu photo request timed out")));
  req.on("error", () => { photoLoading = false; });
}

warmPhotoCache();

function buildMenuCaption({ prefix = "", platform = process.platform }) {
  return `
╭─❏ 👑 *DEVA XMD BOT* ❏─⊷
┃ 🚀 *ULTRA SPEED BOT v4.1*
┣━━━━━━━━━━━━━━━━━─⊷
┃ 👤 *Owner* ➜ *DEVA-NAYAK*
┃ 💻 *Pʟᴀᴛꜰᴏʀᴍ* ➜ ${platform}
╰━━━━━━━━━━━━━━━━━─⊷
┃
╭───❏ *🌐 Gᴇɴᴇʀᴀʟ* ❏──⊷
┃ • ᴍᴇɴᴜ  ┃ • ➢ Sᴛᴀᴛᴜꜱ ┃★┃
┃ • Pɪɴɢ   ┃ • ➢ Oɴʟɪɴᴇ ➢✩✩✩
┃ • Aʟɪᴠᴇ  ┃ • ➢ Fᴜʟʟᴘᴘ ┃★┃
╰━━━━━━━━━━━━━━━━━─⊷
┃
╰━💻 *Cᴏᴅᴇᴅ ʙʏ : ᴅᴇᴠᴀ*❤️──⊷`;
}

async function handleMenuCommand({ sock, jid, quoted, botSettings }) {
  const caption = buildMenuCaption({
    prefix: botSettings.prefix || "",
    platform: process.platform
  });

  // If the cache is ready, send the image as a buffer (fast).
  // If not, send the menu text immediately rather than waiting on the URL.
  if (cachedPhoto) {
    await sock.sendMessage(jid, { image: cachedPhoto, caption }, { quoted });
  } else {
    warmPhotoCache();
    await sock.sendMessage(jid, { text: caption }, { quoted });
  }
}

module.exports = { handleMenuCommand };
