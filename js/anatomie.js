// Freescan tomate cerise — la ligne pièce par pièce, en 3D temps réel (three.js).
// Calquée sur la machine réelle : élévateur à tasseaux, aligneur à diviseurs inox, 8 lignes = 8 chaînes
// de godets bleus (rouleaux de rotation), tunnel de vision, stations ST1–ST20 à tapis transversaux, caisses.
// La caméra suit le défilement de la section #anatomie.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const section = document.getElementById('anatomie');
const canvas = document.getElementById('scene3d');
const etiquette = document.getElementById('etiquette3d');
const cartes = [...section.querySelectorAll('.etape3d')];
const sommaire = [...section.querySelectorAll('.sommaire3d button')];
const leger = matchMedia('(max-width: 900px)').matches;

// ---------- rendu ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, leger ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
// studio bleu nuit : dégradé vertical
{
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d'); const d = g.createLinearGradient(0, 0, 0, 512);
  d.addColorStop(0, '#0c1a33'); d.addColorStop(0.55, '#081224'); d.addColorStop(1, '#03060c');
  g.fillStyle = d; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
scene.fog = new THREE.Fog('#060d1a', 22, 46);
const pmrem = new THREE.PMREMGenerator(renderer);
{
  const studio = new THREE.Scene(); studio.background = new THREE.Color('#05080f');
  const boiteLum = (w, h, x, y, z, ry, rx, c, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); studio.add(m);
  };
  boiteLum(14, 2.2, 0, 7, 0, 0, Math.PI / 2, '#ffffff', 3.2);          // grande boîte au-dessus
  boiteLum(10, 1.0, 0, 3.5, -7, 0, 0, '#cfe2ff', 2.0);                   // bande arrière
  boiteLum(10, 0.5, 0, 2.0, 7, Math.PI, 0, '#5aa2ff', 2.6);              // liseré bleu avant
  boiteLum(1.2, 6, -8, 3, 0, Math.PI / 2, 0, '#ffffff', 1.4);            // latérale
  boiteLum(1.2, 6, 8, 3, 0, -Math.PI / 2, 0, '#9fc0ff', 1.0);
  scene.environment = pmrem.fromScene(studio, 0.02).texture;
}
scene.environmentIntensity = 1.1;

const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 120);

// lumière : clé froide au-dessus, liserés bleus derrière, débouchage faible
scene.add(new THREE.HemisphereLight('#9fc0ff', '#0b0f18', 0.25));
const cle = new THREE.DirectionalLight('#e9f1ff', 1.35);
cle.position.set(3, 12, 7); cle.castShadow = true;
cle.shadow.mapSize.set(leger ? 1024 : 4096, leger ? 1024 : 4096);
Object.assign(cle.shadow.camera, { left: -18, right: 16, top: 9, bottom: -9, near: 1, far: 34 });
cle.shadow.bias = -0.0003; cle.shadow.radius = 4;
scene.add(cle);
for (const [x, z, w] of [[-2, -4.2, 26], [-2, 4.2, 26]]) {
  const r = new THREE.RectAreaLight('#3f8cff', 0.7, w, 0.6); r.position.set(x, 3.4, z); r.lookAt(x, 1, 0); scene.add(r);
}
const contre = new THREE.DirectionalLight('#5aa2ff', 1.1); contre.position.set(-8, 5, -10); scene.add(contre);

// ---------- matériaux ----------
const brosse = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 1400; i++) { const v = 90 + Math.random() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.globalAlpha = 0.35; g.fillRect(Math.random() * 512, Math.random() * 64, 40 + Math.random() * 200, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 6); return t;
})();
const M = {
  inox: new THREE.MeshPhysicalMaterial({ color: '#cfd5dc', metalness: 1, roughness: 0.32, roughnessMap: brosse }),
  caisseRouge: new THREE.MeshPhysicalMaterial({ color: '#c8392b', roughness: 0.5, clearcoat: 0.2 }),
  inoxBrosse: new THREE.MeshPhysicalMaterial({ color: '#aeb6c0', metalness: 1, roughness: 0.45, roughnessMap: brosse }),
  inoxSombre: new THREE.MeshPhysicalMaterial({ color: '#7d8794', metalness: 1, roughness: 0.38 }),
  bleu: new THREE.MeshPhysicalMaterial({ color: '#1652c9', metalness: 0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.18 }),
  bleuTapis: new THREE.MeshPhysicalMaterial({ color: '#1a5fd6', metalness: 0, roughness: 0.42, clearcoat: 0.6 }),
  noir: new THREE.MeshStandardMaterial({ color: '#111419', metalness: 0.5, roughness: 0.45 }),
  caisse: new THREE.MeshPhysicalMaterial({ color: '#c9ced5', roughness: 0.6 }),
  robot: new THREE.MeshPhysicalMaterial({ color: '#eef1f5', metalness: 0.2, roughness: 0.3, clearcoat: 0.8 }),
  accent: new THREE.MeshPhysicalMaterial({ color: '#ff5a3c', roughness: 0.35, clearcoat: 0.8 }),
  led: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#e6f3ff', emissiveIntensity: 1.2 }),
  ledBleue: new THREE.MeshStandardMaterial({ color: '#7db4ff', emissive: '#4f9bff', emissiveIntensity: 2.4 }),
  tube: new THREE.MeshPhysicalMaterial({ color: '#2b8cff', roughness: 0.3, clearcoat: 1, transmission: 0.2 }),
};

function boite(w, h, d, mat, x = 0, y = 0, z = 0, parent = scene, r = null) {
  const rad = r ?? Math.min(0.03, Math.min(w, h, d) * 0.22);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cylindre(r, h, mat, parent = scene, seg = 28) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
// prisme « toit » (diviseur) ou « V » (goulotte) le long de X
function prisme(longueur, largeur, hauteur, mat, enV = false) {
  const s = new THREE.Shape();
  if (enV) { s.moveTo(-largeur / 2, hauteur); s.lineTo(0, 0); s.lineTo(largeur / 2, hauteur); s.lineTo(largeur / 2 - 0.01, hauteur); s.lineTo(0, 0.012); s.lineTo(-largeur / 2 + 0.01, hauteur); }
  else { s.moveTo(-largeur / 2, 0); s.lineTo(0, hauteur); s.lineTo(largeur / 2, 0); }
  const g = new THREE.ExtrudeGeometry(s, { depth: longueur, bevelEnabled: false });
  g.rotateY(Math.PI / 2); g.translate(-longueur / 2, 0, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}

// ---------- géométrie de la ligne (mètres) ----------
const Y = 1.2;                                  // hauteur du fond des godets
const NB = 8, PAS_Z = 0.17;
const VOIES = Array.from({ length: NB }, (_, i) => (i - (NB - 1) / 2) * PAS_Z);
const X_ELEV_BAS = -11.3, X_ELEV_HAUT = -8.2;
const X_ALIGN_FIN = -5.6;                       // début des chaînes de godets
const X_FIN = 9.4;
const PAS = 0.08;                               // pas des godets
const X_TUNNEL = -2.1, LONG_TUNNEL = 4.6;
const X_HOTTE = 0.3, LONG_HOTTE = 2.6;
const STATIONS = Array.from({ length: 10 }, (_, i) => 2.2 + i * 0.72); // ST par côté
const LARG = NB * PAS_Z + 0.24;

// sol miroir atténué
const sol = new Reflector(new THREE.PlaneGeometry(90, 50), { textureWidth: leger ? 512 : 1024, textureHeight: leger ? 512 : 1024, color: 0x1c2638 });
sol.rotation.x = -Math.PI / 2; sol.position.y = -0.001; scene.add(sol);
const voile = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), new THREE.MeshStandardMaterial({ color: '#070c16', roughness: 0.6, metalness: 0.2, transparent: true, opacity: 0.86 }));
voile.rotation.x = -Math.PI / 2; voile.position.y = 0.002; voile.receiveShadow = true; scene.add(voile);

