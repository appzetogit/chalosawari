const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'FAQ title/question is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    default: '',
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  content: {
    type: String,
    required: [true, 'FAQ answer/content is required'],
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

FAQSchema.index({ isActive: 1, order: 1, createdAt: -1 });

module.exports = mongoose.model('FAQ', FAQSchema);
