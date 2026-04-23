const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const creditService = require('../services/creditService');

// GET current user's credit summary
router.get('/summary', auth, async (req, res) => {
    try {
        // 1. Update activity (streak, daily reset, daily login bonus)
        const activityResult = await creditService.updateDailyActivity(req.user.id);

        // 2. Fetch updated user data
        const user = db.prepare('SELECT total_credits, today_credits, streak_count, last_active_at FROM users WHERE id = ?').get(req.user.id);

        // 3. Get recent logs (last 5)
        const recentLogs = db.prepare(`
      SELECT * FROM credit_logs 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `).all(req.user.id);

        res.json({
            summary: user,
            recentLogs,
            didUpdate: activityResult?.newDay || false
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET leaderboard
router.get('/leaderboard', auth, (req, res) => {
    try {
        const leaderboard = db.prepare(`
      SELECT id, name, profile_picture, total_credits, today_credits, streak_count
      FROM users
      WHERE role = 'worker'
      ORDER BY total_credits DESC
      LIMIT 10
    `).all();

        res.json(leaderboard);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST ping activity (optional dedicated endpoint)
router.post('/ping', auth, async (req, res) => {
    try {
        const result = await creditService.updateDailyActivity(req.user.id);
        res.json({ status: 'ok', ...result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
