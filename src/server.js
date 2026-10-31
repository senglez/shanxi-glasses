const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const bcrypt = require('bcryptjs');
const config = require('./config');
const { db, getSettings } = require('./db');
const seo = require('./lib/seo');

/* ---------- First-run bootstrap ---------- */
if (!db.prepare('SELECT COUNT(*) n FROM categories').get().n) require('./seed').runFromContentOrDefaults();
// Picks up private/factories.json added after the first start (the file is never in Git).
if (!config.STATIC_EXPORT) require('./seed').importPrivateFactoriesIfEmpty();
if (!config.STATIC_EXPORT && !db.prepare('SELECT COUNT(*) n FROM admins').get().n) {
  const pw = config.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  db.prepare('INSERT INTO admins(username, password_hash) VALUES(?, ?)').run(config.ADMIN_USER, bcrypt.hashSync(pw, 12));
  console.log(`[setup] Admin account created: ${config.ADMIN_USER}` + (config.ADMIN_PASSWORD ? '' : ` / ${pw}  (change it after first login)`));
}
if (config.IS_PROD && config.SESSION_SECRET === 'dev-only-change-me') {
  console.error('SESSION_SECRET must be set in production.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', config.TRUST_PROXY);
app.set('view engine', 'ejs');
app.set('views', path.join(config.ROOT, 'views'));
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  res.locals.SITE_URL = config.SITE_URL;
  res.locals.jsonld = seo.jsonld;
  res.locals.isStatic = config.STATIC_EXPORT;
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, 'https://www.googletagmanager.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'],
        fontSrc: ["'self'", 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: config.IS_PROD ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());

app.use(
  express.static(path.join(config.ROOT, 'public'), {
    maxAge: config.IS_PROD ? '30d' : 0,
    setHeaders: (res, file) => {
      if (/\.(css|js)$/.test(file)) res.setHeader('Cache-Control', config.IS_PROD ? 'public, max-age=86400' : 'no-cache');
    },
  })
);

// Strip trailing slashes for one canonical URL per page.
app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith('/') && req.method === 'GET') {
    const qs = req.originalUrl.slice(req.path.length);
    return res.redirect(301, req.path.replace(/\/+$/, '') + qs);
  }
  next();
});

// Managed 301 redirects (auto-created when a slug changes, or added in admin)
const findRedirect = db.prepare('SELECT * FROM redirects WHERE from_path = ?');
const hitRedirect = db.prepare('UPDATE redirects SET hits = hits + 1 WHERE id = ?');
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/admin')) return next();
  const r = findRedirect.get(req.path);
  if (!r) return next();
  hitRedirect.run(r.id);
  res.redirect(301, r.to_path);
});

app.use(
  '/admin',
  session({
    store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 15 * 60 * 1000 } }),
    name: 'sgs.sid',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.IS_PROD, maxAge: 8 * 60 * 60 * 1000, path: '/admin' },
  }),
  require('./routes/admin')
);

app.use(require('./routes/seo'));
app.use(require('./routes/public'));

app.use((req, res) => {
  res.status(404);
  if (req.path.startsWith('/admin')) return res.send('Not found');
  const s = getSettings();
  res.render('pages/404', {
    s,
    navCats: db.prepare('SELECT * FROM categories WHERE published = 1 ORDER BY sort, name').all(),
    path: req.path,
    meta: { title: 'Page not found | ' + s.site_name, description: '', canonical: null, noindex: true },
    graph: seo.graph([seo.organization(s)]),
  });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).send('Something went wrong. Please try again later.');
});

module.exports = app;

if (require.main === module) {
  app.listen(config.PORT, () => console.log(`Site running at http://localhost:${config.PORT}  (admin: /admin)`));
}
