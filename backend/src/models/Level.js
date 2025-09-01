const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Level title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  photoUrl: {
    type: String,
    required: [true, 'Photo URL is required']
  },
  thumbnailUrl: {
    type: String
  },
  isFinal: {
    type: Boolean,
    default: false
  },
  finalClue: {
    type: String,
    trim: true,
    maxlength: [1000, 'Final clue cannot exceed 1000 characters'],
    default: ''
  },
  order: {
    type: Number,
    required: function() { return !this.isFinal; },
    min: 1
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  hints: [{
    text: {
      type: String,
      required: true,
      maxlength: [200, 'Hint cannot exceed 200 characters']
    },
    unlockedAt: {
      type: Number, // minutes from start
      default: 0
    }
  }],
  // Image processing features
  phash: {
    type: String,
    required: true
  },
  phashDistance: {
    type: Number,
    default: 0
  },
  descriptors: {
    type: Buffer
  },
  embeddingId: {
    type: String
  },
  // Multiple acceptable images for the same level
  alternativeImages: [{
    photoUrl: String,
    phash: String,
    descriptors: Buffer,
    embeddingId: String
  }],
  // Game settings
  timeLimit: {
    type: Number, // in minutes, 0 = no limit
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  points: {
    type: Number,
    default: 100
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
levelSchema.index({ order: 1 });
levelSchema.index({ isFinal: 1 });
levelSchema.index({ isActive: 1 });
levelSchema.index({ difficulty: 1 });
levelSchema.index({ phash: 1 });

// Ensure only one final level exists
levelSchema.pre('save', async function(next) {
  if (this.isFinal) {
    try {
      const existingFinal = await this.constructor.findOne({ isFinal: true });
      if (existingFinal && existingFinal._id.toString() !== this._id.toString()) {
        throw new Error('Only one final level can exist');
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to get next level
levelSchema.statics.getNextLevel = function(currentOrder) {
  return this.findOne({ 
    order: currentOrder + 1, 
    isActive: true 
  }).sort('order');
};

// Method to get previous level
levelSchema.statics.getPreviousLevel = function(currentOrder) {
  return this.findOne({ 
    order: currentOrder - 1, 
    isActive: true 
  }).sort('order');
};

// Method to get all active levels in order
levelSchema.statics.getActiveLevels = function() {
  return this.find({ 
    isActive: true, 
    isFinal: false 
  }).sort('order');
};

// Method to get final level
levelSchema.statics.getFinalLevel = function() {
  return this.findOne({ 
    isFinal: true, 
    isActive: true 
  });
};

// Method to check if image matches this level
levelSchema.methods.matchesImage = function(submissionPhash, submissionDescriptors = null) {
  // Check main image
  const mainDistance = this.calculatePhashDistance(submissionPhash);
  if (mainDistance <= parseInt(process.env.PHASH_THRESHOLD) || 8) {
    return { matches: true, score: 1 - (mainDistance / 64), source: 'main' };
  }

  // Check alternative images
  for (let alt of this.alternativeImages) {
    const altDistance = this.calculatePhashDistance(submissionPhash, alt.phash);
    if (altDistance <= parseInt(process.env.PHASH_THRESHOLD) || 8) {
      return { matches: true, score: 1 - (altDistance / 64), source: 'alternative' };
    }
  }

  // If descriptors are available, do feature matching
  if (submissionDescriptors && this.descriptors) {
    const featureScore = this.matchFeatures(submissionDescriptors);
    if (featureScore > 0.7) {
      return { matches: true, score: featureScore, source: 'features' };
    }
  }

  return { matches: false, score: 0 };
};

// Helper method to calculate pHash distance
levelSchema.methods.calculatePhashDistance = function(submissionPhash, referencePhash = null) {
  const ref = referencePhash || this.phash;
  if (!ref || !submissionPhash) return 64; // max distance
  
  let distance = 0;
  for (let i = 0; i < ref.length && i < submissionPhash.length; i++) {
    if (ref[i] !== submissionPhash[i]) distance++;
  }
  return distance;
};

// Helper method for feature matching (placeholder)
levelSchema.methods.matchFeatures = function(submissionDescriptors) {
  // This would implement actual feature matching logic
  // For now, return a placeholder score
  return 0.5;
};

// Virtual for total hints
levelSchema.virtual('totalHints').get(function() {
  return Array.isArray(this.hints) ? this.hints.length : 0;
});

// Ensure virtual fields are serialized
levelSchema.set('toJSON', { virtuals: true });
levelSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Level', levelSchema);
