// Initialize game state if none exists
const initGameState = async (req, res) => {
  try {
    let gameState = await GameState.getCurrentState();
    if (gameState) {
      return res.status(200).json({ message: 'Game state already exists', gameState });
    }
    gameState = await GameState.create({ createdBy: req.user.id });
    res.status(201).json({ message: 'Game state initialized', gameState });
  } catch (error) {
    res.status(500).json({ message: 'Error initializing game state', error: error.message });
  }
};
// Reset game state to 'setup' so a new game can be started
const resetGame = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    if (!gameState) {
      return res.status(500).json({ message: 'No game state found' });
    }
    gameState.gameStatus = 'setup';
    gameState.startTime = undefined;
    gameState.endTime = undefined;
    gameState.pauseStartTime = undefined;
    gameState.totalPauseTime = 0;
    gameState.finalDeclared = false;
    gameState.winnerTeamId = undefined;
    gameState.winnerTime = undefined;
    gameState.winnerSubmissionId = undefined;
    await gameState.save();

  // Remove all level references from assignedLevels for all teams
  // Remove all levels from all teams' assignedLevels (guaranteed)
  await Team.updateMany({}, {
    $set: {
      assignedLevels: [],
      completed: [],
      currentIndex: 0,
      finalUnlocked: false,
      finalSubmitted: false,
      isWinner: false,
      totalTime: 0,
      startTime: undefined,
      finalSubmissionTime: undefined
    }
  });

  // No need for $pull; $set: { assignedLevels: [] } is sufficient

  // Delete all submissions for all levels
  await Submission.deleteMany({});

  // Randomly assign one level per unique order (excluding final) to each team
  const levels = await Level.find({ isFinal: false, isActive: true }).lean();
  if (levels.length > 0) {
    // Group levels by order (exclude final)
    const levelsByOrder = {};
    for (const lvl of levels) {
      if (!levelsByOrder[lvl.order]) levelsByOrder[lvl.order] = [];
      levelsByOrder[lvl.order].push(lvl);
    }
    const uniqueOrders = Object.keys(levelsByOrder).map(Number).sort((a, b) => a - b);
    const teams = await Team.find();
    for (const team of teams) {
      const assigned = [];
      for (const order of uniqueOrders) {
        const options = levelsByOrder[order];
        if (options && options.length > 0) {
          // Pick a random level for this order
          const randomIdx = Math.floor(Math.random() * options.length);
          assigned.push(options[randomIdx]._id);
        }
      }
      team.assignedLevels = assigned;
      team.currentIndex = 0;
      team.completed = [];
      team.finalUnlocked = false;
      team.finalSubmitted = false;
      team.isWinner = false;
      team.totalTime = 0;
      team.startTime = new Date(); // Set startTime for leaderboard timing
      await team.save();
    }
  }

  res.json({ message: 'Game state, team assignments, and submissions reset to setup and random levels assigned', gameState });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting game', error: error.message });
  }
};
// ...existing code...
module.exports.resetGame = resetGame;
const Team = require('../models/Team');
const Level = require('../models/Level');
const Submission = require('../models/Submission');
const Admin = require('../models/Admin');
const GameState = require('../models/GameState');
const { calculateRanking } = require('../utils/rankingLogic');
const path = require('path');
const mongoose = require('mongoose');

// Utility functions
const toNum = (v, fallback) => (v == null ? fallback : Number(v));
const isValidObjectId = (id) => mongoose.isValidObjectId(id);

// CSV utility with injection protection
const toCsv = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const header = Object.keys(rows[0]);
  const esc = v => {
    if (v == null) return '';
    const s = String(v);
    // Prevent CSV injection by prefixing dangerous characters
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [header.join(','), ...rows.map(r => header.map(k => esc(r[k])).join(','))].join('\n');
};

// Validation constants
const ALLOWED_SORT_FIELDS = new Set(['teamName', 'username', 'firstName', 'lastName', 'totalTime', 'createdAt']);

