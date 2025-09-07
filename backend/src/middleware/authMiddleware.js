const jwt = require('jsonwebtoken');
const Team = require('../models/Team');
const Admin = require('../models/Admin');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Token verification failed' 
    });
  }
};

// Middleware to authenticate team
const authenticateTeam = async (req, res, next) => {
  try {
    await authenticateToken(req, res, async () => {
      if (req.user.type !== 'team') {
        return res.status(403).json({ 
          success: false, 
          message: 'Team access required' 
        });
      }

      // Verify team still exists and is active
      const team = await Team.findById(req.user.id);
      if (!team) {
        return res.status(404).json({ 
          success: false, 
          message: 'Team not found' 
        });
      }

      req.team = team;
      next();
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Team authentication failed' 
    });
  }
};

// Middleware to authenticate admin
const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, async () => {
      if (req.user.type !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Admin access required' 
        });
      }

      // Verify admin still exists and is active
      const admin = await Admin.findById(req.user.id);
      if (!admin || !admin.isActive) {
        return res.status(404).json({ 
          success: false, 
          message: 'Admin not found or inactive' 
        });
      }

      if (admin.isLocked) {
        return res.status(423).json({ 
          success: false, 
          message: 'Account is locked' 
        });
      }

      req.admin = admin;
      next();
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Admin authentication failed' 
    });
  }
};

// Middleware to check admin permissions
const checkAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin authentication required' 
      });
    }

    if (!req.admin.canPerformAction(permission)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Middleware to check if game is active
const checkGameActive = async (req, res, next) => {
  try {
    const GameState = require('../models/GameState');
    const gameState = await GameState.getCurrentState();
    
    if (!gameState || !gameState.isGameActive) {
      return res.status(423).json({ 
        success: false, 
        message: 'Game is not currently active' 
      });
    }

    req.gameState = gameState;
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to check game status' 
    });
  }
};

// Middleware to check if game is not completed
const checkGameNotCompleted = async (req, res, next) => {
  try {
    const GameState = require('../models/GameState');
    const gameState = await GameState.getCurrentState();
    
    if (gameState && gameState.isGameCompleted) {
      return res.status(423).json({ 
        success: false, 
        message: 'Game has already ended' 
      });
    }

    req.gameState = gameState;
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to check game status' 
    });
  }
};

// Middleware to rate limiting (basic implementation)
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    const effectiveMax = process.env.NODE_ENV === 'development' ? 1000 : max;
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(ip)) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
      const record = requests.get(ip);
      
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
      } else if (record.count >= max) {
        return res.status(429).json({ 
          success: false, 
          message: 'Too many requests, please try again later' 
        });
      } else {
        record.count++;
      }
    }
    
    next();
  };
};

// Middleware to validate team ownership
const validateTeamOwnership = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    
    if (!req.team || req.team._id.toString() !== teamId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this team' 
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Team ownership validation failed' 
    });
  }
};

// Middleware to check if team can submit to level
const checkTeamLevelAccess = async (req, res, next) => {
  try {
    const { levelId } = req.params;
    const team = req.team;
    
    // Check if team has access to this level
    const levelIndex = team.assignedLevels.findIndex(
      level => level.toString() === levelId
    );
    
    if (levelIndex === -1) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this level' 
      });
    }
    
    // Check if this is the current level or a completed level
    if (levelIndex > team.currentIndex) {
      return res.status(403).json({ 
        success: false, 
        message: 'Level not yet unlocked' 
      });
    }
    
    req.levelIndex = levelIndex;
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Level access validation failed' 
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateTeam,
  authenticateAdmin,
  checkAdminPermission,
  checkGameActive,
  checkGameNotCompleted,
  rateLimit,
  validateTeamOwnership,
  checkTeamLevelAccess
};
