const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'shopfloor.db'));

console.log('🚀 Starting Database Migration...');

db.exec('PRAGMA foreign_keys = OFF');

try {
    db.transaction(() => {
        // 1. Update Users Table (Add 'monitor' to role check)
        console.log('Updating users table constraints...');
        db.exec(`
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin','supervisor','worker','monitor')),
                status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle','busy','paused')),
                is_on_break INTEGER DEFAULT 0,
                last_idle_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        db.exec(`
            INSERT INTO users_new (id, name, email, password_hash, role, status, is_on_break, last_idle_at, created_at)
            SELECT id, name, email, password_hash, role, status, is_on_break, last_idle_at, created_at FROM users
        `);
        db.exec('DROP TABLE users');
        db.exec('ALTER TABLE users_new RENAME TO users');

        // 2. Update Machines Table (Ensure 'occupied' is in status check)
        console.log('Updating machines table constraints...');
        db.exec(`
            CREATE TABLE machines_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle','occupied','running','breakdown')),
                last_active_at DATETIME,
                idle_since DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        db.exec(`
            INSERT INTO machines_new (id, name, type, status, last_active_at, idle_since, created_at)
            SELECT id, name, type, status, last_active_at, idle_since, created_at FROM machines
        `);
        db.exec('DROP TABLE machines');
        db.exec('ALTER TABLE machines_new RENAME TO machines');

        console.log('✅ Migration Transaction Complete.');
    })();
} catch (err) {
    console.error('❌ Migration Failed:', err);
} finally {
    db.exec('PRAGMA foreign_keys = ON');
    db.close();
}
