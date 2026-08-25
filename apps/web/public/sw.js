// Offline-first cache: after the first visit, the app shell, the Pyodide runtime
// (CDN) and the engine bundle are all served from the cache, so the tool works
// with the network off. API calls are never cached.
const CACHE = "repo2nb-v1";

const cacheable = (url) =>
  url.origin === location.origin || url.hostname === "cdn.jsdelivr.net";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) return;
  if (!cacheable(url)) return;

  e.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => null);

      if (cached) {
        e.waitUntil(network);
        return cached;
      }
      const res = await network;
      if (res) return res;
      if (req.mode === "navigate") {
        const home = await caches.match("/");
        if (home) return home;
      }
      return new Response("offline and not cached yet", { status: 503 });
    })(),
  );
});
