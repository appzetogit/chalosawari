require('dotenv').config();
const mongoose = require('mongoose');
const VehiclePricing = require('../models/VehiclePricing');

const deleteAllVehiclePricing = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI || 'mongodb://localhost:27017/chalo_sawari';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    const totalCount = await VehiclePricing.countDocuments();
    console.log(`\n📊 Current Vehicle Pricing records in DB: ${totalCount}`);

    if (totalCount === 0) {
      console.log('\n⚠️ No vehicle pricing records found to delete.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('\n🗑️ Deleting all vehicle pricing records...');
    const result = await VehiclePricing.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} vehicle pricing record(s).`);

    console.log('\n========================================');
    console.log('🎉 ALL VEHICLE PRICING DATA SUCCESSFULLY DELETED!');
    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting vehicle pricing:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

deleteAllVehiclePricing();
