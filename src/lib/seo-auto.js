// Rule-based SEO titles and descriptions. Used both as the live fallback on the public
// site and to fill the admin fields automatically, so both always match.
const { plain } = require('./util');

const TITLE_MAX = 65;
const DESC_MAX = 158;

const squash = (t) => String(t || '').replace(/\s+/g, ' ').trim();

// First candidate that fits; otherwise the last (shortest) one in full. A complete title that
// Google shortens on screen reads better than one we cut off; the admin SEO check flags it.
function fit(max, ...candidates) {
  const list = candidates.map(squash).filter(Boolean);
  return list.find((t) => t.length <= max) || list[list.length - 1] || '';
}

function clip(text, max = DESC_MAX) {
  const t = squash(text);
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/[\s,;:.–-]+\S*$/, '') + '…';
}

// Adds optional sentences only while the description stays within the limit.
function compose(base, extras, max = DESC_MAX) {
  let out = squash(base).replace(/\s*[.…]?$/, '.');
  if (out === '.') out = '';
  for (const e of extras) {
    if (!e) continue;
    const next = (out ? out + ' ' : '') + e;
    if (next.length <= max) out = next;
  }
  return clip(out, max);
}

const product = {
  title: (p, site) => fit(TITLE_MAX, `${p.name} - Wholesale & OEM | ${site}`, `${p.name} | ${site}`, `${p.name} - Wholesale & OEM`, p.name),
  desc: (p) =>
    compose(p.summary || plain(p.description, 200), [
      p.moq ? `MOQ ${squash(p.moq).replace(/\.$/, '')}.` : '',
      'Custom logo & packaging, QC and export from Shanxi, China.',
      'Quotes from vetted factories in 24h.',
    ]),
};

const category = {
  title: (c, site) =>
    fit(
      TITLE_MAX,
      `${c.name} Supplier in China | ${site}`,
      `Wholesale ${c.name} from China | ${site}`,
      `${c.name} Supplier in China`,
      `Wholesale ${c.name} from China`,
      c.name
    ),
  desc: (c) =>
    compose(c.summary || plain(c.description, 200), [
      'OEM/ODM from vetted factories in Qixian, Shanxi.',
      'Samples, QC and worldwide shipping.',
    ]),
};

const post = {
  title: (p, site) => fit(TITLE_MAX, `${p.title} | ${site}`, p.title),
  desc: (p) => clip(p.excerpt || plain(p.body, 200)),
};

const BY_TABLE = { products: product, categories: category, posts: post };

// Effective values shown on the site: manual value if set, otherwise generated.
function effective(table, row, site) {
  const g = BY_TABLE[table];
  return {
    title: row.seo_title || g.title(row, site),
    description: row.seo_description || g.desc(row),
  };
}

// Earlier versions of the rules. Values they produced still count as automatic, so they get
// replaced by the current wording instead of being treated as hand-written.
const LEGACY = {
  products: {
    title: () => null,
    desc: (p) =>
      compose(p.summary || plain(p.description, 200), [
        p.moq ? `MOQ ${squash(p.moq).replace(/\.$/, '')}.` : '',
        'Custom logo & packaging, QC and export from Shanxi, China.',
        'Factory-direct quotes in 24h.',
      ]),
  },
  categories: {
    title: (c, site) =>
      fit(TITLE_MAX, `${c.name} Manufacturer & Wholesale | ${site}`, `Wholesale ${c.name} from China | ${site}`, `${c.name} Manufacturer & Wholesale Supplier`, `Wholesale ${c.name} from China`, c.name),
    desc: () => null,
  },
  posts: { title: () => null, desc: () => null },
};

// A stored value counts as "automatic" if it is empty or equals what the rules produce (now or
// in an earlier version), so it can be regenerated safely; anything else was written by hand and is kept.
function isAuto(table, field, row, site) {
  const v = row[field];
  if (!v) return true;
  const key = field === 'seo_title' ? 'title' : 'desc';
  const call = (g) => (key === 'title' ? g.title(row, site) : g.desc(row));
  return v === call(BY_TABLE[table]) || v === call(LEGACY[table]);
}

// Fill empty SEO fields and refresh automatic ones. Hand-written values are kept.
// oldSite: previous site name, so titles generated with it are also refreshed after a rename.
function regenerate(db, site, { oldSite } = {}) {
  const counts = {};
  for (const [table, g] of Object.entries(BY_TABLE)) {
    const upd = db.prepare(`UPDATE ${table} SET seo_title = ?, seo_description = ? WHERE id = ?`);
    let n = 0;
    db.transaction(() => {
      for (const row of db.prepare(`SELECT * FROM ${table}`).all()) {
        const autoT = isAuto(table, 'seo_title', row, site) || (oldSite && isAuto(table, 'seo_title', row, oldSite));
        const t = autoT ? g.title(row, site) : row.seo_title;
        const d = isAuto(table, 'seo_description', row, site) ? g.desc(row) : row.seo_description;
        if (t !== row.seo_title || d !== row.seo_description) (upd.run(t, d, row.id), n++);
      }
    })();
    counts[table] = n;
  }
  return counts;
}

module.exports = { product, category, post, BY_TABLE, effective, isAuto, regenerate, TITLE_MAX, DESC_MAX };
