const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
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
    minlength: [8, 'Password must be at least 8 characters']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'super_admin', 'moderator'],
    default: 'admin'
  },
  permissions: {
    canManageLevels: {
      type: Boolean,
      default: true
    },
    canManageTeams: {
      type: Boolean,
      default: true
    },
    canReviewSubmissions: {
      type: Boolean,
      default: true
    },
    canViewAnalytics: {
      type: Boolean,
      default: true
    },
    canManageAdmins: {
      type: Boolean,
      default: false
    },
    canGameControl: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Indexes for performance
adminSchema.index({ username: 1 });
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for isLocked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
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
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.isLocked) {
    throw new Error('Account is locked');
  }
  
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    
    if (isMatch) {
      // Reset login attempts on successful login
      if (this.loginAttempts > 0) {
        this.loginAttempts = 0;
        this.lockUntil = undefined;
        await this.save();
      }
      this.lastLogin = new Date();
      await this.save();
    } else {
      // Increment login attempts
      this.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (this.loginAttempts >= 5) {
        this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }
      
      await this.save();
    }
    
    return isMatch;
  } catch (error) {
    throw error;
  }
};

// Method to check permission
adminSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Method to check if admin can perform action
adminSchema.methods.canPerformAction = function(action) {
  const permissionMap = {
    'manage_levels': 'canManageLevels',
    'manage_teams': 'canManageTeams',
    'review_submissions': 'canReviewSubmissions',
    'view_analytics': 'canViewAnalytics',
    'manage_admins': 'canManageAdmins',
    'game_control': 'canGameControl'
  };
  const permission = permissionMap[action];
  return permission ? this.hasPermission(permission) : false;
};

// Method to lock account
adminSchema.methods.lockAccount = function(durationMinutes = 15) {
  this.lockUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  return this.save();
};

// Method to unlock account
adminSchema.methods.unlockAccount = function() {
  this.lockUntil = undefined;
  this.loginAttempts = 0;
  return this.save();
};

// Method to reset password
adminSchema.methods.resetPassword = function(newPassword) {
  this.password = newPassword;
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};



// Static method to get active admins
adminSchema.statics.getActiveAdmins = function() {
  return this.find({ isActive: true }).select('-password');
};

// Ensure virtual fields are serialized
adminSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

adminSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('Admin', adminSchema);
