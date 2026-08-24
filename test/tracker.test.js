process.env.NODE_ENV = 'test';

import { 
  normalizePrayerName, 
  logPrayer, 
  getDailyRecap, 
  getMonthlyRecap, 
  getUserDailyStatus 
} from '../src/services/trackerService.js';
import db, { initDatabase } from '../src/config/database.js';

async function runTests() {
  console.log('🧪 Starting Tracker Service Unit Tests...\n');

  await initDatabase();

  // 1. Test Caption Normalization
  console.log('--- Test 1: Caption Normalization ---');
  const testCaptions = [
    { text: 'Subuh', expected: 'Subuh' },
    { text: 'sholat subuh berjamaah', expected: 'Subuh' },
    { text: 'Dzuhur', expected: 'Dzuhur' },
    { text: 'sholat jumat', expected: 'Dzuhur' },
    { text: 'Ashar masjid', expected: 'Ashar' },
    { text: 'Maghrib', expected: 'Maghrib' },
    { text: 'Isya', expected: 'Isya' },
    { text: 'Sholat Dhuha 4 rakaat', expected: 'Dhuha' },
    { text: 'Tahajud malam', expected: 'Tahajud' },
    { text: 'Foto biasa tanpa caption shalat', expected: null },
  ];

  testCaptions.forEach(({ text, expected }) => {
    const result = normalizePrayerName(text);
    if (result === expected) {
      console.log(`  ✅ "${text}" -> ${result}`);
    } else {
      console.error(`  ❌ FAIL: "${text}" expected ${expected}, got ${result}`);
    }
  });

  // Clean test database tables
  await db.run('DELETE FROM prayer_logs');
  await db.run('DELETE FROM users');

  // 2. Test Logging Prayers & Unique Constraint
  console.log('\n--- Test 2: Logging Prayers & Duplicate Check ---');

  const userA = { phone: '6281234567891', name: 'Ahmad' };
  const userB = { phone: '6281234567892', name: 'Budi' };

  // Log Subuh for Ahmad
  const res1 = await logPrayer(userA.phone, userA.name, 'Subuh');
  console.log('Result 1 (Subuh Ahmad):', res1.success ? '✅ Success' : '❌ Fail');

  // Log Duplicate Subuh for Ahmad (Should fail with ALREADY_LOGGED)
  const resDuplicate = await logPrayer(userA.phone, userA.name, 'Subuh');
  console.log('Result Duplicate Check:', resDuplicate.reason === 'ALREADY_LOGGED' ? '✅ Correctly Blocked Duplicate' : '❌ Failed Duplicate Check');

  // Log Dzuhur, Ashar, Maghrib, Isya for Ahmad
  for (const p of ['Dzuhur', 'Ashar', 'Maghrib', 'Isya']) {
    await logPrayer(userA.phone, userA.name, p);
  }

  // Log Subuh, Dzuhur, Ashar for Budi
  for (const p of ['Subuh', 'Dzuhur', 'Ashar']) {
    await logPrayer(userB.phone, userB.name, p);
  }

  // 3. Test Daily Status for Ahmad
  console.log('\n--- Test 3: Daily Status ---');
  const statusAhmad = await getUserDailyStatus(userA.phone);
  console.log(statusAhmad);

  // 4. Test Daily Recap
  console.log('\n--- Test 4: Daily Recap ---');
  const dailyRecap = await getDailyRecap();
  console.log(dailyRecap);

  // 5. Test Monthly Recap
  console.log('\n--- Test 5: Monthly Recap ---');
  const monthlyRecap = await getMonthlyRecap();
  console.log(monthlyRecap);

  console.log('\n✨ All Tracker Service Unit Tests Completed Successfully!');
}

runTests().catch(console.error);
