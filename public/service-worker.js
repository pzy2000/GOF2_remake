const CACHE_VERSION = "gof2-pwa-v2";
const APP_CACHE = `${CACHE_VERSION}:app`;
const ASSET_CACHE = `${CACHE_VERSION}:assets`;

const PRECACHE_URLS = [
  ".",
  "index.html",
  "manifest.webmanifest",
  "pwa/icon-192.svg",
  "pwa/icon-512.svg",
  "pwa/maskable-icon.svg",
  "assets/generated/asteroid-textures.webp",
  "assets/generated/commodity-icons.webp",
  "assets/generated/equipment-icons.webp",
  "assets/generated/faction-emblems.webp",
  "assets/generated/hud-overlay.webp",
  "assets/generated/key-art.webp",
  "assets/generated/manifest.json",
  "assets/generated/nebula-bg.webp",
  "assets/generated/enemies/glass-echo-drone.glb",
  "assets/generated/enemies/glass-echo-prime.glb",
  "assets/generated/npc-freighter-hull.svg",
  "assets/generated/planet-ashen-harbor.webp",
  "assets/generated/planet-aurelia.webp",
  "assets/generated/planet-aurora-shepherd.webp",
  "assets/generated/planet-black-arc.webp",
  "assets/generated/planet-bracken-dust.webp",
  "assets/generated/planet-celest-crown.webp",
  "assets/generated/planet-emberfall.webp",
  "assets/generated/planet-grave-moon.webp",
  "assets/generated/planet-gryphon-reef.webp",
  "assets/generated/planet-helion-prime-world.webp",
  "assets/generated/planet-hush-orbit.webp",
  "assets/generated/planet-kuro-anvil.webp",
  "assets/generated/planet-lode-minor.webp",
  "assets/generated/planet-meridian-lumen.webp",
  "assets/generated/planet-mirr-glass.webp",
  "assets/generated/planet-niobe-ice.webp",
  "assets/generated/planet-opal-minor.webp",
  "assets/generated/planet-optic-tide.webp",
  "assets/generated/planet-pearl-night.webp",
  "assets/generated/planet-redoubt-moon.webp",
  "assets/generated/planet-sentry-ash.webp",
  "assets/generated/planet-vale-cinder.webp",
  "assets/generated/planet-vantara-command.webp",
  "assets/generated/planet-viridian-ruins.webp",
  "assets/generated/planet-voss-kel.webp",
  "assets/generated/planet-zenith-gas.webp",
  "assets/generated/portraits/ashen-broker.webp",
  "assets/generated/portraits/captain.webp",
  "assets/generated/portraits/celest-archivist.webp",
  "assets/generated/portraits/helion-handler.webp",
  "assets/generated/portraits/kuro-foreman.webp",
  "assets/generated/portraits/mirr-analyst.webp",
  "assets/generated/portraits/ship-ai.webp",
  "assets/generated/portraits/union-witness.webp",
  "assets/generated/portraits/vantara-officer.webp",
  "assets/generated/ships/bastion-7.glb",
  "assets/generated/ships/horizon-ark.glb",
  "assets/generated/ships/mule-lx.glb",
  "assets/generated/ships/raptor-v.glb",
  "assets/generated/ships/sparrow-gundam.glb",
  "assets/generated/ships/sparrow-mk1.glb",
  "assets/generated/stations/celest-vault.glb",
  "assets/generated/stations/mirr-lattice.glb",
  "assets/generated/skybox-ashen-drift.webp",
  "assets/generated/skybox-celest-gate.webp",
  "assets/generated/skybox-helion-reach.webp",
  "assets/generated/skybox-kuro-belt.webp",
  "assets/generated/skybox-mirr-vale.webp",
  "assets/generated/skybox-panorama.webp",
  "assets/generated/skybox-ptd-home.webp",
  "assets/generated/skybox-vantara.webp",
  "assets/generated/vfx/explosion-burst-00.png",
  "assets/generated/vfx/explosion-burst-01.png",
  "assets/generated/vfx/explosion-burst-02.png",
  "assets/generated/vfx/explosion-burst-03.png",
  "assets/generated/vfx/explosion-burst-04.png",
  "assets/generated/vfx/explosion-burst-05.png",
  "assets/generated/vfx/explosion-burst-06.png",
  "assets/generated/vfx/explosion-burst-07.png",
  "assets/music/credits.json",
  "assets/music/galactic-temple.ogg",
  "assets/music/infestation-control-room.mp3",
  "assets/music/loaben.mp3",
  "assets/music/magic-space.mp3",
  "assets/music/observing-the-star.ogg",
  "assets/music/out-there.ogg",
  "assets/music/outer-space.mp3",
  "assets/music/pynchon.mp3",
  "assets/music/space-graveyard.mp3",
  "assets/music/tense-future-loop.ogg"
];

function scopedUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

function sameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isVoiceAssetRequest(request) {
  return new URL(request.url).pathname.includes("/assets/voice/");
}

function shouldCacheAsAsset(request) {
  const url = new URL(request.url);
  if (!sameOrigin(request)) return false;
  if (isVoiceAssetRequest(request)) return false;
  return (
    url.pathname.includes("/assets/") ||
    url.pathname.includes("/pwa/") ||
    url.pathname.endsWith("/manifest.webmanifest") ||
    ["script", "style", "worker", "image", "audio", "font", "manifest"].includes(request.destination)
  );
}

async function cacheRequest(cacheName, request) {
  if (request.headers.has("range")) return fetch(request);
  const cache = await caches.open(cacheName);
  const response = await fetch(request);
  if (response.status === 200) {
    try {
      await cache.put(request, response.clone());
    } catch {
      // Media and browser-specific partial responses must never break fetch.
    }
  }
  return response;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return cacheRequest(ASSET_CACHE, request);
}

async function navigationFirst(request) {
  try {
    return await cacheRequest(APP_CACHE, request);
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match(scopedUrl("."))) ||
      (await caches.match(scopedUrl("index.html"))) ||
      Response.error()
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(ASSET_CACHE);
    await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(scopedUrl(url))));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([APP_CACHE, ASSET_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("gof2-pwa-") && !keep.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "GOF2_CACHE_URLS" || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(ASSET_CACHE);
    const urls = event.data.urls
      .map((url) => {
        try {
          return new URL(url, self.registration.scope);
        } catch {
          return undefined;
        }
      })
      .filter((url) =>
        url &&
        url.origin === self.location.origin &&
        url.href.startsWith(self.registration.scope) &&
        !url.pathname.includes("/assets/voice/")
      );
    await Promise.allSettled(urls.map((url) => cache.add(url.href)));
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !sameOrigin(request)) return;
  if (isVoiceAssetRequest(request)) return;
  if (request.headers.has("range")) return;
  if (request.mode === "navigate") {
    event.respondWith(navigationFirst(request));
    return;
  }
  if (shouldCacheAsAsset(request)) {
    event.respondWith(cacheFirst(request));
  }
});