// Pure analytics functions (for reuse)
async function fetchTeamAnalytics() {
  return Team.aggregate([
    { 
      $lookup: { 
        from: 'submissions', 
        localField: '_id', 
        foreignField: 'teamId', 
        as: 'submissions' 
      } 
    },
    {
      $project: {
        teamName: 1,
        levelsCompleted: { $size: { $ifNull: ['$completed', []] } },
        finalSubmitted: 1,
        totalTime: 1,
        totalSubmissions: { $size: '$submissions' },
        avgScore: { $avg: '$submissions.similarityScore' }
      }
    },
    { $sort: { levelsCompleted: -1, totalTime: 1 } }
  ]);
}

async function fetchLevelAnalytics() {
  return Level.aggregate([
    { 
      $lookup: { 
        from: 'submissions', 
        localField: '_id', 
        foreignField: 'levelId', 
        as: 'submissions' 
      } 
    },
    {
      $project: {
        title: 1,
        difficulty: 1,
        order: 1,
        totalSubmissions: { $size: '$submissions' },
        completionRate: {
          $cond: [
            { $gt: [{ $size: '$submissions' }, 0] },
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $size: {
                        $filter: {
                          input: '$submissions',
                          as: 's',
                          cond: { $in: ['$$s.status', ['auto_approved', 'approved']] }
                        }
                      }
                    },
                    { $size: '$submissions' }
                  ]
                },
                100
              ]
            },
            0
          ]
        },
        avgScore: { $avg: '$submissions.similarityScore' }
      }
    },
    { $sort: { order: 1 } }
  ]);
}

async function fetchSubmissionAnalytics() {
  return Submission.aggregate([
    { 
      $lookup: { 
        from: 'levels', 
        localField: 'levelId', 
        foreignField: '_id', 
        as: 'level' 
      } 
    },
    {
      $group: {
        _id: {
          status: '$status',
          difficulty: { $arrayElemAt: ['$level.difficulty', 0] }
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$similarityScore' }
      }
    },
    { $sort: { '_id.status': 1, '_id.difficulty': 1 } }
  ]);
}

// Admin dashboard and overview
const getDashboard = async (req, res) => {
  try {
    const [
      totalTeams,
      activeTeams,
      totalLevels,
      activeLevels,
      totalSubmissions,
      pendingSubmissions,
      gameState
    ] = await Promise.all([
      Team.countDocuments(),
      Team.countDocuments({ 'completed.0': { $exists: true } }),
      Level.countDocuments(),
      Level.countDocuments({ isActive: true }),
      Submission.countDocuments(),
      Submission.countDocuments({ status: 'pending' }),
      GameState.getCurrentState()
    ]);

    const recentSubmissions = await Submission.find()
      .populate('teamId', 'teamName')
      .populate('levelId', 'title')
      .sort('-createdAt')
      .limit(10)
      .lean();

    // FIX: Use aggregation to properly sort by completed array length
    const topTeams = await Team.aggregate([
      {
        $project: {
          teamName: 1,
          completed: 1,
          finalSubmitted: 1,
          totalTime: 1,
          levelsCompleted: { $size: { $ifNull: ['$completed', []] } }
        }
      },
      { $sort: { levelsCompleted: -1, totalTime: 1 } },
      { $limit: 5 }
    ]);

  console.log('[getDashboard] gameState:', gameState);
  res.json({
      overview: {
        totalTeams,
        activeTeams,
        totalLevels,
        activeLevels,
        totalSubmissions,
        pendingSubmissions
      },
      gameState: {
        status: gameState?.gameStatus || 'not_started',
        startTime: gameState?.startTime,
        endTime: gameState?.endTime,
        winnerDeclared: gameState?.finalDeclared || false
      },
      recentSubmissions,
      topTeams: topTeams.map(team => ({
        teamName: team.teamName,
        levelsCompleted: team.levelsCompleted,
        finalSubmitted: team.finalSubmitted,
        totalTime: team.totalTime
      }))
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
};

const getGameOverview = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    const teams = await Team.find()
      .select('teamName completed finalSubmitted totalTime isWinner')
      .lean();
    
    const overview = {
      gameState,
      teamStats: {
        total: teams.length,
        active: teams.filter(t => t.completed && t.completed.length > 0).length,
        completed: teams.filter(t => t.finalSubmitted).length,
        winners: teams.filter(t => t.isWinner).length
      },
      levelStats: await Level.aggregate([
        {
          $lookup: {
            from: 'submissions',
            localField: '_id',
            foreignField: 'levelId',
            as: 'submissions'
          }
        },
        {
          $project: {
            title: 1,
            difficulty: 1,
            totalSubmissions: { $size: '$submissions' },
            completionRate: {
              $cond: {
                if: { $gt: [{ $size: '$submissions' }, 0] },
                then: {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $size: {
                            $filter: {
                              input: '$submissions',
                              as: 's',
                              cond: { $in: ['$$s.status', ['auto_approved', 'approved']] }
                            }
                          }
                        },
                        { $size: '$submissions' }
                      ]
                    },
                    100
                  ]
                },
                else: 0
              }
            }
          }
        }
      ])
    };

    res.json(overview);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching game overview', error: error.message });
  }
};

