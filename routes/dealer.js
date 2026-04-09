const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Dealer = require('../models/Dealer');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const { dealerProtect } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const log = (dealer, action, meta = {}) => {
  ActivityLog.create({ actorType: 'dealer', actorId: dealer._id, actorName: dealer.name, actorEmail: dealer.email, action, meta }).catch(() => {});
};

// Dealer login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const dealer = await Dealer.findOne({ email });
    if (!dealer || !(await dealer.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    log(dealer, 'LOGIN');
    const token = signToken(dealer._id);
    res.json({ token, dealer: { _id: dealer._id, name: dealer.name, email: dealer.email, storeName: dealer.storeName } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dealer register (for setup)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, storeName } = req.body;
    const exists = await Dealer.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const dealer = await Dealer.create({ name, email, password, phone, storeName });
    log(dealer, 'SIGNUP', { storeName });
    const token = signToken(dealer._id);
    res.status(201).json({ token, dealer: { _id: dealer._id, name: dealer.name, email: dealer.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dashboard stats
router.get('/dashboard', dealerProtect, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const orders = await Order.find();
    const revenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const recentOrders = await Order.find().sort('-createdAt').limit(5).populate('user', 'name email');
    const lowStockProducts = await Product.find({ 'sizes.stock': { $lt: 5 } }).limit(5);
    res.json({ totalProducts, totalOrders, revenue, recentOrders, lowStockProducts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
