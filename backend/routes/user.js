const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getUserBookings,
  getUserPreferences,
  updateUserPreferences,
  deleteUserAccount,
  requestCancellation,
  rateBooking
} = require('../controllers/userController');
const { uploadAvatarWithErrorHandling } = require('../utils/imageUpload');

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation rules
const profileUpdateValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('Please provide a valid gender'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('profilePicture')
    .optional()
    .isString()
    .withMessage('Profile picture must be a string URL')
];

const preferencesValidation = [
  body('preferredVehicleType')
    .optional()
    .isIn(['bus', 'car', 'auto', 'any'])
    .withMessage('Please provide a valid vehicle type preference'),
  body('preferredSeat')
    .optional()
    .isIn(['window', 'aisle', 'any'])
    .withMessage('Please provide a valid seat preference'),
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be a boolean'),
  body('notifications.sms')
    .optional()
    .isBoolean()
    .withMessage('SMS notification preference must be a boolean'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification preference must be a boolean')
];

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', profileUpdateValidation, validate, updateUserProfile);
router.post('/avatar', uploadAvatarWithErrorHandling, uploadAvatar);

// Booking routes
router.get('/bookings', getUserBookings);
router.get('/bookings/:id', getUserBookings);
router.put('/bookings/:id/request-cancellation', [
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
], validate, requestCancellation);
router.put('/bookings/:id/rating', [
  body('stars').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1 to 5 stars'),
  body('review').optional().isString().trim().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters')
], validate, rateBooking);

// Preferences routes
router.get('/preferences', getUserPreferences);
router.put('/preferences', preferencesValidation, validate, updateUserPreferences);

// Account management
router.delete('/account', deleteUserAccount);

module.exports = router;
