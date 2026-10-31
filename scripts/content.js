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
  // Pull code changes first so the push is not rejected. Only fast-forward: never creates merges.
  try {
    execFileSync('git', ['pull', '--ff-only'], { cwd: ROOT, stdio: 'inherit' });
  } catch {
    fail('从 GitHub 更新失败。可能原因：\n   1. 代理没开，或 Git 代理没设置（Failed to connect）\n   2. 本地有和 GitHub 冲突的修改（Not possible to fast-forward）\n   请把上面的英文报错发给技术人员处理。内容尚未发布。');
  }
}

// Required after the pull, so the newest code is used for the export.
const content = require('../src/lib/content');
const counts = content.exportSnapshot();
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
