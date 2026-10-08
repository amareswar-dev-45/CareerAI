const express = require('express');
const router = express.Router();
const skillGapController = require('../controllers/skillGapController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.use(authenticateUser);
router.post('/analyze', skillGapController.analyzeSkillGap);
router.get('/latest', skillGapController.getLatestSkillGap);

module.exports = router;
