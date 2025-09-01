const Level = require('../models/Level');
const Team = require('../models/Team');
const Submission = require('../models/Submission');
const GameState = require('../models/GameState');

// Public level information
const getPublicLevels = async (req, res) => {
  try {
    const levels = await Level.find({ isActive: true })
      .select('title description thumbnailUrl difficulty location')
      .sort('order');

    res.json(levels);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public levels', error: error.message });
  }
};

const getPublicLevelDetails = async (req, res) => {
  try {
    const level = await Level.findById(req.params.levelId)
      .select('title description thumbnailUrl difficulty location hints')
      .where('isActive', true);

    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    res.json(level);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching level details', error: error.message });
  }
};

// Team level access
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

    // Add completion status for each level
    const levelsWithStatus = levels.map(level => {
      const completion = team.completed.find(c => c.levelId.toString() === level._id.toString());
      return {
        ...level.toObject(),
        completed: !!completion,
        completedAt: completion?.completedAt,
        bestScore: completion?.bestScore,
        attempts: completion?.attempts || 0
      };
    });

    res.json(levelsWithStatus);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned levels', error: error.message });
  }
};

const getAssignedLevelDetails = async (req, res) => {
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

    // Get team's completion status for this level
    const completion = team.completed.find(c => c.levelId.toString() === levelId);
    const submissions = await Submission.find({ 
      teamId: team._id, 
      levelId 
    }).sort('-createdAt');

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
      points: level.points,
      completed: !!completion,
      completedAt: completion?.completedAt,
      bestScore: completion?.bestScore,
      attempts: completion?.attempts || 0,
      submissions: submissions.map(s => ({
        _id: s._id,
        status: s.status,
        similarityScore: s.similarityScore,
        createdAt: s.createdAt,
        attemptNumber: s.attemptNumber
      }))
    };

    res.json(safeLevel);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching level details', error: error.message });
  }
};

