const express = require('express');
const router = express.Router();
const {
  getPublicVehicleSettings,
  getAdminVehicleSettings,
  createVariant,
  updateVariant,
  deleteVariant,
  createModel,
  updateModel,
  deleteModel,
  updateFuelRates,
  updatePlatformFee,
  updateAdvancePercentage,
  calculateTripCost
} = require('../controllers/vehicleSettingController');
const { protectAdmin } = require('../middleware/auth');

// Public endpoints
router.get('/', getPublicVehicleSettings);
router.post('/calculate-trip-cost', calculateTripCost);

// Admin protected endpoints
router.get('/admin', protectAdmin, getAdminVehicleSettings);
router.post('/variants', protectAdmin, createVariant);
router.put('/variants/:id', protectAdmin, updateVariant);
router.delete('/variants/:id', protectAdmin, deleteVariant);

router.post('/models', protectAdmin, createModel);
router.put('/models/:id', protectAdmin, updateModel);
router.delete('/models/:id', protectAdmin, deleteModel);

router.put('/fuel-rates', protectAdmin, updateFuelRates);
router.put('/platform-fee', protectAdmin, updatePlatformFee);
router.put('/advance-percentage', protectAdmin, updateAdvancePercentage);

module.exports = router;
