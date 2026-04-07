const db = require('../db');
const cron = require('node-cron');

module.exports = (io) => {
  // Run every minute
  cron.schedule('* * * * *', () => {
    const now = new Date();
    const thresholdMinutes = parseInt(process.env.IDLE_THRESHOLD_MINUTES) || 15;

    // Find all idle machines that have been idle > threshold
    const idleMachines = db.prepare(`
      SELECT * FROM machines 
      WHERE status = 'idle' 
      AND idle_since IS NOT NULL
      AND (julianday('now') - julianday(idle_since)) * 24 * 60 > ?
    `).all(thresholdMinutes);

    idleMachines.forEach(machine => {
      const idleMinutes = Math.round((Date.now() - new Date(machine.idle_since).getTime()) / 60000);
      const message = `⚠️ Machine "${machine.name}" has been idle for ${idleMinutes} minutes.`;

      // Notify supervisors and admins
      const supervisors = db.prepare("SELECT id FROM users WHERE role IN ('admin','supervisor')").all();
      const notified = new Set();
      supervisors.forEach(s => {
        if (!notified.has(s.id)) {
          notified.add(s.id);
          // Check if we already sent this notification in the last 30 min
          const recent = db.prepare(`
            SELECT id FROM notifications 
            WHERE user_id = ? AND message LIKE ? AND created_at > datetime('now', '-30 minutes')
          `).get(s.id, `%${machine.name}%idle%`);
          if (!recent) {
            db.prepare('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)').run(s.id, message, 'warning');
            io.to(`user_${s.id}`).emit('notification:new', { message, type: 'warning' });
          }
        }
      });

      // Emit machine status update
      io.emit('machine:status', machine);
    });
  });
};
