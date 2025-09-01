const Team = require('../models/Team');
const Level = require('../models/Level');
const Submission = require('../models/Submission');
const GameState = require('../models/GameState');
const { calculateRanking } = require('../utils/rankingLogic');

// Team profile and progress
const getTeamProfile = async (req, res) => {
  try {
    const team = await Team.findById(req.user.id).select('-password');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching team profile', error: error.message });
  }
};

const updateTeamProfile = async (req, res) => {
  try {
    const { teamName, firstName, lastName, email } = req.body;
    const updates = {};
    
    if (teamName) updates.teamName = teamName;
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;

    const team = await Team.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Error updating team profile', error: error.message });
  }
};

const getTeamProgress = async (req, res) => {
  try {
    const team = await Team.findById(req.user.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const progress = await team.getProgress();
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching team progress', error: error.message });
  }
};

// Level management
const getAssignedLevels = async (req, res) => {
  try {
    const team = await Team.findById(req.user.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const levels = await Level.find({
      _id: { $in: team.assignedLevels },
      isActive: true
    }).sort('order');

    res.json(levels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned levels', error: error.message });
  }
};

const getLevelDetails = async (req, res) => {
  try {
    const { levelId } = req.params;
    const team = await Team.findById(req.user.id);
    
    if (!team.assignedLevels.includes(levelId)) {
      return res.status(403).json({ message: 'Level not assigned to team' });
    }

    const level = await Level.findById(levelId);
    if (!level || !level.isActive) {
      return res.status(404).json({ message: 'Level not found or inactive' });
    }

    // Remove sensitive data for teams
    const safeLevel = {
      _id: level._id,
      title: level.title,
      description: level.description,
      thumbnailUrl: level.thumbnailUrl,
      isFinal: level.isFinal,
      order: level.order,
      difficulty: level.difficulty,
      location: level.location,
      hints: level.hints,
      timeLimit: level.timeLimit,
      maxAttempts: level.maxAttempts,
      points: level.points
    };

    res.json(safeLevel);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching level details', error: error.message });
  }
};

const getCurrentLevel = async (req, res) => {
  try {
    const team = await Team.findById(req.user.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const currentLevel = await Level.findById(team.assignedLevels[team.currentIndex]);
    if (!currentLevel) {
      // If the team has unlocked the final, check if it's completed
      if (team.finalUnlocked && team.finalSubmitted) {
        return res.json({
          finalCompleted: true,
          message: 'Final level completed! Check out your ranking.'
        });
      }
      return res.status(404).json({ message: 'Current level not found' });
    }

    // If the current level is the final and it's completed, return a special flag
    if (currentLevel.isFinal && team.finalSubmitted) {
      return res.json({
        ...currentLevel.toObject(),
        finalCompleted: true,
        message: 'Final level completed! Check out your ranking.'
      });
    }

    res.json(currentLevel);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current level', error: error.message });
  }
};

// Photo submissions
const submitPhoto = async (req, res) => {
  try {
    const { levelId } = req.params;
    const team = await Team.findById(req.user.id);
    
    if (!team.assignedLevels.includes(levelId)) {
      return res.status(403).json({ message: 'Level not assigned to team' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    const level = await Level.findById(levelId);
    if (!level || !level.isActive) {
      return res.status(404).json({ message: 'Level not found or inactive' });
    }

    // Check if team has already completed this level
    const existingCompletion = team.completed.find(c => c.levelId.toString() === levelId);
    if (existingCompletion) {
      return res.status(400).json({ message: 'Level already completed' });
    }

    // Check for existing pending submission for this team/level
    const existingPending = await Submission.findOne({
      teamId: team._id,
      levelId,
      status: 'pending'
    });

    // Auto-verify submission
    const verificationResult = await level.matchesImage(req.file.phash);

    if (verificationResult.matches && verificationResult.score >= 0.8) {
      // If there is a pending submission, update it to auto_approved
      let submission;
      if (existingPending) {
        existingPending.status = 'auto_approved';
        existingPending.similarityScore = verificationResult.score;
        existingPending.phash = req.file.phash;
        await existingPending.save();
        submission = existingPending;
      } else {
        submission = new Submission({
          teamId: team._id,
          levelId,
          fileUrl: req.file.path,
          thumbnailUrl: req.file.path.replace('.jpg', '_thumb.jpg'),
          phash: req.file.phash,
          exif: req.file.exif,
          attemptNumber: (team.completed.filter(c => c.levelId.toString() === levelId).length || 0) + 1,
          status: 'auto_approved',
          similarityScore: verificationResult.score
        });
        await submission.save();
      }
      console.log('[submitPhoto] Auto-approved submission:', submission._id);
      // Complete level for team
      await team.completeLevel(levelId, verificationResult.score);
      await team.save();
      return res.json({
        message: 'Level completed!',
        submission,
        completed: true
      });
    } else {
      // If not a match, create a new pending submission
      const submission = new Submission({
        teamId: team._id,
        levelId,
        fileUrl: req.file.path,
        thumbnailUrl: req.file.path.replace('.jpg', '_thumb.jpg'),
        phash: req.file.phash,
        exif: req.file.exif,
        attemptNumber: (team.completed.filter(c => c.levelId.toString() === levelId).length || 0) + 1,
        status: 'pending',
        similarityScore: verificationResult.score
      });
      await submission.save();
      console.log('[submitPhoto] Submission set to pending:', submission._id);
      await team.save();
      return res.json({
        message: 'Photo submitted for review',
        submission,
        completed: false
      });
    }

  } catch (error) {
    res.status(500).json({ message: 'Error submitting photo', error: error.message });
  }
};

const getTeamSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ teamId: req.user.id })
      .populate('levelId', 'title order')
      .sort('-createdAt');
    if (!Array.isArray(submissions)) {
      console.error('[getTeamSubmissions] Submissions is not an array:', submissions);
      return res.json([]);
    }
    res.json(submissions);
  } catch (error) {
    console.error('[getTeamSubmissions] Error:', error);
    res.json([]);
  }
};

const getSubmissionDetails = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId)
      .populate('levelId', 'title order')
      .populate('approvedBy', 'username');

    if (!submission || submission.teamId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submission details', error: error.message });
  }
};

// Final level access
const checkFinalAccess = async (req, res) => {
  try {
    const team = await Team.findById(req.user.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const gameState = await GameState.getCurrentState();
    if (!gameState || gameState.gameStatus !== 'active') {
      return res.status(400).json({ message: 'Game is not active' });
    }

    // Check if team has completed all regular levels
    const regularLevels = team.assignedLevels.filter(levelId => 
      !team.completed.find(c => c.levelId.toString() === levelId.toString())
    );

    if (regularLevels.length > 0) {
      return res.json({
        canAccess: false,
        remainingLevels: regularLevels.length,
        message: 'Complete all regular levels first'
      });
    }

    // Unlock final level if not already unlocked and not already submitted
    if (!team.finalUnlocked && !team.finalSubmitted) {
      team.finalUnlocked = true;
      await team.save();
    }

    // If final already submitted, do not show as unlocked
    if (team.finalSubmitted) {
      return res.json({
        canAccess: false,
        finalUnlocked: false,
        finalSubmitted: true,
        message: 'Final level already completed.'
      });
    }

    res.json({
      canAccess: true,
      finalUnlocked: team.finalUnlocked,
      finalSubmitted: team.finalSubmitted
    });

  } catch (error) {
    res.status(500).json({ message: 'Error checking final access', error: error.message });
  }
};

const submitFinal = async (req, res) => {
  try {
    const team = await Team.findById(req.user.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (!team.finalUnlocked) {
      return res.status(403).json({ message: 'Final level not unlocked' });
    }

    if (team.finalSubmitted) {
      return res.status(400).json({ message: 'Final submission already made' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    const finalLevel = await Level.findOne({ isFinal: true, isActive: true });
    if (!finalLevel) {
      return res.status(404).json({ message: 'Final level not found' });
    }

    // Create final submission
    const submission = new Submission({
      teamId: team._id,
      levelId: finalLevel._id,
      fileUrl: req.file.path,
      thumbnailUrl: req.file.path.replace('.jpg', '_thumb.jpg'),
      phash: req.file.phash,
      exif: req.file.exif,
      isFinalSubmission: true,
      attemptNumber: 1
    });

    // Auto-verify final submission
    const verificationResult = await finalLevel.matchesImage(req.file.phash);
    submission.similarityScore = verificationResult.score;
    console.log('[submitFinal] verificationResult:', verificationResult);
    // Only auto-approve if matches AND score >= 0.8

    if (verificationResult.matches && verificationResult.score >= 0.8) {
      submission.status = 'auto_approved';
      console.log('[submitFinal] Auto-approved final submission:', submission._id);
      // Mark team as final submitter
      team.finalSubmitted = true;
      team.finalSubmissionTime = new Date();
      // Add to completed array for leaderboard and time logic
      team.completed.push({
        levelId: finalLevel._id,
        completedAt: team.finalSubmissionTime,
        attempts: 1,
        bestScore: verificationResult.score,
        timeTaken: team.completed.length > 0 ? Math.floor((team.finalSubmissionTime - new Date(team.completed[team.completed.length - 1].completedAt)) / 1000) : 0
      });
      // Set totalTime for leaderboard
      if (team.startTime) {
        team.totalTime = Math.floor((Date.now() - new Date(team.startTime).getTime()) / 1000);
      }
    } else {
      submission.status = 'pending';
      console.log('[submitFinal] Final submission set to pending:', submission._id);
    }

    await submission.save();
    await team.save();

    res.json({
      message: verificationResult.matches ? 'Final submission successful!' : 'Final photo submitted for review',
      submission,
      completed: verificationResult.matches,
      totalTime: team.totalTime
    });

  } catch (error) {
    res.status(500).json({ message: 'Error submitting final photo', error: error.message });
  }
};

// Game status and leaderboard
const getGameStatus = async (req, res) => {
  try {
    const gameState = await GameState.getCurrentState();
    const team = await Team.findById(req.user.id);
    console.log('[getGameStatus] gameState:', gameState);
    console.log('[getGameStatus] team:', team);
    if (!gameState || !team) {
      console.error('[getGameStatus] Missing gameState or team');
      return res.status(404).json({ message: 'Game state or team not found' });
    }
    const teamProgress = await team.getProgress();
    console.log('[getGameStatus] teamProgress:', teamProgress);
    res.json({
      gameStatus: gameState.gameStatus,
      startTime: gameState.startTime,
      endTime: gameState.endTime,
      teamProgress,
      finalUnlocked: team.finalUnlocked,
      finalSubmitted: team.finalSubmitted
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching game status', error: error.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await calculateRanking();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
};

// Team statistics
const getTeamStats = async (req, res) => {
  try {
    const team = await Team.findById(req.user.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const submissions = await Submission.find({ teamId: team._id });
    const stats = {
      totalSubmissions: submissions.length,
      approvedSubmissions: submissions.filter(s => s.status === 'auto_approved' || s.status === 'manual_approved').length,
      pendingSubmissions: submissions.filter(s => s.status === 'pending').length,
      rejectedSubmissions: submissions.filter(s => s.status === 'auto_rejected' || s.status === 'manual_rejected').length,
      averageScore: submissions.length > 0 ? (submissions.filter(s => s.status === 'auto_approved' || s.status === 'manual_approved').reduce((sum, s) => sum + (s.similarityScore || 0), 0) / submissions.filter(s => s.status === 'auto_approved' || s.status === 'manual_approved').length) : 0,
      levelsCompleted: team.completed.length,
      totalLevels: team.assignedLevels.length,
      progressPercentage: (team.completed.length / team.assignedLevels.length) * 100
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching team stats', error: error.message });
  }
};

const getSubmissionHistory = async (req, res) => {
  try {
    const submissions = await Submission.find({ teamId: req.user.id })
      .populate('levelId', 'title order')
      .sort('-createdAt');

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submission history', error: error.message });
  }
};

module.exports = {
  getTeamProfile,
  updateTeamProfile,
  getTeamProgress,
  getAssignedLevels,
  getLevelDetails,
  getCurrentLevel,
  submitPhoto,
  getTeamSubmissions,
  getSubmissionDetails,
  checkFinalAccess,
  submitFinal,
  getGameStatus,
  getLeaderboard,
  getTeamStats,
  getSubmissionHistory
};
