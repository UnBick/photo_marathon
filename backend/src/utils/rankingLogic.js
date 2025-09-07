const Team = require('../models/Team');
const Submission = require('../models/Submission');
const Level = require('../models/Level');

/**
 * Calculate leaderboard rankings for all teams
 * @returns {Array} Array of team rankings sorted by position
 */
const calculateRanking = async () => {
  try {
    // Get all teams with their completion data
    const teams = await Team.find()
      .select('teamName completed finalSubmitted totalTime isWinner assignedLevels lastActive')
      .lean();

    // Get all submissions for score calculation
    const submissions = await Submission.find({
      status: { $in: ['auto_approved', 'approved'] }
    }).select('teamId similarityScore levelId createdAt');

    // Calculate scores and metrics for each team
    const teamRankings = teams.map(team => {
      // Count all unique levels with approved submissions
      const teamSubmissions = submissions.filter(s => 
        s.teamId.toString() === team._id.toString()
      );
      const completedLevelIds = [...new Set(teamSubmissions.map(s => String(s.levelId)))];
      const completedLevels = completedLevelIds.length + (team.finalSubmitted ? 1 : 0);
      const totalLevels = (Array.isArray(team.assignedLevels) ? team.assignedLevels.length : 0) + 1; // Always add final
      const finalSubmitted = team.finalSubmitted;
      const totalTime = team.totalTime || 0;
      const isWinner = team.isWinner || false;
      const lastActivity = team.lastActive || team.updatedAt || team.createdAt || null;
      const memberCount = 1; // If you have a members array, use team.members.length
      // Calculate average similarity score
      const averageScore = teamSubmissions.length > 0
        ? teamSubmissions.reduce((sum, s) => sum + (s.similarityScore || 0), 0) / teamSubmissions.length
        : 0;
      // Calculate total points (based on levels completed and final submission)
      const levelPoints = completedLevels * 100; // 100 points per level
      const finalPoints = finalSubmitted ? 500 : 0; // 500 bonus points for final submission
      const timeBonus = Math.max(0, 1000 - Math.floor(totalTime / 60)); // Time bonus (max 1000, decreases with time)
      const totalPoints = levelPoints + finalPoints + timeBonus;

      // Find last approved submission time
      let lastSubmissionTime = null;
      if (teamSubmissions.length > 0) {
        lastSubmissionTime = teamSubmissions.reduce((latest, s) => {
          const t = new Date(s.createdAt).getTime();
          return t > latest ? t : latest;
        }, 0);
      }
      // Format lastSubmissionTime as HH:mm:ss
      let formattedSubmissionTime = 'N/A';
      if (lastSubmissionTime) {
        const d = new Date(lastSubmissionTime);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const seconds = d.getSeconds().toString().padStart(2, '0');
        formattedSubmissionTime = `${hours}:${minutes}:${seconds}`;
      }

      // Calculate completion rate for later use
      const completionRate = totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;
      return {
        teamId: team._id,
        teamName: team.teamName,
        completedLevels,
        totalLevels,
        finalSubmitted,
        totalTime,
        averageScore: Math.round(averageScore * 100) / 100,
        totalPoints,
        isWinner,
        lastActivity,
        memberCount,
        completionRate,
        lastSubmissionTime,
        formattedSubmissionTime,
        metrics: {
          levelPoints,
          finalPoints,
          timeBonus,
          totalPoints
        }
      };
    });

    // Race-style ranking:
    // 1. Teams who finished the final level (finalSubmitted=true) are ranked by earliest lastSubmissionTime (ascending)
    // 2. Teams who haven't finished are ranked below, sorted by completedLevels (desc), then lastSubmissionTime (ascending)
    const finished = teamRankings.filter(t => t.finalSubmitted).sort((a, b) => {
      // Earliest lastSubmissionTime wins
      if (a.lastSubmissionTime !== b.lastSubmissionTime) return a.lastSubmissionTime - b.lastSubmissionTime;
      // Tiebreaker: more completed levels (should be equal if finalSubmitted, but just in case)
      if (a.completedLevels !== b.completedLevels) return b.completedLevels - a.completedLevels;
      // Next tiebreaker: higher average score
      if (a.averageScore !== b.averageScore) return b.averageScore - a.averageScore;
      // Alphabetical
      return a.teamName.localeCompare(b.teamName);
    });
    const unfinished = teamRankings.filter(t => !t.finalSubmitted).sort((a, b) => {
      // More completed levels first
      if (a.completedLevels !== b.completedLevels) return b.completedLevels - a.completedLevels;
      // Earlier lastSubmissionTime is better
      if (a.lastSubmissionTime !== b.lastSubmissionTime) return a.lastSubmissionTime - b.lastSubmissionTime;
      // Higher average score
      if (a.averageScore !== b.averageScore) return b.averageScore - a.averageScore;
      // Alphabetical
      return a.teamName.localeCompare(b.teamName);
    });
    const sortedRankings = [...finished, ...unfinished];

    // Add rank positions and tie information
    let currentRank = 1;
    let currentPoints = null;
    let currentLevels = null;
    let currentFinal = null;
    let currentTime = null;
    let currentScore = null;

    const finalRankings = sortedRankings.map((team, index) => {
      // Check if this is a tie with the previous team
      const isTie = index > 0 && 
        team.totalPoints === currentPoints &&
        team.completedLevels === currentLevels &&
        team.finalSubmitted === currentFinal &&
        team.totalTime === currentTime &&
        team.averageScore === currentScore;

      // Update current values for next iteration
      currentPoints = team.totalPoints;
      currentLevels = team.completedLevels;
      currentFinal = team.finalSubmitted;
      currentTime = team.totalTime;
      currentScore = team.averageScore;

      // If not a tie, increment rank
      if (!isTie) {
        currentRank = index + 1;
      }

      return {
        ...team,
        rank: currentRank,
        isTie,
        position: index + 1
      };
    });

    return finalRankings;

  } catch (error) {
    console.error('Error calculating rankings:', error);
<<<<<<< HEAD
=======
  throw new Error('Failed to calculate team rankings');
}
>>>>>>> origin/main
    throw new Error('Failed to calculate team rankings');
  }

