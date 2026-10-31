const express = require('express');
const config = require('../config');
const { db, getSettings } = require('../db');
const { productUrl } = require('../lib/seo');
const { isoDate, xmlEscape, plain, parseSpecs } = require('../lib/util');

const router = express.Router();

const all = {
  cats: () => db.prepare('SELECT * FROM categories WHERE published = 1 ORDER BY sort, name').all(),
  products: () => db.prepare('SELECT * FROM products WHERE published = 1 ORDER BY sort, id DESC').all(),
  posts: () => db.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC').all(),
  faqs: () => db.prepare('SELECT * FROM faqs WHERE published = 1 ORDER BY sort, id').all(),
};

// AI crawlers are allowed explicitly so the site can be cited by AI search (GEO).
router.get('/robots.txt', (req, res) => {
  const aiBots = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'DuckAssistBot',
    'meta-externalagent', 'Bytespider', 'CCBot', 'YouBot', 'Amazonbot',
  ];
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /thank-you',
    'Disallow: /products?q=',
    'Disallow: /products/?q=',
    '',
    ...aiBots.flatMap((b) => [`User-agent: ${b}`, 'Allow: /', 'Disallow: /admin', '']),
    `Sitemap: ${config.SITE_URL}/sitemap.xml`,
    '',
  ];
  res.type('text/plain').send(lines.join('\n'));
});

router.get('/sitemap.xml', (req, res) => {
  const cats = all.cats();
  const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
  const now = new Date().toISOString();
  const urls = [
    { loc: '/', lastmod: now, pri: '1.0' },
    { loc: '/products', lastmod: now, pri: '0.9' },
    { loc: '/oem-custom-glassware', pri: '0.8' },
    { loc: '/about', pri: '0.7' },
    { loc: '/faq', pri: '0.7' },
    { loc: '/blog', lastmod: now, pri: '0.7' },
    { loc: '/contact', pri: '0.8' },
    { loc: '/privacy-policy', pri: '0.2' },
    ...cats.map((c) => ({ loc: '/products/' + c.slug, lastmod: isoDate(c.updated_at), pri: '0.8' })),
    ...all.products().map((p) => ({
      loc: productUrl(p, byId[p.category_id]),
      lastmod: isoDate(p.updated_at),
      pri: '0.7',
      img: p.image,
    })),
    ...all.posts().map((p) => ({ loc: '/blog/' + p.slug, lastmod: isoDate(p.updated_at), pri: '0.6' })),
  ];
  const abs = (u) => (/^https?:/.test(u) ? u : config.SITE_URL + u);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls.map(
      (u) =>
        `<url><loc>${xmlEscape(abs(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.pri}</priority>${
          u.img ? `<image:image><image:loc>${xmlEscape(abs(u.img))}</image:loc></image:image>` : ''
        }</url>`
    ),
    '</urlset>',
  ].join('\n');
  res.type('application/xml').send(xml);
});

router.get('/feed.xml', (req, res) => {
  const s = getSettings();
  const items = all.posts().slice(0, 30);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${xmlEscape(s.site_name)} Insights</title>
<link>${config.SITE_URL}/blog</link>
<atom:link href="${config.SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
<description>${xmlEscape(s.tagline)}</description>
<language>en</language>
${items
  .map(
    (p) => `<item><title>${xmlEscape(p.title)}</title><link>${config.SITE_URL}/blog/${p.slug}</link><guid>${config.SITE_URL}/blog/${p.slug}</guid><pubDate>${new Date(isoDate(p.published_at)).toUTCString()}</pubDate><description>${xmlEscape(p.excerpt || plain(p.body))}</description></item>`
  )
  .join('\n')}
</channel></rss>`;
  res.type('application/rss+xml').send(xml);
});

// llms.txt: a Markdown map of the site for LLMs (https://llmstxt.org)
router.get('/llms.txt', (req, res) => {
  const s = getSettings();
  const cats = all.cats();
  const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
  const u = (p) => config.SITE_URL + p;
  const out = [
    `# ${s.site_name}`,
    '',
    `> ${s.home_description}`,
    '',
    'We are a B2B glassware sourcing and export company based in Qixian County, Shanxi Province, China. Overseas importers, wholesalers, brands, retailers and hospitality buyers send inquiries; we match each order with vetted local factories, manage samples, production, quality inspection and shipping.',
    '',
    `- Contact: ${s.contact_email}${s.phone ? ' / ' + s.phone : ''}`,
    `- Request a quote: ${u('/contact')}`,
    `- Full content for LLMs: ${u('/llms-full.txt')}`,
    '',
    '## Product categories',
    ...cats.map((c) => `- [${c.name}](${u('/products/' + c.slug)}): ${c.summary || ''}`),
    '',
    '## Products',
    ...all.products().map((p) => `- [${p.name}](${u(productUrl(p, byId[p.category_id]))}): ${p.summary || ''}`),
    '',
    '## Key pages',
    `- [OEM & custom glassware](${u('/oem-custom-glassware')}): logo, color, decal, packaging customization`,
    `- [About / Why Qixian, Shanxi](${u('/about')}): sourcing model and the Qixian glassware cluster`,
    `- [FAQ](${u('/faq')}): MOQ, samples, lead time, payment, shipping`,
    '',
    '## Guides',
    ...all.posts().map((p) => `- [${p.title}](${u('/blog/' + p.slug)}): ${p.excerpt || ''}`),
    '',
  ];
  res.type('text/plain; charset=utf-8').send(out.join('\n'));
});

router.get('/llms-full.txt', (req, res) => {
  const s = getSettings();
  const cats = all.cats();
  const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
  const out = [`# ${s.site_name}`, '', `> ${s.home_description}`, '', `Website: ${config.SITE_URL}`, `Email: ${s.contact_email}`, `Address: ${s.address}`, ''];
  out.push('## FAQ', '');
  for (const f of all.faqs()) out.push(`### ${f.question}`, '', f.answer, '');
  out.push('## Products', '');
  for (const p of all.products()) {
    out.push(`### ${p.name}`, '', `URL: ${config.SITE_URL}${productUrl(p, byId[p.category_id])}`);
    if (byId[p.category_id]) out.push(`Category: ${byId[p.category_id].name}`);
    if (p.material) out.push(`Material: ${p.material}`);
    if (p.moq) out.push(`MOQ: ${p.moq}`);
    if (p.lead_time) out.push(`Lead time: ${p.lead_time}`);
    for (const sp of parseSpecs(p.specs)) out.push(`${sp.k}: ${sp.v}`);
    out.push('', p.description || p.summary || '', '');
  }
  out.push('## Guides', '');
  for (const p of all.posts()) out.push(`### ${p.title}`, '', `URL: ${config.SITE_URL}/blog/${p.slug}`, '', p.body || '', '');
  res.type('text/plain; charset=utf-8').send(out.join('\n'));
});

module.exports = router;
