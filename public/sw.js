// Offline shell for job sites: precache the app on install, then serve cache-first with a background refresh.
const CACHE = "wizbid-v3";
const SHELL = ["./", "./index.html", "./bidbench.html", "./manifest.webmanifest", "./favicon.svg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    // Hashed JS/CSS names change every build, so read them out of index.html.
    const html = await (await fetch("./index.html", { cache: "no-store" })).text();
    const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
    await c.addAll(assets);
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
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(e.request, { ignoreSearch: true, ignoreVary: true });
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    if (hit) return hit; // net keeps refreshing the cache in the background
    return (await net) || (e.request.mode === "navigate" ? c.match("./index.html", { ignoreVary: true }) : Response.error());
  })());
});
