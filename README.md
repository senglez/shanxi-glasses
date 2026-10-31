# Shanxi Glass Source：玻璃制品外贸询盘网站

面向海外采购商的玻璃器皿 B2B 网站。前台为英文展示和询盘页面，后台为中文 CMS 和询盘 CRM。你接到询盘后，在后台把它分配给山西本地工厂并跟进。

- **前台（英文）**：动态首页（熔融玻璃 Canvas 动画、3D 卡片、数字滚动）、产品目录、分类、产品详情、OEM 定制、Why Shanxi、FAQ、博客、询盘表单
- **后台（中文，`/admin`）**：数据看板、询盘管理（状态流转、分配工厂、内部备注、CSV 导出）、工厂资源库、产品 / 分类 / 文章 / FAQ 管理、SEO 设置、301 跳转、改密码
- **SEO / GEO**：服务端渲染，带 JSON-LD 结构化数据、sitemap、robots.txt（显式允许 AI 爬虫）、`llms.txt`、`llms-full.txt` 和 RSS

技术栈：Node.js 22+、Express 5、EJS、SQLite（better-sqlite3）、sharp。只需一台服务器，不依赖外部数据库。

---

## 1. 本地运行

```bash
npm install
cp .env.example .env      # 填 SESSION_SECRET 和 ADMIN_PASSWORD
npm start                 # http://localhost:3000，后台 http://localhost:3000/admin
```

第一次启动时会自动：
- 建库（`data/site.db`），写入 7 个分类、14 个产品、11 条 FAQ、3 篇文章和 16 条工厂线索
- 创建管理员账号。如果 `.env` 没填 `ADMIN_PASSWORD`，会在控制台打印一个随机密码

产品图目前是程序生成的占位图（`npm run gen:images` 可重新生成）。**上线前请在后台换成真实照片。**

## 2A. 当前部署方式：GitHub Pages（静态站，免费）

网址：**https://senglez.github.io/shanxi-glasses/**

GitHub Pages 只能托管静态文件，所以分成两部分：

| | 在哪里 | 说明 |
|---|---|---|
| 前台网站 | GitHub Pages | 每次推送到 `main`，GitHub Actions（`.github/workflows/pages.yml`）会自动从 `content/*.json` 生成静态页面并发布 |
| 后台 | 你自己电脑上 `npm start` | 改产品、文章、FAQ、设置；管理询盘和工厂库 |
| 询盘 | 你的 Google 表格 | 客户提交 → 表格记录一行 + 邮件通知 → 后台点「同步询盘」导入。配置方法见 [`integrations/google-apps-script/README.md`](integrations/google-apps-script/README.md) |

**更新网站内容的流程**
1. 本地 `npm start`，在后台修改内容或上传图片
2. 运行 `npm run publish`：把公开内容导出到 `content/`，然后提交并推送
3. 1–2 分钟后网站自动更新（可在仓库的 Actions 页面查看进度）

> 询盘、工厂库、管理员账号和同步密钥只保存在本地数据库 `data/site.db`，不会导出或推送。**请定期备份这个文件。**

本地预览静态版本：`SITE_URL=http://localhost:8080 npm run build:static`，然后在 `dist/` 目录下起一个静态服务器。

**绑定自己的域名**：在仓库 Settings → Secrets and variables → Actions → Variables 添加 `SITE_URL=https://www.你的域名.com` 和 `CNAME=www.你的域名.com`。然后在 DNS 加一条 CNAME 记录指向 `senglez.github.io`，在 Settings → Pages 填写域名并勾选 Enforce HTTPS。有了自己的域名后，robots.txt 和 llms.txt 才会位于网站根目录，被爬虫正常读取。

**以后迁移到服务器（方案 B）**：按下面 2B 部署，把本地的 `data/site.db` 和 `public/uploads/` 拷到服务器即可，询盘历史都在。静态站的网址末尾带 `/`，服务器版会 301 跳转到不带 `/` 的版本，搜索排名不受影响。

## 2B. 部署到服务器（以 Ubuntu 服务器 + Nginx 为例）

1. 服务器装 Node.js 22+，上传代码后执行 `npm ci --omit=dev`
2. 配置 `.env`：`NODE_ENV=production`，`SITE_URL=https://你的域名`，`SESSION_SECRET` 填一个长随机串（生产环境不填会拒绝启动）
3. 用 PM2 守护进程：`pm2 start src/server.js --name glass && pm2 save && pm2 startup`
4. Nginx 反向代理到 3000 端口，用 Let's Encrypt 配 HTTPS：

```nginx
server {
  server_name www.your-domain.com;
  client_max_body_size 20m;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
```

5. **备份**：只需要备份 `data/site.db` 和 `public/uploads/`。可以加一条每日 cron：`sqlite3 data/site.db ".backup backups/site-$(date +%F).db"`

> 服务器选址：目标客户在海外，建议用香港、新加坡或美西的服务器，再接 Cloudflare CDN。服务器在中国大陆需要 ICP 备案，海外访问速度也较慢。如果在 Cloudflare 后面，把 `TRUST_PROXY` 设成 `2`。

**询盘邮件通知**：在 `.env` 填 SMTP（腾讯企业邮、阿里邮箱、Zoho 都可以），新询盘会发到「网站设置」里的通知邮箱，邮件里带后台链接。

