/**
 * Dores App - Service Worker
 * Estrategia: Cache-first para assets estáticos, Network-first para API
 */

const CACHE_NAME = 'dores-app-v1';
const STATIC_CACHE = 'dores-static-v1';

// Assets del shell de la app para caché inicial
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Dominios de API que siempre deben ir a la red
const NETWORK_ONLY_HOSTS = [
  'dores.cruznegradev.com',
  'supabase.co',
  'dolarapi.com',
  'exchangerate.host',
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Error caching app shell:', err);
      });
    })
  );
  // Activar inmediatamente sin esperar a que las pestañas se cierren
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => {
            console.log('[SW] Eliminando caché antiguo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Tomar control de todas las pestañas abiertas
  self.clients.claim();
});

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo manejar solicitudes GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorar solicitudes de extensiones del navegador
  if (!url.protocol.startsWith('http')) return;

  // Network-only para llamadas a APIs externas
  const isApiRequest = NETWORK_ONLY_HOSTS.some((host) =>
    url.hostname.includes(host)
  );
  if (isApiRequest) {
    return; // Dejar pasar sin interceptar
  }

  // Estrategia: Cache-first con fallback a red para assets de la app
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Actualizar el caché en segundo plano (stale-while-revalidate)
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cache = caches.open(CACHE_NAME);
              cache.then((c) => c.put(request, networkResponse.clone()));
            }
            return networkResponse;
          })
          .catch(() => {/* offline, usamos el caché */});

        return cachedResponse;
      }

      // No está en caché, buscar en la red
      return fetch(request)
        .then((response) => {
          // No cachear respuestas inválidas
          if (
            !response ||
            response.status !== 200 ||
            response.type === 'opaque'
          ) {
            return response;
          }

          // Guardar en caché para futuras visitas
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Offline fallback: servir index.html para navegación
          if (
            request.destination === 'document' ||
            request.headers.get('accept')?.includes('text/html')
          ) {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// ─── Push Notifications (futuro) ────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/assets/logo-mobile.png',
    badge: '/assets/logo-mobile.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Dores', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
