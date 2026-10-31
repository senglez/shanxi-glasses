const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(config.DB_PATH), { recursive: true });

const db = new Database(config.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  image TEXT,
  seo_title TEXT,
  seo_description TEXT,
  sort INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  specs TEXT,
  material TEXT,
  moq TEXT,
  lead_time TEXT,
  image TEXT,
  gallery TEXT,
  seo_title TEXT,
  seo_description TEXT,
  featured INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  cover TEXT,
  author TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published INTEGER DEFAULT 1,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Internal supplier database. Never exposed on the public site.
CREATE TABLE IF NOT EXISTS factories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  location TEXT,
  products TEXT,
  capability TEXT,
  contact_person TEXT,
  phone TEXT,
  wechat TEXT,
  email TEXT,
  rating INTEGER DEFAULT 0,
  source TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  country TEXT,
  phone TEXT,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  quantity TEXT,
  message TEXT NOT NULL,
  source_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new',
  factory_id INTEGER REFERENCES factories(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Items deleted (or renamed) in the local admin, so merging content/ from Git never brings them back
CREATE TABLE IF NOT EXISTS content_tombstones (
  tbl TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tbl, key)
);

CREATE TABLE IF NOT EXISTS redirects (
  id INTEGER PRIMARY KEY,
  from_path TEXT UNIQUE NOT NULL,
  to_path TEXT NOT NULL,
  hits INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Lightweight migrations for databases created by earlier versions
const inqCols = db.prepare('PRAGMA table_info(inquiries)').all().map((c) => c.name);
if (!inqCols.includes('external_id')) db.exec('ALTER TABLE inquiries ADD COLUMN external_id TEXT');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_inquiries_external ON inquiries(external_id) WHERE external_id IS NOT NULL');

// Settings that must never be written to the public repo / static site
const PRIVATE_SETTINGS = ['sync_token', 'sync_proxy', 'notify_email', 'last_sync_at'];

const DEFAULT_SETTINGS = {
  site_name: 'Shanxi Glassworks',
  tagline: 'Glassware sourced direct from Qixian, China’s glassware capital',
  home_title: 'Glassware Manufacturer & Sourcing Agent in Shanxi, China | Shanxi Glassworks',
  home_description:
    'Source hand-blown and machine-made glassware direct from vetted factories in Qixian, Shanxi: wine glasses, tumblers, borosilicate, vases, candle holders. OEM/ODM, low MOQ, QC and export handled.',
  contact_email: 'sales@example.com',
  notify_email: '',
  phone: '+86 000 0000 0000',
  whatsapp: '',
  // Pre-filled WhatsApp text. Placeholders: {site} {product} {url}
  whatsapp_message:
    "Hello {site} team! I found your website and I'm interested in sourcing glassware from China. Could you please send me your catalog with MOQ and prices?\n\nPage: {url}",
  whatsapp_product_message:
    "Hello {site} team! I'm interested in this product:\n{product}\n\nCould you please send me the price, MOQ and lead time?\n\n{url}",
  address: 'Qixian County, Jinzhong, Shanxi Province, China',
  founding_year: '',
  linkedin: '',
  facebook: '',
  instagram: '',
  youtube: '',
  ga4_id: '',
  google_verification: '',
  bing_verification: '',
  og_image: '/img/og-default.png',
  // Static site inquiry endpoint (Google Apps Script web app URL) and its private sync token
  web3forms_key: '', // public by design: it is embedded in the form HTML
  form_endpoint: '',
  sync_token: '',
  sync_proxy: '', // local HTTP proxy for reaching Google from mainland China, e.g. http://127.0.0.1:7890
  last_sync_at: '',
};

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.value !== null && r.value !== '') s[r.key] = r.value;
  return s;
}

function setSettings(obj) {
  const stmt = db.prepare(
    'INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) stmt.run(k, v);
  });
  tx(Object.entries(obj));
}

module.exports = { db, getSettings, setSettings, DEFAULT_SETTINGS, PRIVATE_SETTINGS };
