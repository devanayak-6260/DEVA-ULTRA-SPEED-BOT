<p align="center">
  <img src="https://i.ibb.co/DfLv9vFV/05903ad979cf.jpg" width="100%" />
</p>

<h1 align="center">👑 DEVA ULTRA SPEED BOT 👑</h1>
<h3 align="center">⚡ FASTEST WHATSAPP BOT ⚡</h3>
<h4 align="center">Multi-Device | Fast | Secure | Feature Rich</h4>

<p align="center">
  <a href="https://github.com/devanayak-6260/DEVA-ULTRA-SPEED-BOT"><img src="https://img.shields.io/github/stars/devanayak-6260/DEVA-ULTRA-SPEED-BOT?style=for-the-badge&color=yellow" /></a>
  <a href="https://github.com/devanayak-6260/DEVA-ULTRA-SPEED-BOT/fork"><img src="https://img.shields.io/github/forks/devanayak-6260/DEVA-ULTRA-SPEED-BOT?style=for-the-badge&color=blue" /></a>
  <img src="https://img.shields.io/github/repo-size/devanayak-6260/DEVA-ULTRA-SPEED-BOT?color=green&label=Repo%20Size&style=for-the-badge" />
</p>

---

### ✨ BOT FEATURES
- 🚀 **Ultra Speed** - 0.1s Response
- 🔰 **Multi Device** Support
- 🛡️ **Anti-Ban & Anti-Delete**
- 📥 **Downloader** - YT, Insta, FB, TikTok
- 👥 **Group** - Tagall, Kick, Antilink, Welcome
- 🤖 **AI** - ChatGPT, Gemini, Imagine
- 🎨 **Maker** - Sticker, Logo, Meme
- 🔥 **200+ Commands**

---

### 🚀 DEPLOYMENT METHODS

#### 1️⃣ PANEL DEPLOY (Recommended)

**Step 1:** Panel खोलें > `index.js` फाइल बनाएँ  
**Step 2:** नीचे वाला code डालें  
**Step 3:** `PHONE_NUMBER` में अपना नंबर डालें  
**Step 4:** Save & Start

```js
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const REPO = "https://github.com/devanayak-6260/DEVA-ULTRA-SPEED-BOT.git";
const PHONE_NUMBER = "917489501087";
const BOT_DIR = path.join(__dirname, "DEVA_XMD_BOT");
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
async function main() {
  try {
    if (!fs.existsSync(path.join(BOT_DIR, ".git"))) {
      if (fs.existsSync(BOT_DIR)) throw new Error("Folder exists but not a git repo.");
      console.log("Downloading bot...");
      await run("git", ["clone", REPO, BOT_DIR]);
    } else {
      console.log("Updating bot...");
      await run("git", ["pull", "--ff-only"], { cwd: BOT_DIR });
    }
    const phonePath = path.join(BOT_DIR, "phone.js");
    const phoneNumber = (process.env.PHONE_NUMBER || PHONE_NUMBER).replace(/\D/g, "");
    fs.writeFileSync(phonePath, `module.exports = "${phoneNumber}";\n`, "utf8");
    await run("npm", ["install", "--no-audit", "--no-fund"], { cwd: BOT_DIR });
    await run("npm", ["start"], { cwd: BOT_DIR, env: { ...process.env, PHONE_NUMBER: phoneNumber } });
  } catch (error) {
    console.error("BOT START ERROR:", error.message);
    process.exitCode = 1;
  }
}
main();
```

#### 2️⃣ RENDER DEPLOY
1.  [Render.com](https://dashboard.render.com/) पर जाओ > New Web Service
2.  GitHub Repo Connect करो: `devanayak-6260/DEVA-ULTRA-SPEED-BOT`
3.  Build Command: `npm install`
4.  Start Command: `npm start`
5.  Environment Variables में add करो: `PHONE_NUMBER = 91XXXXXXXXXX`
6.  Deploy करो

#### 3️⃣ KOYEB DEPLOY
1.  [Koyeb.com](https://app.koyeb.com/) पर जाओ
2.  Create App > Deploy from GitHub
3.  Repo Select करो
4.  Builder: `Node.js`
5.  Run Command: `npm start`
6.  Env Variable: `PHONE_NUMBER`
7.  Deploy

[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/devanayak-6260/DEVA-ULTRA-SPEED-BOT)

#### 4️⃣ RAILWAY DEPLOY
1.  [Railway.app](https://railway.app/) पर जाओ > New Project > Deploy from GitHub
2.  Repo Select करो
3.  Variables में `PHONE_NUMBER` add करो
4.  Deploy करेगा, Logs में QR / Pairing Code आएगा

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/github/devanayak-6260/DEVA-ULTRA-SPEED-BOT)

---

### 🔧 ENV VARIABLES

| Variable | Required | Example |
| :--- | :--- | :--- |
| `PHONE_NUMBER` | Yes | `917489501087` |
| `SESSION_ID` | No | Auto Generate |

---

### ⚠️ WARNING
Ye bot WhatsApp Inc. se affiliated nahi hai. Galat use se ban ho sakta hai.

### 👑 CREDIT
**Owner:** Deva Nayak

> Made with ❤️ by DEVA
