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
  // Never drop items that were added to content/ in Git but are not in this DB yet.
  const added = mergeSnapshot();
  if (Object.keys(added).length) console.log('已加入 GitHub 上新增的内容：' + describeMerge(added));
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

// Identity of a row across databases (ids differ between machines).
const MERGE_KEYS = { categories: 'slug', products: 'slug', posts: 'slug', faqs: 'question' };

function tombstone(table, key) {
  if (!MERGE_KEYS[table] || !key) return;
  db.prepare('INSERT OR IGNORE INTO content_tombstones (tbl, key) VALUES (?, ?)').run(table, String(key));
}

// Adds rows that exist in content/*.json but not in the local DB (e.g. products added in Git).
// Never overwrites local edits and never re-adds items deleted or renamed locally.
function mergeSnapshot() {
  const added = {};
  if (!hasSnapshot()) return added;
  const read = (t) => {
    const f = path.join(DIR, t + '.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  };
  const dead = new Set(db.prepare('SELECT tbl, key FROM content_tombstones').all().map((r) => r.tbl + '\u0000' + r.key));
  const snapCats = read('categories');
  const snapCatSlug = Object.fromEntries(snapCats.map((c) => [c.id, c.slug]));

  db.transaction(() => {
    for (const [t, key] of Object.entries(MERGE_KEYS)) {
      const have = new Set(db.prepare(`SELECT ${key} k FROM ${t}`).all().map((r) => r.k));
      const localCatId = Object.fromEntries(db.prepare('SELECT id, slug FROM categories').all().map((c) => [c.slug, c.id]));
      let n = 0;
      for (const row of t === 'categories' ? snapCats : read(t)) {
        const k = row[key];
        if (!k || have.has(k) || dead.has(t + '\u0000' + k)) continue;
        const { id, ...r } = row;
        if (t === 'products') r.category_id = localCatId[snapCatSlug[row.category_id]] ?? null;
        const cols = Object.keys(r);
        db.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`).run(r);
        have.add(k);
        n++;
      }
      if (n) added[t] = n;
    }
  })();
  return added;
}

function describeMerge(added) {
  const names = { categories: '分类', products: '产品', posts: '文章', faqs: 'FAQ' };
  return Object.entries(added).map(([t, n]) => `${names[t]} ${n}`).join('、');
}

module.exports = { hasSnapshot, exportSnapshot, importSnapshot, mergeSnapshot, describeMerge, tombstone, MERGE_KEYS, DIR };
