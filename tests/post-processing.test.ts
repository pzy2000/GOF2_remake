import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { disposePostProcessingComposer } from "../src/systems/postProcessing";

describe("post-processing resource cleanup", () => {
  it("disposes pass-owned targets before the composer targets", () => {
    const calls: string[] = [];
    const bloomPass = { dispose: vi.fn(() => calls.push("bloom")) };
    const sharpenPass = { dispose: vi.fn(() => calls.push("sharpen")) };
    const composer = {
      passes: [bloomPass, sharpenPass],
      dispose: vi.fn(() => calls.push("composer"))
    };

    disposePostProcessingComposer(composer);

    expect(calls).toEqual(["bloom", "sharpen", "composer"]);
    expect(composer.passes).toEqual([]);
    expect(bloomPass.dispose).toHaveBeenCalledOnce();
    expect(sharpenPass.dispose).toHaveBeenCalledOnce();
    expect(composer.dispose).toHaveBeenCalledOnce();
  });

  it("continues releasing resources when one pass cleanup fails", () => {
    const survivingPass = { dispose: vi.fn() };
    const composer = {
      passes: [
        { dispose: vi.fn(() => { throw new Error("driver cleanup failed"); }) },
        survivingPass
      ],
      dispose: vi.fn()
    };

    expect(() => disposePostProcessingComposer(composer)).not.toThrow();
    expect(survivingPass.dispose).toHaveBeenCalledOnce();
    expect(composer.dispose).toHaveBeenCalledOnce();
  });

  it("releases every render target and material owned by Three's bloom pass", () => {
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(320, 180), 0.4, 0.2, 0.25);
    const targetSpies = [
      bloomPass.renderTargetBright,
      ...bloomPass.renderTargetsHorizontal,
      ...bloomPass.renderTargetsVertical
    ].map((target) => vi.spyOn(target, "dispose"));
    const highPassMaterialDispose = vi.spyOn(bloomPass.materialHighPassFilter, "dispose");
    const composer = { passes: [bloomPass], dispose: vi.fn() };

    disposePostProcessingComposer(composer);

    expect(targetSpies).toHaveLength(11);
    for (const dispose of targetSpies) expect(dispose).toHaveBeenCalledOnce();
    expect(highPassMaterialDispose).toHaveBeenCalledOnce();
    expect(composer.dispose).toHaveBeenCalledOnce();
  });
});
