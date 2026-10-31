// Builds the public site as static files in dist/ for GitHub Pages.
//
//   SITE_URL=https://senglez.github.io/shanxi-glasses BASE_PATH=/shanxi-glasses npm run build:static
//
// Content comes from content/*.json (export it from the local admin with `npm run content:export`).
// Static hosts serve folders, so every page is written as <path>/index.html and all
// internal URLs use a trailing slash, e.g. /products/vases/ .
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const tmpDb = path.join(os.tmpdir(), `sgs-build-${process.pid}.db`);

process.env.STATIC_EXPORT = '1';
process.env.NODE_ENV = 'production';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'static-build-' + process.pid;
process.env.DB_PATH = tmpDb; // always build from the committed content snapshot, never the private local DB
if (!process.env.SITE_URL) {
  console.error('SITE_URL is required, e.g. https://senglez.github.io/shanxi-glasses');
  process.exit(1);
}

const config = require('../src/config');
const BASE = config.BASE_PATH; // "" or "/repo"
const SITE = config.SITE_URL; // absolute, includes BASE
const app = require('../src/server');
const { db } = require('../src/db');
const { productUrl } = require('../src/lib/seo');

const hasExt = (p) => /\.[a-z0-9]{2,5}$/i.test(p.split('/').pop());
const withSlash = (p) => (p.endsWith('/') || hasExt(p) ? p : p + '/');

// Split "path?query#hash" and normalise the path part.
function fixPath(url, addBase) {
  const m = url.match(/^([^?#]*)(.*)$/);
  let p = m[1] || '/';
  p = withSlash(p);
  return (addBase ? BASE : '') + p + m[2];
}

const siteRe = new RegExp(SITE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(/[^\\s"\'<>)\\\\]*)?', 'g');

function rewrite(text, isHtml) {
  // Absolute URLs to this site (canonical, og:url, JSON-LD, sitemap, llms.txt)
  text = text.replace(siteRe, (all, p) => SITE + fixPath(p || '/', false));
  if (isHtml) {
    // Root-relative links and assets
    text = text.replace(/\b(href|src|action|data-src|data-thanks)="(\/(?!\/)[^"]*)"/g, (all, attr, url) => `${attr}="${fixPath(url, true)}"`);
  }
  return text;
}

function write(urlPath, body) {
  const rel = urlPath === '/' ? 'index.html' : hasExt(urlPath) ? urlPath.slice(1) : urlPath.slice(1) + '/index.html';
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === '.gitkeep') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

async function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'public'), DIST);
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
  if (process.env.CNAME) fs.writeFileSync(path.join(DIST, 'CNAME'), process.env.CNAME.trim() + '\n');

  const cats = db.prepare('SELECT * FROM categories WHERE published = 1').all();
  const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
  const pages = [
    '/', '/products', '/oem-custom-glassware', '/about', '/faq', '/blog', '/contact', '/thank-you', '/privacy-policy',
    ...cats.map((c) => '/products/' + c.slug),
    ...db.prepare('SELECT * FROM products WHERE published = 1').all().map((p) => productUrl(p, byId[p.category_id])),
    ...db.prepare('SELECT slug FROM posts WHERE published = 1').all().map((p) => '/blog/' + p.slug),
  ];
  const files = ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt', '/feed.xml'];

  const server = app.listen(0);
  const port = server.address().port;
  const get = (p) => fetch(`http://127.0.0.1:${port}${p}`, { redirect: 'manual' });
  let errors = 0;

  try {
    for (const p of pages) {
      const r = await get(p);
      if (r.status !== 200) {
        console.error(`  ✗ ${p} -> HTTP ${r.status}`);
        errors++;
        continue;
      }
      write(p, rewrite(await r.text(), true));
    }
    for (const p of files) {
      const r = await get(p);
      if (r.status !== 200) { console.error(`  ✗ ${p} -> HTTP ${r.status}`); errors++; continue; }
      write(p, rewrite(await r.text(), false));
    }
    // GitHub Pages serves /404.html for unknown paths
    const nf = await get('/__not-found__');
    fs.writeFileSync(path.join(DIST, '404.html'), rewrite(await nf.text(), true));

    // Managed 301s become meta-refresh pages with a canonical to the new URL
    for (const r of db.prepare('SELECT from_path, to_path FROM redirects').all()) {
      const to = /^https?:/.test(r.to_path) ? r.to_path : SITE + fixPath(r.to_path, false);
      const safe = to.replace(/"/g, '&quot;');
      write(r.from_path, `<!doctype html><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="${safe}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${safe}"><a href="${safe}">This page has moved</a>`);
    }
  } finally {
    server.close();
    db.close();
    for (const f of [tmpDb, tmpDb + '-wal', tmpDb + '-shm']) fs.rmSync(f, { force: true });
  }

  if (errors) {
    console.error(`Build failed with ${errors} error(s).`);
    process.exit(1);
  }
  console.log(`Static site built: ${pages.length} pages + ${files.length} SEO files -> dist/  (${SITE})`);
  process.exit(0); // session-store / rate-limit timers would otherwise keep the process alive
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
