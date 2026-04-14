const multer = require('multer');
const path = require('path');

// Use memory storage - we'll convert to base64 and store in DB
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  ext ? cb(null, true) : cb(new Error('Only images allowed'));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
