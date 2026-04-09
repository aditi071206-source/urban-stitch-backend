const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { dealerProtect } = require('../middleware/auth');

router.get('/', dealerProtect, async (req, res) => {
  try {
    const notifications = await Notification.find().sort('-createdAt').limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/read', dealerProtect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/read-all', dealerProtect, async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
