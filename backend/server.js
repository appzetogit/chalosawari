const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}

// Ensure public upload directories exist for VPS local storage
const uploadDirs = [
  path.join(__dirname, 'public/uploads/vehicles'),
  path.join(__dirname, 'public/uploads/offers'),
  path.join(__dirname, 'public/uploads/vehicle-documents'),
  path.join(__dirname, 'public/uploads/driver-documents'),
  path.join(__dirname, 'public/uploads/avatars')
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const driverRoutes = require('./routes/driver');
const adminRoutes = require('./routes/admin');
const vehicleRoutes = require('./routes/vehicle');
const bookingRoutes = require('./routes/booking');
const paymentRoutes = require('./routes/payment');
const adminPaymentRoutes = require('./routes/adminPayment');
const vehiclePricingRoutes = require('./routes/vehiclePricing');
const offerRoutes = require('./routes/offers');
const helpSupportRoutes = require('./routes/helpSupport');
const policyRoutes = require('./routes/policy');
const vehicleSettingRoutes = require('./routes/vehicleSetting');
const reviewRoutes = require('./routes/reviews');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

// Import database connection
const connectDB = require('./config/db');
const { getRoadDistanceKm } = require('./utils/roadDistance');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS: in production only FRONTEND_URL (comma-separated list) may call the API
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // limit each IP to 500 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 / 60),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Strip $ and . from keys in body/query/params (blocks NoSQL operator injection)
app.use(mongoSanitize());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Serve static upload files for VPS local storage
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));



// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Chalo Sawari Backend is running successfully!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Google Maps key is managed here so the frontend doesn't need it baked into its build
app.get('/api/config/maps-key', (req, res) => {
  res.json({ success: true, key: process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '' });
});

// Road (driving) distance used for search display and fares; distanceKm is null if Google can't route it
app.get('/api/config/distance', async (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.query;
  const nums = [fromLat, fromLng, toLat, toLng].map(Number);
  if (nums.some(n => !Number.isFinite(n))) {
    return res.status(400).json({ success: false, message: 'fromLat, fromLng, toLat and toLng are required numbers' });
  }
  const distanceKm = await getRoadDistanceKm(
    { latitude: nums[0], longitude: nums[1] },
    { latitude: nums[2], longitude: nums[3] }
  );
  res.json({ success: true, distanceKm });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/vehicle-pricing', vehiclePricingRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/help-support', helpSupportRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/vehicle-settings', vehicleSettingRoutes);
app.use('/api/reviews', reviewRoutes);



// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Chalo Sawari Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Chalo Sawari Backend Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close(false);
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close(false);
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;
