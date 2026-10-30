// Create an admin, or reset the password of an existing one.
// Usage: npm run create-admin -- <phone> <password> [firstName] [lastName]
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const [phoneArg, password, firstName = 'Admin', lastName = 'User'] = process.argv.slice(2);
const phone = String(phoneArg || '').replace(/[^0-9]/g, '').slice(-10);

if (phone.length !== 10 || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- <10-digit phone> <password (min 8 chars)> [firstName] [lastName]');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_PROD || 'mongodb://localhost:27017/chalo_sawari');
  let admin = await Admin.findOne({ phone });
  if (admin) {
    admin.password = password;
    admin.loginAttempts = 0;
    admin.lockUntil = null;
    await admin.save();
    console.log(`Password reset for admin ${phone}`);
  } else {
    admin = await Admin.create({ firstName, lastName, phone, password });
    console.log(`Admin created: ${phone}`);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
