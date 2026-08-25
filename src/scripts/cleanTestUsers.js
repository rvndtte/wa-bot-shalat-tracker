import db from '../config/database.js';

async function cleanData() {
  console.log('🧹 Membersihkan data dummy (Ahmad & Budi) dari database...');
  
  await db.run(`DELETE FROM prayer_logs`);
  await db.run(`DELETE FROM users`);
  
  console.log('✅ Berhasil menghapus semua data dummy! Database sekarang 100% bersih.');
  process.exit(0);
}

cleanData().catch((err) => {
  console.error('Error cleaning data:', err);
  process.exit(1);
});
