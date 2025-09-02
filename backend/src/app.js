const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
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

console.log('🔗 Allowed CORS origins:', allowedOrigins);

// Create Socket.IO server with proper CORS and handshake authentication
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowRequest: (req, callback) => {
    try {
      // Get token from query params or authorization header
      const token = req._query?.token || 
                   req.headers?.authorization?.split(" ")[1] ||
                   req.handshake?.auth?.token;
      
      if (!token) {
        console.log('🚫 Socket connection rejected: No token provided');
        return callback("No authentication token provided", false);
      }
      
      // Verify JWT token at handshake level
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user info to request for later use
      req.user = decoded;
      
      console.log(`🔐 Socket handshake authenticated for user: ${decoded.id || decoded.userId}`);
      callback(null, true);
    } catch (err) {
      console.log('🚫 Socket connection rejected:', err.message);
      
      if (err.name === 'TokenExpiredError') {
        return callback("Authentication token has expired", false);
      }
      
      return callback("Invalid authentication token", false);
    }
  }
});

// Apply CORS middleware BEFORE any routes
app.use(handlePreflight);
app.use(corsMiddleware);

// Security middleware - applied after CORS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: [
        "'self'", 
        "ws:", 
        "wss:", 
        "https:", // Allow HTTPS for Socket.IO polling fallback
        "https://photo-marathon-wbbr.vercel.app",
        ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
      ]
    }
  }
}));

// Rate limiting - Different limits for different routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/', generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads (single implementation)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/level/uploads', express.static(path.join(__dirname, '../uploads')));

console.log('📁 Static routes for /uploads and /level/uploads are set up');

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint with memory usage
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    success: true,
    message: 'Photo Marathon API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    }
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
  // User info is already available from handshake authentication
  const user = socket.request.user;
  console.log(`🔌 Client connected: ${socket.id} (User: ${user?.id || user?.userId})`);
  
  // Store user info on socket for easy access
  socket.user = user;

  // Join team room - Using consistent naming convention (team-${id})
  socket.on('join-team', (teamId) => {
    if (teamId) {
      socket.join(`team-${teamId}`);
      console.log(`👥 Team ${teamId} joined room: team-${teamId}`);
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

  // Game events - Using consistent naming convention (game-${id})
  socket.on('game_start', (data) => {
    console.log('🎯 Game start event:', data);
    io.to(`game-${data.gameId}`).emit('game_started', data);
  });

  socket.on('game_pause', (data) => {
    console.log('⏸️ Game pause event:', data);
    io.to(`game-${data.gameId}`).emit('game_paused', data);
  });

  socket.on('game_resume', (data) => {
    console.log('▶️ Game resume event:', data);
    io.to(`game-${data.gameId}`).emit('game_resumed', data);
  });

  socket.on('game_end', (data) => {
    console.log('🏁 Game end event:', data);
    io.to(`game-${data.gameId}`).emit('game_ended', data);
  });

  // Level events - Using consistent naming convention (team-${id})
  socket.on('level_complete', (data) => {
    console.log('✅ Level complete event:', data);
    io.to(`team-${data.teamId}`).emit('level_completed', data);
  });

  // Submission events - Using consistent naming convention (team-${id})
  socket.on('submission_approve', (data) => {
    console.log('👍 Submission approved:', data);
    io.to(`team-${data.teamId}`).emit('submission_approved', data);
  });

  socket.on('submission_reject', (data) => {
    console.log('👎 Submission rejected:', data);
    io.to(`team-${data.teamId}`).emit('submission_rejected', data);
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
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: errors
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      code: 'DUPLICATE_KEY_ERROR',
      message: `${field} already exists`
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_EXPIRED',
      message: 'Token expired'
    });
  }

  // Handle file system errors
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      code: 'FILE_NOT_FOUND',
      message: 'File not found'
    });
  }

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      code: 'CORS_ERROR',
      message: 'Origin not allowed by CORS policy'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for undefined routes (must be last)
app.use('*', (req, res) => {
  console.log('❓ Route not found:', req.originalUrl);
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
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
const gracefulShutdown = (signal) => {
  console.log(`🛑 ${signal} received, shutting down gracefully`);
  
  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      return process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    
    // Close Socket.IO server
    io.close((err) => {
      if (err) {
        console.error('❌ Error during Socket.IO shutdown:', err);
        return process.exit(1);
      }
      
      console.log('✅ Socket.IO server closed');
      console.log('✅ Process terminated gracefully');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server, io };