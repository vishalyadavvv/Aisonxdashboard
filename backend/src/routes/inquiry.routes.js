const express = require('express');
const inquiryController = require('../controllers/inquiry.controller');
const { protect } = require('../utils/auth.middleware');

const router = express.Router();

// All inquiry routes require authentication
router.use(protect);

router
  .route('/')
  .get(inquiryController.getMyInquiries)
  .post(inquiryController.createInquiry);

router
  .route('/:id')
  .get(inquiryController.getInquiry)
  .patch(inquiryController.updateInquiry);

module.exports = router;
