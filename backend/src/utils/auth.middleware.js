const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // Diagnostic: Log which endpoint hit auth failure and whether Authorization header existed at all
      const hasAuthHeader = !!req.headers.authorization;
      console.warn(`⚠️ [AUTH] No valid token | ${req.method} ${req.originalUrl} | Authorization header present: ${hasAuthHeader} | Value: ${hasAuthHeader ? req.headers.authorization.substring(0, 20) + '...' : 'NONE'}`);
      return res.status(401).json({ message: 'You are not logged in! Please log in to get access.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-very-secure-secret');

    // Diagnostic: Check if token is about to expire (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.exp - now;
    if (timeLeft < 300) {
      console.warn(`⚠️ [AUTH] Token expiring soon | ${req.method} ${req.originalUrl} | Expires in ${timeLeft}s`);
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      console.warn(`⚠️ [AUTH] User not found in DB | ${req.method} ${req.originalUrl} | Token user ID: ${decoded.id}`);
      return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
    }

    req.user = currentUser;
    next();
  } catch (err) {
    // Diagnostic: Log the specific error type (expired vs. malformed vs. other)
    const errType = err.name === 'TokenExpiredError' ? 'EXPIRED' : (err.name === 'JsonWebTokenError' ? 'INVALID' : err.name);
    console.warn(`⚠️ [AUTH] Token verification failed | ${req.method} ${req.originalUrl} | Reason: ${errType} — ${err.message}`);
    return res.status(401).json({ message: 'Invalid token or session expired.' });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};

exports.checkSubscription = (requiredTier) => {
  return async (req, res, next) => {
    try {
      const tiers = ['none', 'starter', 'growth', 'professional'];
      const userTier = req.user.subscription.tier || 'none';
      const userTierIndex = tiers.indexOf(userTier);
      const requiredTierIndex = tiers.indexOf(requiredTier);

      if (userTierIndex < requiredTierIndex) {
        return res.status(403).json({ 
          message: `This feature requires a ${requiredTier} subscription or higher.`,
          requiredTier
        });
      }

      // 1. Handle Monthly Prompt Reset
      const now = new Date();
      const lastReset = req.user.subscription.lastPromptReset || req.user.createdAt || now;
      const daysSinceReset = Math.floor((now - new Date(lastReset)) / (1000 * 60 * 60 * 24));

      if (daysSinceReset >= 30) {
        req.user.subscription.promptsUsedThisMonth = 0;
        req.user.subscription.lastPromptReset = now;
        await req.user.save();
        console.log(`🔄 Monthly prompt reset triggered for ${req.user.email}`);
      }

      // 2. Check Trial Limitations (Max 5 per day)
      if (userTier === 'starter' && req.user.subscription.status === 'trialing') {
        const today = new Date();
        const lastScan = req.user.subscription.lastTrialScanDate ? new Date(req.user.subscription.lastTrialScanDate) : today;
        
        // Reset daily counter if it's a new day
        if (lastScan.getDate() !== today.getDate() || lastScan.getMonth() !== today.getMonth() || lastScan.getFullYear() !== today.getFullYear()) {
          req.user.subscription.trialScansUsedToday = 0;
          req.user.subscription.lastTrialScanDate = today;
          await req.user.save();
        }

        const trialUsedToday = req.user.subscription.trialScansUsedToday || 0;
        if (trialUsedToday >= 5) {
          return res.status(403).json({
            message: `Free trial daily limit (5 scans) reached. Please upgrade to unlock unlimited daily scans.`,
            upgradeRequired: true,
            limit: 5,
            used: trialUsedToday
          });
        }
      }

      // 3. Check Prompt Limits (Renamed to Scans in terminology, but keeping variable for logic)
      const promptLimits = {
        'none': 0,
        'starter': 10,
        'growth': 15,
        'professional': 20
      };

      const currentUsed = req.user.subscription.promptsUsedThisMonth || 0;
      const limit = promptLimits[userTier] || 0;

      if (currentUsed >= limit) {
        return res.status(403).json({ 
          message: `Monthly prompt limit (${limit}) reached for your ${userTier} tier.`,
          upgradeRequired: true,
          limit,
          used: currentUsed
        });
      }

      next();
    } catch (err) {
      console.error('Subscription Check Error:', err);
      res.status(500).json({ message: 'Error verifying subscription status' });
    }
  };
};
