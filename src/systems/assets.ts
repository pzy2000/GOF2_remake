import type { AssetManifest } from "../types/game";

export const fallbackAssetManifest: AssetManifest = {
  keyArt: "/assets/generated/key-art.webp",
  commodityIcons: "/assets/generated/commodity-icons.webp",
  equipmentIcons: "/assets/generated/equipment-icons.webp",
  nebulaBg: "/assets/generated/nebula-bg.webp",
  skyboxPanorama: "/assets/generated/skybox-panorama.webp",
  asteroidTextures: "/assets/generated/asteroid-textures.webp",
  factionEmblems: "/assets/generated/faction-emblems.webp",
  hudOverlay: "/assets/generated/hud-overlay.webp"
};

export async function loadAssetManifest(): Promise<AssetManifest> {
  const response = await fetch("/assets/generated/manifest.json");
  if (!response.ok) return fallbackAssetManifest;
  return { ...fallbackAssetManifest, ...(await response.json()) };
}
