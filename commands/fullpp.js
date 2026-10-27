
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const sharp = require("sharp");

function unwrapMessage(message) {
  let current = message;

  for (let i = 0; i < 5 && current; i++) {
    const next =
      current.viewOnceMessage?.message ||
      current.viewOnceMessageV2?.message ||
      current.viewOnceMessageV2Extension?.message ||
      current.ephemeralMessage?.message;

    if (!next) break;
    current = next;
  }

  return current || null;
}

function getQuotedMessage(msg) {
  return (
    msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    null
  );
}

function getImageMessage(msg) {
  const direct = unwrapMessage(msg?.message);
  const quoted = unwrapMessage(getQuotedMessage(msg));

  return direct?.imageMessage || quoted?.imageMessage || null;
}

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function downloadQuotedImage(msg) {
  const image = getImageMessage(msg);

  if (!image) return null;

  const stream = await downloadContentFromMessage(image, "image");
  return streamToBuffer(stream);
}

async function setProfilePicture(sock, imageBuffer) {
  const resized = await sharp(imageBuffer)
    .resize(640, 640, {
      fit: "cover",
      position: "centre"
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Use Baileys' built-in method when available.
  if (typeof sock.updateProfilePicture === "function") {
    return sock.updateProfilePicture(sock.user.id, resized);
  }

  // Fallback for socket implementations without that method.
  return sock.query({
    tag: "iq",
    attrs: {
      to: "s.whatsapp.net",
      type: "set",
      xmlns: "w:profile:picture"
    },
    content: [
      {
        tag: "picture",
        attrs: { type: "image" },
        content: resized
      }
    ]
  });
}

async function handleFullppCommand({
  sock,
  jid,
  quoted,
  msg,
  prefix = "."
}) {
  try {
    const imageBuffer = await downloadQuotedImage(msg);

    if (!imageBuffer) {
      await sock.sendMessage(
        jid,
        {
          text: `❌ Reply to an image with *${prefix}fullpp* to set it as the bot profile picture.`
        },
        { quoted }
      );
      return;
    }

    await sock.sendMessage(
      jid,
      { text: "⏳ Processing image for profile picture..." },
      { quoted }
    );

    await setProfilePicture(sock, imageBuffer);

    await sock.sendMessage(
      jid,
      { text: "✅ Bot profile picture updated successfully!" },
      { quoted }
    );
  } catch (e) {
    console.error("FULLPP ERROR:", e?.message || e);

    await sock.sendMessage(
      jid,
      {
        text: `❌ Failed to update profile picture.\n\n${e?.message || "Unknown error"}`
      },
      { quoted }
    );
  } finally {
    try {
      await sock.sendPresenceUpdate("paused", jid);
    } catch {}
  }
}

module.exports = { handleFullppCommand };
