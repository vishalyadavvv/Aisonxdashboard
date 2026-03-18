const express = require('express');
const router = express.Router();
const profilerController = require('../controllers/profiler.controller');
const { protect, checkSubscription } = require('../utils/auth.middleware');

router.post('/analyze', protect, checkSubscription('starter'), profilerController.analyzeDomain);
router.get('/reports', protect, profilerController.getReports);
router.get('/reports/:id', protect, profilerController.getReportById);
router.get('/health', profilerController.getHealth);

module.exports = router;
