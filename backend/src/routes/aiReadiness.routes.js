const express = require('express');
const router = express.Router();
const aiReadinessController = require('../controllers/aiReadiness.controller');
const { protect, checkSubscription } = require('../utils/auth.middleware');

router.post('/analyze', protect, checkSubscription('starter'), aiReadinessController.analyze);
router.get('/readiness/reports', protect, aiReadinessController.getReports);
router.get('/readiness/reports/:id', protect, aiReadinessController.getReportById);

module.exports = router;
