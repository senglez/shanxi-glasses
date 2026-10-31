// IndexNow: tell Bing (and Yandex, Seznam, Naver...) which pages changed after each deploy.
//
//   node scripts/indexnow.js changed   compare dist/sitemap.xml with the live one, print changed URLs (JSON)
//   node scripts/indexnow.js submit    POST the URLs in $URLS (JSON array) to api.indexnow.org
//
// The key file public/<key>.txt is deployed with the site. Because the site may live in a
// sub-folder (github.io/repo/), the key location is sent explicitly (IndexNow "option 2"),
// which allows every URL under that folder.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = (process.env.SITE_URL || '').replace(/\/+$/, '');
const out = (k, v) => (process.env.GITHUB_OUTPUT ? fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`) : console.log(`${k}=${v}`));

function findKey() {
  const f = fs.readdirSync(path.join(ROOT, 'public')).find((n) => /^[0-9a-f]{32}\.txt$/.test(n));
  if (!f) throw new Error('No IndexNow key file (public/<32 hex>.txt) found');
  return f.slice(0, -4);
}

function parseSitemap(xml) {
  const map = {};
  for (const m of String(xml).matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) map[m[1]] = m[2] || '';
  return map;
}

async function changed() {
  if (!SITE) throw new Error('SITE_URL is required');
  const next = parseSitemap(fs.readFileSync(path.join(ROOT, 'dist', 'sitemap.xml'), 'utf8'));
  let prev = {};
  try {
    const r = await fetch(`${SITE}/sitemap.xml?nocache=${Date.now()}`, { signal: AbortSignal.timeout(20000) });
    if (r.ok) prev = parseSitemap(await r.text());
  } catch {
    /* first deploy or site unreachable: everything counts as new */
  }
  // Listing pages get today's date on every build; only resubmit them when real content changed.
  const always = new Set(['/', '/products/', '/blog/'].map((p) => SITE + p));
  const real = Object.keys(next).filter((u) => !always.has(u) && prev[u] !== next[u]);
  const urls = real.length ? [...new Set([...real, ...[...always].filter((u) => u in next)])] : [];
  console.log(`IndexNow: ${urls.length} changed URL(s)` + (Object.keys(prev).length ? '' : ' (no previous sitemap, submitting all)'));
  out('urls', JSON.stringify(urls));
  out('site_url', SITE);
}

async function submit() {
  const urls = JSON.parse(process.env.URLS || '[]');
  if (!urls.length) return console.log('IndexNow: nothing to submit');
  if (!SITE) throw new Error('SITE_URL is required');
  const key = findKey();
  const keyLocation = `${SITE}/${key}.txt`;
  const host = new URL(SITE).host;

  // Wait until the freshly deployed key file is reachable (Pages CDN can lag a little).
  for (let i = 0; i < 12; i++) {
    try {
      const r = await fetch(keyLocation + '?nocache=' + Date.now());
      if (r.ok && (await r.text()).trim() === key) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 10000));
  }

  for (let i = 0; i < urls.length; i += 10000) {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation, urlList: urls.slice(i, i + 10000) }),
    });
    const hint = { 200: 'OK', 202: 'accepted, key validation pending', 400: 'bad request', 403: 'key not valid', 422: 'URLs do not match host/key', 429: 'too many requests' }[res.status] || '';
    console.log(`IndexNow: HTTP ${res.status} ${hint} (${urls.slice(i, i + 10000).length} URLs)`);
  }
  urls.forEach((u) => console.log('  ' + u));
}

const cmd = process.argv[2];
({ changed, submit })[cmd]?.().catch((e) => {
  // Never fail the deploy because of IndexNow.
  console.error('IndexNow skipped: ' + e.message);
}) ?? (console.log('usage: node scripts/indexnow.js changed|submit'), process.exit(1));
