// Single rule for who earns what from one booking; used by the driver app and the admin earnings screens.
// - Advance (partial) booking: the online advance is the platform's share, the cash collected is the driver's.
// - Full online payment: the platform keeps its fee (minus any coupon discount), the rest is the driver's fare.
// pricing.totalAmount is already after the coupon discount.
const round2 = (n) => Math.round(n * 100) / 100;

const bookingSplit = (b) => {
  const total = Number(b.pricing?.totalAmount) || 0;
  const fee = Number(b.pricing?.platformFee) || 0;
  const discount = Number(b.pricing?.discount) || 0;
  const platform = b.payment?.isPartialPayment
    ? Number(b.payment?.partialPaymentDetails?.onlineAmount ?? b.payment?.amount ?? 0)
    : Math.max(0, fee - discount);
  return { total: round2(total), platform: round2(platform), driver: round2(Math.max(0, total - platform)) };
};

// What the customer actually paid online (the most a cancellation can refund through Razorpay)
const paidOnline = (b) => {
  const partial = b.payment?.isPartialPayment ? b.payment.partialPaymentDetails : null;
  if (partial) return partial.onlinePaymentStatus === 'completed' ? Number(partial.onlineAmount) || 0 : 0;
  return b.payment?.status === 'completed' ? Number(b.payment.amount || b.pricing?.totalAmount) || 0 : 0;
};

module.exports = { bookingSplit, paidOnline };

if (require.main === module) {
  const assert = require('assert');
  // advance: 20% of 1000 online, 800 cash to driver
  assert.deepStrictEqual(bookingSplit({ pricing: { totalAmount: 1000 }, payment: { isPartialPayment: true, partialPaymentDetails: { onlineAmount: 200 } } }), { total: 1000, platform: 200, driver: 800 });
  // full payment with ₹50 fee and ₹20 coupon
  assert.deepStrictEqual(bookingSplit({ pricing: { totalAmount: 1030, platformFee: 50, discount: 20 }, payment: {} }), { total: 1030, platform: 30, driver: 1000 });
  // full payment, no fee: everything is the driver's fare
  assert.deepStrictEqual(bookingSplit({ pricing: { totalAmount: 900 }, payment: { amount: 900 } }), { total: 900, platform: 0, driver: 900 });
  console.log('bookingSplit checks pass');
}