// Team management
const getAllTeams = async (req, res) => {
  try {
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = req.query.search;
    
    // Input validation for sort field
    const sortBy = ALLOWED_SORT_FIELDS.has(req.query.sortBy) ? req.query.sortBy : 'teamName';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    
    const query = {};
    if (search) {
      query.$or = [
        { teamName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = { [sortBy]: sortOrder };

    const teams = await Team.find(query)
      .select('-password')
      .sort(sortOptions)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const total = await Team.countDocuments(query);

    res.json({
      teams,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalTeams: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching teams', error: error.message });
  }
};

const getTeamDetails = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!isValidObjectId(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const team = await Team.findById(teamId).select('-password').lean();
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const submissions = await Submission.find({ teamId: team._id })
      .populate('levelId', 'title order difficulty')
      .sort('-createdAt')
      .lean();

    const assignedLevels = await Level.find({
      _id: { $in: team.assignedLevels }
    }).sort('order').lean();

    res.json({
      team,
      submissions,
      assignedLevels,
      progress: await Team.findById(teamId).then(t => t?.getProgress?.() || {})
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching team details', error: error.message });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!isValidObjectId(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.password;
    delete updates.assignedLevels;
    delete updates.completed;

    const team = await Team.findByIdAndUpdate(
      teamId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({
      message: 'Team updated successfully',
      team
    });

  } catch (error) {
    res.status(500).json({ message: 'Error updating team', error: error.message });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!isValidObjectId(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }
    
    // Check if team has submissions
    const submissionCount = await Submission.countDocuments({ teamId });
    if (submissionCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete team with existing submissions',
        submissionCount
      });
    }

    const team = await Team.findByIdAndDelete(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ message: 'Team deleted successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error deleting team', error: error.message });
  }
};

const resetTeamProgress = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!isValidObjectId(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Reset team progress
    team.currentIndex = 0;
    team.completed = [];
    team.finalUnlocked = false;
    team.finalSubmitted = false;
    team.isWinner = false;
    team.totalTime = 0;

    await team.save();

    // Delete team's submissions
    await Submission.deleteMany({ teamId });

    res.json({
      message: 'Team progress reset successfully',
      team: {
        _id: team._id,
        teamName: team.teamName,
        currentIndex: team.currentIndex,
        completed: team.completed,
        finalUnlocked: team.finalUnlocked,
        finalSubmitted: team.finalSubmitted
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error resetting team progress', error: error.message });
  }
};

const unlockTeamFinal = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!isValidObjectId(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    team.finalUnlocked = true;
    await team.save();

    res.json({
      message: 'Final level unlocked for team',
      team: {
        _id: team._id,
        teamName: team.teamName,
        finalUnlocked: team.finalUnlocked
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error unlocking final level', error: error.message });
  }
};

// Level management
const getAllLevels = async (req, res) => {
  try {
    const levels = await Level.find().sort('order').lean();
    res.json(levels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching levels', error: error.message });
  }
};

const getLevelDetails = async (req, res) => {
  try {
    const { levelId } = req.params;
    
    if (!isValidObjectId(levelId)) {
      return res.status(400).json({ message: 'Invalid level ID' });
    }

    const level = await Level.findById(levelId).lean();
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    // Get teams assigned to this level
    const assignedTeams = await Team.find({ assignedLevels: level._id })
      .select('teamName username')
      .lean();

    // Get submission stats for this level
    const submissionStats = await Submission.aggregate([
      { $match: { levelId: level._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          averageScore: { $avg: '$similarityScore' }
        }
      }
    ]);

    res.json({
      level,
      assignedTeams,
      submissionStats
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching level details', error: error.message });
  }
};

const createLevel = async (req, res) => {
  // Debug log: print incoming data for every create level request
  console.log('[createLevel] Incoming data:', {
    body: req.body,
    file: req.file
  });
  try {
    const {
      title, description, isFinal, order, difficulty, location,
      hints, timeLimit, maxAttempts, points
    } = req.body;

    if (!title || order == null) {
      console.error('[createLevel] 400: Missing title or order', { title, order });
      return res.status(400).json({ error: 'Title and order are required.' });
    }
    if (!req.file) {
      console.error('[createLevel] 400: Missing photo file', { file: req.file, body: req.body });
      return res.status(400).json({ error: 'Photo/image file is required.' });
    }

    // Always convert isFinal to boolean
    const isFinalBool = (isFinal === true || isFinal === 'true');

    // Check if this is a final level and if one already exists
    if (isFinalBool) {
      const existingFinal = await Level.findOne({ isFinal: true }).lean();
      if (existingFinal) {
        return res.status(400).json({ message: 'A final level already exists' });
      }
    }

    // FIX: Safe thumbnail path generation
    const fileName = req.file.filename;
    const photoUrl = `/uploads/${fileName}`;
    const thumbnailUrl = `/uploads/thumbnails/thumb_${fileName}`;

    const level = await Level.create({
      title,
      description,
      photoUrl,
      thumbnailUrl,
      isFinal: isFinalBool,
      order: Number(order) || 0,
      difficulty: difficulty || 'medium',
      location,
      hints: Array.isArray(hints) ? hints : (hints ? [hints] : []),
      timeLimit: timeLimit ? Number(timeLimit) : null,
      maxAttempts: maxAttempts != null ? Number(maxAttempts) : 3,
      points: points != null ? Number(points) : 100,
      phash: req.file.phash,
      createdBy: req.user.id
    });

    // FIX: Use bulk operation for better performance
    if (!level.isFinal) {
      await Team.updateMany(
        { assignedLevels: { $ne: level._id } },
        { $addToSet: { assignedLevels: level._id } }
      );
    }

    res.status(201).json({
      message: 'Level created successfully',
      level
    });

  } catch (error) {
    console.error('[createLevel] Error:', error);
    res.status(500).json({ error: 'Failed to create level', details: error.message });
  }
};

const updateLevel = async (req, res) => {
  try {
    const { levelId } = req.params;
    
    if (!isValidObjectId(levelId)) {
      return res.status(400).json({ message: 'Invalid level ID' });
    }

    const level = await Level.findById(levelId);
    
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    const updates = req.body;
    
    // Handle photo update if new photo is uploaded
    if (req.file) {
      const fileName = req.file.filename;
      updates.imageUrl = `/level/uploads/${fileName}`;
      updates.photoUrl = `/uploads/${fileName}`;
      updates.thumbnailUrl = `/uploads/thumbnails/thumb_${fileName}`;
      updates.phash = req.file.phash;
    }

    // Check final level constraint
    if (updates.isFinal && !level.isFinal) {
      const existingFinal = await Level.findOne({ isFinal: true, _id: { $ne: levelId } }).lean();
      if (existingFinal) {
        return res.status(400).json({ message: 'A final level already exists' });
      }
    }

    const updatedLevel = await Level.findByIdAndUpdate(
      levelId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Level updated successfully',
      level: updatedLevel
    });

  } catch (error) {
    res.status(500).json({ message: 'Error updating level', error: error.message });
  }
};

const deleteLevel = async (req, res) => {
  try {
    const { levelId } = req.params;
    
    if (!isValidObjectId(levelId)) {
      return res.status(400).json({ message: 'Invalid level ID' });
    }

    const level = await Level.findById(levelId).lean();
    
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    // Check if level is assigned to any teams
    const teamsWithLevel = await Team.find({ assignedLevels: levelId }).lean();
    if (teamsWithLevel.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete level that is assigned to teams',
        assignedTeams: teamsWithLevel.length
      });
    }

    // Check if there are submissions for this level
    const submissionsCount = await Submission.countDocuments({ levelId });
    if (submissionsCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete level with existing submissions',
        submissionsCount
      });
    }

    await Level.findByIdAndDelete(levelId);

    res.json({ message: 'Level deleted successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error deleting level', error: error.message });
  }
};

// Submission management
const getAllSubmissions = async (req, res) => {
  try {
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { status, teamId, levelId } = req.query;
    
    const query = {};
    if (status) {
      // If status is 'pending', include both 'pending' and 'processing'
      if (status === 'pending') {
        query.status = { $in: ['pending', 'processing'] };
      } else {
        query.status = status;
      }
    }
    if (teamId && isValidObjectId(teamId)) query.teamId = teamId;
    if (levelId && isValidObjectId(levelId)) query.levelId = levelId;

    const submissions = await Submission.find(query)
      .populate('teamId', 'teamName')
      .populate('levelId', 'title order')
      .populate('approvedBy', 'username')
      .sort('-createdAt')
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const total = await Submission.countDocuments(query);

    res.json({
      submissions,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalSubmissions: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching submissions', error: error.message });
  }
};

const getSubmissionDetails = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    if (!isValidObjectId(submissionId)) {
      return res.status(400).json({ message: 'Invalid submission ID' });
    }

    const submission = await Submission.findById(submissionId)
      .populate('teamId', 'teamName username')
      .populate('levelId', 'title order difficulty thumbnailUrl photoUrl')
      .populate('approvedBy', 'username')
      .lean();

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json(submission);

  } catch (error) {
    res.status(500).json({ message: 'Error fetching submission details', error: error.message });
  }
};

const approveSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    if (!isValidObjectId(submissionId)) {
      return res.status(400).json({ message: 'Invalid submission ID' });
    }

    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    await submission.approve(req.user.id);

    // Mark level as completed for the team if not already completed
    const Team = require('../models/Team');
    const team = await Team.findById(submission.teamId);
    if (team) {
      const level = await require('../models/Level').findById(submission.levelId);
      if (level && level.isFinal) {
        // If this is the final level, mark finalSubmitted and set totalTime
        team.finalSubmitted = true;
        team.finalSubmissionTime = new Date();
        // Add to completed array for leaderboard and time logic
        team.completed.push({
          levelId: level._id,
          completedAt: team.finalSubmissionTime,
          attempts: 1,
          bestScore: submission.similarityScore,
          timeTaken: team.completed.length > 0 ? Math.floor((team.finalSubmissionTime - new Date(team.completed[team.completed.length - 1].completedAt)) / 1000) : 0
        });
        if (team.startTime) {
          team.totalTime = Math.floor((Date.now() - new Date(team.startTime).getTime()) / 1000);
        }
      } else {
        team.completeLevel(submission.levelId, submission.similarityScore);
      }
      await team.save();
    }

    res.json({
      message: 'Submission approved successfully',
      submission
    });

  } catch (error) {
    res.status(500).json({ message: 'Error approving submission', error: error.message });
  }
};

const rejectSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { rejectionReason } = req.body;

    if (!isValidObjectId(submissionId)) {
      return res.status(400).json({ message: 'Invalid submission ID' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    await submission.reject(req.user.id, rejectionReason);

    res.json({
      message: 'Submission rejected successfully',
      submission
    });

  } catch (error) {
    res.status(500).json({ message: 'Error rejecting submission', error: error.message });
  }
};

const reprocessSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    if (!isValidObjectId(submissionId)) {
      return res.status(400).json({ message: 'Invalid submission ID' });
    }

    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const level = await Level.findById(submission.levelId);
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    try {
      // Re-verify submission
      const verificationResult = await level.matchesImage(submission.fileUrl);
      
      if (verificationResult.matches) {
        await submission.autoApprove();
        res.json({
          message: 'Submission auto-approved after reprocessing',
          submission,
          verificationResult
        });
      } else {
        await submission.autoReject();
        res.json({
          message: 'Submission auto-rejected after reprocessing',
          submission,
          verificationResult
        });
      }
    } catch (verificationError) {
      console.error('[reprocessSubmission] Verification failed:', verificationError);
      res.status(500).json({
        message: 'Error during reprocessing verification',
        error: verificationError.message
      });
    }

  } catch (error) {
    res.status(500).json({ message: 'Error reprocessing submission', error: error.message });
  }
};

// Game state management
const getGameState = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    res.json(gameState);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching game state', error: error.message });
  }
};

const startGame = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    if (!gameState) {
      console.error('[startGame] No gameState found');
      return res.status(500).json({ message: 'No game state found' });
    }
    if (gameState.gameStatus === 'active') {
      return res.status(400).json({ message: 'Game is already active' });
    }

    const started = await gameState.startGame();
    if (started) {
      await gameState.save();
    }
    res.json({ message: 'Game started successfully', gameState });
  } catch (error) {
    console.error('[startGame] Error:', error);
    res.status(500).json({ message: 'Error starting game', error: error.message, stack: error.stack });
  }
};

