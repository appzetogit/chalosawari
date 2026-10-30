const express = require('express');
const { body, param } = require('express-validator');
const {
  getPolicyByType,
  getAdminPolicy,
  updatePolicy,
  addPolicySection,
  updatePolicySection,
  deletePolicySection
} = require('../controllers/policyController');
const { protectAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const VALID_POLICY_TYPES = ['terms', 'privacy', 'refund', 'cancellation', 'driver-terms', 'driver-privacy'];

// Public route to fetch any policy type ('terms', 'privacy', 'refund', 'cancellation', 'driver-terms', 'driver-privacy')
router.get('/:type', [
  param('type').isIn(VALID_POLICY_TYPES).withMessage('Invalid policy type')
], validate, getPolicyByType);

// Admin protected routes
router.use('/admin', protectAdmin);

// Get policy details for admin
router.get('/admin/:type', [
  param('type').isIn(VALID_POLICY_TYPES).withMessage('Invalid policy type')
], validate, getAdminPolicy);

// Update whole policy
router.put('/admin/:type', [
  param('type').isIn(VALID_POLICY_TYPES).withMessage('Invalid policy type'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('sections').optional().isArray().withMessage('Sections must be an array')
], validate, updatePolicy);

// Add single section
router.post('/admin/:type/section', [
  param('type').isIn(VALID_POLICY_TYPES).withMessage('Invalid policy type'),
  body('title').trim().notEmpty().withMessage('Section title is required'),
  body('content').trim().notEmpty().withMessage('Section content is required'),
  body('order').optional().isInt().withMessage('Order must be an integer')
], validate, addPolicySection);

// Update single section
router.put('/admin/:type/section/:sectionId', [
  param('type').isIn(VALID_POLICY_TYPES).withMessage('Invalid policy type'),
  param('sectionId').isMongoId().withMessage('Invalid section ID'),
  body('title').optional().trim().notEmpty().withMessage('Section title cannot be empty'),
  body('content').optional().trim().notEmpty().withMessage('Section content cannot be empty'),
  body('order').optional().isInt().withMessage('Order must be an integer')
], validate, updatePolicySection);

// Delete single section
router.delete('/admin/:type/section/:sectionId', [
  param('type').isIn(VALID_POLICY_TYPES).withMessage('Invalid policy type'),
  param('sectionId').isMongoId().withMessage('Invalid section ID')
], validate, deletePolicySection);

module.exports = router;
