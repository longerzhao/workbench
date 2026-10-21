/**
 * 离线支持。手写而不引 vite-plugin-pwa：
 * 这个应用只有一个入口和一堆带 hash 的静态资源，workbox 那一整套反而是负担。
 *
 * 策略：
 * - 导航请求 network-first，断网时回退缓存的 index.html（hash 路由不产生额外导航）
 * - 静态资源 cache-first（文件名带 hash，天然可以长期缓存）
 * - 数据全在 IndexedDB，本来就不经过网络，所以离线可用的关键只是"页面能打开"
 *
 * 发版注意：改了页面结构就升 VERSION，activate 会清掉旧缓存。
 */
const VERSION = 'v1';
const CACHE = `workbench-${VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

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
