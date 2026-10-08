const express = require('express');
const router = express.Router();
const atsController = require('../controllers/atsController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.use(authenticateUser);
router.post('/analyze', atsController.analyzeATS);
router.get('/latest', atsController.getLatestATS);

module.exports = router;
