require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

const deleteAllUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI || 'mongodb://localhost:27017/chalo_sawari';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    // 1. Get counts
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalPayments = await Payment.countDocuments();

    console.log(`\n📊 Current database state:`);
    console.log(`- Total Users: ${totalUsers}`);
    console.log(`- Total Bookings: ${totalBookings}`);
    console.log(`- Total Payments: ${totalPayments}`);

    if (totalUsers === 0) {
      console.log('\n⚠️ No users found in the database to delete.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // 2. Delete bookings and payments linked to users if any
    console.log('\n🗑️ Deleting associated bookings & payments...');
    const bookingResult = await Booking.deleteMany({});
    const paymentResult = await Payment.deleteMany({});
    console.log(`✅ Deleted ${bookingResult.deletedCount} booking(s).`);
    console.log(`✅ Deleted ${paymentResult.deletedCount} payment(s).`);

    // 3. Delete all users
    console.log('\n🗑️ Deleting all users...');
    const userDeleteResult = await User.deleteMany({});
    console.log(`✅ Deleted ${userDeleteResult.deletedCount} user(s).`);

    console.log('\n========================================');
    console.log('🎉 ALL USERS AND ASSOCIATED DATA SUCCESSFULLY DELETED!');
    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting users:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

deleteAllUsers();
