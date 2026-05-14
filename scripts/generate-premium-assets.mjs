import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.({ target: this });
    }).catch((error) => this.onerror?.(error));
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onloadend?.({ target: this });
    }).catch((error) => this.onerror?.(error));
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const generatedDir = path.join(rootDir, "public/assets/generated");
const enemyDir = path.join(generatedDir, "enemies");
const stationDir = path.join(generatedDir, "stations");
const vfxDir = path.join(generatedDir, "vfx");
const manifestPath = path.join(generatedDir, "manifest.json");

function material(name, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    metalness: options.metalness ?? 0.62,
    roughness: options.roughness ?? 0.28,
    emissive: options.emissive ?? "#000000",
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1
  });
}

function basicMaterial(name, color, options = {}) {
  return new THREE.MeshBasicMaterial({
    name,
    color,
    transparent: options.transparent ?? true,
    opacity: options.opacity ?? 0.65,
    side: options.side ?? THREE.DoubleSide,
    depthWrite: options.depthWrite ?? false,
    toneMapped: false
  });
}

function mesh(group, name, geometry, mat, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const item = new THREE.Mesh(geometry, mat);
  item.name = name;
  item.position.set(...position);
  item.rotation.set(...rotation);
  item.scale.set(...scale);
  item.castShadow = true;
  item.receiveShadow = true;
  group.add(item);
  return item;
}

function addBox(group, name, size, position, mat, rotation = [0, 0, 0]) {
  return mesh(group, name, new THREE.BoxGeometry(...size), mat, position, rotation);
}

function addCylinder(group, name, radiusTop, radiusBottom, length, position, mat, rotation = [Math.PI / 2, 0, 0], segments = 32) {
  return mesh(group, name, new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments), mat, position, rotation);
}

function addTorus(group, name, radius, tube, position, mat, rotation = [Math.PI / 2, 0, 0], segments = 96) {
  return mesh(group, name, new THREE.TorusGeometry(radius, tube, 10, segments), mat, position, rotation);
}

function addSphere(group, name, radius, position, mat, scale = [1, 1, 1], widthSegments = 32) {
  return mesh(group, name, new THREE.SphereGeometry(radius, widthSegments, Math.max(12, Math.round(widthSegments / 2))), mat, position, [0, 0, 0], scale);
}

function addGlassBlade(group, name, side, mat, z, length, width, y = 0) {
  const blade = addBox(group, name, [width, 1.2, length], [side * (12 + width * 0.2), y, z], mat, [0, side * 0.22, side * -0.38]);
  blade.castShadow = false;
  return blade;
}

function addRadialArms(group, mat, count, radius, length, width, z = 0) {
  for (let index = 0; index < count; index += 1) {
    const angle = index * ((Math.PI * 2) / count);
    const arm = new THREE.Group();
    arm.rotation.z = angle;
    arm.position.z = z;
    addBox(arm, `radial arm ${index}`, [length, width, width * 1.4], [radius + length / 2, 0, 0], mat);
    group.add(arm);
  }
}

function finish(group, scale = 1) {
  group.scale.setScalar(scale);
  group.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return group;
}

function createGlassEchoDrone() {
  const group = new THREE.Group();
  group.name = "Glass Echo Drone premium hull";
  const core = material("refractive cyan crystal shell", "#bffcff", { metalness: 0.32, roughness: 0.08, emissive: "#35e7ff", emissiveIntensity: 0.72, transparent: true, opacity: 0.88 });
  const dark = material("black mirrored drone ribs", "#111827", { metalness: 0.86, roughness: 0.18, emissive: "#08121f", emissiveIntensity: 0.22 });
  const magenta = basicMaterial("magenta echo lens bloom", "#ff9bd5", { opacity: 0.44 });
  const cyan = basicMaterial("cyan echo field bloom", "#9bffe8", { opacity: 0.36 });
  mesh(group, "faceted echo core", new THREE.OctahedronGeometry(20, 2), core, [0, 0, 0], [0.22, 0.14, 0], [1, 0.78, 1.36]);
  addTorus(group, "forward scanning halo", 31, 1.2, [0, 0, -4], magenta, [Math.PI / 2, 0, 0.14], 96);
  addTorus(group, "vertical phase halo", 24, 0.9, [0, 0, 0], cyan, [0, Math.PI / 2, 0.28], 80);
  for (const side of [-1, 1]) {
    addGlassBlade(group, `outer glass blade ${side}`, side, core, 0, 30, 6, 0);
    addBox(group, `black rib fin ${side}`, [4, 14, 30], [side * 18, -1, 4], dark, [0.08, side * 0.18, side * 0.25]);
    addCylinder(group, `ion needle ${side}`, 0.7, 1.1, 34, [side * 8, -1, -27], dark, [Math.PI / 2, side * 0.1, 0], 12);
    addSphere(group, `orbiting light node ${side}`, 3.2, [side * 28, 9, 9], side < 0 ? magenta : cyan, [1, 1, 1], 16);
  }
  addBox(group, "black dorsal data spine", [5, 3, 42], [0, 8, 1], dark, [0.04, 0, 0]);
  addBox(group, "ventral phase keel", [4, 5, 30], [0, -10, 2], dark, [-0.08, 0, 0]);
  return finish(group, 1);
}

