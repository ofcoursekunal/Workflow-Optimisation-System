const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../shopfloor.db'));

const dayShift = JSON.stringify([
    { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], startTime: "08:00", endTime: "20:00" }
]);

const nightShift = JSON.stringify([
    { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], startTime: "20:00", endTime: "08:00" }
]);

const weekendShift = JSON.stringify([
    { days: ["Sun"], startTime: "00:00", endTime: "23:59" }
]);

function migrate() {
    console.log('🚀 Migrating worker shifts...');

    // Add column if it doesn't exist (defensive)
    try {
        db.exec("ALTER TABLE users ADD COLUMN shifts TEXT");
    } catch (e) {
        console.log('ℹ️ shifts column already exists or migration handled.');
    }

    const workers = db.prepare("SELECT id, name FROM users WHERE role = 'worker'").all();

    workers.forEach((worker, idx) => {
        let shift;
        if (idx % 3 === 0) shift = nightShift;
        else if (idx % 3 === 1) shift = dayShift;
        else shift = weekendShift;

        db.prepare("UPDATE users SET shifts = ? WHERE id = ?").run(shift, worker.id);
        console.log(`✅ Assigned shift to ${worker.name}`);
    });

    console.log('✨ Migration complete.');
}

migrate();
process.exit(0);
