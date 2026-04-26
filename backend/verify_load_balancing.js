const { generateSchedule } = require('./services/schedulingService');

console.log('🔍 Running Load Balancing Verification...');

const workers = [
    { id: 'user_1', name: 'Worker A (Day)', shifts: [{ days: ['Mon', 'Tue'], startTime: '08:00', endTime: '20:00' }] },
    { id: 'user_2', name: 'Worker B (Day)', shifts: [{ days: ['Mon', 'Tue'], startTime: '08:00', endTime: '20:00' }] },
    { id: 'user_3', name: 'Worker C (Day)', shifts: [{ days: ['Mon', 'Tue'], startTime: '08:00', endTime: '20:00' }] }
];

const testTasks = [
    { taskId: 'T1', taskName: 'Job 1', dependsOn: [], duration: 30 },
    { taskId: 'T2', taskName: 'Job 2', dependsOn: [], duration: 30 },
    { taskId: 'T3', taskName: 'Job 3', dependsOn: [], duration: 30 }
];

const OriginalDate = Date;
global.Date = class MockDate extends OriginalDate {
    constructor(...args) {
        if (args.length === 0) { return super('2026-04-27T10:00:00Z'); }
        super(...args);
    }
};

try {
    const result = generateSchedule(testTasks, 1, '2026-04-27T15:00:00Z', workers);

    console.log('\n✅ SCHEDULE OUTPUT:');
    result.schedule.forEach(s => {
        console.log(`Task: ${s.name.padEnd(20)} | Worker: ${s.workerName.padEnd(16)} | Duration: ${s.duration}m`);
    });

    const usedWorkersList = new Set(result.schedule.map(s => s.workerId));
    if (usedWorkersList.size === 3) {
        console.log('\n✅ Load Balancing Success: All 3 workers were utilized dynamically!');
    } else {
        console.log('\n❌ Load Balancing Failed: Tasks were squatter by limited workers!', usedWorkersList);
    }
} catch (err) {
    console.error('Test Failed:', err);
} finally {
    global.Date = OriginalDate;
}
