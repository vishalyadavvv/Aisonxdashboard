const Inquiry = require('../models/Inquiry');

exports.createInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.create({
      ...req.body,
      user: req.user.id
    });

    res.status(201).json({
      status: 'success',
      data: {
        inquiry
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getMyInquiries = async (req, res) => {
  try {
    let query = { user: req.user.id };
    
    // If admin, return all inquiries
    if (req.user.role === 'admin') {
      query = {};
    }

    const inquiries = await Inquiry.find(query)
      .populate('user', 'name email phone')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: inquiries.length,
      data: {
        inquiries
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findOne({ _id: req.params.id, user: req.user.id })
      .populate('user', 'name email phone');

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        inquiry
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.updateInquiry = async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user.id };

    const updateData = { status: req.body.status, updatedAt: Date.now() };

    // Allow admin to send a reply message
    if (req.body.adminReply !== undefined) {
      updateData.adminReply = req.body.adminReply;
    }

    const inquiry = await Inquiry.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email phone');

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        inquiry
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
