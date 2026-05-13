import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import manifest from "../public/assets/generated/manifest.json";
import { dialogueSpeakers, ships, systems } from "../src/data/world";
import { fallbackAssetManifest, resolveAssetManifest, resolvePublicAssetPath } from "../src/systems/assets";
import type { AssetManifest } from "../src/types/game";

const stationArchetypes = ["Trade Hub", "Mining Station", "Research Station", "Military Outpost", "Frontier Port", "Pirate Black Market"] as const;

function expectProjectAssetExists(assetPath: string) {
  expect(existsSync(resolve(process.cwd(), "public", assetPath.replace(/^\//, "")))).toBe(true);
}

function readWebpDimensions(assetPath: string) {
  const bytes = readFileSync(resolve(process.cwd(), "public", assetPath.replace(/^\//, "")));
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3)
    };
  }
  if (bytes.toString("ascii", 12, 15) === "VP8") {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff
    };
  }
  throw new Error(`Unsupported WebP container for ${assetPath}`);
}

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
    expect(pagesManifest.npcShipTextures.freighter).toBe("/GOF2_remake/assets/generated/npc-freighter-hull.webp");
    expect(pagesManifest.speakerPortraits["helion-handler"]).toBe("/GOF2_remake/assets/generated/portraits/helion-handler.webp");
    expect(pagesManifest.starSprites["helion-reach"]).toBe("/GOF2_remake/assets/generated/stars/star-helion-reach.png");
    expect(pagesManifest.musicTracks.systems["helion-reach"]).toBe("/GOF2_remake/assets/music/magic-space.mp3");
    expect(pagesManifest.musicTracks.combat).toBe("/GOF2_remake/assets/music/infestation-control-room.mp3");
    expect(Object.values(pagesManifest.planetTextures).every((assetPath) => assetPath.startsWith("/GOF2_remake/assets/generated/"))).toBe(true);
    expect(Object.values(pagesManifest.starSprites).every((assetPath) => assetPath.startsWith("/GOF2_remake/assets/generated/stars/"))).toBe(true);
  });

  it("maps the generated manifest to the skybox asset", () => {
    const assetManifest = manifest as AssetManifest;
    expect(assetManifest.skyboxPanorama).toBe(fallbackAssetManifest.skyboxPanorama);
  });

  it("points generated system, star, and planet assets at local image files", () => {
    const assetManifest = manifest as AssetManifest;
    const projectAssetPaths = [
      ...Object.values(assetManifest.systemSkyboxes),
      ...Object.values(assetManifest.starSprites),
      ...Object.values(assetManifest.planetTextures)
    ];
    for (const assetPath of projectAssetPaths) {
      expect(assetPath).toMatch(/^\/assets\/generated\/.+\.(webp|png)$/);
      expectProjectAssetExists(assetPath);
    }
  });

  it("maps every system to a generated local star sprite", () => {
    const assetManifest = manifest as AssetManifest;
    for (const system of systems) {
      expect(system.star.assetKey).toBe(system.id);
      expect(assetManifest.starSprites[system.star.assetKey]).toMatch(/^\/assets\/generated\/stars\/star-.+\.png$/);
      expect(fallbackAssetManifest.starSprites[system.star.assetKey]).toBe(assetManifest.starSprites[system.star.assetKey]);
      expectProjectAssetExists(assetManifest.starSprites[system.star.assetKey]);
    }
  });

  it("keeps flight skyboxes at the expected panorama aspect ratio", () => {
    const assetManifest = manifest as AssetManifest;
    for (const assetPath of [assetManifest.skyboxPanorama, ...Object.values(assetManifest.systemSkyboxes)]) {
      const dimensions = readWebpDimensions(assetPath);
      expect(dimensions.width / dimensions.height).toBe(2);
    }
  });

  it("points every player ship to a generated GLB model", () => {
    const assetManifest = manifest as AssetManifest;
    const modelPaths = ships.map((ship) => assetManifest.shipModels[ship.id]);
    for (const ship of ships) {
      expect(assetManifest.shipModels[ship.id]).toMatch(/^\/assets\/generated\/ships\/.+\.glb$/);
      expect(fallbackAssetManifest.shipModels[ship.id]).toBe(assetManifest.shipModels[ship.id]);
      expectProjectAssetExists(assetManifest.shipModels[ship.id]);
    }
    expect(new Set(modelPaths).size).toBe(ships.length);
  });

  it("defines material and hardpoint metadata for every player ship", () => {
    const assetManifest = manifest as AssetManifest;
    for (const ship of ships) {
      expect(assetManifest.shipMaterialProfiles[ship.id]).toMatchObject({
        baseColor: expect.stringMatching(/^#/),
        trimColor: expect.stringMatching(/^#/),
        emissiveColor: expect.stringMatching(/^#/)
      });
      expect(assetManifest.shipAttachmentProfiles[ship.id].engineHardpoints.length).toBeGreaterThan(0);
      expect(fallbackAssetManifest.shipAttachmentProfiles[ship.id].engineHardpoints.length).toBeGreaterThan(0);
    }
    expect(assetManifest.vfxCues.explosion).toBe("cinematic-burst");
  });

  it("points NPC ship textures to generated local assets", () => {
    const assetManifest = manifest as AssetManifest;
    expect(assetManifest.npcShipTextures.freighter).toBe("/assets/generated/npc-freighter-hull.webp");
    expect(fallbackAssetManifest.npcShipTextures.freighter).toBe(assetManifest.npcShipTextures.freighter);
    expectProjectAssetExists(assetManifest.npcShipTextures.freighter);
  });

  it("points every dialogue speaker to a generated WebP portrait", () => {
    const assetManifest = manifest as AssetManifest;
    for (const speaker of dialogueSpeakers) {
      expect(assetManifest.speakerPortraits[speaker.id]).toMatch(/^\/assets\/generated\/portraits\/.+\.webp$/);
      expect(fallbackAssetManifest.speakerPortraits[speaker.id]).toBe(assetManifest.speakerPortraits[speaker.id]);
    }
  });

  it("points story cinematics to generated local WebP assets", () => {
    const assetManifest = manifest as AssetManifest;
    expect(assetManifest.storyCinematics["glass-wake-intro"]).toBe("/assets/generated/story-glass-wake-intro.webp");
    expect(assetManifest.storyCinematics["glass-echo-reversal"]).toBe("/assets/generated/story-glass-echo-reversal.webp");
    for (const assetPath of Object.values(assetManifest.storyCinematics)) {
      expect(assetPath).toMatch(/^\/assets\/generated\/story-.+\.webp$/);
      expect(fallbackAssetManifest.storyCinematics).toHaveProperty(
        Object.entries(assetManifest.storyCinematics).find(([, value]) => value === assetPath)?.[0] ?? ""
      );
      expectProjectAssetExists(assetPath);
    }
  });

  it("maps every system and station archetype to a local music track", () => {
    const assetManifest = manifest as AssetManifest;
    for (const system of systems) {
      expect(assetManifest.musicTracks.systems[system.id]).toMatch(/^\/assets\/music\/.+\.(mp3|ogg)$/);
      expect(fallbackAssetManifest.musicTracks.systems[system.id]).toBe(assetManifest.musicTracks.systems[system.id]);
    }
    for (const archetype of stationArchetypes) {
      expect(assetManifest.musicTracks.stationArchetypes[archetype]).toMatch(/^\/assets\/music\/.+\.(mp3|ogg)$/);
      expect(fallbackAssetManifest.musicTracks.stationArchetypes[archetype]).toBe(assetManifest.musicTracks.stationArchetypes[archetype]);
    }
    expect(assetManifest.musicTracks.combat).toMatch(/^\/assets\/music\/.+\.(mp3|ogg)$/);
    expect(fallbackAssetManifest.musicTracks.combat).toBe(assetManifest.musicTracks.combat);
  });
});
