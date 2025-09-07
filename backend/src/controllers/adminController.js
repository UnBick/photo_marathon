const Team = require('../models/Team');
const Level = require('../models/Level');
const Submission = require('../models/Submission');
const Admin = require('../models/Admin');
const GameState = require('../models/GameState');
const { calculateRanking } = require('../utils/rankingLogic');

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
      .limit(10);

    const topTeams = await Team.find()
      .select('teamName completed finalSubmitted totalTime')
      .sort({ 'completed.length': -1, totalTime: 1 })
      .limit(5);

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
        levelsCompleted: team.completed.length,
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
    const teams = await Team.find().select('teamName completed finalSubmitted totalTime isWinner');
    
    const overview = {
      gameState,
      teamStats: {
        total: teams.length,
        active: teams.filter(t => t.completed.length > 0).length,
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
                              cond: { $in: ['$$this.status', ['auto_approved', 'approved']] }
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
    const { page = 1, limit = 20, search, sortBy = 'teamName', sortOrder = 'asc' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { teamName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const teams = await Team.find(query)
      .select('-password')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Team.countDocuments(query);

    res.json({
      teams,
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(total / limit),
        totalTeams: total,
        hasNext: page * 1 < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching teams', error: error.message });
  }
};

const getTeamDetails = async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).select('-password');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const submissions = await Submission.find({ teamId: team._id })
      .populate('levelId', 'title order difficulty')
      .sort('-createdAt');

    const assignedLevels = await Level.find({
      _id: { $in: team.assignedLevels }
    }).sort('order');

    res.json({
      team,
      submissions,
      assignedLevels,
      progress: await team.getProgress()
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching team details', error: error.message });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
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
    const levels = await Level.find().sort('order');
    res.json(levels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching levels', error: error.message });
  }
};

const getLevelDetails = async (req, res) => {
  try {
    const level = await Level.findById(req.params.levelId);
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    // Get teams assigned to this level
    const assignedTeams = await Team.find({ assignedLevels: level._id })
      .select('teamName username');

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
  try {
    const {
      title,
      description,
      isFinal,
      order,
      difficulty,
      location,
      hints,
      timeLimit,
      maxAttempts,
      points
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Level photo is required' });
    }

    // Check if this is a final level and if one already exists
    if (isFinal) {
      const existingFinalLevel = await Level.findOne({ isFinal: true });
      if (existingFinalLevel) {
        return res.status(400).json({ message: 'A final level already exists' });
      }
    }

    const level = new Level({
      title,
      description,
      photoUrl: req.file.path,
      thumbnailUrl: req.file.path.replace('.jpg', '_thumb.jpg'),
      isFinal: isFinal || false,
      order: order || 0,
      difficulty: difficulty || 'medium',
      location,
      hints: hints || [],
      timeLimit: timeLimit || null,
      maxAttempts: maxAttempts || 3,
      points: points || 100,
      phash: req.file.phash,
      createdBy: req.user.id
    });

    await level.save();

    // Assign the new level to all existing teams if it's not a final level
    if (!isFinal) {
      await Team.updateMany(
        {},
        { $addToSet: { assignedLevels: level._id } } // Add level ID to assignedLevels array
      );
    }

    res.status(201).json({
      message: 'Level created successfully',
      level
    });

  } catch (error) {
    res.status(500).json({ message: 'Error creating level', error: error.message });
  }
};

const updateLevel = async (req, res) => {
  try {
    const { levelId } = req.params;
    const level = await Level.findById(levelId);
    
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    const updates = req.body;
    
    // Handle photo update if new photo is uploaded
    if (req.file) {
      updates.photoUrl = req.file.path;
      updates.thumbnailUrl = req.file.path.replace('.jpg', '_thumb.jpg');
      updates.phash = req.file.phash;
    }

    // Check final level constraint
    if (updates.isFinal && !level.isFinal) {
      const existingFinal = await Level.findOne({ isFinal: true, _id: { $ne: levelId } });
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
    const level = await Level.findById(levelId);
    
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    // Check if level is assigned to any teams
    const teamsWithLevel = await Team.find({ assignedLevels: levelId });
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
    const { page = 1, limit = 20, status, teamId, levelId } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (teamId) query.teamId = teamId;
    if (levelId) query.levelId = levelId;

    const submissions = await Submission.find(query)
      .populate('teamId', 'teamName')
      .populate('levelId', 'title order')
      .populate('approvedBy', 'username')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Submission.countDocuments(query);

    res.json({
      submissions,
      pagination: {
        currentPage: page * 1,
        totalPages: Math.ceil(total / limit),
        totalSubmissions: total,
        hasNext: page * 1 < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching submissions', error: error.message });
  }
};

const getSubmissionDetails = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId)
      .populate('teamId', 'teamName username')
      .populate('levelId', 'title order difficulty')
      .populate('approvedBy', 'username');

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
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    await submission.approve(req.user.id);

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
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const level = await Level.findById(submission.levelId);
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

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
    if (gameState && gameState.gameStatus === 'active') {
      return res.status(400).json({ message: 'Game is already active' });
    }

    // Set game state to active
    const updatedGameState = await GameState.findOneAndUpdate(
      { _id: 'global' },
      { gameStatus: 'active', startTime: new Date() },
      { new: true, upsert: true }
    );

    // Fetch all active levels
    const activeLevels = await Level.find({ isActive: true });
    const levelIds = activeLevels.map(level => level._id);

    // Assign levels to teams based on assignment mode
    if (gameState.assignmentMode === 'fixed') {
      await Team.updateMany(
        {},
        { $addToSet: { assignedLevels: { $each: levelIds } } } // Add all active levels to assignedLevels
      );
    } else if (gameState.assignmentMode === 'random') {
      const teams = await Team.find();
      for (const team of teams) {
        const randomLevels = levelIds.sort(() => 0.5 - Math.random()).slice(0, gameState.maxLevels || levelIds.length);
        team.assignedLevels = randomLevels;
        await team.save();
      }
    }

    res.json({
      message: 'Game started successfully',
      gameState: updatedGameState
    });
  } catch (error) {
    res.status(500).json({ message: 'Error starting game', error: error.message });
  }
};

const pauseGame = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    if (gameState.gameStatus !== 'active') {
      return res.status(400).json({ message: 'Game is not active' });
    }

    await gameState.pauseGame();
    res.json({ message: 'Game paused successfully', gameState });
  } catch (error) {
    res.status(500).json({ message: 'Error pausing game', error: error.message });
  }
};

const resumeGame = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    if (gameState.gameStatus !== 'paused') {
      return res.status(400).json({ message: 'Game is not paused' });
    }

    await gameState.resumeGame();
    res.json({ message: 'Game resumed successfully', gameState });
  } catch (error) {
    res.status(500).json({ message: 'Error resuming game', error: error.message });
  }
};

const endGame = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    if (gameState.gameStatus === 'ended') {
      return res.status(400).json({ message: 'Game is already ended' });
    }

    await gameState.endGame();
    res.json({ message: 'Game ended successfully', gameState });
  } catch (error) {
    res.status(500).json({ message: 'Error ending game', error: error.message });
  }
};

