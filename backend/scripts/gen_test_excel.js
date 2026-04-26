const xlsx = require('xlsx');
const path = require('path');

const data = [
    { taskId: 101, taskName: 'Cutting', dependsOn: '', duration: 10 },
    { taskId: 102, taskName: 'Bending', dependsOn: '101', duration: 15 },
    { taskId: 103, taskName: 'Welding', dependsOn: '102', duration: 20 },
    { taskId: 104, taskName: 'Quality Check', dependsOn: '103', duration: 5 }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'ProductionProcess');

const filePath = path.join(__dirname, 'production_template.xlsx');
xlsx.writeFile(wb, filePath);
console.log('Test Excel generated at:', filePath);
