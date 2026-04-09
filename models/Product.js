const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  originalPrice: Number,
  discount: Number,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: String,
  sizes: [{ size: String, stock: Number }],
  images: [String],
  brand: String,
  tags: [String],
  ratings: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