const pauseGame = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    if (!gameState) {
      console.error('[pauseGame] No gameState found');
      return res.status(500).json({ message: 'No game state found' });
    }
    if (gameState.gameStatus !== 'active') {
      return res.status(400).json({ message: 'Game is not active' });
    }

    const paused = await gameState.pauseGame();
    if (paused) {
      await gameState.save();
    }
    res.json({ message: 'Game paused successfully', gameState });
  } catch (error) {
    console.error('[pauseGame] Error:', error);
    res.status(500).json({ message: 'Error pausing game', error: error.message, stack: error.stack });
  }
};

const resumeGame = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    if (!gameState) {
      console.error('[resumeGame] No gameState found');
      return res.status(500).json({ message: 'No game state found' });
    }
    if (gameState.gameStatus !== 'paused') {
      return res.status(400).json({ message: 'Game is not paused' });
    }

    const resumed = await gameState.resumeGame();
    if (resumed) {
      await gameState.save();
    }
    res.json({ message: 'Game resumed successfully', gameState });
  } catch (error) {
    console.error('[resumeGame] Error:', error);
    res.status(500).json({ message: 'Error resuming game', error: error.message, stack: error.stack });
  }
};

const endGame = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    if (!gameState) {
      console.error('[endGame] No gameState found');
      return res.status(500).json({ message: 'No game state found' });
    }
    if (gameState.gameStatus === 'ended') {
      return res.status(400).json({ message: 'Game is already ended' });
    }

    const ended = await gameState.endGame();
    if (ended) {
      await gameState.save();
    }
    res.json({ message: 'Game ended successfully', gameState });
  } catch (error) {
    console.error('[endGame] Error:', error);
    res.status(500).json({ message: 'Error ending game', error: error.message, stack: error.stack });
  }
};

