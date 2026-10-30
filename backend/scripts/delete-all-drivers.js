require('dotenv').config();
const mongoose = require('mongoose');

const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

const deleteAllDrivers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI || 'mongodb://localhost:27017/chalo_sawari';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    // 1. Get counts
    const totalDrivers = await Driver.countDocuments();
    const totalVehicles = await Vehicle.countDocuments();
    console.log(`\n📊 Current database state:`);
    console.log(`- Total Drivers: ${totalDrivers}`);
    console.log(`- Total Vehicles: ${totalVehicles}`);

    if (totalDrivers === 0) {
      console.log('\n⚠️ No drivers found in the database to delete.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // 2. Delete all vehicles belonging to drivers
    console.log('\n🗑️ Deleting associated vehicles...');
    const vehicleDeleteResult = await Vehicle.deleteMany({});
    console.log(`✅ Deleted ${vehicleDeleteResult.deletedCount} vehicle(s).`);

    // 3. Update bookings to remove driver references if any
    console.log('\n🔄 Updating booking records to unassign drivers...');
    const bookingUpdateResult = await Booking.updateMany(
      { driver: { $exists: true, $ne: null } },
      { $unset: { driver: "", vehicle: "" } }
    );
    console.log(`✅ Updated ${bookingUpdateResult.modifiedCount} booking(s).`);

    // 4. Delete all drivers
    console.log('\n🗑️ Deleting all drivers...');
    const driverDeleteResult = await Driver.deleteMany({});
    console.log(`✅ Deleted ${driverDeleteResult.deletedCount} driver(s).`);

    console.log('\n========================================');
    console.log('🎉 ALL DRIVERS AND ASSOCIATED VEHICLES SUCCESSFULLY DELETED!');
    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting drivers:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

deleteAllDrivers();
