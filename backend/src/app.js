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
const allowedOrigins = [
  'https://brandvisibility.aisonx.com',
  'https://aisonxdashboard.onrender.com',
  'https://aisonxdashboard.netlify.app',
  'http://localhost:5173',
  'https://aisonx.com',
  'http://aisonx.com',
  'https://www.aisonx.com',
  'http://www.aisonx.com',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:5502',
  'http://127.0.0.1:5502'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isAllowedCustom = process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL;

    if (allowedOrigins.indexOf(origin) !== -1 || (isLocalhost && process.env.NODE_ENV !== 'production') || isAllowedCustom) {
      callback(null, true);
    } else {
      logger.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'api-key']
}));

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
