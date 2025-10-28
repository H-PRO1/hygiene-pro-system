// ============================================
// ADVANCED SERVICE WORKER (v7.11)
// Smart cache management with update detection
// ============================================

const CACHE_NAME = 'hygiene-pro-v7.11';
const RUNTIME_CACHE = 'hygiene-pro-runtime-v7.11';
const urlsToCache = [
    '/',
    '/index.html',
    '/version.json'
];

// Install event - cache essential files
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('💾 Caching essential files');
            return cache.addAll(urlsToCache);
        }).then(() => {
            console.log('✅ Service Worker installed');
            self.skipWaiting();  // Activate immediately
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old caches (keep only current)
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activated');
            self.clients.claim();  // Claim all clients
        })
    );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip external resources
    if (url.origin !== location.origin) {
        return;
    }
    
    // Special handling for version.json - always fetch fresh
    if (url.pathname === '/version.json' || url.pathname.endsWith('version.json')) {
        event.respondWith(
            fetch(request, { cache: 'no-store' })
                .then(response => {
                    if (response.ok) {
                        // Update cache with fresh version info
                        const cache = caches.open(RUNTIME_CACHE);
                        cache.then(c => c.put(request, response.clone()));
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(request)
                        .then(response => response || new Response('Offline', { status: 503 }));
                })
        );
        return;
    }
    
    // For index.html - Network first, fallback to cache
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(request, { cache: 'no-store' })
                .then(response => {
                    if (response.ok) {
                        // Update cache with latest version
                        const cache = caches.open(RUNTIME_CACHE);
                        cache.then(c => c.put(request, response.clone()));
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache
                    return caches.match(request)
                        .then(response => response || caches.match('/index.html'));
                })
        );
        return;
    }
    
    // For other resources - Cache first, network fallback
    event.respondWith(
        caches.match(request).then(response => {
            if (response) {
                console.log('📦 Serving from cache:', request.url);
                return response;
            }
            
            return fetch(request).then(response => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200) {
                    return response;
                }
                
                // Cache successful responses
                const cache = caches.open(RUNTIME_CACHE);
                cache.then(c => c.put(request, response.clone()));
                
                return response;
            }).catch(() => {
                console.log('⚠️ Offline - no cache for:', request.url);
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// Message event - handle messages from clients
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('📢 Received SKIP_WAITING message');
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('📢 Clearing all caches...');
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                caches.delete(cacheName);
            });
        });
    }
});

console.log('✅ Advanced Service Worker loaded (v7.11)');
