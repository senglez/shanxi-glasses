const { marked } = require('marked');

marked.setOptions({ gfm: true, breaks: false });

function slugify(str) {
  return String(str || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Markdown is authored only by logged-in admins, so it is treated as trusted.
function md(text) {
  return marked.parse(String(text || ''));
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function plain(mdText, max = 160) {
  const t = stripHtml(md(mdText)).replace(/[#*_`>]/g, '');
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// "Key: Value" per line -> [{k, v}]
function parseSpecs(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      return i === -1 ? { k: l, v: '' } : { k: l.slice(0, i).trim(), v: l.slice(i + 1).trim() };
    });
}

function parseList(json) {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function isoDate(s) {
  if (!s) return new Date().toISOString();
  const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z'));
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

function fmtDate(s) {
  return new Date(isoDate(s)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function xmlEscape(s) {
  return String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
}

module.exports = { slugify, md, stripHtml, plain, parseSpecs, parseList, isoDate, fmtDate, xmlEscape };
