const User = require('../models/User');
const Project = require('../models/Project');
const Inquiry = require('../models/Inquiry');
const AIVisibilityReport = require('../models/AIVisibilityReport');
const ProfilerReport = require('../models/ProfilerReport');
const ReadinessReport = require('../models/ReadinessReport');
const WebsearchReport = require('../models/WebsearchReport');

exports.getAdminStats = async (req, res) => {
  try {
    // 1) User Stats
    const totalUsers = await User.countDocuments({ role: 'user' });
    const trialUsers = await User.countDocuments({ 'subscription.status': 'trialing' });
    const activePaidUsers = await User.countDocuments({ 'subscription.status': 'active' });
    const expiredUsers = await User.countDocuments({ 'subscription.status': 'expired' });

    // 2) Plan Distribution
    const starterUsers = await User.countDocuments({ 'subscription.tier': 'starter' });
    const growthUsers = await User.countDocuments({ 'subscription.tier': 'growth' });
    const professionalUsers = await User.countDocuments({ 'subscription.tier': 'professional' });

    // 3) Usage Stats (Reports generated)
    const auditReports = await AIVisibilityReport.countDocuments();
    const profilerReports = await ProfilerReport.countDocuments();
    const readinessReports = await ReadinessReport.countDocuments();
    const searchReports = await WebsearchReport.countDocuments();
    const totalReports = auditReports + profilerReports + readinessReports + searchReports;

    // 4) Inquiry Stats
    const openInquiries = await Inquiry.countDocuments({ status: { $ne: 'closed' } });

    res.status(200).json({
      status: 'success',
      data: {
        users: {
          total: totalUsers,
          trialing: trialUsers,
          activePaid: activePaidUsers,
          expired: expiredUsers
        },
        plans: {
          starter: starterUsers,
          growth: growthUsers,
          professional: professionalUsers
        },
        usage: {
          totalReports,
          auditReports,
          profilerReports,
          readinessReports,
          searchReports
        },
        inquiries: {
          open: openInquiries
        }
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('-password')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: admins.length,
      data: {
        admins
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const newAdmin = await User.create({
      name,
      email,
      password,
      phone,
      role: 'admin'
    });

    res.status(201).json({
      status: 'success',
      data: {
        user: newAdmin
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.updateUserSubscription = async (req, res) => {
  try {
    const { userId, tier, status, expiresAt, trialUsed } = req.body;

    const updateData = {
      'subscription.tier': tier,
      'subscription.status': status,
      'subscription.expiresAt': expiresAt
    };

    if (trialUsed !== undefined) {
      updateData['subscription.trialUsed'] = trialUsed;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
