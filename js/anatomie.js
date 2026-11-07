// Freescan — la machine pièce par pièce, en 3D temps réel (three.js).
// La caméra suit le défilement de la section #anatomie ; un fruit va de la caisse au bac.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const section = document.getElementById('anatomie');
const canvas = document.getElementById('scene3d');
const etiquette = document.getElementById('etiquette3d');
const cartes = [...section.querySelectorAll('.etape3d')];
const sommaire = [...section.querySelectorAll('.sommaire3d button')];

// ---------- rendu ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const FOND = new THREE.Color('#0a1120');
scene.background = FOND;
scene.fog = new THREE.Fog(FOND, 18, 42);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);

scene.add(new THREE.HemisphereLight('#bcd4ff', '#1a1410', 0.55));
const soleil = new THREE.DirectionalLight('#ffffff', 2.2);
soleil.position.set(4, 10, 6);
soleil.castShadow = true;
soleil.shadow.mapSize.set(2048, 2048);
Object.assign(soleil.shadow.camera, { left: -14, right: 14, top: 8, bottom: -8, near: 1, far: 30 });
soleil.shadow.bias = -0.0004;
scene.add(soleil);
const contre = new THREE.DirectionalLight('#7db4ff', 0.8);
contre.position.set(-6, 4, -8);
scene.add(contre);

// ---------- matériaux ----------
const inox = new THREE.MeshStandardMaterial({ color: '#c9d1da', metalness: 0.92, roughness: 0.32 });
const inoxBrosse = new THREE.MeshStandardMaterial({ color: '#9aa4b0', metalness: 0.85, roughness: 0.48 });
const bleu = new THREE.MeshStandardMaterial({ color: '#1f5fd1', metalness: 0.1, roughness: 0.45 });
const noir = new THREE.MeshStandardMaterial({ color: '#15181d', metalness: 0.4, roughness: 0.5 });
const vitre = new THREE.MeshPhysicalMaterial({ color: '#9fc2ff', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
const led = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dff0ff', emissiveIntensity: 2.2 });
const caisseMat = new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.55, metalness: 0 });
const robotMat = new THREE.MeshStandardMaterial({ color: '#e8ecf1', metalness: 0.3, roughness: 0.35 });
const robotAccent = new THREE.MeshStandardMaterial({ color: '#ff5a3c', metalness: 0.2, roughness: 0.4 });

function boite(w, h, d, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cylindre(r, h, mat, parent = scene, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

// ---------- géométrie de la ligne ----------
const VOIES = [-0.75, -0.25, 0.25, 0.75];
const Y_GODET = 0.62;          // hauteur des fruits dans les godets
const X_ALIGN_DEBUT = -7.6, X_ALIGN_FIN = -4.6;
const X_FIN = 8.9;             // fin de la chaîne de godets
const PAS = 0.34;              // pas entre godets
const SORTIES = [3.7, 4.55, 5.4, 6.25, 7.1, 7.95];
const X_VISION = -1.0, X_SWIR = 2.05;

// sol
const sol = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ color: '#141b27', roughness: 0.9, metalness: 0 }));
sol.rotation.x = -Math.PI / 2; sol.position.y = -1.1; sol.receiveShadow = true; scene.add(sol);
const grille = new THREE.GridHelper(60, 60, '#24324a', '#1a2436');
grille.position.y = -1.095; scene.add(grille);

// châssis
const chassis = new THREE.Group(); scene.add(chassis);
boite(X_FIN - X_ALIGN_FIN + 0.6, 0.12, 0.08, inox, (X_FIN + X_ALIGN_FIN) / 2, 0.42, -1.08, chassis);
boite(X_FIN - X_ALIGN_FIN + 0.6, 0.12, 0.08, inox, (X_FIN + X_ALIGN_FIN) / 2, 0.42, 1.08, chassis);
boite(X_FIN - X_ALIGN_FIN + 0.6, 0.5, 2.1, inoxBrosse, (X_FIN + X_ALIGN_FIN) / 2, 0.0, 0, chassis);
for (let x = X_ALIGN_FIN; x <= X_FIN + 0.1; x += 2.2) for (const z of [-1, 1]) boite(0.1, 1.1, 0.1, inox, x, -0.6, z, chassis);

