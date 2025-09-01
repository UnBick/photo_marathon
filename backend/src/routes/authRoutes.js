const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authenticateAdmin } = require('../middleware/authMiddleware');
const { rateLimit } = require('../middleware/authMiddleware');

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Team authentication routes
router.post('/team/register', authRateLimit, authController.registerTeam);
router.post('/team/login', authRateLimit, authController.loginTeam);
router.post('/team/logout', authenticateToken, authController.logout);

// Admin authentication routes
router.post('/admin/register', authenticateAdmin, authController.registerAdmin);
router.post('/admin/login', authRateLimit, authController.loginAdmin);
router.post('/admin/logout', authenticateToken, authController.logout);


// Token refresh
router.post('/refresh', authController.refreshToken);

// Get current user info
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;
