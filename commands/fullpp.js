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

    const stream = await downloadContentFromMessage(image, "image");
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const resized = await sharp(Buffer.concat(chunks))
      .resize(720, 720, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    await sock.query({
      tag: "iq",
      attrs: { to: "s.whatsapp.net", type: "set", xmlns: "w:profile:picture" },
      content: [{ tag: "picture", attrs: { type: "image" }, content: resized }]
    });
    await sock.sendMessage(jid, { text: "✅ Profile picture updated successfully." }, { quoted });
  } catch (e) {
    console.error("FULLPP ERROR:", e?.message || e);
    await sock.sendMessage(jid, {
      text: `❌ Failed to update the profile picture.\n\n${e?.message || "Unknown error"}`
    }, { quoted });
  } finally {
    try { await sock.sendPresenceUpdate("paused", jid); } catch {}
  }
}

module.exports = { handleFullppCommand };
