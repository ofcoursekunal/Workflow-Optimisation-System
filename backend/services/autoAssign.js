const db = require('../db');
const cron = require('node-cron');

const AUTO_ASSIGN_INTERVAL_MINUTES = 2; // Check every 2 minutes
const IDLE_THRESHOLD_MINUTES = 5;       // Machine must be idle for 5+ min

function createNotif(userId, message, type) {
  try {
    db.prepare('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)').run(userId, message, type);
  } catch {}
}

function getIdleMinutes(isoString) {
  if (!isoString) return 999;
  return (Date.now() - new Date(isoString).getTime()) / 60000;
}

/**
 * Intelligent Auto-Assignment Logic
 * 1. Find idle machines.
 * 2. Find idle workers (status = 'idle').
 * 3. Sort workers by completed tasks today (load balancing).
 * 4. Match with unassigned tasks (not_started) by priority.
 */
async function attemptAutoAssign(io) {
  try {
    // 1. Find unassigned tasks that are not started
    const pendingTasks = db.prepare(`
      SELECT t.*, u.name as worker_name, m.name as machine_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_worker_id = u.id
      LEFT JOIN machines m ON t.machine_id = m.id
      WHERE t.assigned_worker_id IS NULL AND t.status = 'not_started'
      ORDER BY 
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.created_at ASC
    `).all();

    if (pendingTasks.length === 0) return 0;

    let autoAssigned = 0;
    const supervisors = db.prepare("SELECT id FROM users WHERE role IN ('admin','supervisor')").all();

    for (const task of pendingTasks) {
      // 2. Find Best Worker: Prefer Idle (FIFO), fallback to Busy (Shortest Queue)
      let targetWorker = db.prepare(`
        SELECT id, name, status, last_idle_at,
               (SELECT COUNT(*) FROM tasks WHERE assigned_worker_id = users.id AND status = 'not_started') as queue_size
        FROM users
        WHERE role = 'worker'
        ORDER BY 
          CASE status WHEN 'idle' THEN 1 ELSE 2 END,
          queue_size ASC,
          last_idle_at ASC
        LIMIT 1
      `).get();

      if (!targetWorker) continue;

      // 3. Find Best Machine (Shortest Queue)
      let targetMachine = db.prepare(`
        SELECT id, name, status,
               (SELECT COUNT(*) FROM tasks WHERE machine_id = machines.id AND status = 'not_started') as queue_size
        FROM machines
        WHERE status != 'breakdown'
        ORDER BY 
          CASE status WHEN 'idle' THEN 1 WHEN 'occupied' THEN 2 ELSE 3 END,
          queue_size ASC,
          created_at ASC
        LIMIT 1
      `).get();

      if (targetWorker && targetMachine) {
        // 4. Assign
        db.prepare(`UPDATE tasks SET assigned_worker_id = ?, machine_id = ? WHERE id = ?`)
          .run(targetWorker.id, targetMachine.id, task.id);

        // If machine was idle, mark it occupied
        if (targetMachine.status === 'idle') {
          db.prepare(`UPDATE machines SET status = 'occupied', idle_since = NULL WHERE id = ?`).run(targetMachine.id);
          if (io) io.emit('machine:status', { id: targetMachine.id, status: 'occupied' });
        }

        // If worker was idle, we still keep them idle until they START (previous logic)
        
        db.prepare(`
          INSERT INTO task_logs (task_id, action, note, performed_by)
          VALUES (?, 'assigned', ?, NULL)
        `).run(task.id, `🤖 Auto-assigned to ${targetWorker.name} on ${targetMachine.name} (Queue: ${targetMachine.queue_size + 1})`);

        // Notification
        const msg = `🤖 Auto-Assignment: "${task.title}" → ${targetWorker.name}`;
        [targetWorker.id, ...supervisors.map(s => s.id)].forEach(uid => {
          createNotif(uid, msg, 'info');
          if (io) io.to(`user_${uid}`).emit('notification:new', { message: msg, type: 'info' });
        });

        // Broadcast task update
        const updatedTask = db.prepare(`SELECT t.*, u.name as worker_name, m.name as machine_name FROM tasks t LEFT JOIN users u ON t.assigned_worker_id = u.id LEFT JOIN machines m ON t.machine_id = m.id WHERE t.id = ?`).get(task.id);
        if (io) io.emit('task:updated', updatedTask);

        autoAssigned++;
      }
    }
    return autoAssigned;
  } catch (err) {
    console.error('[AutoAssign] Error:', err.message);
    return 0;
  }
}

module.exports = (io) => {
  // 1. Periodic check
  cron.schedule(`*/${AUTO_ASSIGN_INTERVAL_MINUTES} * * * *`, async () => {
    const count = await attemptAutoAssign(io);
    if (count > 0) console.log(`[AutoAssign] ${count} task(s) auto-assigned via cron.`);
  });

  console.log(`🤖 Intelligent Auto-Assign service active (Trigger-based + Cron ${AUTO_ASSIGN_INTERVAL_MINUTES}m)`);
  
  return { attemptAutoAssign };
};
