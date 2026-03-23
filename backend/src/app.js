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

// CORS CONFIG
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, api-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', err);
  
  // Handle CORS errors specifically if needed
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'This origin is not allowed to access this resource.'
    });
  }

  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred'
  });
});

module.exports = app;
