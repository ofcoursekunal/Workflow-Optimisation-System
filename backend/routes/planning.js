const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const auth = require('../middleware/auth');
const { parseExcel, generateSchedule, buildStepAffinity } = require('../services/schedulingService');

const upload = multer({ storage: multer.memoryStorage() });

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function createNotification(userId, message, type = 'info') {
    try {
        db.prepare('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)').run(userId, message, type);
    } catch (e) { }
}

/**
 * dispatchNextPlanTask
 * Called after a worker completes a plan-managed task.
 * Finds the next ready step for this worker under the given plan and creates the DB task.
 *
 * @param {number} planId - active production plan id
 * @param {number} workerId - worker who just completed a task
 * @param {object} io - socket.io instance
 */
function dispatchNextPlanTask(planId, workerId, io) {
    try {
        const plan = db.prepare('SELECT * FROM production_plans WHERE id = ?').get(planId);
        if (!plan || plan.status !== 'active') return;

        const steps = JSON.parse(plan.steps);          // [{taskId, taskName, duration, dependsOn[]}]
        const affinityRaw = plan.affinity ? JSON.parse(plan.affinity) : {};
        const quantity = plan.quantity || 1;

        // Determine which steps this worker is responsible for
        const workerStepIds = Object.entries(affinityRaw)
            .filter(([_stepId, workerIds]) => (Array.isArray(workerIds) ? workerIds : [workerIds]).includes(workerId))
            .map(([stepId]) => stepId);

        // Loop each unit the worker handles
        for (const unitIdx of Array.from({ length: quantity }, (_, i) => i + 1)) {
            for (const stepId of workerStepIds) {
                // Check if this plan_task slot is still pending
                const planTask = db.prepare(
                    'SELECT * FROM plan_tasks WHERE plan_id = ? AND step_id = ? AND unit_index = ? AND worker_id = ?'
                ).get(planId, stepId, unitIdx, workerId);

                if (!planTask || planTask.status !== 'pending') continue;

                // Check all dependencies are completed
                const step = steps.find(s => s.taskId === stepId);
                if (!step) continue;

                const depsReady = (step.dependsOn || []).every(depId => {
                    const depTask = db.prepare(
                        'SELECT status FROM plan_tasks WHERE plan_id = ? AND step_id = ? AND unit_index = ?'
                    ).get(planId, depId, unitIdx);
                    return depTask && depTask.status === 'completed';
                });

                if (!depsReady) continue;

                // Create the actual task in the tasks table
                const taskTitle = `${step.taskName} (Unit ${unitIdx})`;

                // Check if already created
                if (planTask.task_id) continue;

                const insertResult = db.prepare(`
                    INSERT INTO tasks (title, expected_minutes, assigned_worker_id, created_by, status, project_id, priority)
                    VALUES (?, ?, ?, ?, 'not_started', ?, 'medium')
                `).run(taskTitle, step.duration, workerId, workerId, plan.project_id);

                const newTaskId = insertResult.lastInsertRowid;

                // Link to plan_tasks
                db.prepare('UPDATE plan_tasks SET task_id = ?, status = ? WHERE plan_id = ? AND step_id = ? AND unit_index = ? AND worker_id = ?')
                    .run(newTaskId, 'active', planId, stepId, unitIdx, workerId);

                // Log the assignment
                db.prepare('INSERT INTO task_logs (task_id, action, note, performed_by) VALUES (?, ?, ?, ?)')
                    .run(newTaskId, 'assigned', `Auto-dispatched by plan #${planId}`, workerId);

                // Notify worker
                const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(newTaskId);
                createNotification(workerId, `📋 Next task ready: ${taskTitle}`, 'info');

                if (io) {
                    io.to(`user_${workerId}`).emit('notification:new', { message: `📋 Next task ready: ${taskTitle}`, type: 'info' });
                    io.emit('task:updated', newTask);
                }

                return; // Dispatch one task at a time per call
            }
        }

        // Check if all plan_tasks are completed → mark plan as completed
        const remaining = db.prepare("SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ? AND status != 'completed'").get(planId);
        if (remaining.cnt === 0) {
            db.prepare("UPDATE production_plans SET status = 'completed' WHERE id = ?").run(planId);
            // Notify supervisor
            const supervisors = db.prepare("SELECT id FROM users WHERE project_id = ? AND role IN ('supervisor','admin')").all(plan.project_id);
            supervisors.forEach(s => {
                createNotification(s.id, `✅ Production plan "${plan.name}" is fully completed!`, 'success');
                if (io) io.to(`user_${s.id}`).emit('notification:new', { message: `✅ Plan "${plan.name}" completed!`, type: 'success' });
            });
        }
    } catch (err) {
        console.error('dispatchNextPlanTask error:', err.message);
    }
}

