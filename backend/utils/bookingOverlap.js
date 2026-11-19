// Statuses in which a booking still holds its vehicle
const ACTIVE_BOOKING_STATUSES = ['pending', 'accepted', 'started', 'cancellation_requested'];

// Mongo filter: active bookings whose trip [date, returnDate || date] overlaps [start, end].
// Dates are 'YYYY-MM-DD' strings, so text comparison orders them correctly.
const overlappingBookingsQuery = (start, end) => {
  const last = end && end > start ? end : start;
  return {
    status: { $in: ACTIVE_BOOKING_STATUSES },
    'tripDetails.date': { $lte: last },
    $or: [
      { 'tripDetails.returnDate': { $gte: start } },
      { 'tripDetails.returnDate': { $in: [null, ''] }, 'tripDetails.date': { $gte: start } }
    ]
  };
};

// Ids (strings) of vehicles that are already booked for any day in [start, end]
const bookedVehicleIds = async (Booking, start, end, vehicleIds) => {
  if (!start) return new Set();
  const filter = overlappingBookingsQuery(start, end);
  if (vehicleIds) filter.vehicle = { $in: vehicleIds };
  const ids = await Booking.distinct('vehicle', filter);
  return new Set(ids.map(String));
};

module.exports = { ACTIVE_BOOKING_STATUSES, overlappingBookingsQuery, bookedVehicleIds };
