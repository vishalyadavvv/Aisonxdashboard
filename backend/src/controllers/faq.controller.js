const FAQ = require('../models/FAQ');

exports.getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find({ active: true }).sort('order');
    res.status(200).json({
      status: 'success',
      results: faqs.length,
      data: {
        faqs
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
