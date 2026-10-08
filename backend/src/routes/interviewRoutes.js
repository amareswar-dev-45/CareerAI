const express = require('express');
const router = express.Router();
const multer = require('multer');
const interviewController = require('../controllers/interviewController');
const { authenticateUser } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.use(authenticateUser);

// 1. Research Company Interview Plan & Flow
router.get('/plan', interviewController.getInterviewPlan);

// 2. Aptitude Round
router.post('/aptitude/start', interviewController.startAptitude);
router.post('/aptitude/complete', interviewController.completeAptitude);

// 3. Technical Round
router.post('/technical/start', interviewController.startTechnical);
router.post('/technical/evaluate-answer', interviewController.evaluateTechnicalAnswer);
router.post('/technical/evaluate', interviewController.evaluateTechnicalAnswer);
router.post('/technical/complete', interviewController.completeTechnical);

// 4. Gemini Live Ephemeral Token & Real-Time HR AI Interviewer
router.post('/live-token', interviewController.generateLiveToken);
router.post('/hr/start', interviewController.startHR);
router.post('/hr/live-exchange', upload.single('audio'), interviewController.handleHRLiveExchange);
router.post('/hr/evaluate-answer', interviewController.evaluateHRAnswer);
router.post('/hr/evaluate', interviewController.evaluateHRAnswer);
router.post('/hr/complete', interviewController.completeHR);

// 5. Final Report & History
router.post('/final-report', interviewController.generateFinalReport);
router.get('/history', interviewController.getInterviewHistory);
router.get('/history/:sessionId', interviewController.getSessionReport);

// 6. Production Unified Live Interview Session Engine
router.post('/session/start', interviewController.startLiveSession);
router.post('/session/next-question', interviewController.getNextLiveQuestion);
router.post('/session/evaluate-answer', interviewController.evaluateLiveAnswer);
router.post('/session/complete-round', interviewController.completeLiveRound);
router.post('/session/complete-interview', interviewController.completeLiveInterview);

// 7. Practice Weak Areas & Remediation
router.post('/practice-weak-areas', interviewController.getPracticeWeakAreas);
router.post('/evaluate-practice-answer', interviewController.evaluatePracticeAnswer);

module.exports = router;

