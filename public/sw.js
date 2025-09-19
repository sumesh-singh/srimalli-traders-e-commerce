self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Simple passthrough; can be enhanced with caching later
  event.respondWith(fetch(request).catch(() => new Response('', { status: 504 })));
});