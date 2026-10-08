const express = require('express');
const router = express.Router();
const roadmapController = require('../controllers/roadmapController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.use(authenticateUser);
router.post('/generate', roadmapController.generateRoadmap);
router.post('/regenerate', roadmapController.generateRoadmap);
router.get('/current', roadmapController.getCurrentRoadmap);
router.patch('/skill-status', roadmapController.updateSkillStatus);
router.patch('/toggle-week', roadmapController.toggleWeekCompletion);
router.patch('/toggle-day', roadmapController.toggleDayCompletion);

module.exports = router;
