import type { AssetManifest, MusicMode, PlayerState, RuntimeState, Screen, StationDefinition } from "../types/game";
import { distance } from "./math";

const COMBAT_MUSIC_THREAT_RANGE = 640;
const COMBAT_MUSIC_RECENT_DAMAGE_SECONDS = 5;

export interface MusicCue {
  id: string;
  mode: MusicMode;
  trackUrl?: string;
}

export function hasCombatMusicThreat(runtime: RuntimeState, player: PlayerState): boolean {
  const enemyProjectileActive = runtime.projectiles.some((projectile) => projectile.owner === "enemy" && projectile.life > 0);
  const recentlyDamaged = runtime.clock - player.lastDamageAt <= COMBAT_MUSIC_RECENT_DAMAGE_SECONDS;
  const closePirate = runtime.enemies.some(
    (ship) =>
      ship.role === "pirate" &&
      ship.hull > 0 &&
      ship.deathTimer === undefined &&
      distance(ship.position, player.position) <= COMBAT_MUSIC_THREAT_RANGE
  );
  return enemyProjectileActive || recentlyDamaged || closePirate;
}

export function resolveMusicCue({
  screen,
  currentSystemId,
  currentStation,
  runtime,
  player,
  assetManifest
}: {
  screen: Screen;
  currentSystemId: string;
  currentStation?: StationDefinition;
  runtime: RuntimeState;
  player: PlayerState;
  assetManifest: AssetManifest;
}): MusicCue {
  if (screen === "station" && currentStation) {
    return {
      id: `station:${currentStation.archetype}`,
      mode: "station",
      trackUrl: assetManifest.musicTracks.stationArchetypes[currentStation.archetype]
    };
  }

  if (screen === "flight") {
    if (hasCombatMusicThreat(runtime, player)) {
      return { id: "combat", mode: "combat", trackUrl: assetManifest.musicTracks.combat };
    }
    return {
      id: `system:${currentSystemId}`,
      mode: "safe",
      trackUrl: assetManifest.musicTracks.systems[currentSystemId]
    };
  }

  return { id: "silent", mode: "silent" };
}
