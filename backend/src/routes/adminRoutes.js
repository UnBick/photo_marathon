const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
console.log(adminController); // Log to verify imported functions
const { authenticateAdmin, checkAdminPermission } = require('../middleware/authMiddleware');
const { upload, processImage } = require('../middleware/uploadMiddleware');

// Admin dashboard and overview
router.get('/dashboard', authenticateAdmin, adminController.getDashboard);
router.get('/overview', authenticateAdmin, adminController.getGameOverview);

// Team management
router.get('/teams', authenticateAdmin, adminController.getAllTeams);
router.get('/teams/:teamId', authenticateAdmin, adminController.getTeamDetails);
router.put('/teams/:teamId', authenticateAdmin, adminController.updateTeam);
router.delete('/teams/:teamId', authenticateAdmin, adminController.deleteTeam);
router.post('/teams/:teamId/reset', authenticateAdmin, adminController.resetTeamProgress);
router.post('/teams/:teamId/unlock-final', authenticateAdmin, adminController.unlockTeamFinal);

// Level management
router.get('/levels', authenticateAdmin, adminController.getAllLevels);
router.get('/levels/:levelId', authenticateAdmin, adminController.getLevelDetails);
router.post('/levels', 
  authenticateAdmin, 
  upload.single('photo'),
  processImage,
  adminController.createLevel
);
router.put('/levels/:levelId', 
  authenticateAdmin, 
  upload.single('photo'),
  processImage,
  adminController.updateLevel
);
router.delete('/levels/:levelId', authenticateAdmin, adminController.deleteLevel);

// Submission management
router.get('/submissions', authenticateAdmin, adminController.getAllSubmissions);
router.get('/submissions/:submissionId', authenticateAdmin, adminController.getSubmissionDetails);
router.patch('/submissions/:submissionId/approve', authenticateAdmin, adminController.approveSubmission);
router.patch('/submissions/:submissionId/reject', authenticateAdmin, adminController.rejectSubmission);
router.post('/submissions/:submissionId/reprocess', authenticateAdmin, adminController.reprocessSubmission);

// Game state management
router.get('/game-state', authenticateAdmin, adminController.getGameState);
router.post('/game/init', authenticateAdmin, adminController.initGameState);
router.post('/game/start', authenticateAdmin, checkAdminPermission('game_control'), adminController.startGame);
router.post('/game/pause', authenticateAdmin, checkAdminPermission('game_control'), adminController.pauseGame);
router.post('/game/resume', authenticateAdmin, checkAdminPermission('game_control'), adminController.resumeGame);
router.post('/game/end', authenticateAdmin, checkAdminPermission('game_control'), adminController.endGame);
router.post('/game/reset', authenticateAdmin, checkAdminPermission('game_control'), adminController.resetGame);
router.post('/game/declare-winner', authenticateAdmin, checkAdminPermission('game_control'), adminController.declareWinner);

// Leaderboard and rankings
router.get('/leaderboard', authenticateAdmin, adminController.getAdminLeaderboard);
router.get('/leaderboard/export', authenticateAdmin, adminController.exportLeaderboard);
router.post('/leaderboard/recalculate', authenticateAdmin, adminController.recalculateLeaderboard);

// Analytics and reporting
router.get('/analytics', authenticateAdmin, adminController.getAnalytics);
router.get('/analytics/teams', authenticateAdmin, adminController.getTeamAnalytics);
router.get('/analytics/levels', authenticateAdmin, adminController.getLevelAnalytics);
router.get('/analytics/submissions', authenticateAdmin, adminController.getSubmissionAnalytics);
router.get('/reports', authenticateAdmin, adminController.generateReports);

// System settings and configuration
router.get('/settings', authenticateAdmin, adminController.getSystemSettings);
router.put('/settings', authenticateAdmin, checkAdminPermission('system_config'), adminController.updateSystemSettings);
router.get('/logs', authenticateAdmin, adminController.getSystemLogs);
router.post('/maintenance', authenticateAdmin, checkAdminPermission('system_config'), adminController.toggleMaintenanceMode);

// Admin user management
router.get('/admins', authenticateAdmin, checkAdminPermission('admin_management'), adminController.getAllAdmins);
router.post('/admins', authenticateAdmin, checkAdminPermission('admin_management'), adminController.createAdmin);
router.put('/admins/:adminId', authenticateAdmin, checkAdminPermission('admin_management'), adminController.updateAdmin);
router.delete('/admins/:adminId', authenticateAdmin, checkAdminPermission('admin_management'), adminController.deleteAdmin);

module.exports = router;
