const express = require('express');
const router = express.Router();
const { 
    startScan, 
    captureLead,
    getAuditReports,
    getAuditReportById
} = require('../controllers/scan.controller');
const { protect, checkSubscription } = require('../utils/auth.middleware');

router.post('/', protect, checkSubscription('starter'), startScan);
router.post('/lead', captureLead);
router.get('/reports', protect, getAuditReports);
router.get('/reports/:id', protect, getAuditReportById);

module.exports = router;