function createGlassEchoPrime() {
  const group = new THREE.Group();
  group.name = "Glass Echo Prime premium boss hull";
  const core = material("prime pink glass armor", "#ffc2de", { metalness: 0.38, roughness: 0.07, emissive: "#ff2f87", emissiveIntensity: 0.86, transparent: true, opacity: 0.9 });
  const gold = material("fractured gold stabilizer", "#ffd166", { metalness: 0.74, roughness: 0.2, emissive: "#7c3d00", emissiveIntensity: 0.3 });
  const dark = material("obsidian echo frame", "#0f1117", { metalness: 0.88, roughness: 0.16, emissive: "#2a0719", emissiveIntensity: 0.28 });
  const magenta = basicMaterial("boss magenta singular halo", "#ff4e9a", { opacity: 0.46 });
  const white = basicMaterial("boss white core bloom", "#fff7f9", { opacity: 0.38 });
  mesh(group, "large shard core", new THREE.IcosahedronGeometry(30, 2), core, [0, 0, 0], [0.32, -0.2, 0.18], [1, 0.8, 1.48]);
  addSphere(group, "internal white reactor", 14, [0, 0, -1], white, [1, 0.7, 1.1], 24);
  addTorus(group, "wide boss halo", 56, 2.1, [0, 0, 0], magenta, [Math.PI / 2, 0, 0.1], 128);
  addTorus(group, "canted gold prison ring", 43, 1.5, [0, 0, 0], gold, [0.6, Math.PI / 2, -0.3], 112);
  addTorus(group, "rear unstable phase ring", 68, 1, [0, 0, 9], white, [Math.PI / 2, 0.35, 0.5], 128);
  for (const side of [-1, 1]) {
    addBox(group, `heavy blade wing ${side}`, [11, 3, 58], [side * 28, -2, 0], core, [0, side * 0.28, side * -0.32]);
    addBox(group, `gold arrestor spar ${side}`, [6, 5, 60], [side * 42, 2, 4], gold, [0.12, side * 0.16, side * 0.22]);
    addCylinder(group, `boss burst lance ${side}`, 1.4, 2.2, 48, [side * 14, -1, -40], dark, [Math.PI / 2, side * 0.08, 0], 16);
    addSphere(group, `flanking reactor bead ${side}`, 5.5, [side * 46, 15, 18], side < 0 ? magenta : white, [1, 1, 1], 18);
  }
  addBox(group, "black crown spine", [8, 6, 62], [0, 16, 4], dark, [0.12, 0, 0]);
  addBox(group, "lower split keel", [7, 9, 48], [0, -18, 7], dark, [-0.1, 0, 0]);
  return finish(group, 1);
}

function createMirrLattice() {
  const group = new THREE.Group();
  group.name = "Mirr Lattice premium station";
  const hull = material("mirr satin hull panels", "#7a8fa6", { metalness: 0.72, roughness: 0.24, emissive: "#0e2432", emissiveIntensity: 0.18 });
  const glass = material("mirr optical glass laboratories", "#9bffe8", { metalness: 0.18, roughness: 0.08, emissive: "#3affd7", emissiveIntensity: 0.44, transparent: true, opacity: 0.74 });
  const violet = basicMaterial("mirr violet survey bloom", "#ff9bd5", { opacity: 0.3 });
  const cyan = basicMaterial("mirr cyan traffic bloom", "#9bffe8", { opacity: 0.28 });
  addCylinder(group, "central research drum", 34, 48, 64, [0, 0, 0], hull, [0, 0, 0], 72);
  addTorus(group, "large lattice dock ring", 104, 4.5, [0, 0, 0], hull, [Math.PI / 2, 0, 0], 144);
  addTorus(group, "inner optical relay ring", 62, 2, [0, 0, 0], glass, [Math.PI / 2, 0.15, 0.28], 128);
  addRadialArms(group, hull, 8, 52, 78, 7, 0);
  for (let index = 0; index < 6; index += 1) {
    const angle = index * ((Math.PI * 2) / 6);
    const radius = 128;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const pod = new THREE.Group();
    pod.position.set(x, y, (index % 2 === 0 ? 1 : -1) * 24);
    pod.rotation.z = angle;
    addBox(pod, `laboratory strut ${index}`, [44, 8, 18], [0, 0, 0], hull);
    addSphere(pod, `glass lab bead ${index}`, 13, [26, 0, 0], glass, [1.35, 0.8, 1], 24);
    group.add(pod);
  }
  addTorus(group, "violet beacon orbit", 148, 1.1, [0, 0, 0], violet, [Math.PI / 2, 0, 0.7], 144);
  addTorus(group, "cyan approach lane", 176, 0.8, [0, 0, 0], cyan, [Math.PI / 2, 0.42, 0], 144);
  addBox(group, "dorsal mirror bridge", [28, 96, 16], [0, 0, 70], glass, [0, 0, 0.08]);
  return finish(group, 1);
}

