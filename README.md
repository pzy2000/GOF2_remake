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
- `asteroid-textures.webp`
- `faction-emblems.webp`
- `hud-overlay.webp`

No external copyrighted image packs are included. The game uses Three.js primitives and procedural geometry for ships, stations, asteroids, projectiles, and loot.

## Known Limitations

This is a vertical slice, not a full campaign. Mission archetypes beyond courier, mining, and bounty are represented on the board but not fully simulated. Commodity/equipment sprite sheets are displayed as category thumbnails rather than individually sliced UI icons. Audio is represented by UI feedback and is ready for a fuller browser audio layer later.
