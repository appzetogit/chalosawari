const { bookingSplit } = require('../utils/bookingSplit');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const asyncHandler = require('../middleware/asyncHandler');

// Escape user search text before using it in $regex
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Round amount to 2 decimal places to preserve exact decimals (e.g. ₹353.2)
const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

// @desc    Get earnings and profit breakdown for all listed vehicles
// @route   GET /api/admin/earnings/vehicles
// @access  Private (Admin)
const getVehicleEarnings = asyncHandler(async (req, res) => {
  const {
    search = '',
    type = 'all',
    startDate,
    endDate,
    sortBy = 'profit_desc',
    page = 1,
    limit = 50
  } = req.query;

  // 1. Build vehicle filter
  const vehicleQuery = {
    // Only listed/non-deleted vehicles
  };

  if (type && type !== 'all') {
    vehicleQuery.type = type.toLowerCase();
  }

  // Fetch all vehicles matching type with driver populated
  let vehicles = await Vehicle.find(vehicleQuery)
    .populate({
      path: 'driver',
      select: 'firstName lastName phone email profileImage'
    })
    .lean();

  // Apply search filter in-memory across vehicle brand, model, plate, or driver name/phone
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    vehicles = vehicles.filter((v) => {
      const brand = (v.brand || '').toLowerCase();
      const model = (v.pricingReference?.vehicleModel || '').toLowerCase();
      const plate = (v.registrationNumber || '').toLowerCase();
      const driverName = `${v.driver?.firstName || ''} ${v.driver?.lastName || ''}`.toLowerCase();
      const driverPhone = (v.driver?.phone || '').toLowerCase();
      return (
        brand.includes(term) ||
        model.includes(term) ||
        plate.includes(term) ||
        driverName.includes(term) ||
        driverPhone.includes(term)
      );
    });
  }

  const vehicleIds = vehicles.map((v) => v._id);

  // 2. Build booking date filter if provided
  const bookingMatch = {
    vehicle: { $in: vehicleIds }
  };

  if (startDate && endDate) {
    bookingMatch.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
    };
  }

  // 3. Fetch all bookings for these vehicles in period
  const bookings = await Booking.find(bookingMatch)
    .select('_id vehicle status pricing payment createdAt')
    .lean();

  // Group bookings by vehicleId
  const bookingsByVehicle = {};
  bookings.forEach((b) => {
    const vId = b.vehicle ? b.vehicle.toString() : null;
    if (!vId) return;
    if (!bookingsByVehicle[vId]) {
      bookingsByVehicle[vId] = [];
    }
    bookingsByVehicle[vId].push(b);
  });

  // 4. Calculate financial metrics for each vehicle
  let vehicleEarningsList = vehicles.map((v) => {
    const vId = v._id.toString();
    const vBookings = bookingsByVehicle[vId] || [];

    const totalBookings = vBookings.length;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let grossRevenue = 0;
    let totalPlatformFee = 0;
    let totalDiscount = 0;
    let netAdminProfit = 0;
    let driverEarnings = 0;

    vBookings.forEach((b) => {
      if (b.status === 'completed') {
        completedBookings++;
        const totalAmount = Number(b.pricing?.totalAmount) || 0;
        const platformFee = Number(b.pricing?.platformFee) || 0;
        const discount = Number(b.pricing?.discount) || 0;

        // Admin profit for this booking:
        // In the advance/partial payment system, the online amount collected via Razorpay is the admin's revenue/profit
        // If 100% full payment, platformFee minus discount (or online payment amount) is the profit
        // Shared rule with the driver app (utils/bookingSplit.js)
        const { platform: bookingAdminProfit, driver: bookingDriverFare } = bookingSplit(b);

        grossRevenue += totalAmount;
        totalPlatformFee += platformFee;
        totalDiscount += discount;
        netAdminProfit += bookingAdminProfit;
        driverEarnings += bookingDriverFare;
      } else if (b.status === 'cancelled') {
        cancelledBookings++;
      }
    });

    // Determine primary image
    let primaryImage = '';
    if (Array.isArray(v.images) && v.images.length > 0) {
      const primary = v.images.find((img) => typeof img === 'object' && img?.isPrimary);
      primaryImage = primary?.url || (typeof v.images[0] === 'object' ? v.images[0].url : v.images[0]) || '';
    }

    return {
      _id: v._id,
      brand: v.brand,
      model: v.pricingReference?.vehicleModel || v.brand,
      vehicleType: v.pricingReference?.vehicleType || v.type,
      category: v.type || v.pricingReference?.category || 'car',
      registrationNumber: v.registrationNumber,
      image: primaryImage,
      approvalStatus: v.approvalStatus || 'approved',
      driver: v.driver ? {
        _id: v.driver._id,
        name: `${v.driver.firstName || ''} ${v.driver.lastName || ''}`.trim() || 'Unassigned',
        phone: v.driver.phone || '',
        email: v.driver.email || ''
      } : null,
      stats: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        grossRevenue: round2(grossRevenue),
        driverEarnings: round2(driverEarnings),
        totalPlatformFee: round2(totalPlatformFee),
        totalDiscount: round2(totalDiscount),
        netAdminProfit: round2(netAdminProfit)
      }
    };
  });

  // 5. Sort list based on sortBy param
  if (sortBy === 'profit_desc') {
    vehicleEarningsList.sort((a, b) => b.stats.netAdminProfit - a.stats.netAdminProfit);
  } else if (sortBy === 'profit_asc') {
    vehicleEarningsList.sort((a, b) => a.stats.netAdminProfit - b.stats.netAdminProfit);
  } else if (sortBy === 'trips_desc') {
    vehicleEarningsList.sort((a, b) => b.stats.completedBookings - a.stats.completedBookings);
  } else if (sortBy === 'revenue_desc') {
    vehicleEarningsList.sort((a, b) => b.stats.grossRevenue - a.stats.grossRevenue);
  } else if (sortBy === 'name_asc') {
    vehicleEarningsList.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
  }

  // 6. Calculate overall summary statistics
  let overallAdminProfit = 0;
  let overallPlatformFee = 0;
  let overallDiscount = 0;
  let overallGrossRevenue = 0;
  let overallCompletedTrips = 0;
  let overallTotalBookings = 0;
  let topVehicle = null;

  vehicleEarningsList.forEach((item) => {
    overallAdminProfit += item.stats.netAdminProfit;
    overallPlatformFee += item.stats.totalPlatformFee;
    overallDiscount += item.stats.totalDiscount;
    overallGrossRevenue += item.stats.grossRevenue;
    overallCompletedTrips += item.stats.completedBookings;
    overallTotalBookings += item.stats.totalBookings;
    if (!topVehicle || item.stats.netAdminProfit > topVehicle.profit) {
      topVehicle = {
        _id: item._id,
        name: `${item.brand} ${item.model}`.trim(),
        registrationNumber: item.registrationNumber,
        profit: item.stats.netAdminProfit,
        trips: item.stats.completedBookings
      };
    }
  });

  res.json({
    success: true,
    data: {
      vehicles: vehicleEarningsList,
      summary: {
        totalVehicles: vehicleEarningsList.length,
        totalAdminProfit: round2(overallAdminProfit),
        totalPlatformFee: round2(overallPlatformFee),
        totalDiscount: round2(overallDiscount),
        totalGrossRevenue: round2(overallGrossRevenue),
        totalCompletedTrips: overallCompletedTrips,
        totalBookings: overallTotalBookings,
        topVehicle: topVehicle && topVehicle.profit > 0 ? topVehicle : null
      }
    }
  });
});