{ // tache de lumière au sol (studio)
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const d = g.createRadialGradient(128, 128, 0, 128, 128, 128); d.addColorStop(0, 'rgba(90,140,255,0.35)'); d.addColorStop(0.6, 'rgba(40,70,140,0.12)'); d.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = d; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(34, 12), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.position.set(-2, 0.004, 0); scene.add(m);
}
// ---------- châssis principal et goulottes inox ----------
const chassis = new THREE.Group(); scene.add(chassis);
const L = X_FIN - X_ALIGN_FIN;
const xm = (X_FIN + X_ALIGN_FIN) / 2;
boite(L + 0.3, 0.16, 0.08, M.inox, xm, Y - 0.05, -LARG / 2, chassis);
boite(L + 0.3, 0.16, 0.08, M.inox, xm, Y - 0.05, LARG / 2, chassis);
boite(L + 0.3, 0.06, LARG, M.inoxSombre, xm, Y - 0.42, 0, chassis);
for (let x = X_ALIGN_FIN; x <= X_FIN + 0.05; x += 1.5) for (const z of [-LARG / 2 + 0.06, LARG / 2 - 0.06]) boite(0.08, Y - 0.42, 0.08, M.inox, x, (Y - 0.42) / 2, z, chassis);
// goulottes en V entre les lignes (vues de dessus : bandes inox)
for (let i = 0; i <= NB; i++) {
  const z = (i - NB / 2) * PAS_Z;
  if (i === 0 || i === NB) { boite(L, 0.16, 0.02, M.inox, xm, Y + 0.06, z + Math.sign(z) * 0.012, chassis, 0.006); continue; }
  const g = prisme(L, 0.03, 0.05, M.inox); g.position.set(xm, Y + 0.035, z); chassis.add(g);
}

// ---------- 1. robot 4 axes + verseur à tambour ----------
const groupeRobot = new THREE.Group(); scene.add(groupeRobot);
function caisse(parent, plein = null, mat = M.caisseRouge) {
  const g = new THREE.Group(); parent.add(g);
  boite(0.6, 0.03, 0.4, mat, 0, 0.015, 0, g, 0.01);
  for (const [w, d, x, z] of [[0.6, 0.025, 0, -0.19], [0.6, 0.025, 0, 0.19], [0.025, 0.4, -0.29, 0], [0.025, 0.4, 0.29, 0]]) boite(w, 0.28, d, mat, x, 0.15, z, g, 0.01);
  if (plein) { const m = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.2, 0.34, 2, 0.04), plein); m.position.y = 0.17; g.add(m); g.userData.contenu = m; }
  return g;
}
const vracMat = new THREE.MeshPhysicalMaterial({ color: '#c8221b', roughness: 0.45, clearcoat: 0.5 });
// verseur : deux flasques inox, berceau à deux caisses, axe transversal (Z)
const X_VERSEUR = -12.9, Y_VERSEUR = 1.15;
const verseur = new THREE.Group(); scene.add(verseur); verseur.position.set(X_VERSEUR, Y_VERSEUR, 0);
const tambour = new THREE.Group(); verseur.add(tambour);
for (const z of [-0.62, 0.62]) {
  const flasque = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 14, 48), M.inox); flasque.position.z = z; flasque.castShadow = true; tambour.add(flasque);
  const voile = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.02, 48).rotateX(Math.PI / 2), M.inoxBrosse); voile.position.z = z + Math.sign(z) * 0.04; tambour.add(voile);
  boite(0.12, Y_VERSEUR, 0.12, M.inox, -0.55, -Y_VERSEUR / 2, z * 1.12, verseur); boite(0.12, Y_VERSEUR, 0.12, M.inox, 0.55, -Y_VERSEUR / 2, z * 1.12, verseur);
  boite(1.3, 0.1, 0.14, M.inox, 0, -0.1, z * 1.12, verseur);
}
for (const [y, x] of [[0.42, -0.42], [0.42, 0.42], [-0.42, -0.42], [-0.42, 0.42]]) { const b = cylindre(0.025, 1.24, M.inoxBrosse, tambour, 12); b.rotation.x = Math.PI / 2; b.position.set(x, y, 0); }
const berceau = [];
for (const z of [-0.22, 0.22]) { const c = caisse(tambour, vracMat); c.position.set(0, -0.16, z); c.scale.setScalar(0.95); berceau.push(c); }
const moteurV = cylindre(0.13, 0.28, M.inoxBrosse, verseur); moteurV.rotation.x = Math.PI / 2; moteurV.position.set(0, -0.15, 0.95);
// tapis de vidage sous le verseur, vers l'élévateur
const LV = X_ELEV_BAS - X_VERSEUR + 0.9, XV = (X_ELEV_BAS + X_VERSEUR) / 2 - 0.25;
boite(LV, 0.03, 1.5, M.bleuTapis, XV, 0.72, 0, scene, 0.01);
boite(LV, 0.16, 0.05, M.inox, XV, 0.8, -0.78); boite(LV, 0.16, 0.05, M.inox, XV, 0.8, 0.78);
// cascade de tomates au vidage
const cascade = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), new THREE.MeshPhysicalMaterial({ color: '#cf2216', roughness: 0.25, clearcoat: 0.8 }), 160);
cascade.frustumCulled = false; cascade.count = 0; scene.add(cascade);
const graines = Array.from({ length: 160 }, () => ({ dx: Math.random() * 0.5 - 0.25, dz: Math.random() * 1.0 - 0.5, d: Math.random() * 0.35, r: 0.019 + Math.random() * 0.006, v: 0.3 + Math.random() * 0.5 }));
// palette de caisses pleines
const pile = new THREE.Group(); scene.add(pile); pile.position.set(-15.7, 0, -3.3);
boite(1.2, 0.14, 0.8, new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.8 }), 0, 0.07, 0, pile, 0.01);
for (let i = 0; i < 6; i++) { const c = caisse(pile, vracMat); c.position.set(i % 2 ? 0.3 : -0.3, 0.14 + Math.floor(i / 2) * 0.31, 0); c.rotation.y = Math.PI / 2; }
// robot 4 axes (palettiseur) : base tournante, bras, avant-bras, poignet qui garde le préhenseur horizontal
const robot = { base: new THREE.Group(), tourelle: new THREE.Group(), epaule: new THREE.Group(), coude: new THREE.Group(), poignet: new THREE.Group() };
{
  const R = robot; groupeRobot.add(R.base); R.base.position.set(-14.4, 0, -2.3);
  cylindre(0.42, 0.22, M.noir, R.base).position.y = 0.11;
  R.base.add(R.tourelle);
  boite(0.75, 0.55, 0.6, M.robot, 0, 0.5, 0, R.tourelle, 0.08);
  boite(0.38, 0.4, 0.5, M.noir, -0.48, 0.62, 0, R.tourelle, 0.06);
  R.tourelle.add(R.epaule); R.epaule.position.set(0.12, 0.95, 0);
  boite(0.24, 1.5, 0.3, M.accent, 0, 0.75, 0, R.epaule, 0.09);
  boite(0.06, 1.5, 0.06, M.robot, -0.2, 0.75, 0.2, R.epaule, 0.03);
  const a1 = cylindre(0.2, 0.42, M.robot, R.epaule); a1.rotation.x = Math.PI / 2;
  R.epaule.add(R.coude); R.coude.position.y = 1.5;
  const a2 = cylindre(0.16, 0.36, M.robot, R.coude); a2.rotation.x = Math.PI / 2;
  boite(0.2, 1.35, 0.24, M.accent, 0, 0.67, 0, R.coude, 0.08);
  R.coude.add(R.poignet); R.poignet.position.y = 1.35;
  const a3 = cylindre(0.11, 0.3, M.robot, R.poignet); a3.rotation.x = Math.PI / 2;
  boite(0.12, 0.25, 0.12, M.robot, 0, -0.15, 0, R.poignet, 0.03);
  boite(0.68, 0.05, 0.46, M.noir, 0, -0.3, 0, R.poignet, 0.02);
  for (const z of [-0.22, 0.22]) boite(0.6, 0.12, 0.03, M.noir, 0, -0.37, z, R.poignet, 0.01);
  R.prise = caisse(R.poignet, vracMat); R.prise.rotation.y = Math.PI / 2; R.prise.position.set(0, -0.72, 0);
}
const L1 = 1.5, L2 = 1.35;
function poserRobot(cible) {
  const R = robot, b = R.base.position;
  const dx = cible.x - b.x, dz = cible.z - b.z, dy = cible.y - (b.y + 0.95);
  R.tourelle.rotation.y = Math.atan2(-dz, dx);
  const r = Math.max(0.3, Math.hypot(dx, dz) - 0.12), d = Math.min(L1 + L2 - 0.01, Math.hypot(r, dy));
  const a2 = Math.acos(THREE.MathUtils.clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1));
  const a1 = Math.atan2(dy, r) - Math.atan2(L2 * Math.sin(-a2), L1 + L2 * Math.cos(-a2));
  R.epaule.rotation.z = a1 - Math.PI / 2; R.coude.rotation.z = -a2;
  R.poignet.rotation.z = -(R.epaule.rotation.z + R.coude.rotation.z);
}
// cycle : prendre une caisse, la poser dans le berceau, le tambour pivote et vide, puis revient
const PIL = pile.position, CYCLE = 10;
// convoyeur d'amenée (rouleaux, incliné) : le robot y pose la caisse, il la monte jusqu'au verseur
const ZC0 = -3.1, ZC1 = -0.8, YC0 = 0.62, YC1 = Y_VERSEUR - 0.19;
const amenee = new THREE.Group(); scene.add(amenee);
{
  const lg = Math.hypot(ZC1 - ZC0, YC1 - YC0), ang = Math.atan2(YC1 - YC0, ZC1 - ZC0);
  amenee.position.set(X_VERSEUR, (YC0 + YC1) / 2 - 0.04, (ZC0 + ZC1) / 2); amenee.rotation.x = -ang;
  for (const x of [-0.38, 0.38]) boite(0.05, 0.16, lg + 0.1, M.inox, x, 0, 0, amenee, 0.01);
  for (let z = -lg / 2 + 0.06; z < lg / 2; z += 0.11) { const r = cylindre(0.026, 0.72, M.inoxBrosse, amenee, 14); r.rotation.z = Math.PI / 2; r.position.set(0, 0.01, z); }
  for (const [z, y] of [[ZC0 + 0.15, YC0], [(ZC0 + ZC1) / 2, (YC0 + YC1) / 2], [ZC1 - 0.15, YC1]]) for (const x of [-0.36, 0.36]) boite(0.06, y - 0.05, 0.06, M.inox, X_VERSEUR + x, (y - 0.05) / 2, z, scene, 0.01);
}
// convoyeur de sortie des caisses vides (bande verte), de l'autre côté du verseur
const ZS0 = 0.8, ZS1 = 3.6, YS0 = Y_VERSEUR - 0.19, YS1 = 0.82;
const sortieCaisses = new THREE.Group(); scene.add(sortieCaisses);
{
  const lg = Math.hypot(ZS1 - ZS0, YS1 - YS0), ang = Math.atan2(YS1 - YS0, ZS1 - ZS0);
  sortieCaisses.position.set(X_VERSEUR, (YS0 + YS1) / 2 - 0.04, (ZS0 + ZS1) / 2); sortieCaisses.rotation.x = -ang;
  boite(0.62, 0.025, lg, new THREE.MeshPhysicalMaterial({ color: '#2f9d5b', roughness: 0.4, clearcoat: 0.5 }), 0, 0.01, 0, sortieCaisses, 0.01);
  for (const x of [-0.36, 0.36]) boite(0.05, 0.14, lg + 0.1, M.inox, x, 0, 0, sortieCaisses, 0.01);
  for (const [z, y] of [[ZS0 + 0.2, YS0], [(ZS0 + ZS1) / 2, (YS0 + YS1) / 2], [ZS1 - 0.2, YS1]]) for (const x of [-0.34, 0.34]) boite(0.06, y - 0.05, 0.06, M.inox, X_VERSEUR + x, (y - 0.05) / 2, z, scene, 0.01);
}
// caisses en mouvement : pleine sur l'amenée, vide sur la sortie
const caisseEntree = caisse(scene, vracMat), caisseSortie = caisse(scene, null);
const caisseAttente = caisse(scene, null); caisseAttente.position.set(X_VERSEUR, YS1 + 0.01, ZS1 - 0.45); caisseAttente.rotation.x = Math.atan2(YS0 - YS1, ZS1 - ZS0);
const trajet = [ // [x, y, z, porte] : palette -> début du convoyeur d'amenée
  [-14.3, 2.4, -1.4, 0], [PIL.x, 2.0, PIL.z, 0], [PIL.x, 1.55, PIL.z, 0], [PIL.x, 1.55, PIL.z, 1], [PIL.x, 2.3, PIL.z, 1],
  [X_VERSEUR, 2.2, ZC0 + 0.2, 1], [X_VERSEUR, 1.4, ZC0 + 0.2, 1], [X_VERSEUR, 1.4, ZC0 + 0.2, 0], [X_VERSEUR - 0.3, 2.2, ZC0, 0], [-14.3, 2.4, -1.4, 0]];
