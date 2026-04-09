const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products', 'name images price ratings');
    res.json(wishlist || { products: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/toggle/:productId', protect, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [] });
    const idx = wishlist.products.indexOf(req.params.productId);
    let added;
    if (idx > -1) {
      wishlist.products.splice(idx, 1);
      added = false;
    } else {
      wishlist.products.push(req.params.productId);
      added = true;
    }
    await wishlist.save();
    res.json({ added, productId: req.params.productId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
