const User = require('../models/User');
const Project = require('../models/Project');
const Inquiry = require('../models/Inquiry');
const AIVisibilityReport = require('../models/AIVisibilityReport');
const ProfilerReport = require('../models/ProfilerReport');
const ReadinessReport = require('../models/ReadinessReport');
const WebsearchReport = require('../models/WebsearchReport');
const redis = require('../config/redis');
const mongoose = require('mongoose');
const { scanQueue } = require('../queues/scanQueue');
const logger = require('../utils/logger');

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

    // 5) Revenue Stats
    const allUsers = await User.find({ role: 'user' }, 'subscription.paymentHistory');
    let totalRevenue = 0;
    let mrrRevenue = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    allUsers.forEach(user => {
      if (user.subscription?.paymentHistory) {
        user.subscription.paymentHistory.forEach(payment => {
          const amount = payment.amount || 0;
          totalRevenue += amount;
          if (payment.paidAt && new Date(payment.paidAt) >= thirtyDaysAgo) {
            mrrRevenue += amount;
          }
        });
      }
    });

    // 5) System Diagnostics
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbLatency = Date.now() - dbStart;
    } catch (e) {
      dbLatency = -1;
    }

    const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024); // heap in MB
    const uptime = Math.round(process.uptime()); // uptime in seconds

    // 6) Redis Queue Statistics
    let queueStats = { active: 0, waiting: 0, completed: 0, failed: 0 };
    try {
      queueStats = {
        active: await scanQueue.getActiveCount(),
        waiting: await scanQueue.getWaitingCount(),
        completed: await scanQueue.getCompletedCount(),
        failed: await scanQueue.getFailedCount()
      };
    } catch (e) {
      // Redis fallback
    }

    const isConnected = redis.status === 'ready' || redis.status === 'connect';
    const recentUsers = await User.find({ role: 'user' }, 'name email subscription.tier subscription.status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

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
          searchReports,
          systemStatus: isConnected ? 'Healthy' : 'Degraded'
        },
        inquiries: {
          open: openInquiries
        },
        revenue: {
          total: totalRevenue,
          mrr: mrrRevenue
        },
        diagnostics: {
          dbLatency,
          memoryUsage,
          uptime
        },
        queue: queueStats,
        recentUsers
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
const cronService = require('../services/cron.service');

