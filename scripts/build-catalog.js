#!/usr/bin/env node
// Builds the downloadable product catalog PDF from the admin database.
//   npm run catalog:pdf
// Output: public/downloads/shanxi-glassworks-catalog.pdf
// Needs Google Chrome (set CHROME=/path/to/chrome if it is not in the default macOS location).
// Prices are not printed: they are quoted per order.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const Database = require('better-sqlite3');
const sharp = require('sharp');
const { COLLECTIONS } = require('../src/lib/catalog');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public/downloads/shanxi-glassworks-catalog.pdf');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const db = new Database(path.join(ROOT, 'data/site.db'), { readonly: true });
const s = Object.fromEntries(db.prepare('select key, value from settings').all().map((r) => [r.key, r.value]));
const cats = Object.fromEntries(db.prepare('select id, slug, name from categories').all().map((c) => [c.id, c]));
const products = db.prepare("select * from products where published = 1 and sku <> '' order by sku").all();
const siteUrl = 'https://' + fs.readFileSync(path.join(ROOT, 'CUSTOM_DOMAIN'), 'utf8').trim();

const esc = (t) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const specMap = (p) => Object.fromEntries((p.specs || '').split('\n').filter((l) => l.includes(':')).map((l) => {
  const i = l.indexOf(':');
  return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
}));
const DIM_KEYS = ['Top diameter', 'Rim diameter', 'Width', 'Diameter', 'Length', 'Height', 'Base diameter'];
const metric = (v) => v.replace(/\s*\([^)]*in\)/, '');

// Sections: the four buyer collections, then remaining items grouped by category.
const used = new Set();
const sections = COLLECTIONS.map((c) => {
  const items = c.skus.map((sku) => products.find((p) => p.sku === sku)).filter(Boolean);
  items.forEach((p) => used.add(p.sku));
  return { title: c.heading, note: c.description, items };
});
const rest = products.filter((p) => !used.has(p.sku));
const byCat = new Map();
rest.forEach((p) => { const k = p.category_id; if (!byCat.has(k)) byCat.set(k, []); byCat.get(k).push(p); });
for (const [id, items] of byCat) sections.push({ title: cats[id] ? cats[id].name : 'More glassware', note: '', items });

