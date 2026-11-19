// Pending OTPs live in MongoDB (not process memory): a deploy / pm2 restart no longer invalidates an OTP
// the user already received, and it keeps working if the API ever runs as several processes.
// Mongo's TTL index deletes each entry at its expiresAt.
const mongoose = require('mongoose');

const PendingOtp = mongoose.models.PendingOtp || mongoose.model('PendingOtp', new mongoose.Schema({
  _id: String,                        // `${role}:${phone}`
  data: mongoose.Schema.Types.Mixed,  // { code, expiresAt, attempts, purpose, isNewUser, verified, isTestUser/isTestDriver }
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
}, { versionKey: false }));

const makeStore = (role) => {
  const key = (phone) => `${role}:${phone}`;
  return {
    async get(phone) {
      const doc = await PendingOtp.findById(key(phone)).lean();
      return doc ? doc.data : undefined;
    },
    async has(phone) {
      return !!(await PendingOtp.exists({ _id: key(phone) }));
    },
    async set(phone, data) {
      await PendingOtp.updateOne(
        { _id: key(phone) },
        { $set: { data, expiresAt: data.expiresAt || new Date(Date.now() + 15 * 60 * 1000) } },
        { upsert: true }
      );
    },
    async delete(phone) {
      await PendingOtp.deleteOne({ _id: key(phone) });
    }
  };
};

module.exports = { userOtps: makeStore('user'), driverOtps: makeStore('driver') };
