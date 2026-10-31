const express = require('express');
const rateLimit = require('express-rate-limit');
const { db, getSettings } = require('../db');
const seo = require('../lib/seo');
const { md, plain, parseSpecs, parseList, fmtDate } = require('../lib/util');
const { sameOrigin } = require('../lib/security');
const { notifyInquiry } = require('../lib/mailer');

const router = express.Router();

const q = {
  cats: db.prepare('SELECT * FROM categories WHERE published = 1 ORDER BY sort, name'),
  catBySlug: db.prepare('SELECT * FROM categories WHERE slug = ? AND published = 1'),
  catById: db.prepare('SELECT * FROM categories WHERE id = ?'),
  featured: db.prepare('SELECT * FROM products WHERE published = 1 AND featured = 1 ORDER BY sort, id DESC LIMIT 8'),
  allProducts: db.prepare('SELECT * FROM products WHERE published = 1 ORDER BY sort, id DESC'),
  search: db.prepare(
    `SELECT * FROM products WHERE published = 1 AND (name LIKE @q OR summary LIKE @q OR description LIKE @q OR material LIKE @q)
     ORDER BY sort, id DESC LIMIT 60`
  ),
  byCat: db.prepare('SELECT * FROM products WHERE published = 1 AND category_id = ? ORDER BY sort, id DESC'),
  prodBySlug: db.prepare('SELECT * FROM products WHERE slug = ? AND published = 1'),
  prodById: db.prepare('SELECT * FROM products WHERE id = ? AND published = 1'),
  related: db.prepare('SELECT * FROM products WHERE published = 1 AND category_id = ? AND id != ? ORDER BY RANDOM() LIMIT 4'),
  posts: db.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC'),
  latestPosts: db.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC LIMIT 3'),
  postBySlug: db.prepare('SELECT * FROM posts WHERE slug = ? AND published = 1'),
  faqs: db.prepare('SELECT * FROM faqs WHERE published = 1 ORDER BY sort, id'),
  insertInquiry: db.prepare(`INSERT INTO inquiries
    (name, email, company, country, phone, product_id, product_name, quantity, message, source_page, referrer,
     utm_source, utm_medium, utm_campaign, ip, user_agent)
    VALUES (@name, @email, @company, @country, @phone, @product_id, @product_name, @quantity, @message, @source_page,
     @referrer, @utm_source, @utm_medium, @utm_campaign, @ip, @user_agent)`),
};

// Shared locals for every public page
router.use((req, res, next) => {
  const s = getSettings();
  res.locals.s = s;
  res.locals.navCats = q.cats.all();
  res.locals.path = req.path;
  res.locals.md = md;
  res.locals.plain = plain;
  res.locals.fmtDate = fmtDate;
  res.locals.productUrl = seo.productUrl;
  res.locals.catMap = Object.fromEntries(res.locals.navCats.map((c) => [c.id, c]));
  res.locals.baseGraph = [seo.organization(s), seo.website(s)];
  next();
});

// Picks the longest candidate title that still fits Google's ~65 char display.
function fitTitle(...candidates) {
  return candidates.find((t) => t.length <= 65) || candidates[candidates.length - 1];
}

function meta(req, o) {
  return {
    title: o.title,
    description: o.description,
    canonical: seo.abs(o.canonical ?? req.path),
    image: seo.abs(o.image || '') || null,
    type: o.type || 'website',
    noindex: !!o.noindex,
  };
}

router.get('/', (req, res) => {
  const s = res.locals.s;
  const faqs = q.faqs.all().slice(0, 6);
  res.render('pages/home', {
    meta: meta(req, { title: s.home_title, description: s.home_description, canonical: '/' }),
    featured: q.featured.all(),
    posts: q.latestPosts.all(),
    faqs,
    graph: seo.graph([...res.locals.baseGraph, seo.faqPage(faqs)]),
  });
});

router.get('/products', (req, res) => {
  const term = String(req.query.q || '').trim().slice(0, 80);
  const products = term ? q.search.all({ q: `%${term}%` }) : q.allProducts.all();
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Products', url: '/products' }];
  res.render('pages/products', {
    meta: meta(req, {
      title: term ? `Search: ${term} | ${res.locals.s.site_name}` : `Glassware Products Catalog | Wholesale & OEM | ${res.locals.s.site_name}`,
      description:
        'Browse wholesale glassware from Shanxi factories: stemware, tumblers, borosilicate, vases, candle holders, bottles and jars. OEM/ODM with custom logo and packaging.',
      canonical: '/products',
      noindex: !!term,
    }),
    heading: term ? `Results for “${term}”` : 'Glassware Product Catalog',
    intro: term ? `${products.length} product(s) found.` : null,
    category: null,
    products,
    term,
    crumbs,
    graph: seo.graph([...res.locals.baseGraph, seo.breadcrumb(crumbs), seo.itemList(products, res.locals.navCats)]),
  });
});

