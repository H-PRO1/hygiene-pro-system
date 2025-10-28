// ============================================
// ULTIMATE SERVICE WORKER (v7.12)
// AUTO UPDATE - Zero manual refresh needed!
// ============================================

const CACHE_NAME = 'hygiene-pro-v7.12';
const RUNTIME_CACHE = 'hygiene-pro-runtime-v7.12';
let REMOTE_VERSION = null;

const urlsToCache = [
    '/',
    '/index.html',
    '/version.json'
];

// ✅ FETCH REMOTE VERSION ON INSTALL
async function fetchRemoteVersion() {
    try {
        const response = await fetch('/version.json?t=' + Date.now(), {
            cache: 'no-store'
        });
        if (response.ok) {
            const data = await response.json();
            REMOTE_VERSION = data.version;
            console.log('📦 [SW] Remote version fetched:', REMOTE_VERSION);
            return REMOTE_VERSION;
        }
    } catch (e) {
        console.log('ℹ️ [SW] Version fetch failed:', e.message);
    }
    return null;
}

// Install event - cache essential files
self.addEventListener('install', event => {
    console.log('🔧 [SW v7.12] Installing...');
    
    event.waitUntil(
        fetchRemoteVersion().then(() => {
            return caches.open(CACHE_NAME).then(cache => {
                console.log('💾 [SW] Caching essential files');
                return cache.addAll(urlsToCache);
            });
        }).then(() => {
            console.log('✅ [SW] Installed - skipWaiting');
            self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('🚀 [SW v7.12] Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('🗑️ [SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ [SW] Activated - claiming clients');
            return self.clients.claim();
        })
    );
});

// ============================================
// FETCH EVENT - INTELLIGENT CACHING
// ============================================
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    if (request.method !== 'GET') return;
    if (url.origin !== location.origin) return;
    
    // ============ version.json - ALWAYS FRESH ============
    if (url.pathname === '/version.json' || url.pathname.endsWith('version.json')) {
        event.respondWith(
            fetch(request, { cache: 'no-store' })
                .then(response => {
                    if (response.ok) {
                        const cache = caches.open(RUNTIME_CACHE);
                        cache.then(c => c.put(request, response.clone()));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request)
                        .then(response => response || new Response('{"version":"offline"}', { status: 200 }));
                })
        );
        return;
    }
    
    // ============ index.html - NETWORK FIRST WITH VALIDATION ============
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(request, { cache: 'no-store' })
                .then(response => {
                    if (response.ok) {
                        console.log('🌐 [SW] Fresh index.html from network');
                        const cache = caches.open(RUNTIME_CACHE);
                        cache.then(c => c.put(request, response.clone()));
                        return response;
                    }
                    throw new Error('Bad response');
                })
                .catch(() => {
                    console.log('💾 [SW] Fallback to cached index.html');
                    return caches.match(request)
                        .then(response => response || caches.match('/index.html'));
                })
        );
        return;
    }
    
    // ============ OTHER FILES - CACHE FIRST ============
    event.respondWith(
        caches.match(request).then(response => {
            if (response) {
                return response;
            }
            
            return fetch(request).then(response => {
                if (!response || response.status !== 200) {
                    return response;
                }
                
                const cache = caches.open(RUNTIME_CACHE);
                cache.then(c => c.put(request, response.clone()));
                return response;
            }).catch(() => {
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// ============================================
// MESSAGE EVENT - CLIENT COMMUNICATION
// ============================================
self.addEventListener('message', event => {
    console.log('📢 [SW] Message received:', event.data.type);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                console.log('🗑️ [SW] Clearing cache:', cacheName);
                caches.delete(cacheName);
            });
        });
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: REMOTE_VERSION
        });
    }
});

console.log('✅ [SW v7.12] ULTIMATE Service Worker loaded - AUTO UPDATE ENABLED!');
