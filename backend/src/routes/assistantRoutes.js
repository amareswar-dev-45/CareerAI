const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistantController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.use(authenticateUser);
router.post('/chat', assistantController.chat);

module.exports = router;
