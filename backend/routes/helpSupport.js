const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getHelpData,
  getAdminStats,
  getAdminFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  toggleFaqStatus,
  getSupportSettings,
  updateSupportSettings
} = require('../controllers/helpSupportController');
const { protectAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Public route (no authentication required)
router.get('/', getHelpData);

// Admin routes (authentication required)
router.use('/admin', protectAdmin);

// Stats
router.get('/admin/stats', getAdminStats);

// FAQs list
router.get('/admin/faqs', [
  query('search').optional().isString(),
  query('status').optional().isIn(['all', 'active', 'inactive'])
], validate, getAdminFaqs);

// Create FAQ
router.post('/admin/faqs', [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 300 }),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('order').optional().isInt().withMessage('Order must be an integer'),
  body('isActive').optional().isBoolean()
], validate, createFaq);

// Update FAQ
router.put('/admin/faqs/:id', [
  param('id').isMongoId().withMessage('Invalid FAQ ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 300 }),
  body('content').optional().trim().notEmpty().withMessage('Content cannot be empty'),
  body('order').optional().isInt().withMessage('Order must be an integer'),
  body('isActive').optional().isBoolean()
], validate, updateFaq);

// Delete FAQ
router.delete('/admin/faqs/:id', [
  param('id').isMongoId().withMessage('Invalid FAQ ID')
], validate, deleteFaq);

// Toggle FAQ status
router.patch('/admin/faqs/:id/status', [
  param('id').isMongoId().withMessage('Invalid FAQ ID')
], validate, toggleFaqStatus);

// Support contact settings
router.get('/admin/settings', getSupportSettings);
router.put('/admin/settings', [
  body('phone').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('whatsapp').optional().trim(),
  body('workingHours').optional().trim(),
  body('callSupportTitle').optional().trim(),
  body('callSupportDescription').optional().trim(),
  body('emailSupportTitle').optional().trim(),
  body('emailSupportDescription').optional().trim()
], validate, updateSupportSettings);

module.exports = router;
