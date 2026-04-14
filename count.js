require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const t = await Product.countDocuments();
  const active = await Product.countDocuments({ isActive: true });
  console.log('Total:', t, '| Active:', active);
  process.exit(0);
});
