import dotenv from 'dotenv';
import { connectToWhatsApp, getWASocket } from './services/waBot.js';
import { initScheduler } from './services/scheduler.js';

dotenv.config();

console.log('--------------------------------------------------');
console.log('🕌 WhatsApp Bot Rekap Shalat Auto-Tracker Starting');
console.log('--------------------------------------------------');

// Initialize scheduler
initScheduler(getWASocket);

// Connect WhatsApp Client
connectToWhatsApp((sock) => {
  console.log('🚀 WA Bot Ready & Listening for Shalat Reports!');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Bot...');
  process.exit(0);
});
