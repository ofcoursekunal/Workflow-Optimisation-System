require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('🌱 Seeding database...');

// Disable foreign keys to allow clearing tables
db.exec('PRAGMA foreign_keys = OFF');

try {
  // Clear existing data
  db.prepare('DELETE FROM task_logs').run();
  db.prepare('DELETE FROM notifications').run();
  db.prepare('DELETE FROM tasks').run();
  db.prepare('DELETE FROM machines').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM requests').run();
  db.prepare('DELETE FROM break_logs').run();
  db.prepare("DELETE FROM sqlite_sequence").run();

  // Users
  const users = [
    { name: 'Admin Kumar', email: 'admin@shopfloor.com', password: 'Admin@123', role: 'admin' },
    { name: 'Supervisor Raj', email: 'supervisor@shopfloor.com', password: 'Super@123', role: 'supervisor' },
    { name: 'Supervisor Priya', email: 'supervisor2@shopfloor.com', password: 'Super@123', role: 'supervisor' },
    { name: 'Worker Arjun', email: 'worker@shopfloor.com', password: 'Worker@123', role: 'worker' },
    { name: 'Worker Deepa', email: 'worker2@shopfloor.com', password: 'Worker@123', role: 'worker' },
    { name: 'Worker Mohan', email: 'worker3@shopfloor.com', password: 'Worker@123', role: 'worker' },
    { name: 'Monitor Ravi', email: 'monitor@shopfloor.com', password: 'Monitor@123', role: 'monitor' },
  ];

  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  const userIds = {};
  users.forEach(u => {
    const hash = bcrypt.hashSync(u.password, 10);
    const res = insertUser.run(u.name, u.email, hash, u.role);
    userIds[u.email] = res.lastInsertRowid;
  });

  // Machines
  const machines = [
    { name: 'CNC Machine #1', type: 'CNC Milling', status: 'running' },
    { name: 'CNC Machine #2', type: 'CNC Lathe', status: 'idle' },
    { name: 'Welding Station A', type: 'MIG Welding', status: 'idle' },
    { name: 'Welding Station B', type: 'TIG Welding', status: 'running' },
    { name: 'Press Machine #1', type: 'Hydraulic Press', status: 'breakdown' },
    { name: 'Drilling Machine', type: 'Radial Drill', status: 'idle' },
  ];

  const insertMachine = db.prepare('INSERT INTO machines (name, type, status, last_active_at, idle_since) VALUES (?, ?, ?, ?, ?)');
  const machineIds = [];
  const now = new Date().toISOString();
  machines.forEach(m => {
    const idleSince = m.status !== 'running' ? now : null;
    const lastActive = m.status === 'running' ? now : null;
    const res = insertMachine.run(m.name, m.type, m.status, lastActive, idleSince);
    machineIds.push(res.lastInsertRowid);
  });

  // Tasks
  const tasks = [
    {
      title: 'Mill Shaft Component - Batch #A12',
      description: 'Mill 50 units of shaft component A12 to tolerance ±0.05mm',
      machine_id: machineIds[0], worker_id: userIds['worker@shopfloor.com'],
      priority: 'high', expected_minutes: 120, status: 'in_progress',
      started_at: new Date(Date.now() - 45 * 60000).toISOString(),
      deadline_at: new Date(Date.now() + 75 * 60000).toISOString()
    },
    {
      title: 'Lathe Precision Pins - Batch #B07',
      description: 'Turn 30 precision pins for assembly line B',
      machine_id: machineIds[1], worker_id: userIds['worker2@shopfloor.com'],
      priority: 'medium', expected_minutes: 90, status: 'not_started',
      started_at: null, deadline_at: null
    },
    {
      title: 'Weld Frame Assembly #C3',
      description: 'MIG weld the main frames for product C3',
      machine_id: machineIds[2], worker_id: userIds['worker3@shopfloor.com'],
      priority: 'high', expected_minutes: 60, status: 'paused',
      started_at: new Date(Date.now() - 90 * 60000).toISOString(),
      deadline_at: new Date(Date.now() - 30 * 60000).toISOString()
    },
    {
      title: 'TIG Weld Aluminum Enclosures',
      description: 'TIG weld 20 aluminium enclosures for export order',
      machine_id: machineIds[3], worker_id: userIds['worker@shopfloor.com'],
      priority: 'medium', expected_minutes: 150, status: 'in_progress',
      started_at: new Date(Date.now() - 60 * 60000).toISOString(),
      deadline_at: new Date(Date.now() + 90 * 60000).toISOString()
    },
    {
      title: 'Drill Guide Holes - Part #D99',
      description: 'Drill 8mm guide holes in D99 brackets',
      machine_id: machineIds[5], worker_id: userIds['worker2@shopfloor.com'],
      priority: 'low', expected_minutes: 45, status: 'completed',
      started_at: new Date(Date.now() - 180 * 60000).toISOString(),
      deadline_at: new Date(Date.now() - 135 * 60000).toISOString(),
      completed_at: new Date(Date.now() - 140 * 60000).toISOString()
    },
    {
      title: 'Quality Check - Batch A11',
      description: 'Inspect and record dimensions for batch A11',
      machine_id: null, worker_id: userIds['worker3@shopfloor.com'],
      priority: 'high', expected_minutes: 30, status: 'delayed',
      started_at: new Date(Date.now() - 120 * 60000).toISOString(),
      deadline_at: new Date(Date.now() - 90 * 60000).toISOString()
    },
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, machine_id, assigned_worker_id, created_by, priority, expected_minutes, status, started_at, deadline_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLog = db.prepare('INSERT INTO task_logs (task_id, action, pause_reason, note, performed_by) VALUES (?, ?, ?, ?, ?)');

  const supervisorId = userIds['supervisor@shopfloor.com'];
  tasks.forEach(t => {
    const res = insertTask.run(t.title, t.description, t.machine_id, t.worker_id, supervisorId, t.priority, t.expected_minutes, t.status, t.started_at, t.deadline_at, t.completed_at || null);
    const taskId = res.lastInsertRowid;

    insertLog.run(taskId, 'assigned', null, null, supervisorId);
    if (t.status !== 'not_started') {
      insertLog.run(taskId, 'started', null, null, t.worker_id);
    }
    if (t.status === 'paused') {
      insertLog.run(taskId, 'paused', 'Material not available', null, t.worker_id);
    }
    if (t.status === 'completed') {
      insertLog.run(taskId, 'completed', null, null, t.worker_id);
    }
    if (t.status === 'delayed') {
      insertLog.run(taskId, 'delayed', null, 'Auto-detected: exceeded expected completion time', null);
    }
  });

  // Sample notifications
  const insertNotif = db.prepare('INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, ?)');
  insertNotif.run(userIds['supervisor@shopfloor.com'], '🔴 Task "Weld Frame Assembly #C3" is DELAYED!', 'error', 0);
  insertNotif.run(userIds['supervisor@shopfloor.com'], '⚠️ Machine "Welding Station A" has been idle for 20 minutes.', 'warning', 0);
  insertNotif.run(userIds['worker@shopfloor.com'], 'New task assigned: "TIG Weld Aluminum Enclosures"', 'info', 1);
  insertNotif.run(userIds['worker3@shopfloor.com'], '⏰ Your task "Quality Check - Batch A11" is overdue!', 'error', 0);
  insertNotif.run(userIds['admin@shopfloor.com'], '✅ Task "Drill Guide Holes - Part #D99" completed by Worker Deepa', 'success', 0);

  console.log('\n✅ Seed complete! Demo accounts:');
  console.log('   Admin:      admin@shopfloor.com      / Admin@123');
  console.log('   Supervisor: supervisor@shopfloor.com / Super@123');
  console.log('   Worker:     worker@shopfloor.com     / Worker@123');
  console.log('   Monitor:    monitor@shopfloor.com    / Monitor@123');

} catch (err) {
  console.error('❌ Seeding failed:', err);
} finally {
  db.exec('PRAGMA foreign_keys = ON');
}
