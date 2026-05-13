import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// Local procedural fleet. No external model assets are embedded.

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.({ target: this });
    }).catch((error) => {
      this.onerror?.(error);
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      const base64 = Buffer.from(buffer).toString("base64");
      this.result = `data:${blob.type || "application/octet-stream"};base64,${base64}`;
      this.onloadend?.({ target: this });
    }).catch((error) => {
      this.onerror?.(error);
    });
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../public/assets/generated/ships");

function material(name, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    metalness: options.metalness ?? 0.64,
    roughness: options.roughness ?? 0.34,
    emissive: options.emissive ?? "#000000",
    emissiveIntensity: options.emissiveIntensity ?? 0,
    flatShading: options.flatShading ?? false
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

function addCone(group, name, radius, length, segments, position, mat, rotation = [-Math.PI / 2, 0, 0]) {
  return mesh(group, name, new THREE.ConeGeometry(radius, length, segments), mat, position, rotation);
}

function addCylinder(group, name, radiusTop, radiusBottom, length, position, mat, rotation = [Math.PI / 2, 0, 0], segments = 24) {
  return mesh(group, name, new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments), mat, position, rotation);
}

function addSphere(group, name, radius, position, mat, scale = [1, 1, 1]) {
  return mesh(group, name, new THREE.SphereGeometry(radius, 24, 14), mat, position, [0, 0, 0], scale);
}

function addLightPanel(group, name, size, position, color, rotation = [0, 0, 0], intensity = 0.5) {
  const glow = material(`${name} glow`, color, { metalness: 0.08, roughness: 0.18, emissive: color, emissiveIntensity: intensity });
  return addBox(group, name, size, position, glow, rotation);
}

function mirrored(callback) {
  [-1, 1].forEach((side) => callback(side));
}

function addPanelRows(group, mat, zValues, width, y, name) {
  zValues.forEach((z, index) => {
    addBox(group, `${name} dorsal plate ${index}`, [width - index * 1.2, 0.8, 3.2], [0, y, z], mat);
  });
}

function addAntenna(group, mat, origin, count = 2) {
  for (let index = 0; index < count; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    addCylinder(group, `thin comm mast ${index}`, 0.35, 0.55, 18 - index * 3, [origin[0] + side * (3 + index), origin[1] + index * 1.5, origin[2]], mat, [0.18, 0, side * 0.18], 8);
    addSphere(group, `comm node ${index}`, 1.1, [origin[0] + side * (5 + index), origin[1] + 8 + index, origin[2] - 4], mat, [1, 1, 1]);
  }
}

