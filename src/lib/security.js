const crypto = require('crypto');

function ensureCsrf(req, res, next) {
  if (req.session) {
    if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
    res.locals.csrfToken = req.session.csrf;
  }
  next();
}

// Must run after body parsing (urlencoded or multer).
function verifyCsrf(req, res, next) {
  const sent = (req.body && req.body._csrf) || req.get('x-csrf-token') || '';
  const expected = (req.session && req.session.csrf) || '';
  const ok =
    sent.length === expected.length &&
    expected.length > 0 &&
    crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
  if (!ok) return res.status(403).send('Invalid or expired form token. Go back, refresh the page and try again.');
  next();
}

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
}

// Rejects cross-site form posts for the public inquiry endpoint.
function sameOrigin(req, res, next) {
  const origin = req.get('origin') || req.get('referer') || '';
  if (!origin) return next(); // some privacy tools strip both; honeypot + rate limit still apply
  try {
    const host = new URL(origin).host;
    if (host === req.get('host')) return next();
  } catch {
    /* fall through */
  }
  return res.status(403).send('Forbidden');
}

module.exports = { ensureCsrf, verifyCsrf, requireAuth, sameOrigin };
