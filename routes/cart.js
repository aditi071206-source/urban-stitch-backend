const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');

// Get cart
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name images price sizes');
    res.json(cart || { items: [], discount: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add to cart
router.post('/add', protect, async (req, res) => {
  try {
    const { productId, quantity = 1, size } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });

    const existingIdx = cart.items.findIndex(
      i => i.product.toString() === productId && i.size === size
    );
    if (existingIdx > -1) {
      cart.items[existingIdx].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity, size, price: product.price });
    }
    await cart.save();
    await cart.populate('items.product', 'name images price sizes');
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update quantity
router.put('/update/:itemId', protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (quantity <= 0) {
      cart.items.pull(req.params.itemId);
    } else {
      item.quantity = quantity;
    }
    await cart.save();
    await cart.populate('items.product', 'name images price sizes');
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove item
router.delete('/remove/:itemId', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    cart.items.pull(req.params.itemId);
    await cart.save();
    await cart.populate('items.product', 'name images price sizes');
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Apply coupon
router.post('/coupon', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      return res.status(400).json({ message: 'Coupon expired' });
    if (coupon.usedCount >= coupon.maxUses)
      return res.status(400).json({ message: 'Coupon usage limit reached' });

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'price');
    const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    if (subtotal < coupon.minOrderAmount)
      return res.status(400).json({ message: `Minimum order ₹${coupon.minOrderAmount} required` });

    let discount = coupon.discountType === 'percentage'
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;

    cart.couponCode = coupon.code;
    cart.discount = Math.min(discount, subtotal);
    await cart.save();
    res.json({ message: 'Coupon applied', discount: cart.discount, couponCode: cart.couponCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Clear cart
router.delete('/clear', protect, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], couponCode: null, discount: 0 });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
