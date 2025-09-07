const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { 
  authenticateTeam, 
  checkGameActive, 
  checkGameNotCompleted,
  validateTeamOwnership,
  checkTeamLevelAccess 
} = require('../middleware/authMiddleware');
const { upload, processImage } = require('../middleware/uploadMiddleware');

// Team profile and progress
router.get('/profile', authenticateTeam, teamController.getTeamProfile);
router.put('/profile', authenticateTeam, teamController.updateTeamProfile);
router.get('/progress', authenticateTeam, teamController.getTeamProgress);

// Level management
router.get('/levels', authenticateTeam, checkGameActive, teamController.getAssignedLevels);
router.get('/levels/:levelId', authenticateTeam, checkGameActive, checkTeamLevelAccess, teamController.getLevelDetails);
router.get('/current-level', authenticateTeam, checkGameActive, teamController.getCurrentLevel);

// Photo submissions
router.post('/levels/:levelId/submit', 
  authenticateTeam, 
  checkGameActive, 
  checkGameNotCompleted,
  checkTeamLevelAccess,
  upload.single('photo'),
  processImage,
  teamController.submitPhoto
);

router.get('/submissions', authenticateTeam, teamController.getTeamSubmissions);
router.get('/submissions/:submissionId', authenticateTeam, validateTeamOwnership, teamController.getSubmissionDetails);

// Final level access
router.get('/final', authenticateTeam, checkGameActive, teamController.checkFinalAccess);
router.post('/final/submit', 
  authenticateTeam, 
  checkGameActive, 
  checkGameNotCompleted,
  upload.single('photo'),
  processImage,
  teamController.submitFinal
);

// Game status and leaderboard
router.get('/game-status', authenticateTeam, teamController.getGameStatus);
router.get('/leaderboard', authenticateTeam, teamController.getLeaderboard);

// Team statistics
router.get('/stats', authenticateTeam, teamController.getTeamStats);
router.get('/history', authenticateTeam, teamController.getSubmissionHistory);

module.exports = router;