exports.triggerDailyScan = async (req, res) => {
  try {
    logger.info(`🛠️ [ADMIN-TRIGGER] Manual daily scan triggered by admin: ${req.user.email}`);
    
    // We don't await this because it can take a long time. 
    // We fire it in the background and return a 202 Accepted.
    cronService.runAllProjectScans().catch(err => {
      logger.error('❌ [ADMIN-TRIGGER] Background daily scan failed:', err.message);
    });

    res.status(202).json({
      status: 'success',
      message: 'Daily scan master process has been triggered in the background.'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.clearScanQueue = async (req, res) => {
  try {
    logger.info(`🛠️ [ADMIN-TRIGGER] Manual scan queue purge triggered by admin: ${req.user.email}`);
    await scanQueue.drain(true); // Drains active/waiting jobs
    res.status(200).json({
      status: 'success',
      message: 'Scan queue waitlist successfully purged.'
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

const Plan = require('../models/Plan');

exports.getPackages = async (req, res) => {
  try {
    const packages = await Plan.find().sort({ price: 1 });
    res.status(200).json({
      status: 'success',
      data: {
        packages
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, description, monthlyScans, promptsPerProject, features, bestFor, trial } = req.body;

    const updatedPlan = await Plan.findByIdAndUpdate(
      id,
      { price, description, monthlyScans, promptsPerProject, features, bestFor, trial },
      { new: true, runValidators: true }
    );

    if (!updatedPlan) {
      return res.status(404).json({ message: 'Package plan not found' });
    }

    logger.info(`💰 [ADMIN] Package ${updatedPlan.name} updated by admin: ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      data: {
        package: updatedPlan
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

const Scan = require('../models/Scan');
const Snapshot = require('../models/Snapshot');

exports.getScanExplorerLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const activeType = req.query.type || 'All';

    // Fetch slightly more items to ensure correct chronologically sorted slicing in JS
    const queryLimit = skip + limit + 10;

    let scans = [];
    let visibilityReports = [];
    let profilerReports = [];
    let readinessReports = [];
    let websearchReports = [];
    let projectSnapshots = [];
    
    let scansCount = 0;
    let visibilityCount = 0;
    let profilerCount = 0;
    let readinessCount = 0;
    let websearchCount = 0;
    let snapshotCount = 0;

    const queryPromises = [];

    if (activeType === 'All' || activeType === 'AI Visibility Scan') {
      queryPromises.push(Scan.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(queryLimit).then(res => scans = res));
      queryPromises.push(AIVisibilityReport.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(queryLimit).then(res => visibilityReports = res));
      queryPromises.push(Scan.countDocuments().then(c => scansCount = c));
      queryPromises.push(AIVisibilityReport.countDocuments().then(c => visibilityCount = c));
    }

    if (activeType === 'All' || activeType === 'Domain Profiler') {
      queryPromises.push(ProfilerReport.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(queryLimit).then(res => profilerReports = res));
      queryPromises.push(ProfilerReport.countDocuments().then(c => profilerCount = c));
    }

    if (activeType === 'All' || activeType === 'Readiness Report') {
      queryPromises.push(ReadinessReport.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(queryLimit).then(res => readinessReports = res));
      queryPromises.push(ReadinessReport.countDocuments().then(c => readinessCount = c));
    }

    if (activeType === 'All' || activeType === 'Web Search Report') {
      queryPromises.push(WebsearchReport.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(queryLimit).then(res => websearchReports = res));
      queryPromises.push(WebsearchReport.countDocuments().then(c => websearchCount = c));
    }

    if (activeType === 'All' || activeType === 'Project Automated Scan') {
      queryPromises.push(Snapshot.find().populate({
        path: 'projectId',
        populate: { path: 'userId', select: 'name email' }
      }).sort({ createdAt: -1 }).limit(queryLimit).then(res => projectSnapshots = res));
      queryPromises.push(Snapshot.countDocuments().then(c => snapshotCount = c));
    }

    await Promise.all(queryPromises);

    const totalLogs = scansCount + visibilityCount + profilerCount + readinessCount + websearchCount + snapshotCount;
    const totalPages = Math.ceil(totalLogs / limit);

    // Map each to a unified format
    const unifiedLogs = [
      ...scans.map(s => ({
        _id: s._id,
        type: 'AI Visibility Scan',
        user: s.user || { name: 'Anonymous', email: 'N/A' },
        target: s.brandName,
        meta: s.query || 'LLM Live Scan',
        score: s.results?.score || null,
        createdAt: s.createdAt
      })),
      ...visibilityReports.map(vr => ({
        _id: vr._id,
        type: 'AI Visibility Scan',
        user: vr.user || { name: 'System', email: 'N/A' },
        target: vr.brandName,
        meta: 'AI Engines Visibility Audit',
        score: vr.results?.score || vr.results?.profile?.visibilityScore || null,
        createdAt: vr.createdAt
      })),
      ...profilerReports.map(pr => ({
        _id: pr._id,
        type: 'Domain Profiler',
        user: pr.user || { name: 'System', email: 'N/A' },
        target: pr.domain,
        meta: pr.coreOffering || 'Web profile analysis',
        score: null,
        createdAt: pr.createdAt
      })),
      ...readinessReports.map(rr => ({
        _id: rr._id,
        type: 'Readiness Report',
        user: rr.user || { name: 'System', email: 'N/A' },
        target: rr.url,
        meta: `Sitemap found: ${rr.totalPages || 0} pages`,
        score: rr.coverageScore || null,
        createdAt: rr.createdAt
      })),
      ...websearchReports.map(wr => ({
        _id: wr._id,
        type: 'Web Search Report',
        user: wr.user || { name: 'System', email: 'N/A' },
        target: wr.brandName || wr.query || 'Web query search',
        meta: wr.query ? `Query: "${wr.query}"` : 'Web search crawler',
        score: wr.results?.score || wr.results?.profile?.visibilityScore || null,
        createdAt: wr.createdAt
      })),
      ...projectSnapshots.map(ps => {
        const userObj = ps.projectId?.userId || { name: 'System', email: 'N/A' };
        
        // Extract unique prompt texts from promptRankings or projectId
        const prompts = (ps.promptRankings || []).map(pr => pr.prompt).filter(Boolean);
        const fallbackPrompts = ps.projectId?.prompts || [];
        const finalPrompts = prompts.length > 0 ? prompts : fallbackPrompts;
        const uniquePrompts = [...new Set(finalPrompts)].filter(Boolean);
        const promptsStr = uniquePrompts.length > 0 
          ? uniquePrompts.slice(0, 3).join(', ') + (uniquePrompts.length > 3 ? '...' : '')
          : 'Automated Sync';

        return {
          _id: ps._id,
          type: 'Project Automated Scan',
          user: typeof userObj === 'object' && userObj.name ? userObj : { name: 'System', email: 'N/A' },
          target: ps.projectId?.domain || ps.projectId?.brandName || 'Project Scan',
          meta: promptsStr,
          score: ps.overallScore || null,
          createdAt: ps.createdAt
        };
      })
    ];

    // Sort by createdAt descending
    unifiedLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit final set to paginated window
    const paginatedLogs = unifiedLogs.slice(skip, skip + limit);

    res.status(200).json({
      status: 'success',
      results: paginatedLogs.length,
      data: {
        logs: paginatedLogs,
        pagination: {
          totalLogs,
          totalPages,
          currentPage: page,
          limit
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};
