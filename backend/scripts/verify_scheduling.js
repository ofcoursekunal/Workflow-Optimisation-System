const { parseExcel, generateSchedule } = require('../services/schedulingService');
const fs = require('fs');
const path = require('path');

async function verify() {
    console.log('🔍 Starting Internal Verification...');

    // 1. Test Parsing
    const excelPath = path.join(__dirname, 'production_template.xlsx');
    const buffer = fs.readFileSync(excelPath);
    const baseTasks = parseExcel(buffer);
    console.log('✅ Parsing successful. Base tasks count:', baseTasks.length);

    // 2. Test Scheduling
    const quantity = 5;
    const deadline = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(); // 8 hours from now
    const shifts = [
        { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], startTime: "08:00", endTime: "20:00" }
    ];
    const workers = [
        { id: 1, name: 'Worker Alpha', shifts },
        { id: 2, name: 'Worker Beta', shifts }
    ];

    console.log(`🚀 Generating schedule for ${quantity} units with 2 workers...`);
    const result = generateSchedule(baseTasks, quantity, deadline, workers);

    console.log('📊 Result Summary:');
    console.log(JSON.stringify(result.summary, null, 2));

    if (result.summary.bottleneck) {
        console.log(`✅ Bottleneck detected: ${result.summary.bottleneck.taskName} (${result.summary.bottleneck.percentageContribution}%)`);
    } else {
        console.error('❌ Bottleneck detection failed!');
    }

    if (result.summary.utilization && result.summary.utilization.length === workers.length) {
        console.log(`✅ Worker utilization calculated for all ${workers.length} workers.`);
    } else {
        console.error('❌ Utilization calculation failed!');
    }

    if (result.summary.insights.length > 0) {
        console.log(`✅ ${result.summary.insights.length} Smart Insights generated.`);
    }

    if (result.summary.status) {
        console.log(`✅ Feasibility status: ${result.summary.status}`);
        console.log(`💬 Feedback: ${result.summary.feedback}`);
    }

    // 3. Test Dependencies
    const taskDepCheck = result.schedule.find(t => t.name.includes('Bending (Unit 1)'));
    const parentTask = result.schedule.find(t => t.name.includes('Cutting (Unit 1)'));

    if (new Date(taskDepCheck.startTime) >= new Date(parentTask.endTime)) {
        console.log('✅ Dependency timing correct (Bending starts after Cutting).');
    } else {
        console.error('❌ Dependency timing error!');
    }

    console.log('\n✨ Verification Complete.');
}

verify().catch(console.error);
