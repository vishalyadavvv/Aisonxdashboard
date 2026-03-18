const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../utils/auth.middleware');
const router = express.Router();

router.post('/send-register-otp', authController.sendRegisterOTP);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/me', protect, authController.getMe);
router.patch('/update-me', protect, authController.updateMe);
router.patch('/update-password', protect, authController.updatePassword);
router.post('/start-trial', protect, authController.startTrial);

module.exports = router;
