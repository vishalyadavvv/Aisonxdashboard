const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be anonymous scan, but meaningful for Reports if owned
  },
  brandName: {
    type: String,
    required: true
  },
  query: {
    type: String,
    required: true
  },
  results: {
    openai: String,
    gemini: String,
    perplexity: String,
    score: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Scan', ScanSchema);
