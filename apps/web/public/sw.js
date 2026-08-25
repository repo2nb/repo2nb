// Offline-first cache: after the first visit, the app shell (all routes), the
// Pyodide runtime (CDN) and the engine bundle are served from the cache, so the
// tool works with the network off. API calls are never cached.
const CACHE = "repo2nb-v5";

// every route + icon: precached at install so offline navigation works
// even for pages the user never opened while online
const PRECACHE = ["/", "/loading", "/convert", "/filters", "/privacy", "/icon.svg"];

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
      // precache all built JS/CSS/font assets (route chunks are dynamic imports:
      // without this they only cache when each route is first visited online)
      try {
        const manifest = await (await fetch("/sw-precache.json", { cache: "no-cache" })).json();
        await Promise.allSettled(
          manifest.map(async (p) => {
            const res = await fetch(p, { cache: "no-cache" });
            if (res.ok) await c.put(new URL(p, location.origin).href, res);
          }),
        );
      } catch {
        // manifest missing (dev build): runtime caching still applies
      }
      self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) return;
  if (!cacheable(url)) return;

  e.respondWith(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        const key = keyFor(url, req.headers.get("rsc") === "1");
        // engine bundle: network-first so new deploys replace stale cached copies
        const networkFirst = url.pathname === "/engine.json";
        const cached = await cache.match(key);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok && res.type !== "opaque") cache.put(key, res.clone());
            return res;
          })
          .catch(() => null);

        if (cached && !networkFirst) {
          e.waitUntil(network);
          return cached;
        }
        const res = await network;
        if (res) return res;
        if (cached) return cached; // offline fallback for network-first resources
        if (req.mode === "navigate") {
          const home = await cache.match("/");
          if (home) return home;
        }
        return new Response("offline and not cached yet", { status: 503 });
      } catch (err) {
        // never let the handler itself throw — serve cache or a plain 503
        console.warn("[repo2nb sw] fetch handler error for", req.url, err);
        const cache = await caches.open(CACHE);
        const fallback =
          (await cache.match(keyFor(url, false))) || (await cache.match(keyFor(url, true)));
        if (fallback) return fallback;
        return new Response("service worker error", { status: 503 });
      }
    })(),
  );
});