function createPalette(base, trim, dark, glass, glow = "#6ee7ff") {
  return {
    base: material("layered primary hull", base, { metalness: 0.58, roughness: 0.36 }),
    armor: material("matte armor plates", trim, { metalness: 0.5, roughness: 0.42, emissive: trim, emissiveIntensity: 0.05 }),
    dark: material("dark engine graphite", dark, { metalness: 0.84, roughness: 0.22, emissive: "#050a12", emissiveIntensity: 0.08 }),
    glass: material("smoked canopy glass", glass, { metalness: 0.14, roughness: 0.08, emissive: glass, emissiveIntensity: 0.38 }),
    glow: material("engine glow ceramic", glow, { metalness: 0.2, roughness: 0.18, emissive: glow, emissiveIntensity: 0.82 })
  };
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

function createSparrow() {
  const group = new THREE.Group();
  group.name = "Sparrow MK-I";
  const p = createPalette("#ccd7dd", "#3e8fb4", "#171f29", "#80dcff");
  addCone(group, "faceted scout prow", 7.4, 34, 5, [0, 0.5, -18], p.base);
  addBox(group, "narrow pressure body", [13, 7.5, 33], [0, 1.2, 1], p.base);
  addBox(group, "recessed belly keel", [6, 3, 32], [0, -3.7, 2], p.dark);
  addSphere(group, "raised bubble canopy", 4.4, [0, 6.1, -11], p.glass, [1.15, 0.42, 1.45]);
  addBox(group, "main swept wing", [43, 1.5, 9], [0, -0.2, 2], p.armor, [0, 0, 0.04]);
  mirrored((side) => {
    addBox(group, `folded outer wing ${side}`, [6, 1.4, 24], [side * 16, -0.3, -4], p.armor, [0, side * 0.14, side * -0.34]);
    addCylinder(group, `compact vector nozzle ${side}`, 2.3, 3.2, 5, [side * 5.8, -2.3, 20], p.dark);
    addLightPanel(group, `blue intake slit ${side}`, [1, 1, 12], [side * 7.8, 2.2, -4], "#65e7ff", [0, 0, side * 0.08], 0.5);
  });
  addPanelRows(group, p.armor, [-8, -1, 7, 14], 8, 5.1, "sparrow");
  return finish(group);
}

function createMule() {
  const group = new THREE.Group();
  group.name = "Mule LX";
  const p = createPalette("#8f7f68", "#c3923a", "#202831", "#8fd0e0", "#ffc46b");
  addBox(group, "wide armored cargo spine", [31, 16, 52], [0, 0, 0], p.base);
  addCone(group, "blunt bridge prow", 11, 20, 6, [0, 2, -35], p.base);
  addBox(group, "raised freight bridge", [18, 8, 17], [0, 12, -14], p.armor);
  addBox(group, "ventral reinforced rail", [9, 8, 52], [0, -10, 2], p.dark);
  mirrored((side) => {
    addBox(group, `stacked cargo pod upper ${side}`, [13, 11, 42], [side * 25, -2, 3], p.base);
    addBox(group, `stacked cargo pod lower ${side}`, [11, 7, 34], [side * 15, -10, 7], p.dark);
    addBox(group, `yellow docking truss ${side}`, [27, 3.2, 10], [side * 30, 4, -23], p.armor, [0, 0, side * 0.18]);
    addCylinder(group, `large freight nozzle ${side}`, 4.6, 6, 7, [side * 13, -4, 27], p.dark);
    addLightPanel(group, `cargo running light ${side}`, [1.2, 1.2, 34], [side * 32, 5.8, 4], "#ffd166", [0, 0, side * 0.08], 0.35);
  });
  addCylinder(group, "central freight bell", 5.6, 7.2, 8, [0, -4, 30], p.dark);
  addPanelRows(group, p.armor, [-22, -10, 2, 14], 20, 9, "mule");
  return finish(group, 0.96);
}

function createProspector() {
  const group = new THREE.Group();
  group.name = "Prospector Rig";
  const p = createPalette("#7b7462", "#d6aa42", "#20252a", "#9bd9ee", "#ffd166");
  addBox(group, "industrial mining spine", [22, 12, 48], [0, 0, 2], p.base);
  addCone(group, "armored mining prow", 9.2, 20, 7, [0, 1, -30], p.armor);
  addCylinder(group, "forward ore scanner ring", 15, 15, 2.4, [0, 0, -43], p.armor, [Math.PI / 2, 0, 0], 48);
  addCylinder(group, "center mining emitter", 2.6, 3.4, 24, [0, 0, -50], p.glow, [Math.PI / 2, 0, 0], 18);
  mirrored((side) => {
    addBox(group, `side ore canister ${side}`, [10, 14, 30], [side * 21, -1, 8], p.dark);
    addCylinder(group, `rotary drill head ${side}`, 3.2, 4.5, 16, [side * 14, -3, -35], p.armor, [Math.PI / 2, 0, side * 0.3], 10);
    addBox(group, `mining stabilizer arm ${side}`, [25, 3, 7], [side * 22, 2, -18], p.armor, [0, 0, side * 0.2]);
    addCylinder(group, `dust clogged nozzle ${side}`, 3.4, 4.8, 6, [side * 8, -5, 27], p.dark);
  });
  addBox(group, "yellow dorsal refinery block", [12, 8, 18], [0, 10, 4], p.armor);
  addAntenna(group, p.dark, [0, 12, -8], 2);
  return finish(group, 0.94);
}

function createVeilRunner() {
  const group = new THREE.Group();
  group.name = "Veil Runner";
  const p = createPalette("#29343b", "#6d4b8f", "#11161d", "#5fe7ff", "#7dd3fc");
  addCone(group, "low observable needle prow", 6.2, 40, 5, [0, 0, -22], p.base);
  addBox(group, "faceted stealth fuselage", [14, 6.2, 40], [0, 0.8, 1], p.base);
  addSphere(group, "flush dark canopy", 4.2, [0, 4.6, -13], p.glass, [1.2, 0.28, 1.5]);
  addBox(group, "black thermal spine", [5, 2, 45], [0, 4.8, 3], p.dark);
  mirrored((side) => {
    addBox(group, `knife stealth wing ${side}`, [34, 1.1, 8], [side * 17, -0.5, -2], p.armor, [0, side * -0.34, side * 0.16]);
    addBox(group, `heat sink comb ${side}`, [2.2, 9, 20], [side * 10, 4, 9], p.dark, [0.14, 0, side * 0.18]);
    addCylinder(group, `masked ion nozzle ${side}`, 2.1, 3.1, 5, [side * 5.2, -2.4, 24], p.dark);
    addLightPanel(group, `thin smuggler trim ${side}`, [0.8, 0.8, 24], [side * 13.4, 2.1, 4], "#7dd3fc", [0, 0, side * 0.2], 0.42);
  });
  return finish(group, 0.92);
}

function createTalon() {
  const group = new THREE.Group();
  group.name = "Talon-S";
  const p = createPalette("#d8dde2", "#b72f44", "#1b2028", "#75d7ff", "#ff6b7a");
  addCone(group, "long strike nose", 6.3, 42, 3, [0, 0.2, -24], p.base);
  addBox(group, "narrow attack fuselage", [15, 7, 35], [0, 1, -1], p.base);
  addSphere(group, "low fighter canopy", 4, [0, 5.2, -15], p.glass, [1.15, 0.32, 1.2]);
  mirrored((side) => {
    addBox(group, `forward blade wing ${side}`, [34, 1.2, 8], [side * 18, 0, -8], p.armor, [0, side * 0.44, side * -0.18]);
    addBox(group, `aft stabilizer ${side}`, [24, 1.5, 8], [side * 15, -0.6, 9], p.dark, [0, side * -0.28, side * 0.28]);
    addCylinder(group, `long rail cannon ${side}`, 1, 1.2, 28, [side * 7.8, 1, -28], p.dark, [Math.PI / 2, 0, 0], 10);
    addCylinder(group, `redline side nozzle ${side}`, 2.8, 3.7, 5.5, [side * 7.5, -2.2, 20], p.dark);
  });
  addBox(group, "red dorsal ammunition channel", [4.2, 2, 31], [0, 5.2, 0], p.armor);
  return finish(group, 0.94);
}

function createRaptor() {
  const group = new THREE.Group();
  group.name = "Raptor V";
  const p = createPalette("#bfc7d0", "#c4414d", "#171d24", "#78d9ff", "#ff5f6d");
  addCone(group, "raptor spear prow", 7.2, 38, 4, [0, 0.2, -21], p.base);
  addBox(group, "angular fighter fuselage", [18, 8, 36], [0, 1, 0], p.base);
  addSphere(group, "smoked attack canopy", 4.5, [0, 5.4, -13], p.glass, [1.2, 0.38, 1.18]);
  mirrored((side) => {
    addBox(group, `predator forward wing ${side}`, [30, 1.6, 8], [side * 18, 0, -5], p.armor, [0, side * 0.32, side * -0.24]);
    addBox(group, `dark rear wing ${side}`, [25, 1.8, 10], [side * 16, -0.3, 10], p.dark, [0, side * -0.28, side * 0.24]);
    addCylinder(group, `exposed cannon barrel ${side}`, 1.1, 1.3, 18, [side * 8.5, 1.3, -22], p.dark, [Math.PI / 2, 0, 0], 10);
    addCylinder(group, `raptor side engine ${side}`, 2.9, 3.8, 5.5, [side * 8, -1.9, 20], p.dark);
  });
  addCylinder(group, "centerline engine bell", 3.5, 4.4, 6, [0, -1.3, 22], p.dark);
  addPanelRows(group, p.armor, [-9, 1, 10], 7, 5.8, "raptor");
  return finish(group, 0.95);
}

function createBastion() {
  const group = new THREE.Group();
  group.name = "Bastion-7";
  const p = createPalette("#5e666d", "#72323a", "#171b20", "#8dc8df", "#ffd166");
  addBox(group, "layered armored center hull", [35, 18, 48], [0, 0, 2], p.base);
  addBox(group, "forward armor casemate", [25, 12, 18], [0, 1, -30], p.armor);
  addCone(group, "stub ram prow", 9.5, 18, 4, [0, 1, -41], p.armor);
  addBox(group, "upper command citadel", [17, 10, 14], [0, 14, -7], p.base);
  addCylinder(group, "top turret base", 5.4, 5.4, 5, [0, 20, -4], p.dark, [0, 0, 0], 18);
  addCylinder(group, "top turret cannon", 1.5, 1.7, 25, [0, 20, -21], p.dark, [Math.PI / 2, 0, 0], 12);
  mirrored((side) => {
    addBox(group, `side armor slab ${side}`, [13, 14, 38], [side * 25, 0, 3], p.armor);
    addBox(group, `missile rack ${side}`, [9, 7, 26], [side * 38, 2, -2], p.dark);
    [-8, 0, 8].forEach((z) => addCylinder(group, `missile tube ${side} ${z}`, 1.2, 1.2, 11, [side * 38, 2, z], p.base, [Math.PI / 2, 0, 0], 8));
    addCylinder(group, `armored side nozzle ${side}`, 4.5, 5.5, 6.5, [side * 14, -4, 25], p.dark);
    addLightPanel(group, `bastion red marker ${side}`, [1, 1, 20], [side * 31, 9, -7], "#ff6b6b", [0, 0, side * 0.08], 0.4);
  });
  addCylinder(group, "main gunship nozzle", 5.6, 6.8, 8, [0, -3, 28], p.dark);
  return finish(group, 0.89);
}

function createWayfarer() {
  const group = new THREE.Group();
  group.name = "Wayfarer-X";
  const p = createPalette("#d6d8ce", "#6fa6b8", "#202932", "#bdf9ff", "#a7f3ff");
  addBox(group, "deep signal keel", [12, 7, 62], [0, 1, 1], p.base);
  addCone(group, "survey prow", 5.8, 28, 6, [0, 1.2, -43], p.base);
  addSphere(group, "forward sensor canopy", 5.2, [0, 6.4, -24], p.glass, [1, 0.42, 1.45]);
  addCylinder(group, "aft survey ring", 22, 22, 2.4, [0, 2, 16], p.armor, [Math.PI / 2, 0, 0], 64);
  mirrored((side) => {
    addBox(group, `wide survey wing ${side}`, [37, 1.4, 10], [side * 20, -0.4, 0], p.base, [0, side * -0.18, side * 0.16]);
    addBox(group, `folding sensor lattice ${side}`, [3.2, 24, 24], [side * 34, 6, 3], p.armor, [0.16, side * 0.12, side * 0.18]);
    addCylinder(group, `quiet micro thruster ${side}`, 2.1, 2.8, 4.5, [side * 15, -2.6, 27], p.dark);
    addLightPanel(group, `survey blue stripe ${side}`, [1, 1, 34], [side * 8, 4.8, -1], "#a7f3ff", [0, 0, side * 0.08], 0.38);
  });
  addAntenna(group, p.dark, [0, 11, -7], 3);
  return finish(group, 0.92);
}

function createHorizon() {
  const group = new THREE.Group();
  group.name = "Horizon Ark";
  const p = createPalette("#eee5cf", "#b99d55", "#202a34", "#c8fbff", "#ffffff");
  addBox(group, "long central explorer spine", [13, 8, 66], [0, 1.5, 0], p.base);
  addCone(group, "elegant explorer prow", 6.4, 31, 6, [0, 2, -46], p.base);
  addSphere(group, "forward observation canopy", 5.4, [0, 7.4, -24], p.glass, [1, 0.44, 1.45]);
  addBox(group, "gold dorsal keel", [5, 4, 62], [0, 9, 0], p.armor);
  mirrored((side) => {
    addBox(group, `vertical sensor fin ${side}`, [4.5, 24, 2], [side * 9, 8, -13], p.armor, [0.12, 0, side * 0.18]);
    addBox(group, `swept exploration wing ${side}`, [35, 1.7, 12], [side * 18, 0, 2], p.base, [0, side * -0.18, side * 0.16]);
    addBox(group, `outer sensor vane ${side}`, [4, 18, 25], [side * 32, 4, 4], p.armor, [0.22, side * 0.14, side * 0.2]);
    addCylinder(group, `outer micro thruster ${side}`, 2.2, 2.8, 4.5, [side * 16, -2.4, 26], p.dark);
    addCylinder(group, `inner micro thruster ${side}`, 1.8, 2.5, 4.5, [side * 5, -2, 28], p.dark);
  });
  addSphere(group, "aft sensor jewel", 3.6, [0, 6, 27], p.glass, [1, 0.7, 1]);
  addCylinder(group, "horizon halo array", 28, 28, 1.6, [0, 3, 14], p.armor, [Math.PI / 2, 0, 0], 72);
  return finish(group, 0.9);
}

function createSparrowGundam() {
  const group = new THREE.Group();
  group.name = "Sparrow MK-I Gundam Mode";
  const p = createPalette("#f2f7ff", "#246bff", "#111927", "#83ecff", "#ffffff");
  const red = material("red command armor", "#ff3f5f", { metalness: 0.56, roughness: 0.3, emissive: "#45101a", emissiveIntensity: 0.12 });
  const gold = material("gold sensor blades", "#ffd166", { metalness: 0.66, roughness: 0.24, emissive: "#6b4b0c", emissiveIntensity: 0.18 });
  addBox(group, "mecha flight torso", [18, 24, 16], [0, 2, -2], p.base);
  addBox(group, "blue reactor chest", [12, 11, 5], [0, 5, -12], p.armor);
  addLightPanel(group, "white core vent", [6, 4, 2], [0, 5.5, -15], "#ffffff", [0, 0, 0], 0.9);
  addBox(group, "red command waist", [16, 5, 12], [0, -12, 0], red);
  addBox(group, "helmet crown", [13, 8, 11], [0, 20, -5], p.base);
  addBox(group, "blue face guard", [8, 5, 3], [0, 18.5, -12], p.armor);
  addBox(group, "red chin guard", [5, 2.6, 3], [0, 15.5, -12], red);
  mirrored((side) => {
    addBox(group, `gold v fin ${side}`, [2, 18, 1.8], [side * 5.8, 28, -7], gold, [0.15, 0, side * -0.5]);
    addBox(group, `block shoulder pauldron ${side}`, [15, 10, 17], [side * 19, 9, -2], p.base, [0, 0, side * 0.08]);
    addBox(group, `blue shoulder inset ${side}`, [11, 3, 13], [side * 19, 13.5, -5], p.armor);
    addBox(group, `forearm cannon housing ${side}`, [7, 9, 23], [side * 26, -3, -5], p.base, [0, side * 0.08, side * 0.08]);
    addCylinder(group, `beam rifle barrel ${side}`, 1.1, 1.4, 28, [side * 26, -4, -25], p.dark, [Math.PI / 2, 0, 0], 12);
    addBox(group, `leg thruster block ${side}`, [8, 19, 11], [side * 7, -25, 4], p.base, [0, 0, side * 0.04]);
    addBox(group, `red knee armor ${side}`, [8.4, 5, 5], [side * 7, -25, -5], red);
    addCylinder(group, `leg vector nozzle ${side}`, 2.8, 3.8, 6, [side * 7, -36, 10], p.dark);
    addBox(group, `wing binder ${side}`, [7, 35, 4], [side * 23, 1, 15], p.armor, [0.08, side * 0.28, side * -0.18]);
    addBox(group, `white wing flare ${side}`, [16, 4, 24], [side * 27, 1, 14], p.base, [0, side * -0.22, side * 0.32]);
    addCylinder(group, `wing booster ${side}`, 2.6, 4.2, 7, [side * 18, -3, 21], p.dark);
    addLightPanel(group, `cyan saber glow ${side}`, [1.6, 1.6, 32], [side * 33, 0, -7], "#83ecff", [0, side * 0.22, side * 0.12], 0.7);
  });
  addCylinder(group, "central backpack bell", 4.5, 6, 8, [0, -3, 22], p.dark);
  addLightPanel(group, "backpack reactor glow", [7, 5, 2], [0, -3, 27], "#83ecff", [0, 0, 0], 0.8);
  return finish(group, 0.88);
}

const fleet = {
  "sparrow-mk1": createSparrow,
  "mule-lx": createMule,
  "prospector-rig": createProspector,
  "veil-runner": createVeilRunner,
  "talon-s": createTalon,
  "wayfarer-x": createWayfarer,
  "raptor-v": createRaptor,
  "bastion-7": createBastion,
  "horizon-ark": createHorizon
};

async function exportGlb(group, filename) {
  group.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  const arrayBuffer = await new Promise((resolve, reject) => {
    exporter.parse(group, resolve, reject, { binary: true, trs: false, onlyVisible: true });
  });
  await writeFile(path.join(outDir, filename), Buffer.from(arrayBuffer));
}

await mkdir(outDir, { recursive: true });
for (const [shipId, create] of Object.entries(fleet)) {
  await exportGlb(create(), `${shipId}.glb`);
  console.log(`generated ${shipId}.glb`);
}
console.log("skipped sparrow-gundam.glb; Sparrow ultimate mode uses an online public-domain mech asset");
