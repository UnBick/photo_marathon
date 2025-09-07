// Script to check for missing level thumbnail files in the uploads directory
// Run with: node check-missing-thumbnails.js

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Level = require('./src/models/Level');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/photo-marathon');
  const levels = await Level.find().lean();
  let missing = [];
  for (const level of levels) {
    if (level.thumbnailUrl) {
      const thumbPath = path.join(UPLOADS_DIR, path.basename(level.thumbnailUrl));
      if (!fs.existsSync(thumbPath)) {
        missing.push(thumbPath);
      }
    }
  }
  if (missing.length === 0) {
    console.log('All level thumbnails exist.');
  } else {
    console.log('Missing thumbnail files:');
    missing.forEach(f => console.log(f));
  }
  mongoose.disconnect();
}

main();
