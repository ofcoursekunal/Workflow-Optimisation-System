const Database = require('./backend/db');

async function testExtension() {
    const userId = 10; // Worker from previous test
    const reason = 'Material not available';
    const time = new Date().toISOString();

    console.log('--- Testing Task Tagging ---');

    // Assign a task to the worker if none exists
    const existingTask = Database.prepare("SELECT id FROM tasks WHERE assigned_worker_id = ? AND status != 'completed' LIMIT 1").get(userId);
    let taskId;
    if (!existingTask) {
        const result = Database.prepare("INSERT INTO tasks (title, assigned_worker_id, status) VALUES (?, ?, ?)").run('Extension Test Task', userId, 'in_progress');
        taskId = result.lastInsertRowid;
        console.log('Created test task:', taskId);
    } else {
        taskId = existingTask.id;
        console.log('Using existing task:', taskId);
    }

    // Simulate logout logic from routes/users.js
    console.log('Simulating logout for user', userId);
    Database.prepare(`
    UPDATE tasks 
    SET last_logout_reason = ?, last_logout_time = ? 
    WHERE assigned_worker_id = ? AND status IN ('not_started', 'in_progress', 'paused', 'delayed')
  `).run(reason, time, userId);

    const updatedTask = Database.prepare("SELECT last_logout_reason, last_logout_time FROM tasks WHERE id = ?").get(taskId);
    console.log('Updated Task Metadata:', updatedTask);

    if (updatedTask.last_logout_reason === reason) {
        console.log('✅ Task tagging successful');
    } else {
        console.log('❌ Task tagging failed');
    }

    console.log('\n--- Testing Supervisor Alert Storage ---');
    Database.prepare(`
    INSERT INTO logout_logs (user_id, pending_tasks, delayed_tasks, reason, note, role, logout_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, 1, 0, reason, 'Simulated note', 'worker', time);

    const alert = Database.prepare(`
    SELECT l.*, u.name as workerName 
    FROM logout_logs l
    JOIN users u ON l.user_id = u.id
    WHERE l.user_id = ? AND l.pending_tasks > 0
    ORDER BY l.logout_time DESC LIMIT 1
  `).get(userId);

    console.log('Retrieved Alert:', alert);
    if (alert && alert.workerName) {
        console.log('✅ Supervisor alert storage successful');
    } else {
        console.log('❌ Supervisor alert storage failed');
    }
}

testExtension();
