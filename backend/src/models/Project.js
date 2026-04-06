const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  brandName: {
    type: String,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  prompts: [{
    type: String,
    trim: true
  }],
  competitors: [{
    name: { type: String, trim: true },
    domain: { type: String, trim: true }
  }],
  customPrompts: [{
    text: { type: String, trim: true },
    label: { type: String, trim: true }
  }],
  targetEngines: [{
    type: String,
    enum: ['openai', 'gemini'],
    default: ['openai', 'gemini']
  }],
  market: {
    name: { type: String, default: 'Global' },
    code: { type: String, default: 'GLB' },
    type: { type: String, enum: ['region', 'country', 'global'], default: 'global' },
    context: { type: String }
  },
  settings: {
    dailyScanEnabled: {
      type: Boolean,
      default: true
    },
    notifyOnDrop: {
      type: Boolean,
      default: true
    }
  },
  lastScanAt: Date,
  isScanning: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster lookups
ProjectSchema.index({ userId: 1, domain: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
