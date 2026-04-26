const { generateSchedule } = require('./services/schedulingService');

console.log('🔍 Running Simulation-Style Verification (v5)...');

const baseTasks = [
    { taskId: 'T1', taskName: 'Cutting', dependsOn: [], duration: 60 },
    { taskId: 'T2', taskName: 'Bending', dependsOn: ['T1'], duration: 120 },
    { taskId: 'T3', taskName: 'Welding', dependsOn: ['T2'], duration: 180 },
    { taskId: 'T4', taskName: 'Finishing', dependsOn: ['T3'], duration: 60 }
];

const workers = [
    { id: 1, name: 'Worker A (Day)', shifts: [{ days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], startTime: "08:00", endTime: "20:00" }] },
    { id: 2, name: 'Worker B (Night)', shifts: [{ days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], startTime: "20:00", endTime: "08:00" }] },
    { id: 3, name: 'Worker C (Day)', shifts: [{ days: ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], startTime: "08:00", endTime: "20:00" }] },
    { id: 4, name: 'Worker D (Night)', shifts: [{ days: ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], startTime: "20:00", endTime: "08:00" }] }
];

const quantity = 1;
const deadline = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(); // 48 hours

try {
    const result = generateSchedule(baseTasks, quantity, deadline, workers);
    console.log('\n✅ Simulation Complete.');
    console.log(`Units: ${quantity}, Total Tasks: ${result.summary.totalTasks}`);
    console.log(`Finish Time: ${result.summary.lastEndTime}`);
} catch (e) {
    console.error('\n❌ Simulation Failed:', e.message);
    process.exit(1);
}
