const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Dealer = require('../models/Dealer');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

// Admin guard middleware
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access only' });
  next();
};

// Full stats overview
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalDealers, totalOrders, totalProducts, orders, users, dealers] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Dealer.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.find().populate('user', 'name email'),
      User.find({ role: 'user' }).select('-password').sort('-createdAt').limit(5),
      Dealer.find().select('-password').sort('-createdAt').limit(5)
    ]);

    const totalRevenue = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const paidOrders = orders.filter(o => o.paymentStatus === 'Paid');
    const paidRevenue = paidOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);

    const statusCounts = {
      Processing: orders.filter(o => o.orderStatus === 'Processing').length,
      Shipped: orders.filter(o => o.orderStatus === 'Shipped').length,
      Delivered: orders.filter(o => o.orderStatus === 'Delivered').length,
      Cancelled: orders.filter(o => o.orderStatus === 'Cancelled').length,
    };

    // Monthly revenue (last 6 months)
    const now = new Date();
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthOrders = orders.filter(o => new Date(o.createdAt) >= d && new Date(o.createdAt) < end);
      const monthUsers = await User.countDocuments({ role: 'user', createdAt: { $gte: d, $lt: end } });
      const monthDealers = await Dealer.countDocuments({ createdAt: { $gte: d, $lt: end } });
      monthlyRevenue.push({
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue: monthOrders.reduce((s, o) => s + (o.totalPrice || 0), 0),
        orders: monthOrders.length,
        newUsers: monthUsers,
        newDealers: monthDealers
      });
    }

    // Top spending users
    const userSpend = {};
    orders.forEach(o => {
      if (!o.user) return;
      const uid = o.user._id?.toString();
      if (!userSpend[uid]) userSpend[uid] = { user: o.user, totalSpent: 0, orderCount: 0 };
      userSpend[uid].totalSpent += o.totalPrice || 0;
      userSpend[uid].orderCount += 1;
    });
    const topUsers = Object.values(userSpend).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

    // Dealer product counts
    const dealerActivity = await Promise.all(
      (await Dealer.find().select('-password').sort('-createdAt').limit(8)).map(async d => {
        const productCount = await Product.countDocuments({ dealer: d._id, isActive: true });
        const dealerOrders = orders.filter(o =>
          o.orderItems?.some(item => item.product?.toString())
        ).length;
        return { ...d.toObject(), productCount };
      })
    );

    // Recent signups (users + dealers combined)
    const recentUsers = await User.find({ role: 'user' }).select('name email createdAt').sort('-createdAt').limit(6);
    const recentDealers = await Dealer.find().select('name email storeName createdAt').sort('-createdAt').limit(6);

    res.json({
      totalUsers, totalDealers, totalOrders, totalProducts,
      totalRevenue, paidRevenue, statusCounts, monthlyRevenue,
      topUsers, dealerActivity, recentUsers, recentDealers
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// All users + dealers combined
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type } = req.query;
    const searchRegex = search ? { $regex: search, $options: 'i' } : null;

    let users = [], dealers = [];

    if (!type || type === 'user') {
      const uQuery = { role: 'user' };
      if (searchRegex) uQuery.$or = [{ name: searchRegex }, { email: searchRegex }];
      const rawUsers = await User.find(uQuery).select('-password').sort('-createdAt').lean();
      users = rawUsers.map(u => ({ ...u, type: 'user' }));
    }

    if (!type || type === 'dealer') {
      const dQuery = {};
      if (searchRegex) dQuery.$or = [{ name: searchRegex }, { email: searchRegex }, { storeName: searchRegex }];
      const rawDealers = await Dealer.find(dQuery).select('-password').sort('-createdAt').lean();
      dealers = rawDealers.map(d => ({ ...d, type: 'dealer' }));
    }

    const combined = [...users, ...dealers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = combined.length;
    const lim = Number(limit);
    const paginated = combined.slice((page - 1) * lim, page * lim);

    res.json({ users: paginated, total, pages: Math.ceil(total / lim) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// All dealers
router.get('/dealers', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const dealers = await Dealer.find(query).select('-password').sort('-createdAt').skip((page - 1) * limit).limit(Number(limit));
    const total = await Dealer.countDocuments(query);

    // Attach product & order counts per dealer
    const dealersWithStats = await Promise.all(dealers.map(async d => {
      const productCount = await Product.countDocuments({ dealer: d._id, isActive: true });
      return { ...d.toObject(), productCount };
    }));

    res.json({ dealers: dealersWithStats, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// All orders (admin view)
router.get('/orders', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};
    if (status) query.orderStatus = status;
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

// Upcoming / active orders
router.get('/orders/upcoming', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: { $in: ['Processing', 'Shipped'] } })
      .populate('user', 'name email phone')
      .sort('createdAt')
      .limit(50);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle dealer active status
router.put('/dealers/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    dealer.isActive = !dealer.isActive;
    await dealer.save();
    res.json({ isActive: dealer.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status
router.put('/orders/:id/status', protect, adminOnly, async (req, res) => {
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

// Deep user detail
router.get('/users/:id/detail', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    const orders = await Order.find({ user: req.params.id }).sort('-createdAt');
    const totalSpent = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const activity = await ActivityLog.find({ actorId: req.params.id }).sort('-createdAt').limit(30);
    const productsBought = {};
    orders.forEach(o => o.orderItems?.forEach(item => {
      const k = item.name;
      if (!productsBought[k]) productsBought[k] = { name: k, qty: 0, spent: 0 };
      productsBought[k].qty += item.quantity;
      productsBought[k].spent += item.price * item.quantity;
    }));
    res.json({ user, orders, totalSpent, activity, productsBought: Object.values(productsBought).sort((a, b) => b.spent - a.spent) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Deep dealer detail
router.get('/dealers/:id/detail', protect, adminOnly, async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id).select('-password');
    const products = await Product.find({ dealer: req.params.id }).populate('category', 'name');
    const activity = await ActivityLog.find({ actorId: req.params.id }).sort('-createdAt').limit(30);
    // Sales per product
    const allOrders = await Order.find();
    const productSales = {};
    products.forEach(p => { productSales[p._id] = { name: p.name, price: p.price, sold: 0, revenue: 0, image: p.images?.[0] }; });
    allOrders.forEach(o => o.orderItems?.forEach(item => {
      if (productSales[item.product]) {
        productSales[item.product].sold += item.quantity;
        productSales[item.product].revenue += item.price * item.quantity;
      }
    }));
    const totalRevenue = Object.values(productSales).reduce((s, p) => s + p.revenue, 0);
    res.json({ dealer, products, activity, productSales: Object.values(productSales).sort((a, b) => b.revenue - a.revenue), totalRevenue });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Activity feed
router.get('/activity', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, actorType, action } = req.query;
    const query = {};
    if (actorType) query.actorType = actorType;
    if (action) query.action = action;
    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit));
    res.json({ logs, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
