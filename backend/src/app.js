const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const scanRoutes = require('./routes/scan.routes');
const brandRoutes = require('./routes/brand.routes');
const profilerRoutes = require('./routes/profiler.routes');
const aiReadinessRoutes = require('./routes/aiReadiness.routes');
const liveRoutes = require('./routes/live.routes');
const websearchRoutes = require('./routes/websearch.routes');
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const razorpayRoutes = require('./routes/razorpay.routes');
const inquiryRoutes = require('./routes/inquiry.routes');
const faqRoutes = require('./routes/faq.routes');
const adminRoutes = require('./routes/admin.routes');
const logger = require('./utils/logger');

const app = express();

const allowedOrigins = [
  'https://app.aisonx.com',
  'http://localhost:5173'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, api-key');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Middleware
app.use((req, res, next) => {
  console.log(`\n📢 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json({
  verify: (req, res, buf) => {
    try {
      if (buf && buf.length) {
        req.rawBody = buf.toString();
        console.log('📦 Raw Body:', req.rawBody);
      }
    } catch (e) {
      console.log('⚠️ Error capturing raw body:', e.message);
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Database
connectDB();

// Routes
app.use('/api/scan', scanRoutes);
app.use('/api/brand', brandRoutes);
app.use('/api/profiler', profilerRoutes);
app.use('/api/websearch', websearchRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', razorpayRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', aiReadinessRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('Aisonx API is running...');
});

// 404 — Route Not Found
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'This endpoint does not exist.' });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
// This catches ALL errors thrown in any route/controller
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Always log the full error on the server
  logger.error(`❌ [${req.method}] ${req.url} — ${err.message}`, isDev ? err.stack : '');

  // --- Specific known error types ---

  // JWT / Auth errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Your session has expired. Please log in again.' });
  }

  // MongoDB validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: 'Validation Error', message: messages.join(', ') });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: 'Duplicate', message: `This ${field} is already in use.` });
  }

  // OpenAI / Gemini rate limit passed through
  if (err.status === 429 || err.message?.includes('429') || err.message?.includes('rate limit')) {
    return res.status(429).json({ error: 'Rate Limited', message: 'Our AI systems are busy. Please wait a moment and try again.' });
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Access Denied', message: 'This origin is not permitted.' });
  }

  // Default: never leak stack trace to user in production
  res.status(err.status || 500).json({
    error: 'Something went wrong',
    message: isDev ? err.message : 'An error occurred. Please try again shortly.',
  });
});

module.exports = app;
