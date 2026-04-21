const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET logs for a task
router.get('/task/:taskId', auth, (req, res) => {
  const logs = db.prepare(`
    SELECT tl.*, u.name as performed_by_name
    FROM task_logs tl
    LEFT JOIN users u ON tl.performed_by = u.id
    WHERE tl.task_id = ?
    ORDER BY tl.timestamp ASC
  `).all(req.params.taskId);
  res.json(logs);
});

// GET recent logs (Admin/Supervisor dashboard)
router.get('/recent', auth, (req, res) => {
  if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });
  const limit = parseInt(req.query.limit) || 20;

  let projectId = req.user.project_id;
  if (req.user.role === 'supervisor') {
    const user = db.prepare('SELECT project_id FROM users WHERE id = ?').get(req.user.id);
    projectId = user ? user.project_id : null;
  }
  const isSupervisor = req.user.role === 'supervisor' && projectId !== null;

  const logs = db.prepare(`
    SELECT tl.*, u.name as performed_by_name, t.title as task_title
    FROM task_logs tl
    LEFT JOIN users u ON tl.performed_by = u.id
    LEFT JOIN tasks t ON tl.task_id = t.id
    WHERE 1=1
    ${isSupervisor ? 'AND t.project_id = ?' : ''}
    ORDER BY tl.timestamp DESC
    LIMIT ?
  `).all(...(isSupervisor ? [projectId, limit] : [limit]));
  res.json(logs);
});

module.exports = router;
