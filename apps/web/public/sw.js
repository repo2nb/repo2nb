// Offline-first cache: after the first visit, the app shell (all routes), the
// Pyodide runtime (CDN) and the engine bundle are served from the cache, so the
// tool works with the network off. API calls are never cached.
const CACHE = "repo2nb-v2";

// every route + favicon: precached at install so offline navigation works
// even for pages the user never opened while online
const PRECACHE = ["/", "/loading", "/convert", "/filters", "/privacy", "/favicon.ico"];

const cacheable = (url) =>
  url.origin === location.origin || url.hostname === "cdn.jsdelivr.net";

// Next.js client-side navigation fetches RSC payloads (`?_rsc=<volatile hash>`).
// Cache those under the bare pathname + "?_rsc" so the hash never breaks the
// cache key; documents go under the bare pathname.
const keyFor = (url, rsc) => {
  if (url.origin !== location.origin) return url.href;
  return rsc ? url.pathname + "?_rsc" : url.pathname;
};

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await Promise.allSettled(
        PRECACHE.map(async (p) => {
          const res = await fetch(p, { cache: "no-cache" });
          if (res.ok) await c.put(new URL(p, location.origin).href, res);
        }),
      );
      // warm RSC payloads for the conversion flow so router.push works offline
      await Promise.allSettled(
        ["/loading", "/convert"].map(async (p) => {
          const res = await fetch(p, { headers: { RSC: "1" }, cache: "no-cache" });
          if (res.ok)
            await c.put(new URL(p + "?_rsc", location.origin).href, res.clone());
        }),
      );
      self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) return;
  if (!cacheable(url)) return;

  const key = keyFor(url, req.headers.get("rsc") === "1");

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(key);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(key, res.clone());
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
        const home = await cache.match("/");
        if (home) return home;
      }
      return new Response("offline and not cached yet", { status: 503 });
    })(),
  );
});