// ---------- 1. robot de chargement + trémie ----------
const groupeRobot = new THREE.Group(); scene.add(groupeRobot);
const tremie = new THREE.Group(); scene.add(tremie);
{
  // trémie : quatre parois inclinées
  const t = tremie; t.position.set(-8.75, 0.35, 0);
  boite(1.5, 0.06, 2.1, inox, 0, -0.25, 0, t).rotation.z = 0.25;
  const p1 = boite(1.6, 0.9, 0.06, inox, 0, 0.1, -1.05, t); const p2 = boite(1.6, 0.9, 0.06, inox, 0, 0.1, 1.05, t);
  const p3 = boite(0.06, 1.1, 2.1, inox, -0.8, 0.2, 0, t);
  for (let x = -0.6; x < 0.8; x += 0.5) for (const z of [-0.9, 0.9]) boite(0.08, 1.4, 0.08, inox, x, -0.85, z, t);
}
// caisses en attente (pile)
const pileCaisses = new THREE.Group(); scene.add(pileCaisses);
function caisse(parent, plein = null) {
  const g = new THREE.Group(); parent.add(g);
  boite(0.6, 0.04, 0.4, caisseMat, 0, 0, 0, g);
  boite(0.6, 0.3, 0.03, caisseMat, 0, 0.15, -0.185, g); boite(0.6, 0.3, 0.03, caisseMat, 0, 0.15, 0.185, g);
  boite(0.03, 0.3, 0.4, caisseMat, -0.285, 0.15, 0, g); boite(0.03, 0.3, 0.4, caisseMat, 0.285, 0.15, 0, g);
  if (plein) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.34), plein); m.position.y = 0.13; g.add(m); g.userData.contenu = m; }
  return g;
}
const vracMat = new THREE.MeshStandardMaterial({ color: '#d7261e', roughness: 0.55 });
for (let i = 0; i < 4; i++) { const c = caisse(pileCaisses, vracMat); c.position.set(-11.4, -1.08 + i * 0.31, -1.9); }
// robot
const robot = { base: new THREE.Group(), epaule: new THREE.Group(), coude: new THREE.Group(), poignet: new THREE.Group() };
{
  const R = robot; groupeRobot.add(R.base); R.base.position.set(-10.3, -1.1, -0.2);
  const socle = cylindre(0.32, 0.35, robotMat, R.base); socle.position.y = 0.17;
  const tour = cylindre(0.22, 0.5, robotAccent, R.base); tour.position.y = 0.55;
  R.base.add(R.epaule); R.epaule.position.y = 0.85;
  const bras1 = boite(0.2, 1.45, 0.24, robotMat, 0, 0.72, 0, R.epaule);
  const art1 = cylindre(0.17, 0.32, robotAccent, R.epaule); art1.rotation.x = Math.PI / 2;
  R.epaule.add(R.coude); R.coude.position.y = 1.45;
  const art2 = cylindre(0.14, 0.3, robotAccent, R.coude); art2.rotation.x = Math.PI / 2;
  boite(0.17, 1.25, 0.2, robotMat, 0, 0.62, 0, R.coude);
  R.coude.add(R.poignet); R.poignet.position.y = 1.25;
  const art3 = cylindre(0.1, 0.26, robotAccent, R.poignet); art3.rotation.x = Math.PI / 2;
  boite(0.7, 0.05, 0.08, noir, 0, -0.05, 0, R.poignet);
  R.prise = caisse(R.poignet, vracMat); R.prise.position.set(0, -0.42, 0);
}
const L1 = 1.45, L2 = 1.25;
// cinématique inverse plane : vise un point du poignet, la caisse reste horizontale sauf bascule
function poserRobot(cible, bascule) {
  const R = robot; const b = R.base.position;
  const dx = cible.x - b.x, dz = cible.z - b.z, dy = cible.y - (b.y + 0.85);
  R.base.rotation.y = Math.atan2(-dz, dx);
  const r = Math.max(0.2, Math.hypot(dx, dz));
  const d = Math.min(L1 + L2 - 0.01, Math.hypot(r, dy));
  const a2 = Math.acos(THREE.MathUtils.clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1));
  const a1 = Math.atan2(dy, r) - Math.atan2(L2 * Math.sin(-a2), L1 + L2 * Math.cos(-a2));
  // les groupes « pointent » vers +Y : rotation z = angle - 90°
  R.epaule.rotation.z = a1 - Math.PI / 2;
  R.coude.rotation.z = -a2;
  R.poignet.rotation.z = -(R.epaule.rotation.z + R.coude.rotation.z) + bascule;
}
const trajet = [ // [x, y, z, bascule, porte?]
  [-10.9, 0.9, -1.2, 0, 0], [-11.4, 0.2, -1.9, 0, 0], [-11.4, 0.2, -1.9, 0, 1], [-11.0, 1.5, -1.3, 0, 1],
  [-9.4, 1.65, 0, 0, 1], [-9.25, 1.55, 0, 1.9, 1], [-9.25, 1.55, 0, 1.9, 2], [-9.4, 1.65, 0, 0, 2], [-10.9, 0.9, -1.2, 0, 0]
];
const DUREE_ROBOT = 9;

