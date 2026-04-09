const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actorType: { type: String, enum: ['user', 'dealer'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  actorName: String,
  actorEmail: String,
  action: {
    type: String,
    enum: [
      'LOGIN', 'SIGNUP', 'LOGOUT',
      'PRODUCT_ADD', 'PRODUCT_EDIT', 'PRODUCT_DELETE',
      'ORDER_PLACED', 'ORDER_STATUS_UPDATE',
      'CART_ADD', 'WISHLIST_ADD',
      'REVIEW_ADD', 'PROFILE_UPDATE', 'ADDRESS_ADD'
    ],
    required: true
  },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // extra details
  ip: String
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
