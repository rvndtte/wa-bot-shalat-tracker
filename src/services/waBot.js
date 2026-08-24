import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { 
  logPrayer, 
  getDailyRecap, 
  getMonthlyRecap, 
  getUserDailyStatus 
} from './trackerService.js';

let waSock = null;

export function getWASocket() {
  return waSock;
}

export async function connectToWhatsApp(onReadyCallback = null) {
  const authFolder = path.resolve(process.cwd(), 'auth_info_baileys');
  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`🤖 Initializing WhatsApp Bot (Baileys v${version.join('.')})...`);

  waSock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    generateHighQualityLinkPreview: true
  });

  waSock.ev.on('creds.update', saveCreds);

  waSock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 Scan QR Code ini di WhatsApp Anda untuk menghubungkan Bot:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode || (lastDisconnect?.error)?.data?.reason;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === '401';
      const shouldReconnect = !isLoggedOut;

      console.log(`⚠️ Connection closed (statusCode: ${statusCode}). Reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        connectToWhatsApp(onReadyCallback);
      } else {
        console.log('❌ Disconnected / Session Unauthorized (401).');
        console.log('🗑️ Membersihkan sesi lama yang kadaluarsa...');
        try {
          if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
          }
        } catch (e) {
          console.error('Error removing auth folder:', e);
        }
        console.log('🔄 Memulai ulang bot untuk membuat QR Code baru...\n');
        setTimeout(() => {
          connectToWhatsApp(onReadyCallback);
        }, 1000);
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Bot Connected Successfully!');
      if (onReadyCallback) onReadyCallback(waSock);
    }
  });

  waSock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (!msg.message) continue;

        const remoteJid = msg.key.remoteJid;
        if (remoteJid.endsWith('@broadcast')) continue;

        const isGroup = remoteJid.endsWith('@g.us');
        const myJid = waSock.user?.id || '';
        const senderJid = isGroup ? (msg.key.participant || (msg.key.fromMe ? myJid : remoteJid)) : remoteJid;
        const senderPhone = senderJid.split('@')[0].split(':')[0];
        const pushName = msg.pushName || (msg.key.fromMe ? (waSock.user?.name || 'Admin') : 'Saudara');

        const isImage = !!msg.message?.imageMessage;
        const caption = msg.message?.imageMessage?.caption || 
                        msg.message?.extendedTextMessage?.text || 
                        msg.message?.conversation || '';

        const trimmedText = caption.trim().toLowerCase();

        // Ignore bot's own output messages to prevent infinite loops
        if (msg.key.fromMe && /^[✅⚠️❓📋📊👤🤖🌙]/.test(caption.trim())) {
          continue;
        }

        // 1. Handle Photo Submission
        if (isImage) {
          console.log(`📷 Received photo from ${pushName} (${senderPhone}) with caption: "${caption}"`);
          const result = await logPrayer(senderPhone, pushName, caption);
          
          // Send text reply confirmation
          await waSock.sendMessage(remoteJid, { text: result.message }, { quoted: msg });
          continue;
        }

        // 2. Handle Text Commands
        if (trimmedText.startsWith('!') || trimmedText.startsWith('/')) {
          const command = trimmedText.split(' ')[0];

          if (['!rekap', '!today', '/rekap', '/today'].includes(command)) {
            const recapMsg = await getDailyRecap();
            await waSock.sendMessage(remoteJid, { text: recapMsg }, { quoted: msg });
          } 
          else if (['!rekapbulan', '!bulan', '/rekapbulan', '/bulan'].includes(command)) {
            const monthMsg = await getMonthlyRecap();
            await waSock.sendMessage(remoteJid, { text: monthMsg }, { quoted: msg });
          } 
          else if (['!ku', '!status', '/ku', '/status'].includes(command)) {
            const statusMsg = await getUserDailyStatus(senderPhone);
            await waSock.sendMessage(remoteJid, { text: statusMsg }, { quoted: msg });
          } 
          else if (['!help', '!panduan', '/help', '/panduan'].includes(command)) {
            const helpMsg = `🤖 *PANDUAN BOT REKAP SHALAT*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `📸 *Cara Kirim Laporan Shalat*:\n` +
              `Kirim foto bukti shalat ke grup dengan caption nama shalatnya. Contoh:\n` +
              `• "Subuh"\n• "Dzuhur"\n• "Ashar"\n• "Maghrib"\n• "Isya"\n• "Dhuha" / "Tahajud"\n\n` +
              `📋 *Daftar Perintah Bot*:\n` +
              `• *!rekap* : Rekap pencapaian harian grup hari ini\n` +
              `• *!rekapbulan* : Rekap akumulasi bulanan & leaderboard\n` +
              `• *!ku* : Cek status pencapaian shalat Anda hari ini\n` +
              `• *!help* : Menampilkan panduan ini\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\nSemoga istiqomah! 🤲`;
            await waSock.sendMessage(remoteJid, { text: helpMsg }, { quoted: msg });
          }
        }
      }
    } catch (error) {
      console.error('Error handling WhatsApp message:', error);
    }
  });

  return waSock;
}
