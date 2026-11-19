// Create an admin, or reset the password of an existing one.
// Usage: npm run create-admin -- <email> <password> [firstName] [lastName]
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const [emailArg, password, firstName = 'Admin', lastName = 'User'] = process.argv.slice(2);
const email = String(emailArg || '').trim().toLowerCase();

if (!/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 6) {
  console.error('Usage: npm run create-admin -- <email> <password (min 6 chars)> [firstName] [lastName]');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_PROD || 'mongodb://localhost:27017/chalo_sawari');
  let admin = await Admin.findOne({ email });
  if (admin) {
    admin.password = password;
    admin.loginAttempts = 0;
    admin.lockUntil = null;
    await admin.save();
    console.log(`Password reset for admin ${email}`);
  } else {
    admin = await Admin.create({ firstName, lastName, email, password });
    console.log(`Admin created: ${email}`);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
