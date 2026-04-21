const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'shopfloor.db');
const db = new Database(DB_PATH);

console.log('Starting migration for Projects feature...');

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('Created projects table');
} catch (err) {
    console.error('Error creating projects table:', err.message);
}

const tablesToAlter = ['users', 'machines', 'tasks'];
tablesToAlter.forEach(table => {
    try {
        db.exec('ALTER TABLE ' + table + ' ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL');
        console.log('Added project_id column to ' + table);
    } catch (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('project_id column already exists in ' + table);
        } else {
            console.error('Error altering ' + table + ':', err.message);
        }
    }
});

console.log('Migration completed.');
process.exit(0);
