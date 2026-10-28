const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const sharp = require("sharp");

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    else if (current.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message;
    else if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    else if (current.documentWithCaptionMessage?.message) current = current.documentWithCaptionMessage.message;
    else break;
  }
  return current || null;
}

function getQuotedMessage(msg) {
  const message = unwrapMessage(msg?.message);
  return message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function getImageMessage(msg) {
  const direct = unwrapMessage(msg?.message);
  const quoted = unwrapMessage(getQuotedMessage(msg));
  return direct?.imageMessage || quoted?.imageMessage || null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function downloadQuotedImage(msg) {
  const imageMessage = getImageMessage(msg);
  if (!imageMessage) return null;
  const stream = await downloadContentFromMessage(imageMessage, "image");
  return streamToBuffer(stream);
}

async function setProfilePicture(sock, imageBuffer) {
  const resized = await sharp(imageBuffer)
    .resize(720, 720, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Baileys' low-level profile-picture IQ works across socket versions.
  return sock.query({
    tag: "iq",
    attrs: { to: "s.whatsapp.net", type: "set", xmlns: "w:profile:picture" },
    content: [{ tag: "picture", attrs: { type: "image" }, content: resized }]
  });
}

async function handleFullppCommand({ sock, jid, quoted, msg, prefix = "." }) {
  try {
    const imageBuffer = await downloadQuotedImage(msg);
    if (!imageBuffer) {
      await sock.sendMessage(jid, {
        text: `❌ Reply to an image with *${prefix}fullpp* to set it as the bot profile picture.`
      }, { quoted });
      return;
    }

    await sock.sendMessage(jid, {
      text: "⏳ Processing image for profile picture..."
    }, { quoted });

    await setProfilePicture(sock, imageBuffer);
    await sock.sendMessage(jid, {
      text: "✅ Profile picture updated successfully."
    }, { quoted });
  } catch (e) {
    console.error("FULLPP ERROR:", e?.stack || e?.message || e);
    await sock.sendMessage(jid, {
      text: `❌ Failed to update the profile picture.\n\n${e?.message || "Unknown error"}`
    }, { quoted });
  } finally {
    try { await sock.sendPresenceUpdate("paused", jid); } catch {}
  }
}

module.exports = { handleFullppCommand };
