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
      'Factory-direct quotes in 24h.',
    ]),
};

const category = {
  title: (c, site) =>
    fit(
      TITLE_MAX,
      `${c.name} Manufacturer & Wholesale | ${site}`,
      `Wholesale ${c.name} from China | ${site}`,
      `${c.name} Manufacturer & Wholesale Supplier`,
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

// A stored value counts as "automatic" if it is empty or equals what the rules produce,
// so it can be regenerated safely; anything else was written by hand and is kept.
function isAuto(table, field, row, site) {
  const v = row[field];
  if (!v) return true;
  const g = BY_TABLE[table];
  return v === (field === 'seo_title' ? g.title(row, site) : g.desc(row));
}

module.exports = { product, category, post, BY_TABLE, effective, isAuto, TITLE_MAX, DESC_MAX };