const declareWinner = async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' });
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

const exportLeaderboard = async (req, res) => {
  try {
    const leaderboard = await calculateRanking();
    
    // Convert to CSV format
    const csvData = leaderboard.map((entry, index) => {
      return `${index + 1},${entry.teamName},${entry.levelsCompleted},${entry.finalSubmitted},${entry.totalTime},${entry.averageScore},${entry.rank}`;
    });
    
    const csvHeader = 'Rank,Team Name,Levels Completed,Final Submitted,Total Time,Average Score,Position\n';
    const csvContent = csvHeader + csvData.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leaderboard.csv"');
    res.send(csvContent);

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
            levelsCompleted: { $size: '$completed' },
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
                                cond: { $in: ['$$this.status', ['auto_approved', 'approved']] }
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

const getTeamAnalytics = async (req, res) => {
  try {
    const analytics = await Team.aggregate([
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
          levelsCompleted: { $size: '$completed' },
          finalSubmitted: 1,
          totalTime: 1,
          totalSubmissions: { $size: '$submissions' },
          avgScore: { $avg: '$submissions.similarityScore' }
        }
      },
      { $sort: { levelsCompleted: -1, totalTime: 1 } }
    ]);

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching team analytics', error: error.message });
  }
};

const getLevelAnalytics = async (req, res) => {
  try {
    const analytics = await Level.aggregate([
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
                            cond: { $in: ['$$this.status', ['auto_approved', 'approved']] }
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
          },
          avgScore: { $avg: '$submissions.similarityScore' }
        }
      },
      { $sort: { order: 1 } }
    ]);

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching level analytics', error: error.message });
  }
};

const getSubmissionAnalytics = async (req, res) => {
  try {
    const analytics = await Submission.aggregate([
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'team'
        }
      },
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

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submission analytics', error: error.message });
  }
};

const generateReports = async (req, res) => {
  try {
    const { reportType, format = 'json' } = req.query;
    
    let reportData;
    switch (reportType) {
      case 'team_performance':
        reportData = await getTeamAnalytics(req, res);
        break;
      case 'level_completion':
        reportData = await getLevelAnalytics(req, res);
        break;
      case 'submission_analysis':
        reportData = await getSubmissionAnalytics(req, res);
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = reportData.map(entry => {
        return Object.values(entry).join(',');
      });
      
      const csvHeader = Object.keys(reportData[0]).join(',') + '\n';
      const csvContent = csvHeader + csvData.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report.csv"`);
      res.send(csvContent);
    } else {
      res.json(reportData);
    }

  } catch (error) {
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
};

// System settings and configuration
const getSystemSettings = async (req, res) => {
  try {
    const settings = {
      thresholds: {
        phash: process.env.PHASH_THRESHOLD || 0.85,
        orb: process.env.ORB_THRESHOLD || 0.7,
        embedding: process.env.EMBEDDING_THRESHOLD || 0.8
      },
      limits: {
        maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
        maxAttempts: 3,
        rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '15m',
        rateLimitMax: process.env.RATE_LIMIT_MAX || 100
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
        phash: thresholds?.phash || process.env.PHASH_THRESHOLD || 0.85,
        orb: thresholds?.orb || process.env.ORB_THRESHOLD || 0.7,
        embedding: thresholds?.embedding || process.env.EMBEDDING_THRESHOLD || 0.8
      },
      limits: {
        maxFileSize: limits?.maxFileSize || process.env.MAX_FILE_SIZE || '10MB',
        maxAttempts: limits?.maxAttempts || 3,
        rateLimitWindow: limits?.rateLimitWindow || process.env.RATE_LIMIT_WINDOW || '15m',
        rateLimitMax: limits?.rateLimitMax || 100
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
    const admins = await Admin.find().select('-password').sort('username');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admins', error: error.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, permissions } = req.body;
    
    const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
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
  deleteAdmin
};
