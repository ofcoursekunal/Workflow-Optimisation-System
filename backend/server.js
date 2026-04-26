const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  allowEIO3: true,
  transports: ['polling', 'websocket']
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

app.set('io', io);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/machines', require('./routes/machines'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/breaks', require('./routes/breaks'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/supervisor', require('./routes/supervisor'));
app.use('/api/credits', require('./routes/credits'));
app.use('/api/credit-settings', require('./routes/credit_settings'));
app.use('/api/planning', require('./routes/planning'));

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user-specific room for targeted notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Background services
require('./services/idleDetector')(io);
require('./services/delayDetector')(io);
app.set('autoAssign', require('./services/autoAssign')(io));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🔧 Shopfloor Backend running on http://localhost:${PORT}`);
  console.log('📊 Real-time Socket.io active');
  console.log('🔔 Background detectors running\n');
});
