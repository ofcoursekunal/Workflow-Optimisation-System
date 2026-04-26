const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../shopfloor.db'));

function verifyMigration() {
    console.log('🔍 Verifying User Shift Support...');

    // Check if we can fetch shifts
    const users = db.prepare("SELECT id, name, shifts FROM users WHERE role = 'worker' LIMIT 1").all();
    if (users.length > 0) {
        console.log(`✅ Fetched worker: ${users[0].name}`);
        console.log(`✅ Shift Data: ${users[0].shifts}`);
    } else {
        console.log('⚠️ No workers found for verification.');
    }

    // Try a "Create" simulation (direct DB insert similar to API)
    const testEmail = `test_${Date.now()}@test.com`;
    const nightShift = JSON.stringify([{ days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], startTime: "20:00", endTime: "08:00" }]);

    try {
        db.prepare("INSERT INTO users (name, email, password_hash, role, shifts) VALUES (?, ?, ?, ?, ?)").run(
            'Test Shift User',
            testEmail,
            'dummy_hash',
            'worker',
            nightShift
        );
        console.log('✅ Successfully created test user with Night Shift');

        const fetched = db.prepare("SELECT shifts FROM users WHERE email = ?").get(testEmail);
        if (fetched.shifts === nightShift) {
            console.log('✅ Shift data persisted exactly as expected');
        } else {
            throw new Error('Shift data mismatch!');
        }

        // Cleanup
        db.prepare("DELETE FROM users WHERE email = ?").run(testEmail);
        console.log('✅ Cleanup successful');
    } catch (e) {
        console.error('❌ Verification failed:', e.message);
        process.exit(1);
    }

    console.log('✨ Admin Shift Management Backend Verified.');
}

verifyMigration();