// Admin level management
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
      return res.status(400).json({ message: 'Photo is required' });
    }

    // Check if this is a final level and if one already exists
    if (isFinal) {
      const existingFinal = await Level.findOne({ isFinal: true });
      if (existingFinal) {
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

    // If this is a new level, assign it to all existing teams
    if (!isFinal) {
      const teams = await Team.find();
      for (const team of teams) {
        if (!team.assignedLevels.includes(level._id)) {
          team.assignedLevels.push(level._id);
          await team.save();
        }
      }
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

const toggleLevelStatus = async (req, res) => {
  try {
    const { levelId } = req.params;
    const level = await Level.findById(levelId);
    
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    level.isActive = !level.isActive;
    await level.save();

    res.json({
      message: `Level ${level.isActive ? 'activated' : 'deactivated'} successfully`,
      level
    });

  } catch (error) {
    res.status(500).json({ message: 'Error toggling level status', error: error.message });
  }
};

// Level assignment management
const assignLevelToTeam = async (req, res) => {
  try {
    const { levelId, teamId } = req.params;
    
    const [level, team] = await Promise.all([
      Level.findById(levelId),
      Team.findById(teamId)
    ]);

    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.assignedLevels.includes(levelId)) {
      return res.status(400).json({ message: 'Level already assigned to team' });
    }

    team.assignedLevels.push(levelId);
    await team.save();

    res.json({
      message: 'Level assigned to team successfully',
      team: {
        _id: team._id,
        teamName: team.teamName,
        assignedLevels: team.assignedLevels
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error assigning level to team', error: error.message });
  }
};

const removeLevelFromTeam = async (req, res) => {
  try {
    const { levelId, teamId } = req.params;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (!team.assignedLevels.includes(levelId)) {
      return res.status(400).json({ message: 'Level not assigned to team' });
    }

    // Check if team has completed this level
    const completion = team.completed.find(c => c.levelId.toString() === levelId);
    if (completion) {
      return res.status(400).json({ message: 'Cannot remove completed level from team' });
    }

    team.assignedLevels = team.assignedLevels.filter(id => id.toString() !== levelId);
    await team.save();

    res.json({
      message: 'Level removed from team successfully',
      team: {
        _id: team._id,
        teamName: team.teamName,
        assignedLevels: team.assignedLevels
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error removing level from team', error: error.message });
  }
};

const assignRandomLevels = async (req, res) => {
  try {
    const { levelCount = 5 } = req.body;
    
    const activeLevels = await Level.find({ 
      isActive: true, 
      isFinal: false 
    }).sort('order');

    if (activeLevels.length < levelCount) {
      return res.status(400).json({ 
        message: `Not enough active levels. Available: ${activeLevels.length}, Requested: ${levelCount}` 
      });
    }

    const teams = await Team.find();
    const results = [];

    for (const team of teams) {
      // Clear existing assignments (except final level)
      team.assignedLevels = team.assignedLevels.filter(levelId => {
        const level = activeLevels.find(l => l._id.toString() === levelId.toString());
        return level && level.isFinal;
      });

      // Randomly assign new levels
      const shuffledLevels = [...activeLevels.filter(l => !l.isFinal)];
      for (let i = shuffledLevels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledLevels[i], shuffledLevels[j]] = [shuffledLevels[j], shuffledLevels[i]];
      }

      const selectedLevels = shuffledLevels.slice(0, levelCount);
      team.assignedLevels.push(...selectedLevels.map(l => l._id));
      team.currentIndex = 0;
      team.completed = [];
      team.finalUnlocked = false;
      team.finalSubmitted = false;
      team.isWinner = false;
      team.totalTime = 0;

      await team.save();

      results.push({
        teamId: team._id,
        teamName: team.teamName,
        assignedLevels: selectedLevels.map(l => ({ _id: l._id, title: l.title, order: l.order }))
      });
    }

    res.json({
      message: `Random levels assigned to ${teams.length} teams`,
      results
    });

  } catch (error) {
    res.status(500).json({ message: 'Error assigning random levels', error: error.message });
  }
};

// Level statistics and analytics
const getLevelStats = async (req, res) => {
  try {
    const stats = await Level.aggregate([
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
          _id: 1,
          title: 1,
          order: 1,
          difficulty: 1,
          isActive: 1,
          totalSubmissions: { $size: '$submissions' },
          approvedSubmissions: {
            $size: {
              $filter: {
                input: '$submissions',
                cond: { $in: ['$$this.status', ['auto_approved', 'approved']] }
              }
            }
          },
          averageScore: {
            $avg: '$submissions.similarityScore'
          },
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
      },
      { $sort: { order: 1 } }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching level stats', error: error.message });
  }
};

const getLevelSpecificStats = async (req, res) => {
  try {
    const { levelId } = req.params;
    
    const stats = await Submission.aggregate([
      { $match: { levelId: levelId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          averageScore: { $avg: '$similarityScore' },
          minScore: { $min: '$similarityScore' },
          maxScore: { $max: '$similarityScore' }
        }
      }
    ]);

    const totalSubmissions = await Submission.countDocuments({ levelId });
    const level = await Level.findById(levelId);

    res.json({
      level: {
        _id: level._id,
        title: level.title,
        order: level.order,
        difficulty: level.difficulty
      },
      totalSubmissions,
      statusBreakdown: stats,
      overallStats: {
        averageScore: stats.reduce((sum, s) => sum + (s.averageScore * s.count), 0) / totalSubmissions || 0,
        completionRate: (stats.find(s => s._id === 'auto_approved' || s._id === 'approved')?.count || 0) / totalSubmissions * 100
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching level specific stats', error: error.message });
  }
};

const getDifficultyAnalysis = async (req, res) => {
  try {
    const analysis = await Level.aggregate([
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
          totalSubmissions: { $sum: { $size: '$submissions' } },
          averageCompletionRate: {
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
          },
          averageScore: {
            $avg: '$submissions.similarityScore'
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching difficulty analysis', error: error.message });
  }
};

// Level verification and testing
const testLevelImage = async (req, res) => {
  try {
    const { levelId } = req.params;
    const level = await Level.findById(levelId);
    
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Test image is required' });
    }

    const verificationResult = await level.matchesImage(req.file.path);

    res.json({
      message: 'Image test completed',
      testImage: {
        phash: req.file.phash,
        exif: req.file.exif
      },
      levelImage: {
        phash: level.phash
      },
      verificationResult
    });

  } catch (error) {
    res.status(500).json({ message: 'Error testing level image', error: error.message });
  }
};

const getLevelVerificationData = async (req, res) => {
  try {
    const { levelId } = req.params;
    const level = await Level.findById(levelId);
    
    if (!level) {
      return res.status(404).json({ message: 'Level not found' });
    }

    const verificationData = {
      _id: level._id,
      title: level.title,
      phash: level.phash,
      descriptors: level.descriptors,
      embeddingId: level.embeddingId,
      alternativeImages: level.alternativeImages,
      thresholds: {
        phash: process.env.PHASH_THRESHOLD || 0.85,
        orb: process.env.ORB_THRESHOLD || 0.7,
        embedding: process.env.EMBEDDING_THRESHOLD || 0.8
      }
    };

    res.json(verificationData);

  } catch (error) {
    res.status(500).json({ message: 'Error fetching level verification data', error: error.message });
  }
};

module.exports = {
  getPublicLevels,
  getPublicLevelDetails,
  getAssignedLevels,
  getAssignedLevelDetails,
  createLevel,
  updateLevel,
  deleteLevel,
  toggleLevelStatus,
  assignLevelToTeam,
  removeLevelFromTeam,
  assignRandomLevels,
  getLevelStats,
  getLevelSpecificStats,
  getDifficultyAnalysis,
  testLevelImage,
  getLevelVerificationData
};
