const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../utils/auth.middleware');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiters for authentication endpoints to prevent abuse and DDoS
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 OTP requests per hour
  message: { error: 'Too many OTP requests from this IP, please try again after an hour.' }
});

router.post('/send-register-otp', otpLimiter, authController.sendRegisterOTP);
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/me', protect, authController.getMe);
router.patch('/update-me', protect, authController.updateMe);
router.patch('/update-password', protect, authController.updatePassword);
router.post('/start-trial', protect, authController.startTrial);
router.get('/packages', authController.getPublicPackages);

module.exports = router;