// ---------- 2. aligneur : rouleaux ----------
const aligneur = new THREE.Group(); scene.add(aligneur);
const rouleaux = [];
for (let x = X_ALIGN_DEBUT; x <= X_ALIGN_FIN - 0.1; x += 0.19) {
  const r = cylindre(0.075, 2.05, inoxBrosse, aligneur, 18); r.rotation.x = Math.PI / 2; r.position.set(x, Y_GODET - 0.16, 0); rouleaux.push(r);
}
// guides en V qui rabattent vers les voies
for (let i = 0; i <= VOIES.length; i++) {
  const zFin = i === 0 ? -1.0 : i === VOIES.length ? 1.0 : (VOIES[i - 1] + VOIES[i]) / 2;
  const zDeb = zFin * 1.0;
  const g = boite(1.6, 0.14, 0.025, inox, X_ALIGN_FIN - 0.8, Y_GODET + 0.0, zFin, aligneur);
}
boite(X_ALIGN_FIN - X_ALIGN_DEBUT + 0.3, 0.35, 0.06, inox, (X_ALIGN_DEBUT + X_ALIGN_FIN) / 2, Y_GODET - 0.1, -1.08, aligneur);
boite(X_ALIGN_FIN - X_ALIGN_DEBUT + 0.3, 0.35, 0.06, inox, (X_ALIGN_DEBUT + X_ALIGN_FIN) / 2, Y_GODET - 0.1, 1.08, aligneur);

// ---------- 3. godets (instanciés) ----------
const groupeGodets = new THREE.Group(); scene.add(groupeGodets);
const godetGeo = (() => {
  // godet en V : deux plaques inclinées
  const g = new THREE.BoxGeometry(0.22, 0.03, 0.2);
  return g;
})();
const NB_GODETS = Math.ceil((X_FIN - X_ALIGN_FIN) / PAS) + 2;
const godetsHaut = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.035, 0.18), bleu, NB_GODETS * VOIES.length * 2);
const godetsAile = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.025, 0.11), bleu, NB_GODETS * VOIES.length * 4);
godetsHaut.castShadow = godetsAile.castShadow = true; godetsHaut.receiveShadow = true;
godetsHaut.frustumCulled = godetsAile.frustumCulled = false;
groupeGodets.add(godetsHaut, godetsAile);
// rails des chaînes
for (const z of VOIES) for (const dz of [-0.2, 0.2]) boite(X_FIN - X_ALIGN_FIN, 0.04, 0.03, noir, (X_FIN + X_ALIGN_FIN) / 2, Y_GODET - 0.15, z + dz, groupeGodets);