function caisseBlanche(parent) { return caisse(parent, null, M.caisse); }

// ---------- 2. élévateur à tasseaux ----------
const elevateur = new THREE.Group(); scene.add(elevateur);
const pente = Math.atan2(Y - 0.75, X_ELEV_HAUT - X_ELEV_BAS);
const longElev = Math.hypot(X_ELEV_HAUT - X_ELEV_BAS, Y - 0.75);
const cadreElev = new THREE.Group(); elevateur.add(cadreElev);
cadreElev.position.set((X_ELEV_BAS + X_ELEV_HAUT) / 2, (0.75 + Y) / 2, 0); cadreElev.rotation.z = pente;
boite(longElev, 0.03, 1.5, M.bleuTapis, 0, -0.02, 0, cadreElev, 0.01);
boite(longElev + 0.1, 0.22, 0.05, M.inox, 0, 0.05, -0.78, cadreElev);
boite(longElev + 0.1, 0.22, 0.05, M.inox, 0, 0.05, 0.78, cadreElev);
const NB_TASSEAUX = Math.floor(longElev / 0.18);
const tasseaux = new THREE.InstancedMesh(new RoundedBoxGeometry(0.025, 0.05, 1.46, 2, 0.01), M.bleu, NB_TASSEAUX);
tasseaux.frustumCulled = false; tasseaux.castShadow = true; cadreElev.add(tasseaux);
for (const [x, z] of [[X_ELEV_BAS + 0.4, -0.7], [X_ELEV_BAS + 0.4, 0.7], [X_ELEV_HAUT - 0.2, -0.7], [X_ELEV_HAUT - 0.2, 0.7]]) {
  const h = 0.75 + (x - X_ELEV_BAS) * Math.tan(pente); boite(0.07, h, 0.07, M.inox, x, h / 2, z, elevateur);
}
const moteur = cylindre(0.14, 0.3, M.inoxBrosse, elevateur); moteur.rotation.x = Math.PI / 2; moteur.position.set(X_ELEV_HAUT, Y - 0.1, 0.95);

