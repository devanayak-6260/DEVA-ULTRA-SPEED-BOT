
### Option 2: Run the `index.js` installer

Save the installer below as `index.js` in an empty folder. Install [Node.js 20+](https://nodejs.org/) and Git first, then set `PHONE_NUMBER` to your own WhatsApp number in international format (digits only, no `+` or spaces).

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

main();
```

Run the installer:

```bash
index.js
```
