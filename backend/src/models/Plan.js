const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  features: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  bestFor: {
    type: String,
    default: ''
  },
  trial: {
    type: String,
    default: null
  },
  monthlyScans: {
    type: Number,
    default: 10
  },
  promptsPerProject: {
    type: Number,
    default: 2
  }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
