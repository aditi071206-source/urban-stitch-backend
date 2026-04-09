const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

if (process.env.NODE_ENV !== 'production') dotenv.config();

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/dealer', require('./routes/dealer'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/activity', require('./routes/activity'));

app.get('/', (req, res) => res.json({ message: 'Urban Stitch Vastra API Running' }));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    const Order = require('./models/Order');
    const autoDeliver = async () => {
      try {
        const result = await Order.updateMany(
          { orderStatus: { $in: ['Processing', 'Shipped'] }, expectedDelivery: { $lte: new Date() } },
          { orderStatus: 'Delivered', deliveredAt: new Date() }
        );
        if (result.modifiedCount > 0) console.log(`Auto-delivered ${result.modifiedCount} order(s)`);
      } catch (e) { console.error('Auto-deliver error:', e.message); }
    };
    autoDeliver();
    setInterval(autoDeliver, 5 * 60 * 1000);
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
