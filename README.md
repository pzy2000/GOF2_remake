# GOF2 by pzy

Browser-playable WebGL vertical slice for an original space combat/trading game. Fly a third-person ship, fight pirates, mine asteroids, collect cargo, dock at stations, trade, accept missions, jump between systems, and save/load through browser storage.

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
- `asteroid-textures.webp`
- `faction-emblems.webp`
- `hud-overlay.webp`

No external copyrighted image packs are included. The flight scene uses `skybox-panorama.webp` as a camera-locked inside-sphere skybox so the nebula reads as infinitely far away while the older `nebula-bg.webp` remains available for station/menu fallback art. The game uses Three.js primitives and procedural geometry for ships, stations, asteroids, projectiles, and loot.

## Jump Travel

Galaxy Map jumps now launch an autopilot route instead of instantly changing systems. The ship leaves the station, flies to the local jump gate, spools a wormhole transit, arrives at the target system, and auto-docks at that system's primary station. Manual flight input cancels autopilot during navigation phases; once the gate spool or wormhole begins, the transit completes.

## Trading And Contracts

Station markets now track saved stock, demand, and baseline recovery. Buying reduces local stock and pushes buy prices upward; selling increases stock and cools demand. Lounge rumors list live profitable trade routes, including ore exports, frontier supply runs, and high-risk restricted goods lanes.

Contracts use saved shipboard time. Courier, cargo, passenger, mining, bounty, escort, and salvage missions have deadlines and reputation penalties. Passenger contracts reserve cargo capacity, cargo transport consumes player-provided goods on delivery, escort missions spawn a convoy ship in flight, and salvage missions spawn recoverable crates.

## Saves, Data, And Audio

The browser save system uses three manual slots plus one auto/quick slot. Older single-slot v1 saves are migrated into the auto slot the first time the v2 save index is read. Slot metadata shows system, station/flight state, credits, game time, saved date, and version.

Game content is split into strongly typed data modules for commodities, ships/equipment, systems/stations, factions, and missions, with validation tests for duplicate ids and broken references.

Audio is generated at runtime with the Web Audio API. No audio files are required. Settings include master, SFX, music, and mute controls, while flight/market interactions trigger synthesized lasers, missiles, mining, explosions, UI clicks, warnings, and simple safe/combat/station music layers.

## Known Limitations

This is a vertical slice, not a full campaign. Dynamic markets react to player trades and drift back toward station baselines, but NPC trade fleets do not globally simulate supply chains yet. Escort routes are currently same-system contracts so they stay independent from jump-gate autopilot. Commodity, equipment, and faction sprite sheets are sliced in the UI with CSS atlas positioning. Procedural audio is intentionally lightweight and can later be replaced or layered with authored assets.
