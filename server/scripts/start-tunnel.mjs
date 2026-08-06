// ============================================================
// Tunnel + Telegram Webhook Registration Script
// Run with: node server/scripts/start-tunnel.mjs
// ============================================================

import { execSync, spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../');

const BOT_TOKEN = '8789716786:AAHOeMWdQCSrpbcbJViKdllkLN92KSl4R1U';
const LOCAL_PORT = 3000;

async function registerWebhook(publicUrl) {
  const webhookUrl = `${publicUrl}/api/telegram/webhook`;
  console.log(`\n🔗 Registering Telegram webhook → ${webhookUrl}`);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });
  const data = await res.json();

  if (data.ok) {
    console.log(`✅ Webhook registered! Your bot will now receive admin replies.`);
    console.log(`\n📱 In Telegram, reply to customers with:`);
    console.log(`   /reply <conv_id> your message here\n`);
  } else {
    console.error(`❌ Webhook registration failed:`, JSON.stringify(data));
  }
}

// Install localtunnel into the project root node_modules if missing
const ltPath = resolve(ROOT, 'node_modules', 'localtunnel');
if (!fs.existsSync(ltPath)) {
  console.log('📦 Installing localtunnel...');
  execSync('npm install localtunnel --save-dev', { cwd: ROOT, stdio: 'inherit' });
  console.log('✅ Installed.\n');
}

// Use createRequire so we can require() CJS modules from ESM
const require = createRequire(import.meta.url);
const localtunnel = require(resolve(ROOT, 'node_modules', 'localtunnel'));

console.log(`\n🚀 Opening tunnel for http://localhost:${LOCAL_PORT}...`);

const tunnel = await localtunnel({ port: LOCAL_PORT });

console.log(`\n🌐 Public URL: ${tunnel.url}`);
console.log(`   All requests to ${tunnel.url} → http://localhost:${LOCAL_PORT}`);

await registerWebhook(tunnel.url);

console.log(`⏳ Keep this terminal open while testing. Press Ctrl+C to stop.\n`);

tunnel.on('close', () => {
  console.log('\nTunnel closed.');
  process.exit(0);
});

tunnel.on('error', (err) => {
  console.error('Tunnel error:', err.message);
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\n👋 Closing tunnel...');
  tunnel.close();
});
