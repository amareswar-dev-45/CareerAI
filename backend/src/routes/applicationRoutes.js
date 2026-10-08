const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.use(authenticateUser);
router.get('/', applicationController.getApplications);
router.post('/', applicationController.createApplication);
router.patch('/:id', applicationController.updateApplication);
router.delete('/:id', applicationController.deleteApplication);

module.exports = router;
