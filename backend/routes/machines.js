const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all machines
router.get('/', auth, (req, res) => {
  const machines = db.prepare('SELECT * FROM machines ORDER BY name').all();
  res.json(machines);
});

// GET single machine
router.get('/:id', auth, (req, res) => {
  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id);
  if (!machine) return res.status(404).json({ error: 'Machine not found' });
  res.json(machine);
});

// POST create machine (Admin/Supervisor)
router.post('/', auth, (req, res) => {
  if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type required.' });
  const result = db.prepare('INSERT INTO machines (name, type, status, idle_since) VALUES (?, ?, ?, ?)').run(name, type, 'idle', new Date().toISOString());
  res.json(db.prepare('SELECT * FROM machines WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update machine (Admin/Supervisor)
router.put('/:id', auth, (req, res) => {
  if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });
  const { name, type, status } = req.body;
  const now = new Date().toISOString();
  let idleSince = null;
  if (status === 'idle' || status === 'breakdown') idleSince = now;
  db.prepare('UPDATE machines SET name = ?, type = ?, status = ?, idle_since = ?, last_active_at = ? WHERE id = ?')
    .run(name, type, status, idleSince, status === 'running' ? now : null, req.params.id);
  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id);
  
  // Emit socket event
  const io = req.app.get('io');
  if (io) io.emit('machine:status', machine);

  res.json(machine);
});

// DELETE machine (Admin only)
router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  db.prepare('DELETE FROM machines WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
