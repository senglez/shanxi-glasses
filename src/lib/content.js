// Public content snapshot: content/*.json is committed to Git so GitHub Actions
// can rebuild the static site. Inquiries, factories, admins and private settings
// are never exported.
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { db, getSettings, setSettings, PRIVATE_SETTINGS } = require('../db');

const DIR = path.join(config.ROOT, 'content');
const TABLES = ['categories', 'products', 'posts', 'faqs', 'redirects'];

function hasSnapshot() {
  return fs.existsSync(path.join(DIR, 'products.json'));
}

function exportSnapshot() {
  fs.mkdirSync(DIR, { recursive: true });
  const counts = {};
  for (const t of TABLES) {
    const rows = db.prepare(`SELECT * FROM ${t} ORDER BY id`).all();
    if (t === 'redirects') rows.forEach((r) => delete r.hits);
    fs.writeFileSync(path.join(DIR, t + '.json'), JSON.stringify(rows, null, 2) + '\n');
    counts[t] = rows.length;
  }
  const s = getSettings();
  for (const k of PRIVATE_SETTINGS) delete s[k];
  fs.writeFileSync(path.join(DIR, 'settings.json'), JSON.stringify(s, null, 2) + '\n');
  return counts;
}

function importSnapshot() {
  const tx = db.transaction(() => {
    for (const t of TABLES) {
      const file = path.join(DIR, t + '.json');
      if (!fs.existsSync(file)) continue;
      const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
      db.prepare(`DELETE FROM ${t}`).run();
      for (const r of rows) {
        const cols = Object.keys(r);
        db.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`).run(r);
      }
    }
  });
  db.pragma('foreign_keys = OFF');
  try {
    tx();
  } finally {
    db.pragma('foreign_keys = ON');
  }
  const sFile = path.join(DIR, 'settings.json');
  if (fs.existsSync(sFile)) {
    const s = JSON.parse(fs.readFileSync(sFile, 'utf8'));
    for (const k of PRIVATE_SETTINGS) delete s[k];
    setSettings(s);
  }
  console.log('[content] imported snapshot from content/');
}

module.exports = { hasSnapshot, exportSnapshot, importSnapshot, DIR };