router.get('/products/:cat', (req, res, next) => {
  const cat = q.catBySlug.get(req.params.cat);
  if (!cat) return next();
  const products = q.byCat.all(cat.id);
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' },
    { name: cat.name, url: '/products/' + cat.slug },
  ];
  res.render('pages/products', {
    meta: meta(req, {
      title:
        cat.seo_title ||
        fitTitle(
          `${cat.name} Manufacturer & Wholesale | ${res.locals.s.site_name}`,
          `Wholesale ${cat.name} from China | ${res.locals.s.site_name}`,
          `${cat.name} Manufacturer & Wholesale Supplier`,
          `Wholesale ${cat.name} from China`,
          cat.name
        ),
      description: cat.seo_description || cat.summary || plain(cat.description),
      image: cat.image,
    }),
    heading: cat.name,
    intro: cat.summary,
    category: cat,
    products,
    term: '',
    crumbs,
    graph: seo.graph([...res.locals.baseGraph, seo.breadcrumb(crumbs), seo.itemList(products, res.locals.navCats)]),
  });
});

router.get('/products/:cat/:slug', (req, res, next) => {
  const p = q.prodBySlug.get(req.params.slug);
  if (!p) return next();
  const cat = p.category_id ? q.catById.get(p.category_id) : null;
  const correct = seo.productUrl(p, cat);
  if (req.path !== correct) return res.redirect(301, correct);
  const specs = parseSpecs(p.specs);
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' },
    ...(cat ? [{ name: cat.name, url: '/products/' + cat.slug }] : []),
    { name: p.name, url: correct },
  ];
  res.render('pages/product', {
    meta: meta(req, {
      title:
        p.seo_title ||
        fitTitle(`${p.name} - Wholesale & OEM | ${res.locals.s.site_name}`, `${p.name} | ${res.locals.s.site_name}`, `${p.name} - Wholesale & OEM`, p.name),
      description: p.seo_description || p.summary || plain(p.description),
      image: p.image,
      type: 'product',
    }),
    p,
    cat,
    specs,
    gallery: [p.image, ...parseList(p.gallery)].filter(Boolean),
    related: cat ? q.related.all(cat.id, p.id) : [],
    crumbs,
    graph: seo.graph([...res.locals.baseGraph, seo.breadcrumb(crumbs), seo.product(p, cat, specs)]),
  });
});

const staticPages = {
  '/oem-custom-glassware': {
    view: 'pages/oem',
    title: 'OEM/ODM Custom Glassware Manufacturing | Logo, Color, Packaging',
    description:
      'Custom glassware from Shanxi factories: your design, logo printing, decal, etching, color, gift boxes. Sampling in 7–15 days, QC inspection and FOB/CIF shipping.',
    name: 'OEM & Custom',
  },
  '/about': {
    view: 'pages/about',
    title: 'About Us | Your Glassware Sourcing Partner in Qixian, Shanxi',
    description:
      'We connect overseas buyers with vetted glassware factories in Qixian, Shanxi, a county producing over 60% of China’s hand-blown glassware. Factory matching, QC and export.',
    name: 'About',
  },
  '/privacy-policy': {
    view: 'pages/privacy',
    title: 'Privacy Policy',
    description: 'How we collect, use and protect the information you send through our inquiry forms.',
    name: 'Privacy Policy',
  },
};

for (const [url, cfg] of Object.entries(staticPages)) {
  router.get(url, (req, res) => {
    const crumbs = [{ name: 'Home', url: '/' }, { name: cfg.name, url }];
    res.render(cfg.view, {
      meta: meta(req, { title: `${cfg.title} | ${res.locals.s.site_name}`, description: cfg.description }),
      crumbs,
      faqs: q.faqs.all(),
      graph: seo.graph([...res.locals.baseGraph, seo.breadcrumb(crumbs)]),
    });
  });
}

router.get('/faq', (req, res) => {
  const faqs = q.faqs.all();
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'FAQ', url: '/faq' }];
  res.render('pages/faq', {
    meta: meta(req, {
      title: `Glassware Sourcing FAQ: MOQ, Samples, Lead Time, Shipping | ${res.locals.s.site_name}`,
      description: 'Answers on MOQ, samples, lead time, packaging, quality control, payment terms and shipping for glassware from China.',
    }),
    faqs,
    crumbs,
    graph: seo.graph([...res.locals.baseGraph, seo.breadcrumb(crumbs), seo.faqPage(faqs)]),
  });
});

