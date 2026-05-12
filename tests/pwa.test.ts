import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectSameOriginResourceUrls, shouldEnablePwa } from "../src/systems/pwa";

describe("PWA helpers", () => {
  it("enables registration only for production, explicit query opt-in, or stored dev preference", () => {
    expect(shouldEnablePwa({ production: true })).toBe(true);
    expect(shouldEnablePwa({ production: false, search: "?pwa=1" })).toBe(true);
    expect(shouldEnablePwa({ production: false, storedPreference: "true" })).toBe(true);
    expect(shouldEnablePwa({ production: false, search: "?debug=1" })).toBe(false);
  });

  it("collects unique same-origin resources for service worker caching", () => {
    const entries = [
      { name: "http://127.0.0.1:4173/src/main.tsx" },
      { name: "http://127.0.0.1:4173/assets/generated/key-art.webp" },
      { name: "http://127.0.0.1:4173/assets/generated/key-art.webp" },
      { name: "https://cdn.example.com/skip.js" }
    ] as PerformanceResourceTiming[];

    expect(collectSameOriginResourceUrls(entries, "http://127.0.0.1:4173")).toEqual([
      "http://127.0.0.1:4173/src/main.tsx",
      "http://127.0.0.1:4173/assets/generated/key-art.webp"
    ]);
  });

  it("keeps range responses out of Cache.put", () => {
    const serviceWorker = readFileSync(resolve(process.cwd(), "public/service-worker.js"), "utf8");

    expect(serviceWorker).toContain('const CACHE_VERSION = "gof2-pwa-v2"');
    expect(serviceWorker).toContain("isVoiceAssetRequest");
    expect(serviceWorker).toContain('/assets/voice/');
    expect(serviceWorker).toContain('request.headers.has("range")');
    expect(serviceWorker).toContain("response.status === 200");
    expect(serviceWorker).toContain("cache.put(request, response.clone())");
    expect(serviceWorker).toContain("must never break fetch");
  });
});
