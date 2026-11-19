// Refunds booking payments that were captured by Razorpay but never became a booking
// (app closed / network dropped after paying, token expired before /verify, booking call never arrived).
// Razorpay is the source of truth: every captured booking payment older than GRACE must be claimed by a booking.
const Payment = require('../models/Payment');
const RazorpayService = require('../services/razorpayService');

const GRACE_MS = 30 * 60 * 1000;          // a normal checkout finishes within seconds; 30 min is safe
const LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
const INTERVAL_MS = 15 * 60 * 1000;
const CLAIM = 'auto_refund';              // Payment.booking marker: blocks createBooking from claiming it meanwhile

const refundOne = async (rp) => {
  const reason = 'Auto refund: payment not linked to any booking';
  const amount = rp.amount / 100;
  const local = await Payment.findOne({ transactionId: rp.id });

  if (local) {
    if (local.status !== 'completed' || local.booking) return; // booked, or already refunded/handled
    // Claim atomically so a late POST /bookings can't use it while we refund
    const claimed = await Payment.findOneAndUpdate(
      { _id: local._id, status: 'completed', booking: null },
      { $set: { booking: CLAIM } },
      { new: true }
    );
    if (!claimed) return;
    try {
      const refund = await RazorpayService.processRefund(rp.id, amount, reason);
      claimed.booking = undefined;
      await claimed.processRefund(amount, reason, refund.refundId);
      console.log(`💸 Auto-refunded unclaimed payment ${rp.id} (₹${amount})`);
    } catch (error) {
      await Payment.updateOne({ _id: claimed._id }, { $set: { booking: null } });
      console.error(`Auto-refund failed for ${rp.id}:`, error.message);
    }
    return;
  }

  // Never reached /payments/verify. Refund only if the order was created by this backend
  // (the Razorpay account may be shared with other apps).
  let order;
  try {
    order = await RazorpayService.fetchOrder(rp.order_id);
  } catch (error) {
    return console.error(`Order fetch failed for ${rp.id}:`, error.message);
  }
  if (order?.notes?.app !== 'chalosawari' || order.notes.type !== 'booking') return;
  const userId = order.notes.userId;
  try {
    const refund = await RazorpayService.processRefund(rp.id, amount, reason);
    if (userId) {
      const p = await Payment.create({
        user: userId,
        amount,
        method: 'razorpay',
        status: 'completed',
        type: 'booking',
        transactionId: rp.id,
        paymentGateway: 'razorpay',
        paymentDetails: { razorpayOrderId: rp.order_id, razorpayPaymentId: rp.id, method: rp.method }
      });
      await p.processRefund(amount, reason, refund.refundId);
    }
    console.log(`💸 Auto-refunded unverified payment ${rp.id} (₹${amount})`);
  } catch (error) {
    console.error(`Auto-refund failed for unverified ${rp.id}:`, error.message);
  }
};

const sweep = async () => {
  if (!RazorpayService.isConfigured()) return;
  const now = Date.now();
  const payments = await RazorpayService.listPayments(
    Math.floor((now - LOOKBACK_MS) / 1000),
    Math.floor((now - GRACE_MS) / 1000)
  );
  for (const rp of payments) {
    // Captured, not refunded, and paid against an order (app checkouts always use one); ownership checked in refundOne
    if (rp.status === 'captured' && !rp.amount_refunded && rp.order_id) {
      await refundOne(rp);
    }
  }
};

// ponytail: in-process timer, runs on every server instance; add a lock if the backend ever runs as a pm2 cluster
const startOrphanPaymentSweeper = () => {
  const run = () => sweep().catch(e => console.error('Orphan payment sweep failed:', e.message));
  setTimeout(run, 60 * 1000); // after boot, once Mongo is connected
  setInterval(run, INTERVAL_MS);
};

module.exports = { startOrphanPaymentSweeper, sweep };