/**
 * Calculate rankings for a specific category or filter
 * @param {Object} filter - MongoDB filter for teams
 * @param {Object} options - Ranking options
 * @returns {Array} Filtered and ranked teams
 */
const calculateFilteredRanking = async (filter = {}, options = {}) => {
  try {
    const { sortBy = 'totalPoints', sortOrder = 'desc', limit } = options;

    // Get filtered teams
    const teams = await Team.find(filter)
      .select('teamName completed finalSubmitted totalTime isWinner')
      .lean();

    // Calculate basic rankings
    const teamRankings = teams.map(team => {
      const levelsCompleted = team.completed.length;
      const finalSubmitted = team.finalSubmitted;
      const totalTime = team.totalTime || 0;
      const isWinner = team.isWinner || false;

      // Calculate total points
      const levelPoints = levelsCompleted * 100;
      const finalPoints = finalSubmitted ? 500 : 0;
      const timeBonus = Math.max(0, 1000 - Math.floor(totalTime / 60));
      const totalPoints = levelPoints + finalPoints + timeBonus;

      return {
        teamId: team._id,
        teamName: team.teamName,
        levelsCompleted,
        finalSubmitted,
        totalTime,
        totalPoints,
        isWinner
      };
    });

    // Sort by specified criteria
    const sortedRankings = teamRankings.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortOrder === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    // Apply limit if specified
    if (limit) {
      return sortedRankings.slice(0, limit);
    }

    return sortedRankings;

  } catch (error) {
    console.error('Error calculating filtered rankings:', error);
    throw new Error('Failed to calculate filtered rankings');
  }
};

/**
 * Calculate team performance statistics
 * @param {string} teamId - Team ID to analyze
 * @returns {Object} Team performance statistics
 */
