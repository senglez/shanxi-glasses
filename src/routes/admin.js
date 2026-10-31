const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { db, getSettings, setSettings, DEFAULT_SETTINGS } = require('../db');
const { ensureCsrf, verifyCsrf, requireAuth } = require('../lib/security');
const { upload, saveImage } = require('../lib/images');
const { slugify, parseList, fmtDate } = require('../lib/util');
const { productUrl } = require('../lib/seo');
const { syncInquiries } = require('../lib/sync');
const seoAuto = require('../lib/seo-auto');
const multer = require('multer');

// Fill empty SEO fields and refresh automatic ones (e.g. after a brand rename). Manual values are kept.
function regenerateSeo({ oldSite } = {}) {
  const site = getSettings().site_name;
  const counts = {};
  for (const [table, g] of Object.entries(seoAuto.BY_TABLE)) {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    const upd = db.prepare(`UPDATE ${table} SET seo_title = ?, seo_description = ? WHERE id = ?`);
    let n = 0;
    db.transaction(() => {
      for (const row of rows) {
        const autoT = seoAuto.isAuto(table, 'seo_title', row, site) || (oldSite && seoAuto.isAuto(table, 'seo_title', row, oldSite));
        const autoD = seoAuto.isAuto(table, 'seo_description', row, site);
        const t = autoT ? g.title(row, site) : row.seo_title;
        const d = autoD ? g.desc(row) : row.seo_description;
        if (t !== row.seo_title || d !== row.seo_description) (upd.run(t, d, row.id), n++);
      }
    })();
    counts[table] = n;
  }
  return counts;
}

// Lists pages whose effective title/description is too long, too short or duplicated.
function seoAudit() {
  const site = getSettings().site_name;
  const issues = [];
  const seen = {};
  const labels = { products: '产品', categories: '分类', posts: '文章' };
  for (const table of Object.keys(seoAuto.BY_TABLE)) {
    for (const row of db.prepare(`SELECT * FROM ${table} WHERE published = 1`).all()) {
      const e = seoAuto.effective(table, row, site);
      const name = row.name || row.title;
      const link = `/admin/c/${table}/${row.id}`;
      const add = (msg) => issues.push({ type: labels[table], name, link, msg });
      if (e.title.length > seoAuto.TITLE_MAX) add(`标题 ${e.title.length} 字符，超过 ${seoAuto.TITLE_MAX}，搜索结果里会被截断`);
      if (e.description.length > 160) add(`描述 ${e.description.length} 字符，超过 160`);
      if (e.description.length < 70) add(`描述只有 ${e.description.length} 字符，建议 120–160`);
      const key = e.title.toLowerCase();
      if (seen[key]) add(`标题与「${seen[key]}」重复`);
      else seen[key] = name;
    }
  }
  return issues;
}

const router = express.Router();
const form = express.urlencoded({ extended: false, limit: '2mb' });

router.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Cache-Control', 'no-store');
  next();
});
router.use(ensureCsrf);
router.use((req, res, next) => {
  res.locals.adminUser = req.session.adminName;
  res.locals.path = req.path;
  res.locals.fmtDate = fmtDate;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  res.locals.newCount = req.session.adminId
    ? db.prepare("SELECT COUNT(*) n FROM inquiries WHERE status = 'new'").get().n
    : 0;
  next();
});
const flash = (req, msg) => (req.session.flash = msg);

/* ---------------- Auth ---------------- */
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/login', (req, res) => res.render('admin/login', { error: null, next: req.query.next || '/admin' }));

