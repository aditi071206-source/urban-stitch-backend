const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const { dealerProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Convert uploaded file buffer to base64 data URL
const toDataUrl = (file) => {
  const mime = file.mimetype || 'image/jpeg';
  return `data:${mime};base64,${file.buffer.toString('base64')}`;
};

const processImages = (files) => {
  if (!files || files.length === 0) return [];
  return files.map(f => toDataUrl(f));
};

const log = (dealer, action, meta = {}) => {
  ActivityLog.create({ actorType: 'dealer', actorId: dealer._id, actorName: dealer.name, actorEmail: dealer.email, action, meta }).catch(() => {});
};

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, size, search, featured, sort, page = 1, limit = 12 } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
    if (size) query['sizes.size'] = size;

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    if (sort === 'price_desc') sortObj = { price: -1 };
    if (sort === 'rating') sortObj = { ratings: -1 };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ products, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create product (dealer)
router.post('/', dealerProtect, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, originalPrice, category, subCategory, sizes, brand, tags, isFeatured } = req.body;
    // Use uploaded files if present, otherwise use images array from JSON body
    let images = [];
    if (req.files && req.files.length > 0) {
      images = processImages(req.files);
    } else if (req.body.images) {
      images = Array.isArray(req.body.images) ? req.body.images : JSON.parse(req.body.images);
    }
    const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    const product = await Product.create({
      name, description, price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      discount: originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0,
      category, subCategory, sizes: parsedSizes || [],
      images, brand, tags: parsedTags || [],
      isFeatured: isFeatured === 'true',
      dealer: req.dealer._id
    });
    log(req.dealer, 'PRODUCT_ADD', { productId: product._id, name: product.name, price: product.price, category });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update product (dealer)
router.put('/:id', dealerProtect, upload.array('images', 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const updates = { ...req.body };
    if (req.files?.length) {
      updates.images = await processImages(req.files);
    } else if (req.body.images) {
      updates.images = Array.isArray(req.body.images) ? req.body.images : JSON.parse(req.body.images);
    }
    } else if (req.body.images && !req.files?.length) {
      updates.images = Array.isArray(req.body.images) ? req.body.images : JSON.parse(req.body.images);
    }
    if (updates.sizes && typeof updates.sizes === 'string') updates.sizes = JSON.parse(updates.sizes);
    if (updates.tags && typeof updates.tags === 'string') updates.tags = JSON.parse(updates.tags);
    if (updates.price && updates.originalPrice)
      updates.discount = Math.round(((updates.originalPrice - updates.price) / updates.originalPrice) * 100);
    const updated = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    log(req.dealer, 'PRODUCT_EDIT', { productId: req.params.id, name: updated.name });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete product (dealer)
router.delete('/:id', dealerProtect, async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    log(req.dealer, 'PRODUCT_DELETE', { productId: req.params.id });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
