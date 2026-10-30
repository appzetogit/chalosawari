const express = require('express');
const { body } = require('express-validator');
const {
  createRazorpayOrder,
  verifyRazorpayPayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Admin payment views live under /api/admin/payments (protectAdmin)
router.use(protect);

router.post('/create-order', [
  body('amount').isFloat({ min: 1, max: 500000 }).withMessage('Amount must be between ₹1 and ₹5,00,000'),
  body('currency').optional().isString().withMessage('Currency must be a string'),
  body('receipt').optional().isString().withMessage('Receipt must be a string'),
  body('notes').optional().isObject().withMessage('Notes must be an object')
], validate, createRazorpayOrder);

router.post('/verify', [
  body('razorpayOrderId').isString().withMessage('Razorpay order ID is required'),
  body('razorpayPaymentId').isString().withMessage('Razorpay payment ID is required'),
  body('razorpaySignature').isString().withMessage('Razorpay signature is required'),
  body('bookingId').optional().isString().withMessage('Invalid booking ID format'),
  body('paymentMethod').optional().isIn(['razorpay', 'card', 'upi', 'netbanking', 'wallet', 'emi']).withMessage('Invalid payment method'),
  body('currency').optional().isString().withMessage('Currency must be a string')
], validate, verifyRazorpayPayment);

module.exports = router;
