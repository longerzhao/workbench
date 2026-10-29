#!/usr/bin/env node
/**
 * 组装 GitHub Pages 产物：
 *
 *   dist/
 *   ├── index.html        ← 官网（site/ 拷过来）
 *   ├── styles.css
 *   ├── main.js
 *   └── app/              ← 应用本体（vite build 的输出）
 *       ├── index.html
 *       └── assets/…
 *
 * 对应线上：
 *   https://longerzhao.github.io/workbench/      → 官网
 *   https://longerzhao.github.io/workbench/app/  → 应用
 *
 * 应用用 hash 路由，放在子目录下不需要任何服务端重写规则。
 */
import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const siteDir = join(root, 'site');
const distDir = join(root, 'dist');
const appDir = join(distDir, 'app');

async function countFiles(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) total += await countFiles(join(dir, entry.name));
    else total += 1;
  }
  return total;
}

async function main() {
  if (!existsSync(siteDir)) {
    console.error('[build-site] 找不到 site/ 目录');
    process.exit(1);
  }

  if (!existsSync(appDir)) {
    console.error('[build-site] 找不到 dist/app/，请先运行 vite build');
    process.exit(1);
  }

  // 清掉上一次遗留的官网产物，避免残留旧文件
  for (const name of ['index.html', 'styles.css', 'main.js']) {
    await rm(join(distDir, name), { force: true });
  }

  await mkdir(distDir, { recursive: true });
  await cp(siteDir, distDir, { recursive: true });

  const appFiles = await countFiles(appDir);
  const siteFiles = await countFiles(siteDir);

  console.log(`[build-site] 官网 ${siteFiles} 个文件 → dist/`);
  console.log(`[build-site] 应用 ${appFiles} 个文件 → dist/app/`);
  console.log('[build-site] 官网: /workbench/    应用: /workbench/app/');
}

main().catch((error) => {
  console.error('[build-site] 失败:', error);
  process.exit(1);
});
