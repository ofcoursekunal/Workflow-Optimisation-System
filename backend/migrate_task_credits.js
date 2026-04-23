const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'shopfloor.db'));

console.log('Running Task-Based Credit System Migration...');

// 1. Create settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// 2. Initialize credit rules
const defaultSettings = [
    ['credits_base', '10'],
    ['credits_bonus_early', '5'],
    ['credits_bonus_no_pauses', '3'],
    ['credits_bonus_high_priority', '2'],
    ['credits_max_per_task', '20'],
    ['credits_enabled', 'true']
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
defaultSettings.forEach(s => insertSetting.run(s[0], s[1]));

console.log('Migration completed successfully.');
process.exit(0);