router.post('/login', loginLimiter, form, verifyCsrf, async (req, res, next) => {
  try {
    const { username = '', password = '' } = req.body;
    const user = db.prepare('SELECT * FROM admins WHERE username = ?').get(String(username).trim());
    const ok = user && (await bcrypt.compare(String(password), user.password_hash));
    if (!ok) return res.status(401).render('admin/login', { error: '用户名或密码错误', next: req.body.next });
    const dest = /^\/admin(\/|$)/.test(req.body.next || '') ? req.body.next : '/admin';
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.adminId = user.id;
      req.session.adminName = user.username;
      res.redirect(dest);
    });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', form, verifyCsrf, (req, res) => req.session.destroy(() => res.redirect('/admin/login')));

router.use(requireAuth);

/* ---------------- Dashboard ---------------- */
router.get('/', (req, res) => {
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const stats = {
    total: one('SELECT COUNT(*) n FROM inquiries').n,
    new: one("SELECT COUNT(*) n FROM inquiries WHERE status='new'").n,
    last30: one("SELECT COUNT(*) n FROM inquiries WHERE created_at >= datetime('now','-30 days')").n,
    won: one("SELECT COUNT(*) n FROM inquiries WHERE status='won'").n,
    products: one('SELECT COUNT(*) n FROM products').n,
    posts: one('SELECT COUNT(*) n FROM posts').n,
    factories: one('SELECT COUNT(*) n FROM factories').n,
  };
  const daily = db
    .prepare(
      "SELECT date(created_at) d, COUNT(*) n FROM inquiries WHERE created_at >= datetime('now','-30 days') GROUP BY d ORDER BY d"
    )
    .all();
  const group = (col) =>
    db
      .prepare(
        `SELECT COALESCE(NULLIF(${col},''),'(未知)') k, COUNT(*) n FROM inquiries WHERE status != 'spam' GROUP BY k ORDER BY n DESC LIMIT 8`
      )
      .all();
  res.render('admin/dashboard', {
    stats,
    daily,
    byCountry: group('country'),
    byProduct: group('product_name'),
    bySource: group('utm_source'),
    byPage: group('source_page'),
    recent: db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 8').all(),
    thinProducts: db
      .prepare("SELECT id, name FROM products WHERE length(COALESCE(description,'')) < 400 OR image IS NULL OR image = '' LIMIT 10")
      .all(),
    seoIssues: seoAudit(),
    seoEmpty: Object.keys(seoAuto.BY_TABLE).reduce(
      (n, t) => n + db.prepare(`SELECT COUNT(*) n FROM ${t} WHERE COALESCE(seo_title,'') = '' OR COALESCE(seo_description,'') = ''`).get().n,
      0
    ),
  });
});

router.post('/seo/regenerate', form, verifyCsrf, (req, res) => {
  const c = regenerateSeo();
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  flash(req, total ? `SEO 已更新：产品 ${c.products} 个、分类 ${c.categories} 个、文章 ${c.posts} 篇（手动填写的内容不会被覆盖）` : 'SEO 已是最新，没有需要更新的内容');
  res.redirect(req.get('referer') && /\/admin/.test(req.get('referer')) ? req.get('referer') : '/admin');
});

/* ---------------- Inquiries (CRM) ---------------- */
const STATUSES = {
  new: '新询盘',
  contacted: '已联系',
  quoted: '已报价',
  sampling: '打样中',
  won: '已成交',
  lost: '未成交',
  spam: '垃圾',
};

router.get('/inquiries', (req, res) => {
  const status = STATUSES[req.query.status] ? req.query.status : '';
  const term = String(req.query.q || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const where = [];
  const params = {};
  if (status) (where.push('i.status = @status'), (params.status = status));
  if (term)
    (where.push('(i.name LIKE @q OR i.email LIKE @q OR i.company LIKE @q OR i.country LIKE @q OR i.message LIKE @q)'),
      (params.q = `%${term}%`));
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) n FROM inquiries i ${w}`).get(params).n;
  const rows = db
    .prepare(
      `SELECT i.*, f.name factory_name FROM inquiries i LEFT JOIN factories f ON f.id = i.factory_id ${w} ORDER BY i.id DESC LIMIT 30 OFFSET ${(page - 1) * 30}`
    )
    .all(params);
  const s = getSettings();
  res.render('admin/inquiries', {
    rows, total, page, pages: Math.ceil(total / 30), status, term, STATUSES,
    syncReady: !!(s.form_endpoint && s.sync_token), lastSync: s.last_sync_at,
  });
});

router.post('/inquiries/sync', form, verifyCsrf, async (req, res) => {
  try {
    const r = await syncInquiries();
    flash(req, `同步完成：表格中共 ${r.total} 条，新导入 ${r.added} 条`);
  } catch (e) {
    flash(req, '同步失败：' + e.message);
  }
  res.redirect('/admin/inquiries');
});

router.get('/inquiries.csv', (req, res) => {
  const rows = db
    .prepare('SELECT i.*, f.name factory_name FROM inquiries i LEFT JOIN factories f ON f.id = i.factory_id ORDER BY i.id DESC')
    .all();
  const cols = ['id', 'created_at', 'status', 'name', 'email', 'company', 'country', 'phone', 'product_name', 'quantity', 'message', 'factory_name', 'notes', 'source_page', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer'];
  // Prefix formula-like values to prevent CSV injection in Excel.
  const cell = (v) => {
    let t = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  };
  const csv = '\ufeff' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
  res.set('Content-Disposition', `attachment; filename="inquiries-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.type('text/csv').send(csv);
});

router.get('/inquiries/:id', (req, res, next) => {
  const row = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!row) return next();
  const factories = db.prepare('SELECT id, name, location, products FROM factories ORDER BY rating DESC, name').all();
  const others = db.prepare('SELECT id, created_at, product_name, status FROM inquiries WHERE email = ? AND id != ? ORDER BY id DESC').all(row.email, row.id);
  res.render('admin/inquiry', { row, factories, others, STATUSES });
});

