# GOF2 by pzy

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Français](README.fr.md)

Browser-playable WebGL vertical slice for an original space combat/trading game. Fly a third-person ship, fight pirates, mine asteroids, collect cargo, dock at stations, trade, accept missions, and explore six frontier systems plus the dedicated PTD Home base with browser save/load.

## Screenshots

| View | Screenshot |
| --- | --- |
| Main Menu | ![Main menu presenting six frontier systems plus PTD Home, language selection, and save slots](docs/screenshots/main-menu.png) |
| Flight HUD | ![Third-person flight HUD with ship gauges, onboarding, story, economy, legal, and signal trackers](docs/screenshots/flight-hud.png) |
| Station Market | ![Station market and service interface for buying, selling, mission flow, and local economy status](docs/screenshots/station-market.png) |
| Galaxy Map | ![Galaxy map showing discovered systems, station routes, dispatch targets, story objectives, and Quiet Signals](docs/screenshots/galaxy-map.png) |
| Career Shipyard | ![Shipyard cards showing career hulls, traits, blueprint paths, and purchase requirements](docs/screenshots/shipyard-careers.png) |

## Run

```bash
npm install
npm run dev
npm run dev:full
npm run build
npm test
```

`npm run dev:full` starts the local authoritative economy server on `127.0.0.1:19777` and the Vite frontend together. Use plain `npm run dev` when you want the browser-only fallback economy.

You can also use the one-command launcher:

```bash
./start.sh
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
- `ships/*.glb` for the five generated player-ship silhouettes
- `asteroid-textures.webp`
- `faction-emblems.webp`
- `hud-overlay.webp`

No external copyrighted image or model packs are included. The flight scene uses per-system generated skyboxes as camera-locked inside-sphere backgrounds, with `skybox-panorama.webp` and `nebula-bg.webp` kept as fallbacks. Planets use generated equirectangular WebP surface textures on large Three.js spheres so each station sits beside its own visible world. Player ship models are local generated GLB files created by `scripts/generate-ship-models.mjs`; the runtime loads them through the asset manifest and falls back to procedural geometry if a model is unavailable. Stations, asteroids, projectiles, loot, and fallback ships use Three.js primitives. Background music files under `public/assets/music/` are CC0 tracks, with source and license metadata recorded in `public/assets/music/credits.json`.

## Jump Travel

Galaxy Map jumps now target discovered planet stations instead of only whole systems. The ship leaves the station, flies to the local jump gate, spools a wormhole transit, and exits near the selected station rather than auto-docking. Known systems reveal their primary planet by default; other planets appear as Unknown Beacon scan targets in local flight and unlock as jump destinations after the player flies into scan range. Manual flight input cancels autopilot during navigation phases; once the gate spool or wormhole begins, the transit completes.

## Trading And Contracts

Station markets now track saved stock, demand, and baseline recovery. Buying reduces local stock and pushes buy prices upward; selling increases stock and cools demand. The local REST + SSE economy backend globally ticks NPC miners, couriers, freighters, traders, and smugglers, then streams market events and visible NPC traffic back into the game. The Station Economy tab is also the Dispatch Board: legal supply runs and smuggling runs can be accepted, routed, tracked on the HUD/map, and completed back into market pressure.

Contracts use saved shipboard time. Courier, cargo, passenger, mining, bounty, escort, salvage, and dispatch missions have deadlines and reputation consequences. Passenger contracts reserve cargo capacity, cargo transport consumes player-provided goods on delivery, escort missions spawn a convoy ship in flight, and salvage missions spawn recoverable crates. Visible economy NPCs can be hailed, escorted, robbed, rescued, or reported, with backend-backed consequences for robberies, rescues, and reports when the local service is online.

The main story is Glass Wake Protocol, a 13-chapter chain about a Mirr probe, spoofed trade beacons, Ashen relay pirates, Unknown Drones, Echo Lock targets, and the Listener Scar. Stations include a Captain's Log tab that tracks chapter progress, current objectives, retryable failures, and unlocked story logs without adding separate story save state.

## Ships And Equipment

Equipment now uses a ship loadout plus inventory model. Primary, secondary, utility, defense, and engineering modules consume matching ship slots; installing draws one item from equipment inventory, unloading returns it, and the active weapons come from the installed loadout order. Blueprint Workshop fabrication consumes credits plus cargo materials and adds the result to inventory instead of auto-installing it. Career equipment routes support mining, smuggling, combat, and exploration builds.

Hidden stations revealed by deep Quiet Signals now carry exclusive endgame arsenals: Obsidian Foundry, Parallax Hermitage, Moth Vault, and Crownshade Observatory each sell one overpowered artifact module in tiny stock. These items cannot be crafted or looted; they are high-price build rewards for captains who finish the exploration chains.

The fleet has nine playable hulls across five generated GLB silhouettes: starter, hauler, miner, smuggler, fighter, gunship, and explorer careers now have distinct stats, slot layouts, traits, loadouts, and purchase requirements. Buying a new ship equips its stock loadout and stores the old hull with its installed equipment at the dedicated PTD Home station. Stored ships can be switched back for free only while docked at PTD Home.

## Saves, Data, And Audio

The browser save system uses three manual slots plus one auto/quick slot. Older single-slot v1 saves are migrated into the auto slot the first time the v2 save index is read. Slot metadata shows system, station/flight state, credits, game time, saved date, and version.

Game content is split into strongly typed data modules for commodities, ships/equipment, systems/stations, factions, and missions, with validation tests for duplicate ids and broken references.

Audio uses a hybrid runtime: SFX, warnings, and fallback music are synthesized with the Web Audio API, while authored CC0 background tracks are routed by current system, station archetype, and combat state. The asset manifest maps flight themes, station themes, and combat music to files in `public/assets/music/`; if an external track cannot play, the procedural music layer takes over. Settings include master, SFX, music, voice, and mute controls.

## Known Limitations

This is a vertical slice, not a full campaign. The authoritative economy backend is a local development service; if it is offline, the browser falls back to local market simulation so trading remains playable, while backend-backed NPC/economy events degrade gracefully. Commodity, equipment, and faction sprite sheets are sliced in the UI with CSS atlas positioning. Procedural SFX and fallback music are intentionally lightweight, while authored BGM coverage is limited to the current CC0 track set.
