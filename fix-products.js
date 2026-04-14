require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await Product.updateMany({}, { isActive: true });
  console.log('Fixed products:', result.modifiedCount);
  const total = await Product.countDocuments({ isActive: true });
  console.log('Total active products:', total);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
