const User = require('../models/User');
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload user profile picture / avatar
// @route   POST /api/user/avatar
// @access  Private
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please select an image file to upload',
          statusCode: 400
        }
      });
    }

    const relativeUrl = req.file.path || `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: relativeUrl },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: relativeUrl,
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth,
      address,
      location,
      emergencyContact,
      profilePicture
    } = req.body;

    // Check if email or phone is being updated and if they already exist
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email already exists',
            statusCode: 400
          }
        });
      }
    }

    // Phone is the OTP login identity; changing it here would skip OTP verification
    if (phone && String(phone).replace(/[^0-9]/g, '').slice(-10) !== req.user.phone) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Phone number cannot be changed. Please contact support.',
          statusCode: 400
        }
      });
    }

    const updateFields = {
      firstName,
      lastName,
      email,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
      location,
      emergencyContact
    };

    if (profilePicture !== undefined) {
      updateFields.profilePicture = profilePicture;
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user bookings
// @route   GET /api/user/bookings
// @access  Private
const getUserBookings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    let query = { user: req.user.id };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // If specific booking ID is requested
    if (id) {
      const booking = await Booking.findById(id)
        .populate('driver', 'firstName lastName phone')
        .populate('vehicle', 'type brand model color registrationNumber pricingReference isAc seatingCapacity')
        .select('tripDetails pricing payment status bookingNumber createdAt user cancellation tripType returnDate rating');

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Booking not found',
            statusCode: 404
          }
        });
      }

      // Check if user owns this booking
      if (booking.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Not authorized to access this booking',
            statusCode: 403
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          booking
        }
      });
    }

    // Pagination
    const skip = (page - 1) * limit;
    const totalBookings = await Booking.countDocuments(query);
    const totalPages = Math.ceil(totalBookings / limit);

    const bookings = await Booking.find(query)
      .populate('driver', 'firstName lastName phone')
      .populate('vehicle', 'type brand model color registrationNumber pricingReference isAc seatingCapacity')
      .select('tripDetails pricing payment status bookingNumber createdAt user cancellation tripType returnDate rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalBookings,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user preferences
// @route   GET /api/user/preferences
// @access  Private
const getUserPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');

    res.status(200).json({
      success: true,
      data: {
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user preferences
// @route   PUT /api/user/preferences
// @access  Private
const updateUserPreferences = async (req, res, next) => {
  try {
    const {
      preferredVehicleType,
      preferredSeat,
      notifications
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        'preferences.preferredVehicleType': preferredVehicleType,
        'preferences.preferredSeat': preferredSeat,
        'preferences.notifications': notifications
      },
      {
        new: true,
        runValidators: true
      }
    ).select('preferences');

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: updatedUser.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
const deleteUserAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide your password to confirm account deletion',
          statusCode: 400
        }
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    
    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid password',
          statusCode: 401
        }
      });
    }

    // Check if user has active bookings
    const activeBookings = await Booking.countDocuments({
      user: req.user.id,
      status: { $in: ['pending', 'confirmed', 'driver_assigned', 'driver_en_route', 'driver_arrived', 'trip_started'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete account with active bookings. Please complete or cancel all active trips first.',
          statusCode: 400
        }
      });
    }

    // Delete user account
    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request cancellation for a booking
// @route   PUT /api/user/bookings/:id/request-cancellation
// @access  Private
const requestCancellation = async (req, res, next) => {
  try {
    const { id: bookingId } = req.params;
    const { reason } = req.body;

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Booking not found',
          statusCode: 404
        }
      });
    }

    // Check if the booking belongs to the user
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only request cancellation for your own bookings',
          statusCode: 403
        }
      });
    }

    // Check if the booking can be cancelled
    if (booking.status !== 'pending') { // after the driver accepts, only admin can cancel
      return res.status(400).json({
        success: false,
        error: {
          message: 'This booking is already accepted by the driver. Please contact support to cancel.',
          statusCode: 400
        }
      });
    }

    // Check if cancellation is already requested
    if (booking.status === 'cancellation_requested') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cancellation has already been requested for this booking',
          statusCode: 400
        }
      });
    }

    // Update booking status to cancellation requested
    booking.status = 'cancellation_requested';
    booking.cancellation = {
      requestedBy: req.user.id,
      requestedByModel: 'User',
      requestedAt: new Date(),
      requestReason: reason || 'User requested cancellation',
      requestStatus: 'pending'
    };

    // Add to status history
    if (!booking.statusHistory) {
      booking.statusHistory = [];
    }
    
    booking.statusHistory.push({
      status: 'cancellation_requested',
      timestamp: new Date(),
      updatedBy: req.user.id,
      updatedByModel: 'User',
      reason: reason || 'User requested cancellation'
    });

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Cancellation request submitted successfully. Admin will review and process it.',
      data: {
        booking: {
          id: booking._id,
          status: booking.status,
          cancellation: booking.cancellation
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate a completed trip (once per booking); updates driver and vehicle averages
// @route   PUT /api/user/bookings/:id/rating
// @access  Private
const rateBooking = async (req, res, next) => {
  try {
    const stars = Number(req.body.stars);
    const review = (req.body.review || '').trim();

    // Claim the booking for rating atomically so a double submit can't count twice
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, status: 'completed', 'rating.stars': { $exists: false } },
      { $set: { rating: { stars, review, ratedAt: new Date() } } },
      { new: true }
    );
    if (!booking) {
      return res.status(400).json({
        success: false,
        error: { message: 'Only your completed trips can be rated, and only once', statusCode: 400 }
      });
    }

    // Running average for the driver: avg' = (avg * n + stars) / (n + 1)
    const driver = await Driver.findById(booking.driver).select('rating reviewCount');
    if (driver) {
      const count = driver.reviewCount || 0;
      const average = ((driver.rating || 0) * count + stars) / (count + 1);
      await Driver.updateOne(
        { _id: driver._id },
        { $set: { rating: Math.round(average * 10) / 10 }, $inc: { reviewCount: 1 } }
      );
    }

    try {
      const vehicle = await Vehicle.findById(booking.vehicle);
      if (vehicle) await vehicle.addRating(stars);
    } catch (error) {
      console.error(`Vehicle rating update failed for booking ${booking._id}:`, error.message);
    }

    res.status(200).json({
      success: true,
      message: 'Thanks for rating your trip',
      data: { rating: booking.rating }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getUserBookings,
  getUserPreferences,
  updateUserPreferences,
  deleteUserAccount,
  requestCancellation,
  rateBooking
};
