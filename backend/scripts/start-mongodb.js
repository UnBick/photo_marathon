#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting MongoDB...');

// Check if MongoDB is already running
const checkMongoDB = () => {
  return new Promise((resolve) => {
    const netstat = spawn('netstat', ['-an'], { shell: true });
    let output = '';
    
    netstat.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    netstat.on('close', () => {
      const isRunning = output.includes(':27017') && output.includes('LISTENING');
      resolve(isRunning);
    });
    
    netstat.on('error', () => {
      resolve(false);
    });
  });
};

// Start MongoDB service
const startMongoDB = () => {
  return new Promise((resolve, reject) => {
    console.log('📡 Attempting to start MongoDB service...');
    
    // Try to start MongoDB service (Windows)
    const startService = spawn('net', ['start', 'MongoDB'], { shell: true });
    
    startService.on('close', (code) => {
      if (code === 0) {
        console.log('✅ MongoDB service started successfully');
        resolve(true);
      } else {
        console.log('⚠️  Could not start MongoDB service, trying alternative methods...');
        resolve(false);
      }
    });
    
    startService.on('error', () => {
      console.log('⚠️  Could not start MongoDB service, trying alternative methods...');
      resolve(false);
    });
  });
};

// Check if MongoDB data directory exists
const checkDataDir = () => {
  const dataDir = path.join(process.cwd(), '..', '..', 'mongodb-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created MongoDB data directory');
  }
  return dataDir;
};

// Start MongoDB manually
const startMongoDBManual = (dataDir) => {
  return new Promise((resolve, reject) => {
    console.log('🔧 Starting MongoDB manually...');
    console.log(`📁 Data directory: ${dataDir}`);
    
    const mongoProcess = spawn('mongod', [
      '--dbpath', dataDir,
      '--port', '27017',
      '--bind_ip', '127.0.0.1'
    ], { 
      shell: true,
      stdio: 'inherit'
    });
    
    mongoProcess.on('error', (error) => {
      console.error('❌ Failed to start MongoDB:', error.message);
      console.log('\n💡 Try these alternatives:');
      console.log('   1. Install MongoDB Community Server');
      console.log('   2. Use MongoDB Atlas (cloud)');
      console.log('   3. Use Docker: docker run -d -p 27017:27017 mongo');
      reject(error);
    });
    
    // Give MongoDB time to start
    setTimeout(() => {
      console.log('✅ MongoDB should be running now');
      resolve(true);
    }, 3000);
  });
};

// Main function
const main = async () => {
  try {
    // Check if MongoDB is already running
    const isRunning = await checkMongoDB();
    
    if (isRunning) {
      console.log('✅ MongoDB is already running on port 27017');
      return;
    }
    
    // Try to start MongoDB service
    const serviceStarted = await startMongoDB();
    
    if (!serviceStarted) {
      // Check data directory
      const dataDir = checkDataDir();
      
      // Try manual start
      await startMongoDBManual(dataDir);
    }
    
    console.log('\n🎉 MongoDB setup complete!');
    console.log('📝 You can now run: npm run seed');
    
  } catch (error) {
    console.error('❌ Failed to start MongoDB:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
