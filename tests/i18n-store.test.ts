import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALE_STORAGE_KEY } from "../src/i18n";

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("game store locale preference", () => {
  it("persists locale independently from save data", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.resetModules();
    const { useGameStore } = await import("../src/state/gameStore");
    const { readSaveSlots } = await import("../src/systems/save");

    const beforeSlots = JSON.stringify(readSaveSlots(storage));
    expect(useGameStore.getState().locale).toBe("en");

    useGameStore.getState().setLocale("zh-CN");

    expect(useGameStore.getState().locale).toBe("zh-CN");
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe("zh-CN");
    expect(JSON.stringify(readSaveSlots(storage))).toBe(beforeSlots);
    expect(storage.getItem("gof2-by-pzy-save")).toBeNull();
    expect(Array.from({ length: storage.length }, (_, index) => storage.key(index))).not.toContain("gof2-by-pzy-save-slot:auto");
  });
});
