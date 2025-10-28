// ============================================
// SIMPLE & EFFECTIVE SERVICE WORKER (v8.0)
// RULE: Never cache index.html - Always fresh!
// ============================================

const CACHE_NAME = 'hygiene-pro-v8.0';

// Install event
self.addEventListener('install', event => {
    console.log('🔧 [v8.0] SW installing...');
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('🚀 [v8.0] SW activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            self.clients.claim();
            console.log('✅ [v8.0] SW activated');
        })
    );
});

// Fetch event - SIMPLE STRATEGY
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET
    if (request.method !== 'GET') return;
    
    // Skip external resources
    if (url.origin !== location.origin) return;
    
    // ============================================
    // RULE 1: index.html - NEVER CACHE - ALWAYS FRESH
    // ============================================
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(request, { cache: 'no-store' })
                .then(response => {
                    if (response && response.status === 200) {
                        console.log('🌐 [v8.0] Fresh index.html from network');
                        return response;
                    }
                    throw new Error('Bad response');
                })
                .catch(() => {
                    console.log('⚠️ [v8.0] Offline - showing offline page');
                    return new Response(
                        '<h1>⚠️ Offline</h1><p>Δεν μπορώ να συνδεθώ. Παρακαλώ δοκιμάστε αργότερα.</p>',
                        { 
                            status: 503,
                            headers: { 'Content-Type': 'text/html' }
                        }
                    );
                })
        );
        return;
    }
    
    // ============================================
    // RULE 2: Static assets - CACHE FIRST
    // ============================================
    event.respondWith(
        caches.match(request).then(response => {
            // Found in cache - return it
            if (response) {
                console.log('📦 [v8.0] Cached:', request.url);
                return response;
            }
            
            // Not in cache - fetch from network
            return fetch(request, { cache: 'no-store' })
                .then(response => {
                    // Don't cache bad responses
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    
                    // Cache successful response
                    const cache = caches.open(CACHE_NAME);
                    cache.then(c => {
                        c.put(request, response.clone());
                        console.log('💾 [v8.0] Cached:', request.url);
                    });
                    
                    return response;
                })
                .catch(() => {
                    console.log('⚠️ [v8.0] Offline - no cache for:', request.url);
                    return new Response('Offline', { status: 503 });
                });
        })
    );
});

console.log('✅ [v8.0] SIMPLE & EFFECTIVE Service Worker - index.html NEVER cached!');
