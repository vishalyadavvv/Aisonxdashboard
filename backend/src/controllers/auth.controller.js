const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-very-secure-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// In-memory OTP store: email -> { otp, name, email, phone, password, expiresAt }
const pendingRegistrations = new Map();

// Clean up expired OTPs every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of pendingRegistrations) {
    if (now > data.expiresAt) pendingRegistrations.delete(email);
  }
}, 10 * 60 * 1000);

const sendEmail = async (options) => {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'AIsonx Support', email: process.env.BREVO_SMTP_USER || 'info@dgtltechhub.com' },
        to: [{ email: options.email }],
        subject: options.subject,
        textContent: options.message
      },
      {
        headers: {
          'api-key': process.env.BREVO_SMTP_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Brevo API Error:', error.response?.data || error.message);
    throw new Error('Failed to send email via Brevo API');
  }
};

exports.sendRegisterOTP = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store pending registration (5 min expiry)
    pendingRegistrations.set(email.toLowerCase(), {
      otp,
      name,
      email: email.toLowerCase(),
      phone,
      password,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // Send OTP email
    console.log(`Verification OTP for ${email}: ${otp}`);
    await sendEmail({
      email,
      subject: 'AIsonx - Email Verification OTP',
      message: `Your OTP for registration is: ${otp}\n\nThis code is valid for 5 minutes. Do not share it with anyone.`
    });

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your email'
    });
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error('Error in sendRegisterOTP:', err);
    res.status(500).json({
      status: 'fail',
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Please provide email and OTP' });
    }

    const pending = pendingRegistrations.get(email.toLowerCase());

    if (!pending) {
      return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
    }

    if (Date.now() > pending.expiresAt) {
      pendingRegistrations.delete(email.toLowerCase());
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (pending.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // OTP verified — create user
    const user = await User.create({
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      password: pending.password
    });

    // Clean up
    pendingRegistrations.delete(email.toLowerCase());

    const token = signToken(user._id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          subscription: user.subscription
        }
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    const token = signToken(user._id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          subscription: user.subscription
        }
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for trial expiry
    if (user.subscription.status === 'trialing' && user.subscription.expiresAt && new Date() > user.subscription.expiresAt) {
      user.subscription.status = 'expired';
      await user.save();
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

exports.updateMe = async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone },
      { new: true, runValidators: true }
    );

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

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1) Get user from collection and check password
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    // 2) Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.startTrial = async (req, res) => {
  try {
    const { tier } = req.body;
    
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ⚠️ Check if trial was already used
    if (user.subscription.trialUsed && user.role !== 'admin') {
      return res.status(400).json({ 
        status: 'fail',
        message: 'Your free trial has already been used. Please upgrade to a paid plan.' 
      });
    }
    
    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    user.subscription.tier = tier.toLowerCase();
    user.subscription.status = 'trialing';
    user.subscription.expiresAt = expiresAt;
    user.subscription.trialUsed = true; // ✅ Mark as used

    await user.save();

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



exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'There is no user with that email address.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      const resetURL = `http://localhost:5173/reset-password/${resetToken}`;
      const message = `Forgot your password? Submit a new password and confirm it by clicking this link: \n${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

      await sendEmail({
        email: user.email,
        subject: 'Your password reset token (valid for 10 min)',
        message
      });

      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'There was an error sending the email. Try again later!' });
    }
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired' });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save(); // validation runs here to encrypt the new password

    // Log the user in automatically after resetting
    const token = signToken(user._id);

    res.status(200).json({
      status: 'success',
      token
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};
