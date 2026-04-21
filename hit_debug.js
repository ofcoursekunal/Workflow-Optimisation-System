const http = require('http');

http.get('http://localhost:5001/api/projects/debug-list', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            console.log('Body:', JSON.stringify(JSON.parse(data), null, 2));
        } catch (e) {
            console.log('Raw Body:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