// ---------- 3. aligneur : tapis bleu et diviseurs en toit ----------
const aligneur = new THREE.Group(); scene.add(aligneur);
const longAlign = X_ALIGN_FIN - X_ELEV_HAUT;
boite(longAlign, 0.03, LARG - 0.1, M.bleuTapis, (X_ELEV_HAUT + X_ALIGN_FIN) / 2, Y - 0.02, 0, aligneur, 0.01);
for (let i = 1; i < NB; i++) {
  const z = (i - NB / 2) * PAS_Z;
  const d = prisme(longAlign * 0.8, 0.08, 0.1, M.inox); d.position.set(X_ALIGN_FIN - longAlign * 0.4, Y, z); aligneur.add(d);
  const pointe = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.24, 4), M.inox); pointe.rotation.z = Math.PI / 2; pointe.rotation.x = Math.PI / 4;
  pointe.position.set(X_ALIGN_FIN - longAlign * 0.8 - 0.15, Y + 0.04, z); pointe.castShadow = true; aligneur.add(pointe);
}
boite(longAlign, 0.24, 0.05, M.inox, (X_ELEV_HAUT + X_ALIGN_FIN) / 2, Y + 0.06, -LARG / 2, aligneur);
boite(longAlign, 0.24, 0.05, M.inox, (X_ELEV_HAUT + X_ALIGN_FIN) / 2, Y + 0.06, LARG / 2, aligneur);
const barre = boite(0.06, 0.06, LARG + 0.2, M.inox, X_ALIGN_FIN - 0.25, Y + 0.28, 0, aligneur);

