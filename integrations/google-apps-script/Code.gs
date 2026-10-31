/**
 * Inquiry receiver for the static (GitHub Pages) site.
 * Saves each inquiry as a row in this Google Sheet and emails you a notification.
 * The local admin panel imports these rows via the "同步询盘" button.
 *
 * Setup: see integrations/google-apps-script/README.md
 * Script properties (Project Settings → Script properties):
 *   SYNC_TOKEN    long random string, also entered in admin「网站设置」
 *   NOTIFY_EMAIL  where notifications go (defaults to the script owner)
 *   SITE_URL      e.g. https://senglez.github.io/shanxi-glasses  (used for the thank-you link)
 *   SEND_EMAIL    "false" to skip emails (when Web3Forms already sends them)
 */

var SHEET_NAME = 'Inquiries';
var FIELDS = ['id', 'created_at', 'name', 'email', 'company', 'country', 'phone', 'product_id', 'product_name',
  'quantity', 'message', 'source_page', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'user_agent'];
var LIMITS = { name: 100, email: 160, company: 160, country: 80, phone: 60, product_id: 12, product_name: 200,
  quantity: 80, message: 5000, source_page: 300, referrer: 300, utm_source: 100, utm_medium: 100, utm_campaign: 100, user_agent: 300 };

function props() { return PropertiesService.getScriptProperties(); }

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(FIELDS);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Run once from the editor to create the sheet and test permissions. */
function setup() {
  getSheet();
  if (!props().getProperty('SYNC_TOKEN')) {
    props().setProperty('SYNC_TOKEN', Utilities.getUuid() + Utilities.getUuid().replace(/-/g, ''));
  }
  // Shown in the editor's "Execution log" panel; also stored in Project Settings → Script properties.
  console.log('SYNC_TOKEN = ' + props().getProperty('SYNC_TOKEN'));
  console.log('Sheet "' + SHEET_NAME + '" is ready. Setup complete.');
}

// Values starting with = + - @ would be treated as formulas by Sheets.
function safe(v, max) {
  var s = String(v == null ? '' : v).trim().slice(0, max || 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  // Spam traps: hidden honeypot field filled, or submitted within 3 seconds of page load.
  var ts = Number(p.ts || 0);
  if (p.website || !ts || Date.now() - ts < 3000) return reply(true);

  var email = String(p.email || '').trim().toLowerCase();
  var ok = String(p.name || '').trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) &&
    String(p.message || '').trim().length >= 10;
  if (!ok) return reply(false);

  // Basic flood control: max 5 submissions per email per hour.
  var cache = CacheService.getScriptCache();
  var key = 'n_' + Utilities.base64EncodeWebSafe(email).slice(0, 200);
  var n = Number(cache.get(key) || 0);
  if (n >= 5) return reply(true);
  cache.put(key, String(n + 1), 3600);

  var row = { id: Utilities.getUuid(), created_at: new Date().toISOString() };
  FIELDS.slice(2).forEach(function (f) { row[f] = safe(p[f], LIMITS[f]); });
  row.email = safe(email, 160);

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet().appendRow(FIELDS.map(function (f) { return row[f]; }));
  } finally {
    lock.releaseLock();
  }

  // Set SEND_EMAIL=false when Web3Forms already sends the notification email.
  if (props().getProperty('SEND_EMAIL') === 'false') return reply(true);
  try {
    var to = props().getProperty('NOTIFY_EMAIL') || Session.getEffectiveUser().getEmail();
    MailApp.sendEmail({
      to: to,
      replyTo: email,
      subject: '[Inquiry] ' + (row.product_name || 'General') + ' - ' + row.name + ' (' + (row.country || 'N/A') + ')',
      body: [
        'New inquiry from your website', '',
        'Name: ' + row.name, 'Email: ' + email, 'Company: ' + row.company, 'Country: ' + row.country,
        'Phone/WhatsApp: ' + row.phone, 'Product: ' + row.product_name, 'Quantity: ' + row.quantity,
        'Source page: ' + row.source_page,
        'UTM: ' + [row.utm_source, row.utm_medium, row.utm_campaign].filter(String).join(' / '), '',
        String(p.message || '').slice(0, 5000), '',
        'Spreadsheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      ].join('\n')
    });
  } catch (err) {
    console.error('Mail failed: ' + err);
  }
  return reply(true);
}

// Export for the admin sync. Requires the secret token.
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action !== 'export') return ContentService.createTextOutput('OK');
  var token = props().getProperty('SYNC_TOKEN');
  if (!token || p.token !== token) return json({ error: 'unauthorized' });
  var values = getSheet().getDataRange().getValues();
  var head = values.shift() || [];
  var rows = values.map(function (v) {
    var o = {};
    head.forEach(function (h, i) {
      var x = v[i] instanceof Date ? v[i].toISOString() : String(v[i]);
      o[h] = x.charAt(0) === "'" ? x.slice(1) : x;
    });
    return o;
  });
  return json({ rows: rows });
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Shown only when the visitor has JavaScript disabled (normal submissions use fetch).
function reply(success) {
  var site = props().getProperty('SITE_URL') || '';
  var msg = success
    ? '<h1>Thank you, your inquiry has been sent.</h1><p>We reply within 24 hours on business days.</p>'
    : '<h1>Please go back and complete the required fields.</h1><p>Name, a valid email and your requirements are required.</p>';
  var link = site ? '<p><a href="' + site.replace(/"/g, '') + '/" target="_top">Back to the website</a></p>' : '';
  return HtmlService.createHtmlOutput('<div style="font-family:sans-serif;max-width:560px;margin:60px auto">' + msg + link + '</div>');
}
