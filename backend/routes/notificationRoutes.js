const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

router.use(authenticate);
router.get('/', notificationController.list);
router.post('/seen/all', notificationController.markAllSeen);
router.post('/:id/seen', notificationController.markSeen);
router.post('/run/due-checks', notificationController.runDueChecks);

module.exports = router;