// ---------- 4. tunnel de vision ----------
const vision = new THREE.Group(); scene.add(vision); vision.position.x = X_VISION;
const LONG_T = 2.6;
boite(LONG_T, 0.08, 2.3, inox, 0, 1.85, 0, vision);                 // toit
boite(LONG_T, 1.25, 0.06, inox, 0, 1.2, -1.15, vision);            // paroi arrière
const vitreT = new THREE.Mesh(new THREE.PlaneGeometry(LONG_T, 1.25), vitre); vitreT.position.set(0, 1.2, 1.15); vision.add(vitreT);
boite(0.06, 1.25, 2.3, inox, -LONG_T / 2, 1.2, 0, vision).material = inox;
for (const dx of [-LONG_T / 2, LONG_T / 2]) { const cadre = boite(0.08, 1.3, 0.08, inox, dx, 1.2, 1.15, vision); }
const leds = [];
for (const z of [-0.95, 0.95]) for (const y of [1.0, 1.55]) { const l = boite(LONG_T - 0.3, 0.04, 0.06, led.clone(), 0, y, z, vision); l.castShadow = false; leds.push(l); }
const cameras = [];
for (const dx of [-0.6, 0.6]) {
  const c = new THREE.Group(); vision.add(c); c.position.set(dx, 1.68, 0);
  boite(0.26, 0.2, 0.2, noir, 0, 0, 0, c);
  const obj = cylindre(0.06, 0.14, noir, c); obj.position.y = -0.15;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.0, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#7db4ff', transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.y = -0.72; c.add(cone); cameras.push(cone);
}
const lumiereTunnel = new THREE.PointLight('#e8f3ff', 0, 4); lumiereTunnel.position.set(0, 1.2, 0); vision.add(lumiereTunnel);

// ---------- 5. station SWIR ----------
const swir = new THREE.Group(); scene.add(swir); swir.position.x = X_SWIR;
boite(0.9, 0.55, 2.2, inox, 0, 1.55, 0, swir);
boite(0.5, 0.35, 0.5, noir, 0, 2.0, 0, swir);
const ligneIR = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.6), new THREE.MeshBasicMaterial({ color: '#ff2fb3', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
ligneIR.rotation.y = Math.PI / 2; ligneIR.position.set(0, 1.0, 0); ligneIR.scale.x = 1; swir.add(ligneIR);
const fente = boite(0.04, 0.02, 2.0, new THREE.MeshStandardMaterial({ color: '#ff2fb3', emissive: '#ff2fb3', emissiveIntensity: 3 }), 0, 1.27, 0, swir);
for (const z of [-1.05, 1.05]) boite(0.08, 1.0, 0.08, inox, 0, 0.9, z, swir);

// ---------- 6. éjection : buses ----------
const ejection = new THREE.Group(); scene.add(ejection);
for (const x of SORTIES) for (const z of VOIES) {
  const b = cylindre(0.022, 0.12, robotAccent, ejection, 12); b.rotation.z = Math.PI / 2; b.position.set(x - 0.02, Y_GODET - 0.2, z);
  const v = boite(0.1, 0.1, 0.1, noir, x - 0.13, Y_GODET - 0.22, z, ejection);
}
// goulottes vers les bacs
for (const x of SORTIES) for (const s of [-1, 1]) { const g = boite(0.7, 0.03, 0.7, inox, x, 0.15, s * 1.45, ejection); g.rotation.x = s * 0.55; }
// bouffées d'air
const bouffees = [];
const bouffeeMat = new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0, depthWrite: false });
for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), bouffeeMat.clone()); m.visible = false; scene.add(m); bouffees.push({ m, t: 9 }); }
function souffler(x, z) {
  const b = bouffees.find(b => b.t > 0.5) || bouffees[0]; b.t = 0; b.m.visible = true;
  b.m.position.set(x, Y_GODET - 0.05, z); b.dir = z < 0 ? -1 : 1;
}

// ---------- 7. bacs ----------
const groupeBacs = new THREE.Group(); scene.add(groupeBacs);
const bacs = [];
for (let k = 0; k < SORTIES.length; k++) for (const s of [-1, 1]) {
  const c = caisse(groupeBacs); c.position.set(SORTIES[k], -1.08, s * 2.0); c.rotation.y = Math.PI / 2;
  bacs.push({ x: SORTIES[k], z: s * 2.0, n: 0 });
}
// bac de retour en bout de ligne
const retour = caisse(groupeBacs); retour.position.set(X_FIN + 0.55, -1.08, 0); retour.rotation.y = Math.PI / 2;

