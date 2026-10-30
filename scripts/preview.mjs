#!/usr/bin/env node
/**
 * 本地预览：把 dist/ 当作 GitHub Pages 的产物来伺服。
 *
 * 为什么不用 `vite preview`：它的服务根目录取自 build.outDir（这里是 dist/app），
 * 官网就访问不到了；而且它按 base 直接伺服，与线上「dist/ 铺在 /workbench/ 下」
 * 的结构并不一致。本脚本刻意还原线上结构：
 *
 *   http://127.0.0.1:4173/workbench/          → 官网
 *   http://127.0.0.1:4173/workbench/app/      → 应用
 *
 * 应用里的资源用的是绝对路径 /workbench/app/...，只有这样才能对上。
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(join(fileURLToPath(new URL('.', import.meta.url)), '..'));
const distDir = join(root, 'dist');
/** 线上 Pages 的项目站点前缀 */
const PREFIX = '/workbench';
const PORT = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.zip': 'application/zip',
  '.woff2': 'font/woff2',
};

if (!existsSync(distDir)) {
  console.error('[preview] 找不到 dist/，请先运行 pnpm build');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/') {
    res.writeHead(302, { Location: `${PREFIX}/` });
    res.end();
    return;
  }

  if (!pathname.startsWith(PREFIX)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 — 本地预览只服务 ${PREFIX}/ 之下（线上是 GitHub Pages 的项目站点路径）`);
    return;
  }

  let rel = pathname.slice(PREFIX.length).replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) rel = join(rel, 'index.html');

  // 防目录穿越
  const target = join(distDir, normalize(rel));
  if (!target.startsWith(distDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403');
    return;
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 — ${pathname}`);
    return;
  }

  try {
    const body = await readFile(target);
    res.writeHead(200, {
      'Content-Type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`500 — ${error instanceof Error ? error.message : '读取失败'}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[preview] 官网 http://${HOST}:${PORT}${PREFIX}/`);
  console.log(`[preview] 应用 http://${HOST}:${PORT}${PREFIX}/app/`);
});
