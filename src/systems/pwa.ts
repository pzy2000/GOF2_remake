const PWA_QUERY_FLAG = "pwa";
const PWA_DEV_STORAGE_FLAG = "gof2-pwa-dev";

export interface PwaEnableOptions {
  production: boolean;
  search?: string;
  forced?: boolean;
  storedPreference?: string | null;
}

export function shouldEnablePwa({ production, search = "", forced = false, storedPreference }: PwaEnableOptions): boolean {
  if (production || forced || storedPreference === "true") return true;
  return new URLSearchParams(search).has(PWA_QUERY_FLAG);
}

export function collectSameOriginResourceUrls(entries: PerformanceResourceTiming[], origin: string): string[] {
  const urls = entries
    .map((entry) => {
      try {
        return new URL(entry.name);
      } catch {
        return undefined;
      }
    })
    .filter((url): url is URL => !!url && url.origin === origin)
    .map((url) => url.href);
  return Array.from(new Set(urls));
}

export async function registerPwa(): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  const enabled = shouldEnablePwa({
    production: import.meta.env.PROD,
    search: window.location.search,
    storedPreference: localStorage.getItem(PWA_DEV_STORAGE_FLAG)
  });
  if (!enabled) {
    if (import.meta.env.DEV) await unregisterLocalServiceWorkers();
    return undefined;
  }
  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`, {
    scope: import.meta.env.BASE_URL
  });
  await navigator.serviceWorker.ready;
  await notifyServiceWorkerAboutLoadedResources();
  return registration;
}

async function unregisterLocalServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations
    .filter((registration) => registration.scope.startsWith(window.location.origin))
    .map((registration) => registration.unregister()));
}

async function notifyServiceWorkerAboutLoadedResources(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active ?? navigator.serviceWorker.controller;
  if (!worker) return;
  const urls = collectSameOriginResourceUrls(
    performance.getEntriesByType("resource") as PerformanceResourceTiming[],
    window.location.origin
  );
  worker.postMessage({ type: "GOF2_CACHE_URLS", urls });
}

declare global {
  interface Window {
    __GOF2_PWA_READY__?: Promise<ServiceWorkerRegistration | undefined>;
  }
}
