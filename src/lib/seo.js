const config = require('../config');
const { plain, isoDate, parseList } = require('./util');

const abs = (p) => (!p ? '' : /^https?:\/\//.test(p) ? p : config.SITE_URL + (p.startsWith('/') ? p : '/' + p));

// Safe to embed inside <script type="application/ld+json">
function jsonld(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function organization(s) {
  const sameAs = [s.linkedin, s.facebook, s.instagram, s.youtube].filter(Boolean);
  return {
    '@type': 'Organization',
    '@id': config.SITE_URL + '/#organization',
    name: s.site_name,
    url: config.SITE_URL + '/',
    logo: abs('/img/logo.png'),
    description: s.home_description,
    email: s.contact_email,
    telephone: s.phone,
    ...(s.founding_year ? { foundingDate: s.founding_year } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Qixian',
      addressRegion: 'Shanxi',
      addressCountry: 'CN',
      streetAddress: s.address,
    },
    areaServed: 'Worldwide',
    knowsAbout: [
      'Hand-blown glassware',
      'Machine-made glassware',
      'Borosilicate glass',
      'Wine glasses and stemware',
      'Glass vases and home decor',
      'OEM/ODM glassware manufacturing',
      'Glassware export from China',
    ],
    ...(sameAs.length ? { sameAs } : {}),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: s.contact_email,
        telephone: s.phone,
        availableLanguage: ['English', 'Chinese'],
      },
    ],
  };
}

function website(s) {
  return {
    '@type': 'WebSite',
    '@id': config.SITE_URL + '/#website',
    url: config.SITE_URL + '/',
    name: s.site_name,
    publisher: { '@id': config.SITE_URL + '/#organization' },
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: config.SITE_URL + '/products?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumb(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.url),
    })),
  };
}

function product(p, cat, specs) {
  const images = [p.image, ...parseList(p.gallery)].filter(Boolean).map(abs);
  return {
    '@type': 'Product',
    '@id': abs(productUrl(p, cat)) + '#product',
    name: p.name,
    description: plain(p.description || p.summary, 500),
    image: images,
    sku: 'SGS-' + String(p.id).padStart(4, '0'),
    category: cat ? cat.name : undefined,
    material: p.material || undefined,
    brand: { '@type': 'Brand', name: 'OEM / Private Label' },
    manufacturer: { '@id': config.SITE_URL + '/#organization' },
    countryOfOrigin: { '@type': 'Country', name: 'China' },
    additionalProperty: specs.map((s) => ({ '@type': 'PropertyValue', name: s.k, value: s.v })),
  };
}

function faqPage(faqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: plain(f.answer, 2000) },
    })),
  };
}

function article(post, s) {
  return {
    '@type': 'BlogPosting',
    '@id': abs('/blog/' + post.slug) + '#article',
    headline: post.title,
    description: post.excerpt || plain(post.body),
    image: post.cover ? [abs(post.cover)] : [abs(s.og_image)],
    datePublished: isoDate(post.published_at),
    dateModified: isoDate(post.updated_at),
    author: post.author
      ? { '@type': 'Person', name: post.author }
      : { '@id': config.SITE_URL + '/#organization' },
    publisher: { '@id': config.SITE_URL + '/#organization' },
    mainEntityOfPage: abs('/blog/' + post.slug),
    inLanguage: 'en',
  };
}

function itemList(products, cats) {
  const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
  return {
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: abs(productUrl(p, byId[p.category_id])),
      name: p.name,
    })),
  };
}

function productUrl(p, cat) {
  return '/products/' + (cat ? cat.slug : 'all') + '/' + p.slug;
}

function graph(nodes) {
  return jsonld({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });
}

module.exports = { abs, jsonld, organization, website, breadcrumb, product, faqPage, article, itemList, productUrl, graph };
