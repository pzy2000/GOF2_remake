import { describe, expect, it } from "vitest";
import manifest from "../public/assets/generated/manifest.json";
import { fallbackAssetManifest } from "../src/systems/assets";
import type { AssetManifest } from "../src/types/game";

describe("asset manifest", () => {
  it("provides a project-local skybox panorama fallback", () => {
    expect(fallbackAssetManifest.skyboxPanorama).toBe("/assets/generated/skybox-panorama.webp");
  });

  it("maps the generated manifest to the skybox asset", () => {
    const assetManifest = manifest as AssetManifest;
    expect(assetManifest.skyboxPanorama).toBe(fallbackAssetManifest.skyboxPanorama);
  });
});
