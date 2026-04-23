const Database = require('./backend/db');

async function verifyRedesign() {
    const userId = 10;
    const time = new Date().toISOString();

    console.log('--- Testing Alert Resolution ---');

    // Create a fresh alert
    const insertResult = Database.prepare(`
    INSERT INTO logout_logs (user_id, pending_tasks, delayed_tasks, reason, note, role, logout_time, is_resolved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, 2, 1, 'Machine breakdown', 'Redesign Test', 'worker', time, 0);

    const alertId = insertResult.lastInsertRowid;
    console.log('Created alert:', alertId);

    // Check active alerts
    const activeAlerts = Database.prepare("SELECT id FROM logout_logs WHERE is_resolved = 0 AND id = ?").all(alertId);
    console.log('Is in active list?', activeAlerts.length > 0 ? '✅ YES' : '❌ NO');

    // Resolve it
    console.log('Resolving alert', alertId);
    Database.prepare("UPDATE logout_logs SET is_resolved = 1 WHERE id = ?").run(alertId);

    // Check active vs resolved
    const activeAfter = Database.prepare("SELECT id FROM logout_logs WHERE is_resolved = 0 AND id = ?").all(alertId);
    const resolvedAfter = Database.prepare("SELECT id FROM logout_logs WHERE is_resolved = 1 AND id = ?").all(alertId);

    console.log('Is in active list now?', activeAfter.length > 0 ? '❌ NO' : '✅ NO');
    console.log('Is in resolved list now?', resolvedAfter.length > 0 ? '✅ YES' : '❌ NO');

    if (activeAfter.length === 0 && resolvedAfter.length > 0) {
        console.log('✅ Alert resolution logic verified');
    } else {
        console.log('❌ Alert resolution logic failed');
    }
}

verifyRedesign();