// ---------- 8. pupitre ----------
const pupitre = new THREE.Group(); scene.add(pupitre); pupitre.position.set(-1.9, -1.1, -2.1);
boite(0.5, 1.5, 0.35, inox, 0, 0.75, 0, pupitre);
const ecranTex = new THREE.TextureLoader().load('media/ui-suivi.jpg'); ecranTex.colorSpace = THREE.SRGBColorSpace;
const ecran = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.5), new THREE.MeshBasicMaterial({ map: ecranTex, toneMapped: false }));
const boitier = boite(0.95, 0.6, 0.06, noir, 0, 1.85, 0.05, pupitre); boitier.rotation.x = -0.25;
ecran.position.set(0, 1.86, 0.09); ecran.rotation.x = -0.25; pupitre.add(ecran);
pupitre.rotation.y = 0.35;

// ---------- fruits ----------
const FRUITS = {
  'tomate-cerise': { r: 0.075, e: [1, 1, 1], couleurs: ['#c4161c', '#e2381e', '#ef7a22', '#7fa63a'], rough: 0.25 },
  'tomate': { r: 0.105, e: [1, 0.88, 1], couleurs: ['#b9141a', '#d9361f', '#e8772a', '#8aa63e'], rough: 0.25 },
  'orange': { r: 0.11, e: [1, 1, 1], couleurs: ['#f07a0c', '#f29a1d', '#e5b12a', '#9bb03a'], rough: 0.6 },
  'datte': { r: 0.07, e: [1.55, 0.85, 0.85], couleurs: ['#5a2e14', '#7a3e1b', '#9a5a28', '#3b2416'], rough: 0.45 },
  'myrtille': { r: 0.055, e: [1, 0.85, 1], couleurs: ['#2b2d5a', '#3a3b72', '#4c4a7e', '#6b7a4a'], rough: 0.75 },
};
let typeFruit = 'tomate-cerise';
const MAX_FRUITS = 1400;
const fruitMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0 });
const fruits = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), fruitMat, MAX_FRUITS);
fruits.castShadow = true; fruits.frustumCulled = false; fruits.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(fruits);
const pool = []; // {etat, voie, n, z0, classe, sortie, t, de, vers, phase}
const couleurTmp = new THREE.Color();
function appliquerType(t) {
  typeFruit = t; const f = FRUITS[t]; fruitMat.roughness = f.rough; vracMat.color.set(f.couleurs[0]);
  for (const p of pool) p.etat = 'libre';
}
appliquerType(typeFruit);

// ---------- horloge de la ligne ----------
const VITESSE = 0.85;            // m/s des godets
let distance = 0;                // avance cumulée de la chaîne
let dernierCreneau = -1;
const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), ech = new THREE.Vector3(), eul = new THREE.Euler();

function creer(n, voie) {
  if (Math.random() < 0.12) return;
  let p = pool.find(p => p.etat === 'libre');
  if (!p) { if (pool.length >= MAX_FRUITS) { p = pool.find(p => p.etat === 'bac'); if (!p) return; } else { p = {}; pool.push(p); } }
  const classe = Math.random() < 0.08 ? 3 : Math.floor(Math.random() * 3);
  const cote = VOIES[voie] < 0 ? -1 : 1;
  // la classe choisit la sortie : 3 classes × 2 côtés, défauts vers la dernière sortie, quelques retours
  let sortie = classe === 3 ? 5 : classe * 2 + (Math.random() < 0.5 ? 0 : 1);
  if (Math.random() < 0.04) sortie = -1;
  Object.assign(p, { etat: 'aligne', voie, n, z0: (Math.random() - 0.5) * 1.8, classe, sortie, cote, t: 0, phase: Math.random() * 6, taille: 0.88 + Math.random() * 0.24 });
}

function xCreneau(n) { return X_ALIGN_DEBUT + (distance - n * PAS); }

