import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages 项目站点：https://longerzhao.github.io/workbench/
  base: '/workbench/',
  plugins: [react(), tailwindcss()],
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
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    // 不做手工分包：趋势卡已经用 React.lazy 动态引入，
    // recharts 会自然落到独立 chunk 里，交给打包器判断即可。
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
