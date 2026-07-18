import { describe, expect, it, vi } from "vitest";
import { isWebGlContextCreationError, releaseWebGlRendererContext } from "../src/systems/webGlLifecycle";

describe("WebGL renderer lifecycle", () => {
  it("only classifies context creation failures as recoverable", () => {
    expect(isWebGlContextCreationError(new Error("Error creating WebGL context with your selected attributes."))).toBe(true);
    expect(isWebGlContextCreationError("WebGL context could not be created")).toBe(true);
    expect(isWebGlContextCreationError(new Error("Story mission data is invalid"))).toBe(false);
  });

  it("stops rendering and releases the context during flight teardown", () => {
    const calls: string[] = [];
    const renderer = {
      setAnimationLoop: vi.fn((callback: null) => {
        expect(callback).toBeNull();
        calls.push("animation");
      }),
      renderLists: { dispose: vi.fn(() => calls.push("render-lists")) },
      forceContextLoss: vi.fn(() => calls.push("context"))
    };
    const forceContextLoss = renderer.forceContextLoss;

    releaseWebGlRendererContext(renderer);

    expect(calls).toEqual(["animation", "render-lists", "context"]);
    expect(renderer.setAnimationLoop).toHaveBeenCalledOnce();
    expect(renderer.renderLists.dispose).toHaveBeenCalledOnce();
    expect(forceContextLoss).toHaveBeenCalledOnce();
    expect(() => renderer.forceContextLoss()).not.toThrow();
    expect(forceContextLoss).toHaveBeenCalledOnce();
  });

  it("continues context release when an earlier cleanup step fails", () => {
    let contextReleaseAttempts = 0;
    const renderer = {
      setAnimationLoop: vi.fn(() => { throw new Error("driver stopped"); }),
      renderLists: { dispose: vi.fn(() => { throw new Error("cache stopped"); }) },
      forceContextLoss: vi.fn(() => {
        contextReleaseAttempts += 1;
        if (contextReleaseAttempts === 1) throw new Error("context busy");
      })
    };
    const forceContextLoss = renderer.forceContextLoss;

    expect(() => releaseWebGlRendererContext(renderer)).not.toThrow();
    expect(forceContextLoss).toHaveBeenCalledOnce();
    renderer.forceContextLoss();
    expect(forceContextLoss).toHaveBeenCalledTimes(2);
    renderer.forceContextLoss();
    expect(forceContextLoss).toHaveBeenCalledTimes(2);
  });
});