function majFruits(dt, temps) {
  const f = FRUITS[typeFruit];
  // nouveaux créneaux à l'entrée de l'aligneur
  const creneau = Math.floor(distance / PAS);
  while (dernierCreneau < creneau) { dernierCreneau++; for (let v = 0; v < VOIES.length; v++) creer(dernierCreneau, v); }
  let i = 0;
  for (const p of pool) {
    if (p.etat === 'libre') continue;
    const zV = VOIES[p.voie];
    const r = f.r * p.taille;
    if (p.etat === 'aligne' || p.etat === 'godet') {
      const x = xCreneau(p.n);
      if (x < X_ALIGN_FIN) {
        const k = THREE.MathUtils.smoothstep(x, X_ALIGN_DEBUT, X_ALIGN_FIN - 0.4);
        pos.set(x + Math.sin(temps * 9 + p.phase) * 0.02 * (1 - k), Y_GODET - 0.08 + r + Math.abs(Math.sin(temps * 11 + p.phase)) * 0.03 * (1 - k), THREE.MathUtils.lerp(p.z0, zV, k));
        eul.set(temps * 4 + p.phase, 0, -temps * 3);
      } else {
        p.etat = 'godet';
        pos.set(x, Y_GODET - 0.07 + r * 0.75, zV);
        eul.set(0, 0, -(x / r) * 0.6 + p.phase); // le fruit tourne en avançant
        const xs = p.sortie >= 0 ? SORTIES[p.sortie] : X_FIN + 0.3;
        if (x >= xs) {
          p.etat = 'vol'; p.t = 0; p.de = pos.clone();
          if (p.sortie >= 0) {
            const b = bacs[p.sortie * 2 + (p.cote > 0 ? 1 : 0)];
            p.vers = new THREE.Vector3(b.x + (Math.random() - 0.5) * 0.35, -1.0 + r + Math.random() * 0.12, b.z + (Math.random() - 0.5) * 0.22);
            souffler(xs, zV);
          } else p.vers = new THREE.Vector3(X_FIN + 0.55 + (Math.random() - 0.5) * 0.3, -0.95 + r, (Math.random() - 0.5) * 0.25);
        }
      }
    }
    if (p.etat === 'vol') {
      p.t += dt / 0.55; const k = Math.min(1, p.t);
      pos.lerpVectors(p.de, p.vers, k); pos.y += Math.sin(k * Math.PI) * 0.45;
      eul.set(k * 8, 0, k * 5);
      if (k >= 1) { p.etat = 'bac'; p.t = 0; p.repos = p.vers.clone(); p.eul = eul.clone(); }
    }
    if (p.etat === 'bac') {
      p.t += dt; pos.copy(p.repos); eul.copy(p.eul);
      if (p.t > 30) { p.etat = 'libre'; continue; }
    }
    ech.set(r * f.e[0], r * f.e[1], r * f.e[2]);
    q.setFromEuler(eul); mat4.compose(pos, q, ech); fruits.setMatrixAt(i, mat4);
    couleurTmp.set(f.couleurs[p.classe]); fruits.setColorAt(i, couleurTmp);
    i++;
  }
  fruits.count = i;
  fruits.instanceMatrix.needsUpdate = true; if (fruits.instanceColor) fruits.instanceColor.needsUpdate = true;
}

function majGodets() {
  let a = 0, b = 0; const dec = ((distance % PAS) + PAS) % PAS;
  for (let v = 0; v < VOIES.length; v++) {
    for (let j = 0; j < NB_GODETS; j++) {
      // brin supérieur
      const x = X_ALIGN_FIN + dec + j * PAS - PAS * 0.5;
      if (x > X_ALIGN_FIN - 0.1 && x < X_FIN) {
        pos.set(x, Y_GODET - 0.1, VOIES[v]); q.identity(); ech.set(1, 1, 1);
        mat4.compose(pos, q, ech); godetsHaut.setMatrixAt(a++, mat4);
        for (const s of [-1, 1]) { pos.set(x, Y_GODET - 0.06, VOIES[v] + s * 0.125); q.setFromEuler(eul.set(s * 0.65, 0, 0)); mat4.compose(pos, q, ech); godetsAile.setMatrixAt(b++, mat4); }
      }
      // brin de retour, dessous
      const xr = X_FIN - dec - j * PAS;
      if (xr > X_ALIGN_FIN && xr < X_FIN) { pos.set(xr, Y_GODET - 0.42, VOIES[v]); q.setFromEuler(eul.set(Math.PI, 0, 0)); ech.set(1, 1, 1); mat4.compose(pos, q, ech); godetsHaut.setMatrixAt(a++, mat4); }
    }
  }
  godetsHaut.count = a; godetsAile.count = b;
  godetsHaut.instanceMatrix.needsUpdate = true; godetsAile.instanceMatrix.needsUpdate = true;
}

