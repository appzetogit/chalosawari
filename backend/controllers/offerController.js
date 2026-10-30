const asyncHandler = require('../middleware/asyncHandler');
const Offer = require('../models/Offer');
const { deleteImage } = require('../utils/imageUpload');

// Escape user search text before using it in $regex (avoids regex injection / ReDoS)
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Coupon fields from the admin form (multipart, so everything arrives as strings)
const pickCouponFields = (body) => {
  const fields = {};
  if (body.description !== undefined) fields.description = body.description;
  if (body.code !== undefined) fields.code = String(body.code).trim().toUpperCase();
  if (body.discountType !== undefined) fields.discountType = body.discountType;
  if (body.discountValue !== undefined) fields.discountValue = Number(body.discountValue);
  if (body.maxDiscount !== undefined) fields.maxDiscount = Number(body.maxDiscount) || 0;
  if (body.minBookingAmount !== undefined) fields.minBookingAmount = Number(body.minBookingAmount) || 0;
  if (body.vehicleType !== undefined) fields.vehicleType = body.vehicleType;
  if (body.validTill !== undefined) fields.validTill = body.validTill ? new Date(body.validTill) : null;
  return fields;
};

// @desc    Check a coupon for an amount and vehicle type (checkout preview)
// @route   POST /api/offers/validate
// @access  Private (User)
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, amount, vehicleType } = req.body;
  const result = await Offer.applyCoupon(code, { amount: Number(amount) || 0, vehicleType });
  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }
  res.json({
    success: true,
    data: {
      code: result.offer.code,
      title: result.offer.title,
      discount: result.discount,
      // Rules, so checkout can recompute the same discount if the fare changes
      discountType: result.offer.discountType,
      discountValue: result.offer.discountValue,
      maxDiscount: result.offer.maxDiscount || 0,
      minBookingAmount: result.offer.minBookingAmount || 0
    }
  });
});

// @desc    Get all active offers
// @route   GET /api/offers
// @access  Public
const getActiveOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({
    isActive: true,
    code: { $exists: true, $ne: null },
    $or: [{ validTill: null }, { validTill: { $exists: false } }, { validTill: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }]
  })
    .sort({ createdAt: -1 })
    .select('title description image code discountType discountValue maxDiscount minBookingAmount vehicleType validTill');

  res.json({
    success: true,
    count: offers.length,
    data: offers
  });
});

// @desc    Get all offers (admin only)
// @route   GET /api/admin/offers
// @access  Private (Admin)
const getAllOffers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', status = '' } = req.query;

  // Build query
  let query = {};
  
  if (search) {
    query.title = { $regex: escapeRegex(search), $options: 'i' };
  }
  
  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const offers = await Offer.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Offer.countDocuments(query);

  res.json({
    success: true,
    data: offers,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  });
});

// @desc    Get offer by ID
// @route   GET /api/admin/offers/:id
// @access  Private (Admin)
const getOfferById = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);

  if (!offer) {
    return res.status(404).json({
      success: false,
      message: 'Offer not found'
    });
  }

  res.json({
    success: true,
    data: offer
  });
});

// @desc    Create new offer
// @route   POST /api/admin/offers
// @access  Private (Admin)
const createOffer = asyncHandler(async (req, res) => {
  const { title } = req.body;

  const offer = await Offer.create({
    title,
    image: req.file ? req.file.path : '',
    ...pickCouponFields(req.body)
  });

  res.status(201).json({
    success: true,
    message: 'Offer created successfully',
    data: offer
  });
});

// @desc    Update offer
// @route   PUT /api/admin/offers/:id
// @access  Private (Admin)
const updateOffer = asyncHandler(async (req, res) => {
  const { title } = req.body;
  
  let updateData = { title, ...pickCouponFields(req.body) };
  
  // If new image is uploaded, update image and delete old one
  if (req.file) {
    const offer = await Offer.findById(req.params.id);
    if (offer && offer.image) {
      try {
        await deleteImage(offer.image);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }
    updateData.image = req.file.path;
  }

  const updatedOffer = await Offer.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  if (!updatedOffer) {
    return res.status(404).json({
      success: false,
      message: 'Offer not found'
    });
  }

  res.json({
    success: true,
    message: 'Offer updated successfully',
    data: updatedOffer
  });
});

// @desc    Delete offer
// @route   DELETE /api/admin/offers/:id
// @access  Private (Admin)
const deleteOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);

  if (!offer) {
    return res.status(404).json({
      success: false,
      message: 'Offer not found'
    });
  }

  // Delete image from local storage
  if (offer.image) {
    try {
      await deleteImage(offer.image);
    } catch (error) {
      console.error('Error deleting image from storage:', error);
    }
  }

  await Offer.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Offer deleted successfully'
  });
});

// @desc    Toggle offer status
// @route   PATCH /api/admin/offers/:id/status
// @access  Private (Admin)
const toggleOfferStatus = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);

  if (!offer) {
    return res.status(404).json({
      success: false,
      message: 'Offer not found'
    });
  }

  offer.isActive = !offer.isActive;
  await offer.save();

  res.json({
    success: true,
    message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`,
    data: offer
  });
});

// @desc    Get offer statistics
// @route   GET /api/admin/offers/stats
// @access  Private (Admin)
const getOfferStats = asyncHandler(async (req, res) => {
  const totalOffers = await Offer.countDocuments();
  const activeOffers = await Offer.countDocuments({ isActive: true });
  const inactiveOffers = await Offer.countDocuments({ isActive: false });

  res.json({
    success: true,
    data: {
      totalOffers,
      activeOffers,
      inactiveOffers
    }
  });
});

module.exports = {
  getActiveOffers,
  validateCoupon,
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getOfferStats
};
