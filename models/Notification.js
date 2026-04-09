const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer' },
  type: { type: String, enum: ['NEW_ORDER', 'PAYMENT', 'LOW_STOCK', 'GENERAL'] },
  title: String,
  message: String,
  isRead: { type: Boolean, default: false },
  relatedId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
