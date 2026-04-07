const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../shopfloor.db');
const db = new Database(DB_PATH);

console.log('🚀 Starting Database Migration: Machines Table status update...');

try {
  // Disable foreign keys for the migration to avoid constraint failures when dropping/renaming
  db.pragma('foreign_keys = OFF');
  
  db.transaction(() => {
    // 1. Create a temporary table with the correct schema
    db.prepare(`
      CREATE TABLE IF NOT EXISTS machines_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle','occupied','running','breakdown')),
        last_active_at DATETIME,
        idle_since DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 2. Copy data from old table to new table
    db.prepare(`
      INSERT INTO machines_new (id, name, type, status, last_active_at, idle_since, created_at)
      SELECT id, name, type, status, last_active_at, idle_since, created_at FROM machines
    `).run();

    // 3. Drop old table
    db.prepare('DROP TABLE machines').run();

    // 4. Rename new table to original name
    db.prepare('ALTER TABLE machines_new RENAME TO machines').run();
  })();

  console.log('✅ Migration successful! Machines table updated successfully.');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
}
