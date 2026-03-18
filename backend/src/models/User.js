const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit phone number!`
    }
  },
  password: {
    type: String,
    required: true
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    tier: {
      type: String,
      enum: ['none', 'starter', 'growth', 'professional'],
      default: 'none'
    },
    razorpayCustomerId: String,
    razorpaySubscriptionId: String,
    status: {
      type: String,
      default: 'inactive'
    },
    expiresAt: Date,
    promptsUsedThisMonth: {
      type: Number,
      default: 0
    },
    lastPromptReset: {
      type: Date,
      default: Date.now
    },
    trialUsed: {
      type: Boolean,
      default: false
    },
    trialScansUsedToday: {
      type: Number,
      default: 0
    },
    lastTrialScanDate: {
      type: Date,
      default: Date.now
    },
    paymentHistory: [
      {
        orderId: String,
        paymentId: String,
        planName: String,
        amount: Number,
        currency: { type: String, default: 'INR' },
        paidAt: { type: Date, default: Date.now }
      }
    ]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt)
  } catch (err) {
    throw err;
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
UserSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

module.exports = mongoose.model('User', UserSchema);
