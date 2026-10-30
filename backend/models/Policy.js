const mongoose = require('mongoose');

const PolicySectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Section title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Section content is required'],
    trim: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  _id: true,
  timestamps: true
});

const PolicySchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Policy type is required'],
    unique: true,
    enum: ['terms', 'privacy', 'refund', 'cancellation', 'driver-terms', 'driver-privacy'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Policy title is required'],
    trim: true
  },
  sections: [PolicySectionSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Policy', PolicySchema);
