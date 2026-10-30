const Booking = require('../models/Booking');

/**
 * Helper to extract a friendly city name from full address string
 */
function extractCity(address, fallback = 'Indore') {
  if (!address || typeof address !== 'string') return fallback;
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length >= 2 && !/division|state|pradesh|india|district/i.test(parts[1])) {
    return parts[1];
  }
  if (!/division|state|pradesh|india/i.test(parts[0])) {
    return parts[0];
  }
  return fallback;
}

/**
 * @desc    Get real public customer reviews for homepage
 * @route   GET /api/reviews
 * @access  Public
 */
exports.getPublicReviews = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    // Find bookings with ratings between 1 and 5
    const bookings = await Booking.find({
      'rating.stars': { $exists: true, $gte: 1, $lte: 5 }
    })
      .populate('user', 'firstName lastName profilePicture location address')
      .populate('vehicle', 'brand model type')
      .lean();

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Sort: written reviews first, then by ratedAt / createdAt desc
    bookings.sort((a, b) => {
      const aHasReview = Boolean(a.rating?.review && a.rating.review.trim().length > 0);
      const bHasReview = Boolean(b.rating?.review && b.rating.review.trim().length > 0);
      if (aHasReview !== bHasReview) {
        return aHasReview ? -1 : 1;
      }
      const dateA = new Date(a.rating?.ratedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.rating?.ratedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const reviews = bookings.slice(0, limit).map(b => {
      const firstName = b.user?.firstName || '';
      const lastName = b.user?.lastName || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Customer';

      // Determine city
      let city = '';
      if (b.user?.address?.city) {
        city = b.user.address.city;
      } else if (b.user?.location) {
        city = b.user.location.split(',')[0].trim();
      } else if (b.tripDetails?.pickup?.address) {
        city = extractCity(b.tripDetails.pickup.address);
      } else {
        city = 'Indore';
      }

      // Comment
      const rawReview = (b.rating?.review || '').trim();
      const comment = rawReview || (b.rating?.stars >= 4 ? 'Great experience and smooth ride!' : 'Verified trip with Chalo Sawari');

      return {
        id: String(b._id),
        rating: b.rating?.stars || 5,
        comment,
        name: fullName,
        city,
        profilePicture: b.user?.profilePicture || null,
        ratedAt: b.rating?.ratedAt || b.updatedAt || b.createdAt,
        bookingNumber: b.bookingNumber || null,
        vehicle: b.vehicle ? `${b.vehicle.brand || ''} ${b.vehicle.model || ''}`.trim() : null
      };
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching public reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer reviews',
      error: error.message
    });
  }
};
