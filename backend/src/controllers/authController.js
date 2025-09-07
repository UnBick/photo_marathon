const jwt = require('jsonwebtoken');
const Team = require('../models/Team');
const Admin = require('../models/Admin');
const GameState = require('../models/GameState');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Team registration
const registerTeam = async (req, res) => {
  try {
    const { teamName, username, email, password } = req.body;

    // Check if game is accepting registrations
    const gameState = await GameState.getCurrentState();
    if (gameState && gameState.gameStatus === 'active') {
      return res.status(423).json({
        success: false,
        message: 'Game is already in progress. Registration is closed.'
      });
    }

    // Check if team name, username, or email already exists
    const existingTeam = await Team.findOne({
      $or: [{ teamName }, { username }, { email }]
    });

    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: 'Team name, username, or email already exists'
      });
    }

    // Create new team
    const team = new Team({
      teamName,
      username,
      email,
      password
    });

    // Assign levels to team based on game state
    if (gameState && gameState.assignmentMode === 'random') {
      // Get all active levels and shuffle them
      const levels = await require('../models/Level').getActiveLevels();
      const shuffledLevels = shuffleArray([...levels]);
      team.assignedLevels = shuffledLevels.map(level => level._id);
    } else {
      // Fixed order - get levels in order
      const levels = await require('../models/Level').getActiveLevels();
      team.assignedLevels = levels.map(level => level._id);
    }

    await team.save();

    // Update game state stats
    if (gameState) {
      gameState.stats.totalTeams += 1;
      gameState.stats.activeTeams += 1;
      await gameState.save();
    }

    // Generate token
    const token = generateToken({
      id: team._id,
      type: 'team',
      teamName: team.teamName,
      username: team.username,
      email: team.email
    });

    res.status(201).json({
      success: true,
      message: 'Team registered successfully',
      data: {
        token,
        team: {
          id: team._id,
          teamName: team.teamName,
          username: team.username,
          email: team.email,
          progress: team.getProgress(),
          type: 'team'
        }
      }
    });

  } catch (error) {
    console.error('Team registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Team registration failed',
      error: error.message
    });
  }
};

// Team login
const loginTeam = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find team by username
    const team = await Team.findOne({ username: username.toLowerCase() });
    if (!team) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await team.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last active
    team.lastActive = new Date();
    await team.save();

    // Generate token
    const token = generateToken({
      id: team._id,
      type: 'team',
      teamName: team.teamName,
      username: team.username,
      email: team.email
    });

    res.json({
      success: true,
      message: 'Team login successful',
      data: {
        token,
        team: {
          id: team._id,
          teamName: team.teamName,
          username: team.username,
          email: team.email,
          progress: team.getProgress(),
          type: 'team'
        }
      }
    });

  } catch (error) {
    console.error('Team login error:', error);
    res.status(500).json({
      success: false,
      message: 'Team login failed',
      error: error.message
    });
  }
};

// Admin registration (only existing admin can create other admins)
const registerAdmin = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;
    const currentAdmin = req.admin;

    // Check if current admin exists
    if (!currentAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Authentication required to create admin accounts'
      });
    }

    // Check if username or email already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Create new admin
    const admin = new Admin({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'admin',
      createdBy: currentAdmin._id,
      isActive: true
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          permissions: admin.permissions,
          type: 'admin'
        }
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin registration failed',
      error: error.message
    });
  }
};

// Admin login
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(401).json({
        success: false,
        message: 'username and password are required'
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    if (!admin.isActive) {
      return res.status(423).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked due to multiple failed login attempts'
      });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken({
      id: admin._id,
      type: 'admin',
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions
    });

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          permissions: admin.permissions,
          type: 'admin'
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed',
      error: error.message
    });
  }
};

// Create admin (for initial setup)
const createAdmin = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Check if any admin already exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists'
      });
    }

    // Create admin
    const admin = new Admin({
      username,
      email,
      password,
      firstName,
      lastName,
      role: 'admin',
      isActive: true
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          type: 'admin'
        }
      }
    });

  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin creation failed',
      error: error.message
    });
  }
};

// Logout (client-side token removal)
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can track logout events if needed
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

// Get current user info
const getCurrentUser = async (req, res) => {
  try {
    if (req.user.type === 'team') {
      const team = await Team.findById(req.user.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      res.json({
        success: true,
        data: {
          type: 'team',
          team: {
            id: team._id,
            teamName: team.teamName,
            username: team.username,
            email: team.email,
            progress: team.getProgress(),
            type: 'team'
          }
        }
      });
    } else if (req.user.type === 'admin') {
      const admin = await Admin.findById(req.user.id);
      if (!admin || !admin.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      res.json({
        success: true,
        data: {
          type: 'admin',
          admin: {
            id: admin._id,
            username: admin.username,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            permissions: admin.permissions,
            type: 'admin'
          }
        }
      });
    }
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info',
      error: error.message
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    // Generate new token with same payload
    const newToken = generateToken({
      id: req.user.id,
      type: req.user.type,
      username: req.user.username
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
};

// Helper function to shuffle array
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

module.exports = {
  registerTeam,
  loginTeam,
  registerAdmin,
  loginAdmin,
  createAdmin,
  logout,
  getCurrentUser,
  refreshToken
};
