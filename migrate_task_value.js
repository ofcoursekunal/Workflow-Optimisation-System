const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'backend', 'shopfloor.db'));

console.log('Running Task-Specific Credit Migration...');

try {
    // Add credit_value to tasks if it doesn't exist
    db.exec("ALTER TABLE tasks ADD COLUMN credit_value INTEGER DEFAULT 1");
    console.log('Added credit_value column to tasks table.');
} catch (e) {
    if (e.message.includes('duplicate column name')) {
        console.log('credit_value column already exists.');
    } else {
        throw e;
    }
}

console.log('Migration completed successfully.');
process.exit(0);
