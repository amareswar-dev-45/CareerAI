const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.use(authenticateUser);
router.get('/', jobController.getJobs);
router.get('/company-intelligence', jobController.getCompanyIntelligence);
router.get('/:id', jobController.getJobById);

module.exports = router;
