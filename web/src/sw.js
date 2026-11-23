const root = new URL(self.registration.scope);
const prefix = "hockey-shell:" + root.href + ":";
const cacheName = prefix + "__BUILD_ID__";
const entries = new Map(__PRECACHE__.map(([path, integrity]) => [new URL(path, root).href, integrity]));
const urls = [...entries.keys()];
const requestFor = url => new Request(url, {cache: "reload", integrity: entries.get(url)});
const index = new URL("index.html", root).href;

async function precache() {
  const cache = await caches.open(cacheName);
  await cache.addAll(urls.map(requestFor));
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    try {
      await precache();
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(prefix) && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;
  url.search = "";
  const entry = request.mode === "navigate" && (url.href === root.href || url.href === index) ? index : url.href;
  if (!entries.has(entry)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const response = await cache.match(entry);
    if (response) return response;
    const fresh = await fetch(requestFor(entry));
    if (fresh.ok) await cache.put(entry, fresh.clone());
    return fresh;
  })());
});

self.addEventListener("message", event => {
  if (event.data === "activate") event.waitUntil(self.skipWaiting());
  if ((event.data === "check" || event.data === "repair") && event.ports[0]) {
    event.waitUntil((async () => {
      const cache = await caches.open(cacheName);
      const hasFiles = async () => (await Promise.all(urls.map(url => cache.match(url)))).every(Boolean);
      let ready = await hasFiles();
      if (!ready && event.data === "repair") {
        try { await precache(); ready = await hasFiles(); } catch { /* Retry once the network is available. */ }
      }
      event.ports[0].postMessage({ready});
    })());
  }
});

