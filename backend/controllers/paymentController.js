const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const asyncHandler = require('../middleware/asyncHandler');
const RazorpayService = require('../services/razorpayService');

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private (User)
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency = 'INR', receipt, notes } = req.body;

  try {
    const orderData = {
      amount,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        ...notes,
        app: 'chalosawari', // lets the orphan-payment sweeper refund only this app's orders
        userId: req.user.id,
        userEmail: req.user.email,
        timestamp: new Date().toISOString(),
      },
    };

    const order = await RazorpayService.createOrder(orderData);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
});

// @desc    Verify Razorpay payment and record it (claimed by POST /api/bookings with paymentId)
// @route   POST /api/payments/verify
// @access  Private (User)
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay environment variables not configured');
      return res.status(500).json({
        success: false,
        message: 'Payment service not configured'
      });
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      bookingId,
      paymentMethod,
      currency = 'INR'
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields'
      });
    }

    if (!RazorpayService.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // One Razorpay payment can be recorded only once
    const existing = await Payment.findOne({ transactionId: razorpayPaymentId });
    if (existing) {
      if (existing.user.toString() !== req.user.id) {
        return res.status(409).json({ success: false, message: 'Payment already used' });
      }
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          paymentId: existing._id,
          transactionId: razorpayPaymentId,
          status: existing.status,
          amount: existing.amount,
          paymentMethod: existing.method
        }
      });
    }

    let paymentDetails;
    try {
      paymentDetails = await RazorpayService.getPaymentDetails(razorpayPaymentId);
    } catch (razorpayError) {
      console.error('Failed to fetch Razorpay payment details:', razorpayError.message);
      return res.status(502).json({
        success: false,
        message: 'Failed to fetch payment details'
      });
    }

    if (!paymentDetails || paymentDetails.status !== 'captured' || paymentDetails.orderId !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment not captured'
      });
    }

    // Amount comes from Razorpay (paise), never from the client
    const amountInRupees = paymentDetails.amount / 100;

    const paymentData = {
      user: req.user.id,
      amount: amountInRupees,
      currency,
      method: paymentMethod || 'razorpay',
      status: 'completed',
      type: 'booking',
      transactionId: razorpayPaymentId,
      paymentGateway: 'razorpay',
      paymentDetails: {
        razorpayOrderId,
        razorpayPaymentId,
        gatewayResponse: paymentDetails,
        method: paymentDetails.method,
        bank: paymentDetails.bank,
        card: paymentDetails.card,
        upi: paymentDetails.upi,
        wallet: paymentDetails.wallet,
        vpa: paymentDetails.vpa,
      },
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceType: 'web'
      }
    };

    if (bookingId) {
      paymentData.temporaryBookingId = bookingId;
    }

    const payment = await Payment.create(paymentData);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: payment._id,
        transactionId: razorpayPaymentId,
        status: 'completed',
        amount: amountInRupees,
        paymentMethod: payment.method,
        temporaryBookingId: bookingId
      }
    });
  } catch (error) {
    console.error('Payment verification failed:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
});

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment
};
