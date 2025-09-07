const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  // Image processing results
  phash: {
    type: String,
    required: true
  },
  embeddingId: {
    type: String
  },
  // EXIF data
  exif: {
    make: String,
    model: String,
    dateTime: Date,
    gpsLatitude: Number,
    gpsLongitude: Number,
    orientation: Number,
    width: Number,
    height: Number,
    fileSize: Number
  },
  // Matching results
  similarityScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  phashDistance: {
    type: Number,
    default: 64
  },
  featureMatches: {
    type: Number,
    default: 0
  },
  // Status and approval
  status: {
    type: String,
    enum: ['pending', 'auto_approved', 'manual_approved', 'manual_rejected', 'auto_rejected'],
    default: 'pending'
  },
  // Approval details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  // Attempt tracking
  attemptNumber: {
    type: Number,
    default: 1
  },
  // Metadata
  submittedAt: {
    type: Date,
    default: Date.now
  },
  processingTime: {
    type: Number, // milliseconds
    default: 0
  },
  // Game state
  isFinalSubmission: {
    type: Boolean,
    default: false
  },
  // Admin notes
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for performance
submissionSchema.index({ teamId: 1, levelId: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ submittedAt: 1 });
submissionSchema.index({ similarityScore: 1 });
submissionSchema.index({ isFinalSubmission: 1 });

// Compound index for team progress
submissionSchema.index({ teamId: 1, levelId: 1, status: 1 });

// Ensure one submission per team per level per attempt
submissionSchema.index({ 
  teamId: 1, 
  levelId: 1, 
  attemptNumber: 1 
}, { unique: true });

// Pre-save middleware to set attempt number
submissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const lastSubmission = await this.constructor.findOne({
        teamId: this.teamId,
        levelId: this.levelId
      }).sort({ attemptNumber: -1 });
      
      this.attemptNumber = lastSubmission ? lastSubmission.attemptNumber + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to approve submission
submissionSchema.methods.approve = function(adminId, notes = '') {
  this.status = 'manual_approved';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.adminNotes = notes;
  return this.save();
};

// Method to reject submission
submissionSchema.methods.reject = function(adminId, reason, notes = '') {
  this.status = 'manual_rejected';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  this.adminNotes = notes;
  return this.save();
};

// Method to auto-approve
submissionSchema.methods.autoApprove = function() {
  this.status = 'auto_approved';
  this.approvedAt = new Date();
  return this.save();
};

// Method to auto-reject
submissionSchema.methods.autoReject = function() {
  this.status = 'auto_rejected';
  this.approvedAt = new Date();
  return this.save();
};

// Method to get submission summary
submissionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    teamId: this.teamId,
    levelId: this.levelId,
    status: this.status,
    similarityScore: this.similarityScore,
    phashDistance: this.phashDistance,
    attemptNumber: this.attemptNumber,
    submittedAt: this.submittedAt,
    isFinalSubmission: this.isFinalSubmission
  };
};

// Static method to get pending submissions
submissionSchema.statics.getPendingSubmissions = function() {
  return this.find({ 
    status: 'pending' 
  }).populate('teamId', 'teamName username')
    .populate('levelId', 'title order')
    .sort({ submittedAt: 1 });
};

// Static method to get team submissions for a level
submissionSchema.statics.getTeamLevelSubmissions = function(teamId, levelId) {
  return this.find({ 
    teamId, 
    levelId 
  }).sort({ attemptNumber: 1 });
};

// Static method to get final submissions
submissionSchema.statics.getFinalSubmissions = function() {
  return this.find({ 
    isFinalSubmission: true 
  }).populate('teamId', 'teamName username')
    .sort({ submittedAt: 1 });
};

// Virtual for isApproved
submissionSchema.virtual('isApproved').get(function() {
  return ['auto_approved', 'manual_approved'].includes(this.status);
});

// Virtual for isRejected
submissionSchema.virtual('isRejected').get(function() {
  return ['auto_rejected', 'manual_rejected'].includes(this.status);
});

// Virtual for isPending
submissionSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

// Ensure virtual fields are serialized
submissionSchema.set('toJSON', { virtuals: true });
submissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Submission', submissionSchema);
