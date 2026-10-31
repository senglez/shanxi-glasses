// Pulls inquiries collected by the Google Apps Script endpoint (static site)
// into the local admin database. Safe to run repeatedly: rows are de-duplicated by external_id.
// Uses undici directly: Node's built-in fetch ignores system/VPN proxies, and Google is not
// reachable from mainland China without one.
const { fetch, ProxyAgent } = require('undici');
const { db, getSettings, setSettings } = require('../db');

const clip = (v, n) => String(v ?? '').trim().slice(0, n);

// Admin setting first, then the usual environment variables.
function resolveProxy(s) {
  const p = (s.sync_proxy || process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || '').trim();
  if (!p) return '';
  if (/^[\w.-]+:\d+$/.test(p)) return resolveProxy({ sync_proxy: 'http://' + p }); // "127.0.0.1:7890"
  let u;
  try {
    u = new URL(p);
  } catch {
    throw new Error(`代理地址 "${p}" 格式不对，应为 http://127.0.0.1:7890 这样的形式`);
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw new Error(`只支持 HTTP 代理（http://...），不支持 ${u.protocol.replace(':', '')}。Clash、V2RayN 等软件都同时提供 HTTP 端口`);
  }
  return u.toString();
}

function explainNetworkError(e, proxy) {
  const c = (e && e.cause) || {};
  const code = c.code || e.name || '';
  const detail = [code, c.message].filter(Boolean).join(' ');
  if (proxy) {
    if (code === 'ECONNREFUSED') return `连不上代理 ${proxy}（${detail}）。请确认代理软件已打开，端口号和软件里显示的一致`;
    return `通过代理 ${proxy} 访问 Google 失败（${detail || e.message}）。请确认代理软件已打开，并且能访问 Google`;
  }
  return `连不上 script.google.com（${detail || e.message}）。在中国大陆需要通过代理访问：请在「网站设置 → 询盘接收」填写代理地址，例如 http://127.0.0.1:7890`;
}

async function syncInquiries() {
  const s = getSettings();
  if (!s.form_endpoint || !s.sync_token) throw new Error('请先在「网站设置」填写询盘接收地址和同步密钥');
  const url = new URL(s.form_endpoint);
  if (url.protocol !== 'https:' || !/(^|\.)script\.google\.com$/.test(url.hostname)) {
    throw new Error('询盘接收地址必须是 https://script.google.com/... 开头的 Apps Script 地址');
  }
  url.searchParams.set('action', 'export');
  url.searchParams.set('token', s.sync_token);

  const proxy = resolveProxy(s);
  let res;
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
      ...(proxy ? { dispatcher: new ProxyAgent(proxy) } : {}),
    });
  } catch (e) {
    throw new Error(explainNetworkError(e, proxy));
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Apps Script 返回的不是 JSON。请确认部署时「谁可以访问」选的是「任何人」。');
  }
  if (data.error) throw new Error('Apps Script 返回错误：' + data.error);
  const rows = Array.isArray(data.rows) ? data.rows : [];

  const productIds = new Set(db.prepare('SELECT id FROM products').all().map((r) => r.id));
  const insert = db.prepare(`INSERT OR IGNORE INTO inquiries
    (external_id, name, email, company, country, phone, product_id, product_name, quantity, message,
     source_page, referrer, utm_source, utm_medium, utm_campaign, user_agent, created_at, updated_at)
    VALUES (@external_id, @name, @email, @company, @country, @phone, @product_id, @product_name, @quantity, @message,
     @source_page, @referrer, @utm_source, @utm_medium, @utm_campaign, @user_agent, @created_at, @created_at)`);

  let added = 0;
  db.transaction(() => {
    for (const r of rows) {
      if (!r.id || !r.email || !r.message) continue;
      const pid = Number(r.product_id);
      const created = new Date(r.created_at);
      const info = insert.run({
        external_id: clip(r.id, 64),
        name: clip(r.name, 100) || '(no name)',
        email: clip(r.email, 160).toLowerCase(),
        company: clip(r.company, 160),
        country: clip(r.country, 80),
        phone: clip(r.phone, 60),
        product_id: productIds.has(pid) ? pid : null,
        product_name: clip(r.product_name, 200) || null,
        quantity: clip(r.quantity, 80),
        message: clip(r.message, 5000),
        source_page: clip(r.source_page, 300),
        referrer: clip(r.referrer, 300),
        utm_source: clip(r.utm_source, 100),
        utm_medium: clip(r.utm_medium, 100),
        utm_campaign: clip(r.utm_campaign, 100),
        user_agent: clip(r.user_agent, 300),
        created_at: isNaN(created) ? new Date().toISOString().slice(0, 19).replace('T', ' ') : created.toISOString().slice(0, 19).replace('T', ' '),
      });
      added += info.changes;
    }
  })();
  setSettings({ last_sync_at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
  return { total: rows.length, added };
}

module.exports = { syncInquiries };

if (require.main === module) {
  syncInquiries()
    .then((r) => console.log(`表格中共 ${r.total} 条询盘，新导入 ${r.added} 条`))
    .catch((e) => {
      console.error('同步失败：', e.message);
      process.exit(1);
    });
}