async function thumb(p) {
  const file = path.join(ROOT, 'public', p.image || '');
  if (!p.image || !fs.existsSync(file)) return '';
  const buf = await sharp(file).resize(480, 300, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).jpeg({ quality: 78 }).toBuffer();
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

function card(p, img) {
  const sp = specMap(p);
  const dims = DIM_KEYS.filter((k) => sp[k]).map((k) => `${k.replace(' diameter', ' \u00d8')} ${metric(sp[k])}`).join(' \u00b7 ');
  const rows = [
    ['Size', dims],
    ['Capacity', sp.Capacity && !/confirmed/i.test(sp.Capacity) ? sp.Capacity : ''],
    ['Material', p.material],
    ['Dishwasher', sp['Household dishwasher']],
    ['MOQ', p.moq],
  ].filter((r) => r[1]);
  const url = `${siteUrl}/products/${cats[p.category_id].slug}/${p.slug}/`;
  return `<article class="card">
    <a href="${url}"><img src="${img}" alt=""></a>
    <div class="code">${esc(p.sku)}</div>
    <h3><a href="${url}">${esc(p.name)}</a></h3>
    <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
  </article>`;
}

(async () => {
  const imgs = new Map();
  for (const p of products) imgs.set(p.sku, await thumb(p));
  const wa = (s.whatsapp || '').replace(/\D/g, '');
  const contact = [
    s.contact_email && `Email: <a href="mailto:${esc(s.contact_email)}">${esc(s.contact_email)}</a>`,
    wa && `WhatsApp: <a href="https://wa.me/${wa}">+${wa}</a>`,
    `Website: <a href="${siteUrl}">${siteUrl.replace('https://', '')}</a>`,
  ].filter(Boolean).join('<br>');
  const date = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const total = sections.reduce((n, x) => n + x.items.length, 0);

  const pages = [];
  for (const sec of sections) {
    for (let i = 0; i < sec.items.length; i += 9) {
      const chunk = sec.items.slice(i, i + 9);
      pages.push(`<section class="page">
        <header class="ph"><span>${esc(s.site_name || 'Shanxi Glassworks')} \u00b7 Wholesale catalog</span><span>${esc(sec.title)}</span></header>
        ${i === 0 ? `<h2>${esc(sec.title)}</h2>${sec.note ? `<p class="note">${esc(sec.note)}</p>` : ''}` : `<h2 class="cont">${esc(sec.title)} (continued)</h2>`}
        <div class="grid">${chunk.map((p) => card(p, imgs.get(p.sku))).join('')}</div>
        <footer class="pf">Prices on request \u00b7 Specifications from factory data, confirmed with the approved sample \u00b7 ${siteUrl.replace('https://', '')}</footer>
      </section>`);
    }
  }

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(s.site_name)} Wholesale Glassware Catalog</title>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font: 9pt/1.35 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1d2433; }
a { color: inherit; text-decoration: none; }
.page { width: 210mm; height: 297mm; padding: 12mm 12mm 10mm; position: relative; page-break-after: always; overflow: hidden; }
.ph { display: flex; justify-content: space-between; font-size: 7.5pt; color: #7a8496; border-bottom: 1px solid #e3e6ec; padding-bottom: 3mm; }
h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; font-weight: normal; margin: 0; }
h2 { font-size: 17pt; margin: 5mm 0 1.5mm; color: #0f1726; } h2.cont { font-size: 12pt; margin-bottom: 4mm; }
.note { margin: 0 0 4mm; color: #556075; font-size: 8.5pt; max-width: 160mm; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
.card { border: 1px solid #e3e6ec; border-radius: 3mm; padding: 2.5mm; break-inside: avoid; }
.card img { width: 100%; aspect-ratio: 16 / 10; object-fit: contain; display: block; border-radius: 2mm; background: #fff; }
.code { margin-top: 1.5mm; font-size: 7.5pt; font-weight: 700; letter-spacing: .04em; color: #c96a12; }
.card h3 { font-size: 10pt; line-height: 1.2; margin: .5mm 0 1.5mm; color: #0f1726; }
dl { margin: 0; display: grid; grid-template-columns: 17mm 1fr; gap: .4mm 1.5mm; font-size: 7pt; line-height: 1.3; }
dt { color: #7a8496; } dd { margin: 0; }
.pf { position: absolute; left: 12mm; right: 12mm; bottom: 7mm; font-size: 7pt; color: #7a8496; border-top: 1px solid #e3e6ec; padding-top: 2mm; }
.cover { background: #0f1726; color: #fff; display: flex; flex-direction: column; justify-content: space-between; padding: 22mm 18mm; }
.cover .eyebrow { color: #ffb15c; letter-spacing: .14em; text-transform: uppercase; font-size: 8.5pt; font-weight: 700; }
.cover h1 { font-size: 34pt; line-height: 1.1; margin: 6mm 0; }
.cover p { font-size: 11pt; color: #c9d2e0; max-width: 150mm; }
.cover .hero { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
.cover .hero img { width: 100%; aspect-ratio: 1; object-fit: contain; background: #fff; border-radius: 3mm; }
.cover .contact { font-size: 10pt; line-height: 1.7; color: #fff; }
.info h2 { margin-top: 8mm; } .info h3 { font-size: 12pt; margin: 6mm 0 2mm; } .info p, .info li { font-size: 10pt; color: #2b3445; } .info ul { padding-left: 5mm; margin: 0; } .info li { margin-bottom: 1.5mm; }
</style></head><body>
<section class="page cover">
  <div><div class="eyebrow">Wholesale catalog \u00b7 ${esc(date)}</div>
  <h1>${esc(s.site_name || 'Shanxi Glassworks')}<br>Glassware from Shanxi, China</h1>
  <p>${total} current designs: hand-painted tumblers and highballs, seasonal and gift glassware, wine and martini glasses, bowls, plates, vases and borosilicate storage jars. Wholesale and private label, with mixed designs per order.</p></div>
  <div class="hero">${['TMB-MOS-001', 'CUP-BFL-001', 'TMB-PUM-001', 'TMB-RNB-001'].map((k) => imgs.get(k) ? `<img src="${imgs.get(k)}" alt="">` : '').join('')}</div>
  <div class="contact">${contact}</div>
</section>
<section class="page info">
  <header class="ph"><span>${esc(s.site_name || 'Shanxi Glassworks')} \u00b7 Wholesale catalog</span><span>How to order</span></header>
  <h2>How ordering works</h2>
  <h3>1. Choose designs</h3><p>Send us the item codes (for example TMB-PUM-001), your quantity per design and your target market. Each item code links to its product page with full specifications.</p>
  <h3>2. Quotation</h3><p>We quote price, lead time, packaging and carton data for your order. Prices depend on quantity, decoration and packaging, so they are not printed in this catalog.</p>
  <h3>3. Samples</h3><p>Production is checked against an approved sample. Hand-painted pieces vary slightly from piece to piece, and the approved sample sets the standard.</p>
  <h3>4. Production, inspection and shipping</h3><p>We follow production at the factory, inspect before shipment and ship on FOB, CIF or DDP terms.</p>
  <h3>Good to know</h3>
  <ul>
    <li>MOQ is shown per design. Colors and designs can be mixed in one order where noted on the product page.</li>
    <li>Dishwasher ratings, thermal shock values and whether decoration comes within 20 mm of the rim are listed on each product page.</li>
    <li>Ask which food-contact test reports are available for your market before you order.</li>
    <li>Logos, colors and gift packaging can be customized for private-label programs.</li>
  </ul>
  <h3>Contact</h3><p>${contact}</p>
  <footer class="pf">Prices on request \u00b7 Specifications from factory data, confirmed with the approved sample \u00b7 ${siteUrl.replace('https://', '')}</footer>
</section>
${pages.join('\n')}
</body></html>`;

  const tmp = path.join(os.tmpdir(), 'sgw-catalog.html');
  fs.writeFileSync(tmp, html);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  // A separate profile keeps headless Chrome from attaching to a running browser.
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--user-data-dir=${path.join(os.tmpdir(), 'sgw-chrome-pdf')}`, `--print-to-pdf=${OUT}`, 'file://' + tmp], { stdio: 'ignore', timeout: 120000 });
  fs.unlinkSync(tmp);
  console.log(`Catalog PDF: ${total} products, ${pages.length + 2} pages -> ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB)`);
})();
