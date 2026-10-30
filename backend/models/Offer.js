const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Offer title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  // Short line under the title on the offer card, e.g. "On Bus Bookings"
  description: {
    type: String,
    trim: true,
    maxlength: [100, 'Description cannot exceed 100 characters'],
    default: ''
  },
  image: {
    type: String,
    trim: true,
    default: ''
  },
  // Coupon the user types at checkout
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true, // offers created before coupons existed have no code
    match: [/^[A-Z0-9]{3,20}$/, 'Code must be 3-20 letters or digits']
  },
  discountType: {
    type: String,
    enum: ['percent', 'flat'],
    default: 'percent'
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [1, 'Discount must be at least 1']
  },
  // Cap for percent discounts (0 = no cap)
  maxDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  minBookingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  vehicleType: {
    type: String,
    enum: ['all', 'car', 'bus'],
    default: 'all'
  },
  validTill: {
    type: Date
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
OfferSchema.index({ isActive: 1, createdAt: -1 });

// Discount (₹) a coupon gives on a booking amount; used by checkout preview and booking creation alike.
// Returns { offer, discount } or { error }.
OfferSchema.statics.applyCoupon = async function(code, { amount, vehicleType }) {
  const offer = await this.findOne({ code: String(code || '').trim().toUpperCase() });
  if (!offer || !offer.isActive) return { error: 'Invalid coupon code' };
  if (offer.validTill) {
    const endOfDay = new Date(offer.validTill);
    endOfDay.setHours(23, 59, 59, 999);
    if (endOfDay < new Date()) return { error: 'This coupon has expired' };
  }
  if (offer.vehicleType !== 'all' && offer.vehicleType !== vehicleType) {
    return { error: `This coupon is only valid on ${offer.vehicleType} bookings` };
  }
  if (amount < (offer.minBookingAmount || 0)) {
    return { error: `Minimum booking amount for this coupon is ₹${offer.minBookingAmount}` };
  }

  let discount = offer.discountType === 'percent'
    ? Math.round(amount * offer.discountValue / 100)
    : offer.discountValue;
  if (offer.discountType === 'percent' && offer.maxDiscount > 0) discount = Math.min(discount, offer.maxDiscount);
  return { offer, discount: Math.min(discount, amount) };
};

module.exports = mongoose.model('Offer', OfferSchema);
