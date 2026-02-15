// Service Worker para cache offline da Biblia
const CACHE_NAME = 'maanain-biblia-v2';
const BIBLIA_CACHE = 'maanain-biblia-data-v2';

// Assets para cache
const ASSETS = [
    '/',
    '/index.html',
    '/biblia.html',
    '/programacao.html',
    '/login.html',
    '/register.html',
    '/css/styles.css',
    '/css/admin.css',
    '/js/script.js',
    '/sw.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app assets');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== BIBLIA_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // API requests - network first, then cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone the response
                    const responseClone = response.clone();
                    
                    // Cache API responses for bible
                    if (url.pathname.includes('/api/biblia')) {
                        caches.open(BIBLIA_CACHE).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    
                    return response;
                })
                .catch(() => {
                    // If network fails, try to get from cache
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // HTML pages (including biblia.html) - network first, then cache
    if (url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone and cache the response
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // Static assets - cache first, then network
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            
            return fetch(event.request).then((response) => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                // Clone the response
                const responseClone = response.clone();
                
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                
                return response;
            });
        })
    );
});

// Background sync for bible data
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-biblia') {
        console.log('[SW] Syncing bible data...');
        // Sync bible data in background
    }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_BIBLIA') {
        // Pre-cache specific bible chapter
        const { url } = event.data;
        caches.open(BIBLIA_CACHE).then((cache) => {
            fetch(url).then((response) => {
                cache.put(url, response);
            });
        });
    }
});
