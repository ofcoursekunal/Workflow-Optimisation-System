const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// GET all users (Admin only)
router.get('/', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const users = db.prepare('SELECT id, name, email, role, status, is_on_break, created_at FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

// GET workers only
router.get('/workers', auth, (req, res) => {
  const workers = db.prepare("SELECT id, name, email, status, is_on_break FROM users WHERE role = 'worker'").all();
  res.json(workers);
});

// POST create user (Admin only)
router.post('/', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required.' });
  if (role === 'admin') return res.status(400).json({ error: 'Creating additional admins is not permitted.' });

  const valid_roles = ['supervisor', 'worker', 'monitor'];
  if (!valid_roles.includes(role)) return res.status(400).json({ error: 'Invalid role.' });

  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role);
    res.json({ id: result.lastInsertRowid, name, email, role });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists.' });
    res.status(500).json({ error: err.message });
  }
});

// PUT update user (Admin only)
router.put('/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, role } = req.body;
  const targetId = req.params.id;

  try {
    const userToUpdate = db.prepare('SELECT email, role FROM users WHERE id = ?').get(targetId);
    if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

    // Protect the primary admin
    if (userToUpdate.email === 'admin@shopfloor.com') {
      return res.status(400).json({ error: 'The primary admin account cannot be modified via this panel.' });
    }

    if (userToUpdate.role !== 'admin' && role === 'admin') {
      return res.status(400).json({ error: 'Cannot promote user to admin.' });
    }

    db.prepare('UPDATE users SET name = ?, role = ? WHERE id = ?').run(name, role, targetId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user: ' + err.message });
  }
});

// DELETE user (Admin only)
router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const userId = req.params.id;

  try {
    const userToDelete = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    if (!userToDelete) return res.status(404).json({ error: 'User not found' });

    // Protect primary admin
    if (userToDelete.email === 'admin@shopfloor.com') {
      return res.status(400).json({ error: 'The primary admin account cannot be deleted.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    const io = req.app.get('io');
    if (io) {
      io.emit('user:deleted', { id: parseInt(userId) });
      const autoAssign = req.app.get('autoAssign');
      if (autoAssign) autoAssign.attemptAutoAssign(io);
    }

    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('FOREIGN KEY')) {
      return res.status(400).json({ error: 'Cannot delete user: This user has associated tasks or logs. Please reassign or delete their tasks first.' });
    }
    res.status(500).json({ error: 'Failed to delete user: ' + err.message });
  }
});

module.exports = router;