router.post('/inquiries/:id', form, verifyCsrf, (req, res) => {
  const status = STATUSES[req.body.status] ? req.body.status : 'new';
  const factory = Number(req.body.factory_id) || null;
  db.prepare('UPDATE inquiries SET status=?, factory_id=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(
    status,
    factory,
    String(req.body.notes || '').slice(0, 10000),
    req.params.id
  );
  flash(req, '已保存');
  res.redirect('/admin/inquiries/' + req.params.id);
});

router.post('/inquiries/:id/delete', form, verifyCsrf, (req, res) => {
  db.prepare('DELETE FROM inquiries WHERE id = ?').run(req.params.id);
  flash(req, '询盘已删除');
  res.redirect('/admin/inquiries');
});

/* ---------------- Generic content CRUD ---------------- */
const catOptions = () => db.prepare('SELECT id value, name label FROM categories ORDER BY sort, name').all();
const seoFields = [
  { name: 'seo_title', label: 'SEO 标题', type: 'text', help: '留空则自动生成。建议 50–60 个英文字符，包含核心关键词。', max: 70 },
  { name: 'seo_description', label: 'SEO 描述', type: 'textarea', rows: 2, help: '留空则使用摘要。建议 120–160 个英文字符。', max: 170 },
];

const RESOURCES = {
  products: {
    table: 'products',
    title: '产品',
    slugFrom: 'name',
    url: (r) => productUrl(r, r.category_id ? db.prepare('SELECT slug FROM categories WHERE id=?').get(r.category_id) : null),
    list: [
      { name: 'image', label: '图', type: 'image' },
      { name: 'name', label: '名称' },
      { name: 'category_name', label: '分类' },
      { name: 'featured', label: '首页推荐', type: 'bool' },
      { name: 'published', label: '发布', type: 'bool' },
      { name: 'updated_at', label: '更新', type: 'date' },
    ],
    listSql: 'SELECT p.*, c.name category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.sort, p.id DESC',
    fields: () => [
      { name: 'name', label: '产品名称（英文）', type: 'text', required: true, help: '写买家会搜索的词，例如 "Hand-Blown Crystal Wine Glass 450ml"' },
      { name: 'slug', label: 'URL 别名', type: 'text', help: '留空自动生成；修改后旧网址会自动 301 跳转' },
      { name: 'category_id', label: '分类', type: 'select', options: catOptions() },
      { name: 'summary', label: '一句话摘要', type: 'textarea', rows: 2, help: '显示在列表和 AI 摘要中。直接说清楚：是什么、材质、适用场景。' },
      { name: 'description', label: '详细描述（Markdown）', type: 'markdown', rows: 14, help: '建议 400 字以上：用途、工艺、可定制项、包装、认证。可用 ## 小标题和列表。' },
      { name: 'specs', label: '规格参数', type: 'textarea', rows: 6, help: '每行一条，格式 “参数: 值”，例如 Capacity: 450 ml' },
      { name: 'material', label: '材质', type: 'text' },
      { name: 'moq', label: '起订量 MOQ', type: 'text' },
      { name: 'lead_time', label: '交期', type: 'text' },
      { name: 'image', label: '主图', type: 'image', help: '建议 1200×1200 白底或场景图，上传后自动压缩为 WebP' },
      { name: 'gallery', label: '图集', type: 'gallery' },
      ...seoFields,
      { name: 'featured', label: '首页推荐', type: 'checkbox' },
      { name: 'published', label: '发布', type: 'checkbox', default: 1 },
      { name: 'sort', label: '排序（小的在前）', type: 'number' },
    ],
  },
  categories: {
    table: 'categories',
    title: '产品分类',
    slugFrom: 'name',
    url: (r) => '/products/' + r.slug,
    list: [
      { name: 'image', label: '图', type: 'image' },
      { name: 'name', label: '名称' },
      { name: 'slug', label: '别名' },
      { name: 'sort', label: '排序' },
      { name: 'published', label: '发布', type: 'bool' },
    ],
    listSql: 'SELECT * FROM categories ORDER BY sort, name',
    fields: () => [
      { name: 'name', label: '分类名称（英文）', type: 'text', required: true },
      { name: 'slug', label: 'URL 别名', type: 'text' },
      { name: 'summary', label: '摘要', type: 'textarea', rows: 2 },
      { name: 'description', label: '分类介绍（Markdown）', type: 'markdown', rows: 10, help: '分类页底部的 SEO 文案，建议 300 字以上' },
      { name: 'image', label: '分类图', type: 'image' },
      ...seoFields,
      { name: 'published', label: '发布', type: 'checkbox', default: 1 },
      { name: 'sort', label: '排序', type: 'number' },
    ],
  },
  posts: {
    table: 'posts',
    title: '文章 / 博客',
    slugFrom: 'title',
    url: (r) => '/blog/' + r.slug,
    list: [
      { name: 'title', label: '标题' },
      { name: 'published', label: '发布', type: 'bool' },
      { name: 'published_at', label: '发布时间', type: 'date' },
      { name: 'updated_at', label: '更新', type: 'date' },
    ],
    listSql: 'SELECT * FROM posts ORDER BY published_at DESC',
    fields: () => [
      { name: 'title', label: '标题（英文）', type: 'text', required: true, help: '用买家的问题做标题效果最好，如 "How to Choose Borosilicate Glassware Suppliers"' },
      { name: 'slug', label: 'URL 别名', type: 'text' },
      { name: 'excerpt', label: '摘要', type: 'textarea', rows: 2, help: '第一句直接给出答案，AI 搜索最容易引用' },
      { name: 'body', label: '正文（Markdown）', type: 'markdown', rows: 22 },
      { name: 'cover', label: '封面图', type: 'image' },
      { name: 'author', label: '作者', type: 'text' },
      { name: 'published_at', label: '发布时间', type: 'text', help: '格式 2026-01-31 10:00:00' },
      ...seoFields,
      { name: 'published', label: '发布', type: 'checkbox', default: 1 },
    ],
  },
  faqs: {
    table: 'faqs',
    title: '常见问题 FAQ',
    list: [
      { name: 'question', label: '问题' },
      { name: 'sort', label: '排序' },
      { name: 'published', label: '发布', type: 'bool' },
    ],
    listSql: 'SELECT * FROM faqs ORDER BY sort, id',
    fields: () => [
      { name: 'question', label: '问题（英文）', type: 'text', required: true },
      { name: 'answer', label: '回答（Markdown）', type: 'markdown', rows: 6, required: true, help: '第一句直接回答，再补充细节和数字' },
      { name: 'sort', label: '排序', type: 'number' },
      { name: 'published', label: '发布', type: 'checkbox', default: 1 },
    ],
  },
  factories: {
    table: 'factories',
    title: '工厂资源库（内部）',
    list: [
      { name: 'name', label: '工厂' },
      { name: 'location', label: '地区' },
      { name: 'products', label: '主营' },
      { name: 'rating', label: '评级' },
      { name: 'contact_person', label: '联系人' },
    ],
    listSql: 'SELECT * FROM factories ORDER BY rating DESC, name',
    fields: () => [
      { name: 'name', label: '工厂名称', type: 'text', required: true },
      { name: 'name_en', label: '英文名', type: 'text' },
      { name: 'location', label: '地址 / 地区', type: 'text' },
      { name: 'products', label: '主营产品', type: 'textarea', rows: 2 },
      { name: 'capability', label: '产能 / 工艺 / 认证', type: 'textarea', rows: 3 },
      { name: 'contact_person', label: '联系人', type: 'text' },
      { name: 'phone', label: '电话', type: 'text' },
      { name: 'wechat', label: '微信', type: 'text' },
      { name: 'email', label: '邮箱', type: 'text' },
      { name: 'rating', label: '合作评级 0–5', type: 'number' },
      { name: 'source', label: '信息来源', type: 'text' },
      { name: 'notes', label: '备注（价格、验厂记录等）', type: 'textarea', rows: 6 },
    ],
  },
  redirects: {
    table: 'redirects',
    title: '301 跳转',
    list: [
      { name: 'from_path', label: '旧路径' },
      { name: 'to_path', label: '新路径' },
      { name: 'hits', label: '命中次数' },
    ],
    listSql: 'SELECT * FROM redirects ORDER BY id DESC',
    fields: () => [
      { name: 'from_path', label: '旧路径', type: 'text', required: true, help: '以 / 开头，如 /old-page' },
      { name: 'to_path', label: '新路径或完整网址', type: 'text', required: true },
    ],
  },
};

