const db = require('../db');
const cron = require('node-cron');

module.exports = (io) => {
  // Run every 30 seconds
  cron.schedule('*/1 * * * *', () => {
    // Find in-progress tasks that have exceeded their deadline
    const overdueTasks = db.prepare(`
      SELECT t.*, u.name as worker_name, m.name as machine_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_worker_id = u.id
      LEFT JOIN machines m ON t.machine_id = m.id
      WHERE t.status = 'in_progress'
      AND t.deadline_at IS NOT NULL
      AND t.deadline_at < datetime('now')
    `).all();

    overdueTasks.forEach(task => {
      // Mark as delayed
      db.prepare("UPDATE tasks SET status = 'delayed' WHERE id = ?").run(task.id);
      
      // Log it (avoid duplicate logs)
      const existing = db.prepare("SELECT id FROM task_logs WHERE task_id = ? AND action = 'delayed'").get(task.id);
      if (!existing) {
        db.prepare('INSERT INTO task_logs (task_id, action, note) VALUES (?, ?, ?)').run(task.id, 'delayed', 'Auto-detected: exceeded expected completion time');
      }

      const message = `🔴 Task "${task.title}"${task.worker_name ? ` (Worker: ${task.worker_name})` : ''} is DELAYED!`;

      // Notify worker
      if (task.assigned_worker_id) {
        const workerNotified = db.prepare(`
          SELECT id FROM notifications 
          WHERE user_id = ? AND message LIKE ? AND created_at > datetime('now', '-30 minutes')
        `).get(task.assigned_worker_id, `%${task.title}%DELAYED%`);
        if (!workerNotified) {
          db.prepare('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)').run(task.assigned_worker_id, `⏰ Your task "${task.title}" is overdue!`, 'error');
          io.to(`user_${task.assigned_worker_id}`).emit('notification:new', { message: `⏰ Your task "${task.title}" is overdue!`, type: 'error' });
        }
      }

      // Notify supervisors
      const supervisors = db.prepare("SELECT id FROM users WHERE role IN ('admin','supervisor')").all();
      supervisors.forEach(s => {
        const supNotified = db.prepare(`
          SELECT id FROM notifications 
          WHERE user_id = ? AND message LIKE ? AND created_at > datetime('now', '-30 minutes')
        `).get(s.id, `%${task.title}%DELAYED%`);
        if (!supNotified) {
          db.prepare('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)').run(s.id, message, 'error');
          io.to(`user_${s.id}`).emit('notification:new', { message, type: 'error' });
        }
      });

      // Emit updated task
      const updatedTask = db.prepare(`
        SELECT t.*, u.name as worker_name, m.name as machine_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_worker_id = u.id
        LEFT JOIN machines m ON t.machine_id = m.id
        WHERE t.id = ?
      `).get(task.id);
      io.emit('task:updated', updatedTask);
    });
  });
};
