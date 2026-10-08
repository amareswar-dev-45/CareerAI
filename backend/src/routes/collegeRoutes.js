const express = require('express');
const router = express.Router();
const collegeController = require('../controllers/collegeController');
const { authenticateCollegeAdmin } = require('../middleware/authMiddleware');

// Public College Admin Authentication
router.post('/auth/login', collegeController.login);
router.post('/login', collegeController.login);
router.post('/auth/logout', collegeController.logout);
router.post('/logout', collegeController.logout);

// Protected College Admin Routes (Strict Admin Authentication Required)
router.use(authenticateCollegeAdmin);

router.get('/dashboard', collegeController.getDashboard);
router.get('/students', collegeController.getStudents);
router.get('/students/:studentId', collegeController.getStudentById);
router.get('/analytics/target-roles', collegeController.getTargetRolesAnalytics);
router.get('/analytics/skill-gaps', collegeController.getSkillGapsAnalytics);
router.get('/analytics/readiness', collegeController.getReadinessAnalytics);

module.exports = router;
