import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFileName = process.env.NODE_ENV === 'test' ? 'test_database.sqlite' : 'database.sqlite';
const dbPath = path.join(dataDir, dbFileName);
const sqlite = new sqlite3.Database(dbPath);

// Promisified DB helpers
export const db = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqlite.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqlite.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      sqlite.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  },

  exec(sql) {
    return new Promise((resolve, reject) => {
      sqlite.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

// Initialize Tables
export async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      phone_number TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prayer_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_phone TEXT NOT NULL,
      user_name TEXT NOT NULL,
      prayer_name TEXT NOT NULL,
      date_str TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_phone, prayer_name, date_str)
    );

    CREATE INDEX IF NOT EXISTS idx_prayer_logs_date ON prayer_logs(date_str);
    CREATE INDEX IF NOT EXISTS idx_prayer_logs_user_date ON prayer_logs(user_phone, date_str);
  `);
}

// Auto init on import
initDatabase().catch(console.error);

export default db;
