const xlsx = require('xlsx');

/**
 * Parses Excel task data
 * Columns expected: taskId, taskName, dependsOn (comma-separated taskId), duration (minutes)
 */
function parseExcel(buffer) {
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const datasheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(datasheet);

        return data.map(item => ({
            taskId: String(item.taskId || ''),
            taskName: item.taskName || 'Unnamed Task',
            dependsOn: item.dependsOn ? String(item.dependsOn).split(',').map(s => s.trim()).filter(s => s) : [],
            duration: parseInt(item.duration) || 30
        }));
    } catch (error) {
        console.error('Error parsing Excel:', error);
        throw new Error('Failed to parse Excel file. Ensure it follows the required format.');
    }
}

const {
    detectBottlenecks,
    analyzeUtilization,
    generateInsights
} = require('./analyticsService');

/**
 * Worker Availability Check
 */
function isWorkerAvailable(worker, currentTime) {
    if (!worker.shifts || !Array.isArray(worker.shifts)) return false;
    const day = currentTime.toLocaleDateString('en-US', { weekday: 'short' });
    const hh = String(currentTime.getHours()).padStart(2, '0');
    const mm = String(currentTime.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    for (const shift of worker.shifts) {
        if (!shift.days.includes(day)) continue;
        const { startTime, endTime } = shift;
        if (startTime < endTime) {
            if (timeStr >= startTime && timeStr < endTime) return true;
        } else {
            if (timeStr >= startTime || timeStr < endTime) return true;
        }
    }
    return false;
}

/**
 * BUILD STEP AFFINITY MAP
 * Maps each step type to one or more workers.
 * - workers === steps → 1:1
 * - workers > steps  → heaviest steps get extra workers
 * - workers < steps  → lightest steps merge onto least-loaded worker
 */
function buildStepAffinity(baseTasks, workers) {
    const steps = baseTasks.map(bt => ({
        baseId: bt.taskId,
        taskName: bt.taskName,
        totalDuration: bt.duration
    }));

    const stepAffinityMap = {};
    const workerAffinityMap = {};
    const workerLoad = {};

    steps.forEach(s => { stepAffinityMap[s.baseId] = []; });
    workers.forEach(w => { workerAffinityMap[w.id] = []; workerLoad[w.id] = 0; });

    const numSteps = steps.length;
    const numWorkers = workers.length;

    if (numSteps === 0 || numWorkers === 0) return { stepAffinityMap, workerAffinityMap, workerStepLabel: {} };

    const sortedSteps = [...steps].sort((a, b) => b.totalDuration - a.totalDuration);

    if (numWorkers >= numSteps) {
        // Primary 1:1 assignment (round-robin by index)
        for (let i = 0; i < numSteps; i++) {
            const step = sortedSteps[i];
            const worker = workers[i];
            stepAffinityMap[step.baseId].push(worker.id);
            workerAffinityMap[worker.id].push(step.baseId);
            workerLoad[worker.id] += step.totalDuration;
        }
        // Extra workers → partner to heaviest step
        let extraWorkers = workers.filter(w => workerAffinityMap[w.id].length === 0);
        while (extraWorkers.length > 0) {
            let heaviestStep = null;
            let maxLoad = -Infinity;
            for (const step of sortedSteps) {
                const perWorkerLoad = step.totalDuration / stepAffinityMap[step.baseId].length;
                if (perWorkerLoad > maxLoad) { maxLoad = perWorkerLoad; heaviestStep = step; }
            }
            const extraWorker = extraWorkers.shift();
            stepAffinityMap[heaviestStep.baseId].push(extraWorker.id);
            workerAffinityMap[extraWorker.id].push(heaviestStep.baseId);
            workerLoad[extraWorker.id] += heaviestStep.totalDuration;
            extraWorkers = workers.filter(w => workerAffinityMap[w.id].length === 0);
        }
    } else {
        // Primary assignment (one step per worker, heaviest first)
        for (let i = 0; i < numWorkers; i++) {
            const step = sortedSteps[i];
            const worker = workers[i];
            stepAffinityMap[step.baseId].push(worker.id);
            workerAffinityMap[worker.id].push(step.baseId);
            workerLoad[worker.id] += step.totalDuration;
        }
        // Overflow steps → lightest worker
        for (let i = numWorkers; i < numSteps; i++) {
            const step = sortedSteps[i];
            let lightestWorker = workers[0];
            for (const w of workers) {
                if (workerLoad[w.id] < workerLoad[lightestWorker.id]) lightestWorker = w;
            }
            stepAffinityMap[step.baseId].push(lightestWorker.id);
            workerAffinityMap[lightestWorker.id].push(step.baseId);
            workerLoad[lightestWorker.id] += step.totalDuration;
        }
    }

    const workerStepLabel = {};
    workers.forEach(w => {
        const stepNames = workerAffinityMap[w.id]
            .map(bid => steps.find(s => s.baseId === bid)?.taskName || bid)
            .join(' + ');
        workerStepLabel[w.id] = stepNames || 'Unassigned';
    });

    console.log('🗂️ Step Affinity:', JSON.stringify(stepAffinityMap));
    return { stepAffinityMap, workerAffinityMap, workerStepLabel };
}

/**
 * IDLE-FLEX REBALANCING
 *
 * A worker is considered "idle" when they have been free for >= IDLE_THRESHOLD minutes
 * AND there is no ready task in their primary step type.
 * In that case they are allowed to temporarily pick up any ready task from ANY step.
 * The moment a task from their primary step becomes ready again they return to it
 * (their affinity re-takes priority on the next assignment cycle).
 */
const IDLE_THRESHOLD_MINUTES = 15;

/**
 * MAIN SCHEDULER — Affinity-Based with Idle-Flex Rebalancing (v7)
 */
function generateSchedule(baseTasks, quantity, deadlineStr, workers) {
    if (!workers || workers.length === 0) {
        throw new Error('No available workers provided for scheduling.');
    }

    const { stepAffinityMap, workerAffinityMap, workerStepLabel } = buildStepAffinity(baseTasks, workers);

    const startTime = new Date();
    const deadline = new Date(deadlineStr);
    let currentTime = new Date(startTime);

    // Expand tasks for quantity
    let totalTasksToSchedule = [];
    for (let i = 1; i <= quantity; i++) {
        baseTasks.forEach(bt => {
            totalTasksToSchedule.push({
                id: `${bt.taskId}_${i}`,
                baseId: bt.taskId,
                name: `${bt.taskName} (Unit ${i})`,
                duration: bt.duration,
                unit: i,
                dependsOn: bt.dependsOn.map(d => `${d}_${i}`)
            });
        });
    }

    const tasksMap = {};
    const adj = {};
    totalTasksToSchedule.forEach(t => { tasksMap[t.id] = t; adj[t.id] = []; });
    totalTasksToSchedule.forEach(t => t.dependsOn.forEach(d => { if (adj[d]) adj[d].push(t.id); }));

    const scheduledTasks = [];
    const completedTasksAt = {};
    const activeTasksMap = {};      // taskId → { workerId, segmentStartTime, isFlex }
    const activeWorkersMap = {};    // workerId → taskId
    const remainingDurations = {};
    const workerIdleStart = {};     // workerId → time when they last became free
    const workerTotalAssignedTime = {};
    // track flex assignments for reporting
    const workerFlexCount = {};
    const workerFlexMinutes = {};

    let totalWorkTime = 0;
    let remainingTaskIds = new Set(Object.keys(tasksMap));
    remainingTaskIds.forEach(id => {
        remainingDurations[id] = tasksMap[id].duration;
        totalWorkTime += tasksMap[id].duration;
    });

    workers.forEach(w => {
        workerTotalAssignedTime[w.id] = 0;
        workerIdleStart[w.id] = startTime;
        workerFlexCount[w.id] = 0;
        workerFlexMinutes[w.id] = 0;
    });

    let availableTime = 0;
    const workersUsed = new Set();

    // Per-step stats tracking
    const stepStats = {};
    baseTasks.forEach(bt => {
        stepStats[bt.taskId] = {
            stepName: bt.taskName,
            totalScheduledMinutes: 0,
            tasksCompleted: 0,
            workers: new Set()
        };
    });

    console.log(`🚀 Affinity+Flex Simulation start at ${currentTime.toISOString()} for ${remainingTaskIds.size} tasks.`);

    let safetyCounter = 0;

    while (remainingTaskIds.size > 0 && safetyCounter < 1000000) {
        safetyCounter++;

        const availableWorkersList = workers.filter(w => isWorkerAvailable(w, currentTime));
        if (currentTime <= deadline) availableTime += availableWorkersList.length;

        // --- A. Process active tasks ---
        for (const taskId of Object.keys(activeTasksMap)) {
            const data = activeTasksMap[taskId];
            const { workerId, isFlex } = data;
            const isStillAvailable = availableWorkersList.some(w => w.id === workerId);

            if (isStillAvailable) {
                remainingDurations[taskId]--;
                if (remainingDurations[taskId] <= 0) {
                    const workerObj = workers.find(w => w.id === workerId);
                    const segDur = Math.max(1, Math.round((currentTime - data.segmentStartTime) / 60000));

                    scheduledTasks.push({
                        id: taskId,
                        name: tasksMap[taskId].name,
                        stepType: tasksMap[taskId].baseId,
                        duration: segDur,
                        workerId,
                        workerName: workerObj.name,
                        isFlex: !!isFlex,
                        startTime: data.segmentStartTime.toISOString(),
                        endTime: currentTime.toISOString()
                    });

                    // Update per-step stats
                    const sid = tasksMap[taskId].baseId;
                    if (stepStats[sid]) {
                        stepStats[sid].totalScheduledMinutes += segDur;
                        stepStats[sid].tasksCompleted++;
                        stepStats[sid].workers.add(workerObj.name);
                    }

                    // Track flex minutes
                    if (isFlex) workerFlexMinutes[workerId] += segDur;

                    completedTasksAt[taskId] = currentTime;
                    workersUsed.add(workerId);
                    workerIdleStart[workerId] = currentTime; // starts idle now
                    delete activeTasksMap[taskId];
                    delete activeWorkersMap[workerId];
                    remainingTaskIds.delete(taskId);

                    console.log({ time: currentTime.toISOString(), event: 'TASK_COMPLETED', task: tasksMap[taskId].name, worker: workerObj.name, flex: !!isFlex });
                }
            } else {
                // Shift handover
                const workerObj = workers.find(w => w.id === workerId);
                const segDur = Math.round((currentTime - data.segmentStartTime) / 60000);
                if (segDur > 0) {
                    scheduledTasks.push({
                        id: taskId,
                        name: `${tasksMap[taskId].name} (Partial)`,
                        stepType: tasksMap[taskId].baseId,
                        duration: segDur,
                        workerId,
                        workerName: workerObj.name,
                        isFlex: !!isFlex,
                        startTime: data.segmentStartTime.toISOString(),
                        endTime: currentTime.toISOString()
                    });
                    workersUsed.add(workerId);
                    if (isFlex) workerFlexMinutes[workerId] += segDur;

                    const sid = tasksMap[taskId].baseId;
                    if (stepStats[sid]) {
                        stepStats[sid].totalScheduledMinutes += segDur;
                        stepStats[sid].workers.add(workerObj.name);
                    }
                }
                delete activeTasksMap[taskId];
                delete activeWorkersMap[workerId];
                console.log({ time: currentTime.toISOString(), event: 'SHIFT_HANDOVER', task: tasksMap[taskId].name, worker: workerObj.name });
            }
        }

        // --- B. Identify ready tasks ---
        const readyTaskIds = Array.from(remainingTaskIds).filter(tid => {
            if (activeTasksMap[tid]) return false;
            return tasksMap[tid].dependsOn.every(depId => completedTasksAt[depId] && completedTasksAt[depId] <= currentTime);
        });

        // Partition ready tasks by step type
        const readyByStep = {};
        readyTaskIds.forEach(tid => {
            const sid = tasksMap[tid].baseId;
            if (!readyByStep[sid]) readyByStep[sid] = [];
            readyByStep[sid].push(tid);
        });

        const freeWorkers = availableWorkersList.filter(w => !activeWorkersMap[w.id]);

        // --- C. AFFINITY ASSIGNMENT (primary step tasks) ---
        const assignmentsMade = [];
        const assignedThisTick = new Set();

        for (const taskId of readyTaskIds) {
            if (assignedThisTick.has(taskId)) continue;
            const sid = tasksMap[taskId].baseId;
            const affinityWorkerIds = stepAffinityMap[sid] || [];

            const eligibleWorkers = freeWorkers.filter(w =>
                affinityWorkerIds.includes(w.id) && !activeWorkersMap[w.id] && !assignedThisTick.has(taskId)
            );
            if (eligibleWorkers.length === 0) continue;

            eligibleWorkers.sort((a, b) => workerTotalAssignedTime[a.id] - workerTotalAssignedTime[b.id]);
            const worker = eligibleWorkers[0];

            activeTasksMap[taskId] = { workerId: worker.id, segmentStartTime: currentTime, isFlex: false };
            activeWorkersMap[worker.id] = taskId;
            workerTotalAssignedTime[worker.id] += remainingDurations[taskId];
            workerIdleStart[worker.id] = null; // no longer idle
            assignedThisTick.add(taskId);
            assignmentsMade.push({ task: tasksMap[taskId].name, worker: worker.name, flex: false });
        }

        // --- D. IDLE-FLEX REBALANCING ---
        // Any still-free worker who has been idle >= IDLE_THRESHOLD and has NO ready task in their primary step
        // is allowed to temporarily take any ready unassigned task from ANY step
        const stillFreeWorkers = freeWorkers.filter(w => !activeWorkersMap[w.id]);
        const unassignedReadyTaskIds = readyTaskIds.filter(tid => !assignedThisTick.has(tid) && !activeTasksMap[tid]);

        if (stillFreeWorkers.length > 0 && unassignedReadyTaskIds.length > 0) {
            for (const worker of stillFreeWorkers) {
                // Check if this worker has any primary-step task already ready (if yes, skip flex — they'll get it next mint tick)
                const primarySteps = workerAffinityMap[worker.id] || [];
                const hasPrimaryReady = unassignedReadyTaskIds.some(tid => primarySteps.includes(tasksMap[tid].baseId));
                if (hasPrimaryReady) continue; // don't flex — primary task coming

                // Check idle duration
                const idleStart = workerIdleStart[worker.id];
                const idleMinutes = idleStart ? Math.floor((currentTime - idleStart) / 60000) : 0;
                if (idleMinutes < IDLE_THRESHOLD_MINUTES) continue;

                // Assign the longest unassigned ready task (greedy — maximise downtime reduction)
                const candidate = unassignedReadyTaskIds
                    .filter(tid => !assignedThisTick.has(tid) && !activeTasksMap[tid])
                    .sort((a, b) => remainingDurations[b] - remainingDurations[a])[0];

                if (!candidate) continue;

                activeTasksMap[candidate] = { workerId: worker.id, segmentStartTime: currentTime, isFlex: true };
                activeWorkersMap[worker.id] = candidate;
                workerTotalAssignedTime[worker.id] += remainingDurations[candidate];
                workerIdleStart[worker.id] = null;
                workerFlexCount[worker.id]++;
                assignedThisTick.add(candidate);
                assignmentsMade.push({ task: tasksMap[candidate].name, worker: worker.name, flex: true, idleWas: idleMinutes });
                console.log({ time: currentTime.toISOString(), event: 'FLEX_REBALANCE', task: tasksMap[candidate].name, worker: worker.name, idleMinutes });
            }
        }

        // Update idle start for workers who remain free
        for (const worker of availableWorkersList) {
            if (!activeWorkersMap[worker.id] && workerIdleStart[worker.id] === null) {
                workerIdleStart[worker.id] = currentTime;
            }
        }

        if (assignmentsMade.length > 0) {
            console.log({ time: currentTime.toISOString(), assignments: assignmentsMade });
        }

        if (safetyCounter % 120 === 0 && Object.keys(activeTasksMap).length > 0) {
            console.log({ time: currentTime.toISOString(), activeWorkers: availableWorkersList.length, running: Object.keys(activeTasksMap).length });
        }

        currentTime = new Date(currentTime.getTime() + 60000);
        if (currentTime > new Date(startTime.getTime() + 1000 * 60 * 60 * 24 * 30)) {
            throw new Error('Simulation exceeded 30 days. Unresolvable scheduling conflict.');
        }
    }

    if (remainingTaskIds.size > 0) throw new Error('Simulation failed to complete all tasks.');

    // --- Analytics ---
    const lastEndTime = scheduledTasks.length > 0
        ? new Date(Math.max(...scheduledTasks.map(t => new Date(t.endTime).getTime())))
        : startTime;

    const isFeasible = lastEndTime <= deadline;
    const slackTime = isFeasible ? Math.floor((deadline - lastEndTime) / 60000) : 0;
    const extraTimeRequired = isFeasible ? 0 : Math.floor((lastEndTime - deadline) / 60000);
    const wallClockMinutes = Math.max(1, Math.floor((lastEndTime - startTime) / 60000));
    const parallelEfficiency = Number((totalWorkTime / (wallClockMinutes * Math.max(1, workersUsed.size))).toFixed(2));

    const bottleneck = detectBottlenecks(scheduledTasks);
    const utilization = analyzeUtilization(scheduledTasks, workers, lastEndTime, startTime);

    // Attach step label + flex stats to each utilization entry
    utilization.forEach(u => {
        u.assignedStep = workerStepLabel[u.id] || 'Unassigned';
        u.flexAssignments = workerFlexCount[u.id] || 0;
        u.flexMinutes = workerFlexMinutes[u.id] || 0;
        u.savedIdleMinutes = workerFlexMinutes[u.id] || 0; // alias for display
    });

    const insights = generateInsights(scheduledTasks, { bottleneck }, utilization);

    // Per-step summary table
    const perStepStats = baseTasks.map(bt => {
        const s = stepStats[bt.taskId] || {};
        const totalUnits = quantity;
        const avgPerUnit = s.totalScheduledMinutes > 0 ? Math.round(s.totalScheduledMinutes / Math.max(1, s.tasksCompleted)) : bt.duration;
        const assignedWorkers = (stepAffinityMap[bt.taskId] || [])
            .map(wid => workers.find(w => w.id === wid)?.name || wid);
        return {
            stepId: bt.taskId,
            stepName: bt.taskName,
            totalMinutes: s.totalScheduledMinutes || 0,
            tasksCompleted: s.tasksCompleted || 0,
            avgMinutesPerUnit: avgPerUnit,
            estimatedForQuantity: avgPerUnit * totalUnits,
            assignedWorkers
        };
    });

    // Per-worker detailed stats
    const perWorkerStats = workers.map(w => {
        const u = utilization.find(x => x.id === w.id) || {};
        return {
            id: w.id,
            name: w.name,
            assignedStep: workerStepLabel[w.id] || 'Unassigned',
            busyMinutes: u.busyMinutes || 0,
            idleMinutes: u.idleMinutes || 0,
            utilizationRate: u.utilizationRate || 0,
            flexAssignments: workerFlexCount[w.id] || 0,
            flexMinutes: workerFlexMinutes[w.id] || 0
        };
    });

    // Estimated time prominently
    const estimatedCompletionTime = lastEndTime.toISOString();
    const totalHours = Math.floor(wallClockMinutes / 60);
    const totalMins = wallClockMinutes % 60;
    const extraHours = Math.floor(extraTimeRequired / 60);
    const extraMins = extraTimeRequired % 60;
    const slackHours = Math.floor(slackTime / 60);
    const slackMins = slackTime % 60;

    let status = isFeasible ? (slackTime < 60 ? 'borderline' : 'achievable') : 'impossible';
    let feedback = isFeasible
        ? `✅ Deadline achievable. Slack time: ${slackHours}h ${slackMins}m.`
        : `⚠️ Deadline cannot be met. Extra time needed: ${extraHours}h ${extraMins}m.`;

    return {
        schedule: scheduledTasks,
        summary: {
            // Core timing
            totalWorkTime,
            totalDurationMinutes: wallClockMinutes,
            totalDurationDisplay: `${totalHours}h ${totalMins}m`,
            estimatedCompletionTime,
            deadline: deadlineStr,
            isFeasible,
            status,
            feedback,
            // Slack/Extra prominent fields
            slackTime,
            slackMinutes: slackTime,
            slackDisplay: `${slackHours}h ${slackMins}m`,
            extraTimeRequired,
            extraTimeDisplay: `${extraHours}h ${extraMins}m`,
            // Workers
            workersUsed: Array.from(workersUsed),
            parallelEfficiency,
            availableTime,
            // Rich analytics
            bottleneck,
            utilization,        // per worker for bar chart + cards
            insights,
            perStepStats,       // NEW: per step breakdown table
            perWorkerStats,     // NEW: per worker detailed table
            // Affinity map (for debugging / future UI)
            stepAffinity: Object.fromEntries(
                baseTasks.map(bt => [bt.taskId, {
                    taskName: bt.taskName,
                    workerIds: stepAffinityMap[bt.taskId] || [],
                    workerNames: (stepAffinityMap[bt.taskId] || []).map(wid => workers.find(w => w.id === wid)?.name || wid)
                }])
            )
        }
    };
}

module.exports = { parseExcel, generateSchedule, isWorkerAvailable, buildStepAffinity };
