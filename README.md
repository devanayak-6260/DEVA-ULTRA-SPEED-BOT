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

### 🔧 DEPLOYMENT OPTIONS

| Platform | Deploy |
| :--- | :--- |
| **Heroku** | [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/devanayak-6260/DEVA-ULTRA-SPEED-BOT) |
| **Replit** | [![Run on Replit](https://replit.com/badge/github/quivor/replit)](https://replit.com/github/devanayak-6260/DEVA-ULTRA-SPEED-BOT) |
| **Koyeb** | [![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/devanayak-6260/DEVA-ULTRA-SPEED-BOT) |

---

### ⚠️ WARNING
- Ye bot WhatsApp Inc. se affiliated nahi hai.
- Galat use se number ban ho sakta hai, hum zimmedar nahi.
- Fork karke apne naam se mat becho.

### 👑 CREDIT
- **Owner:** Deva Nayak
- **Base:** Baileys MD

> Made with ❤️ by DEVA
