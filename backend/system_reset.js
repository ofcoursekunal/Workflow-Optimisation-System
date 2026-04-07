const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'shopfloor.db'));

try {
  db.transaction(() => {
    // Delete logs, tasks, notifications
    db.prepare('DELETE FROM task_logs').run();
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM notifications').run();
    
    // Delete users except kunal (ID 8)
    db.prepare('DELETE FROM users WHERE id != 8').run();
    
    // Reset machines
    db.prepare("UPDATE machines SET status = 'idle', idle_since = CURRENT_TIMESTAMP").run();
  })();
  console.log('✅ System Reset Successful! Only "kunal" account preserved.');
} catch (err) {
  console.error('❌ Error during reset:', err.message);
}
