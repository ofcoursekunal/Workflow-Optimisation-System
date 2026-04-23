const Database = require('./backend/db');

try {
    console.log('Starting migration for Smart Logout Extension...');

    // Add columns to tasks table
    try {
        Database.exec("ALTER TABLE tasks ADD COLUMN last_logout_reason TEXT;");
        console.log('Added last_logout_reason to tasks');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('last_logout_reason already exists in tasks');
        } else {
            throw e;
        }
    }

    try {
        Database.exec("ALTER TABLE tasks ADD COLUMN last_logout_time DATETIME;");
        console.log('Added last_logout_time to tasks');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('last_logout_time already exists in tasks');
        } else {
            throw e;
        }
    }

    // Add role column to logout_logs table
    try {
        Database.exec("ALTER TABLE logout_logs ADD COLUMN role TEXT NOT NULL DEFAULT 'worker';");
        console.log('Added role to logout_logs');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('role already exists in logout_logs');
        } else {
            throw e;
        }
    }

    console.log('Migration completed successfully.');
} catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
}
