const Booking = require('../models/Booking');

/**
 * @desc    Get all ratings & reviews for admin panel
 * @route   GET /api/admin/reviews
 * @access  Private (Admin)
 */
exports.getAdminReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      stars,
      hasReviewText,
      startDate,
      endDate,
      sortBy = 'newest'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);

    // Base query: bookings where rating.stars exists and is between 1 and 5
    const baseFilter = {
      'rating.stars': { $exists: true, $gte: 1, $lte: 5 }
    };

    // Filter by stars count
    if (stars && stars !== 'all') {
      baseFilter['rating.stars'] = Number(stars);
    }

    // Filter by written review existence
    if (hasReviewText === 'true') {
      baseFilter['rating.review'] = { $exists: true, $nin: ['', null] };
    }

    // Date range filter (on ratedAt if exists, else createdAt)
    if (startDate || endDate) {
      const dateQuery = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateQuery.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
      baseFilter.$or = [
        { 'rating.ratedAt': dateQuery },
        { createdAt: dateQuery }
      ];
    }

    // Fetch all rated bookings matching base criteria to calculate global stats
    const allMatchingBookings = await Booking.find(baseFilter)
      .populate('user', 'firstName lastName phone email')
      .populate('driver', 'firstName lastName phone email')
      .populate('vehicle', 'brand model type registrationNumber')
      .lean();

    // In-memory search filtering (for user/driver names, phone, vehicle, review text, bookingNumber)
    let filtered = allMatchingBookings;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(b => {
        const bNum = (b.bookingNumber || '').toLowerCase();
        const userName = `${b.user?.firstName || ''} ${b.user?.lastName || ''}`.toLowerCase();
        const userPhone = (b.user?.phone || '').toLowerCase();
        const driverName = `${b.driver?.firstName || ''} ${b.driver?.lastName || ''}`.toLowerCase();
        const driverPhone = (b.driver?.phone || '').toLowerCase();
        const vehicle = `${b.vehicle?.brand || ''} ${b.vehicle?.model || ''} ${b.vehicle?.registrationNumber || ''}`.toLowerCase();
        const review = (b.rating?.review || '').toLowerCase();
        const pickup = (b.tripDetails?.pickup?.address || '').toLowerCase();
        const dest = (b.tripDetails?.destination?.address || '').toLowerCase();

        return (
          bNum.includes(q) ||
          userName.includes(q) ||
          userPhone.includes(q) ||
          driverName.includes(q) ||
          driverPhone.includes(q) ||
          vehicle.includes(q) ||
          review.includes(q) ||
          pickup.includes(q) ||
          dest.includes(q)
        );
      });
    }

    // Global Statistics based on all rated bookings (or current date filter)
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalStars = 0;
    let withReviewCount = 0;

    filtered.forEach(b => {
      const s = b.rating?.stars;
      if (s && starCounts[s] !== undefined) {
        starCounts[s] += 1;
        totalStars += s;
      }
      if (b.rating?.review && b.rating.review.trim().length > 0) {
        withReviewCount += 1;
      }
    });

    const totalRatings = filtered.length;
    const averageRating = totalRatings > 0 ? Number((totalStars / totalRatings).toFixed(1)) : 0;

    // Sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.rating?.ratedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.rating?.ratedAt || b.createdAt || 0).getTime();
      const starsA = a.rating?.stars || 0;
      const starsB = b.rating?.stars || 0;

      if (sortBy === 'oldest') return dateA - dateB;
      if (sortBy === 'highest') return starsB - starsA || dateB - dateA;
      if (sortBy === 'lowest') return starsA - starsB || dateB - dateA;
      return dateB - dateA; // default: newest
    });

    // Pagination
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = filtered.slice(startIndex, startIndex + limitNum);

    // Format output
    const reviews = paginatedItems.map(b => {
      const customerName = [b.user?.firstName, b.user?.lastName].filter(Boolean).join(' ') || 'Customer';
      const driverName = [b.driver?.firstName, b.driver?.lastName].filter(Boolean).join(' ') || 'Driver';
      const vehicleName = [b.vehicle?.brand, b.vehicle?.model].filter(Boolean).join(' ') || (b.vehicle?.type || 'Vehicle');

      return {
        _id: b._id,
        bookingNumber: b.bookingNumber || `#${String(b._id).slice(-6)}`,
        date: b.tripDetails?.date || (b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB') : '—'),
        time: b.tripDetails?.time || '—',
        createdAt: b.createdAt,
        ratedAt: b.rating?.ratedAt || b.updatedAt || b.createdAt,
        rating: {
          stars: b.rating?.stars || 0,
          review: b.rating?.review || '',
          ratedAt: b.rating?.ratedAt || b.updatedAt || b.createdAt
        },
        customer: {
          _id: b.user?._id,
          name: customerName,
          phone: b.user?.phone || '—',
          email: b.user?.email || ''
        },
        driver: {
          _id: b.driver?._id,
          name: driverName,
          phone: b.driver?.phone || '—',
          email: b.driver?.email || ''
        },
        vehicle: {
          _id: b.vehicle?._id,
          name: vehicleName,
          type: b.vehicle?.type || 'car',
          registrationNumber: b.vehicle?.registrationNumber || ''
        },
        route: {
          pickup: b.tripDetails?.pickup?.address || '—',
          destination: b.tripDetails?.destination?.address || '—',
          distance: b.tripDetails?.distance || 0,
          tripType: b.tripDetails?.tripType || b.tripType || 'one-way'
        },
        pricing: {
          totalAmount: b.pricing?.totalAmount || 0,
          driverFare: b.pricing?.driverFare || 0,
          discount: b.pricing?.discount || 0
        },
        status: b.status
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Ratings and reviews retrieved successfully',
      data: {
        reviews,
        summary: {
          totalRatings,
          averageRating,
          starCounts,
          withReviewCount,
          withoutReviewCount: totalRatings - withReviewCount,
          positivePercentage: totalRatings > 0 ? Math.round(((starCounts[5] + starCounts[4]) / totalRatings) * 100) : 0
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalRecords,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};
