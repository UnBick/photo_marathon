const mongoose = require('mongoose');

const gameStateSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'global'
  },
  // Game status
  gameStatus: {
    type: String,
    enum: ['setup', 'active', 'paused', 'completed'],
    default: 'setup'
  },
  // Game timing
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  pauseStartTime: {
    type: Date
  },
  totalPauseTime: {
    type: Number, // in seconds
    default: 0
  },
  // Winner tracking
  finalDeclared: {
    type: Boolean,
    default: false
  },
  winnerTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  winnerTime: {
    type: Date
  },
  winnerSubmissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  },
  // Game settings
  maxTeams: {
    type: Number,
    default: 100
  },
  maxLevels: {
    type: Number,
    default: 10
  },
  finalLevelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level'
  },
  // Level assignment mode
  assignmentMode: {
    type: String,
    enum: ['fixed', 'random'],
    default: 'fixed'
  },
  // Game rules
  rules: {
    allowRetries: {
      type: Boolean,
      default: true
    },
    maxRetriesPerLevel: {
      type: Number,
      default: 5
    },
    timeLimit: {
      type: Number, // in minutes, 0 = no limit
      default: 0
    },
    autoApproveThreshold: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    }
  },
  // Statistics
  stats: {
    totalTeams: {
      type: Number,
      default: 0
    },
    activeTeams: {
      type: Number,
      default: 0
    },
    completedTeams: {
      type: Number,
      default: 0
    },
    totalSubmissions: {
      type: Number,
      default: 0
    },
    pendingSubmissions: {
      type: Number,
      default: 0
    }
  },
  // Admin settings
  adminSettings: {
    autoApproveEnabled: {
      type: Boolean,
      default: true
    },
    manualReviewRequired: {
      type: Boolean,
      default: false
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Indexes for performance
gameStateSchema.index({ gameStatus: 1 });
gameStateSchema.index({ finalDeclared: 1 });
gameStateSchema.index({ winnerTeamId: 1 });

// Ensure only one game state document exists
gameStateSchema.index({ _id: 1 }, { unique: true });

// Method to start the game
gameStateSchema.methods.startGame = function() {
  if (this.gameStatus === 'setup') {
    this.gameStatus = 'active';
    this.startTime = new Date();
    this.endTime = undefined;
    this.pauseStartTime = undefined;
    this.totalPauseTime = 0;
    return true;
  }
  return false;
};

// Method to pause the game
gameStateSchema.methods.pauseGame = function() {
  if (this.gameStatus === 'active') {
    this.gameStatus = 'paused';
    this.pauseStartTime = new Date();
    return true;
  }
  return false;
};

// Method to resume the game
gameStateSchema.methods.resumeGame = function() {
  if (this.gameStatus === 'paused') {
    this.gameStatus = 'active';
    if (this.pauseStartTime) {
      const pauseDuration = Math.floor((Date.now() - this.pauseStartTime.getTime()) / 1000);
      this.totalPauseTime += pauseDuration;
      this.pauseStartTime = undefined;
    }
    return true;
  }
  return false;
};

// Method to end the game
gameStateSchema.methods.endGame = function() {
  if (['active', 'paused'].includes(this.gameStatus)) {
    this.gameStatus = 'completed';
    this.endTime = new Date();
    return true;
  }
  return false;
};

// Method to declare winner (atomic operation)
gameStateSchema.methods.declareWinner = async function(teamId, submissionId) {
  if (this.finalDeclared) {
    return { success: false, message: 'Winner already declared' };
  }
  
  try {
    const result = await this.constructor.findOneAndUpdate(
      { _id: 'global', finalDeclared: false },
      {
        $set: {
          finalDeclared: true,
          winnerTeamId: teamId,
          winnerTime: new Date(),
          winnerSubmissionId: submissionId,
          gameStatus: 'completed',
          endTime: new Date()
        }
      },
      { new: true }
    );
    
    if (result) {
      this.finalDeclared = true;
      this.winnerTeamId = teamId;
      this.winnerTime = new Date();
      this.winnerSubmissionId = submissionId;
      this.gameStatus = 'completed';
      this.endTime = new Date();
      return { success: true, message: 'Winner declared successfully' };
    } else {
      return { success: false, message: 'Winner already declared by another process' };
    }
  } catch (error) {
    return { success: false, message: 'Error declaring winner', error: error.message };
  }
};

// Method to get game duration
gameStateSchema.methods.getGameDuration = function() {
  if (!this.startTime) return 0;
  
  const endTime = this.endTime || new Date();
  const totalDuration = Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000);
  return totalDuration - this.totalPauseTime;
};

// Method to get formatted game duration
gameStateSchema.methods.getFormattedDuration = function() {
  const duration = this.getGameDuration();
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;
  
  return {
    hours,
    minutes,
    seconds,
    formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  };
};

// Method to update statistics
gameStateSchema.methods.updateStats = function(stats) {
  this.stats = { ...this.stats, ...stats };
  return this.save();
};

// Method to reset game
gameStateSchema.methods.resetGame = function() {
  this.gameStatus = 'setup';
  this.startTime = undefined;
  this.endTime = undefined;
  this.pauseStartTime = undefined;
  this.totalPauseTime = 0;
  this.finalDeclared = false;
  this.winnerTeamId = undefined;
  this.winnerTime = undefined;
  this.winnerSubmissionId = undefined;
  this.stats = {
    totalTeams: 0,
    activeTeams: 0,
    completedTeams: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0
  };
  return this.save();
};

// Static method to get current game state
gameStateSchema.statics.getCurrentState = function() {
  return this.findOne({ _id: 'global' });
};

// Static method to initialize game state
gameStateSchema.statics.initialize = async function(adminId) {
  const existingState = await this.findOne({ _id: 'global' });
  if (existingState) {
    return existingState;
  }
  
  const newState = new this({
    createdBy: adminId
  });
  
  return await newState.save();
};

// Virtual for isGameActive
gameStateSchema.virtual('isGameActive').get(function() {
  return this.gameStatus === 'active';
});

// Virtual for isGamePaused
gameStateSchema.virtual('isGamePaused').get(function() {
  return this.gameStatus === 'paused';
});

// Virtual for isGameCompleted
gameStateSchema.virtual('isGameCompleted').get(function() {
  return this.gameStatus === 'completed';
});

// Ensure virtual fields are serialized
gameStateSchema.set('toJSON', { virtuals: true });
gameStateSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GameState', gameStateSchema);
