const mongoose = require('mongoose');

const SnapshotSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  engineScores: {
    openai: { type: Number, default: 0 },
    gemini: { type: Number, default: 0 },
    groq: { type: Number, default: 0 }
  },
  promptRankings: [{
    prompt: { type: String, required: true },
    engine: { type: String, required: true },
    visibility: { type: String, default: 'None' },
    found: { type: Boolean, default: false },
    linkFound: { type: Boolean, default: false },
    rank: { type: Number, default: 0 },
    linkRank: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    snippet: { type: String },
    citations: [{ type: String }],
    authoritySource: { type: String }
  }],
  competitorRankings: [{
    competitorName: { type: String },
    competitorDomain: { type: String },
    prompt: { type: String },
    engine: { type: String },
    visibility: { type: String },
    found: { type: Boolean },
    score: { type: Number },
    rank: { type: Number, default: 0 }
  }],
  authoritySignals: {
    trainingRecall: { type: Number, default: 0 },
    webGroundedRecency: { type: Number, default: 0 },
    topCitations: [{
      source: String,
      type: { type: String, enum: ['Training', 'Web', 'Social', 'Technical'] },
      relevance: Number
    }]
  },
  customPromptResults: [{
    promptText: { type: String },
    engine: { type: String },
    brandMentioned: { type: Boolean },
    sentiment: { type: String },
    fullResponse: { type: String }
  }],
    technicalAudit: {
      robotsValid: Boolean,
      sitemapFound: Boolean,
      schemaCount: Number,
      pageSpeedScore: Number
    },
    domainSynthesis: { type: Object },
    aiReadiness: { type: Object },
    webMentions: { type: Object },
    visibilityAudit: { type: Object },
    brandAudit: { type: Object },
    summary: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Composite index for time-series queries
SnapshotSchema.index({ projectId: 1, date: -1 });

module.exports = mongoose.model('Snapshot', SnapshotSchema);
