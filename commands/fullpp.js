const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const sharp = require("sharp");

const unwrap = (message) => {
  for (let i = 0; message && i < 5; i++) {
    const next = message.viewOnceMessage?.message
      || message.viewOnceMessageV2?.message
      || message.viewOnceMessageV2Extension?.message
      || message.ephemeralMessage?.message;
    if (!next) break;
    message = next;
  }
  return message || null;
};

async function handleFullppCommand({ sock, jid, quoted, msg, prefix = "." }) {
  try {
    const quotedImage = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const image = unwrap(msg?.message)?.imageMessage || unwrap(quotedImage)?.imageMessage;
    
    if (!image) {
      await sock.sendMessage(jid, {
        text: `❌ Reply to an image with *${prefix}fullpp* to set it as the bot profile picture.`
      }, { quoted });
      return;
    }

    await sock.sendMessage(jid, { text: "⏳ Processing image for profile picture..." }, { quoted });

    // Download media chunks efficiently
    const stream = await downloadContentFromMessage(image, "image");
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Resize and crop/fit image using sharp for WhatsApp profile picture (Square ratio recommended)
    const resized = await sharp(buffer)
      .resize(640, 640, { fit: "cover" })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Update Bot Profile Picture using Baileys built-in method / query
    await sock.updateProfilePicture(sock.user.id, resized);

    await sock.sendMessage(jid, { text: "✅ Bot profile picture updated successfully!" }, { quoted });
  } catch (e) {
    console.error("Error in fullpp command:", e);
    await sock.sendMessage(jid, { text: `❌ Failed to update profile picture. Error: ${e.message}` }, { quoted });
  } finally {
    try { 
      await sock.sendPresenceUpdate("paused", jid); 
    } catch {}
  }
}

module.exports = { handleFullppCommand };
