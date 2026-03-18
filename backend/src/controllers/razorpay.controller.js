const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Plan prices in paise (INR × 100)
const PLAN_PRICES = {
  'Starter': 1900,       // ₹19
  'Growth': 4900,        // ₹49
  'Professional': 9900   // ₹99
};

exports.createOrder = async (req, res) => {
  try {
    const { planName } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const amount = PLAN_PRICES[planName];
    if (!amount) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rcpt_${user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: user._id.toString(),
        planName
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    console.error('❌ Razorpay Order Error:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message || 'Failed to initiate payment'
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName } = req.body;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ status: 'fail', message: 'Invalid payment signature' });
    }

    // Payment verified — update user subscription
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    user.subscription.tier = planName.toLowerCase();
    user.subscription.status = 'active';
    user.subscription.expiresAt = expiresAt;
    user.subscription.razorpayOrderId = razorpay_order_id;
    user.subscription.razorpayPaymentId = razorpay_payment_id;

    // Store in payment history
    user.subscription.paymentHistory.push({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      planName,
      amount: PLAN_PRICES[planName] / 100, // convert paise to INR
      currency: 'INR',
      paidAt: new Date()
    });

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Payment verified and subscription activated',
      data: { user }
    });
  } catch (err) {
    console.error('❌ Payment Verification Error:', err);
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.handleWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = req.rawBody;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (signature === expectedSignature) {
    res.status(200).json({ status: 'ok' });
  } else {
    res.status(400).json({ message: 'Invalid signature' });
  }
};

exports.getMyInvoices = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const history = (user.subscription.paymentHistory || []).reverse(); // newest first
    res.status(200).json({ status: 'success', data: { invoices: history } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};
