const mongoose = require('mongoose');

const ReadinessReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  domain: String,
  businessType: String,
  summary: String,
  coverageScore: Number,
  corePagesFound: Number,
  totalPages: Number,
  totalMissing: Number,
  queries: [{
    parentQuery: String,
    query: String,
    path: String,
    reason: String,
    intentType: String,
    queryLayer: String,
    status: String,
    action: String
  }],
  sitemapUrl: String,
  totalSitemapUrls: Number,
  method: String,
  isBlocked: { type: Boolean, default: false },
  blockReason: String,
  // Domain synthesis data (from profiler)
  domainType: String,
  brandType: String,
  brandFocus: String,
  coreOffering: String,
  sentiment: String,
  topics: [String],
  competitors: [String],
  prompts: [String],
  presenceTags: [String],
  // Sitemap breakdown
  pageUrls: Number,
  postUrls: Number,
  pageSitemapUrl: String,
  postSitemapUrl: String,
  technicalSignals: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ReadinessReport', ReadinessReportSchema);