## 3. 上线后第一周清单

- [ ] 后台「网站设置」：公司名、邮箱、电话、WhatsApp、地址、社交媒体链接
- [ ] 上传 1200×630 的分享图（og image）
- [ ] 换掉所有产品占位图（后台看板会列出缺图和内容偏少的产品）
- [ ] [Google Search Console](https://search.google.com/search-console) 验证网站（验证码填进设置），提交 `https://你的域名/sitemap.xml`
- [ ] [Bing Webmaster](https://www.bing.com/webmasters) 同样操作。ChatGPT 搜索和 Copilot 都用 Bing 的索引，对 GEO 很重要
- [ ] 创建 GA4，把衡量 ID 填进设置。提交询盘会触发 `generate_lead` 事件，在 GA4 里标记为关键事件
- [ ] 用 [Rich Results Test](https://search.google.com/test/rich-results) 测一个产品页和 FAQ 页
- [ ] 试提交一次询盘，确认能收到邮件

## 4. SEO / GEO 已实现的部分

| 项目 | 实现 |
|---|---|
| 服务端渲染 | 所有内容都在 HTML 里，Google 和 AI 爬虫不用执行 JS 就能读到 |
| 标题 / 描述 | 每页单独设置；后台可逐条覆盖，并带字数提示 |
| Canonical | 每页一个；去掉末尾斜杠；产品 URL 错误时 301 到正确地址 |
| 结构化数据 | Organization、WebSite+SearchAction、BreadcrumbList、Product、ItemList、FAQPage、BlogPosting |
| Sitemap | `/sitemap.xml` 自动生成，含 lastmod 和产品图片 |
| robots.txt | 允许 Google、Bing，并显式放行 GPTBot、OAI-SearchBot、ClaudeBot、PerplexityBot、Google-Extended 等 AI 爬虫；屏蔽 `/admin` |
| llms.txt | `/llms.txt` 是站点结构摘要，`/llms-full.txt` 是 FAQ、产品参数和文章全文，方便大模型直接引用 |
| URL 变更 | 改产品、分类或文章的别名时自动生成 301；也可以在后台手动添加 |
| 性能 | gzip、静态资源缓存、上传图自动压缩成 WebP（最长边 1600px）、图片懒加载、无前端框架 |
| 安全 | Helmet + CSP nonce、bcrypt 密码、登录限速、后台 CSRF；询盘表单有蜜罐、时间陷阱、来源校验和限速；CSV 导出防公式注入 |
| 询盘来源 | 记录首次访问的 UTM 和引荐网站，后台看板按国家、产品、来源和页面统计 |

## 5. 持续运营建议

**内容（最重要）**
- 每周发 1–2 篇英文文章，标题用买家真实会问的问题，比如 *“What is the MOQ for custom wine glasses from China?”*。第一段直接给出答案，再用表格和数字展开。这种写法最容易被 Google 精选摘要和 AI 搜索引用。
- 每个产品描述写到 400 词以上，覆盖用途、工艺、材质、可定制项、包装和认证。放真实的工厂、车间和质检照片，比渲染图更可信。
- 把客户问过的问题持续补进 FAQ。
- 给文章署真实作者名，并在 About 页加团队照片和验厂视频，这些是 Google 判断 E-E-A-T 的依据。

**GEO（AI 搜索）**
- 在不同平台保持一致的公司信息：LinkedIn 公司页、YouTube 车间视频、Google Business Profile、行业目录。AI 会交叉验证这些信息。
- 文中引用权威数据并注明来源（例如新华社关于祁县的数据）。
- 每月问一次 ChatGPT、Perplexity、Google AI 模式：“best glassware suppliers in Shanxi China”，看网站有没有被引用。

**数据复盘（每月一次）**
- 后台看板：哪些国家、产品和来源的询盘多，就加大对应内容和广告投入
- Search Console：找排名 8–20 的关键词，优化对应页面
- 询盘状态统计：比较报价→打样→成交的转化率，找出卡在哪一步

**之后可以扩展**
- 多语言（西班牙语、阿拉伯语、俄语等，祁县产品的中东市场很大），需要加 hreflang
- 在线样品申请、产品 PDF 目录下载换邮箱
- 接入 WhatsApp Business API 或企业微信，把询盘推送到手机

## 6. 目录结构

```
src/
  server.js          入口：安全头、静态资源、301、路由
  config.js          环境变量
  db.js              SQLite 表结构与设置
  seed.js            初始内容（产品、FAQ、文章、工厂线索）
  routes/public.js   前台页面与询盘提交
  routes/seo.js      robots / sitemap / llms.txt / RSS
  routes/admin.js    后台（询盘 CRM、通用内容管理、设置）
  lib/               SEO 结构化数据、图片处理、邮件、安全、内容快照、询盘同步
scripts/build-static.js  生成 GitHub Pages 静态站到 dist/
scripts/content.js       导出内容 / 一键发布
content/                 网站公开内容快照（构建静态站用）
integrations/google-apps-script/  询盘接收脚本和配置说明
.github/workflows/pages.yml       自动部署
views/pages          前台模板（英文）
views/admin          后台模板（中文）
public/              CSS、JS、图片、上传文件
docs/                山西玻璃工厂调研
```