// @desc    Get detailed bookings and profit breakdown for a specific vehicle
// @route   GET /api/admin/earnings/vehicles/:vehicleId
// @access  Private (Admin)
const getVehicleBookingEarnings = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { startDate, endDate, status } = req.query;

  // 1. Find vehicle
  const vehicle = await Vehicle.findById(vehicleId)
    .populate({
      path: 'driver',
      select: 'firstName lastName phone email profileImage'
    })
    .lean();

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found'
    });
  }

  // 2. Query bookings for this vehicle
  const bookingQuery = { vehicle: vehicleId };

  if (status && status !== 'all') {
    bookingQuery.status = status;
  }

  if (startDate && endDate) {
    bookingQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
    };
  }

  const bookings = await Booking.find(bookingQuery)
    .populate({
      path: 'user',
      select: 'firstName lastName phone email'
    })
    .sort({ createdAt: -1 })
    .lean();

  // 3. Transform bookings with per-trip profit calculation
  let totalGross = 0;
  let totalPlatformFee = 0;
  let totalDiscount = 0;
  let totalAdminProfit = 0;
  let completedCount = 0;

  const formattedBookings = bookings.map((b) => {
    const totalAmount = Number(b.pricing?.totalAmount) || 0;
    const platformFee = Number(b.pricing?.platformFee) || 0;
    const discount = Number(b.pricing?.discount) || 0;
    const couponCode = b.pricing?.couponCode || '';

    // Profit logic:
    // In the advance/partial payment system, the online amount collected via Razorpay is the admin's revenue/profit
    // If full payment, platformFee minus discount is the profit
    // Shared rule with the driver app (utils/bookingSplit.js)
    const { platform: adminProfit, driver: driverFare } = bookingSplit(b);

    if (b.status === 'completed') {
      completedCount++;
      totalGross += totalAmount;
      totalPlatformFee += platformFee;
      totalDiscount += discount;
      totalAdminProfit += adminProfit;
    }

    // Customer name
    const customerName = b.user
      ? `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim() || 'Customer'
      : 'Guest Customer';

    return {
      _id: b._id,
      bookingNumber: b.bookingNumber || b._id.toString().slice(-6).toUpperCase(),
      createdAt: b.createdAt,
      date: b.tripDetails?.date || '',
      time: b.tripDetails?.time || '',
      tripType: b.tripDetails?.tripType || 'one-way',
      customer: {
        _id: b.user?._id,
        name: customerName,
        phone: b.user?.phone || 'N/A',
        email: b.user?.email || 'N/A'
      },
      route: {
        pickup: b.tripDetails?.pickup?.address || 'Pickup address not specified',
        destination: b.tripDetails?.destination?.address || 'Destination address not specified',
        distance: b.tripDetails?.distance || 0
      },
      pricing: {
        totalAmount: round2(totalAmount),
        platformFee: round2(platformFee),
        discount: round2(discount),
        couponCode: couponCode,
        adminProfit: round2(adminProfit),
        driverFare: round2(driverFare)
      },
      status: b.status,
      rating: b.rating ? {
        stars: b.rating.stars,
        review: b.rating.review || '',
        ratedAt: b.rating.ratedAt
      } : null,
      payment: {
        method: b.payment?.method || 'N/A',
        status: b.payment?.status || 'pending',
        isPartialPayment: !!b.payment?.isPartialPayment,
        cashPaymentStatus: b.payment?.partialPaymentDetails?.cashPaymentStatus || 'N/A'
      }
    };
  });

  // Primary image
  let primaryImage = '';
  if (Array.isArray(vehicle.images) && vehicle.images.length > 0) {
    const primary = vehicle.images.find((img) => typeof img === 'object' && img?.isPrimary);
    primaryImage = primary?.url || (typeof vehicle.images[0] === 'object' ? vehicle.images[0].url : vehicle.images[0]) || '';
  }

  res.json({
    success: true,
    data: {
      vehicle: {
        _id: vehicle._id,
        brand: vehicle.brand,
        model: vehicle.pricingReference?.vehicleModel || vehicle.brand,
        vehicleType: vehicle.pricingReference?.vehicleType || vehicle.type,
        category: vehicle.type || 'car',
        registrationNumber: vehicle.registrationNumber,
        image: primaryImage,
        driver: vehicle.driver ? {
          _id: vehicle.driver._id,
          name: `${vehicle.driver.firstName || ''} ${vehicle.driver.lastName || ''}`.trim() || 'Driver',
          phone: vehicle.driver.phone || '',
          email: vehicle.driver.email || ''
        } : null
      },
      summary: {
        totalBookings: bookings.length,
        completedBookings: completedCount,
        grossRevenue: round2(totalGross),
        totalPlatformFee: round2(totalPlatformFee),
        totalDiscount: round2(totalDiscount),
        netAdminProfit: round2(totalAdminProfit),
        driverEarnings: round2(totalGross - totalAdminProfit)
      },
      bookings: formattedBookings
    }
  });
});

module.exports = {
  getVehicleEarnings,
  getVehicleBookingEarnings
};
