const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { authenticateUser } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const resumeBuilderController = require('../controllers/resumeBuilderController');

router.use(authenticateUser);

// Existing Resume & ATS Endpoints
router.post('/upload', upload.single('resume'), resumeController.uploadResume);
router.get('/current', resumeController.getCurrentResume);
router.post('/analyze', resumeController.analyzeResume);
router.post('/tailor', resumeController.tailorResume);

// Interactive Resume Builder Endpoints
router.get('/builder/list', resumeBuilderController.listResumes);
router.get('/builder/:id', resumeBuilderController.getResume);
router.post('/builder', resumeBuilderController.saveResume);
router.put('/builder/:id', resumeBuilderController.saveResume);
router.post('/builder/:id/duplicate', resumeBuilderController.duplicateResume);
router.delete('/builder/:id', resumeBuilderController.deleteResume);
router.post('/builder/ai-improve', resumeBuilderController.aiImprove);
router.post('/builder/ats-check', resumeBuilderController.atsCheck);

module.exports = router;
