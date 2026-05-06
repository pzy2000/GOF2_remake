import { describe, expect, it } from "vitest";
import manifest from "../public/assets/generated/manifest.json";
import { ships } from "../src/data/world";
import { fallbackAssetManifest, resolveAssetManifest, resolvePublicAssetPath } from "../src/systems/assets";
import type { AssetManifest } from "../src/types/game";

describe("asset manifest", () => {
  it("provides a project-local skybox panorama fallback", () => {
    expect(fallbackAssetManifest.skyboxPanorama).toBe("/assets/generated/skybox-panorama.webp");
  });

  it("resolves public asset paths under a GitHub Pages base path", () => {
    expect(resolvePublicAssetPath("/assets/generated/key-art.webp", "/GOF2_remake/")).toBe("/GOF2_remake/assets/generated/key-art.webp");
    expect(resolvePublicAssetPath("assets/generated/manifest.json", "/GOF2_remake/")).toBe("/GOF2_remake/assets/generated/manifest.json");
  });

  it("normalizes manifest asset paths under a GitHub Pages base path", () => {
    const pagesManifest = resolveAssetManifest(manifest as AssetManifest, "/GOF2_remake/");

    expect(pagesManifest.keyArt).toBe("/GOF2_remake/assets/generated/key-art.webp");
    expect(pagesManifest.skyboxPanorama).toBe("/GOF2_remake/assets/generated/skybox-panorama.webp");
    expect(pagesManifest.shipModels["sparrow-mk1"]).toBe("/GOF2_remake/assets/generated/ships/sparrow-mk1.glb");
    expect(Object.values(pagesManifest.planetTextures).every((assetPath) => assetPath.startsWith("/GOF2_remake/assets/generated/"))).toBe(true);
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
