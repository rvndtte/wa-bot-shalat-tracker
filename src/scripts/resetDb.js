import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'data', 'database.sqlite');

console.log('🔄 Memulai Reset Database...');

if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
    console.log('✅ File database.sqlite berhasil dihapus.');
    console.log('✨ Database telah bersih total! Saat Anda menjalankan "npm start", database baru yang bersih akan otomatis dibuat.');
  } catch (err) {
    console.error('❌ Gagal menghapus database. Pastikan bot ("npm start") sedang dimatikan terlebih dahulu!', err.message);
  }
} else {
  console.log('ℹ️ File database.sqlite belum ada atau sudah bersih.');
}
