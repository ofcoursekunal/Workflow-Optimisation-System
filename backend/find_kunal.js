const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'shopfloor.db'));

const users = db.prepare("SELECT * FROM users WHERE name LIKE '%kunal%' OR email LIKE '%kunal%'").all();
console.log('--- FOUND KUNAL ---');
console.log(JSON.stringify(users, null, 2));
