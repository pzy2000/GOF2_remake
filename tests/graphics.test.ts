import { afterEach, describe, expect, it, vi } from "vitest";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

async function freshGraphics(storage = new MemoryStorage()) {
  vi.resetModules();
  vi.stubGlobal("localStorage", storage);
  return { storage, module: await import("../src/systems/graphics") };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("graphics settings", () => {
  it("defaults to high quality and persists selected presets", async () => {
    const { storage, module } = await freshGraphics();

    expect(module.getGraphicsSettings()).toMatchObject({
      quality: "high",
      postProcessing: true,
      shadows: true
    });

    const low = module.saveGraphicsQuality("low");
    expect(low).toMatchObject({
      quality: "low",
      postProcessing: false,
      shadows: false
    });
    expect(storage.getItem(module.GRAPHICS_SETTINGS_KEY)).toBe("{\"quality\":\"low\"}");
    expect(module.getGraphicsSettings()).toEqual(low);
  });

  it("falls back to high quality for invalid saved data", async () => {
    const storage = new MemoryStorage();
    storage.setItem("gof2-by-pzy-graphics-settings", "{\"quality\":\"cinematic\"}");
    const { module } = await freshGraphics(storage);

    expect(module.getGraphicsSettings().quality).toBe("high");
  });
});
