const VehicleSetting = require('../models/VehicleSetting');
const VehiclePricing = require('../models/VehiclePricing');
const Vehicle = require('../models/Vehicle');

const exactCI = (s) => new RegExp(`^${String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

// The model's per-km rate is the fare: copy it into VehiclePricing (read when a driver adds a vehicle)
// and into vehicles already registered with this variant + model.
const syncModelPricing = async (model, adminId) => {
  const rate = Number(model.perKmRate) || 0;
  const tiers = { '50km': rate, '100km': rate, '150km': rate, '200km': rate, '250km': rate, '300km': rate };
  const match = {
    category: model.category,
    vehicleType: exactCI(model.variantName),
    vehicleModel: exactCI(model.modelName)
  };

  for (const tripType of ['one-way', 'return']) {
    const updated = await VehiclePricing.updateMany(
      { ...match, tripType },
      { $set: { distancePricing: tiers, isActive: model.isActive !== false, updatedBy: adminId } }
    );
    if (updated.matchedCount === 0) {
      await VehiclePricing.create({
        category: model.category,
        vehicleType: model.variantName,
        vehicleModel: model.modelName,
        tripType,
        distancePricing: tiers,
        isActive: model.isActive !== false,
        createdBy: adminId
      });
    }
  }

  await Vehicle.updateMany(
    {
      'pricingReference.category': model.category,
      'pricingReference.vehicleType': exactCI(model.variantName),
      'pricingReference.vehicleModel': exactCI(model.modelName)
    },
    { $set: { 'pricing.distancePricing.oneWay': tiers, 'pricing.distancePricing.return': tiers } }
  );
};

// @desc    Get public vehicle settings (active variants, models & fuel rates)
// @route   GET /api/vehicle-settings
// @access  Public
exports.getPublicVehicleSettings = async (req, res) => {
  try {
    const settings = await VehicleSetting.getOrCreateDefault();
    
    // Filter active items for public consumption
    const activeVariants = (settings.variants || []).filter(v => v.isActive);
    const activeModels = (settings.models || []).filter(m => m.isActive);

    // Group models by category and variant for quick lookups
    const groupedModels = {
      car: {},
      bus: {}
    };

    activeModels.forEach(m => {
      const cat = m.category || 'car';
      if (!groupedModels[cat]) groupedModels[cat] = {};
      if (!groupedModels[cat][m.variantName]) groupedModels[cat][m.variantName] = [];
      groupedModels[cat][m.variantName].push(m);
    });

    res.status(200).json({
      success: true,
      data: {
        variants: activeVariants,
        models: activeModels,
        groupedModels,
        fuelRates: settings.fuelRates,
        platformFee: settings.platformFee || 0,
        advancePercentage: settings.advancePercentage ?? 100
      }
    });
  } catch (error) {
    console.error('Error fetching public vehicle settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle settings',
      error: error.message
    });
  }
};

// @desc    Get all vehicle settings for Admin
// @route   GET /api/vehicle-settings/admin
// @access  Private (Admin)
exports.getAdminVehicleSettings = async (req, res) => {
  try {
    const settings = await VehicleSetting.getOrCreateDefault();
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching admin vehicle settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin vehicle settings',
      error: error.message
    });
  }
};

// @desc    Create new Variant
// @route   POST /api/vehicle-settings/variants
// @access  Private (Admin)
exports.createVariant = async (req, res) => {
  try {
    const { category, name, icon, description, defaultCapacity, isActive, sortOrder } = req.body;

    if (!category || !name) {
      return res.status(400).json({
        success: false,
        message: 'Category and Variant Name are required'
      });
    }

    const settings = await VehicleSetting.getOrCreateDefault();
    
    // Check duplicate
    const exists = settings.variants.some(
      v => v.category === category && v.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Variant "${name}" already exists in ${category} category`
      });
    }

    const newId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newVariant = {
      id: newId,
      category,
      name: name.trim(),
      icon: icon || (category === 'bus' ? '🚌' : '🚗'),
      description: description || '',
      defaultCapacity: Number(defaultCapacity) || (category === 'bus' ? 32 : 4),
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: Number(sortOrder) || settings.variants.length + 1
    };

    settings.variants.push(newVariant);
    settings.updatedBy = req.admin?._id;
    await settings.save();

    res.status(201).json({
      success: true,
      message: 'Variant created successfully',
      data: newVariant
    });
  } catch (error) {
    console.error('Error creating variant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create variant',
      error: error.message
    });
  }
};