function createCelestVault() {
  const group = new THREE.Group();
  group.name = "Celest Vault premium station";
  const hull = material("celest ivory armor", "#a6a18a", { metalness: 0.66, roughness: 0.28, emissive: "#33280d", emissiveIntensity: 0.16 });
  const gold = material("celest gold docking crown", "#ffd166", { metalness: 0.76, roughness: 0.2, emissive: "#7a4a0b", emissiveIntensity: 0.34 });
  const blue = material("celest white blue glass", "#dff8ff", { metalness: 0.2, roughness: 0.1, emissive: "#a7f3ff", emissiveIntensity: 0.42, transparent: true, opacity: 0.82 });
  const glow = basicMaterial("celest vault bloom", "#fff7d6", { opacity: 0.36 });
  addCylinder(group, "vault central cylinder", 52, 52, 80, [0, 0, 0], hull, [0, 0, 0], 88);
  addTorus(group, "primary golden traffic ring", 124, 5.2, [0, 0, 0], gold, [Math.PI / 2, 0, 0], 160);
  addTorus(group, "secondary canted vault halo", 88, 3, [0, 0, 0], blue, [0.52, Math.PI / 2, 0.18], 144);
  addRadialArms(group, gold, 10, 54, 86, 8, 0);
  for (let index = 0; index < 5; index += 1) {
    const angle = index * ((Math.PI * 2) / 5) + 0.2;
    const tower = new THREE.Group();
    tower.position.set(Math.cos(angle) * 150, Math.sin(angle) * 150, index % 2 === 0 ? 22 : -22);
    tower.rotation.z = angle;
    addBox(tower, `vault terrace ${index}`, [64, 14, 22], [0, 0, 0], hull);
    addBox(tower, `gold trade fin ${index}`, [8, 52, 10], [20, 0, 18], gold, [0.1, 0, 0.14]);
    addSphere(tower, `blue embassy dome ${index}`, 12, [-28, 0, 14], blue, [1, 0.6, 1], 24);
    group.add(tower);
  }
  addBox(group, "vault dorsal market spine", [38, 130, 18], [0, 0, 78], gold, [0, 0, 0.05]);
  addBox(group, "vault lower drydock rail", [24, 112, 16], [0, 0, -78], hull, [0, 0, -0.08]);
  addTorus(group, "warm public concourse glow", 158, 1.2, [0, 0, 0], glow, [Math.PI / 2, 0.18, 0.44], 160);
  return finish(group, 1);
}

async function exportGlb(group, filePath) {
  group.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  const arrayBuffer = await new Promise((resolve, reject) => {
    exporter.parse(group, resolve, reject, { binary: true, trs: false, onlyVisible: true });
  });
  await writeFile(filePath, Buffer.from(arrayBuffer));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePngBuffer(width, height, rgba) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rows[y * (width * 4 + 1)] = 0;
    rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([header, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(rows, { level: 9 })), pngChunk("IEND", Buffer.alloc(0))]);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function sampleExplosionColor(distance, angle, progress, spoke) {
  const fire = clamp01(1 - distance * (1.35 + progress * 0.5));
  const core = Math.pow(clamp01(1 - distance * 2.8), 2.2);
  const ring = Math.pow(clamp01(1 - Math.abs(distance - (0.28 + progress * 0.24)) * 9), 2);
  const flare = Math.pow(clamp01(spoke - distance * 0.45), 2);
  const alpha = clamp01(core + fire * (0.82 - progress * 0.36) + ring * 0.72 + flare * 0.42);
  const heat = clamp01(core * 1.4 + fire + ring * 0.7 + Math.sin(angle * 6 + progress * 9) * 0.05);
  return {
    r: Math.round(255 * clamp01(0.72 + heat * 0.32)),
    g: Math.round(255 * clamp01(core * 0.95 + fire * 0.56 + ring * 0.68)),
    b: Math.round(255 * clamp01(core * 0.76 + ring * 0.16 + progress * 0.08)),
    a: Math.round(255 * alpha)
  };
}

