const express = require('express');
const faqController = require('../controllers/faq.controller');

const router = express.Router();

router.get('/', faqController.getAllFAQs);

module.exports = router;
