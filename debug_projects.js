const db = require('./backend/db');
try {
    const projects = db.prepare(`
        SELECT p.*,
            (SELECT COUNT(*) FROM users u WHERE u.project_id = p.id AND u.role = 'worker') as workerCount,
            (SELECT COUNT(*) FROM users u WHERE u.project_id = p.id AND u.role = 'supervisor') as supervisorCount,
            (SELECT COUNT(*) FROM machines m WHERE m.project_id = p.id) as machineCount,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as taskCount
        FROM projects p
        ORDER BY p.created_at DESC
    `).all();
    console.log(JSON.stringify(projects, null, 2));
} catch (err) {
    console.error(err);
}
db.close();
