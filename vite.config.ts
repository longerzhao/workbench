import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const SITE_DIR = fileURLToPath(new URL('./site', import.meta.url));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

/**
 * 开发时把 site/ 挂在根路径，让官网和应用能在同一个 dev server 上并行调试：
 *   http://127.0.0.1:5273/          → 官网
 *   http://127.0.0.1:5273/workbench/app/ → 应用
 * 生产环境则由 scripts/build-site.mjs 把 site/ 拷到 dist/ 根目录。
 */
function serveSite() {
  return {
    name: 'serve-site',
    configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
      const middlewares = server.middlewares as unknown as {
        use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void;
      };

      middlewares.use((req, res, next) => {
        const url = req.url ?? '/';
        if (!url.startsWith('/') || url.startsWith('/@') || url.startsWith('/src/')) {
          next();
          return;
        }

        const clean = url.split('?')[0]!.split('#')[0]!;

        // 应用搬到了 /workbench/app/，老地址 /workbench/ 现在没有意义了。
        // 与其让 Vite 抛一句生硬的 base 提示，不如直接指路。
        if (clean === '/workbench' || clean === '/workbench/') {
          const res2 = res as {
            setHeader: (k: string, v: string) => void;
            end: (b: string) => void;
          };
          res2.setHeader('Content-Type', 'text/html; charset=utf-8');
          res2.end(
            '<meta charset="utf-8"><p>应用已移动到 <a href="/workbench/app/">/workbench/app/</a>，' +
              '根路径 <a href="/">/</a> 是官网。</p>',
          );
          return;
        }

        // 只处理官网自己的路径，其余交给 Vite（应用在 base 之下）
        const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
        const target = join(SITE_DIR, normalize(rel));

        // 防目录穿越
        if (!target.startsWith(SITE_DIR)) {
          next();
          return;
        }
        if (!existsSync(target) || !statSync(target).isFile()) {
          next();
          return;
        }

        const type = MIME[extname(target).toLowerCase()] ?? 'application/octet-stream';
        (res as { setHeader: (k: string, v: string) => void; end: (b: Buffer) => void }).setHeader(
          'Content-Type',
          type,
        );
        (res as { end: (b: Buffer) => void }).end(readFileSync(target));
      });
    },
  };
}

export default defineConfig({
  // GitHub Pages 项目站点：https://longerzhao.github.io/workbench/
  // 根目录给官网，应用放在 /workbench/app/ 下。
  base: '/workbench/app/',
  plugins: [react(), tailwindcss(), serveSite()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5273,
    host: '127.0.0.1',
  },
  build: {
    // 应用产物落在 dist/app/，官网由 build-site 脚本铺到 dist/ 根目录
    outDir: 'dist/app',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    // 不做手工分包：趋势卡已经用 React.lazy 动态引入，
    // recharts 会自然落到独立 chunk 里，交给打包器判断即可。
  },
  /**
   * 预览不用 vite preview：它的服务根目录取自 build.outDir（dist/app），
   * 官网就访问不到了。改用 scripts/preview.mjs，把 dist/ 按线上结构
   * （站点挂在 /workbench/ 下）伺服，与 GitHub Pages 完全一致。
   */
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