router.get('/blog', (req, res) => {
  const posts = q.posts.all();
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Insights', url: '/blog' }];
  res.render('pages/blog', {
    meta: meta(req, {
      title: `Glassware Buying Guides & Industry Insights | ${res.locals.s.site_name}`,
      description: 'Guides for importers: glass types, quality standards, packaging, costs and sourcing glassware from Shanxi, China.',
    }),
    posts,
    crumbs,
    graph: seo.graph([...res.locals.baseGraph, seo.breadcrumb(crumbs)]),
  });
});

router.get('/blog/:slug', (req, res, next) => {
  const post = q.postBySlug.get(req.params.slug);
  if (!post) return next();
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Insights', url: '/blog' },
    { name: post.title, url: '/blog/' + post.slug },
  ];
  res.render('pages/post', {
    meta: meta(req, {
      title: post.seo_title || `${post.title} | ${res.locals.s.site_name}`,
      description: post.seo_description || post.excerpt || plain(post.body),
      image: post.cover,
      type: 'article',
    }),
    post,
    more: q.latestPosts.all().filter((x) => x.id !== post.id),
    crumbs,
    graph: seo.graph([...res.locals.baseGraph, seo.breadcrumb(crumbs), seo.article(post, res.locals.s)]),
  });
});

router.get('/contact', (req, res) => {
  const product = req.query.product ? q.prodById.get(Number(req.query.product)) : null;
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Contact', url: '/contact' }];
  res.render('pages/contact', {
    meta: meta(req, {
      title: `Request a Quote | Contact ${res.locals.s.site_name}`,
      description: 'Send your glassware inquiry: product, quantity and target price. We reply within 24 hours with factory options and a quotation.',
      canonical: '/contact',
    }),
    product,
    errors: [],
    form: {},
    crumbs,
    graph: seo.graph([...res.locals.baseGraph, seo.breadcrumb(crumbs)]),
  });
});

router.get('/thank-you', (req, res) => {
  res.render('pages/thanks', { meta: meta(req, { title: 'Thank you', description: 'Inquiry received.', noindex: true }), graph: seo.graph(res.locals.baseGraph) });
});

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'Too many submissions. Please try again later or email us directly.',
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

router.post('/inquiry', inquiryLimiter, sameOrigin, express.urlencoded({ extended: false, limit: '50kb' }), async (req, res, next) => {
  try {
    const b = req.body || {};
    // Honeypot and time trap: bots fill hidden fields and submit instantly.
    const elapsed = Date.now() - Number(b.ts || 0);
    if (b.website || !b.ts || elapsed < 3000) return res.redirect(303, '/thank-you');

    const form = {
      name: clip(b.name, 100),
      email: clip(b.email, 160).toLowerCase(),
      company: clip(b.company, 160),
      country: clip(b.country, 80),
      phone: clip(b.phone, 60),
      quantity: clip(b.quantity, 80),
      message: clip(b.message, 5000),
    };
    const errors = [];
    if (form.name.length < 2) errors.push('Please enter your name.');
    if (!EMAIL_RE.test(form.email)) errors.push('Please enter a valid email address.');
    if (form.message.length < 10) errors.push('Please describe your requirement (at least 10 characters).');

    const product = b.product_id ? q.prodById.get(Number(b.product_id)) : null;

    if (errors.length) {
      return res.status(422).render('pages/contact', {
        meta: meta(req, { title: 'Request a Quote', description: '', canonical: '/contact', noindex: true }),
        product,
        errors,
        form,
        crumbs: [{ name: 'Home', url: '/' }, { name: 'Contact', url: '/contact' }],
        graph: seo.graph(res.locals.baseGraph),
      });
    }

    const row = {
      ...form,
      product_id: product ? product.id : null,
      product_name: product ? product.name : clip(b.product_name, 200) || null,
      source_page: clip(b.source_page, 300),
      referrer: clip(b.referrer, 300),
      utm_source: clip(b.utm_source, 100),
      utm_medium: clip(b.utm_medium, 100),
      utm_campaign: clip(b.utm_campaign, 100),
      ip: req.ip,
      user_agent: clip(req.get('user-agent'), 300),
    };
    const info = q.insertInquiry.run(row);
    notifyInquiry({ id: info.lastInsertRowid, ...row }, res.locals.s).catch((e) =>
      console.error('[mail] inquiry notification failed:', e.message)
    );
    res.redirect(303, '/thank-you');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