async function writeExplosionFrame(frame, frameCount) {
  const size = 256;
  const progress = frame / (frameCount - 1);
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5 - size / 2) / (size / 2);
      const ny = (y + 0.5 - size / 2) / (size / 2);
      const angle = Math.atan2(ny, nx);
      const distance = Math.sqrt(nx * nx + ny * ny);
      const noise = Math.sin(angle * 9 + progress * 11) * 0.09 + Math.sin(angle * 17 - progress * 6) * 0.05;
      const spoke = clamp01(1 - Math.abs(Math.sin(angle * 5 + progress * 7)) * 0.86);
      const color = sampleExplosionColor(distance + noise, angle, progress, spoke);
      const offset = (y * size + x) * 4;
      rgba[offset] = color.r;
      rgba[offset + 1] = color.g;
      rgba[offset + 2] = color.b;
      rgba[offset + 3] = distance > 1.08 ? 0 : color.a;
    }
  }
  const fileName = `explosion-burst-${String(frame).padStart(2, "0")}.png`;
  await writeFile(path.join(vfxDir, fileName), writePngBuffer(size, size, rgba));
  return `/assets/generated/vfx/${fileName}`;
}

async function updateManifest(vfxFrames) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const postFxDefaults = {
    bloomStrength: 0.22,
    bloomRadius: 0.18,
    bloomThreshold: 0.3,
    dofFocus: 0,
    dofAperture: 0,
    dofMaxBlur: 0,
    sharpenStrength: 0.18
  };
  const postFxOverrides = {
    "mirr-vale": { bloomStrength: 0.34, bloomRadius: 0.24, bloomThreshold: 0.22, sharpenStrength: 0.2 },
    "celest-gate": { bloomStrength: 0.3, bloomRadius: 0.22, bloomThreshold: 0.24, sharpenStrength: 0.18 },
    "ashen-drift": { bloomStrength: 0.28, bloomRadius: 0.22, bloomThreshold: 0.24, sharpenStrength: 0.2 }
  };
  manifest.scenePostProfiles = Object.fromEntries(
    Object.entries(manifest.scenePostProfiles ?? {}).map(([key, profile]) => [
      key,
      {
        ...profile,
        ...postFxDefaults,
        ...(postFxOverrides[key] ?? {})
      }
    ])
  );
  manifest.enemyShipModels = {
    ...(manifest.enemyShipModels ?? {}),
    "glass-echo-drone": "/assets/generated/enemies/glass-echo-drone.glb",
    "glass-echo-prime": "/assets/generated/enemies/glass-echo-prime.glb"
  };
  manifest.stationModels = {
    ...(manifest.stationModels ?? {}),
    "mirr-lattice": "/assets/generated/stations/mirr-lattice.glb",
    "celest-vault": "/assets/generated/stations/celest-vault.glb"
  };
  manifest.vfxTextureSequences = {
    ...(manifest.vfxTextureSequences ?? {}),
    "cinematic-burst": vfxFrames
  };
  manifest.assetCredits = [
    ...(manifest.assetCredits ?? []).filter((credit) => credit.assetPath !== "/assets/generated/enemies/glass-echo-drone.glb" && credit.assetPath !== "/assets/generated/stations/mirr-lattice.glb" && credit.assetPath !== "/assets/generated/vfx/explosion-burst-00.png"),
    {
      title: "Glass Echo premium enemy GLB set",
      author: "GOF2 procedural asset generator",
      sourceUrl: "scripts/generate-premium-assets.mjs",
      license: "Original project asset",
      assetPath: "/assets/generated/enemies/glass-echo-drone.glb"
    },
    {
      title: "Mirr Lattice and Celest Vault premium station GLB set",
      author: "GOF2 procedural asset generator",
      sourceUrl: "scripts/generate-premium-assets.mjs",
      license: "Original project asset",
      assetPath: "/assets/generated/stations/mirr-lattice.glb"
    },
    {
      title: "Cinematic burst explosion texture sequence",
      author: "GOF2 procedural asset generator",
      sourceUrl: "scripts/generate-premium-assets.mjs",
      license: "Original project asset",
      assetPath: "/assets/generated/vfx/explosion-burst-00.png"
    }
  ];
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

await mkdir(enemyDir, { recursive: true });
await mkdir(stationDir, { recursive: true });
await mkdir(vfxDir, { recursive: true });

await exportGlb(createGlassEchoDrone(), path.join(enemyDir, "glass-echo-drone.glb"));
await exportGlb(createGlassEchoPrime(), path.join(enemyDir, "glass-echo-prime.glb"));
await exportGlb(createMirrLattice(), path.join(stationDir, "mirr-lattice.glb"));
await exportGlb(createCelestVault(), path.join(stationDir, "celest-vault.glb"));

const frameCount = 8;
const vfxFrames = [];
for (let frame = 0; frame < frameCount; frame += 1) {
  vfxFrames.push(await writeExplosionFrame(frame, frameCount));
}
await updateManifest(vfxFrames);

console.log("generated premium GLB enemies, stations, and explosion texture sequence");
