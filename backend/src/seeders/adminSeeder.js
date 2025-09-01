const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const GameState = require('../models/GameState');
const Level = require('../models/Level');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bitphotographicsociety_db_user:T2pwgtyajSgEU5Hh@cluster0.0gzgwrl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Admin data to seed
const adminUsers = [
  {
    username: 'admin',
    email: 'admin@photomarathon.com',
    password: 'admin123',
    role: 'admin',
    firstName: 'System',
    lastName: 'Administrator',
    isActive: true
  }
];

// Sample levels to seed
const sampleLevels = [
  {
    title: 'Urban Architecture',
    description: 'Find and photograph a unique architectural element in an urban setting. Look for interesting patterns, shapes, or designs that make the cityscape special.',
    photoClue: 'A building with distinctive geometric patterns or unusual design elements',
    difficulty: 'easy',
    points: 100,
    timeLimit: 3600, // 1 hour in seconds
    isActive: true,
    order: 1
  },
  {
    title: 'Nature in the City',
    description: 'Capture the beauty of nature thriving in an urban environment. This could be a tree, garden, park, or any natural element that coexists with city life.',
    photoClue: 'A tree, plant, or natural landscape within the city limits',
    difficulty: 'easy',
    points: 150,
    timeLimit: 5400, // 1.5 hours in seconds
    isActive: true,
    order: 2
  },
  {
    title: 'Street Art & Culture',
    description: 'Discover and photograph street art, murals, or cultural expressions that add character to the urban landscape.',
    photoClue: 'Street art, murals, graffiti, or cultural installations',
    difficulty: 'medium',
    points: 200,
    timeLimit: 7200, // 2 hours in seconds
    isActive: true,
    order: 3
  },
  {
    title: 'Final Challenge: Creative Composition',
    description: 'Create a unique photographic composition that showcases your creativity and technical skills. This is your chance to shine and demonstrate everything you\'ve learned.',
    photoClue: 'An original, creative composition that tells a story or conveys emotion',
    difficulty: 'hard',
    points: 500,
    timeLimit: 10800, // 3 hours in seconds
    isActive: true,
    order: 4,
    isFinal: true
  }
];

// Game state configuration
const gameStateConfig = {
  status: 'waiting', // waiting, active, paused, finished
  startTime: null,
  endTime: null,
  isRegistrationOpen: true,
  maxTeams: 50,
  currentLevel: null,
  winner: null,
  settings: {
    autoAdvanceLevels: false,
    allowMultipleSubmissions: true,
    requireApproval: true,
    scoringEnabled: true
  }
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const seedAdminUsers = async () => {
  try {
    console.log('🌱 Seeding admin users...');
    
    for (const adminData of adminUsers) {
      // Check if admin already exists
      const existingAdmin = await Admin.findOne({
        $or: [{ username: adminData.username }, { email: adminData.email }]
      });
      
      if (existingAdmin) {
        console.log(`⚠️  Admin ${adminData.username} already exists, skipping...`);
        continue;
      }
      
      // Create admin with plain password (model will hash it)
      const admin = new Admin(adminData);
      await admin.save();
      console.log(`✅ Created admin: ${adminData.username} (${adminData.role})`);
    }
    
    console.log('✅ Admin users seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding admin users:', error);
  }
};

// Seed levels
const seedLevels = async () => {
  try {
    console.log('🌱 Seeding levels...');
    
    // Get admin (for createdBy)
    const admin = await Admin.findOne({ username: 'admin' });
    if (!admin) throw new Error('Admin user not found, cannot seed levels');

    for (const levelData of sampleLevels) {
      const existingLevel = await Level.findOne({ title: levelData.title });
      if (existingLevel) {
        console.log(`⚠️  Level "${levelData.title}" already exists, skipping...`);
        continue;
      }

      // Add required fields
      const level = new Level({
        ...levelData,
        createdBy: admin._id,
        photoUrl: 'https://example.com/placeholder.jpg', // dummy URL
        phash: 'dummyhash' // placeholder, replace if you compute real phash
      });

      await level.save();
      console.log(`✅ Created level: ${levelData.title} (${levelData.difficulty})`);
    }

    console.log('✅ Levels seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding levels:', error);
  }
};


// Seed game state
const seedGameState = async () => {
  try {
    console.log('🌱 Seeding game state...');

    const existingGameState = await GameState.findOne();
    if (existingGameState) {
      console.log('⚠️  Game state already exists, skipping...');
      return;
    }

    // Get admin (for createdBy)
    const admin = await Admin.findOne({ username: 'admin' });
    if (!admin) throw new Error('Admin user not found, cannot seed game state');

    const gameState = new GameState({
      ...gameStateConfig,
      createdBy: admin._id
    });

    await gameState.save();
    console.log('✅ Game state seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding game state:', error);
  }
};


// Main seeding function
const runSeeder = async () => {
  try {
    console.log('🚀 Starting database seeder...');
    
    // Connect to database
    await connectDB();
    
    // Run seeders
    await seedAdminUsers();
    await seedLevels();
    await seedGameState();
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Seeded Data Summary:');
    console.log(`   👥 Admin Users: ${adminUsers.length}`);
    console.log(`   🎯 Levels: ${sampleLevels.length}`);
    console.log(`   🎮 Game State: 1`);
    console.log('\n🔑 Default Admin Credentials:');
    console.log('   Email: admin@photomarathon.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run seeder if this file is executed directly
if (require.main === module) {
  runSeeder();
}

module.exports = {
  runSeeder,
  seedAdminUsers,
  seedLevels,
  seedGameState
};
