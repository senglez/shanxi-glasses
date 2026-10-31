const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const config = require('../config');

fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED.has(file.mimetype)),
});

// Resizes to max 1600px and converts to WebP for page speed. Returns public URL.
async function saveImage(file, nameHint = 'img') {
  const base = (nameHint || 'img').toString().replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 50);
  const filename = `${base}-${crypto.randomBytes(4).toString('hex')}.webp`;
  await sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(config.UPLOAD_DIR, filename));
  return '/uploads/' + filename;
}

module.exports = { upload, saveImage };
