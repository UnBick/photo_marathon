const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: [true, 'Team name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Team name cannot exceed 50 characters']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  assignedLevels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level'
  }],
  currentIndex: {
    type: Number,
    default: 0,
    min: 0
  },
  completed: [{
    levelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level'
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    attempts: {
      type: Number,
      default: 1
    },
    bestScore: {
      type: Number,
      default: 0
    }
  }],
  finalUnlocked: {
    type: Boolean,
    default: false
  },
  finalSubmitted: {
    type: Boolean,
    default: false
  },
  finalSubmissionTime: {
    type: Date
  },
  isWinner: {
    type: Boolean,
    default: false
  },
  totalTime: {
    type: Number, // in seconds
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
teamSchema.index({ username: 1 });
teamSchema.index({ teamName: 1 });
teamSchema.index({ email: 1 });
teamSchema.index({ currentIndex: 1 });
teamSchema.index({ finalUnlocked: 1 });
teamSchema.index({ isWinner: 1 });

// Hash password before saving
teamSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
teamSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get current progress
teamSchema.methods.getProgress = function() {
  return {
    currentLevel: this.assignedLevels[this.currentIndex],
    completedLevels: Array.isArray(this.completed) ? this.completed : [],
    completedCount: this.completed.length,
    totalLevels: this.assignedLevels.length,
    finalUnlocked: this.finalUnlocked,
    finalSubmitted: this.finalSubmitted,
    isWinner: this.isWinner
  };
};

// Method to unlock next level
teamSchema.methods.unlockNextLevel = function() {
  if (this.currentIndex < this.assignedLevels.length - 1) {
    this.currentIndex++;
    return true;
  } else if (this.currentIndex === this.assignedLevels.length - 1) {
    this.finalUnlocked = true;
    return true;
  }
  return false;
};

// Method to complete a level
teamSchema.methods.completeLevel = function(levelId, score = 0) {
  const now = new Date();
  const existingCompletion = this.completed.find(c => c.levelId.toString() === levelId.toString());
  if (existingCompletion) {
    existingCompletion.attempts++;
    if (score > existingCompletion.bestScore) {
      existingCompletion.bestScore = score;
    }
    // Do not overwrite completedAt if already set
  } else {
    // Calculate time taken for this level
    let timeTaken = 0;
    if (this.completed.length === 0 && this.startTime) {
      // First level: time from startTime
      timeTaken = Math.floor((now - new Date(this.startTime).getTime()) / 1000);
    } else if (this.completed.length > 0) {
      // Subsequent levels: time from previous completedAt
      const prevCompleted = this.completed[this.completed.length - 1];
      timeTaken = Math.floor((now - new Date(prevCompleted.completedAt).getTime()) / 1000);
    }
    this.completed.push({
      levelId,
      completedAt: now,
      attempts: 1,
      bestScore: score,
      timeTaken
    });
  }
  return this.unlockNextLevel();
};

// Method to submit final challenge
teamSchema.methods.submitFinal = function() {
  if (this.finalUnlocked && !this.finalSubmitted) {
    this.finalSubmitted = true;
    this.finalSubmissionTime = new Date();
    return true;
  }
  return false;
};

// Virtual for progress percentage
teamSchema.virtual('progressPercentage').get(function() {
  if (this.assignedLevels.length === 0) return 0;
  return Math.round((this.completed.length / this.assignedLevels.length) * 100);
});

// Ensure virtual fields are serialized
teamSchema.set('toJSON', { virtuals: true });
teamSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Team', teamSchema);
