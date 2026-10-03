// Service worker: answers every request under <base>/__mock/ with the in-browser mock backend.
import { handle } from './mock-core.js';
import { renderWmsTile } from './wms-render.js';

const PREFIX = '/__mock';
const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const at = url.pathname.indexOf(PREFIX + '/');
  if (url.origin !== self.location.origin || at === -1) return;
  event.respondWith(
    (async () => {
      const method = event.request.method;
      if (method === 'OPTIONS') return new Response(null, { status: 204 });
      if (method === 'GET' && /\/api\/geo\/wms$/.test(url.pathname)) {
        const query = Object.fromEntries(url.searchParams);
        if (String(query.REQUEST || query.request || 'GetMap').toLowerCase() === 'getmap') {
          try {
            const blob = await renderWmsTile(query);
            if (blob) return new Response(blob, { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' } });
          } catch (err) {
            console.warn('wms render failed', err);
          }
        }
      }
      const text = MUTATING.includes(method) ? await event.request.text() : '';
      const r = handle(method, url.pathname.slice(at + PREFIX.length) + url.search, text);
      const headers = { ...r.headers };
      delete headers['Content-Length'];
      return new Response(method === 'HEAD' ? null : r.body, { status: r.status, headers });
    })(),
  );
});
