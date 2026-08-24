import db from '../config/database.js';

export const MANDATORY_PRAYERS = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
export const SUNNAH_PRAYERS = ['Dhuha', 'Tahajud'];

/**
 * Normalizes input caption text to a standard prayer name.
 * Returns standard name or null if invalid.
 */
export function normalizePrayerName(caption) {
  if (!caption || typeof caption !== 'string') return null;
  const text = caption.toLowerCase().trim();

  if (/subuh|sholat\s*subuh|shalat\s*subuh|fajar/.test(text)) return 'Subuh';
  if (/dzuhur|zuhur|dhuhur|duhur|zohor|jumat|jum'at|shalat\s*dzuhur|sholat\s*dzuhur/.test(text)) return 'Dzuhur';
  if (/ashar|asar|ashr|shalat\s*ashar|sholat\s*ashar/.test(text)) return 'Ashar';
  if (/maghrib|magrib|mahrib|shalat\s*maghrib|sholat\s*magrib/.test(text)) return 'Maghrib';
  if (/isya|isya'|isha|isyaa|shalat\s*isya|sholat\s*isya/.test(text)) return 'Isya';
  if (/dhuha|duha|duha'|sholat\s*dhuha/.test(text)) return 'Dhuha';
  if (/tahajud|tahajjud|sholat\s*tahajud/.test(text)) return 'Tahajud';

  return null;
}

/**
 * Get current date string in YYYY-MM-DD format (WIB / Asia/Jakarta)
 */
export function getTodayDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // YYYY-MM-DD
  return formatter.format(d);
}

/**
 * Upsert user profile into database
 */
export async function upsertUser(phone, name) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanName = name || 'Hamba Allah';
  
  await db.run(`
    INSERT INTO users (phone_number, name, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(phone_number) DO UPDATE SET
      name = excluded.name,
      updated_at = CURRENT_TIMESTAMP
  `, [cleanPhone, cleanName]);

  return cleanPhone;
}

/**
 * Record a prayer log for a user
 */
export async function logPrayer(phone, name, caption, customDate = null) {
  const prayerName = normalizePrayerName(caption);
  if (!prayerName) {
    return {
      success: false,
      reason: 'INVALID_CAPTION',
      message: `❓ *Format Caption Tidak Dikenali*\n\nHarap sertakan nama shalat pada caption foto. Contoh:\n• *Subuh*\n• *Dzuhur*\n• *Ashar*\n• *Maghrib*\n• *Isya*\n• *Dhuha* / *Tahajud*`
    };
  }

  const cleanPhone = await upsertUser(phone, name);
  const dateStr = customDate || getTodayDateString();

  try {
    await db.run(`
      INSERT INTO prayer_logs (user_phone, user_name, prayer_name, date_str)
      VALUES (?, ?, ?, ?)
    `, [cleanPhone, name, prayerName, dateStr]);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT' || err.message.includes('UNIQUE')) {
      return {
        success: false,
        reason: 'ALREADY_LOGGED',
        prayerName,
        message: `⚠️ Shalat *${prayerName}* untuk *${name}* sudah pernah dicatat hari ini (${dateStr}).`
      };
    }
    throw err;
  }

  // Get user's total mandatory prayers logged today
  const userTodayLogs = await getUserTodayLogs(cleanPhone, dateStr);
  const mandatoryCount = userTodayLogs.filter(l => MANDATORY_PRAYERS.includes(l.prayer_name)).length;

  return {
    success: true,
    prayerName,
    dateStr,
    mandatoryCount,
    totalMandatory: MANDATORY_PRAYERS.length,
    message: `✅ *Alhamdulillah!*\nShalat *${prayerName}* berhasil dicatat untuk *${name}*.\n\n📊 *Pencapaian Hari Ini*: ${mandatoryCount}/${MANDATORY_PRAYERS.length} Shalat Wajib`
  };
}

/**
 * Get all logs for a user on a given date
 */
export async function getUserTodayLogs(cleanPhone, dateStr = getTodayDateString()) {
  return await db.all(`
    SELECT prayer_name, created_at FROM prayer_logs
    WHERE user_phone = ? AND date_str = ?
  `, [cleanPhone, dateStr]);
}

/**
 * Generate daily summary recap string for all registered users / senders
 */
