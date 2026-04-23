const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Allow only admins
const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// GET all credit settings
router.get('/', auth, adminAuth, (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings').all();
        const settingsMap = settings.reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {});
        res.json(settingsMap);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// UPDATE credit settings
router.post('/', auth, adminAuth, (req, res) => {
    try {
        const updates = req.body;
        const transaction = db.transaction(() => {
            const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
            for (const [key, value] of Object.entries(updates)) {
                updateStmt.run(key, String(value));
            }
        });
        transaction();
        res.json({ message: 'Settings updated successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
