// backfill-team-times.js
// Run this script with: node scripts/backfill-team-times.js

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Team = require('../src/models/Team');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const teams = await Team.find();
  let updatedCount = 0;

  for (const team of teams) {
    // Skip if already has startTime and totalTime
    if (team.startTime && team.totalTime && team.totalTime > 0) continue;

    // Find earliest completedAt or fallback to createdAt
    let startTime = team.createdAt;
    if (team.completed && team.completed.length > 0) {
      const firstCompleted = team.completed.reduce((min, c) => c.completedAt < min ? c.completedAt : min, team.completed[0].completedAt);
      startTime = new Date(firstCompleted);
    }
    team.startTime = startTime;

    // Calculate totalTime as sum of (completedAt - startTime) for each completed level
    let totalTime = 0;
    if (team.completed && team.completed.length > 0) {
      for (const c of team.completed) {
        totalTime += new Date(c.completedAt) - new Date(startTime);
      }
    }
    team.totalTime = totalTime;
    await team.save();
    updatedCount++;
  }

  console.log(`Updated ${updatedCount} teams with startTime and totalTime.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