// ---------- 4. chaînes à diabolos (instanciées) ----------
// chaque ligne : une chaîne (maillons blancs) dont chaque axe porte deux diabolos noirs à couronne dentée ;
// la tomate repose entre deux axes consécutifs et tourne avec les diabolos
const groupeGodets = new THREE.Group(); scene.add(groupeGodets);
const PAS_AXE = PAS;
const diaboloGeo = (() => {
  const prof = [[0.0, -0.026], [0.026, -0.026], [0.028, -0.023], [0.021, -0.009], [0.017, 0.0], [0.021, 0.009], [0.028, 0.023], [0.026, 0.026], [0.0, 0.026]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const parts = [];
  for (const z of [-0.042, 0.042]) {
    const d = new THREE.LatheGeometry(prof, 22); d.rotateX(Math.PI / 2); d.translate(0, 0, z); parts.push(d);
    const cour = new THREE.CylinderGeometry(0.03, 0.03, 0.007, 18); cour.rotateX(Math.PI / 2); cour.translate(0, 0, z - Math.sign(z) * 0.028); parts.push(cour);
  }
  const axe = new THREE.CylinderGeometry(0.006, 0.006, 0.15, 10); axe.rotateX(Math.PI / 2); parts.push(axe);
  return mergeGeometries(parts.map(g => g.toNonIndexed ? g.toNonIndexed() : g));
})();
const maillonGeo = (() => {
  const parts = [];
  for (const z of [-0.016, 0.016]) { const pl = new THREE.BoxGeometry(PAS_AXE * 0.98, 0.026, 0.005); pl.translate(0, 0, z); parts.push(pl.toNonIndexed()); }
  const ro = new THREE.CylinderGeometry(0.009, 0.009, 0.028, 12); ro.rotateX(Math.PI / 2); ro.translate(PAS_AXE / 2, 0, 0); parts.push(ro.toNonIndexed());
  return mergeGeometries(parts);
})();
const NB_G = Math.ceil(L / PAS_AXE) + 2;
const godets = new THREE.InstancedMesh(diaboloGeo, new THREE.MeshPhysicalMaterial({ color: '#16181c', roughness: 0.38, clearcoat: 0.4 }), NB_G * NB * 2);
const rouleaux = new THREE.InstancedMesh(maillonGeo, new THREE.MeshPhysicalMaterial({ color: '#e7eaee', roughness: 0.3, metalness: 0.2 }), NB_G * NB * 2);
for (const m of [godets, rouleaux]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; groupeGodets.add(m); }
// rails de guidage sous chaque chaîne
for (const z of VOIES) boite(L, 0.02, 0.05, M.inoxSombre, xm, Y - 0.025, z, groupeGodets, 0.006);

// ---------- 5. coffret électrique, cellule de vision, cellule SWIR (dans cet ordre) ----------
// d'après les photos de la ligne : capot de vision hexagonal qui déborde de la chaîne, tiroir étroit en bas
// (deux poignées), raccord en « V » entre les deux ; cellule SWIR rectangulaire juste après ; coffret à côté de l'entrée
// le profil hexagonal est dans le plan du défilement ; le capot est extrudé en travers de la ligne
const H_VISION = 1.85, LONG_VISION = 2.1, X_VISION = -4.2 + LONG_VISION / 2;
const LONG_SPECTRAL = 1.5, X_SPECTRAL = X_VISION + LONG_VISION / 2 + 0.2 + LONG_SPECTRAL / 2;
const vision = new THREE.Group(); scene.add(vision); vision.position.x = X_VISION;
const logoTex = new THREE.TextureLoader().load('media/logo-freescan.png'); logoTex.colorSpace = THREE.SRGBColorSpace;
const yV = Y + 0.08;
// repère local du capot (tourné de 90°) : z local = le long de la ligne, x local = en travers
const PV = {
  zb: 0.9, zm: LONG_VISION / 2, zt: 0.58 * LONG_VISION / 2,
  h1: 0.3 * H_VISION, h2: 0.38 * H_VISION, h3: 0.72 * H_VISION, h: H_VISION,
  lt: LARG / 2 + 0.25, lb: LARG / 2 + 0.2,
};
vision.rotation.y = Math.PI / 2;
function demiLong(y) { return y >= PV.h1 ? PV.lt : PV.lb; }
function geoCaisson() {
  // contour (z, y) : tiroir vertical étroit, « V » qui s'évase, flanc vertical, chanfrein, dessus plat
  const C = [[-PV.zb, 0], [PV.zb, 0], [PV.zb, PV.h1], [PV.zm, PV.h2], [PV.zm, PV.h3], [PV.zt, PV.h], [-PV.zt, PV.h], [-PV.zm, PV.h3], [-PV.zm, PV.h2], [-PV.zb, PV.h1]];
  const pos = [];
  const tri = (A, B, Cc) => pos.push(...A, ...B, ...Cc);
  const pt = (z, y, sx, haut) => [sx * (haut ? PV.lt : demiLong(y)), y, z];
  for (let i = 0; i < C.length; i++) {
    const [z1, y1] = C[i], [z2, y2] = C[(i + 1) % C.length];
    const h = Math.min(y1, y2) >= PV.h1 - 1e-6;
    tri(pt(z1, y1, -1, h), pt(z2, y2, 1, h), pt(z1, y1, 1, h)); tri(pt(z1, y1, -1, h), pt(z2, y2, -1, h), pt(z2, y2, 1, h));
  }
  // faces d'extrémité : tiroir (légèrement en retrait) + capot
  const tiroir = [[-PV.zb, 0], [PV.zb, 0], [PV.zb, PV.h1], [-PV.zb, PV.h1]];
  const capot = C.slice(2).concat([C[0 + 9]]).filter((v, i, arr) => arr.indexOf(v) === i);
  for (const [poly, haut] of [[tiroir, false], [C.filter(([, y]) => y >= PV.h1 - 1e-6), true]]) {
    const v2 = poly.map(([z, y]) => new THREE.Vector2(z, y));
    for (const sx of [-1, 1]) for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(v2, [])) {
      const A = pt(...poly[i], sx, haut), B = pt(...poly[j], sx, haut), K = pt(...poly[k], sx, haut);
      if (sx > 0) tri(A, B, K); else tri(A, K, B);
    }
  }
  // dessous du capot qui déborde (entre tiroir et flanc), pour fermer le volume
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); return g;
}
{
  const capot = new THREE.Mesh(geoCaisson(), new THREE.MeshPhysicalMaterial({ color: '#dfe5ec', metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide, flatShading: true }));
  capot.position.y = yV; capot.castShadow = true; capot.receiveShadow = true; vision.add(capot);
  for (const sx of [-1, 1]) {
    // tiroir d'extrémité : panneau et deux poignées
    boite(0.012, PV.h1 - 0.1, 2 * PV.zb - 0.12, M.inoxBrosse, sx * (PV.lb + 0.006), yV + PV.h1 / 2, 0, vision, 0.004);
    for (const z of [-0.32, 0.32]) { const gr = boite(0.035, 0.04, 0.2, M.noir, sx * (PV.lb + 0.025), yV + PV.h1 / 2, z, vision, 0.012); gr.rotation.x = 0.6 * Math.sign(z); }
  }
  // logo sur la face d'entrée et sur les flancs
  const logoBout = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.45), new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.5 }));
  logoBout.position.set(-PV.lt - 0.012, yV + (PV.h2 + PV.h3) / 2 + 0.12, 0); logoBout.rotation.y = -Math.PI / 2; vision.add(logoBout);
  const logoBout2 = logoBout.clone(); logoBout2.position.x = PV.lt + 0.012; logoBout2.rotation.y = Math.PI / 2; vision.add(logoBout2);
  for (const s2 of [-1, 1]) {
    for (const x of [-PV.lt / 2, PV.lt / 2]) {
      boite(PV.lt - 0.12, PV.h3 - PV.h2 - 0.1, 0.008, M.inoxBrosse, x, yV + (PV.h2 + PV.h3) / 2, s2 * (PV.zm + 0.005), vision, 0.004);
      for (const dx of [-0.38, 0.38]) { const gr = boite(0.2, 0.04, 0.035, M.noir, x + dx, yV + PV.h2 + 0.18, s2 * (PV.zm + 0.025), vision, 0.012); gr.rotation.z = 0.7 * Math.sign(dx); }
    }
  }
  const fente = boite(LARG - 0.2, 0.01, 2 * PV.zb - 0.3, M.led, 0, yV - 0.004, 0, vision, 0.004); fente.castShadow = false;
}
// cellule SWIR : caisson rectangulaire, porte, petit écran, arrêt d'urgence
const spectral = new THREE.Group(); scene.add(spectral); spectral.position.x = X_SPECTRAL;
{
  const y0 = Y + 0.08, h = 0.86 * H_VISION, w = LARG + 0.4;
  boite(LONG_SPECTRAL, h, w, M.inoxBrosse, 0, y0 + h / 2, 0, spectral, 0.03);
  for (const s2 of [-1, 1]) {
    boite(LONG_SPECTRAL * 0.55, h - 0.2, 0.012, M.inox, -LONG_SPECTRAL * 0.18, y0 + h / 2, s2 * (w / 2 + 0.006), spectral, 0.006);
    boite(0.03, 0.16, 0.035, M.noir, -LONG_SPECTRAL * 0.18 + LONG_SPECTRAL * 0.24, y0 + h / 2, s2 * (w / 2 + 0.025), spectral, 0.01);
    for (const dy of [-0.4, 0.4]) boite(0.05, 0.08, 0.02, M.noir, -LONG_SPECTRAL * 0.18 - LONG_SPECTRAL * 0.27, y0 + h / 2 + dy, s2 * (w / 2 + 0.015), spectral, 0.006);
    // petit écran sur un cadre inox
    boite(0.42, 0.34, 0.02, M.inox, LONG_SPECTRAL * 0.3, y0 + h * 0.62, s2 * (w / 2 + 0.012), spectral, 0.006);
    const ecr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ color: '#1c2430', emissive: '#22344d', emissiveIntensity: 0.6, roughness: 0.2 }));
    ecr.position.set(LONG_SPECTRAL * 0.3, y0 + h * 0.62, s2 * (w / 2 + 0.024)); ecr.rotation.y = s2 > 0 ? 0 : Math.PI; spectral.add(ecr);
    // plaque « SPECTRAL »
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g2 = c.getContext('2d');
    g2.fillStyle = '#0d1424'; g2.fillRect(0, 0, 512, 96); g2.fillStyle = '#7db4ff'; g2.font = '600 54px Arial'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('SPECTRAL', 256, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.11), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }));
    pl.position.set(LONG_SPECTRAL * 0.3, y0 + h * 0.62 + 0.27, s2 * (w / 2 + 0.014)); pl.rotation.y = s2 > 0 ? 0 : Math.PI; spectral.add(pl);
  }
  // arrêt d'urgence sur boîtier jaune
  boite(0.12, 0.12, 0.1, new THREE.MeshStandardMaterial({ color: '#f2c200', roughness: 0.5 }), LONG_SPECTRAL / 2 - 0.1, y0 - 0.05, w / 2 + 0.05, spectral, 0.02);
  const au = cylindre(0.035, 0.04, new THREE.MeshStandardMaterial({ color: '#d61f1f', roughness: 0.4 }), spectral, 20); au.rotation.x = Math.PI / 2; au.position.set(LONG_SPECTRAL / 2 - 0.1, y0 - 0.05, w / 2 + 0.11);
  const fs = boite(0.04, 0.01, LARG - 0.2, new THREE.MeshStandardMaterial({ color: '#b04dff', emissive: '#a040ff', emissiveIntensity: 1.2 }), 0, y0 - 0.004, 0, spectral, 0.003); fs.castShadow = false;
}
const lumTunnel = new THREE.PointLight('#dfeeff', 1.2, 2.5, 2); lumTunnel.position.set(0, Y + 0.2, 0); vision.add(lumTunnel);
// coffret électrique : colonne inox à côté de l'entrée de la cellule, face vers l'amont
const pupitre = new THREE.Group(); scene.add(pupitre);
pupitre.position.set(X_VISION - LONG_VISION / 2 - 0.05, 0, -(PV.lt + 0.5));
{
  const H = 2.75, Wz = 0.85, Dx = 0.7;
  boite(Dx, H, Wz, M.inoxBrosse, 0, H / 2, 0, pupitre, 0.03);
  boite(0.02, H * 0.36, Wz - 0.1, M.inox, -Dx / 2 - 0.01, H * 0.8, 0, pupitre, 0.006);        // porte haute
  boite(0.02, H * 0.58, Wz - 0.1, M.inox, -Dx / 2 - 0.01, H * 0.31, 0, pupitre, 0.006);       // porte basse
  const ecranTex = new THREE.TextureLoader().load('media/ui-suivi.jpg'); ecranTex.colorSpace = THREE.SRGBColorSpace;
  boite(0.03, 0.46, 0.7, new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: 0.5 }), -Dx / 2 - 0.03, 1.5, 0, pupitre, 0.01);
  const ecran = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), new THREE.MeshBasicMaterial({ map: ecranTex, toneMapped: false }));
  ecran.position.set(-Dx / 2 - 0.047, 1.5, 0); ecran.rotation.y = -Math.PI / 2; pupitre.add(ecran);
  // petit écran d'automate, voyant, sélecteur, boutons, arrêt d'urgence
  const hmi = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.18), new THREE.MeshStandardMaterial({ color: '#cfd6de', emissive: '#7d8ea6', emissiveIntensity: 0.4 }));
  hmi.position.set(-Dx / 2 - 0.025, 1.05, -0.15); hmi.rotation.y = -Math.PI / 2; pupitre.add(hmi);
  const voy = cylindre(0.025, 0.03, M.ledBleue, pupitre, 16); voy.rotation.z = Math.PI / 2; voy.position.set(-Dx / 2 - 0.03, 1.9, 0);
  for (const [z, y, m] of [[-0.25, 0.75, M.ledBleue], [-0.05, 0.75, M.noir], [0.15, 0.75, M.noir]]) { const b = cylindre(0.022, 0.03, m, pupitre, 14); b.rotation.z = Math.PI / 2; b.position.set(-Dx / 2 - 0.03, y, z); }
  const au = cylindre(0.035, 0.04, new THREE.MeshStandardMaterial({ color: '#d61f1f', roughness: 0.4 }), pupitre, 20); au.rotation.z = Math.PI / 2; au.position.set(-Dx / 2 - 0.035, 0.55, -0.25);
  // triangles de danger électrique
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f2c200'; g.beginPath(); g.moveTo(64, 8); g.lineTo(122, 116); g.lineTo(6, 116); g.closePath(); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 7; g.stroke();
  g.fillStyle = '#111'; g.beginPath(); g.moveTo(70, 40); g.lineTo(52, 78); g.lineTo(66, 78); g.lineTo(58, 104); g.lineTo(78, 66); g.lineTo(64, 66); g.closePath(); g.fill();
  const tt = new THREE.CanvasTexture(c); tt.colorSpace = THREE.SRGBColorSpace;
  for (const y of [2.55, 1.9]) { const tri = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshStandardMaterial({ map: tt, transparent: true })); tri.position.set(-Dx / 2 - 0.024, y, 0.25); tri.rotation.y = -Math.PI / 2; pupitre.add(tri); }
}

