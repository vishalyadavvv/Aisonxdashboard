const mongoose = require('mongoose');

const ProfilerReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  domainType: String,
  brandType: String,
  brandFocus: String,
  description: String,
  coreOffering: String,
  sentiment: String,
  topics: [String],
  competitors: [String],
  prompts: [String],
  presenceTags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ProfilerReport', ProfilerReportSchema);
