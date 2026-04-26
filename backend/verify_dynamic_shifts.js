const { isWorkerAvailable } = require('./services/schedulingService');

console.log('🔍 Running Dynamic Shift Verification...');

const testWorkerDay = {
    id: 1,
    shifts: [{ days: ["Mon", "Tue", "Wed"], startTime: "08:00", endTime: "20:00" }]
};

const testWorkerNight = {
    id: 2,
    shifts: [{ days: ["Sat", "Sun"], startTime: "20:00", endTime: "08:00" }]
};

// Next Monday at 10:00 AM (Should be TRUE for Day)
const check1 = new Date('2026-04-27T10:00:00Z');
console.log('1. Monday 10AM (Day Worker):', isWorkerAvailable(testWorkerDay, check1));

// Next Thursday at 10:00 AM (Should be FALSE for Day - Not in days)
const check2 = new Date('2026-04-30T10:00:00Z');
console.log('2. Thursday 10AM (Day Worker):', isWorkerAvailable(testWorkerDay, check2));

// Next Saturday at 21:00 PM (Should be TRUE for Night)
const check3 = new Date('2026-05-02T21:00:00Z');
console.log('3. Saturday 9PM (Night Worker):', isWorkerAvailable(testWorkerNight, check3));

// Next Sunday at 02:00 AM (Should be TRUE for Night - crosses midnight)
const check4 = new Date('2026-05-03T02:00:00Z');
console.log('4. Sunday 2AM (Night Worker):', isWorkerAvailable(testWorkerNight, check4));

// Next Monday at 21:00 PM (Should be FALSE for Night)
const check5 = new Date('2026-05-04T21:00:00Z');
console.log('5. Monday 9PM (Night Worker):', isWorkerAvailable(testWorkerNight, check5));
