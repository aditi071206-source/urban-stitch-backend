const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
};

// Get all activity logs (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, actorType, action, actorId } = req.query;
    const query = {};
    if (actorType) query.actorType = actorType;
    if (action) query.action = action;
    if (actorId) query.actorId = actorId;
    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit));
    res.json({ logs, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get activity for a specific user/dealer
router.get('/:actorId', protect, adminOnly, async (req, res) => {
  try {
    const logs = await ActivityLog.find({ actorId: req.params.actorId }).sort('-createdAt').limit(100);
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
