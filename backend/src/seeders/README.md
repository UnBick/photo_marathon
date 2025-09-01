# Database Seeder

This directory contains database seeding scripts to populate your MongoDB database with initial data.

## Files

- `adminSeeder.js` - Seeds admin users, levels, and game state configuration

## Usage

### Run the Seeder

```bash
# From the backend directory
npm run seed

# Or directly with node
node src/seeders/adminSeeder.js
```

### What Gets Seeded

#### 👥 Admin Users
- **Super Admin**: `admin` / `admin123`
- **Moderator**: `moderator` / `mod123`  
- **Judge**: `judge` / `judge123`

#### 🎯 Sample Levels
1. **Urban Architecture** (Easy - 100 points)
2. **Nature in the City** (Medium - 150 points)
3. **Street Art & Culture** (Hard - 200 points)
4. **Final Challenge: Creative Composition** (Expert - 500 points)

#### 🎮 Game State
- Initial game configuration
- Registration open
- Game status: waiting

## Prerequisites

1. **MongoDB running** on your system
2. **Environment variables** set up (see `.env.example`)
3. **Dependencies installed** (`npm install`)

## Environment Variables

Make sure you have these in your `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/photo-marathon
JWT_SECRET=your-secret-key
```

## Safety Features

- **Duplicate Prevention**: Won't create duplicate admin users or levels
- **Safe to Re-run**: Can be executed multiple times safely
- **Password Hashing**: All passwords are properly hashed with bcrypt

## Customization

You can modify the seeder data by editing:

- `adminUsers` array for different admin accounts
- `sampleLevels` array for custom level configurations
- `gameStateConfig` for different game settings

## Troubleshooting

### Connection Issues
- Ensure MongoDB is running
- Check your connection string in `.env`
- Verify network connectivity

### Permission Issues
- Make sure the seeder has write access to your database
- Check if your MongoDB user has the right permissions

### Model Errors
- Ensure all required models are properly defined
- Check for any schema validation errors

## Example Output

```
🚀 Starting database seeder...
✅ MongoDB connected successfully
🌱 Seeding admin users...
✅ Created admin: admin (super_admin)
✅ Created admin: moderator (moderator)
✅ Created admin: judge (judge)
✅ Admin users seeded successfully
🌱 Seeding levels...
✅ Created level: Urban Architecture (easy)
✅ Created level: Nature in the City (medium)
✅ Created level: Street Art & Culture (hard)
✅ Created level: Final Challenge: Creative Composition (expert)
✅ Levels seeded successfully
🌱 Seeding game state...
✅ Game state seeded successfully
🎉 Database seeding completed successfully!

📋 Seeded Data Summary:
   👥 Admin Users: 3
   🎯 Levels: 4
   🎮 Game State: 1

🔑 Default Admin Credentials:
   Username: admin
   Password: admin123
   Email: admin@photomarathon.com

🔌 Database connection closed
```
