const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'shopfloor.db'));

console.log('Running Shift Control Database Migration...');

try {
    db.exec("ALTER TABLE users ADD COLUMN is_live INTEGER DEFAULT 0");
    console.log('Added is_live to users');
} catch (e) {
    if (!e.message.includes('duplicate column')) console.error(e);
}

try {
    db.exec("ALTER TABLE users ADD COLUMN shift_start_time DATETIME");
    console.log('Added shift_start_time to users');
} catch (e) {
    if (!e.message.includes('duplicate column')) console.error(e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS shift_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    start_time DATETIME,
    end_time DATETIME,
    pending_tasks INTEGER,
    delayed_tasks INTEGER,
    reason TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL REFERENCES users(id),
    worker_name TEXT NOT NULL,
    pending_tasks INTEGER,
    delayed_tasks INTEGER,
    reason TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread', 'reviewed')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('Shift and alerts tables ensured.');
console.log('Migration completed successfully.');
process.exit(0);
