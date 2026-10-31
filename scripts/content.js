// npm run content:export  -> write public content from the local admin DB to content/*.json
// npm run publish         -> export + commit + push (GitHub Actions then rebuilds the Pages site)
const { execFileSync } = require('child_process');
const path = require('path');
const content = require('../src/lib/content');

const cmd = process.argv[2];
const ROOT = path.join(__dirname, '..');

if (cmd === 'export' || cmd === 'publish') {
  const counts = content.exportSnapshot();
  console.log('已导出网站内容到 content/：', counts);
}

if (cmd === 'publish') {
  const git = (...args) => execFileSync('git', args, { cwd: ROOT, stdio: 'pipe' }).toString().trim();
  git('add', 'content', 'public/uploads');
  const staged = git('diff', '--cached', '--name-only');
  if (!staged) {
    console.log('内容没有变化，无需发布。');
    process.exit(0);
  }
  git('commit', '-m', 'Update site content ' + new Date().toISOString().slice(0, 16).replace('T', ' '));
  execFileSync('git', ['push'], { cwd: ROOT, stdio: 'inherit' });
  console.log('已推送。GitHub Actions 会在 1–2 分钟内更新网站。');
}

if (!['export', 'publish'].includes(cmd)) {
  console.log('用法: node scripts/content.js export|publish');
  process.exit(1);
}
