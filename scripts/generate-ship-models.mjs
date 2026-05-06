import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// Local procedural fallback fleet. No external model assets are embedded.

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
    metalness: options.metalness ?? 0.52,
    roughness: options.roughness ?? 0.34,
    emissive: options.emissive ?? "#000000",
    emissiveIntensity: options.emissiveIntensity ?? 0
  });
}

function addBox(group, name, size, position, mat, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addCone(group, name, radius, length, segments, position, mat, rotation = [-Math.PI / 2, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, length, segments), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addCylinder(group, name, radiusTop, radiusBottom, length, position, mat, rotation = [Math.PI / 2, 0, 0], segments = 18) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addSphere(group, name, radius, position, mat, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 10), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function mirrored(group, callback) {
  [-1, 1].forEach((side) => callback(side));
}

function createSparrow() {
  const group = new THREE.Group();
  group.name = "Sparrow MK-I";
  const hull = material("blue white lightweight hull", "#d7f3ff", { metalness: 0.45, roughness: 0.26, emissive: "#14384a", emissiveIntensity: 0.08 });
  const trim = material("blue wing trim", "#55bde8", { metalness: 0.48, roughness: 0.28 });
  const dark = material("dark engine metal", "#1d2d3b", { metalness: 0.78, roughness: 0.22, emissive: "#07131c", emissiveIntensity: 0.1 });
  const glass = material("cyan canopy", "#8feaff", { metalness: 0.16, roughness: 0.12, emissive: "#1e95c8", emissiveIntensity: 0.45 });
  addCone(group, "sharp wedge nose", 8.4, 34, 5, [0, 0.1, -12], hull);
  addBox(group, "slim scout body", [15, 8, 28], [0, 1.2, 2], hull);
  addSphere(group, "raised glass canopy", 4.6, [0, 5.1, -8], glass, [1.1, 0.62, 1.25]);
  addBox(group, "straight main wing", [42, 1.8, 11], [0, 0.1, 5], trim);
  mirrored(group, (side) => {
    addBox(group, `angled outer wing ${side}`, [5.2, 1.5, 24], [side * 15.5, 0, -2], trim, [0, 0, side * -0.34]);
    addCylinder(group, `twin engine nozzle ${side}`, 2.4, 3.3, 4, [side * 5.5, -1.6, 17], dark);
  });
  addBox(group, "ventral fin", [4.6, 12, 2.2], [0, -0.8, -18], trim, [0.24, 0, 0]);
  return group;
}

function createMule() {
  const group = new THREE.Group();
  group.name = "Mule LX";
  const hull = material("industrial ochre hull", "#a78455", { metalness: 0.38, roughness: 0.54 });
  const cargo = material("external cargo pods", "#5f6b73", { metalness: 0.46, roughness: 0.5 });
  const trim = material("hazard trim", "#d9a442", { metalness: 0.34, roughness: 0.4, emissive: "#3a2507", emissiveIntensity: 0.12 });
  const dark = material("heavy engine metal", "#242b31", { metalness: 0.82, roughness: 0.24 });
  addBox(group, "wide cargo spine", [30, 15, 44], [0, 0, 0], hull);
  addCone(group, "blunt bridge nose", 11, 18, 6, [0, 2, -28], hull);
  addBox(group, "dorsal bridge block", [17, 9, 15], [0, 11, -10], trim);
  mirrored(group, (side) => {
    addBox(group, `outer cargo container ${side}`, [12, 11, 36], [side * 24, -2, 4], cargo);
    addBox(group, `lower cargo cradle ${side}`, [9, 6, 30], [side * 12, -9, 3], cargo);
    addBox(group, `wide stabilizer ${side}`, [22, 3.5, 12], [side * 28, 2, -18], trim, [0, 0, side * 0.18]);
    addCylinder(group, `slow large nozzle ${side}`, 4.4, 5.8, 6, [side * 12, -3, 20], dark);
  });
  addCylinder(group, "central freight engine", 5.2, 6.6, 7, [0, -4, 23], dark);
  return group;
}

function createRaptor() {
  const group = new THREE.Group();
  group.name = "Raptor V";
  const hull = material("fighter white armor", "#e8edf2", { metalness: 0.5, roughness: 0.28 });
  const red = material("combat red panels", "#c7374b", { metalness: 0.42, roughness: 0.3, emissive: "#3e0710", emissiveIntensity: 0.16 });
  const dark = material("gunmetal black", "#20242b", { metalness: 0.78, roughness: 0.22 });
  const glass = material("smoked canopy", "#70c8ff", { metalness: 0.2, roughness: 0.16, emissive: "#0b5f86", emissiveIntensity: 0.28 });
  addCone(group, "needle fighter nose", 7.6, 38, 3, [0, 0, -18], hull);
  addBox(group, "angular fighter fuselage", [18, 8, 34], [0, 1, 0], hull);
  addSphere(group, "low attack canopy", 4.5, [0, 5, -12], glass, [1.25, 0.42, 1]);
  mirrored(group, (side) => {
    addBox(group, `forward swept blade wing ${side}`, [30, 1.6, 8], [side * 18, 0, -5], red, [0, side * 0.38, side * -0.22]);
    addBox(group, `rear combat wing ${side}`, [24, 1.8, 9], [side * 16, -0.2, 8], dark, [0, side * -0.28, side * 0.24]);
    addCylinder(group, `exposed cannon barrel ${side}`, 1.1, 1.3, 18, [side * 8.5, 1.2, -21], dark, [Math.PI / 2, 0, 0], 10);
    addCylinder(group, `side engine ${side}`, 2.8, 3.6, 5, [side * 8, -1.8, 18], dark);
  });
  addCylinder(group, "centerline engine", 3.4, 4.2, 5.5, [0, -1.2, 20], dark);
  addBox(group, "red dorsal strike stripe", [5, 2, 28], [0, 5.5, 1], red);
  return group;
}

function createBastion() {
  const group = new THREE.Group();
  group.name = "Bastion-7";
  const armor = material("dark steel armor", "#59616a", { metalness: 0.68, roughness: 0.36 });
  const red = material("dark red armor plates", "#682932", { metalness: 0.5, roughness: 0.34, emissive: "#2a060b", emissiveIntensity: 0.12 });
  const dark = material("black turret metal", "#1f2428", { metalness: 0.82, roughness: 0.2 });
  addBox(group, "armored center hull", [34, 18, 44], [0, 0, 2], armor);
  addBox(group, "forward armor wedge", [24, 11, 18], [0, 1, -27], red);
  addCone(group, "stub ram nose", 9.5, 18, 4, [0, 1, -38], red);
  addBox(group, "upper command block", [17, 9, 14], [0, 13, -7], armor);
  addCylinder(group, "top turret base", 5.2, 5.2, 5, [0, 19, -4], dark, [0, 0, 0], 16);
  addCylinder(group, "turret cannon", 1.5, 1.7, 24, [0, 19, -20], dark, [Math.PI / 2, 0, 0], 12);
  mirrored(group, (side) => {
    addBox(group, `side armor slab ${side}`, [13, 13, 36], [side * 25, 0, 3], red);
    addBox(group, `missile rack ${side}`, [9, 7, 24], [side * 37, 2, -2], dark);
    [-7, 0, 7].forEach((z) => addCylinder(group, `missile tube ${side} ${z}`, 1.2, 1.2, 10, [side * 37, 2, z], armor, [Math.PI / 2, 0, 0], 8));
    addCylinder(group, `armored side nozzle ${side}`, 4.4, 5.4, 6, [side * 14, -4, 22], dark);
  });
  addCylinder(group, "main gunship nozzle", 5.4, 6.4, 7, [0, -3, 24], dark);
  return group;
}

function createHorizon() {
  const group = new THREE.Group();
  group.name = "Horizon Ark";
  const ivory = material("white gold exploration hull", "#f3ead8", { metalness: 0.54, roughness: 0.22 });
  const gold = material("brushed gold trim", "#c6a85d", { metalness: 0.7, roughness: 0.24, emissive: "#3b2a06", emissiveIntensity: 0.1 });
  const glass = material("pale sensor glass", "#c8fbff", { metalness: 0.18, roughness: 0.1, emissive: "#75e8ff", emissiveIntensity: 0.36 });
  const dark = material("compact thruster metal", "#252c35", { metalness: 0.78, roughness: 0.22 });
  addBox(group, "long central ship spine", [13, 8, 62], [0, 1.5, 0], ivory);
  addCone(group, "elegant explorer prow", 6.4, 30, 6, [0, 2, -44], ivory);
  addSphere(group, "forward observation canopy", 5.4, [0, 7.4, -23], glass, [1, 0.44, 1.4]);
  addBox(group, "gold dorsal keel", [5, 4, 58], [0, 8.8, 0], gold);
  mirrored(group, (side) => {
    addBox(group, `sensor fin ${side}`, [4.5, 24, 2], [side * 9, 8, -12], gold, [0.12, 0, side * 0.18]);
    addBox(group, `swept exploration wing ${side}`, [34, 1.8, 12], [side * 18, 0, 2], ivory, [0, side * -0.18, side * 0.16]);
    addBox(group, `outer sensor vane ${side}`, [4, 18, 24], [side * 32, 4, 4], gold, [0.22, side * 0.14, side * 0.2]);
    addCylinder(group, `outer micro thruster ${side}`, 2.2, 2.7, 4, [side * 16, -2.4, 24], dark);
    addCylinder(group, `inner micro thruster ${side}`, 1.8, 2.4, 4, [side * 5, -2, 26], dark);
  });
  addSphere(group, "aft sensor jewel", 3.6, [0, 6, 25], glass, [1, 0.7, 1]);
  return group;
}

const fleet = {
  "sparrow-mk1": createSparrow,
  "mule-lx": createMule,
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
