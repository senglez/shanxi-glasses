// Pulls inquiries collected by the Google Apps Script endpoint (static site)
// into the local admin database. Safe to run repeatedly: rows are de-duplicated by external_id.
const { db, getSettings, setSettings } = require('../db');

const clip = (v, n) => String(v ?? '').trim().slice(0, n);

async function syncInquiries() {
  const s = getSettings();
  if (!s.form_endpoint || !s.sync_token) throw new Error('请先在「网站设置」填写询盘接收地址和同步密钥');
  const url = new URL(s.form_endpoint);
  if (url.protocol !== 'https:' || !/(^|\.)script\.google\.com$/.test(url.hostname)) {
    throw new Error('询盘接收地址必须是 https://script.google.com/... 开头的 Apps Script 地址');
  }
  url.searchParams.set('action', 'export');
  url.searchParams.set('token', s.sync_token);

  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
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