// ---------- 6–7. stations ST : vannes, tapis transversaux, caisses ----------
const stations = new THREE.Group(); scene.add(stations);
const bacs = [];      // {x, cote, zCaisse}
const tapisST = [];   // pour animer les bandes
function plaque(texte) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#c9d1da'; g.fillRect(0, 0, 128, 64); g.strokeStyle = '#3a4250'; g.lineWidth = 4; g.strokeRect(6, 6, 116, 52);
  g.fillStyle = '#20252d'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texte, 64, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshStandardMaterial({ map: t, metalness: 0.6, roughness: 0.4 }));
}
let numST = 0;
for (const cote of [-1, 1]) for (const x of STATIONS) {
  numST++;
  const zB = cote * (LARG / 2 + 0.45);
  const t = new THREE.Group(); stations.add(t); t.position.set(x, Y - 0.62, zB); t.rotation.x = cote * 0.12;
  boite(0.5, 0.025, 0.9, M.bleuTapis, 0, 0, 0, t, 0.01);
  boite(0.04, 0.12, 0.92, M.inox, -0.27, 0.03, 0, t); boite(0.04, 0.12, 0.92, M.inox, 0.27, 0.03, 0, t);
  for (const s of [-1, 1]) { const rl = cylindre(0.035, 0.52, M.inoxBrosse, t, 18); rl.rotation.z = Math.PI / 2; rl.position.set(0, -0.01, s * 0.45); }
  tapisST.push(t);
  // goulotte entre la chaîne et le tapis
  const gl = boite(0.42, 0.02, 0.5, M.inox, x, Y - 0.3, cote * (LARG / 2 - 0.2), stations, 0.008); gl.rotation.x = cote * 0.7;
  // bloc de vannes + tubes bleus
  boite(0.16, 0.12, 0.12, M.noir, x - 0.18, Y - 0.25, cote * (LARG / 2 + 0.1), stations, 0.02);
  for (let k = 0; k < 3; k++) { const tb = cylindre(0.008, 0.35, M.tube, stations, 8); tb.position.set(x - 0.22 + k * 0.04, Y - 0.42, cote * (LARG / 2 + 0.1)); }
  // plaque ST
  const p = plaque('ST' + numST); p.position.set(x, Y - 0.13, cote * (LARG / 2 + 0.045)); p.rotation.y = cote > 0 ? 0 : Math.PI; stations.add(p);
  // caisse en bout de tapis, sur convoyeur à rouleaux
  const zC = cote * (LARG / 2 + 1.2);
  const c = caisseBlanche(stations); c.position.set(x, 0.32, zC); c.rotation.y = Math.PI / 2;
  bacs.push({ x, cote, zC, n: 0 });
}
// convoyeurs de caisses le long de la ligne
const groupeBacs = new THREE.Group(); scene.add(groupeBacs);
for (const cote of [-1, 1]) {
  const z = cote * (LARG / 2 + 1.2);
  boite(STATIONS.at(-1) - STATIONS[0] + 1.2, 0.05, 0.62, M.inox, (STATIONS[0] + STATIONS.at(-1)) / 2, 0.27, z, groupeBacs);
  for (let x = STATIONS[0] - 0.5; x <= STATIONS.at(-1) + 0.5; x += 0.14) { const r = cylindre(0.025, 0.58, M.bleu, groupeBacs, 12); r.rotation.x = Math.PI / 2; r.position.set(x, 0.3, z); }
  for (let x = STATIONS[0] - 0.5; x <= STATIONS.at(-1) + 0.6; x += 1.4) boite(0.06, 0.26, 0.06, M.inox, x, 0.13, z, groupeBacs);
}

// ---------- tomates cerises ----------
const COULEURS = ['#c8150f', '#dd2a14', '#ee5a1c', '#f08a2a', '#9aa83a'];   // de très mûre à tournante
const MAX = 5200;
const fruitMat = new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25 });
const fruits = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 22, 16), fruitMat, MAX);
fruits.frustumCulled = false; fruits.castShadow = true; fruits.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(fruits);
const pedoncule = new THREE.InstancedMesh(new THREE.ConeGeometry(0.35, 0.25, 5), new THREE.MeshStandardMaterial({ color: '#3f7a2a', roughness: 0.6 }), MAX);
pedoncule.frustumCulled = false; scene.add(pedoncule);
const pool = [];
const R_FRUIT = 0.02;

// ---------- simulation ----------
const VITESSE = 0.6;
let distance = 0, dernier = -1;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p3 = new THREE.Vector3(), e3 = new THREE.Vector3(), eul = new THREE.Euler(), col = new THREE.Color();
const mP = new THREE.Matrix4(), off = new THREE.Vector3();

function xSlot(n) { return X_ELEV_BAS + (distance - n * PAS); }
function creer(n, v) {
  if (Math.random() < 0.1) return;
  let p = pool.find(f => f.etat === 'libre');
  if (!p) { if (pool.length >= MAX) return; p = {}; pool.push(p); }
  const classe = Math.random() < 0.07 ? 4 : Math.floor(Math.random() * 4);
  const cote = v < NB / 2 ? -1 : 1;
  // classe -> stations de ce côté (2 à 3 stations par classe), quelques retours en bout de ligne
  let st = Math.min(9, classe * 2 + (Math.random() < 0.5 ? 0 : 1) + (classe === 4 ? 1 : 0));
  if (Math.random() < 0.03) st = -1;
  Object.assign(p, { etat: 'ligne', n, v, z0: (Math.random() - 0.5) * 1.3, classe, cote, st, t: 0, ph: Math.random() * 6.3, k: 0.8 + Math.random() * 0.25, el: 1.3 + Math.random() * 0.25 });
}
function placer(i, p, pos, rx, ry, rz) {
  const r = R_FRUIT * p.k;
  eul.set(rx, ry, rz); q.setFromEuler(eul); e3.set(r, r, r * p.el);   // grand axe selon Z (parallèle aux axes des diabolos)
  m4.compose(pos, q, e3); fruits.setMatrixAt(i, m4);
  off.set(0, 0, r * p.el * 0.95).applyQuaternion(q).add(pos);
  e3.set(r * 0.6, r * 0.6, r * 0.6); m4.compose(off, q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), e3); pedoncule.setMatrixAt(i, m4);
  col.set(COULEURS[p.classe]); fruits.setColorAt(i, col);
}

