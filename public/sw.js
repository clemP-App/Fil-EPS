const CACHE = "fil-eps-v1";
const DEV = new URL(self.location.href).searchParams.has("dev");

const PRECACHE = [
  "/offline.html",
  "/favicon.ico",
  "/icon.svg",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  if (DEV) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isExcluded(pathname) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api");
}

function isImmutableAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

function isBrandAsset(pathname) {
  return (
    pathname.startsWith("/icons/") ||
    pathname === "/icon.svg" ||
    pathname === "/favicon.ico" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/offline.html"
  );
}

self.addEventListener("fetch", (event) => {
  if (DEV) return;
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isExcluded(url.pathname)) return;
  if (request.headers.get("RSC") || request.headers.get("Next-Router-Prefetch") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isBrandAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    const type = response.headers.get("content-type") || "";
    if (response.ok && !response.redirected && type.includes("text/html")) {
      try {
        await cache.put(request, response.clone());
      } catch {
        // Une réponse non stockable ne doit pas interrompre la navigation.
      }
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline.html");
    if (offline) return offline;
    return new Response("Vous êtes hors ligne.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      try {
        await cache.put(request, response.clone());
      } catch {
        // Le réseau reste la source de vérité si le cache refuse la réponse.
      }
    }
    return response;
  } catch {
    return new Response("", { status: 504, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const response = await network;
  if (response) return response;
  return new Response("", { status: 504, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function shellUrlAllowed(url) {
  if (url.origin !== self.location.origin || isExcluded(url.pathname) || url.searchParams.has("_rsc")) return false;
  if (url.pathname.startsWith("/_next/")) return isImmutableAsset(url.pathname);
  return true;
}

self.addEventListener("message", (event) => {
  if (DEV) return;
  const data = event.data;
  if (!data || data.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        data.urls.slice(0, 80).map(async (value) => {
          try {
            const url = new URL(value, self.location.origin);
            if (!shellUrlAllowed(url)) return;
            await cache.add(url.href);
          } catch {
            // Une ressource manquante n'empêche pas de garder les autres.
          }
        }),
      ),
    ),
  );
});
