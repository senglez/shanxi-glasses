// npm run content:export  -> write public content from the local admin DB to content/*.json
// npm run publish         -> update from GitHub, export, commit, push (GitHub Actions then rebuilds the site)
const { execFileSync } = require('child_process');
const path = require('path');

const cmd = process.argv[2];
const ROOT = path.join(__dirname, '..');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, stdio: 'pipe' }).toString().trim();

function fail(msg) {
  console.error('\n❌ ' + msg + '\n');
  process.exit(1);
}

if (!['export', 'publish'].includes(cmd)) {
  console.log('用法: node scripts/content.js export|publish');
  process.exit(1);
}

if (cmd === 'publish') {
  // Bring in code/content changes from GitHub first so the push is not rejected.
  // content/*.json is always regenerated from the local DB, so local copies of it can be discarded;
  // uploaded images are never touched.
  try {
    execFileSync('git', ['fetch'], { cwd: ROOT, stdio: 'inherit' });
  } catch {
    fail('连不上 GitHub（代理没开，或 Git 代理没设置）。内容尚未发布。');
  }
  const count = (range) => Number(git('rev-list', '--count', range));
  const ahead = count('@{u}..HEAD');
  const behind = count('HEAD..@{u}');
  if (ahead && behind) {
    const files = git('diff', '--name-only', '@{u}...HEAD').split('\n').filter(Boolean);
    if (!files.every((f) => f.startsWith('content/') || f.startsWith('public/uploads/'))) {
      fail('本地有未推送的代码修改，和 GitHub 上的更新冲突，无法自动处理。请联系技术人员。内容尚未发布。');
    }
    // Unpushed earlier publishes: move onto GitHub's version, keep the files (they are re-added below).
    git('reset', '--mixed', '@{u}');
    console.log(`合并了 ${ahead} 个之前没推送成功的内容提交。`);
  }
  if (git('status', '--porcelain', '--', 'content')) git('checkout', '--', 'content');
  try {
    if (behind) execFileSync('git', ['merge', '--ff-only', '@{u}'], { cwd: ROOT, stdio: 'inherit' });
  } catch {
    fail('从 GitHub 更新失败，可能是本地改过程序文件。请把上面的英文报错发给技术人员。内容尚未发布。');
  }
}

// Required after the update, so the newest code is used for the export.
const content = require('../src/lib/content');
const counts = content.exportSnapshot(); // also merges new items from content/ first
console.log('已导出网站内容到 content/：', counts);

if (cmd === 'publish') {
  git('add', 'content', 'public/uploads');
  const staged = git('diff', '--cached', '--name-only');
  if (staged) git('commit', '-m', 'Update site content ' + new Date().toISOString().slice(0, 16).replace('T', ' '));

  let ahead = '0';
  try {
    ahead = git('rev-list', '--count', '@{u}..HEAD');
  } catch {
    ahead = staged ? '1' : '0';
  }
  if (!staged && ahead === '0') {
    console.log('内容没有变化，无需发布。');
    process.exit(0);
  }
  if (!staged) console.log(`发现 ${ahead} 个之前没推送成功的提交，现在补推。`);

  try {
    execFileSync('git', ['push'], { cwd: ROOT, stdio: 'inherit' });
  } catch {
    fail(
      '推送到 GitHub 失败，内容已在本地保存，修好后重新运行 npm run publish 即可。常见原因：\n' +
        '   • Authentication failed / Invalid username or token：需要用 GitHub Token 登录（不是账号密码）\n' +
        '   • Failed to connect to github.com：代理没开，或 Git 代理没设置\n' +
        '   • rejected：GitHub 上有新提交，重新运行 npm run publish 会先自动更新'
    );
  }
  console.log('\n✅ 已推送。GitHub Actions 会在 1–2 分钟内更新网站。');
}
