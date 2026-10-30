const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const VehiclePricingSchema = new mongoose.Schema({
  // Vehicle Category (car, bus)
  category: {
    type: String,
    enum: ['car', 'bus', 'auto'],
    required: [true, 'Vehicle category is required']
  },
  
  // Vehicle Type (e.g., Sedan, Hatchback, SUV for cars)
  vehicleType: {
    type: String,
    required: [true, 'Vehicle type is required'],
    trim: true
  },
  
  // Vehicle Model (e.g., Honda City, Swift Dzire for cars)
  vehicleModel: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true
  },
  
  // Trip Type (one-way or return)
  tripType: {
    type: String,
    enum: ['one-way', 'return'],
    required: [true, 'Trip type is required']
  },
  
  // Distance-based pricing (for car and bus)
  distancePricing: {
    '50km': {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    '100km': {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    '150km': {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    '200km': {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    '250km': {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    '300km': {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
      default: 0
    }
  },
  
  // Additional charges
  nightCharge: {
    type: Number,
    default: 0,
    min: [0, 'Night charge cannot be negative']
  },
  
  acCharge: {
    type: Number,
    default: 0,
    min: [0, 'AC charge cannot be negative']
  },
  
  waitingCharge: {
    type: Number,
    default: 0,
    min: [0, 'Waiting charge cannot be negative']
  },
  
  // Status and metadata
  isActive: {
    type: Boolean,
    default: true
  },
  
  isDefault: {
    type: Boolean,
    default: false
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Admin who created this pricing is required']
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
VehiclePricingSchema.index({ 
  category: 1, 
  vehicleType: 1, 
  vehicleModel: 1, 
  tripType: 1 
}, { unique: true });

// Index for active pricing
VehiclePricingSchema.index({ isActive: 1 });

// Method to calculate fare based on distance
VehiclePricingSchema.methods.calculateFare = function(distance) {
  // For car and bus, calculate distance-based pricing
  let rate = this.distancePricing['300km']; // Default to highest distance rate
  
  if (distance <= 50) {
    rate = this.distancePricing['50km'];
  } else if (distance <= 100) {
    rate = this.distancePricing['100km'];
  } else if (distance <= 150) {
    rate = this.distancePricing['150km'];
  } else if (distance <= 200) {
    rate = this.distancePricing['200km'];
  } else if (distance <= 250) {
    rate = this.distancePricing['250km'];
  } else {
    rate = this.distancePricing['300km'];
  }
  
  // Fare is 2x distance (aane aur jane dono ka / round trip)
  const totalFare = rate * distance * 2;
  
  // Round to whole rupees (no decimal places)
  return Math.round(totalFare);
};

// Static method to get pricing by vehicle details
VehiclePricingSchema.statics.getPricing = async function(category, vehicleType, vehicleModel, tripType) {
  const safeRegex = (str) => new RegExp(`^${(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  
  // 1. Try exact match (case-insensitive)
  let pricing = await this.findOne({
    category: safeRegex(category),
    vehicleType: safeRegex(vehicleType),
    vehicleModel: safeRegex(vehicleModel),
    tripType,
    isActive: true
  });
  if (pricing) return pricing;

  // 2. Try match vehicleType and category (fallback for custom-typed models)
  pricing = await this.findOne({
    category: safeRegex(category),
    vehicleType: safeRegex(vehicleType),
    tripType,
    isActive: true
  });
  if (pricing) return pricing;

  // 3. Fallback to default pricing for category
  return this.findOne({
    category: safeRegex(category),
    tripType,
    isActive: true
  });
};

// Static method to get all pricing for a category
VehiclePricingSchema.statics.getCategoryPricing = function(category, tripType) {
  return this.find({
    category,
    tripType,
    isActive: true
  }).sort({ vehicleType: 1, vehicleModel: 1 });
};

// Static method to get default pricing
VehiclePricingSchema.statics.getDefaultPricing = function(category, vehicleType, tripType) {
  return this.findOne({
    category,
    vehicleType,
    tripType: tripType || 'one-way',
    isDefault: true,
    isActive: true
  });
};

// Add pagination plugin
VehiclePricingSchema.plugin(mongoosePaginate);

const VehiclePricing = mongoose.model('VehiclePricing', VehiclePricingSchema);

module.exports = VehiclePricing;
