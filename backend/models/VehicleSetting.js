const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['car', 'bus'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    default: '🚗'
  },
  description: {
    type: String,
    default: ''
  },
  defaultCapacity: {
    type: Number,
    default: 4
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { _id: false });

const VehicleModelSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['car', 'bus'],
    required: true
  },
  variantName: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  modelName: {
    type: String,
    required: true,
    trim: true
  },
  seatingCapacity: {
    type: Number,
    required: true,
    min: 1,
    default: 4
  },
  luggageCapacity: {
    type: Number,
    default: 2
  },
  fuelTypes: {
    type: [String],
    enum: ['petrol', 'diesel', 'cng', 'electric', 'hybrid'],
    default: ['petrol', 'diesel']
  },
  defaultFuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'cng', 'electric', 'hybrid'],
    default: 'diesel'
  },
  // Mileage: average km per liter or km per kg
  mileage: {
    type: Number,
    required: true,
    min: 1,
    default: 15
  },
  // Pricing & Savaari outstation reference parameters
  baseFare: {
    type: Number,
    default: 500
  },
  perKmRate: {
    type: Number,
    default: 12
  },
  driverAllowancePerDay: {
    type: Number,
    default: 300
  },
  minKmPerDay: {
    type: Number,
    default: 250
  },
  isAcDefault: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: ''
  }
}, { _id: false });

const VehicleSettingSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    default: 'global_vehicle_settings',
    unique: true
  },
  variants: [VariantSchema],
  models: [VehicleModelSchema],
  fuelRates: {
    petrol: {
      type: Number,
      default: 106.5
    },
    diesel: {
      type: Number,
      default: 93.5
    },
    cng: {
      type: Number,
      default: 85.0
    },
    electric: {
      type: Number,
      default: 15.0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Flat fee (₹) added to every booking's total
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  // % of the booking total paid online at booking time; the rest is paid to the driver in cash (100 = full online)
  advancePercentage: {
    type: Number,
    default: 20,
    min: 1,
    max: 100
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Helper static method to get or initialize default settings
VehicleSettingSchema.statics.getOrCreateDefault = async function () {
  let settings = await this.findOne({ settingKey: 'global_vehicle_settings' });
  if (!settings) {
    settings = await this.create({
      settingKey: 'global_vehicle_settings',
      variants: [],
      models: [],
      fuelRates: {
        petrol: 106.5,
        diesel: 93.5,
        cng: 85.0,
        electric: 15.0,
        lastUpdated: new Date()
      }
    });
  }
  return settings;
};

module.exports = mongoose.model('VehicleSetting', VehicleSettingSchema);
