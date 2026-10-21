import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { App } from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root 节点缺失，index.html 可能被改坏了');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * 只在生产环境注册 Service Worker。
 * 开发环境下 SW 会把 HMR 的请求也缓存住，得不偿失。
 * 路径要带 BASE_URL，否则 GitHub Pages 的子路径部署会 404。
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.warn('[workbench] Service Worker 注册失败，离线不可用', error);
    });
  });
}