function majFruits(dt, t) {
  const c = Math.floor(distance / PAS);
  while (dernier < c) { dernier++; for (let v = 0; v < NB; v++) creer(dernier, v); }
  let i = 0;
  for (const p of pool) {
    if (p.etat === 'libre') continue;
    const zV = VOIES[p.v];
    if (p.etat === 'ligne') {
      const x = xSlot(p.n);
      if (x < X_ELEV_HAUT) {                    // sur l'élévateur, en vrac
        const k = (x - X_ELEV_BAS) / (X_ELEV_HAUT - X_ELEV_BAS);
        p3.set(x, 0.75 + k * (Y - 0.75) + 0.025, p.z0 * 1.05);
        placer(i, p, p3, p.ph, 0, -t * 2);
      } else if (x < X_ALIGN_FIN) {             // aligneur : rabattu vers sa ligne
        const k = THREE.MathUtils.smootherstep(x, X_ELEV_HAUT, X_ALIGN_FIN - 0.3);
        p3.set(x + Math.sin(t * 7 + p.ph) * 0.01 * (1 - k), Y + 0.022, THREE.MathUtils.lerp(p.z0, zV, k));
        placer(i, p, p3, 0, (1 - k) * p.ph, -(x / 0.022) * 0.5);
      } else {                                  // dans son godet, il tourne sur les rouleaux
        p3.set(x, Y + 0.046, zV);
        placer(i, p, p3, 0, 0, -(x / 0.022) * 0.8 + p.ph);   // couchée entre deux axes, tourne sur son grand axe
        const xs = p.st >= 0 ? STATIONS[p.st] : X_FIN + 0.2;
        if (x >= xs) {
          if (p.st >= 0) { p.etat = 'chute'; souffler(xs, zV); }
          else p.etat = 'retour';
          p.t = 0; p.de = p3.clone();
        }
      }
    } else if (p.etat === 'chute') {           // éjecté : tombe dans la goulotte jusqu'au tapis
      p.t += dt / 0.32; const k = Math.min(1, p.t);
      const zT = p.cote * (LARG / 2 + 0.05);
      p3.set(p.de.x, THREE.MathUtils.lerp(p.de.y, Y - 0.58, k * k) + Math.sin(k * Math.PI) * 0.08, THREE.MathUtils.lerp(p.de.z, zT, k));
      placer(i, p, p3, k * 6, 0, k * 4);
      if (k >= 1) { p.etat = 'tapis'; p.t = 0; p.x0 = p.de.x + (Math.random() - 0.5) * 0.3; }
    } else if (p.etat === 'tapis') {           // tapis transversal vers la caisse
      p.t += dt; const z = p.cote * (LARG / 2 + 0.05 + p.t * 0.75);
      p3.set(p.x0, Y - 0.58 + 0.022 - (Math.abs(z) - LARG / 2) * 0.1, z);
      placer(i, p, p3, 0, 0, p.t * 9 * p.cote);
      if (Math.abs(z) > LARG / 2 + 0.9) { p.etat = 'tombe'; p.t = 0; p.de = p3.clone(); const b = bacs[(p.cote > 0 ? 10 : 0) + p.st]; p.vers = new THREE.Vector3(b.x + (Math.random() - 0.5) * 0.4, 0.38 + Math.random() * 0.14, b.zC + (Math.random() - 0.5) * 0.24); }
    } else if (p.etat === 'tombe') {
      p.t += dt / 0.35; const k = Math.min(1, p.t);
      p3.lerpVectors(p.de, p.vers, k); p3.y = THREE.MathUtils.lerp(p.de.y, p.vers.y, k * k);
      placer(i, p, p3, k * 5, 0, 0);
      if (k >= 1) { p.etat = 'caisse'; p.t = 0; p.repos = p3.clone(); p.rr = Math.random() * 6; }
    } else if (p.etat === 'caisse') {
      p.t += dt; placer(i, p, p.repos, p.rr, p.rr * 0.7, 0);
      if (p.t > 12) { p.etat = 'libre'; continue; }
    } else if (p.etat === 'retour') {
      p.t += dt / 0.5; const k = Math.min(1, p.t);
      p3.set(p.de.x + k * 0.5, THREE.MathUtils.lerp(p.de.y, 0.35, k * k), p.de.z); placer(i, p, p3, k * 4, 0, 0);
      if (k >= 1) { p.etat = 'libre'; continue; }
    }
    i++;
  }
  fruits.count = pedoncule.count = i;
  fruits.instanceMatrix.needsUpdate = pedoncule.instanceMatrix.needsUpdate = true;
  if (fruits.instanceColor) fruits.instanceColor.needsUpdate = true;
}

function majGodets() {
  let a = 0; const dec = (((X_ELEV_BAS + distance + PAS_AXE / 2 - X_ALIGN_FIN) % PAS_AXE) + PAS_AXE) % PAS_AXE;
  const qa = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -distance / 0.018);
  const qr = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  e3.set(1, 1, 1);
  for (let v = 0; v < NB; v++) for (let j = 0; j < NB_G; j++) {
    const x = X_ALIGN_FIN + dec + j * PAS_AXE - PAS_AXE;
    if (x > X_ALIGN_FIN - 0.04 && x < X_FIN) {
      p3.set(x, Y + 0.02, VOIES[v]); m4.compose(p3, qa, e3); godets.setMatrixAt(a, m4);
      q.identity(); m4.compose(p3, q, e3); rouleaux.setMatrixAt(a, m4); a++;
    }
    const xr = X_FIN - dec - j * PAS_AXE;       // brin de retour
    if (xr > X_ALIGN_FIN && xr < X_FIN) {
      p3.set(xr, Y - 0.3, VOIES[v]); m4.compose(p3, qr, e3); godets.setMatrixAt(a, m4); rouleaux.setMatrixAt(a, m4); a++;
    }
  }
  godets.count = rouleaux.count = a;
  godets.instanceMatrix.needsUpdate = rouleaux.instanceMatrix.needsUpdate = true;
  // tasseaux de l'élévateur
  const d2 = (distance * 1.0) % 0.18;
  for (let k = 0; k < NB_TASSEAUX; k++) {
    p3.set(-longElev / 2 + ((k * 0.18 + d2) % longElev), 0.02, 0); q.identity(); e3.set(1, 1, 1); m4.compose(p3, q, e3); tasseaux.setMatrixAt(k, m4);
  }
  tasseaux.instanceMatrix.needsUpdate = true;
}

// bouffées d'air à l'éjection
const bouffees = [];
for (let k = 0; k < 40; k++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: '#dff1ff', transparent: true, opacity: 0, depthWrite: false }));
  m.visible = false; scene.add(m); bouffees.push({ m, t: 9 });
}
function souffler(x, z) {
  const b = bouffees.find(b => b.t > 0.4) || bouffees[0]; b.t = 0; b.m.visible = true; b.m.position.set(x, Y + 0.06, z); b.dir = z < 0 ? -1 : 1;
}

// ---------- étapes : caméra et repères ----------
const ETAPES = [
  { pos: [9.5, 7.5, 12.5], vise: [-1.5, 1.0, 0] },
  { pos: [-17.6, 4.2, 3.0], vise: [-13.6, 1.1, -1.2], ancre: [-12.9, 2.0, 0.6] },
  { pos: [-9.2, 2.4, 3.6], vise: [-9.8, 1.0, 0], ancre: [-9.6, 1.05, 0.5] },
  { pos: [-6.4, 2.4, 2.2], vise: [-7.0, 1.15, 0], ancre: [-6.7, 1.32, 0.2] },
  { pos: [-4.75, 1.62, 0.55], vise: [-5.35, 1.22, 0.0], ancre: [-5.05, 1.25, 0.09] },
  { pos: [-7.6, 2.1, -3.2], vise: [-4.6, 1.7, -1.3], ancre: [-4.62, 1.5, -1.32] },
  { pos: [-2.0, 2.5, 5.0], vise: [-3.15, 2.0, 0.4], ancre: [-3.15, 2.75, 1.08] },
  { pos: [2.6, 2.3, 3.6], vise: [-0.1, 1.8, 0], ancre: [0.2, 2.35, 1.03] },
  { pos: [3.0, 1.5, 2.3], vise: [2.3, 0.95, 0.6], ancre: [2.25, 0.75, 1.05] },
  { pos: [8.6, 2.8, 5.0], vise: [5.8, 0.5, 1.4], ancre: [5.8, 0.62, 2.0] },
];
const camPos = new THREE.Vector3(), camVise = new THREE.Vector3();
let actif = -1, avance = 0, visible = false;

