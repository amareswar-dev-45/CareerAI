const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.use(authenticateUser);
router.get('/', authController.getProfile);
router.patch('/', authController.updateProfile);

module.exports = router;
