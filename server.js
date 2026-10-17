const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple HTML Frontend
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WhatsApp Bot Pairing</title>
            <style>
                body { font-family: Arial, sans-serif; background: #0f172a; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); width: 100%; max-width: 400px; text-align: center; }
                input { width: 100%; padding: 12px; margin: 15px 0; border: 1px solid #475569; background: #0f172a; color: #fff; border-radius: 6px; box-sizing: border-box; }
                button { background: #22c55e; color: white; border: none; padding: 12px; width: 100%; border-radius: 6px; font-weight: bold; cursor: pointer; }
                button:hover { background: #16a34a; }
                #codeBox { margin-top: 20px; font-size: 24px; font-weight: bold; color: #38bdf8; letter-spacing: 2px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>DEVA-MINI-BOT Pairing</h2>
                <p>Apna WhatsApp number country code ke sath daalein (jaise: 916260021735)</p>
                <form id="pairForm">
                    <input type="text" id="phone" placeholder="916260021735" required />
                    <button type="submit">Get Pairing Code</button>
                </form>
                <div id="codeBox"></div>
            </div>

            <script>
                document.getElementById('pairForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const phone = document.getElementById('phone').value;
                    document.getElementById('codeBox').innerText = "Generating code...";
                    
                    const res = await fetch('/pair', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone })
                    });
                    const data = await res.json();
                    if(data.code) {
                        document.getElementById('codeBox').innerText = data.code;
                    } else {
                        document.getElementById('codeBox').innerText = "Error generating code!";
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Pairing API Endpoint
app.post('/pair', async (req, res) => {
    const phoneNumber = req.body.phone;
    if (!phoneNumber) {
        return res.json({ error: "Phone number is required" });
    }

    const sessionDir = path.join(__dirname, 'session_' + Date.now());
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    try {
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
            let code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            
            sock.ev.on('creds.update', saveCreds);
            
            sock.ev.on('connection.update', (update) => {
                const { connection } = update;
                if (connection === 'open') {
                    console.log('Bot successfully connected!');
                }
            });

            return res.json({ code });
        } else {
            return res.json({ code: "Already Registered!" });
        }
    } catch (err) {
        console.error(err);
        return res.json({ error: "Failed to generate code" });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