const calculateTeamStats = async (teamId) => {
  try {
    const team = await Team.findById(teamId)
      .select('teamName completed finalSubmitted totalTime isWinner assignedLevels')
      .lean();

    if (!team) {
      throw new Error('Team not found');
    }

    // Get team's submissions
    const submissions = await Submission.find({ teamId })
      .populate('levelId', 'title order difficulty')
      .sort('createdAt');

    // Calculate completion rates
    const totalLevels = team.assignedLevels.length;
    const completedLevels = team.completed.length;
    const completionRate = totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;

    // Calculate submission statistics
    const totalSubmissions = submissions.length;
    const approvedSubmissions = submissions.filter(s => 
      s.status === 'auto_approved' || s.status === 'approved'
    ).length;
    const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;

    // Calculate average scores by difficulty
    const scoresByDifficulty = {};
    submissions.forEach(submission => {
      if (submission.levelId && submission.similarityScore) {
        const difficulty = submission.levelId.difficulty;
        if (!scoresByDifficulty[difficulty]) {
          scoresByDifficulty[difficulty] = [];
        }
        scoresByDifficulty[difficulty].push(submission.similarityScore);
      }
    });

    const averageScoresByDifficulty = {};
    Object.keys(scoresByDifficulty).forEach(difficulty => {
      const scores = scoresByDifficulty[difficulty];
      averageScoresByDifficulty[difficulty] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    // Calculate time efficiency
<<<<<<< HEAD
    const totalTime = team.totalTime || 0;
=======
>>>>>>> origin/main
    const averageTimePerLevel = completedLevels > 0 ? totalTime / completedLevels : 0;

    return {
      teamId: team._id,
      teamName: team.teamName,
      overview: {
        totalLevels,
        completedLevels,
        completionRate: Math.round(completionRate * 100) / 100,
        finalSubmitted: team.finalSubmitted,
        isWinner: team.isWinner,
        totalTime
      },
      submissions: {
        total: totalSubmissions,
        approved: approvedSubmissions,
        approvalRate: Math.round(approvalRate * 100) / 100
      },
      performance: {
        averageTimePerLevel: Math.round(averageTimePerLevel * 100) / 100,
        averageScoresByDifficulty,
        totalPoints: completedLevels * 100 + (team.finalSubmitted ? 500 : 0)
      },
      progress: {
        currentLevel: team.completed.length + 1,
        nextMilestone: Math.ceil(completionRate / 25) * 25, // Next 25% milestone
<<<<<<< HEAD
        estimatedCompletion: totalTime > 0 && completionRate > 0 ? (totalTime / completionRate) * 100 : null
=======
        estimatedCompletion: totalTime > 0 ? (totalTime / completionRate) * 100 : null
>>>>>>> origin/main
      }
    };

  } catch (error) {
    console.error('Error calculating team stats:', error);
    throw new Error('Failed to calculate team statistics');
  }
};

/**
 * Calculate level difficulty analysis
 * @returns {Object} Level difficulty statistics
 */
const calculateLevelDifficulty = async () => {
  try {
    const levels = await Level.find({ isActive: true })
      .select('title order difficulty')
      .lean();

    const submissions = await Submission.find({
      status: { $in: ['auto_approved', 'approved'] }
    }).select('levelId similarityScore');

    const difficultyStats = {};

    levels.forEach(level => {
      const levelSubmissions = submissions.filter(s => 
        s.levelId.toString() === level._id.toString()
      );

      if (levelSubmissions.length > 0) {
        const scores = levelSubmissions.map(s => s.similarityScore);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);

        if (!difficultyStats[level.difficulty]) {
          difficultyStats[level.difficulty] = {
            levelCount: 0,
            totalSubmissions: 0,
            averageScore: 0,
            minScore: 0,
            maxScore: 0,
            levels: []
          };
        }

        difficultyStats[level.difficulty].levelCount++;
        difficultyStats[level.difficulty].totalSubmissions += levelSubmissions.length;
        difficultyStats[level.difficulty].levels.push({
          title: level.title,
          order: level.order,
          submissions: levelSubmissions.length,
          averageScore: Math.round(averageScore * 100) / 100
        });
      }
    });

    // Calculate overall difficulty statistics
    Object.keys(difficultyStats).forEach(difficulty => {
      const stats = difficultyStats[difficulty];
      if (stats.totalSubmissions > 0) {
        const allScores = stats.levels.map(l => l.averageScore);
        stats.averageScore = Math.round(
          allScores.reduce((sum, score) => sum + score, 0) / allScores.length * 100
        ) / 100;
        stats.minScore = Math.min(...allScores);
        stats.maxScore = Math.max(...allScores);
      }
    });

    return difficultyStats;

  } catch (error) {
    console.error('Error calculating level difficulty:', error);
    throw new Error('Failed to calculate level difficulty analysis');
  }
};

/**
 * Generate ranking report with additional metadata
 * @returns {Object} Comprehensive ranking report
 */
const generateRankingReport = async () => {
  try {
    const [rankings, totalTeams, activeTeams, gameState] = await Promise.all([
      calculateRanking(),
      Team.countDocuments(),
      Team.countDocuments({ 'completed.0': { $exists: true } }),
      require('../models/GameState').getCurrentState()
    ]);

    const report = {
      metadata: {
        generatedAt: new Date(),
        totalTeams,
        activeTeams,
        participationRate: totalTeams > 0 ? (activeTeams / totalTeams) * 100 : 0,
        gameStatus: gameState?.gameStatus || 'unknown'
      },
      rankings,
      summary: {
        topPerformer: rankings[0] || null,
        averageCompletion: rankings.length > 0 
          ? rankings.reduce((sum, t) => sum + t.levelsCompleted, 0) / rankings.length 
          : 0,
        teamsWithFinal: rankings.filter(t => t.finalSubmitted).length,
        winners: rankings.filter(t => t.isWinner).length
      },
      distribution: {
        byCompletion: {
          '0-25%': rankings.filter(t => t.completionRate <= 25).length,
          '26-50%': rankings.filter(t => t.completionRate > 25 && t.completionRate <= 50).length,
          '51-75%': rankings.filter(t => t.completionRate > 50 && t.completionRate <= 75).length,
          '76-100%': rankings.filter(t => t.completionRate > 75).length
        },
        byTime: {
          '0-30min': rankings.filter(t => t.totalTime <= 1800).length,
          '31-60min': rankings.filter(t => t.totalTime > 1800 && t.totalTime <= 3600).length,
          '61-120min': rankings.filter(t => t.totalTime > 3600 && t.totalTime <= 7200).length,
          '120+min': rankings.filter(t => t.totalTime > 7200).length
        }
      }
    };

    return report;

  } catch (error) {
    console.error('Error generating ranking report:', error);
    throw new Error('Failed to generate ranking report');
  }
};

module.exports = {
  calculateRanking,
  calculateFilteredRanking,
  calculateTeamStats,
  calculateLevelDifficulty,
  generateRankingReport
};
