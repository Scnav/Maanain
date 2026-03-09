// Service Worker para desregistrar service workers antigos e evitar erros de cache
// Este arquivo remove qualquer service worker registrado anteriormente

self.addEventListener('install', (event) => {
    // Pula a fase de instalação - não quer cachear nada
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Limpa todos os caches existentes
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            // Avisa todos os clientes para recarregar
            return self.clients.claim();
        })
    );
});

// Interceptor de fetch - apenas para evitar erros, não faz cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            // Se falhar, retorna erro simples
            return new Response('Service Worker: Offline', { status: 503 });
        })
    );
});
