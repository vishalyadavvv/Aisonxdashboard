const mongoose = require('mongoose');

const WebsearchReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  brandName: {
    type: String,
    required: true
  },
  query: String,
  results: {
    openai: mongoose.Schema.Types.Mixed,
    gemini: mongoose.Schema.Types.Mixed,
    groq: mongoose.Schema.Types.Mixed,
    profile: mongoose.Schema.Types.Mixed,
    score: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WebsearchReport', WebsearchReportSchema);
