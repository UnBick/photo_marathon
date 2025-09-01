require('dotenv').config();
const connectDB = require('./config/db');
const { server } = require('./app');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Photo Marathon Backend Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📁 Uploads directory: ${process.env.UPLOAD_PATH || './uploads'}`);
      
      // Log environment info
      if (process.env.NODE_ENV === 'development') {
        console.log('\n🔧 Development Mode Enabled:');
        console.log(`   - MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/photo-marathon'}`);
        console.log(`   - JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
        console.log(`   - Rate Limit: ${process.env.RATE_LIMIT_MAX || 100} requests per ${Math.round((process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000) / 60000)} minutes`);
      }
      
      console.log('\n🎯 API Endpoints:');
      console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
      console.log(`   - Team: http://localhost:${PORT}/api/team`);
      console.log(`   - Levels: http://localhost:${PORT}/api/levels`);
      console.log(`   - Admin: http://localhost:${PORT}/api/admin`);
      
      console.log('\n📸 Photo Marathon Backend is ready!');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.error('Promise:', promise);
  
  // Close server gracefully
  server.close(() => {
    console.log('Server closed due to unhandled promise rejection');
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  
  // Close server gracefully
  server.close(() => {
    console.log('Server closed due to uncaught exception');
    process.exit(1);
  });
});

// Start the server
startServer();
