import { expect, test } from "@playwright/test";

test("PWA service worker does not cache partial range responses", async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  try {
    await page.goto("/manifest.webmanifest");
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    const results = await page.evaluate(async () => {
      const urls = [
        "/assets/music/magic-space.mp3",
        "/assets/voice/helion-handler/b7afbc5d931b491c.mp3",
        "/assets/voice/captain/cab2b31120ed8d3d.mp3",
        "/assets/voice/ship-ai/f10deb39ad33e413.mp3"
      ];
      return Promise.all(urls.map(async (url) => {
        const response = await fetch(url, {
          headers: { Range: "bytes=0-127" }
        });
        const bytes = await response.arrayBuffer();
        return {
          url,
          status: response.status,
          ok: response.ok,
          byteLength: bytes.byteLength
        };
      }));
    });

    for (const result of results) {
      expect(result.ok, result.url).toBe(true);
      expect([200, 206], result.url).toContain(result.status);
      expect(result.byteLength, result.url).toBeGreaterThan(0);
    }
    expect(errors.join("\n")).not.toContain("Partial response");
  } finally {
    await context.setOffline(false);
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("gof2-pwa-")).map((key) => caches.delete(key)));
    }).catch(() => undefined);
    await context.close();
  }
});
