// Security middleware - applied after CORS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import middleware
const { handleUploadErrors } = require('./middleware/uploadMiddleware');
const { corsMiddleware, handlePreflight, allowedOrigins } = require('./middleware/corsMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const levelRoutes = require('./routes/levelRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Create Express app
const app = express();
const server = createServer(app);

// Define allowed origins
const allowedOrigins = [
  'https://photo-marathon-wbbr.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined values

console.log('🔗 Allowed CORS origins:', allowedOrigins);

// Create Socket.IO server with proper CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling']
});

// Apply CORS middleware BEFORE any routes
app.use(handlePreflight);
app.use(corsMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Alias /level/uploads to /uploads for legacy/incorrect frontend URLs and direct browser requests
app.use('/level/uploads', express.static(path.join(__dirname, '../uploads')));

console.log('📁 Static routes for /uploads and /level/uploads are set up');

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Photo Marathon API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.io health check
app.get('/socket/health', (req, res) => {
  res.json({
    success: true,
    message: 'Socket.IO server is running',
    connected_clients: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Authentication middleware for socket
  socket.use(async (packet, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      // Add your JWT verification logic here if needed
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // Join team room
  socket.on('join-team', (teamId) => {
    if (teamId) {
      socket.join(`team-${teamId}`);
      console.log(`👥 Team ${teamId} joined room`);
      socket.emit('joined-team', { teamId, message: 'Successfully joined team room' });
    }
  });

  // Join admin room
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('👨‍💼 Admin joined admin room');
    socket.emit('joined-admin', { message: 'Successfully joined admin room' });
  });

  // Join game room
  socket.on('join_room', (data) => {
    if (data && data.room) {
      socket.join(data.room);
      console.log(`🎮 Socket ${socket.id} joined room: ${data.room}`);
      socket.emit('room-joined', { room: data.room });
    }
  });

  // Leave room
  socket.on('leave_room', (data) => {
    if (data && data.room) {
      socket.leave(data.room);
      console.log(`🚪 Socket ${socket.id} left room: ${data.room}`);
      socket.emit('room-left', { room: data.room });
    }
  });

  // Game events
  socket.on('game_start', (data) => {
    console.log('🎯 Game start event:', data);
    io.to(`game_${data.gameId}`).emit('game_started', data);
  });

  socket.on('game_pause', (data) => {
    console.log('⏸️ Game pause event:', data);
    io.to(`game_${data.gameId}`).emit('game_paused', data);
  });

  socket.on('game_resume', (data) => {
    console.log('▶️ Game resume event:', data);
    io.to(`game_${data.gameId}`).emit('game_resumed', data);
  });

  socket.on('game_end', (data) => {
    console.log('🏁 Game end event:', data);
    io.to(`game_${data.gameId}`).emit('game_ended', data);
  });

  // Level events
  socket.on('level_complete', (data) => {
    console.log('✅ Level complete event:', data);
    io.to(`team_${data.teamId}`).emit('level_completed', data);
  });

  // Submission events
  socket.on('submission_approve', (data) => {
    console.log('👍 Submission approved:', data);
    io.to(`team_${data.teamId}`).emit('submission_approved', data);
  });

  socket.on('submission_reject', (data) => {
    console.log('👎 Submission rejected:', data);
    io.to(`team_${data.teamId}`).emit('submission_rejected', data);
  });

  // Leaderboard updates
  socket.on('leaderboard_update', (data) => {
    console.log('🏆 Leaderboard update:', data);
    io.emit('leaderboard_updated', data);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('🚨 Socket error:', error);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use(handleUploadErrors);

app.use((err, req, res, next) => {
  console.error('🚨 Global error handler:', err);

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Handle file system errors
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Static file route for level uploads
app.get('/level/uploads/:file', (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.file);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving file:', err);
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
  });
});

// 404 handler for undefined routes (must be last)
app.use('*', (req, res) => {
  console.log('❓ Route not found:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/health',
      '/socket/health',
      '/api/auth/*',
      '/api/team/*',
      '/api/levels/*',
      '/api/admin/*',
      '/uploads/*',
      '/level/uploads/*'
    ]
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io };