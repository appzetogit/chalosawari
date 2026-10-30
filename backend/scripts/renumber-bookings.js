// One-off: give existing bookings short sequential numbers (CS001, CS002, ...) in creation order,
// then move the counter past them so new bookings continue the sequence.
// Usage: node scripts/renumber-bookings.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_PROD || 'mongodb://localhost:27017/chalo_sawari');
  const bookings = mongoose.connection.collection('bookings');
  const counters = mongoose.connection.collection('counters');

  const all = await bookings.find({}, { projection: { _id: 1, bookingNumber: 1 } }).sort({ createdAt: 1 }).toArray();

  // Two passes so a new number never collides with an old one still in the unique index
  for (const b of all) {
    await bookings.updateOne({ _id: b._id }, { $set: { bookingNumber: `TMP_${b._id}` } });
  }
  let seq = 0;
  for (const b of all) {
    seq += 1;
    const number = `CS${String(seq).padStart(3, '0')}`;
    await bookings.updateOne({ _id: b._id }, { $set: { bookingNumber: number } });
    console.log(`${b.bookingNumber} -> ${number}`);
  }

  await counters.updateOne({ _id: 'bookingNumber' }, { $set: { seq } }, { upsert: true });
  console.log(`Done: ${seq} bookings renumbered, next booking will be CS${String(seq + 1).padStart(3, '0')}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
