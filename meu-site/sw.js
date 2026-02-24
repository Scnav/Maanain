// Service Worker otimizado para MAANAIN
// Cache-first para estáticos, network-first para APIs

const CACHE_NAME = 'maanain-v21';
const STATIC_CACHE = 'maanain-static-v21';
const DYNAMIC_CACHE = 'maanain-dynamic-v21';

// Recursos estáticos para cache (cache-first)
const staticAssets = [
  '/',
  '/index.html',
  '/css/styles.css?v=14',
  '/js/admin-auth.js',
  '/css/admin.css',
  '/js/script.js',
  '/js/admin.js?v=3',
  '/editor.html',
  '/login.html',
  '/register.html',
  '/biblia.html',
  '/programacao.html',
  '/membro.html',
  '/redefinir-senha.html',
  '/aulas.html',
  '/admin.html',
  '/favicon.ico'
];

// Instalação - cache estático
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Cache estático aberto');
        return cache.addAll(staticAssets);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - estratégia híbrida
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // APIs: network-first com cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // YouTube: network-first (cache limitado)
  if (url.hostname.includes('youtube.com') || url.hostname.includes('googlevideo.com')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estáticos: cache-first (exceto uploads)
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Páginas HTML: sempre buscar do servidor
  if (url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // JavaScript: sempre buscar do servidor
  if (url.pathname.endsWith('.js')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  event.respondWith(cacheFirst(request));
});

// Estratégia Cache-First (para estáticos)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Estratégia Network-First (para APIs)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Só faz cache de requisições GET
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
