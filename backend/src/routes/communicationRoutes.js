const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateUser } = require('../middleware/authMiddleware');
const communicationController = require('../controllers/communicationController');

// Configure in-memory storage for audio processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB limit
});

// All communication routes require student authentication
router.use(authenticateUser);

// 1. Reading Practice
router.post('/reading/generate', communicationController.generateReadingPassage);
router.post('/reading/analyze', upload.single('audio'), communicationController.analyzeReadingSpeech);

// 2. AI Conversation
router.post('/conversation/message', upload.single('audio'), communicationController.handleConversationMessage);
router.post('/conversation/feedback', communicationController.generateConversationFeedback);

// 3. Practice My Mistakes
router.post('/practice', upload.single('audio'), communicationController.evaluatePractice);

// 4. Utilities: Direct STT & TTS
router.post('/stt', upload.single('audio'), communicationController.transcribeAudio);
router.post('/tts', communicationController.synthesizeSpeech);

// 5. Progress Dashboard
router.get('/progress', communicationController.getProgress);

module.exports = router;
