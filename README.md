# 🕌 WA Bot Auto-Tracker & Rekap Shalat Harian/Bulanan

Bot WhatsApp otomatis untuk mencatat dan merakap bukti foto shalat harian & bulanan anggota keluarga/saudara dalam grup WhatsApp.

---

## 🌟 Fitur Utama

1. **Deteksi & Log Foto Shalat**:
   - Cukup kirim foto bukti shalat ke grup dengan caption nama shalat (contoh: `Subuh`, `Dzuhur`, `Ashar`, `Maghrib`, `Isya`, `Dhuha`, `Tahajud`).
   - Bot otomatis memverifikasi caption, mencatat ke database SQLite, dan membalas pesan teks konfirmasi pencapaian harian.
   - Mencegah pencatatan ganda shalat yang sama di hari yang sama.

2. **Perintah Rekap Text**:
   - `!rekap` / `!today`: Menampilkan ringkasan pencapaian shalat harian seluruh anggota grup.
   - `!rekapbulan` / `!bulan`: Menampilkan statistik akumulasi bulanan & leaderboard tingkat kedisiplinan.
   - `!ku` / `!status`: Menampilkan status shalat diri sendiri hari ini.
   - `!help`: Menampilkan panduan penggunaan bot.

3. **Pengingat Otomatis (Cron Job)**:
   - Pengingat & rekap harian otomatis disiapkan setiap malam pukul **21:00 WIB**.

---

## 🚀 Cara Menjalankan Bot

### 1. Prasyarat
- **Node.js**: Versi 18+ atau lebih baru.
- Perangkat HP dengan WhatsApp yang aktif.

### 2. Instalasi
```bash
# Clone atau buka folder proyek ini
cd wa-bot-tracker-shalat

# Install modul dependency
npm install
```

### 3. Pengujian Unit Test
```bash
npm test
```

### 4. Menjalankan Bot
```bash
npm start
```
1. Saat bot pertama kali dijalankan, **QR Code** akan muncul di terminal/console Anda.
2. Buka aplikasi WhatsApp di HP -> Perangkat Tertaut (Linked Devices) -> **Tautkan Perangkat (Link a Device)**.
3. Scan QR Code yang muncul di terminal.
4. Selesai! Sesi login tersimpan otomatis di folder `auth_info_baileys/`, jadi Anda tidak perlu re-scan QR Code saat restart bot.

---

## 📁 Struktur Direktori

```
wa-bot-tracker-shalat/
├── data/                  # Folder database SQLite (database.sqlite)
├── auth_info_baileys/     # Sesi autentikasi WhatsApp
├── src/
│   ├── config/
│   │   └── database.js    # Konfigurasi & Schema SQLite (users, prayer_logs)
│   ├── services/
│   │   ├── trackerService.js # Logika normalisasi caption, simpan DB & rekap
│   │   ├── waBot.js          # Integrasi WA (Baileys), listener foto & komando
│   │   └── scheduler.js      # Cron job pengingat harian 21:00 WIB
│   └── index.js           # Main application bootstrap
├── test/
│   └── tracker.test.js    # Automated unit tests
├── package.json
└── README.md
```

---

## 💡 Contoh Penggunaan di Grup WhatsApp

- **User A**: *(Mengirim foto sajadah/masjid)* + Caption: `"Subuh"`
- **Bot**:
  > ✅ *Alhamdulillah!*
  > Shalat *Subuh* berhasil dicatat untuk *raven*.
  > 📊 *Pencapaian Hari Ini*: 1/5 Shalat Wajib

- **User B**: *(Metik di grup)* `!rekap`
- **Bot**:
  > 📋 *REKAP SHALAT HARIAN*
  > 📅 Tanggal: *2026-08-25*
  > ━━━━━━━━━━━━━━━━━━━━━━
  > 1. *raven* (5/5)
  >    ✅ Subuh | ✅ Dzuhur | ✅ Ashar | ✅ Maghrib | ✅ Isya
  > 
  > 2. *leona* (3/5)
  >    ✅ Subuh | ✅ Dzuhur | ✅ Ashar | ❌ Maghrib | ❌ Isya
  > 
  > ━━━━━━━━━━━━━━━━━━━━━━
  > Semoga Allah meridhoi & merutinkan shalat kita semua! 🤲
