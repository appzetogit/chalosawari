const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const BookingSchema = new mongoose.Schema({
  // User information (from logged-in user)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  
  // Vehicle information
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle is required']
  },
  
  // Driver information (from vehicle)
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: [true, 'Driver is required']
  },
  
  // Trip details
  tripDetails: {
    pickup: {
      latitude: {
        type: Number,
        required: [true, 'Pickup latitude is required']
      },
      longitude: {
        type: Number,
        required: [true, 'Pickup longitude is required']
      },
      address: {
        type: String,
        required: [true, 'Pickup address is required']
      }
    },
    destination: {
      latitude: {
        type: Number,
        required: [true, 'Destination latitude is required']
      },
      longitude: {
        type: Number,
        required: [true, 'Destination longitude is required']
      },
      address: {
        type: String,
        required: [true, 'Destination address is required']
      }
    },
    date: {
      type: String, // Simple date string like "2025-08-06"
      required: [true, 'Pickup date is required'],
      validate: {
        validator: function(v) {
          // Accept YYYY-MM-DD format and validate it's a real date
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
            return false;
          }
          const date = new Date(v);
          return !isNaN(date.getTime());
        },
        message: 'Date must be in YYYY-MM-DD format and be a valid date'
      }
    },
    time: {
      type: String, // Simple time string like "09:00" or "09:00:00"
      required: [true, 'Pickup time is required'],
      validate: {
        validator: function(v) {
          // Accept both "HH:MM" and "HH:MM:SS" formats
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(v);
        },
        message: 'Time must be in HH:MM or HH:MM:SS format'
      }
    },
    passengers: {
      type: Number,
      default: 1,
      min: [1, 'At least 1 passenger required']
    },
    distance: {
      type: Number,
      required: [true, 'Distance is required']
    },
    duration: {
      type: Number, // Estimated duration in minutes
      default: 0
    },
    // Add trip type and return date to trip details
    tripType: {
      type: String,
      enum: ['one-way', 'return'],
      default: 'one-way'
    },
    returnDate: {
      type: String, // Simple date string like "2025-08-06"
      required: false,
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          // Accept YYYY-MM-DD format and validate it's a real date
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
            return false;
          }
          const date = new Date(v);
          return !isNaN(date.getTime());
        },
        message: 'Return date must be in YYYY-MM-DD format and be a valid date'
      }
    }
  },
  
  // Pricing information
  pricing: {
    ratePerKm: {
      type: Number,
      required: [true, 'Rate per km is required']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required']
    },
    // Platform fee included in totalAmount (platform revenue, not driver fare)
    platformFee: {
      type: Number,
      default: 0
    },
    // Coupon discount already taken off totalAmount (absorbed by the platform, not the driver)
    discount: {
      type: Number,
      default: 0
    },
    couponCode: String,
    tripType: {
      type: String,
      enum: ['one-way', 'return'],
      default: 'one-way'
    }
  },
  
  // Payment information
  payment: {
    method: {
      type: String,
      enum: ['cash', 'upi', 'netbanking', 'card', 'razorpay'],
      required: [true, 'Payment method is required']
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    transactionId: {
      type: String,
      required: false
    },
    completedAt: {
      type: Date,
      required: false
    },
    amount: {
      type: Number,
      required: false
    },
    // New fields for partial payment system
    isPartialPayment: {
      type: Boolean,
      default: false
    },
    partialPaymentDetails: {
      onlineAmount: {
        type: Number,
        default: 0
      },
      cashAmount: {
        type: Number,
        default: 0
      },
      onlinePaymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
      },
      cashPaymentStatus: {
        type: String,
        enum: ['pending', 'collected', 'not_collected'],
        default: 'pending'
      },
      onlinePaymentId: {
        type: String,
        required: false
      },
      cashCollectedAt: {
        type: Date,
        required: false
      },
      cashCollectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'payment.partialPaymentDetails.cashCollectedByModel',
        required: false
      },
      cashCollectedByModel: {
        type: String,
        enum: ['Driver', 'Admin'],
        required: false
      }
    }
  },
  
  // Booking status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'started', 'completed', 'cancelled', 'cancellation_requested'],
    default: 'pending'
  },
  
  // Status history for tracking changes
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'accepted', 'started', 'completed', 'cancelled', 'cancellation_requested']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'statusHistory.updatedByModel',
      required: false
    },
    updatedByModel: {
      type: String,
      enum: ['User', 'Driver', 'Admin'],
      required: false
    },
    reason: {
      type: String,
      required: false
    },
    notes: {
      type: String,
      required: false
    }
  }],
  
  // Cancellation information
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'cancellation.cancelledByModel',
      required: false
    },
    cancelledByModel: {
      type: String,
      enum: ['User', 'Driver', 'Admin'],
      required: false
    },
    cancelledAt: {
      type: Date,
      required: false
    },
    reason: {
      type: String,
      required: false
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'initiated', 'completed', 'failed'],
      default: 'pending'
    },
    refundMethod: {
      type: String,
      enum: ['razorpay', 'manual'],
      required: false
    },
    refundCompletedAt: {
      type: Date,
      required: false
    },
    requestStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      required: false
    },
    requestReason: {
      type: String,
      required: false
    },
    approvedReason: {
      type: String,
      required: false
    }
  },
  
  // Additional fields for backward compatibility
  tripType: {
    type: String,
    enum: ['one-way', 'return'],
    default: 'one-way'
  },
  returnDate: {
    type: String, // Simple date string like "2025-08-06"
    required: false,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        // Accept YYYY-MM-DD format and validate it's a valid date
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          return false;
        }
        const date = new Date(v);
        return !isNaN(date.getTime());
      },
      message: 'Return date must be in YYYY-MM-DD format and be a valid date'
    }
  },
  
  // Trip details for actual trip data
  trip: {
    startTime: Date,
    endTime: Date,
    actualDistance: Number,
    actualDuration: Number,
    actualFare: Number,
    driverNotes: String,
    userNotes: String
  },
  
  // Additional information
  specialRequests: {
    type: String,
    default: ''
  },
  
  // Booking number (auto-generated)
  bookingNumber: {
    type: String,
    unique: true
  },

  // Passenger's rating of the completed trip (one per booking)
  rating: {
    stars: { type: Number, min: 1, max: 5 },
    review: { type: String, trim: true, maxlength: 500 },
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Add pagination plugin
BookingSchema.plugin(mongoosePaginate);

// Next value of a named sequence (atomic $inc in the `counters` collection)
const nextSequence = async (name) => {
  const res = await mongoose.connection.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return (res?.value ?? res).seq; // driver v5 wraps the doc in { value }, v6 returns it directly
};

// Pre-save middleware to generate a short sequential booking number: CS001, CS002, ... CS1000
BookingSchema.pre('save', async function() {
  if (this.isNew && !this.bookingNumber) {
    const seq = await nextSequence('bookingNumber');
    this.bookingNumber = `CS${String(seq).padStart(3, '0')}`;
  }
});

// Pre-save middleware to track status changes and update vehicle status
BookingSchema.pre('save', async function(next) {
  // Only proceed if status has changed
  if (this.isModified('status')) {
    try {
      console.log(`📋 Booking ${this._id} status changed to: ${this.status}`);
      
      const Vehicle = require('./Vehicle');
      const vehicle = await Vehicle.findById(this.vehicle);
      
      if (!vehicle) {
        return next(new Error('Vehicle not found'));
      }
      
      console.log(`🚗 Vehicle ${vehicle._id} current status: ${vehicle.bookingStatus}, booked: ${vehicle.booked}`);
      
      // Add status to history
      if (!this.statusHistory) {
        this.statusHistory = [];
      }
      
      // Determine who updated the status
      let updatedByModel = 'User';
      let updatedBy = this.user;
      
      // This will be set by the controller based on the authenticated user
      if (this._updatedByModel && this._updatedBy) {
        updatedByModel = this._updatedByModel;
        updatedBy = this._updatedBy;
      }
      
      this.statusHistory.push({
        status: this.status,
        timestamp: new Date(),
        updatedBy: updatedBy,
        updatedByModel: updatedByModel,
        reason: this._statusReason || '',
        notes: this._statusNotes || ''
      });
      
      // Update vehicle status based on booking status
      switch (this.status) {
        case 'accepted':
          console.log(`🚗 Updating vehicle ${vehicle._id} to booked status`);
          await vehicle.markAsBooked(this._id);
          break;
        case 'started':
          console.log(`🚗 Updating vehicle ${vehicle._id} to in_trip status`);
          await vehicle.markAsInTrip();
          break;
        case 'completed':
        case 'cancelled':
          console.log(`🚗 Updating vehicle ${vehicle._id} to available status`);
          await vehicle.markAsAvailable();
          break;
        case 'cancellation_requested':
          // Don't change vehicle status when cancellation is requested
          console.log(`🚗 No vehicle status change for cancellation request`);
          break;
        default:
          console.log(`🚗 No vehicle status change for status: ${this.status}`);
          break;
      }
      
      console.log(`🚗 Vehicle ${vehicle._id} status updated to: ${vehicle.bookingStatus}, booked: ${vehicle.booked}`);
      
      // Read by the post('save') push hook below
      this.$locals.push = { isNew: this.isNew, actor: this._updatedByModel || 'User' };

      // Clear temporary fields
      delete this._updatedByModel;
      delete this._updatedBy;
      delete this._statusReason;
      delete this._statusNotes;
      
    } catch (error) {
      console.error(`❌ Error updating vehicle status for booking ${this._id}:`, error);
      return next(error);
    }
  }
  next();
});

// ---- Push notifications on every status change (all controllers save through here) ----
BookingSchema.post('init', function() {
  this.$locals.prevStatus = this.status;
});

const short = (addr = '') => addr.split(',')[0].trim();

// Returns { user?: {title, body}, driver?: {title, body} } for this status change
const bookingPushes = (b, { isNew, actor }, prevStatus) => {
  const no = b.bookingNumber;
  const route = `${short(b.tripDetails?.pickup?.address)} → ${short(b.tripDetails?.destination?.address)}`;
  if (isNew) return {
    driver: { title: 'New booking arrived', body: `${no} · ${route} · ${b.tripDetails?.date} ${b.tripDetails?.time}` },
    user: { title: 'Booking placed', body: `${no} is waiting for the driver to accept` }
  };
  if (prevStatus === 'cancellation_requested' && b.status !== 'cancelled') return {
    user: { title: 'Cancellation rejected', body: `Your cancellation request for ${no} was rejected` },
    driver: { title: 'Cancellation rejected', body: `${no} is still on: ${route}` }
  };
  switch (b.status) {
    case 'accepted': return { user: { title: 'Booking accepted', body: `Your driver accepted ${no}` } };
    case 'started': return { user: { title: 'Trip started', body: `${no} has started. Have a safe journey!` } };
    case 'completed': return {
      user: { title: 'Trip completed', body: `${no} is complete. Rate your ride!` },
      driver: { title: 'Trip completed', body: `${no} completed · ₹${b.trip?.actualFare ?? b.pricing?.totalAmount}` }
    };
    case 'cancellation_requested': return { driver: { title: 'Cancellation requested', body: `Passenger asked to cancel ${no}` } };
    case 'cancelled': {
      const user = { title: 'Booking cancelled', body: `${no} was cancelled. Your refund will be processed.` };
      if (actor === 'User') return { driver: { title: 'Booking cancelled', body: `Passenger cancelled ${no}` } };
      if (actor === 'Driver') return { user: { ...user, body: `Driver cancelled ${no}. Your refund will be processed.` } };
      return { user, driver: { title: 'Booking cancelled', body: `${no} was cancelled by admin` } };
    }
    default: return {};
  }
};

BookingSchema.statics.pushesFor = bookingPushes; // exposed for checks

BookingSchema.post('save', function(doc) {
  const info = doc.$locals.push;
  const prevStatus = doc.$locals.prevStatus;
  doc.$locals.prevStatus = doc.status; // a later save on the same doc compares against this one
  if (!info) return;
  delete doc.$locals.push;
  const { sendPushToDoc } = require('../utils/fcm');
  const data = { type: `booking_${doc.status}`, bookingId: doc._id, bookingNumber: doc.bookingNumber };
  const msgs = bookingPushes(doc, info, prevStatus);
  // Fire-and-forget: a push failure must never fail the booking API
  if (msgs.user) sendPushToDoc(mongoose.model('User'), doc.user, { ...msgs.user, data }).catch((e) => console.error('Booking push (user) failed:', e.message));
  if (msgs.driver) sendPushToDoc(mongoose.model('Driver'), doc.driver, { ...msgs.driver, data }).catch((e) => console.error('Booking push (driver) failed:', e.message));
});

module.exports = mongoose.model('Booking', BookingSchema);
