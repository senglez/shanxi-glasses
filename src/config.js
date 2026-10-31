const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const ROOT = path.join(__dirname, '..');

module.exports = {
  ROOT,
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  // Public URL without trailing slash. Used for canonical URLs, sitemap, JSON-LD.
  SITE_URL: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-only-change-me',
  ADMIN_USER: process.env.ADMIN_USER || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  DB_PATH: process.env.DB_PATH || path.join(ROOT, 'data', 'site.db'),
  UPLOAD_DIR: path.join(ROOT, 'public', 'uploads'),
  SMTP: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },
  TRUST_PROXY: process.env.TRUST_PROXY || 'loopback',
};
