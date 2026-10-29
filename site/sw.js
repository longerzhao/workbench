/**
 * 官网的 Service Worker（作用域：/workbench/）。
 *
 * 它还有一个更重要职责：清理旧版应用的缓存。
 *
 * 背景：应用早期就挂在 /workbench/ 下，SW 也注册在那个作用域，缓存名是
 * `workbench-v1`。后来应用搬到 /workbench/app/，旧缓存里的 index.html 仍指向
 * 已被删除的旧 chunk，用户刷新就会撞上：
 *
 *   Failed to fetch dynamically imported module: .../assets/CalendarPage-XXX.js
 *
 * 所以官网这个 SW 在 activate 时把 legacy 缓存删掉，顺带接管旧作用域，
 * 避免两份 SW 互相干扰。应用的 SW（workbench-app-*）不在清理范围内。
 */
const VERSION = 'v2';
const CACHE = `workbench-site-${VERSION}`;

const SITE_SHELL = ['./', './index.html', './styles.css', './main.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SITE_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // 清掉旧版应用缓存（workbench-v1 等）与本 SW 的历史版本；
            // 应用的缓存（workbench-app-*）作用域不同，不受影响。
            .filter(
              (key) =>
                key !== CACHE &&
                !key.startsWith('workbench-app-') &&
                key.startsWith('workbench'),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 应用自己的作用域由它自己的 SW 处理，这里不插手
  if (url.pathname.startsWith('/workbench/app/')) return;

  // 导航：network-first，断网回退缓存的官网首页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
        }),
    );
    return;
  }

  // 静态资源：cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
