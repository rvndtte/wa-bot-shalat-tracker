import cron from 'node-cron';
import { getDailyRecap } from './trackerService.js';

/**
 * Initialize nightly cron job at 21:00 (9 PM) every day
 */
export function initScheduler(getWASocketFn) {
  const targetGroupJid = process.env.TARGET_GROUP_JID || null;

  // Run at 21:00 WIB every night
  cron.schedule('0 21 * * *', async () => {
    console.log('⏰ Running Nightly Shalat Recap Cron Job (21:00)...');
    const sock = getWASocketFn();
    if (!sock) {
      console.log('⚠️ WhatsApp Socket not connected yet, skipping scheduled recap.');
      return;
    }

    const recapMsg = `🌙 *REKAP MALAM SHALAT HARIAN*\n\n` + (await getDailyRecap());

    if (targetGroupJid) {
      try {
        await sock.sendMessage(targetGroupJid, { text: recapMsg });
        console.log(`✅ Nightly recap sent to group ${targetGroupJid}`);
      } catch (err) {
        console.error('Failed to send scheduled recap to group:', err);
      }
    } else {
      console.log('ℹ️ TARGET_GROUP_JID not specified in .env. Nightly recap generated locally.');
    }
  }, {
    timezone: 'Asia/Jakarta'
  });

  console.log('📅 Scheduler initialized (Nightly recap scheduled at 21:00 WIB).');
}
