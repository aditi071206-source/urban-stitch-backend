const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const Coupon = require('../models/Coupon');
const ActivityLog = require('../models/ActivityLog');
const { protect, dealerProtect } = require('../middleware/auth');

const log = (user, action, meta = {}) => {
  ActivityLog.create({ actorType: 'user', actorId: user._id, actorName: user.name, actorEmail: user.email, action, meta }).catch(() => {});
};

// Place order
router.post('/', protect, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, transactionId } = req.body;
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: 'Cart is empty' });

    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      image: item.product.images[0] || '',
      price: item.price,
      quantity: item.quantity,
      size: item.size
    }));

    const itemsPrice = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discountAmount = cart.discount || 0;
    const totalPrice = itemsPrice - discountAmount;

    const expectedDelivery = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',
      itemsPrice,
      discountAmount,
      totalPrice,
      couponCode: cart.couponCode,
      transactionId,
      expectedDelivery
    });

    // Update coupon usage
    if (cart.couponCode) {
      await Coupon.findOneAndUpdate({ code: cart.couponCode }, { $inc: { usedCount: 1 } });
    }

    // Check low stock and update
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (product) {
        const sizeIdx = product.sizes.findIndex(s => s.size === item.size);
        if (sizeIdx > -1) {
          product.sizes[sizeIdx].stock = Math.max(0, product.sizes[sizeIdx].stock - item.quantity);
          await product.save();
          // Low stock notification
          const totalStock = product.sizes.reduce((s, sz) => s + sz.stock, 0);
          if (totalStock < 5) {
            await Notification.create({
              type: 'LOW_STOCK',
              title: 'Low Stock Alert',
              message: `${product.name} is running low on stock (${totalStock} left)`,
              relatedId: product._id
            });
          }
        }
      }
    }

    // New order notification
    await Notification.create({
      type: 'NEW_ORDER',
      title: 'New Order Received',
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} placed by ${req.user.name} for ₹${totalPrice}`,
      relatedId: order._id
    });

    if (paymentMethod !== 'COD') {
      await Notification.create({
        type: 'PAYMENT',
        title: 'Payment Confirmed',
        message: `Payment of ₹${totalPrice} received for order #${order._id.toString().slice(-6).toUpperCase()}`,
        relatedId: order._id
      });
    }

    // Clear cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], couponCode: null, discount: 0 });
    log(req.user, 'ORDER_PLACED', { orderId: order._id, totalPrice, itemCount: orderItems.length, paymentMethod });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all orders (dealer)
router.get('/', dealerProtect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { orderStatus: status } : {};
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel order (user)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (['Delivered', 'Cancelled'].includes(order.orderStatus))
      return res.status(400).json({ message: `Cannot cancel a ${order.orderStatus} order` });

    const hoursSincePlaced = (Date.now() - new Date(order.createdAt)) / (1000 * 60 * 60);
    const refundPercent = hoursSincePlaced <= 24 ? 50 : 0;

    order.orderStatus = 'Cancelled';
    order.cancelledAt = new Date();
    order.refundPercent = refundPercent;
    await order.save();

    await Notification.create({
      type: 'ORDER_CANCELLED',
      title: 'Order Cancelled',
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} cancelled by ${req.user.name}. Refund: ${refundPercent}%`,
      relatedId: order._id
    });

    res.json({ order, refundPercent, message: refundPercent > 0 ? `Order cancelled. ${refundPercent}% refund will be processed.` : 'Order cancelled. No refund applicable.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status (dealer)
router.put('/:id/status', dealerProtect, async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const updates = { orderStatus };
    if (orderStatus === 'Delivered') updates.deliveredAt = new Date();
    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