// ─────────────────────────────────────────────────────────
// EXISTING: Generate schedule from Excel
// ─────────────────────────────────────────────────────────

/**
 * @route POST /api/planning/schedule
 * @desc Generate a production schedule from Excel upload
 */
router.post('/schedule', auth, upload.single('file'), (req, res) => {
    try {
        if (req.user.role === 'worker') {
            return res.status(403).json({ error: 'Access denied. Only supervisors and admins can access planning tools.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No Excel file uploaded.' });
        }

        const { quantity, deadline, project_id } = req.body;
        if (!quantity || !deadline) {
            return res.status(400).json({ error: 'Quantity and deadline are required parameters.' });
        }

        const baseTasks = parseExcel(req.file.buffer);

        let workers;
        if (project_id) {
            workers = db.prepare(`
                SELECT u.id, u.name, u.shifts 
                FROM users u
                JOIN user_project_history uph ON u.id = uph.user_id
                WHERE uph.project_id = ? AND uph.unassigned_at IS NULL AND u.role = 'worker'
            `).all(project_id);
            if (workers.length === 0) {
                workers = db.prepare("SELECT id, name, shifts FROM users WHERE role = 'worker'").all();
            }
        } else {
            workers = db.prepare("SELECT id, name, shifts FROM users WHERE role = 'worker'").all();
        }

        if (workers.length === 0) {
            return res.status(400).json({ error: 'No available workers found in the system to assign tasks.' });
        }

        const workersWithShifts = workers.map(w => ({
            ...w,
            shifts: w.shifts ? JSON.parse(w.shifts) : []
        }));

        const result = generateSchedule(baseTasks, parseInt(quantity), deadline, workersWithShifts);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Planning Route Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// PLAN MANAGEMENT ROUTES
// ─────────────────────────────────────────────────────────

/**
 * @route POST /api/planning/save
 * @desc Save a simulation result as a named production plan
 */
router.post('/save', auth, (req, res) => {
    if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });

    const { name, steps, affinity, summary, quantity, deadline } = req.body;
    if (!name || !steps) return res.status(400).json({ error: 'Name and steps are required' });

    const projectId = req.user.project_id || null;

    const result = db.prepare(`
        INSERT INTO production_plans (name, project_id, created_by, quantity, deadline, steps, affinity, summary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
        name,
        projectId,
        req.user.id,
        quantity || 1,
        deadline || null,
        JSON.stringify(steps),
        affinity ? JSON.stringify(affinity) : null,
        summary ? JSON.stringify(summary) : null
    );

    res.json({ success: true, id: result.lastInsertRowid, name });
});

/**
 * @route GET /api/planning/plans
 * @desc List saved plans for supervisor's project (or all for admin)
 */
router.get('/plans', auth, (req, res) => {
    if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });

    let plans;
    if (req.user.role === 'admin') {
        plans = db.prepare(`
            SELECT pp.*, u.name as creator_name FROM production_plans pp 
            LEFT JOIN users u ON pp.created_by = u.id
            ORDER BY pp.created_at DESC
        `).all();
    } else {
        if (!req.user.project_id) return res.json([]);
        plans = db.prepare(`
            SELECT pp.*, u.name as creator_name FROM production_plans pp 
            LEFT JOIN users u ON pp.created_by = u.id
            WHERE pp.project_id = ? OR pp.project_id IS NULL
            ORDER BY pp.created_at DESC
        `).all(req.user.project_id);
    }

    // Return compact list without full steps/summary JSON
    res.json(plans.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        quantity: p.quantity,
        deadline: p.deadline,
        project_id: p.project_id,
        creator_name: p.creator_name,
        created_at: p.created_at
    })));
});

/**
 * @route GET /api/planning/plans/:id
 * @desc Load full plan details (steps, affinity, summary)
 */
router.get('/plans/:id', auth, (req, res) => {
    if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });

    const plan = db.prepare('SELECT * FROM production_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    res.json({
        ...plan,
        steps: plan.steps ? JSON.parse(plan.steps) : [],
        affinity: plan.affinity ? JSON.parse(plan.affinity) : null,
        summary: plan.summary ? JSON.parse(plan.summary) : null
    });
});

/**
 * @route PUT /api/planning/plans/:id
 * @desc Update plan name, deadline, quantity, or steps (supervisor edits)
 */
router.put('/plans/:id', auth, (req, res) => {
    if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });

    const plan = db.prepare('SELECT * FROM production_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.status === 'active') return res.status(400).json({ error: 'Cannot edit an active plan. Deactivate it first.' });

    const { name, deadline, quantity, steps, affinity } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (deadline !== undefined) updates.deadline = deadline;
    if (quantity !== undefined) updates.quantity = quantity;
    if (steps !== undefined) updates.steps = JSON.stringify(steps);
    if (affinity !== undefined) updates.affinity = JSON.stringify(affinity);

    if (Object.keys(updates).length === 0) return res.json({ success: true });

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE production_plans SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), plan.id);

    res.json({ success: true });
});

/**
 * @route POST /api/planning/plans/:id/activate
 * @desc Activate a plan: assign first ready task to each LIVE worker by affinity
 */
router.post('/plans/:id/activate', auth, (req, res) => {
    if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });

    const plan = db.prepare('SELECT * FROM production_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.status === 'active') return res.status(400).json({ error: 'Plan is already active.' });

    const steps = JSON.parse(plan.steps);
    const quantity = plan.quantity || 1;
    const io = req.app.get('io');

    // Link plan to the supervisor's current project if not already set
    const projectId = plan.project_id || req.user.project_id;
    if (!projectId) return res.status(400).json({ error: 'Plan must be linked to a project.' });

    // Fetch LIVE workers for this project
    const liveWorkers = db.prepare(`
        SELECT id, name, shifts FROM users 
        WHERE project_id = ? AND role = 'worker' AND is_live = 1
    `).all(projectId).map(w => ({ ...w, shifts: w.shifts ? JSON.parse(w.shifts) : [] }));

    if (liveWorkers.length === 0) {
        return res.status(400).json({ error: 'No live workers available. Workers must be online (LIVE) before activating a plan.' });
    }

    // Build affinity or use saved one
    const affinityRaw = plan.affinity
        ? JSON.parse(plan.affinity)
        : buildStepAffinity(steps, liveWorkers);

    const activatePlan = db.transaction(() => {
        // Mark plan active and link to project
        db.prepare("UPDATE production_plans SET status = 'active', project_id = ?, affinity = ? WHERE id = ?")
            .run(projectId, JSON.stringify(affinityRaw), plan.id);

        // Pre-populate plan_tasks rows for ALL steps × units (status = 'pending')
        for (const step of steps) {
            const workerIdsForStep = Array.isArray(affinityRaw[step.taskId])
                ? affinityRaw[step.taskId]
                : (affinityRaw[step.taskId] ? [affinityRaw[step.taskId]] : []);

            for (const unitIdx of Array.from({ length: quantity }, (_, i) => i + 1)) {
                // Assign each unit to a worker in round-robin within the step workers
                const assignedWorkerId = workerIdsForStep.length > 0
                    ? workerIdsForStep[(unitIdx - 1) % workerIdsForStep.length]
                    : null;

                if (!assignedWorkerId) continue;

                db.prepare(`
                    INSERT OR IGNORE INTO plan_tasks (plan_id, step_id, unit_index, worker_id, status)
                    VALUES (?, ?, ?, ?, 'pending')
                `).run(plan.id, step.taskId, unitIdx, assignedWorkerId);
            }
        }
    });

    activatePlan();

    // Now dispatch first ready tasks to each live worker
    for (const worker of liveWorkers) {
        dispatchNextPlanTask(plan.id, worker.id, io);
    }

    res.json({ success: true, message: `Plan "${plan.name}" activated. Tasks dispatched to ${liveWorkers.length} live workers.` });
});

/**
 * @route GET /api/planning/plans/:id/live-status
 * @desc Real-time plan progress: steps done, in-progress, projected completion
 */
router.get('/plans/:id/live-status', auth, (req, res) => {
    if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });

    const plan = db.prepare('SELECT * FROM production_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const planTaskRows = db.prepare(`
        SELECT pt.*, t.status as task_status, t.started_at, t.completed_at, t.expected_minutes,
               t.total_elapsed_seconds, t.last_action_at, u.name as worker_name
        FROM plan_tasks pt
        LEFT JOIN tasks t ON pt.task_id = t.id
        LEFT JOIN users u ON pt.worker_id = u.id
        WHERE pt.plan_id = ?
        ORDER BY pt.step_id, pt.unit_index
    `).all(plan.id);

    const steps = JSON.parse(plan.steps);

    // Per-step aggregates
    const stepStats = steps.map(step => {
        const rows = planTaskRows.filter(r => r.step_id === step.taskId);
        const completed = rows.filter(r => r.status === 'completed').length;
        const inProgress = rows.filter(r => r.status === 'active').length;
        const pending = rows.filter(r => r.status === 'pending').length;

        // Actual average minutes from completed tasks
        const completedTasks = rows.filter(r => r.task_status === 'completed' && r.started_at && r.completed_at);
        const avgActualMinutes = completedTasks.length > 0
            ? Math.round(completedTasks.reduce((sum, r) => {
                return sum + (new Date(r.completed_at) - new Date(r.started_at)) / 60000;
            }, 0) / completedTasks.length)
            : step.duration;

        return {
            stepId: step.taskId,
            stepName: step.taskName,
            expectedMinutes: step.duration,
            actualAvgMinutes: avgActualMinutes,
            completed,
            inProgress,
            pending,
            total: rows.length
        };
    });

    // Projected completion: sum remaining units × actual (or expected) duration per step
    let remainingMinutes = 0;
    for (const ss of stepStats) {
        remainingMinutes += (ss.inProgress + ss.pending) * ss.actualAvgMinutes;
    }

    const projectedCompletion = new Date(Date.now() + remainingMinutes * 60000).toISOString();
    const originalDeadline = plan.deadline;
    const isOnTrack = !originalDeadline || new Date(projectedCompletion) <= new Date(originalDeadline);

    res.json({
        planId: plan.id,
        name: plan.name,
        status: plan.status,
        deadline: plan.deadline,
        projectedCompletion,
        remainingMinutes,
        isOnTrack,
        slackMinutes: originalDeadline
            ? Math.round((new Date(originalDeadline) - new Date(projectedCompletion)) / 60000)
            : null,
        stepStats,
        workerTasks: planTaskRows.map(r => ({
            stepId: r.step_id,
            unitIndex: r.unit_index,
            workerName: r.worker_name,
            status: r.status,
            taskStatus: r.task_status
        }))
    });
});

/**
 * @route DELETE /api/planning/plans/:id
 * @desc Delete a draft plan
 */
router.delete('/plans/:id', auth, (req, res) => {
    if (req.user.role === 'worker') return res.status(403).json({ error: 'Forbidden' });
    const plan = db.prepare('SELECT * FROM production_plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.status === 'active') return res.status(400).json({ error: 'Cannot delete an active plan.' });

    db.prepare('DELETE FROM production_plans WHERE id = ?').run(plan.id);
    res.json({ success: true });
});

module.exports = router;
module.exports.dispatchNextPlanTask = dispatchNextPlanTask;