function uniqueSlug(table, base, id) {
  let slug = base || 'item';
  let n = 2;
  while (db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).get(slug, id || 0)) slug = `${base}-${n++}`;
  return slug;
}

function addRedirect(from, to) {
  if (!from || from === to) return;
  db.prepare('DELETE FROM redirects WHERE from_path = ?').run(to); // avoid loops
  db.prepare(
    'INSERT INTO redirects(from_path, to_path) VALUES(?, ?) ON CONFLICT(from_path) DO UPDATE SET to_path=excluded.to_path, updated_at=CURRENT_TIMESTAMP'
  ).run(from, to);
  db.prepare('UPDATE redirects SET to_path = ? WHERE to_path = ?').run(to, from); // flatten chains
}

function resource(req, res, next) {
  const r = RESOURCES[req.params.res];
  if (!r) return next('route');
  req.resource = r;
  res.locals.resKey = req.params.res;
  res.locals.R = r;
  next();
}

router.get('/c/:res', resource, (req, res) => {
  res.render('admin/list', { rows: db.prepare(req.resource.listSql).all() });
});

router.get('/c/:res/new', resource, (req, res) => {
  const row = {};
  for (const f of req.resource.fields()) if (f.default !== undefined) row[f.name] = f.default;
  res.render('admin/form', { row, fields: req.resource.fields(), isNew: true });
});