function majCamera(dt) {
  const n = ETAPES.length - 1, s = THREE.MathUtils.clamp(avance * n, 0, n);
  const i = Math.min(n - 1, Math.floor(s)), e = THREE.MathUtils.smootherstep(s - i, 0.3, 0.7);
  const A = ETAPES[i], B = ETAPES[i + 1];
  const p = new THREE.Vector3().fromArray(A.pos).lerp(new THREE.Vector3().fromArray(B.pos), e);
  const v = new THREE.Vector3().fromArray(A.vise).lerp(new THREE.Vector3().fromArray(B.vise), e);
  p.y += Math.sin(e * Math.PI) * 1.4;
  const k = 1 - Math.pow(0.0015, dt);
  camPos.lerp(p, k); camVise.lerp(v, k); camera.position.copy(camPos); camera.lookAt(camVise);
  const a = Math.round(s);
  if (a !== actif) {
    actif = a;
    cartes.forEach((c, j) => c.classList.toggle('active', j === a));
    sommaire.forEach((b, j) => b.classList.toggle('active', j === a));
  }
}
const proj = new THREE.Vector3();
function majEtiquette() {
  const E = ETAPES[actif];
  if (!E || !E.ancre) { etiquette.style.opacity = 0; return; }
  proj.fromArray(E.ancre).project(camera);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  etiquette.style.transform = `translate(${(proj.x * 0.5 + 0.5) * w}px, ${(-proj.y * 0.5 + 0.5) * h}px)`;
  etiquette.style.opacity = proj.z < 1 ? 1 : 0;
  etiquette.querySelector('span').textContent = cartes[actif].dataset.court || '';
}

// ---------- post-traitement ----------
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: leger ? 0 : 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, camera));
let ao = null;
if (!leger) {
  try {
    ao = new GTAOPass(scene, camera, 1, 1);
    ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 12 });
    ao.blendIntensity = 0.85;
    composer.addPass(ao);
  } catch (e) { ao = null; }
}
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), leger ? 0.1 : 0.14, 0.35, 0.99);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function dimensionner() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); if (ao) ao.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  camera.aspect = w / h; camera.fov = w < h ? 52 : 36; camera.updateProjectionMatrix();
}
new ResizeObserver(dimensionner).observe(canvas); dimensionner();
camPos.fromArray(ETAPES[0].pos); camVise.fromArray(ETAPES[0].vise);

function lireDefilement() {
  const r = section.getBoundingClientRect(), total = r.height - innerHeight;
  avance = THREE.MathUtils.clamp(-r.top / total, 0, 1);
}
function estVisible() { const r = section.getBoundingClientRect(); visible = r.top < innerHeight + 200 && r.bottom > -200; }
addEventListener('scroll', () => { lireDefilement(); estVisible(); }, { passive: true }); lireDefilement(); estVisible();
sommaire.forEach((b, j) => b.addEventListener('click', () => {
  const r = section.getBoundingClientRect(), total = r.height - innerHeight;
  scrollTo({ top: scrollY + r.top + total * (j / (ETAPES.length - 1)) + 2, behavior: 'smooth' });
}));

// ---------- boucle ----------
const horloge = new THREE.Clock();
let temps = 0, tRobot = 0;
function avancer(dt) {
  temps += dt; distance += VITESSE * dt;
  majGodets(); majFruits(dt, temps);
  const eclair = 0.5 + 0.5 * Math.sin(temps * 5);
  M.led.emissiveIntensity = 0.9 + eclair * 0.5; lumTunnel.intensity = 0.8 + eclair * 0.8;
  for (const b of bouffees) if (b.m.visible) {
    b.t += dt; const k = b.t / 0.3; b.m.scale.setScalar(0.4 + k * 2);
    b.m.position.z += b.dir * dt * 1.4; b.m.material.opacity = Math.max(0, 0.5 * (1 - k)); if (k >= 1) b.m.visible = false;
  }
  tRobot = (tRobot + dt) % CYCLE;
  // 0–45 % : le robot pose une caisse sur l'amenée ; 35–58 % : elle monte au verseur ;
  // 60–98 % : le tambour pivote, vide et revient ; 0–30 % du cycle suivant : la caisse vide repart
  const ph = tRobot / CYCLE;
  const kr = Math.min(1, ph / 0.45) * (trajet.length - 1), ir = Math.min(trajet.length - 2, Math.floor(kr)), fr = THREE.MathUtils.smootherstep(kr - ir, 0, 1);
  const A = trajet[ir], B = trajet[ir + 1];
  poserRobot(new THREE.Vector3(A[0] + (B[0] - A[0]) * fr, A[1] + (B[1] - A[1]) * fr, A[2] + (B[2] - A[2]) * fr));
  robot.prise.visible = A[3] === 1;
  const angA = Math.atan2(YC1 - YC0, ZC1 - ZC0), angS = Math.atan2(YS1 - YS0, ZS1 - ZS0);
  const kIn = (ph - 0.35) / 0.23;
  caisseEntree.visible = kIn >= 0 && kIn < 1;
  if (caisseEntree.visible) { const k = THREE.MathUtils.smoothstep(kIn, 0, 1); caisseEntree.position.set(X_VERSEUR, THREE.MathUtils.lerp(YC0, YC1, k) + 0.01, THREE.MathUtils.lerp(ZC0 + 0.2, ZC1, k)); caisseEntree.rotation.x = -angA; }
  const kOut = ph / 0.3;
  caisseSortie.visible = kOut < 1;
  if (caisseSortie.visible) { caisseSortie.position.set(X_VERSEUR, THREE.MathUtils.lerp(YS0, YS1, kOut) + 0.01, THREE.MathUtils.lerp(ZS0, ZS1 - 0.9, kOut)); caisseSortie.rotation.x = -angS; }
  const bascule = ph < 0.6 ? 0 : ph < 0.72 ? THREE.MathUtils.smootherstep(ph, 0.6, 0.72) : ph < 0.86 ? 1 : 1 - THREE.MathUtils.smootherstep(ph, 0.86, 0.98);
  tambour.rotation.z = -bascule * Math.PI * 0.85;
  for (const c of berceau) { c.visible = ph >= 0.58; if (c.userData.contenu) c.userData.contenu.visible = ph >= 0.58 && ph < 0.7; }
  // cascade de tomates pendant le vidage
  if (ph > 0.68 && ph < 0.9) {
    const k = (ph - 0.68) / 0.22; let n = 0;
    for (const g of graines) {
      const t = k * 1.6 - g.d; if (t < 0 || t > 1) continue;
      p3.set(X_VERSEUR + 0.35 + g.dx + t * g.v, Y_VERSEUR - 0.2 - t * t * (Y_VERSEUR - 0.55), g.dz);
      e3.setScalar(g.r); q.identity(); m4.compose(p3, q, e3); cascade.setMatrixAt(n++, m4);
    }
    cascade.count = n; cascade.instanceMatrix.needsUpdate = true;
  } else cascade.count = 0;
  majCamera(dt); majEtiquette();
  composer.render();
}
// ligne déjà en production à l'arrivée
for (let k = 0; k < 1300; k++) { distance += VITESSE / 30; majFruits(1 / 30, k / 30); }
for (const p of pool) if (p.etat === 'caisse') p.t = Math.random() * 10;

function image() { requestAnimationFrame(image); const dt = Math.min(0.05, horloge.getDelta()); if (visible) avancer(dt); }
image();
// crochet de contrôle (rendu sans écran)
window.__freescan3d = { calculer(n = 60, dt = 1 / 30) { lireDefilement(); for (let k = 0; k < n; k++) avancer(dt); } };
