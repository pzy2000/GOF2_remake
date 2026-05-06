import { describe, expect, it } from "vitest";
import manifest from "../public/assets/generated/manifest.json";
import { ships } from "../src/data/world";
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

  it("points generated system and planet assets at WebP files", () => {
    const assetManifest = manifest as AssetManifest;
    const projectAssetPaths = [
      ...Object.values(assetManifest.systemSkyboxes),
      ...Object.values(assetManifest.planetTextures)
    ];
    for (const assetPath of projectAssetPaths) {
      expect(assetPath).toMatch(/^\/assets\/generated\/.+\.webp$/);
    }
  });

  it("points every player ship to a generated GLB model", () => {
    const assetManifest = manifest as AssetManifest;
    for (const ship of ships) {
      expect(assetManifest.shipModels[ship.id]).toMatch(/^\/assets\/generated\/ships\/.+\.glb$/);
      expect(fallbackAssetManifest.shipModels[ship.id]).toBe(assetManifest.shipModels[ship.id]);
    }
  });
});
