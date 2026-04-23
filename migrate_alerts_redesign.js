const Database = require('./backend/db');

try {
    console.log('Starting migration for Alerts Redesign...');

    // Add is_resolved column to logout_logs table
    try {
        Database.exec("ALTER TABLE logout_logs ADD COLUMN is_resolved INTEGER DEFAULT 0;");
        console.log('Added is_resolved to logout_logs');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('is_resolved already exists in logout_logs');
        } else {
            throw e;
        }
    }

    console.log('Migration completed successfully.');
} catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
}
