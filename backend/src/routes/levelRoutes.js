const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');
const { authenticateToken, authenticateAdmin } = require('../middleware/authMiddleware');
const { upload, processImage } = require('../middleware/uploadMiddleware');
// Public route for final level clue
router.get('/final', levelController.getFinalLevelClue);

// Public level information (no auth required)
router.get('/public', levelController.getPublicLevels);
router.get('/public/:levelId', levelController.getPublicLevelDetails);

// Team level access (authenticated)
router.get('/assigned', authenticateToken, levelController.getAssignedLevels);
router.get('/assigned/:levelId', authenticateToken, levelController.getAssignedLevelDetails);

// Admin level management
router.post('/', 
  authenticateAdmin, 
  upload.single('photo'),
  processImage,
  levelController.createLevel
);

router.put('/:levelId', 
  authenticateAdmin, 
  upload.single('photo'),
  processImage,
  levelController.updateLevel
);

router.delete('/:levelId', authenticateAdmin, levelController.deleteLevel);
router.patch('/:levelId/status', authenticateAdmin, levelController.toggleLevelStatus);

// Level assignment management
router.post('/:levelId/assign', authenticateAdmin, levelController.assignLevelToTeam);
router.delete('/:levelId/assign/:teamId', authenticateAdmin, levelController.removeLevelFromTeam);
router.post('/assign-random', authenticateAdmin, levelController.assignRandomLevels);

// Level statistics and analytics
router.get('/stats', authenticateAdmin, levelController.getLevelStats);
router.get('/:levelId/stats', authenticateAdmin, levelController.getLevelSpecificStats);
router.get('/difficulty-analysis', authenticateAdmin, levelController.getDifficultyAnalysis);

// Level verification and testing
router.post('/:levelId/test', authenticateAdmin, levelController.testLevelImage);
router.get('/:levelId/verification', authenticateAdmin, levelController.getLevelVerificationData);

module.exports = router;