// ---------- étapes : caméra et repères ----------
const ETAPES = [
  { pos: [7, 6.5, 11.5], vise: [-0.5, 0, 0], ancre: null },
  { pos: [-13.2, 3.4, 5.4], vise: [-10.2, 0.6, -0.5], ancre: [-10.3, 1.9, -0.2], groupe: groupeRobot },
  { pos: [-6.6, 3.0, 3.7], vise: [-6.0, 0.5, 0], ancre: [-6.1, 0.75, 0.9], groupe: aligneur },
  { pos: [-3.6, 1.55, 2.3], vise: [-3.9, 0.55, 0.1], ancre: [-3.4, 0.62, 0.75], groupe: groupeGodets },
  { pos: [-0.2, 1.9, 3.6], vise: [-1.0, 1.0, 0], ancre: [-1.0, 1.95, 0], groupe: vision },
  { pos: [3.4, 1.9, 3.0], vise: [2.05, 0.95, 0], ancre: [2.05, 1.85, 0], groupe: swir },
  { pos: [5.9, 1.05, 2.4], vise: [5.0, 0.45, 0.4], ancre: [5.4, 0.62, 0.55], groupe: ejection },
  { pos: [7.8, 2.6, 5.6], vise: [5.8, -0.7, 1.5], ancre: [5.8, -0.6, 2.0], groupe: groupeBacs },
  { pos: [-1.0, 1.7, 0.2], vise: [-1.9, 0.7, -2.1], ancre: [-1.9, 1.15, -2.0], groupe: pupitre },
];
const camPos = new THREE.Vector3(), camVise = new THREE.Vector3();
let etapeVisee = 0, etapeActive = -1, avance = 0, visible = false;

// halo de mise en valeur
const halo = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#7db4ff'));
halo.material.transparent = true; halo.material.depthTest = false; scene.add(halo);

function lissage(a, b, f) { return a + (b - a) * f; }

function majCamera(dt) {
  const n = ETAPES.length - 1;
  const s = THREE.MathUtils.clamp(avance * n, 0, n);
  const i = Math.min(n - 1, Math.floor(s)), fr = s - i;
  const e = THREE.MathUtils.smootherstep(fr, 0.3, 0.7);
  const A = ETAPES[i], B = ETAPES[i + 1];
  const p = new THREE.Vector3().fromArray(A.pos).lerp(new THREE.Vector3().fromArray(B.pos), e);
  const v = new THREE.Vector3().fromArray(A.vise).lerp(new THREE.Vector3().fromArray(B.vise), e);
  // léger arc pour éviter de traverser la machine
  p.y += Math.sin(e * Math.PI) * 1.2;
  const k = 1 - Math.pow(0.0015, dt);
  camPos.lerp(p, k); camVise.lerp(v, k);
  camera.position.copy(camPos); camera.lookAt(camVise);
  const actif = Math.round(s);
  if (actif !== etapeActive) {
    etapeActive = actif;
    cartes.forEach((c, j) => c.classList.toggle('active', j === actif));
    sommaire.forEach((b, j) => b.classList.toggle('active', j === actif));
    const g = ETAPES[actif].groupe;
    halo.visible = !!g; if (g) halo.box.setFromObject(g).expandByScalar(0.06);
  }
}

const proj = new THREE.Vector3();
function majEtiquette() {
  const E = ETAPES[etapeActive];
  if (!E || !E.ancre) { etiquette.style.opacity = 0; return; }
  proj.fromArray(E.ancre).project(camera);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  etiquette.style.transform = `translate(${(proj.x * 0.5 + 0.5) * w}px, ${(-proj.y * 0.5 + 0.5) * h}px)`;
  etiquette.style.opacity = proj.z < 1 ? 1 : 0;
  etiquette.querySelector('span').textContent = cartes[etapeActive].dataset.court || '';
}

// ---------- boucle ----------
function dimensionner() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w < h ? 55 : 38; camera.updateProjectionMatrix();
}
new ResizeObserver(dimensionner).observe(canvas);
dimensionner();
camPos.fromArray(ETAPES[0].pos); camVise.fromArray(ETAPES[0].vise);