// @desc    Update Variant
// @route   PUT /api/vehicle-settings/variants/:id
// @access  Private (Admin)
exports.updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, description, defaultCapacity, isActive, sortOrder, category } = req.body;

    const settings = await VehicleSetting.getOrCreateDefault();
    const variantIndex = settings.variants.findIndex(v => v.id === id);

    if (variantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    const oldName = settings.variants[variantIndex].name;
    const newName = name ? name.trim() : oldName;

    // Update variant
    if (category) settings.variants[variantIndex].category = category;
    if (name) settings.variants[variantIndex].name = newName;
    if (icon !== undefined) settings.variants[variantIndex].icon = icon;
    if (description !== undefined) settings.variants[variantIndex].description = description;
    if (defaultCapacity !== undefined) settings.variants[variantIndex].defaultCapacity = Number(defaultCapacity);
    if (isActive !== undefined) settings.variants[variantIndex].isActive = isActive;
    if (sortOrder !== undefined) settings.variants[variantIndex].sortOrder = Number(sortOrder);

    // If variant name changed, cascade update in models
    if (oldName !== newName) {
      settings.models.forEach(m => {
        if (m.variantName === oldName) {
          m.variantName = newName;
        }
      });
    }

    settings.updatedBy = req.admin?._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Variant updated successfully',
      data: settings.variants[variantIndex]
    });
  } catch (error) {
    console.error('Error updating variant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update variant',
      error: error.message
    });
  }
};

