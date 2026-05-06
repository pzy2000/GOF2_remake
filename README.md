# GOF2 by pzy

Browser-playable WebGL vertical slice for an original space combat/trading game. Fly a third-person ship, fight pirates, mine asteroids, collect cargo, dock at stations, trade, accept missions, jump between systems, and save/load through browser storage.

## Screenshots

| Main Menu | Flight HUD |
| --- | --- |
| ![Main menu with key art, new game, settings, credits, and save slots](docs/screenshots/main-menu.png) | ![Third-person flight HUD with ship gauges, pirate target lock, navigation hint, cargo, and comms](docs/screenshots/flight-hud.png) |
| Station Market | Galaxy Map |
| ![Station market interface for buying and selling commodities at Helion Prime Exchange](docs/screenshots/station-market.png) | ![Galaxy map showing discovered systems, jump routes, station destinations, and unknown signals](docs/screenshots/galaxy-map.png) |

## Run

```bash
npm install
npm run dev
npm run build
npm test
```

## Controls

- W/S: throttle up/down
- A/D: roll
- Mouse movement: pitch/yaw after clicking the flight view
- Left mouse: fire pulse laser, or mine when close to an asteroid
- Right mouse or Space: fire homing missile
- Shift: afterburner
- E: dock, interact, collect loot
- Tab: cycle pirate target
- M: galaxy map
- C: camera toggle
- Esc: pause

## Assets

Original raster assets were generated with Codex built-in `$imagegen`, converted to WebP, and copied into `public/assets/generated/`. The app loads them through `public/assets/generated/manifest.json`.

Generated project assets:

- `key-art.webp`
- `commodity-icons.webp`
- `equipment-icons.webp`
- `nebula-bg.webp`
- `skybox-panorama.webp`
- `skybox-*.webp` per star system
- `planet-*.webp` per visitable planet
- `ships/*.glb` for the five player ships
- `asteroid-textures.webp`
- `faction-emblems.webp`
- `hud-overlay.webp`

No external copyrighted image or model packs are included. The flight scene uses per-system generated skyboxes as camera-locked inside-sphere backgrounds, with `skybox-panorama.webp` and `nebula-bg.webp` kept as fallbacks. Planets use generated equirectangular WebP surface textures on large Three.js spheres so each station sits beside its own visible world. Player ship models are local generated GLB files created by `scripts/generate-ship-models.mjs`; the runtime loads them through the asset manifest and falls back to procedural geometry if a model is unavailable. Stations, asteroids, projectiles, loot, and fallback ships use Three.js primitives.

## Jump Travel

Galaxy Map jumps now target discovered planet stations instead of only whole systems. The ship leaves the station, flies to the local jump gate, spools a wormhole transit, and exits near the selected station rather than auto-docking. Known systems reveal their primary planet by default; other planets appear as Unknown Beacon scan targets in local flight and unlock as jump destinations after the player flies into scan range. Manual flight input cancels autopilot during navigation phases; once the gate spool or wormhole begins, the transit completes.

## Trading And Contracts

Station markets now track saved stock, demand, and baseline recovery. Buying reduces local stock and pushes buy prices upward; selling increases stock and cools demand. Lounge rumors list live profitable trade routes, including ore exports, frontier supply runs, and high-risk restricted goods lanes.

Contracts use saved shipboard time. Courier, cargo, passenger, mining, bounty, escort, and salvage missions have deadlines and reputation penalties. Passenger contracts reserve cargo capacity, cargo transport consumes player-provided goods on delivery, escort missions spawn a convoy ship in flight, and salvage missions spawn recoverable crates.

The main story chapter is Glass Wake Protocol, an eight-step mission chain about a Mirr probe, spoofed trade beacons, Ashen relay pirates, and a quiet drone carrier near Celest Gate. Stations include a Captain's Log tab that tracks chapter progress, current objectives, retryable failures, and unlocked story logs without adding separate story save state.

## Ships And Equipment

Equipment now uses a ship loadout plus inventory model. Primary, secondary, utility, defense, and engineering modules consume matching ship slots; installing draws one item from equipment inventory, unloading returns it, and the active weapons come from the installed loadout order. Blueprint Workshop fabrication consumes credits plus cargo materials and adds the result to inventory instead of auto-installing it.

The fleet has five distinct GLB silhouettes: Sparrow MK-I scout, Mule LX hauler, Raptor V fighter, Bastion-7 gunship, and Horizon Ark explorer. Buying a new ship equips its stock loadout and stores the old hull with its installed equipment at the dedicated PTD Home station. Stored ships can be switched back for free only while docked at PTD Home.

## Saves, Data, And Audio

The browser save system uses three manual slots plus one auto/quick slot. Older single-slot v1 saves are migrated into the auto slot the first time the v2 save index is read. Slot metadata shows system, station/flight state, credits, game time, saved date, and version.

Game content is split into strongly typed data modules for commodities, ships/equipment, systems/stations, factions, and missions, with validation tests for duplicate ids and broken references.

Audio is generated at runtime with the Web Audio API. No audio files are required. Settings include master, SFX, music, and mute controls, while flight/market interactions trigger synthesized lasers, missiles, mining, explosions, UI clicks, warnings, and simple safe/combat/station music layers.

## Known Limitations

This is a vertical slice, not a full campaign. Dynamic markets react to player trades and drift back toward station baselines, but NPC trade fleets do not globally simulate supply chains yet. Escort routes are currently same-system contracts so they stay independent from jump-gate autopilot. Commodity, equipment, and faction sprite sheets are sliced in the UI with CSS atlas positioning. Procedural audio is intentionally lightweight and can later be replaced or layered with authored assets.
