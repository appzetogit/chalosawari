const mongoose = require('mongoose');

const SupportSettingSchema = new mongoose.Schema({
  phone: {
    type: String,
    trim: true,
    default: '+919171838260'
  },
  email: {
    type: String,
    trim: true,
    default: 'chalosawariofficial@gmail.com'
  },
  whatsapp: {
    type: String,
    trim: true,
    default: '+919171838260'
  },
  workingHours: {
    type: String,
    trim: true,
    default: '24/7 Available'
  },
  callSupportTitle: {
    type: String,
    trim: true,
    default: 'Call Support'
  },
  callSupportDescription: {
    type: String,
    trim: true,
    default: 'Speak with our customer care'
  },
  emailSupportTitle: {
    type: String,
    trim: true,
    default: 'Email Support'
  },
  emailSupportDescription: {
    type: String,
    trim: true,
    default: 'Send us an email'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SupportSetting', SupportSettingSchema);
