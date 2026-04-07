const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

function createNotification(userId, message, type = 'info') {
  try {
    db.prepare('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)').run(userId, message, type);
  } catch (e) {}
}

function emitUpdate(req, eventName, data) {
  const io = req.app.get('io');
  if (io) io.emit(eventName, data);
}

function notifyAndEmit(req, userIds, message, type, eventName, eventData) {
  const io = req.app.get('io');
  userIds.forEach(uid => {
    if (uid) {
      createNotification(uid, message, type);
      if (io) io.to(`user_${uid}`).emit('notification:new', { message, type });
    }
  });
  if (eventName && io) io.emit(eventName, eventData);
}

// GET all tasks (role-filtered)
router.get('/', auth, (req, res) => {
  let tasks;
  if (req.user.role === 'worker') {
    tasks = db.prepare(`
      SELECT t.*, u.name as worker_name, u.status as worker_status, m.name as machine_name, m.status as machine_status, s.name as supervisor_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_worker_id = u.id
      LEFT JOIN machines m ON t.machine_id = m.id
      LEFT JOIN users s ON t.created_by = s.id
      WHERE t.assigned_worker_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id);
  } else {
    tasks = db.prepare(`
      SELECT t.*, u.name as worker_name, u.status as worker_status, m.name as machine_name, m.status as machine_status, s.name as supervisor_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_worker_id = u.id
      LEFT JOIN machines m ON t.machine_id = m.id
      LEFT JOIN users s ON t.created_by = s.id
      ORDER BY t.created_at DESC
    `).all();
  }
  res.json(tasks);
});

// GET single task
router.get('/:id', auth, (req, res) => {
  const task = db.prepare(`
    SELECT t.*, u.name as worker_name, m.name as machine_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_worker_id = u.id
    LEFT JOIN machines m ON t.machine_id = m.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST create task (Admin/Supervisor)
router.post('/', auth, (req, res) => {
  if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });
  const { title, description, machine_id, assigned_worker_id, priority, expected_minutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required.' });

  const result = db.prepare(`
    INSERT INTO tasks (title, description, machine_id, assigned_worker_id, created_by, priority, expected_minutes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'not_started')
  `).run(title, description || '', machine_id || null, assigned_worker_id || null, req.user.id, priority || 'medium', expected_minutes || 30);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

  db.prepare('INSERT INTO task_logs (task_id, action, performed_by) VALUES (?, ?, ?)').run(task.id, 'assigned', req.user.id);

  const io = req.app.get('io');
  if (assigned_worker_id) {
    notifyAndEmit(req, [assigned_worker_id], `New task assigned: "${title}"`, 'info', 'task:updated', task);
  } else {
    const autoAssign = req.app.get('autoAssign');
    if (autoAssign) autoAssign.attemptAutoAssign(io);
    emitUpdate(req, 'task:updated', task);
  }

  res.json(task);
});

// PUT update task status (Worker actions + Supervisor override)
router.put('/:id', auth, (req, res) => {
  const taskId = req.params.id;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Workers can only update their own tasks
  if (req.user.role === 'worker' && task.assigned_worker_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your task' });
  }

  const { action, pause_reason, note, title, machine_id, assigned_worker_id, priority, expected_minutes, status_override } = req.body;

  const io = req.app.get('io');
  const now = new Date().toISOString();
  let updateFields = {};
  let logAction = action;

  // Handle direct status override (Admin/Supervisor)
  if (status_override && req.user.role !== 'worker') {
    updateFields.status = status_override;
    if (status_override === 'completed') {
      updateFields.completed_at = now;
    }
    logAction = 'overridden';
  } else {
    switch (action) {
      case 'start':
        if (task.status !== 'not_started' && task.status !== 'paused') {
          return res.status(400).json({ error: 'Cannot start task in current state.' });
        }
        // Check machine status (Queuing prevention)
        if (task.machine_id) {
          const machine = db.prepare('SELECT status FROM machines WHERE id = ?').get(task.machine_id);
          if (machine.status === 'running') {
            return res.status(400).json({ error: 'Machinery is currently held by another worker. Please wait.' });
          }
        }
        const deadline = new Date(Date.now() + (task.expected_minutes * 60 * 1000)).toISOString();
        updateFields = { status: 'in_progress', started_at: task.started_at || now, deadline_at: deadline };
        logAction = task.status === 'paused' ? 'resumed' : 'started';
        // Update worker to busy
        if (task.assigned_worker_id) {
          db.prepare("UPDATE users SET status = 'busy' WHERE id = ?").run(task.assigned_worker_id);
          if (io) io.emit('user:status', { userId: task.assigned_worker_id, status: 'busy' });
        }
        // Update machine to running
        if (task.machine_id) {
          db.prepare("UPDATE machines SET status = 'running', last_active_at = ?, idle_since = NULL WHERE id = ?").run(now, task.machine_id);
          const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(task.machine_id);
          emitUpdate(req, 'machine:status', machine);
        }
        break;

      case 'pause':
        if (task.status !== 'in_progress') {
          return res.status(400).json({ error: 'Task is not in progress.' });
        }
        updateFields = { status: 'paused' };
        logAction = 'paused';
        // Update worker to paused
        if (task.assigned_worker_id) {
          db.prepare("UPDATE users SET status = 'paused', last_idle_at = CURRENT_TIMESTAMP WHERE id = ?").run(task.assigned_worker_id);
          if (io) io.emit('user:status', { userId: task.assigned_worker_id, status: 'paused', last_idle_at: new Date().toISOString() });
        }
        // Check if machine has other active tasks or becomes free
        if (task.machine_id) {
          const otherActive = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE machine_id = ? AND id != ? AND status = 'in_progress'").get(task.machine_id, taskId);
          if (otherActive.c === 0) {
            // Check if there is a next task in queue for this machine
            const nextTask = db.prepare("SELECT * FROM tasks WHERE machine_id = ? AND status = 'not_started' ORDER BY priority DESC, created_at ASC LIMIT 1").get(task.machine_id);
            const nextStatus = nextTask ? 'occupied' : 'idle';
            db.prepare("UPDATE machines SET status = ?, idle_since = ? WHERE id = ?").run(nextStatus, nextStatus === 'idle' ? now : null, task.machine_id);
            const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(task.machine_id);
            emitUpdate(req, 'machine:status', machine);
            
            // Notify next worker
            if (nextTask && nextTask.assigned_worker_id) {
              const msg = `🟢 Machine "${machine.name}" is now free! You can start your task: "${nextTask.title}".`;
              notifyAndEmit(req, [nextTask.assigned_worker_id], msg, 'success', 'notification:new', { message: msg, type: 'success' });
            }
          }
        }
        break;

      case 'complete':
        if (task.status === 'completed') return res.status(400).json({ error: 'Already completed.' });
        updateFields = { status: 'completed', completed_at: now };
        logAction = 'completed';
        // Update worker to idle
        if (task.assigned_worker_id) {
          db.prepare("UPDATE users SET status = 'idle', last_idle_at = CURRENT_TIMESTAMP WHERE id = ?").run(task.assigned_worker_id);
          if (io) io.emit('user:status', { userId: task.assigned_worker_id, status: 'idle', last_idle_at: new Date().toISOString() });
          // Trigger next assignment
          const autoAssign = req.app.get('autoAssign');
          if (autoAssign) autoAssign.attemptAutoAssign(io);
        }
        // Check if machine has other active tasks or becomes free
        if (task.machine_id) {
          const otherActive = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE machine_id = ? AND id != ? AND status = 'in_progress'").get(task.machine_id, taskId);
          if (otherActive.c === 0) {
            // Check if there is a next task in queue for this machine
            const nextTask = db.prepare("SELECT * FROM tasks WHERE machine_id = ? AND status = 'not_started' ORDER BY priority DESC, created_at ASC LIMIT 1").get(task.machine_id);
            const nextStatus = nextTask ? 'occupied' : 'idle';
            db.prepare("UPDATE machines SET status = ?, idle_since = ? WHERE id = ?").run(nextStatus, nextStatus === 'idle' ? now : null, task.machine_id);
            const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(task.machine_id);
            emitUpdate(req, 'machine:status', machine);

            // Notify next worker
            if (nextTask && nextTask.assigned_worker_id) {
              const msg = `🟢 Machine "${machine.name}" is now free! You can start your task: "${nextTask.title}".`;
              notifyAndEmit(req, [nextTask.assigned_worker_id], msg, 'success', 'notification:new', { message: msg, type: 'success' });
            }
          }
        }
        break;

      default:
        // General field update (Admin/Supervisor)
        if (req.user.role !== 'worker') {
          if (title !== undefined) updateFields.title = title;
          if (machine_id !== undefined) updateFields.machine_id = machine_id;
          if (assigned_worker_id !== undefined) updateFields.assigned_worker_id = assigned_worker_id;
          if (priority !== undefined) updateFields.priority = priority;
          if (expected_minutes !== undefined) updateFields.expected_minutes = expected_minutes;
          logAction = 'overridden';
        }
    }
  }

  if (Object.keys(updateFields).length > 0) {
    const setClauses = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updateFields), taskId];
    db.prepare(`UPDATE tasks SET ${setClauses} WHERE id = ?`).run(...values);
  }

  if (logAction) {
    db.prepare('INSERT INTO task_logs (task_id, action, pause_reason, note, performed_by) VALUES (?, ?, ?, ?, ?)')
      .run(taskId, logAction, pause_reason || null, note || null, req.user.id);
  }

  const updatedTask = db.prepare(`
    SELECT t.*, u.name as worker_name, m.name as machine_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_worker_id = u.id
    LEFT JOIN machines m ON t.machine_id = m.id
    WHERE t.id = ?
  `).get(taskId);

  // Notify supervisor on completion/delay
  if (logAction === 'completed') {
    const supervisors = db.prepare("SELECT id FROM users WHERE role IN ('admin','supervisor')").all();
    supervisors.forEach(s => createNotification(s.id, `Task "${updatedTask.title}" completed by ${req.user.name}`, 'success'));
  }

  emitUpdate(req, 'task:updated', updatedTask);
  res.json(updatedTask);
});

// DELETE task (Admin/Supervisor)
router.delete('/:id', auth, (req, res) => {
  if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM task_logs WHERE task_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

  if (task && task.assigned_worker_id) {
    db.prepare("UPDATE users SET status = 'idle', last_idle_at = CURRENT_TIMESTAMP WHERE id = ?").run(task.assigned_worker_id);
    const io = req.app.get('io');
    if (io) io.emit('user:status', { userId: task.assigned_worker_id, status: 'idle', last_idle_at: new Date().toISOString() });
  }

  const io = req.app.get('io');
  if (io) io.emit('task:deleted', { id: parseInt(req.params.id) });
  res.json({ success: true });
});

module.exports = router;
