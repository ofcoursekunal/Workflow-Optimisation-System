const db = require('../db');

class CreditService {
    /**
     * Add credits to a user and log the action
     */
    async addCredits(userId, action, credits, taskId = null) {
        if (credits <= 0) return null;

        try {
            const transaction = db.transaction(() => {
                // 1. Update user totals
                db.prepare(`
          UPDATE users 
          SET total_credits = total_credits + ?,
              today_credits = today_credits + ?
          WHERE id = ?
        `).run(credits, credits, userId);

                // 2. Log the credit action
                const result = db.prepare(`
          INSERT INTO credit_logs (user_id, task_id, action, credits)
          VALUES (?, ?, ?, ?)
        `).run(userId, taskId, action, credits);

                return result.lastInsertRowid;
            });

            return transaction();
        } catch (e) {
            console.error('Error adding credits:', e);
            return null;
        }
    }

    /**
     * Check and update daily activity, login bonuses, and streaks
     */
    async updateDailyActivity(userId) {
        const user = db.prepare('SELECT last_active_at, streak_count, today_credits FROM users WHERE id = ?').get(userId);
        if (!user) return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        let lastActive = null;
        if (user.last_active_at) {
            const la = new Date(user.last_active_at);
            lastActive = new Date(la.getFullYear(), la.getMonth(), la.getDate()).getTime();
        }

        // 1. If it's a new day, reset today_credits and update streaks
        if (lastActive !== today) {
            let newStreak = 1;
            const yesterday = today - 86400000;

            if (lastActive === yesterday) {
                newStreak = user.streak_count + 1;
            }

            db.prepare(`
        UPDATE users 
        SET today_credits = 0,
            streak_count = ?,
            last_active_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStreak, userId);

            // Removed daily login and streak bonuses as per requirement (task-based credits only)

            return { newDay: true, streak: newStreak };
        } else {
            // Just update timestamp
            db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
            return { newDay: false, streak: user.streak_count };
        }
    }

    /**
     * Calculate and award rewards for a completed task
     */
    async awardTaskCompletion(taskId) {
        // 1. Get task details (including credit_value)
        const task = db.prepare(`
            SELECT t.*, u.id as userId, u.role as userRole
            FROM tasks t
            JOIN users u ON t.assigned_worker_id = u.id
            WHERE t.id = ? AND t.status = 'completed'
        `).get(taskId);

        if (!task) return 0;

        // 2. Validate completion was worker-initiated via app
        const lastLog = db.prepare(`
            SELECT performed_by 
            FROM task_logs 
            WHERE task_id = ? AND action = 'completed' 
            ORDER BY timestamp DESC LIMIT 1
        `).get(taskId);

        if (!lastLog || lastLog.performed_by !== task.userId || task.userRole !== 'worker') {
            return 0; // No credits for supervisor override or non-worker
        }

        // 3. Award the pre-assigned credit_value for this specific task
        const amount = task.credit_value || 1;
        await this.addCredits(task.userId, 'task_completion', amount, taskId);

        return amount;
    }
}

module.exports = new CreditService();
