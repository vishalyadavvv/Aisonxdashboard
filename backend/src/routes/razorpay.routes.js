const express = require('express');
const razorpayController = require('../controllers/razorpay.controller');
const { protect } = require('../utils/auth.middleware');
const router = express.Router();

router.post('/create-order', protect, razorpayController.createOrder);
router.post('/verify-payment', protect, razorpayController.verifyPayment);
router.get('/my-invoices', protect, razorpayController.getMyInvoices);
router.post('/webhook', razorpayController.handleWebhook);

module.exports = router;