export async function getDailyRecap(customDate = null) {
  const dateStr = customDate || getTodayDateString();
  const users = await db.all(`SELECT phone_number, name FROM users ORDER BY name ASC`);

  if (users.length === 0) {
    return `📋 *REKAP SHALAT HARIAN (${dateStr})*\n\nBelum ada data anggota yang terdaftar. Kirim foto shalat pertama Anda untuk mendaftar!`;
  }

  let recapMsg = `📋 *REKAP SHALAT HARIAN*\n📅 Tanggal: *${dateStr}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (let index = 0; index < users.length; index++) {
    const user = users[index];
    const logs = await getUserTodayLogs(user.phone_number, dateStr);
    const loggedPrayerNames = logs.map(l => l.prayer_name);

    const mandatoryLogged = MANDATORY_PRAYERS.filter(p => loggedPrayerNames.includes(p));
    const mandatoryCount = mandatoryLogged.length;
    const sunnahLogged = loggedPrayerNames.filter(p => SUNNAH_PRAYERS.includes(p));

    let statusLine = MANDATORY_PRAYERS.map(p => {
      return loggedPrayerNames.includes(p) ? `✅ ${p}` : `❌ ${p}`;
    }).join(' | ');

    recapMsg += `${index + 1}. *${user.name}* (${mandatoryCount}/${MANDATORY_PRAYERS.length})\n   ${statusLine}\n`;
    if (sunnahLogged.length > 0) {
      recapMsg += `   ✨ *Sunnah*: ${sunnahLogged.join(', ')}\n`;
    }
    recapMsg += `\n`;
  }

  recapMsg += `━━━━━━━━━━━━━━━━━━━━━━\nSemoga Allah meridhoi & merutinkan shalat kita semua! 🤲`;
  return recapMsg;
}

/**
 * Generate monthly summary recap string
 */
export async function getMonthlyRecap(yearMonth = null) {
  const ym = yearMonth || getTodayDateString().substring(0, 7); // YYYY-MM
  const users = await db.all(`SELECT phone_number, name FROM users ORDER BY name ASC`);

  if (users.length === 0) {
    return `📊 *REKAP SHALAT BULANAN (${ym})*\n\nBelum ada data tercatat.`;
  }

  // Calculate number of days elapsed in month
  const todayStr = getTodayDateString();
  let daysInMonth;
  if (todayStr.startsWith(ym)) {
    daysInMonth = parseInt(todayStr.split('-')[2], 10);
  } else {
    const [y, m] = ym.split('-').map(Number);
    daysInMonth = new Date(y, m, 0).getDate();
  }

  const maxMandatoryPossible = daysInMonth * 5;

  let msg = `📊 *REKAP SHALAT BULANAN*\n🗓 Periode: *${ym}* (${daysInMonth} Hari)\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const userStats = [];

  for (const user of users) {
    const logs = await db.all(`
      SELECT prayer_name, COUNT(*) as count FROM prayer_logs
      WHERE user_phone = ? AND date_str LIKE ?
      GROUP BY prayer_name
    `, [user.phone_number, `${ym}-%`]);

    let totalMandatory = 0;
    const prayerCounts = {};

    logs.forEach(l => {
      prayerCounts[l.prayer_name] = l.count;
      if (MANDATORY_PRAYERS.includes(l.prayer_name)) {
        totalMandatory += l.count;
      }
    });

    const percentage = maxMandatoryPossible > 0 
      ? Math.round((totalMandatory / maxMandatoryPossible) * 100) 
      : 0;

    userStats.push({
      user,
      totalMandatory,
      percentage,
      prayerCounts
    });
  }

  // Sort by total mandatory prayers descending
  userStats.sort((a, b) => b.totalMandatory - a.totalMandatory);

  const medals = ['🥇', '🥈', '🥉'];
  userStats.forEach((stat, idx) => {
    const rankIcon = medals[idx] || `${idx + 1}.`;
    msg += `${rankIcon} *${stat.user.name}*\n`;
    msg += `   • Total Shalat Wajib: *${stat.totalMandatory}/${maxMandatoryPossible}* (${stat.percentage}%)\n`;
    
    const mandatoryDetail = MANDATORY_PRAYERS.map(p => `${p}: ${stat.prayerCounts[p] || 0}`).join(' | ');
    msg += `   • Detail: ${mandatoryDetail}\n`;

    const sunnahDetail = SUNNAH_PRAYERS
      .filter(p => stat.prayerCounts[p] > 0)
      .map(p => `${stat.prayerCounts[p]} ${p}`)
      .join(', ');

    if (sunnahDetail) {
      msg += `   ✨ Sunnah: ${sunnahDetail}\n`;
    }
    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━━\nBarakallahu fiikum! Tetap istiqomah! 🚀`;
  return msg;
}

/**
 * Get status of a single user today
 */
export async function getUserDailyStatus(phone, dateStr = getTodayDateString()) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const user = await db.get(`SELECT name FROM users WHERE phone_number = ?`, [cleanPhone]);
  const userName = user ? user.name : 'Anda';

  const logs = await getUserTodayLogs(cleanPhone, dateStr);
  const loggedPrayerNames = logs.map(l => l.prayer_name);

  let msg = `👤 *STATUS SHALAT HARIAN*\nNama: *${userName}*\nTanggal: *${dateStr}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  MANDATORY_PRAYERS.forEach(p => {
    const isDone = loggedPrayerNames.includes(p);
    msg += `${isDone ? '✅' : '❌'} *${p}*\n`;
  });

  const sunnahLogged = loggedPrayerNames.filter(p => SUNNAH_PRAYERS.includes(p));
  if (sunnahLogged.length > 0) {
    msg += `\n✨ *Sunnah*: ${sunnahLogged.join(', ')}\n`;
  }

  const mandatoryCount = MANDATORY_PRAYERS.filter(p => loggedPrayerNames.includes(p)).length;
  msg += `\nTotal: ${mandatoryCount}/${MANDATORY_PRAYERS.length} Shalat Wajib`;

  return msg;
}
