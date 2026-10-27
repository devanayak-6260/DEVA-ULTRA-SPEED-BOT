
### Option 2: Run the `index.js` installer

Save the installer below as `index.js` in an empty folder. Install [Node.js 20+](https://nodejs.org/) and Git first, then set `PHONE_NUMBER` to your own WhatsApp number in international format (digits only, no `+` or spaces).

```js
const { execSync, spawn } = require("child_process");
const fs = require("fs");

const REPO = "https://github.com/devanayak-6260/DEVA_XMD_BOT.git";
const PHONE_NUMBER = "916260021735"; // अपना नंबर डालें
const BOT_DIR = "./DEVA_XMD_BOT";

try {
  if (!fs.existsSync(BOT_DIR)) {
    execSync(`git clone ${REPO} ${BOT_DIR}`, { stdio: "inherit" });
  } else {
    execSync("git pull", { cwd: BOT_DIR, stdio: "inherit" });
  }

  fs.writeFileSync(
    `${BOT_DIR}/phone.js`,
    `module.exports = "${PHONE_NUMBER}";\n`
  );

  execSync("npm install", { cwd: BOT_DIR, stdio: "inherit" });

  const bot = spawn("npm", ["start"], {
    cwd: BOT_DIR,
    stdio: "inherit"
  });

  bot.on("exit", code => {
    console.log("Bot stopped with code:", code);
  });
} catch (error) {
  console.error("Error:", error.message);
}
```

Run the installer:

```bash
index.js
```