const declareWinner = async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' });
    }

    if (!isValidObjectId(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const gameState = await GameState.getCurrentState();
    if (gameState.finalDeclared) {
      return res.status(400).json({ message: 'Winner already declared' });
    }

    await gameState.declareWinner(teamId);
    
    // Also mark the team as winner for consistency
    team.isWinner = true;
    await team.save();

    res.json({ message: 'Winner declared successfully', winner: team.teamName });
  } catch (error) {
    res.status(500).json({ message: 'Error declaring winner', error: error.message });
  }
};

// Leaderboard and rankings
const getAdminLeaderboard = async (req, res) => {
  try {
    const leaderboard = await calculateRanking();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
};

// FIX: Proper CSV export with injection protection
const exportLeaderboard = async (req, res) => {
  try {
    const leaderboard = await calculateRanking();

    const rows = leaderboard.map((entry, idx) => ({
      Rank: entry.rank ?? (idx + 1),
      TeamName: entry.teamName,
      LevelsCompleted: entry.levelsCompleted,
      FinalSubmitted: entry.finalSubmitted,
      TotalTime: entry.totalTime,
      AverageScore: entry.averageScore
    }));

    const csv = toCsv(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leaderboard.csv"');
    res.send(csv);

  } catch (error) {
    res.status(500).json({ message: 'Error exporting leaderboard', error: error.message });
  }
};

const recalculateLeaderboard = async (req, res) => {
  try {
    // This would trigger a background job to recalculate all rankings
    // For now, just return the current leaderboard
    const leaderboard = await calculateRanking();
    
    res.json({
      message: 'Leaderboard recalculation initiated',
      leaderboard
    });

  } catch (error) {
    res.status(500).json({ message: 'Error recalculating leaderboard', error: error.message });
  }
};

// Analytics and reporting
const getAnalytics = async (req, res) => {
  try {
    const [
      teamStats,
      levelStats,
      submissionStats,
      gameStats
    ] = await Promise.all([
      Team.aggregate([
        {
          $project: {
            levelsCompleted: { $size: { $ifNull: ['$completed', []] } },
            finalSubmitted: '$finalSubmitted',
            totalTime: '$totalTime'
          }
        },
        {
          $group: {
            _id: null,
            avgLevelsCompleted: { $avg: '$levelsCompleted' },
            teamsWithFinal: { $sum: { $cond: ['$finalSubmitted', 1, 0] } },
            avgTotalTime: { $avg: '$totalTime' }
          }
        }
      ]),
      Level.aggregate([
        {
          $lookup: {
            from: 'submissions',
            localField: '_id',
            foreignField: 'levelId',
            as: 'submissions'
          }
        },
        {
          $group: {
            _id: '$difficulty',
            levelCount: { $sum: 1 },
            avgCompletionRate: {
              $avg: {
                $cond: {
                  if: { $gt: [{ $size: '$submissions' }, 0] },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $size: {
                              $filter: {
                                input: '$submissions',
                                as: 's',
                                cond: { $in: ['$s.status', ['auto_approved', 'approved']] }
                              }
                            }
                          },
                          { $size: '$submissions' }
                        ]
                      },
                      100
                    ]
                  },
                  else: 0
                }
              }
            }
          }
        }
      ]),
      Submission.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgScore: { $avg: '$similarityScore' }
          }
        }
      ]),
      GameState.getCurrentState()
    ]);

    res.json({
      teamStats: teamStats[0] || {},
      levelStats,
      submissionStats,
      gameStats
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};

// FIX: Use helper functions that return data instead of calling handlers
const getTeamAnalytics = async (req, res) => {
  try {
    const analytics = await fetchTeamAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching team analytics', error: error.message });
  }
};

const getLevelAnalytics = async (req, res) => {
  try {
    const analytics = await fetchLevelAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching level analytics', error: error.message });
  }
};

const getSubmissionAnalytics = async (req, res) => {
  try {
    const analytics = await fetchSubmissionAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submission analytics', error: error.message });
  }
};

// FIX: Proper report generation using helper functions
const generateReports = async (req, res) => {
  try {
    const { reportType, format = 'json' } = req.query;

    let reportData;
    if (reportType === 'team_performance') {
      reportData = await fetchTeamAnalytics();
    } else if (reportType === 'level_completion') {
      reportData = await fetchLevelAnalytics();
    } else if (reportType === 'submission_analysis') {
      reportData = await fetchSubmissionAnalytics();
    } else {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    if (format === 'csv') {
      // Flatten nested _id objects for CSV export
      const flattenedData = reportData.map(d => {
        if (d._id && typeof d._id === 'object') {
          // Flatten _id object into top-level fields
          return { ...d, ...d._id, _id: undefined };
        }
        return d;
      });

      const csv = toCsv(flattenedData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report.csv"`);
      return res.send(csv);
    }

    // Default: return JSON
    res.json(reportData);
  } catch (error) {
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
};

// System settings and configuration
const getSystemSettings = async (req, res) => {
  try {
    const settings = {
      thresholds: {
        phash: toNum(process.env.PHASH_THRESHOLD, 0.95),
        orb: toNum(process.env.ORB_THRESHOLD, 0.8),
        embedding: toNum(process.env.EMBEDDING_THRESHOLD, 0.9)
      },
      limits: {
        maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
        maxAttempts: 3,
        rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '15m',
        rateLimitMax: toNum(process.env.RATE_LIMIT_MAX, 100)
      },
      game: {
        assignmentMode: 'random', // or 'fixed'
        autoApprove: true,
        requireAdminApproval: false
      }
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system settings', error: error.message });
  }
};

const updateSystemSettings = async (req, res) => {
  try {
    const { thresholds, limits, game } = req.body;
    
    // Update environment variables (this would typically be done through a config service)
    // For now, just return the updated settings
    
    const updatedSettings = {
      thresholds: {
        phash: toNum(thresholds?.phash, toNum(process.env.PHASH_THRESHOLD, 0.85)),
        orb: toNum(thresholds?.orb, toNum(process.env.ORB_THRESHOLD, 0.7)),
        embedding: toNum(thresholds?.embedding, toNum(process.env.EMBEDDING_THRESHOLD, 0.8))
      },
      limits: {
        maxFileSize: limits?.maxFileSize || process.env.MAX_FILE_SIZE || '10MB',
        maxAttempts: toNum(limits?.maxAttempts, 3),
        rateLimitWindow: limits?.rateLimitWindow || process.env.RATE_LIMIT_WINDOW || '15m',
        rateLimitMax: toNum(limits?.rateLimitMax, toNum(process.env.RATE_LIMIT_MAX, 100))
      },
      game: {
        assignmentMode: game?.assignmentMode || 'random',
        autoApprove: game?.autoApprove !== undefined ? game.autoApprove : true,
        requireAdminApproval: game?.requireAdminApproval || false
      }
    };

    res.json({
      message: 'System settings updated successfully',
      settings: updatedSettings
    });

  } catch (error) {
    res.status(500).json({ message: 'Error updating system settings', error: error.message });
  }
};

const getSystemLogs = async (req, res) => {
  try {
    // This would typically fetch logs from a logging service
    // For now, return a placeholder
    res.json({
      message: 'System logs endpoint - implement logging service integration',
      logs: []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system logs', error: error.message });
  }
};

const toggleMaintenanceMode = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    // This would typically update a maintenance mode setting
    // For now, return a placeholder
    res.json({
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      maintenanceMode: enabled
    });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling maintenance mode', error: error.message });
  }
};

// Admin user management
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort('username').lean();
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admins', error: error.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, permissions } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    
    const existingAdmin = await Admin.findOne({ 
      $or: [{ username }, { email }] 
    }).lean();
    
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const admin = new Admin({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'admin',
      permissions: permissions || []
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: admin.toObject({ hide: 'password' })
    });

  } catch (error) {
    res.status(500).json({ message: 'Error creating admin', error: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    if (!isValidObjectId(adminId)) {
      return res.status(400).json({ message: 'Invalid admin ID' });
    }
    
    const updates = req.body;
    
    // Remove sensitive fields
    delete updates.password;
    delete updates.username; // Username shouldn't be changed

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      message: 'Admin updated successfully',
      admin
    });

  } catch (error) {
    res.status(500).json({ message: 'Error updating admin', error: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    if (!isValidObjectId(adminId)) {
      return res.status(400).json({ message: 'Invalid admin ID' });
    }
    
    if (adminId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const admin = await Admin.findByIdAndDelete(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({ message: 'Admin deleted successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error deleting admin', error: error.message });
  }
};

module.exports = {
  getDashboard,
  getGameOverview,
  getAllTeams,
  getTeamDetails,
  updateTeam,
  deleteTeam,
  resetTeamProgress,
  unlockTeamFinal,
  getAllLevels,
  getLevelDetails,
  createLevel,
  updateLevel,
  deleteLevel,
  getAllSubmissions,
  getSubmissionDetails,
  approveSubmission,
  rejectSubmission,
  reprocessSubmission,
  getGameState,
  startGame,
  pauseGame,
  resumeGame,
  endGame,
  declareWinner,
  getAdminLeaderboard,
  exportLeaderboard,
  recalculateLeaderboard,
  getAnalytics,
  getTeamAnalytics,
  getLevelAnalytics,
  getSubmissionAnalytics,
  generateReports,
  getSystemSettings,
  updateSystemSettings,
  getSystemLogs,
  toggleMaintenanceMode,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  resetGame,
  initGameState
};