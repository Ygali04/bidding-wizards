// Offline shell for job sites. Pages load network-first so every visit gets the latest build;
// the cache is only the fallback when there's no signal. Hashed assets are cache-first (their names change per build).
const CACHE = "wizbid-v4";
const SHELL = ["./", "./index.html", "./bidbench.html", "./manifest.webmanifest", "./favicon.svg", "./icon-192.png", "./icon-512.png"];
const opts = { ignoreSearch: true, ignoreVary: true };

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })));
    const html = await (await fetch("./index.html", { cache: "no-store" })).text();
    await c.addAll([...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const isPage = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
    if (isPage || !url.pathname.includes("/assets/")) {
      try {
        const r = await fetch(req, { cache: "no-store" });
        if (r.ok) c.put(req, r.clone());
        return r;
      } catch {
        return (await c.match(req, opts)) || (await c.match("./index.html", opts)) || Response.error();
      }
    }
    const hit = await c.match(req, opts);
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  })());
});