function lireDefilement() {
  const r = section.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  avance = THREE.MathUtils.clamp(-r.top / total, 0, 1);
}
window.addEventListener('scroll', lireDefilement, { passive: true }); lireDefilement();
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '200px' }).observe(section);
function estVisible() { const r = section.getBoundingClientRect(); visible = r.top < innerHeight + 200 && r.bottom > -200; }
window.addEventListener('scroll', estVisible, { passive: true }); estVisible();

sommaire.forEach((b, j) => b.addEventListener('click', () => {
  const r = section.getBoundingClientRect(); const total = r.height - window.innerHeight;
  window.scrollTo({ top: window.scrollY + r.top + total * (j / (ETAPES.length - 1)) + 2, behavior: 'smooth' });
}));
section.querySelectorAll('[data-fruit3d]').forEach(b => b.addEventListener('click', () => {
  section.querySelectorAll('[data-fruit3d]').forEach(x => x.classList.toggle('active', x === b));
  appliquerType(b.dataset.fruit3d);
}));

const horloge = new THREE.Clock();
let temps = 0, tRobot = 0;

function avancer(dt) {
  temps += dt; distance += VITESSE * dt;
  for (const r of rouleaux) r.rotation.y += dt * 6;
  majGodets(); majFruits(dt, temps);
  // éclairs du tunnel et balayage SWIR
  const eclair = Math.max(0, Math.sin(temps * 14));
  for (const l of leds) l.material.emissiveIntensity = 1.6 + eclair * 2.2;
  lumiereTunnel.intensity = (1.6 + eclair * 2.2) * 1.6;
  for (const c of cameras) c.material.opacity = 0.05 + eclair * 0.07;
  ligneIR.material.opacity = 0.22 + Math.sin(temps * 6) * 0.12;
  // bouffées d'air
  for (const b of bouffees) if (b.m.visible) {
    b.t += dt; const k = b.t / 0.35; b.m.scale.setScalar(0.4 + k * 2.2);
    b.m.position.z += (b.dir || 1) * dt * 1.2; b.m.material.opacity = Math.max(0, 0.55 * (1 - k));
    if (k >= 1) b.m.visible = false;
  }
  // robot
  tRobot = (tRobot + dt) % DUREE_ROBOT;
  const s = tRobot / DUREE_ROBOT * (trajet.length - 1); const i = Math.floor(s), f = THREE.MathUtils.smootherstep(s - i, 0, 1);
  const A = trajet[i], B = trajet[Math.min(i + 1, trajet.length - 1)];
  poserRobot(new THREE.Vector3(lissage(A[0], B[0], f), lissage(A[1], B[1], f), lissage(A[2], B[2], f)), lissage(A[3], B[3], f));
  robot.prise.visible = A[4] >= 1 || (B[4] === 1 && f > 0.5);
  if (robot.prise.userData.contenu) robot.prise.userData.contenu.visible = A[4] === 1;
  halo.material.opacity = 0.35 + Math.sin(temps * 3) * 0.25;
  majCamera(dt); majEtiquette();
  renderer.render(scene, camera);
}

// ligne déjà en production à l'arrivée : 20 s simulées sans rendu
for (let k = 0; k < 600; k++) { distance += VITESSE / 30; majFruits(1 / 30, k / 30); }
for (const p of pool) if (p.etat === 'bac') p.t = Math.random() * 20;

function image() {
  requestAnimationFrame(image);
  const dt = Math.min(0.05, horloge.getDelta());
  if (visible) avancer(dt);
}
image();

// crochet de contrôle (rendu sans écran) : calcule n images d'un coup
window.__freescan3d = { calculer(n = 60, dt = 1 / 30) { lireDefilement(); for (let k = 0; k < n; k++) avancer(dt); }, etat() { const c = {}; for (const p of pool) c[p.etat] = (c[p.etat] || 0) + 1; const g = pool.find(p => p.etat === "godet"); return { c, distance, compte: fruits.count, g: g && { n: g.n, x: xCreneau(g.n), taille: g.taille, classe: g.classe } }; } };