router.get('/c/:res/:id', resource, (req, res, next) => {
  const row = db.prepare(`SELECT * FROM ${req.resource.table} WHERE id = ?`).get(req.params.id);
  if (!row) return next();
  res.render('admin/form', { row, fields: req.resource.fields(), isNew: false, parseList });
});

router.post('/c/:res/:id', resource, upload.any(), verifyCsrf, async (req, res, next) => {
  try {
    const r = req.resource;
    const isNew = req.params.id === 'new';
    const old = isNew ? null : db.prepare(`SELECT * FROM ${r.table} WHERE id = ?`).get(req.params.id);
    if (!isNew && !old) return next();
    const fields = r.fields();
    const b = req.body;
    const files = req.files || [];
    const data = {};
    const errors = [];
    const hint = slugify(b.name || b.title || '') || 'img';

    for (const f of fields) {
      let v = b[f.name];
      if (f.type === 'checkbox') v = v ? 1 : 0;
      else if (f.type === 'number') v = Number(v) || 0;
      else if (f.type === 'select') v = Number(v) || null;
      else if (f.type === 'image') {
        const file = files.find((x) => x.fieldname === f.name);
        v = file ? await saveImage(file, hint) : b[f.name + '_remove'] ? '' : String(b[f.name + '_url'] ?? (old ? old[f.name] : '') ?? '').trim();
      } else if (f.type === 'gallery') {
        const kept = String(b[f.name] || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        for (const file of files.filter((x) => x.fieldname === f.name + '_files')) kept.push(await saveImage(file, hint));
        v = JSON.stringify(kept);
      } else v = String(v ?? '').trim();
      if (f.required && !v) errors.push(`${f.label} 不能为空`);
      data[f.name] = v;
    }

    if (r.slugFrom) data.slug = uniqueSlug(r.table, slugify(data.slug || data[r.slugFrom]), old && old.id);

    // SEO fields: blank = generate; unchanged automatic value = regenerate from the new content;
    // anything typed by hand is kept.
    if (seoAuto.BY_TABLE[r.table]) {
      const site = getSettings().site_name;
      const merged = { ...(old || {}), ...data };
      for (const field of ['seo_title', 'seo_description']) {
        const untouched = old && data[field] === old[field];
        if (!data[field] || (untouched && seoAuto.isAuto(r.table, field, old, site))) {
          const g = seoAuto.BY_TABLE[r.table];
          data[field] = field === 'seo_title' ? g.title(merged, site) : g.desc(merged);
        }
      }
    }
    if (r.table === 'posts' && !data.published_at) data.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (r.table === 'redirects' && !String(data.from_path).startsWith('/')) errors.push('旧路径必须以 / 开头');

    if (errors.length) {
      return res.status(422).render('admin/form', { row: { ...old, ...data }, fields, isNew, errors, parseList });
    }

    const cols = Object.keys(data);
    let id;
    if (isNew) {
      const info = db.prepare(`INSERT INTO ${r.table} (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`).run(data);
      id = info.lastInsertRowid;
    } else {
      id = old.id;
      db.prepare(`UPDATE ${r.table} SET ${cols.map((c) => `${c}=@${c}`).join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run({ ...data, id });
      if (r.url) {
        const before = r.url(old);
        const after = r.url({ ...old, ...data });
        if (before !== after) addRedirect(before, after);
      }
    }
    flash(req, '已保存');
    res.redirect(`/admin/c/${req.params.res}/${id}`);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      flash(req, '保存失败：记录重复（例如同样的旧路径已存在）');
      return res.redirect(`/admin/c/${req.params.res}`);
    }
    next(e);
  }
});

router.post('/c/:res/:id/delete', resource, form, verifyCsrf, (req, res) => {
  db.prepare(`DELETE FROM ${req.resource.table} WHERE id = ?`).run(req.params.id);
  flash(req, '已删除');
  res.redirect('/admin/c/' + req.params.res);
});

/* ---------------- Factory import / export ---------------- */
const FACTORY_COLS = ['name', 'name_en', 'location', 'products', 'capability', 'contact_person', 'phone', 'wechat', 'email', 'rating', 'source', 'notes'];
const factoryHeader = () => {
  // Accept both field names and the Chinese labels used in the admin form / CSV export.
  const map = {};
  for (const f of RESOURCES.factories.fields()) (map[f.name] = f.name), (map[f.label] = f.name);
  return map;
};
const fileUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') row.push(cell), (cell = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim()));
}

router.get('/factories.csv', (req, res) => {
  const fields = RESOURCES.factories.fields();
  const rows = db.prepare('SELECT * FROM factories ORDER BY rating DESC, name').all();
  const cell = (v) => {
    let t = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  };
  const csv = '\ufeff' + [fields.map((f) => cell(f.label)).join(','), ...rows.map((r) => fields.map((f) => cell(r[f.name])).join(','))].join('\r\n');
  res.set('Content-Disposition', `attachment; filename="factories-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.type('text/csv').send(csv);
});

router.post('/factories/import', fileUpload.single('file'), verifyCsrf, (req, res) => {
  try {
    if (!req.file) throw new Error('请选择文件');
    const text = req.file.buffer.toString('utf8').replace(/^\ufeff/, '');
    let items;
    if (/\.json$/i.test(req.file.originalname) || /^\s*\[/.test(text)) {
      items = JSON.parse(text);
      if (!Array.isArray(items)) throw new Error('JSON 必须是数组');
    } else {
      const [head, ...body] = parseCsv(text);
      const map = factoryHeader();
      const keys = (head || []).map((h) => map[h.trim()] || null);
      if (!keys.includes('name')) throw new Error('CSV 第一行必须有「工厂名称」或 name 列');
      items = body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]]).filter(([k]) => k)));
    }
    const exists = new Set(db.prepare('SELECT name FROM factories').all().map((r) => r.name.trim()));
    const ins = db.prepare(`INSERT INTO factories (${FACTORY_COLS.join(',')}) VALUES (${FACTORY_COLS.map((c) => '@' + c).join(',')})`);
    let added = 0, skipped = 0;
    db.transaction(() => {
      for (const it of items) {
        const name = String((it && it.name) || '').trim().replace(/^'/, '');
        if (!name || exists.has(name)) { skipped++; continue; }
        const row = Object.fromEntries(FACTORY_COLS.map((c) => [c, String(it[c] ?? '').trim().replace(/^'/, '').slice(0, 5000)]));
        row.name = name;
        row.rating = Math.max(0, Math.min(5, Number(row.rating) || 0));
        ins.run(row);
        exists.add(name);
        added++;
      }
    })();
    flash(req, `导入完成：新增 ${added} 家，跳过 ${skipped} 家（名称已存在或为空）`);
  } catch (e) {
    flash(req, '导入失败：' + e.message);
  }
  res.redirect('/admin/c/factories');
});

/* ---------------- Settings ---------------- */
const SETTING_FIELDS = [
  { group: '品牌', items: [['site_name', '网站名称'], ['tagline', '一句话标语'], ['founding_year', '成立年份']] },
  { group: '首页 SEO', items: [['home_title', '首页标题 Title'], ['home_description', '首页描述 Description'], ['og_image', '默认分享图 URL（1200×630 JPG/PNG）']] },
  { group: '联系方式', items: [['contact_email', '对外邮箱'], ['notify_email', '询盘通知邮箱（留空用对外邮箱）'], ['phone', '电话'], ['whatsapp', 'WhatsApp 号码（含国家码，仅数字，如 8613800000000）'], ['address', '地址']] },
  { group: '社交媒体', items: [['linkedin', 'LinkedIn URL'], ['facebook', 'Facebook URL'], ['instagram', 'Instagram URL'], ['youtube', 'YouTube URL']] },
  {
    group: '询盘接收（GitHub Pages 静态站用）',
    items: [
      ['web3forms_key', 'Web3Forms Access Key（负责邮件通知，形如 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）'],
      ['form_endpoint', 'Google Apps Script 网页应用地址（负责保存询盘记录，https://script.google.com/macros/s/.../exec）'],
      ['sync_token', '同步密钥 SYNC_TOKEN（与 Apps Script 中一致，不会发布到网站）'],
      ['sync_proxy', '同步代理地址（在中国大陆需要填写，例如 Clash：http://127.0.0.1:7890，V2RayN：http://127.0.0.1:10809；不会发布到网站）'],
    ],
  },
  { group: '统计与站长工具', items: [['ga4_id', 'Google Analytics 4 衡量 ID（G-XXXX）'], ['google_verification', 'Google Search Console 验证码（content 值）'], ['bing_verification', 'Bing Webmaster 验证码（content 值）']] },
];

router.get('/settings', (req, res) => res.render('admin/settings', { s: getSettings(), groups: SETTING_FIELDS }));

router.post('/settings', upload.single('og_upload'), verifyCsrf, async (req, res, next) => {
  try {
    const out = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) if (key in req.body) out[key] = String(req.body[key]).trim().slice(0, 2000);
    if (out.ga4_id && !/^G-[A-Z0-9]+$/i.test(out.ga4_id)) out.ga4_id = '';
    out.whatsapp = (out.whatsapp || '').replace(/\D/g, '');
    if (out.web3forms_key && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(out.web3forms_key)) {
      flash(req, 'Web3Forms Access Key 格式不对（应为 36 位 UUID），已忽略该项');
      delete out.web3forms_key;
      setSettings(out);
      return res.redirect('/admin/settings');
    }
    if (out.form_endpoint && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(out.form_endpoint)) {
      flash(req, '询盘接收地址格式不对，应为 https://script.google.com/macros/s/.../exec，已忽略该项');
      delete out.form_endpoint;
      setSettings(out);
      return res.redirect('/admin/settings');
    }
    if (req.file) out.og_image = await saveImage(req.file, 'og');
    const oldSite = getSettings().site_name;
    setSettings(out);
    if (out.site_name && out.site_name !== oldSite) {
      const c = regenerateSeo({ oldSite });
      flash(req, `设置已保存。网站名称已更改，自动生成的 SEO 标题已同步更新（产品 ${c.products}、分类 ${c.categories}、文章 ${c.posts}）`);
      return res.redirect('/admin/settings');
    }
    flash(req, '设置已保存');
    res.redirect('/admin/settings');
  } catch (e) {
    next(e);
  }
});

/* ---------------- Account ---------------- */
router.get('/password', (req, res) => res.render('admin/password', { error: null }));
router.post('/password', form, verifyCsrf, async (req, res) => {
  const { current = '', next: pw = '', confirm = '' } = req.body;
  const user = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);
  if (!(await bcrypt.compare(current, user.password_hash))) return res.render('admin/password', { error: '当前密码不正确' });
  if (pw.length < 10) return res.render('admin/password', { error: '新密码至少 10 位' });
  if (pw !== confirm) return res.render('admin/password', { error: '两次输入不一致' });
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(pw, 12), user.id);
  flash(req, '密码已更新');
  res.redirect('/admin');
});

module.exports = router;
