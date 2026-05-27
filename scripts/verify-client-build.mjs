import fs from 'node:fs';
import path from 'node:path';

const clientDir = path.resolve('dist/client');
const indexHtml = path.join(clientDir, 'index.html');
const assetsDir = path.join(clientDir, 'assets');

if (!fs.existsSync(indexHtml)) {
  console.error(
    '[verify-client-build] 缺少 dist/client/index.html\n' +
      'Cloudflare Pages 的 Output directory 必须填：dist/client'
  );
  process.exit(1);
}

const assets = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
  : [];

if (assets.length === 0) {
  console.error('[verify-client-build] dist/client/assets 下没有 JS 文件');
  process.exit(1);
}

console.log('[verify-client-build] OK');
console.log('  index:', indexHtml);
console.log('  js:', assets.join(', '));
