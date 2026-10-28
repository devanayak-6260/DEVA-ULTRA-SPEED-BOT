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
  <img src="https://img.shields.io/badge/Version-4.1-red?style=for-the-badge" />
</p>

<p align="center">
  <a href="https://wa.me/917489501087"><img src="https://img.shields.io/badge/Chat%20Owner-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
  <a href="https://whatsapp.com/channel/0029Va..."><img src="https://img.shields.io/badge/Join%20Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
</p>

---


---
## 🚀 PANEL DEPLOY — DEVA-ULTRA-SPEED-BOT

### 📌 Hosting pannel पर Deploy कैसे करें

### Step 1: Hosting Panel खोलें।

### Step 2: एक नई फाइल बनाएँ और उसका नाम "index.js" रखें।

### Step 3: नीचे दिए गए GitHub repository से deployment code कॉपी करके "index.js" में डालें।

### Step 4: कोड में "PHONE_NUMBER" की जगह अपना WhatsApp नंबर country code के साथ लिखें।

### const PHONE_NUMBER = "91XXXXXXXXXX";

### Step 5: फाइल Save करें और Panel में bot Start करें।

```js
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const REPO =
  "https://github.com/devanayak-6260/DEVA-ULTRA-SPEED-BOT.git";

const PHONE_NUMBER = "917489501087";
const BOT_DIR = path.join(__dirname, "DEVA_XMD_BOT");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit"
    });

    child.on("error", reject);

    child.on("close", code => {
      if (code === 0) resolve();
      else reject(
        new Error(`${command} exited with code ${code}`)
      );
    });
  });
}

async function main() {
  try {
    if (!fs.existsSync(path.join(BOT_DIR, ".git"))) {
      if (fs.existsSync(BOT_DIR)) {
        throw new Error(
          "DEVA_XMD_BOT folder exists but is not a Git repository. Rename or back it up first."
        );
      }

      console.log("Downloading bot from GitHub...");
      await run("git", ["clone", REPO, BOT_DIR]);
    } else {
      console.log("Updating bot from GitHub...");
      await run("git", ["pull", "--ff-only"], {
        cwd: BOT_DIR
      });
    }

    const packagePath = path.join(BOT_DIR, "package.json");

    if (!fs.existsSync(packagePath)) {
      throw new Error("package.json not found in the repository.");
    }

    const packageData = JSON.parse(
      fs.readFileSync(packagePath, "utf8")
    );

    // Always create/update phone.js
    const phonePath = path.join(BOT_DIR, "phone.js");
    const phoneNumber = (
      process.env.PHONE_NUMBER || PHONE_NUMBER
    ).replace(/\D/g, "");

    if (!phoneNumber) {
      throw new Error("PHONE_NUMBER is missing.");
    }

    fs.writeFileSync(
      phonePath,
      `module.exports = "${phoneNumber}";\n`,
      "utf8"
    );

    console.log("phone.js updated successfully.");

    console.log("Installing dependencies...");
    await run("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: BOT_DIR
    });

    if (!packageData.scripts?.start) {
      throw new Error(
        "No npm start script found. Check package.json."
      );
    }

    console.log("Starting DEVA XMD BOT...");

    await run("npm", ["start"], {
      cwd: BOT_DIR,
      env: {
        ...process.env,
        PHONE_NUMBER: phoneNumber
      }
    });
  } catch (error) {
    console.error("BOT START ERROR:", error.message);
    process.exitCode = 1;
  }
}

```

---

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
### ⚠️ DISCLAIMER

> **This project is made for Educational & Fun purpose only.**
> This bot is NOT affiliated with WhatsApp Inc. in any way.

**PLEASE NOTE:**
- ✅ Use this bot for learning and personal use only.
- ❌ Do not use this bot for spamming, harassing or any illegal activity.
- ❌ Selling this bot or removing developer credit is strictly prohibited.
- ❌ We do not collect any of your personal data or chats.

> If you love this project, please give a ⭐ Star and respect the original developer.

---


> ## 👑 Cʀᴇᴀᴛᴇᴅ Bʏ Dᴇᴠᴀ Nᴀʏᴀᴋ
> 🚀 Founder & CEO - DEVA ULTRA BOT
<p align="center">
  <a href="https://wa.me/917489501087"><img src="https://img.shields.io/badge/Chat%20Owner-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" /></a>
  
> Copyright © 2026 DEVA ULTRA SPEED BOT | Made with ❤️ by DEVA

---

<h2 align="center">👑 ᴄʀᴇᴀᴛᴏʀ & ᴅᴇᴠᴇʟᴏᴘᴇʀ 👑</h2>

<p align="center">
  <img src="https://img.shields.io/badge/FOUNDER-DEVA%20NAYAK-8A2BE2?style=for-the-badge&logo=github&logoColor=white" />
</p>

<p align="center">
  <b>⚡ DEVA ULTRA SPEED BOT ⚡</b>
  <br />
  <sub>Built with Passion • Designed for Speed • Made for Simplicity</sub>
</p>

<p align="center">
  <a href="https://github.com/devanayak-6260">
    <img src="https://img.shields.io/badge/GitHub-Follow%20Developer-181717?style=for-the-badge&logo=github" />
  </a>
  <a href="https://github.com/devanayak-6260/DEVA-ULTRA-SPEED-BOT">
    <img src="https://img.shields.io/badge/Repository-View%20Project-238636?style=for-the-badge&logo=github" />
  </a>
</p>

<p align="center">
  ⭐ LIKE THE PROJECT? GIVE IT A STAR ⭐
  <br />
  ❤️ Thank you for supporting DEVA XMD BOT
</p>

<p align="center">
  <img src="https://img.shields.io/badge/POWERED%20BY-DEVA%20NAYAK-00BFFF?style=flat-square" />
  <img src="https://img.shields.io/badge/STATUS-ACTIVE-00C853?style=flat-square" />
</p>

<p align="center">
  <sub>© 2026 DEVA ULTRA SPEED BOT • Created & Maintained by DEVA NAYAK</sub>
</p>

<p align="center">
  <sub>For educational and personal use. Follow WhatsApp's terms and applicable laws.</sub>
</p>
