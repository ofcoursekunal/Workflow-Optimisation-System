const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET recent logout alerts for supervisors
router.get('/alerts', auth, (req, res) => {
    if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { status, workerId } = req.query;

    try {
        let query = `SELECT * FROM alerts WHERE 1=1`;
        const params = [];

        if (status === 'active') {
            query += ` AND status = 'unread'`;
        } else if (status === 'resolved') {
            query += ` AND status = 'reviewed'`;
        }

        if (workerId) {
            query += ` AND l.user_id = ?`;
            params.push(workerId);
        }

        query += ` ORDER BY timestamp DESC LIMIT 50`;

        const alerts = db.prepare(query).all(...params);
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch supervisor alerts: ' + err.message });
    }
});

// PUT resolve an alert
router.put('/alerts/:id/resolve', auth, (req, res) => {
    if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const result = db.prepare("UPDATE alerts SET status = 'reviewed' WHERE id = ?").run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to resolve alert: ' + err.message });
    }
});

module.exports = router;
