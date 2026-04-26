const { isWorkerAvailable, generateSchedule } = require('./services/schedulingService');

console.log('🔍 Running Shift Handover Engine Verification...');

const workers = [
    {
        id: 'user_1',
        name: 'Worker A (Day)',
        shifts: [{ days: ['Mon', 'Tue'], startTime: '08:00', endTime: '20:00' }]
    },
    {
        id: 'user_2',
        name: 'Worker B (Night)',
        shifts: [{ days: ['Mon', 'Tue'], startTime: '20:00', endTime: '08:00' }]
    }
];

const testTasks = [
    {
        taskId: 'T1',
        taskName: 'Massive Job',
        dependsOn: [],
        duration: 200 // 3 hours and 20 mins. Will force it to cross shift boundaries.
    },
    {
        taskId: 'T2',
        taskName: 'Quick Job',
        dependsOn: [],
        duration: 30
    }
];

// Force the start time to be Monday 18:00 to guarantee a 20:00 shift handover mid-task
const mockDateNow = () => new Date('2026-04-27T18:00:00Z');
// Override Date constructor slightly for testing or just mock startTime inside the wrapper...
// Actually `generateSchedule` uses `new Date()`. We can't trivially override without messing global.
// Let's just override global Date locally.
const OriginalDate = Date;
global.Date = class MockDate extends OriginalDate {
    constructor(...args) {
        if (args.length === 0) {
            super('2026-04-27T18:00:00Z'); // Next Monday at 18:00
            return;
        }
        super(...args);
    }
};

try {
    const result = generateSchedule(testTasks, 1, '2026-04-29T18:00:00Z', workers);

    console.log('\n✅ SCHEDULE OUTPUT:');
    result.schedule.forEach(s => {
        console.log(`Task: ${s.name.padEnd(20)} | Worker: ${s.workerName.padEnd(16)} | Duration: ${s.duration}m | ${new Date(s.startTime).toLocaleTimeString()} -> ${new Date(s.endTime).toLocaleTimeString()}`);
    });

    console.log('\n📊 TIME ANALYSIS SUMMARY:');
    const { totalWorkTime, availableTime, slackTime, extraTimeRequired, parallelEfficiency } = result.summary;
    console.table({ totalWorkTime, availableTime, slackTime, extraTimeRequired, parallelEfficiency });

    if (result.schedule.length > 2) {
        console.log('\n✅ Handover Success: 2 Tasks generated', result.schedule.length, 'segments!');
    }
} catch (err) {
    console.error('Test Failed:', err);
} finally {
    global.Date = OriginalDate;
}
