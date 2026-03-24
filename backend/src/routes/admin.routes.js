const express = require('express');
const adminController = require('../controllers/admin.controller');
const authController = require('../controllers/auth.controller');
const { protect } = require('../utils/auth.middleware');

const router = express.Router();

// Middleware to restrict access to ADMIN only
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// All routes after this middleware are protected and restricted to admin
router.use(protect);
router.use(restrictTo('admin'));

router.get('/stats', adminController.getAdminStats);
router.get('/users', adminController.getAllUsers);
router.get('/admins', adminController.getAllAdmins);
router.post('/create-admin', adminController.createAdmin);
router.patch('/update-subscription', adminController.updateUserSubscription);
router.post('/trigger-daily-scan', adminController.triggerDailyScan);

module.exports = router;
