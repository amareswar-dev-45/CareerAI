const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/sync', authController.syncUser);
router.get('/me', authenticateUser, authController.getMe);
router.post('/onboarding', authenticateUser, upload.single('resume'), authController.completeOnboarding);

module.exports = router;