// @desc    Delete Variant
// @route   DELETE /api/vehicle-settings/variants/:id
// @access  Private (Admin)
exports.deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const settings = await VehicleSetting.getOrCreateDefault();

    const variant = settings.variants.find(v => v.id === id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    // Check if models exist under this variant
    const modelCount = settings.models.filter(m => m.variantName === variant.name).length;
    if (modelCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete variant "${variant.name}". There are ${modelCount} vehicle models associated with it. Delete or reassign those models first.`
      });
    }

    settings.variants = settings.variants.filter(v => v.id !== id);
    settings.updatedBy = req.admin?._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Variant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting variant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete variant',
      error: error.message
    });
  }
};

// @desc    Create new Vehicle Model
// @route   POST /api/vehicle-settings/models
// @access  Private (Admin)
exports.createModel = async (req, res) => {
  try {
    const {
      category,
      variantName,
      brand,
      modelName,
      seatingCapacity,
      luggageCapacity,
      fuelTypes,
      defaultFuelType,
      mileage,
      baseFare,
      perKmRate,
      driverAllowancePerDay,
      minKmPerDay,
      isAcDefault,
      isActive,
      notes
    } = req.body;

    if (!category || !variantName || !brand || !modelName) {
      return res.status(400).json({
        success: false,
        message: 'Category, Variant, Brand, and Model Name are required'
      });
    }

    const settings = await VehicleSetting.getOrCreateDefault();

    // Check duplicate
    const exists = settings.models.some(
      m => m.modelName.toLowerCase() === modelName.trim().toLowerCase() &&
           m.variantName.toLowerCase() === variantName.trim().toLowerCase()
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Model "${modelName}" already exists in variant "${variantName}"`
      });
    }

    const newId = `mod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newModel = {
      id: newId,
      category,
      variantName: variantName.trim(),
      brand: brand.trim(),
      modelName: modelName.trim(),
      seatingCapacity: Number(seatingCapacity) || 4,
      luggageCapacity: Number(luggageCapacity) || 2,
      fuelTypes: Array.isArray(fuelTypes) && fuelTypes.length > 0 ? fuelTypes : ['petrol', 'diesel'],
      defaultFuelType: defaultFuelType || 'diesel',
      mileage: Number(mileage) || 15,
      baseFare: Number(baseFare) || 500,
      perKmRate: Number(perKmRate) || 12,
      driverAllowancePerDay: Number(driverAllowancePerDay) || 300,
      minKmPerDay: Number(minKmPerDay) || 250,
      isAcDefault: isAcDefault !== undefined ? isAcDefault : true,
      isActive: isActive !== undefined ? isActive : true,
      notes: notes || ''
    };

    settings.models.push(newModel);
    settings.updatedBy = req.admin?._id;
    await settings.save();
    await syncModelPricing(newModel, req.admin._id);

    res.status(201).json({
      success: true,
      message: 'Vehicle model created successfully',
      data: newModel
    });
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle model',
      error: error.message
    });
  }
};

// @desc    Update Vehicle Model
// @route   PUT /api/vehicle-settings/models/:id
// @access  Private (Admin)
exports.updateModel = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const settings = await VehicleSetting.getOrCreateDefault();
    const modelIndex = settings.models.findIndex(m => m.id === id);

    if (modelIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle model not found'
      });
    }

    const current = settings.models[modelIndex];

    settings.models[modelIndex] = {
      ...current.toObject ? current.toObject() : current,
      category: updates.category || current.category,
      variantName: updates.variantName !== undefined ? updates.variantName.trim() : current.variantName,
      brand: updates.brand !== undefined ? updates.brand.trim() : current.brand,
      modelName: updates.modelName !== undefined ? updates.modelName.trim() : current.modelName,
      seatingCapacity: updates.seatingCapacity !== undefined ? Number(updates.seatingCapacity) : current.seatingCapacity,
      luggageCapacity: updates.luggageCapacity !== undefined ? Number(updates.luggageCapacity) : current.luggageCapacity,
      fuelTypes: updates.fuelTypes || current.fuelTypes,
      defaultFuelType: updates.defaultFuelType || current.defaultFuelType,
      mileage: updates.mileage !== undefined ? Number(updates.mileage) : current.mileage,
      baseFare: updates.baseFare !== undefined ? Number(updates.baseFare) : current.baseFare,
      perKmRate: updates.perKmRate !== undefined ? Number(updates.perKmRate) : current.perKmRate,
      driverAllowancePerDay: updates.driverAllowancePerDay !== undefined ? Number(updates.driverAllowancePerDay) : current.driverAllowancePerDay,
      minKmPerDay: updates.minKmPerDay !== undefined ? Number(updates.minKmPerDay) : current.minKmPerDay,
      isAcDefault: updates.isAcDefault !== undefined ? updates.isAcDefault : current.isAcDefault,
      isActive: updates.isActive !== undefined ? updates.isActive : current.isActive,
      notes: updates.notes !== undefined ? updates.notes : current.notes
    };

    settings.updatedBy = req.admin?._id;
    await settings.save();
    await syncModelPricing(settings.models[modelIndex], req.admin._id);

    res.status(200).json({
      success: true,
      message: 'Vehicle model updated successfully',
      data: settings.models[modelIndex]
    });
  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle model',
      error: error.message
    });
  }
};

// @desc    Delete Vehicle Model
// @route   DELETE /api/vehicle-settings/models/:id
// @access  Private (Admin)
exports.deleteModel = async (req, res) => {
  try {
    const { id } = req.params;
    const settings = await VehicleSetting.getOrCreateDefault();

    const exists = settings.models.some(m => m.id === id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle model not found'
      });
    }

    settings.models = settings.models.filter(m => m.id !== id);
    settings.updatedBy = req.admin?._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle model deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle model',
      error: error.message
    });
  }
};

// @desc    Update Platform Fee (flat ₹ added to every booking)
// @route   PUT /api/vehicle-settings/platform-fee
// @access  Private (Admin)
exports.updatePlatformFee = async (req, res) => {
  try {
    const fee = Number(req.body.platformFee);
    if (!Number.isFinite(fee) || fee < 0) {
      return res.status(400).json({ success: false, message: 'Platform fee must be 0 or more' });
    }

    const settings = await VehicleSetting.getOrCreateDefault();
    settings.platformFee = Math.round(fee);
    settings.updatedBy = req.admin?._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Platform fee updated successfully',
      data: { platformFee: settings.platformFee }
    });
  } catch (error) {
    console.error('Error updating platform fee:', error);
    res.status(500).json({ success: false, message: 'Failed to update platform fee' });
  }
};

// @desc    Update advance payment % (paid online at booking; rest in cash to driver)
// @route   PUT /api/vehicle-settings/advance-percentage
// @access  Private (Admin)
exports.updateAdvancePercentage = async (req, res) => {
  try {
    const pct = Number(req.body.advancePercentage);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      return res.status(400).json({ success: false, message: 'Advance percentage must be between 1 and 100' });
    }

    const settings = await VehicleSetting.getOrCreateDefault();
    settings.advancePercentage = Math.round(pct);
    settings.updatedBy = req.admin?._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Advance percentage updated successfully',
      data: { advancePercentage: settings.advancePercentage }
    });
  } catch (error) {
    console.error('Error updating advance percentage:', error);
    res.status(500).json({ success: false, message: 'Failed to update advance percentage' });
  }
};

// @desc    Update Fuel Rates
// @route   PUT /api/vehicle-settings/fuel-rates
// @access  Private (Admin)
exports.updateFuelRates = async (req, res) => {
  try {
    const { petrol, diesel, cng, electric } = req.body;
    const settings = await VehicleSetting.getOrCreateDefault();

    if (petrol !== undefined) settings.fuelRates.petrol = Number(petrol);
    if (diesel !== undefined) settings.fuelRates.diesel = Number(diesel);
    if (cng !== undefined) settings.fuelRates.cng = Number(cng);
    if (electric !== undefined) settings.fuelRates.electric = Number(electric);
    settings.fuelRates.lastUpdated = new Date();

    settings.updatedBy = req.admin?._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Fuel rates updated successfully',
      data: settings.fuelRates
    });
  } catch (error) {
    console.error('Error updating fuel rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update fuel rates',
      error: error.message
    });
  }
};

// @desc    Calculate Trip Cost & Fare Breakdown (Savaari.com style)
// @route   POST /api/vehicle-settings/calculate-trip-cost
// @access  Public / Admin
exports.calculateTripCost = async (req, res) => {
  try {
    const {
      distance,           // in KM (e.g. 200 for Indore to Bhopal)
      modelId,            // e.g. 'mod_dzire'
      modelName,          // or model name string
      fuelType,           // 'diesel' | 'petrol' | 'cng' | 'electric'
      tripType = 'one-way', // 'one-way' | 'return'
      days = 1,
      customMileage,
      customFuelRate
    } = req.body;

    const km = Number(distance);
    if (!km || km <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid distance in kilometers is required'
      });
    }

    const settings = await VehicleSetting.getOrCreateDefault();
    
    // Find target model
    let selectedModel = null;
    if (modelId) {
      selectedModel = settings.models.find(m => m.id === modelId);
    } else if (modelName) {
      selectedModel = settings.models.find(m => m.modelName.toLowerCase() === modelName.toLowerCase());
    }

    // If model not found, fallback to standard defaults
    const model = selectedModel || {
      modelName: modelName || 'Standard Vehicle',
      category: 'car',
      variantName: 'Sedan',
      mileage: 18.0,
      perKmRate: 12.0,
      baseFare: 500,
      driverAllowancePerDay: 300,
      minKmPerDay: 250,
      defaultFuelType: 'diesel'
    };

    const effectiveFuelType = fuelType || model.defaultFuelType || 'diesel';
    const effectiveMileage = Number(customMileage) || model.mileage || 15;
    const effectiveFuelRate = Number(customFuelRate) || settings.fuelRates[effectiveFuelType] || 95.0;

    // Savaari Outstation Algorithm:
    const effectiveTravelKm = tripType === 'return' ? km * 2 : km;
    const minBillableKm = (model.minKmPerDay || 250) * Math.max(1, Number(days) || 1);
    const billableKm = Math.max(effectiveTravelKm, minBillableKm);

    // Fuel Consumption & Expense
    const fuelLitersRequired = Number((effectiveTravelKm / effectiveMileage).toFixed(2));
    const estimatedFuelCost = Math.round(fuelLitersRequired * effectiveFuelRate);

    // Driver Bata / Allowance
    const totalDriverAllowance = (model.driverAllowancePerDay || 300) * Math.max(1, Number(days) || 1);

    // Distance Fare
    const distanceFare = Math.round(billableKm * (model.perKmRate || 12));
    const baseFare = model.baseFare || 500;

    // Total Customer Fare
    const totalEstimatedFare = baseFare + distanceFare + totalDriverAllowance;

    // Estimated Operating Expense and Driver/Fleet Net Margin
    const totalOperatingCost = estimatedFuelCost + totalDriverAllowance;
    const estimatedNetMargin = totalEstimatedFare - totalOperatingCost;
    const profitMarginPercentage = totalEstimatedFare > 0 ? Number(((estimatedNetMargin / totalEstimatedFare) * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      data: {
        inputs: {
          distance: km,
          tripType,
          days: Number(days) || 1,
          fuelType: effectiveFuelType,
          modelName: model.modelName,
          variantName: model.variantName,
          category: model.category,
          mileage: effectiveMileage,
          fuelRate: effectiveFuelRate
        },
        breakdown: {
          effectiveTravelKm,
          minBillableKm,
          billableKm,
          fuelLitersRequired,
          fuelRatePerUnit: effectiveFuelRate,
          estimatedFuelCost,
          driverAllowancePerDay: model.driverAllowancePerDay || 300,
          totalDriverAllowance,
          perKmRate: model.perKmRate || 12,
          distanceFare,
          baseFare,
          totalEstimatedFare,
          totalOperatingCost,
          estimatedNetMargin,
          profitMarginPercentage
        },
        formulaSummary: `Travel: ${effectiveTravelKm} km | Consumption: ~${fuelLitersRequired} L/kg @ ${effectiveMileage} km/L | Fuel Cost: ₹${estimatedFuelCost} | Driver Bata: ₹${totalDriverAllowance} | Total Fare: ₹${totalEstimatedFare}`
      }
    });
  } catch (error) {
    console.error('Error calculating trip cost:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate trip cost',
      error: error.message
    });
  }
};
