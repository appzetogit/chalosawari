const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  sendOTPForAuth,
  verifyOTPAndProceed,
  registerUser,
  resendOTP,
  sendDriverOTP,
  verifyDriverOTPAndProceed,
  resendDriverOTP,
  logout,
  getMe
} = require('../controllers/authController');
const { protect, protectDriver, protectAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Validation rules
const phoneValidation = [
  body('phone')
    .custom((value) => {
      // Remove country code if present
      const digits = value.replace(/[^0-9]/g, '');
      if (digits.length === 10) return true;
      if (digits.length > 10 && digits.slice(-10).match(/^[0-9]{10}$/)) return true;
      throw new Error('Please provide a valid 10-digit phone number');
    })
    .withMessage('Please provide a valid 10-digit phone number')
];

const otpValidation = [
  body('phone')
    .custom((value) => {
      const digits = value.replace(/[^0-9]/g, '');
      if (digits.length === 10) return true;
      if (digits.length > 10 && digits.slice(-10).match(/^[0-9]{10}$/)) return true;
      throw new Error('Please provide a valid 10-digit phone number');
    })
    .withMessage('Please provide a valid 10-digit phone number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
  body('purpose')
    .optional()
    .isIn(['signup', 'login', 'auth'])
    .withMessage('Purpose must be either signup, login, or auth')
];

const userDataValidation = [
  body('userData.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('userData.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('userData.password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('userData.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('userData.gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('Please provide a valid gender'),
  body('userData.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
];

const driverDataValidation = [
  body('driverData.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('driverData.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('driverData.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('driverData.gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Please provide a valid gender'),
  body('driverData.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('driverData.address.street')
    .optional()
    .isString()
    .withMessage('Street must be a string'),
  body('driverData.address.city')
    .optional()
    .isString()
    .withMessage('City must be a string'),
  body('driverData.address.state')
    .optional()
    .isString()
    .withMessage('State must be a string'),
  body('driverData.address.pincode')
    .optional()
    .isString()
    .withMessage('Pincode must be a string')
];

const driverRegistrationValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Max 5 OTP sends per phone per 15 min (stops SMS bombing / brute force via resend)
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => String(req.body?.phone || '').replace(/[^0-9]/g, '').slice(-10) || req.ip,
  message: { success: false, error: { message: 'Too many OTP requests. Please try again after 15 minutes.', statusCode: 429 } },
  standardHeaders: true,
  legacyHeaders: false
});

// Max 10 OTP verify attempts per phone per 15 min, across resends
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => String(req.body?.phone || '').replace(/[^0-9]/g, '').slice(-10) || req.ip,
  message: { success: false, error: { message: 'Too many attempts. Please try again after 15 minutes.', statusCode: 429 } },
  standardHeaders: true,
  legacyHeaders: false
});

// Public routes
router.post('/send-otp', otpSendLimiter, phoneValidation, validate, sendOTPForAuth);
router.post('/verify-otp', otpVerifyLimiter, otpValidation, validate, verifyOTPAndProceed);
router.post('/register', phoneValidation, validate, registerUser);
router.post('/resend-otp', otpSendLimiter, phoneValidation, validate, resendOTP);

// Driver OTP routes
router.post('/driver/send-otp', otpSendLimiter, phoneValidation, validate, sendDriverOTP);
router.post('/driver/verify-otp', otpVerifyLimiter, otpValidation, validate, verifyDriverOTPAndProceed);
router.post('/driver/resend-otp', otpSendLimiter, phoneValidation, validate, resendDriverOTP);


// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
