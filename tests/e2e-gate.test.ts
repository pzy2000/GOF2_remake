import { describe, expect, it } from "vitest";
import { shouldExposeE2EHook } from "../src/systems/e2eGate";

describe("E2E hook security gate", () => {
  it("never exposes the hook in production builds", () => {
    expect(shouldExposeE2EHook({ development: false, queryEnabled: true, storageEnabled: true })).toBe(false);
  });

  it("requires an explicit opt-in during development", () => {
    expect(shouldExposeE2EHook({ development: true, queryEnabled: false, storageEnabled: false })).toBe(false);
    expect(shouldExposeE2EHook({ development: true, queryEnabled: true, storageEnabled: false })).toBe(true);
  });
});
