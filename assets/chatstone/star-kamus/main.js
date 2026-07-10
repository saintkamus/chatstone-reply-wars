// STAR KAMUS — side-view 3D space shooter. Two stages, two very angry bosses.
import * as THREE from './vendor/three.module.js';
import { ChipAudio } from './audio.js?v=16';
import { DualSense } from './dualsense.js?v=16';

const audio = new ChipAudio();
const dualsense = new DualSense();

// voice comm assets (generated externally, e.g. Seedance). Missing files are fine:
// comms fall back to text + blips. Drop mp3/wav/m4a/ogg into assets/voice/.
const VOICE_IDS = [
  'k_launch', 'k_boss1', 'k_clear1', 'k_stage2', 'k_boss2', 'k_victory',
  'k_hit', 'k_respawn', 'k_power',
  'c_briefing1', 'c_heavy', 'c_warning1', 'c_briefing2', 'c_mines', 'c_warning2',
  'c_lastlife', 'c_gameover', 'c_victory',
  // stage 3
  'c_briefing3', 'k_stage3', 'z_swarm', 'c_warning3', 'k_boss3', 'c_pods', 'k_final',
  // stage 4
  'c_briefing4', 'k_stage4', 'c_armor', 'c_warning4', 'k_boss4', 'k_home',
  // stage 5
  'k_clear4', 'c_briefing5', 'k_stage5', 'd_burrow', 'c_warning5', 'k_boss5',
  // supporting cast (short-film characters): n=Nova z=Zeraa d=Dr.Klorp v=Vex
  'n_shield', 'v_taunt1',
  // stage 6
  'k_clear5', 'c_briefing6', 'k_stage6', 'n_junk', 'c_warning6', 'k_boss6', 'k_scrap',
  // stage 7 — the betrayal
  'k_clear6', 'z_passage', 'c_briefing7', 'k_stage7',
  'z_betray', 'k_betray', 'v_gloat', 'c_rage',
  'c_warning7', 'z_boss', 'z_flee', 'n_orbital', 'k_survive',
  // stage 8 — the ghost nebula
  'k_clear7', 'c_steel', 'c_briefing8', 'k_stage8', 'd_ghost', 'c_warning8', 'k_boss8', 'z_watch',
  // stage 9 — the brood-hive
  'k_clear8', 'c_map', 'c_briefing9', 'k_stage9', 'd_hive', 'v_fury', 'c_warning9', 'k_boss9',
  // stage 10 — the armada
  'k_clear9', 'c_briefing10', 'k_stage10', 'n_argo', 'v_taunt10', 'z_assist',
  'c_warning10', 'k_boss10', 'v_boss10', 'v_shock', 'z_side', 'v_flee',
  // stage 11 — the palace
  'k_clear10', 'c_briefing11', 'k_stage11', 'v_palace', 'c_shield', 'z_gate',
  'c_warning11', 'v_boss11', 'k_boss11', 'v_defeat',
  // stage 12 — the finale
  'k_clear11', 'c_briefing12', 'k_stage12', 'c_dive', 'k_core', 'c_warning12',
  'v_eternal', 'v_form2', 'z_sacrifice', 'k_rage', 'v_end', 'z_alive',
  // credits stinger
  'v_post',
];
audio.fetchVoices('assets/voice/', VOICE_IDS);

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x02030a, 90, 220);

// guard against a zero-sized window at load (e.g. a preview panel that hasn't
// laid out yet) — an Infinity/NaN aspect poisons every position derived from it
const safeAspect = () => Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight);
const camera = new THREE.PerspectiveCamera(52, safeAspect(), 1, 400);
camera.position.set(0, 3, 62);
camera.lookAt(0, 0, 0);

// visible half-extents of the z=0 gameplay plane (screen space, side view)
const view = { w: 40, h: 26 };
// gameplay half-extents: fw = forward axis (+x, where enemies come from),
// lat = lateral axis (y). In side view fw maps to screen-x; in top-down view
// the camera is rotated 90° so fw maps to screen-y and lat to screen-x.
const play = { fw: 40, lat: 26 };
let viewMode = 'side'; // 'side' | 'top' | 'rail'

function computeView() {
  const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 62;
  view.h = half;
  view.w = half * camera.aspect;
  if (viewMode === 'side') {
    play.fw = view.w;
    play.lat = view.h;
  } else if (viewMode === 'top') {
    play.fw = half;
    play.lat = half * camera.aspect;
  } else {
    // rail: camera chases the ship down the +x axis; fw = draw distance ahead,
    // lat = track width. Fixed sizes — perspective does the rest.
    play.fw = 60;
    play.lat = 26;
  }
}
computeView();

window.addEventListener('resize', () => {
  camera.aspect = safeAspect();
  camera.updateProjectionMatrix();
  renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
  computeView();
  onViewRecovered();
});

scene.add(new THREE.AmbientLight(0x304060, 1.6));
const sun = new THREE.DirectionalLight(0xbfe0ff, 2.2);
sun.position.set(-20, 30, 40);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xff70c0, 0.6);
fill.position.set(30, -20, 20);
scene.add(fill);

// ---------------------------------------------------------------- backdrop
function makeStars(count, z, size, color) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * (view.w + 30);
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * (view.h + 14);
    pos[i * 3 + 2] = z + (Math.random() * 2 - 1) * 4;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, fog: false });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return pts;
}
const starLayers = [
  { pts: makeStars(160, -12, 0.55, 0xffffff), speed: 26, z: -12 },
  { pts: makeStars(140, -30, 0.8, 0x9fc8ff), speed: 12, z: -30 },
  { pts: makeStars(110, -55, 1.2, 0x5f6fb8), speed: 5, z: -55 },
];

function scatterStars() {
  for (const layer of starLayers) {
    const a = layer.pts.geometry.attributes.position;
    for (let i = 0; i < a.count; i++)
      a.setXYZ(i,
        (Math.random() * 2 - 1) * (view.w + 30),
        (Math.random() * 2 - 1) * (view.h + 14),
        layer.z + (Math.random() * 2 - 1) * 4);
    a.needsUpdate = true;
  }
}

// if the page loaded with a degenerate size, re-scatter the backdrop once a
// real layout arrives (positions built from a bad aspect stay broken otherwise)
let viewWasDegenerate = !Number.isFinite(view.w) || view.w <= 5;
function onViewRecovered() {
  if (!viewWasDegenerate) return;
  if (!Number.isFinite(view.w) || view.w <= 5) return;
  viewWasDegenerate = false;
  scatterStars();
  planet.position.set(view.w * 0.7, -14, -110);
  for (const r of bgRocks)
    r.position.set((Math.random() * 2 - 1) * view.w * 1.4,
      (Math.random() * 2 - 1) * view.h, -20 - Math.random() * 30);
}
function scrollStars(dt) {
  for (const layer of starLayers) {
    const a = layer.pts.geometry.attributes.position;
    const wrap = view.w + 30;
    for (let i = 0; i < a.count; i++) {
      let x = a.getX(i) - layer.speed * dt;
      if (x < -wrap) x += wrap * 2;
      a.setX(i, x);
    }
    a.needsUpdate = true;
  }
}

// distant ringed planet (recolored per stage)
const planet = new THREE.Group();
let planetBallMat, planetRingMat;
{
  planetBallMat = new THREE.MeshStandardMaterial({ color: 0x7040a0, emissive: 0x1a0a30, roughness: 0.9 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(22, 40, 40), planetBallMat);
  planet.add(ball);
  planetRingMat = new THREE.MeshStandardMaterial({ color: 0xc0a0ff, emissive: 0x201040, roughness: 0.8 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(33, 2.6, 8, 60), planetRingMat);
  ring.rotation.x = Math.PI / 2.25;
  planet.add(ring);
  planet.position.set(view.w * 0.7, -14, -110);
  scene.add(planet);
}

// drifting background asteroids
const bgRocks = [];
{
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x556070, roughness: 1 });
  for (let i = 0; i < 10; i++) {
    const r = new THREE.Mesh(rockGeo, rockMat);
    const s = 1 + Math.random() * 3;
    r.scale.set(s, s * (0.7 + Math.random() * 0.6), s);
    r.position.set((Math.random() * 2 - 1) * view.w * 1.4,
      (Math.random() * 2 - 1) * view.h, -20 - Math.random() * 30);
    r.userData.spin = (Math.random() - 0.5) * 1.2;
    r.userData.speed = 6 + Math.random() * 6;
    scene.add(r);
    bgRocks.push(r);
  }
}

// ---------------------------------------------------------------- planet surface (top-down stages)
const groundGroup = new THREE.Group();
groundGroup.visible = false;
scene.add(groundGroup);
const groundTiles = [];
const clouds = [];
let grassMatRef;
{
  const TILE = 260;
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2e5c30, roughness: 1, flatShading: true });
  grassMatRef = grassMat;
  const bldgMat = new THREE.MeshStandardMaterial({ color: 0x6a7280, roughness: 0.8, metalness: 0.2 });
  const burnMat = new THREE.MeshStandardMaterial({ color: 0x3a2018, emissive: 0xff4400, emissiveIntensity: 0.9, roughness: 1 });
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x1d4020, roughness: 1, flatShading: true });
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 1 });

  for (let t = 0; t < 2; t++) {
    const tile = new THREE.Group();
    const geo = new THREE.PlaneGeometry(TILE, 150, 26, 14);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.random() * -1.2); // gentle terrain dents
    geo.computeVertexNormals();
    tile.add(new THREE.Mesh(geo, grassMat));

    for (const yy of [-14, 8, 30]) { // roads across the scroll direction
      const road = new THREE.Mesh(new THREE.BoxGeometry(TILE, 3.2, 0.2), roadMat);
      road.position.set(0, yy, 0.4);
      tile.add(road);
    }
    for (let i = 0; i < 26; i++) { // city blocks, a few of them burning
      const w = 2 + Math.random() * 3, d = 2 + Math.random() * 3, h = 1.5 + Math.random() * 4.5;
      const burning = Math.random() < 0.22;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), burning ? burnMat : bldgMat);
      b.position.set((Math.random() - 0.5) * (TILE - 12), (Math.random() - 0.5) * 130, h / 2);
      tile.add(b);
    }
    for (let i = 0; i < 22; i++) {
      const tr = new THREE.Mesh(new THREE.ConeGeometry(0.9 + Math.random(), 2.2 + Math.random() * 1.6, 6), treeMat);
      tr.position.set((Math.random() - 0.5) * (TILE - 8), (Math.random() - 0.5) * 140, 1.2);
      tr.rotation.x = Math.PI / 2;
      tile.add(tr);
    }
    tile.position.set(t * TILE, 0, -8);
    tile.userData.deco = tile.children.slice(4); // buildings + trees (hidden on rail stages)
    groundGroup.add(tile);
    groundTiles.push(tile);
  }

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.26, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(5 + Math.random() * 9, 10), cloudMat);
    c.position.set((Math.random() * 2 - 1) * 60, (Math.random() * 2 - 1) * 40, 14 + Math.random() * 8);
    c.scale.y = 0.55;
    groundGroup.add(c);
    clouds.push(c);
  }
}

// canyon walls (stage 5): two wrapping ridges of rock pinning the lateral edges
const canyonGroup = new THREE.Group();
canyonGroup.visible = false;
groundGroup.add(canyonGroup);
const canyonWalls = [];
{
  const canyonMat = new THREE.MeshStandardMaterial({ color: 0x6a3a26, roughness: 1, flatShading: true });
  for (let s = 0; s < 2; s++) {
    for (const side of [-1, 1]) {
      const wall = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5 + Math.random() * 3, 0), canyonMat);
        r.position.set(i * 29 - 130 + (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 4, -3 + Math.random() * 2);
        r.scale.z = 1.6;
        r.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        wall.add(r);
      }
      wall.userData.side = side;
      wall.userData.seg = s;
      canyonGroup.add(wall);
      canyonWalls.push(wall);
    }
  }
}
function canyonWallY() {
  return Math.min(play.lat * 0.75, 34);
}

// rail-mode conduit: glowing pylons + overhead arch rings streaming past
const railGroup = new THREE.Group();
railGroup.visible = false;
groundGroup.add(railGroup);
const railSegs = [];
let railMats; // recolorable per stage (neon conduit vs. bone-and-sinew hive)
{
  const pylonMatA = new THREE.MeshBasicMaterial({ color: 0x3ee6ff });
  const pylonMatB = new THREE.MeshBasicMaterial({ color: 0xff4bd8 });
  const archMat = new THREE.MeshBasicMaterial({ color: 0x60d0ff, transparent: true, opacity: 0.65 });
  railMats = { a: pylonMatA, b: pylonMatB, arch: archMat };
  for (let s = 0; s < 2; s++) {
    const seg = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const x = i * 26 - 130;
      for (const side of [-1, 1]) {
        const py = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 12, 6),
          i % 2 === 0 ? pylonMatA : pylonMatB);
        py.rotation.x = Math.PI / 2; // stand upright (z axis)
        py.position.set(x, side * 30, -2);
        seg.add(py);
      }
    }
    for (const x of [-65, 65]) { // arches spanning the track
      const arch = new THREE.Mesh(new THREE.TorusGeometry(26, 0.7, 6, 40), archMat);
      arch.rotation.y = Math.PI / 2; // ring plane perpendicular to travel
      arch.position.set(x, 0, -8);
      seg.add(arch);
    }
    seg.position.x = s * 260;
    railGroup.add(seg);
    railSegs.push(seg);
  }
}

function updateGround(dt) {
  const TILE = 260;
  const sp = viewMode === 'rail' ? 70 : 24; // rail mode = raw speed
  for (const tile of groundTiles) {
    tile.position.x -= sp * dt;
    if (tile.position.x < -TILE) tile.position.x += TILE * 2;
  }
  if (canyonGroup.visible) {
    for (const w of canyonWalls) {
      w.position.x -= sp * dt;
      if (w.position.x < -TILE) w.position.x += TILE * 2;
    }
  }
  if (railGroup.visible) {
    for (const seg of railSegs) {
      seg.position.x -= sp * dt;
      if (seg.position.x < -TILE) seg.position.x += TILE * 2;
    }
  }
  for (const c of clouds) {
    c.position.x -= (sp + 16) * dt;
    if (c.position.x < -(play.fw + 60)) {
      c.position.x = play.fw + 60;
      c.position.y = (Math.random() * 2 - 1) * (play.lat + 10);
    }
  }
}

// cinematic camera blend: on a mid-stage view switch the camera SWINGS from
// the old perspective into the new one instead of cutting
let camBlend = 1;
const camFrom = { pos: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), target: new THREE.Vector3() };
const lastCamTarget = new THREE.Vector3();
function beginCamBlend() {
  camFrom.pos.copy(camera.position);
  camFrom.up.copy(camera.up);
  camFrom.target.copy(lastCamTarget);
  camBlend = 0;
}

// mid-stage view switch (the finale dives from overflight into the core):
// clears the field for a clean transition, repositions the ship, reskins scenery
function switchView(mode, opts) {
  const o = opts || {};
  beginCamBlend();
  applyViewMode(mode);
  if (mode !== 'side') grassMatRef.color.setHex(o.groundColor || 0x2e5c30);
  canyonGroup.visible = false;
  railGroup.visible = mode === 'rail';
  if (railGroup.visible) {
    railSegs.forEach((s, i) => { s.position.x = i * 260; });
    const rc = o.railColors || { a: 0x3ee6ff, b: 0xff4bd8, arch: 0x60d0ff };
    railMats.a.color.setHex(rc.a);
    railMats.b.color.setHex(rc.b);
    railMats.arch.color.setHex(rc.arch);
  }
  for (const tile of groundTiles)
    for (const d of tile.userData.deco) d.visible = mode !== 'rail';
  if (o.fogFar) scene.fog.far = o.fogFar;
  if (o.fogColor) scene.fog.color.setHex(o.fogColor);
  setBackdrop(o.backdrop, o.backdropTint);
  for (const p of enemyBullets) release(p);
  for (let i = enemies.length - 1; i >= 0; i--) {
    scene.remove(enemies[i].mesh);
    enemies.splice(i, 1);
  }
  player.pos.set(-play.fw + 12, 0, 0);
  player.invuln = Math.max(player.invuln, 1.5);
  ship.rotation.set(0, 0, 0);
  shake = Math.max(shake, 0.6);
}

function applyViewMode(mode) {
  viewMode = mode;
  const space = mode === 'side'; // starfield backdrop only makes sense side-on
  for (const l of starLayers) l.pts.visible = space;
  planet.visible = space;
  for (const r of bgRocks) r.visible = space;
  groundGroup.visible = !space;
  scene.fog.far = mode === 'rail' ? 300 : mode === 'top' ? 170 : 220;
  scene.fog.color.setHex(0x02030a);
  // roll the hull so the wings face the camera in overhead/chase views
  shipModel.rotation.x = space ? 0 : Math.PI / 2;
  refreshBackdrop();
  computeView();
}

// ---------------------------------------------------------------- fleet backdrop (stage 10)
// enemy capital ships drifting deep in the background of the side view
const fleetGroup = new THREE.Group();
fleetGroup.visible = false;
scene.add(fleetGroup);
const fleetShips = [];
{
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2a2030, metalness: 0.7, roughness: 0.6 });
  const portMat = new THREE.MeshBasicMaterial({ color: 0xff5050 });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Group();
    const len = 34 + i * 10;
    s.add(new THREE.Mesh(new THREE.BoxGeometry(len, 5, 4), hullMat));
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 3), hullMat);
    tower.position.set(len * 0.25, 4, 0);
    s.add(tower);
    const prow = new THREE.Mesh(new THREE.ConeGeometry(2.6, 8, 4), hullMat);
    prow.rotation.z = Math.PI / 2;
    prow.position.x = -len / 2 - 4;
    s.add(prow);
    for (let p = 0; p < 6; p++) { // running lights
      const port = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.2), portMat);
      port.position.set(p * (len / 6) - len / 2 + 2, 0.8, 2.1);
      s.add(port);
    }
    s.position.set(i * 60 - 40, i * 14 - 14, -45 - i * 8);
    s.userData.speed = 2 + i * 0.8;
    fleetGroup.add(s);
    fleetShips.push(s);
  }
}
function updateFleet(dt) {
  for (const s of fleetShips) {
    s.position.x -= s.userData.speed * dt;
    if (s.position.x < -view.w * 1.8) s.position.x = view.w * 1.8;
  }
}

// ------- side-view backdrop dressing: every stage gets its own skyline -------
const backdrops = {};
let backdropName = null;
const nebulaWisps = [];
{
  // 'station': a friendly orbital dock on the horizon (stage 1)
  const g1 = new THREE.Group();
  const stMat = new THREE.MeshStandardMaterial({ color: 0x5a6a80, metalness: 0.6, roughness: 0.5 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 14, 10), stMat);
  hub.rotation.z = Math.PI / 2;
  g1.add(hub);
  for (const xx of [-4, 4]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 1.2, 8, 28), stMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = xx;
    g1.add(ring);
  }
  for (const yy of [-13, 13]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2a4a7a, metalness: 0.4, roughness: 0.3 }));
    panel.position.set(0, yy, 0);
    g1.add(panel);
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4040 }));
  beacon.position.set(0, 8, 0);
  g1.add(beacon);
  g1.userData.beacon = beacon;
  g1.userData.rings = [g1.children[1], g1.children[2]];
  g1.position.set(18, 6, -70);
  backdrops.station = g1;

  // 'bigrocks': colossi drifting behind the belt (stage 2)
  const g2 = new THREE.Group();
  const brMat = new THREE.MeshStandardMaterial({ color: 0x4a5262, roughness: 1, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(9 + i * 4, 0), brMat);
    r.position.set(i * 45 - 60, i * 12 - 18, -60 - i * 12);
    r.userData.spin = 0.03 + Math.random() * 0.05;
    r.userData.speed = 1.2 + i * 0.5;
    g2.add(r);
  }
  backdrops.bigrocks = g2;

  // 'nebula': glowing gas banks, tintable per stage (stages 3, 8, finale heart)
  const g3 = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4030, transparent: true, opacity: 0.12, depthWrite: false });
    const w = new THREE.Mesh(new THREE.CircleGeometry(12 + Math.random() * 16, 12), mat);
    w.position.set((Math.random() * 2 - 1) * 90, (Math.random() * 2 - 1) * 34, -42 - Math.random() * 30);
    w.scale.y = 0.5 + Math.random() * 0.4;
    w.userData.speed = 1 + Math.random() * 2;
    w.userData.pulse = Math.random() * 6;
    g3.add(w);
    nebulaWisps.push(w);
  }
  backdrops.nebula = g3;

  // 'wrecks': dead hulks of the first war (stage 6)
  const g4 = new THREE.Group();
  const wkMat = new THREE.MeshStandardMaterial({ color: 0x363c46, metalness: 0.6, roughness: 0.7 });
  for (let i = 0; i < 3; i++) {
    const wreck = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(26 + i * 8, 5, 4), wkMat);
    hull.rotation.z = (Math.random() - 0.5) * 0.7;
    wreck.add(hull);
    const prow = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 4), wkMat);
    prow.rotation.z = Math.PI / 2 + (Math.random() - 0.5);
    prow.position.set(-(16 + i * 4), 4, 0);
    wreck.add(prow);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff6020 }));
    ember.position.set(i * 4 - 4, -1, 2.2);
    wreck.add(ember);
    wreck.userData.ember = ember;
    wreck.position.set(i * 55 - 50, i * 16 - 16, -52 - i * 10);
    wreck.userData.speed = 1.5 + i * 0.6;
    g4.add(wreck);
  }
  backdrops.wrecks = g4;

  for (const k in backdrops) {
    backdrops[k].visible = false;
    scene.add(backdrops[k]);
  }
}

function refreshBackdrop() {
  const show = viewMode === 'side';
  fleetGroup.visible = show && backdropName === 'fleet';
  for (const k in backdrops) backdrops[k].visible = show && backdropName === k;
}

function setBackdrop(name, tint) {
  backdropName = name || null;
  if (name === 'nebula' && tint)
    for (const w of nebulaWisps) w.material.color.setHex(tint);
  refreshBackdrop();
}

function updateBackdrop(dt, t) {
  if (backdropName === 'fleet') { updateFleet(dt); return; }
  const g = backdrops[backdropName];
  if (!g || !g.visible) return;
  if (backdropName === 'station') {
    for (const r of g.userData.rings) r.rotation.x += 0.12 * dt;
    g.userData.beacon.visible = Math.floor(t * 1.5) % 2 === 0;
    g.position.x -= 0.5 * dt;
    if (g.position.x < -view.w * 1.7) g.position.x = view.w * 1.7;
  } else if (backdropName === 'bigrocks') {
    for (const r of g.children) {
      r.rotation.y += r.userData.spin * dt;
      r.position.x -= r.userData.speed * dt;
      if (r.position.x < -view.w * 1.9) r.position.x = view.w * 1.9;
    }
  } else if (backdropName === 'nebula') {
    for (const w of g.children) {
      w.position.x -= w.userData.speed * dt;
      w.material.opacity = 0.09 + Math.sin(t * 0.6 + w.userData.pulse) * 0.05;
      if (w.position.x < -view.w * 2) w.position.x = view.w * 2;
    }
  } else if (backdropName === 'wrecks') {
    for (const wreck of g.children) {
      wreck.position.x -= wreck.userData.speed * dt;
      wreck.rotation.z += 0.01 * dt;
      wreck.userData.ember.visible = Math.floor(t * 2 + wreck.position.x) % 3 !== 0;
      if (wreck.position.x < -view.w * 1.9) wreck.position.x = view.w * 1.9;
    }
  }
}

// allied fire: the Argo's broadside volleys + Zeraa's strafing runs use the
// player-bullet pool, so they damage enemies and bosses like your own shots
function argoVolley() {
  showMsg('ARGO BROADSIDE!', 1.6);
  audio.radio();
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      if (state !== 'playing') return;
      const b = take(playerBullets);
      if (!b) return;
      b.mesh.position.set(-play.fw - 4, (Math.random() * 2 - 1) * (play.lat - 6), 0);
      b.vel.set(70, 0, 0);
      b.mesh.rotation.z = Math.PI / 2;
      b.life = 2.4;
      audio.shoot();
    }, i * 110);
  }
}

// Zeraa's cameo dart — streaks across the field on a strafing run
const zeraaDart = new THREE.Group();
{
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xd8dce8, metalness: 0.8, roughness: 0.2 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5, 8), silverMat);
  body.rotation.z = -Math.PI / 2; // nose forward (+x)
  zeraaDart.add(body);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xff70d8 }));
  trim.rotation.y = Math.PI / 2;
  zeraaDart.add(trim);
  zeraaDart.add(new THREE.PointLight(0xff70d8, 30, 20));
  zeraaDart.visible = false;
  scene.add(zeraaDart);
}
let zeraaRunT = -1;
function zeraaRun() {
  zeraaRunT = 0;
  zeraaDart.visible = true;
}
function updateZeraaRun(dt) {
  if (zeraaRunT < 0) return;
  zeraaRunT += dt;
  const k = zeraaRunT / 2.2; // full crossing in 2.2s
  zeraaDart.position.set(-play.fw - 8 + k * (play.fw * 2 + 16),
    10 - k * 6 + Math.sin(zeraaRunT * 6) * 1.5, 0);
  zeraaDart.rotation.x = Math.sin(zeraaRunT * 6) * 0.4;
  if (zeraaRunT % 0.12 < dt && state === 'playing') { // strafing as she goes
    const b = take(playerBullets);
    if (b) {
      b.mesh.position.copy(zeraaDart.position).add(new THREE.Vector3(2.8, 0, 0));
      b.vel.set(95, 0, 0);
      b.mesh.rotation.z = Math.PI / 2;
      b.life = 1.4;
    }
  }
  if (k >= 1) {
    zeraaRunT = -1;
    zeraaDart.visible = false;
  }
}

// ---------------------------------------------------------------- player
// `ship` carries position + banking; `shipModel` holds the meshes and gets a
// base roll in top/rail views so the wings lie flat toward the camera
const ship = new THREE.Group();
const shipModel = new THREE.Group();
ship.add(shipModel);
{
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xd8e4f0, metalness: 0.5, roughness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x2fae5c, metalness: 0.4, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5.4, 10), hullMat);
  body.rotation.z = -Math.PI / 2;
  shipModel.add(body);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x35d0ff, emissive: 0x0a4a70, metalness: 0.2, roughness: 0.1 }));
  canopy.position.set(0.5, 0.5, 0);
  canopy.scale.set(1.5, 0.8, 0.8);
  shipModel.add(canopy);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 3.4), accentMat);
  wing.position.set(-1.1, -0.1, 0);
  shipModel.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.14), accentMat);
  tail.position.set(-1.9, 0.7, 0);
  shipModel.add(tail);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 8),
    new THREE.MeshBasicMaterial({ color: 0x66eaff }));
  flame.rotation.z = Math.PI / 2;
  flame.position.set(-3.4, 0, 0);
  shipModel.add(flame);
  ship.userData.flame = flame;
  const glow = new THREE.PointLight(0x44ccff, 30, 22);
  glow.position.set(-3.2, 0, 0);
  shipModel.add(glow);
  // one-hit shield bubble (max-power pickup reward)
  const shield = new THREE.Mesh(new THREE.SphereGeometry(3.1, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0x50d8ff, transparent: true, opacity: 0.22, depthWrite: false }));
  shield.visible = false;
  shipModel.add(shield);
  ship.userData.shield = shield;
  scene.add(ship);
}

const player = {
  pos: new THREE.Vector3(-play.fw + 12, 0, 0),
  speed: 34,
  radius: 1.5,
  fireCool: 0,
  weapon: 1,       // 1..3
  options: 0,      // 0..2 orbital drones
  droneMode: 'seeker', // 'seeker' (auto-lock, low dps) | 'plasma' (beams, depletes)
  plasma: 100,     // plasma charge 0..100
  nova: 0,         // stored NOVA bomb (0/1)
  heat: 0,         // main-gun heat 0..100 (full spread overheats)
  overheated: false,
  shield: false,   // absorbs one hit
  lives: 3,
  invuln: 0,
  alive: true,
  respawnT: 0,
};

// 2D distance on the gameplay plane — z is presentation only (ground units
// sit below the flight plane but are still shootable / dodgeable)
function d2(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// orbital option drones (Gradius-style): circle the ship, fire when you fire
const optionMeshes = [];
{
  const optMat = new THREE.MeshStandardMaterial({ color: 0x50e0ff, emissive: 0x1060a0, metalness: 0.5, roughness: 0.3 });
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.8), optMat));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 5, 16),
      new THREE.MeshBasicMaterial({ color: 0x9af0ff })));
    g.visible = false;
    scene.add(g);
    optionMeshes.push(g);
  }
}

// ---------------------------------------------------------------- pools
function makePool(n, build) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const m = build();
    m.visible = false;
    scene.add(m);
    arr.push({ mesh: m, active: false, vel: new THREE.Vector3(), life: 0 });
  }
  return arr;
}
function take(pool) {
  for (const p of pool) if (!p.active) { p.active = true; p.mesh.visible = true; return p; }
  return null;
}
function release(p) { p.active = false; p.mesh.visible = false; }

const pBulletMat = new THREE.MeshBasicMaterial({ color: 0x8affff });
const playerBullets = makePool(110, () => {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.6, 3, 8), pBulletMat);
  m.rotation.z = Math.PI / 2;
  return m;
});
const eBulletMat = new THREE.MeshBasicMaterial({ color: 0xff7040 });
const eBulletCoreMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0 });
const enemyBullets = makePool(220, () => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), eBulletMat));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), eBulletCoreMat));
  return g;
});

const partMats = [
  new THREE.MeshBasicMaterial({ color: 0xffb040 }),
  new THREE.MeshBasicMaterial({ color: 0xff5030 }),
  new THREE.MeshBasicMaterial({ color: 0xfff0c0 }),
];
const particles = makePool(220, () =>
  new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), partMats[(Math.random() * 3) | 0]));

function burst(pos, count, speed, scale) {
  for (let i = 0; i < count; i++) {
    const p = take(particles);
    if (!p) return;
    p.mesh.position.copy(pos);
    p.vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize().multiplyScalar(speed * (0.3 + Math.random()));
    p.life = 0.5 + Math.random() * 0.5;
    p.mesh.scale.setScalar((scale || 1) * (0.6 + Math.random() * 0.8));
  }
}

// power-up
const powerups = makePool(6, () => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.1),
    new THREE.MeshStandardMaterial({ color: 0x30ffb0, emissive: 0x108050, metalness: 0.3 })));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.12, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0x80ffd0 })));
  return g;
});
function dropPowerup(pos) {
  const p = take(powerups);
  if (!p) return;
  p.mesh.position.copy(pos);
  p.vel.set(-8, 0, 0);
  p.life = 12;
  p.baseY = pos.y;
}

// wide plasma beams (the drones' heavy mode): pierce up to 3 targets
const beamMat = new THREE.MeshBasicMaterial({ color: 0xaef4ff, transparent: true, opacity: 0.85 });
const beams = makePool(12, () => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.4, 0.4), beamMat));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })));
  return g;
});
function spawnBeam(pos) {
  const b = take(beams);
  if (!b) return;
  b.mesh.position.set(pos.x + 3, pos.y, 0);
  b.vel.set(80, 0, 0);
  b.life = 1.3;
  b.pierce = 3;
  b.hitSet = new Set();
  audio.beamFire();
  shotPulse('beam');
}

// NOVA bomb pickup: rare, blinding, wipes every bullet on screen
const novas = makePool(2, () => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc0c0ff, emissiveIntensity: 1.2 })));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.1, 6, 22),
    new THREE.MeshBasicMaterial({ color: 0xffffff })));
  g.add(new THREE.PointLight(0xffffff, 40, 24));
  return g;
});
let novaDropped = false; // at most one drop per stage
function dropNova(pos) {
  const p = take(novas);
  if (!p) return;
  p.mesh.position.copy(pos);
  p.vel.set(-7, 0, 0);
  p.life = 14;
  p.baseY = pos.y;
}

// ---------------------------------------------------------------- enemies
const enemies = [];

const droneMat = new THREE.MeshStandardMaterial({ color: 0xff4560, emissive: 0x500a14, metalness: 0.4, roughness: 0.4 });
const darterMat = new THREE.MeshStandardMaterial({ color: 0x30c8ff, emissive: 0x083048, metalness: 0.5, roughness: 0.3 });
const turretMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b0, emissive: 0x181c24, metalness: 0.7, roughness: 0.35 });
const heavyMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, emissive: 0x101c0a, metalness: 0.5, roughness: 0.5 });
const spikeMat = new THREE.MeshStandardMaterial({ color: 0xff8030, emissive: 0x401800 });
const mineMat = new THREE.MeshStandardMaterial({ color: 0x33383f, emissive: 0x0c0e12, metalness: 0.7, roughness: 0.4 });
const mineGlowMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
const orbiterMat = new THREE.MeshStandardMaterial({ color: 0xb060ff, emissive: 0x30104a, metalness: 0.5, roughness: 0.3 });
const astMat = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 1 });
const weaverMat = new THREE.MeshStandardMaterial({ color: 0xd040a0, emissive: 0x400a30, metalness: 0.5, roughness: 0.35 });
const raiderMat = new THREE.MeshStandardMaterial({ color: 0x40e0d0, emissive: 0x0a3830, metalness: 0.6, roughness: 0.3 });
const tankMat = new THREE.MeshStandardMaterial({ color: 0x4f5a3a, emissive: 0x11140a, metalness: 0.5, roughness: 0.6 });
const burrowerMat = new THREE.MeshStandardMaterial({ color: 0xb06a28, emissive: 0x2a1404, metalness: 0.5, roughness: 0.5 });
const moundMat = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 1, flatShading: true });
const junkMat = new THREE.MeshStandardMaterial({ color: 0x7a8290, metalness: 0.7, roughness: 0.5 });
const rustMat = new THREE.MeshStandardMaterial({ color: 0x8a5a30, metalness: 0.4, roughness: 0.8 });
const phantomBaseMat = new THREE.MeshStandardMaterial({ color: 0xb0c0e8, emissive: 0x203050, metalness: 0.6, roughness: 0.3, transparent: true });
const eggMat = new THREE.MeshStandardMaterial({ color: 0xc8b060, emissive: 0x584010, metalness: 0.1, roughness: 0.45 });
const stingerMat = new THREE.MeshStandardMaterial({ color: 0xff8020, emissive: 0x501800, metalness: 0.5, roughness: 0.35 });
const bastionMat = new THREE.MeshStandardMaterial({ color: 0x5a4a72, emissive: 0x160f22, metalness: 0.7, roughness: 0.4 });
const guardCoreMat = new THREE.MeshStandardMaterial({ color: 0xffa030, emissive: 0x803008, metalness: 0.3, roughness: 0.25 });
const membraneMat = new THREE.MeshStandardMaterial({ color: 0x7a3040, emissive: 0x240a10, roughness: 0.7 });
const lancerMat = new THREE.MeshStandardMaterial({ color: 0x8890d8, emissive: 0x181c48, metalness: 0.6, roughness: 0.35 });
const splitterMat = new THREE.MeshStandardMaterial({ color: 0xe8a030, emissive: 0x402808, metalness: 0.5, roughness: 0.4 });

function buildEnemy(type) {
  const g = new THREE.Group();
  if (type === 'drone') {
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.3), droneMat));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.14, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0xff8090 }));
    g.add(ring);
    g.userData.ring = ring;
  } else if (type === 'darter') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.6, 6), darterMat);
    cone.rotation.z = Math.PI / 2; // point -x
    g.add(cone);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.12), darterMat);
    fin.position.x = 1.1;
    g.add(fin);
  } else if (type === 'turret') {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 10), turretMat));
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 6), spikeMat);
      const a = i / 6 * Math.PI * 2;
      sp.position.set(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0);
      sp.rotation.z = a - Math.PI / 2;
      g.add(sp);
    }
  } else if (type === 'heavy') {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.4, 2.6), heavyMat));
    const prow = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 4), heavyMat);
    prow.rotation.z = Math.PI / 2;
    prow.position.x = -3.6;
    g.add(prow);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), turretMat);
    dome.position.y = 1.4;
    g.add(dome);
  } else if (type === 'mine') {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), mineMat));
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1, 5), spikeMat);
      const a = i / 8 * Math.PI * 2;
      sp.position.set(Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0);
      sp.rotation.z = a - Math.PI / 2;
      g.add(sp);
    }
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), mineGlowMat);
    g.add(glow);
    g.userData.glow = glow;
  } else if (type === 'orbiter') {
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), orbiterMat));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 6, 18),
      new THREE.MeshBasicMaterial({ color: 0xd0a0ff }));
    ring.rotation.x = Math.PI / 3;
    g.add(ring);
  } else if (type === 'weaver') {
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.25), weaverMat));
    for (const zz of [-1.3, 1.3]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 1.5), weaverMat);
      wing.position.z = zz;
      g.add(wing);
    }
  } else if (type === 'raider') {
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.0, 4), raiderMat);
    nose.rotation.z = Math.PI / 2; // point -x
    nose.scale.y = 0.55;
    g.add(nose);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.12), raiderMat);
    fin.position.x = 1.0;
    g.add(fin);
  } else if (type === 'tank') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.2, 1.0), tankMat);
    g.add(hull);
    for (const yy of [-1.3, 1.3]) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 0.9), turretMat);
      tread.position.set(0, yy, -0.2);
      g.add(tread);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), tankMat);
    dome.position.z = 0.8;
    g.add(dome);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.6, 6), turretMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(-1.6, 0, 0.9);
    g.add(barrel);
    g.userData.turret = dome;
  } else if (type === 'burrower') {
    const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), moundMat);
    mound.scale.set(1.2, 1.2, 0.45);
    g.add(mound);
    g.userData.mound = mound;
    const body = new THREE.Group();
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 7), burrowerMat);
    tip.rotation.z = Math.PI / 2; // drill nose toward -x
    tip.position.x = -1.6;
    body.add(tip);
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 2.2, 7), burrowerMat);
    mid.rotation.z = Math.PI / 2;
    mid.position.x = 0.4;
    body.add(mid);
    for (const zz of [-0.9, 0.9]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd040 }));
      eye.position.set(1.2, 0.4, zz);
      body.add(eye);
    }
    body.visible = false;
    g.add(body);
    g.userData.body = body;
  } else if (type === 'phantom') {
    const mat = phantomBaseMat.clone(); // per-instance so each can fade alone
    const hull = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.4, 4), mat);
    hull.rotation.z = Math.PI / 2;
    g.add(hull);
    for (const zz of [-1.4, 1.4]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.4), mat);
      wing.position.set(0.6, 0, zz);
      g.add(wing);
    }
    g.userData.mat = mat;
  } else if (type === 'lancer') {
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 4.2, 6), lancerMat);
    hull.rotation.z = Math.PI / 2;
    g.add(hull);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x303860 }); // flashes on telegraph
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6), tipMat);
    tip.rotation.z = Math.PI / 2;
    tip.position.x = -2.8;
    g.add(tip);
    g.userData.tipMat = tipMat;
  } else if (type === 'bastion') {
    // a persistent blockade platform: parks mid-screen and duels you
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.8, 6), bastionMat);
    slab.rotation.x = Math.PI / 2; // flat face to camera
    g.add(slab);
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd040, emissive: 0x805808, metalness: 0.3 }));
    g.add(core);
    g.userData.core = core;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.28, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0xb08aff }));
    g.add(ring);
    g.userData.ring = ring;
    for (const yy of [-2.4, 2.4]) {
      const gun = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.7), turretMat);
      gun.position.set(-1.6, yy, 0);
      g.add(gun);
    }
  } else if (type === 'stinger') {
    // kamikaze chaser: hunts you down and detonates in a cross of light
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.1), stingerMat));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd060 }));
    g.add(ring);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    g.add(glow);
    g.userData.glow = glow;
  } else if (type === 'guardian') {
    // two-form mid-boss: armored shell, then a berserk core
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(2.8, 0), turretMat);
    g.add(shell);
    g.userData.shell = shell;
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 5), spikeMat);
      const a = i / 4 * Math.PI * 2 + Math.PI / 4;
      sp.position.set(Math.cos(a) * 2.9, Math.sin(a) * 2.9, 0);
      sp.rotation.z = a - Math.PI / 2;
      g.add(sp);
      g.userData['spike' + i] = sp;
    }
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), guardCoreMat);
    core.visible = false;
    g.add(core);
    g.userData.core = core;
  } else if (type === 'cruiser') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(8, 2.6, 3), junkMat);
    g.add(hull);
    const prow = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3, 4), junkMat);
    prow.rotation.z = Math.PI / 2;
    prow.position.x = -5.4;
    g.add(prow);
    for (const xx of [-2, 1.5]) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), turretMat);
      dome.position.set(xx, 1.6, 0);
      g.add(dome);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 1.6), turretMat);
    bridge.position.set(3, 1.8, 0);
    g.add(bridge);
  } else if (type === 'egg') {
    // a clutch of brood eggs — pulses, hatches drones until popped
    for (const [dx, dy, s] of [[0, 0, 1.5], [-1.2, 1.1, 1.0], [1.1, -1.0, 1.1]]) {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), eggMat);
      egg.position.set(dx, dy, 0);
      egg.scale.z = 1.4;
      g.add(egg);
    }
    const base = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), membraneMat);
    base.scale.set(1.1, 1.1, 0.5);
    base.position.z = -1;
    g.add(base);
  } else if (type === 'splitter' || type === 'mini') {
    const r = type === 'splitter' ? 1.4 : 0.8;
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), splitterMat));
    if (type === 'splitter') {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(r + 0.2, 0.1, 5, 18),
        new THREE.MeshBasicMaterial({ color: 0xffd080 }));
      g.add(seam);
    }
  } else if (type === 'junk') {
    // tumbling wreck debris: a welded clump of hull plates and pipe
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(
        1 + Math.random() * 1.6, 0.6 + Math.random() * 1.4, 0.5 + Math.random()),
        Math.random() < 0.4 ? rustMat : junkMat);
      b.position.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5));
      b.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      g.add(b);
    }
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.4, 6), junkMat);
    pipe.rotation.z = Math.random() * 3;
    g.add(pipe);
  } else if (type === 'ast' || type === 'astS') {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(type === 'ast' ? 2.2 : 1.0, 0), astMat);
    rock.scale.set(1, 0.75 + Math.random() * 0.5, 0.9);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    g.add(rock);
  }
  return g;
}

const ENEMY_DEFS = {
  drone:   { hp: 1, radius: 1.6, score: 100 },
  darter:  { hp: 1, radius: 1.5, score: 150 },
  turret:  { hp: 3, radius: 2.0, score: 300 },
  heavy:   { hp: 8, radius: 2.8, score: 500 },
  mine:    { hp: 1, radius: 1.7, score: 200 },
  orbiter: { hp: 2, radius: 1.4, score: 250 },
  ast:     { hp: 3, radius: 2.4, score: 50 },
  astS:    { hp: 1, radius: 1.2, score: 20 },
  weaver:  { hp: 2, radius: 1.6, score: 220 },
  raider:  { hp: 1, radius: 1.5, score: 180 },
  tank:    { hp: 3, radius: 2.0, score: 300 }, // ground unit: shootable, but no ram
  burrower:{ hp: 2, radius: 1.7, score: 260 }, // underground until it erupts
  junk:    { hp: 2, radius: 2.0, score: 60 },  // drifting wreck debris
  phantom: { hp: 2, radius: 1.6, score: 350 }, // cloaks; only vulnerable while visible
  lancer:  { hp: 3, radius: 1.8, score: 320 }, // paces you, telegraphed burst volleys
  splitter:{ hp: 2, radius: 1.7, score: 240 }, // splits into two minis on death
  mini:    { hp: 1, radius: 1.0, score: 60 },
  egg:     { hp: 3, radius: 2.2, score: 400 }, // hatches drones until popped
  cruiser: { hp: 14, radius: 3.6, score: 800 }, // rolling broadside walls
  stinger: { hp: 1, radius: 1.4, score: 150 }, // kamikaze chaser, cross-blast on death
  guardian:{ hp: 40, radius: 3.0, score: 1500 }, // two-form mid-boss
  bastion: { hp: 26, radius: 3.4, score: 1000 }, // persistent blockade platform
};

function spawnEnemy(type, y, opts) {
  const def = ENEMY_DEFS[type];
  const mesh = buildEnemy(type);
  const o = opts || {};
  mesh.position.set(o.x !== undefined ? o.x : play.fw + 6, y,
    type === 'tank' || type === 'burrower' ? -6 : 0);
  // winged fliers were modeled for the side view; roll them flat overhead/chase
  if (viewMode !== 'side' && (type === 'weaver' || type === 'phantom' || type === 'darter'))
    mesh.rotation.x = Math.PI / 2;
  scene.add(mesh);
  // late-campaign armor: multi-hit enemies gain +1 hp per three stages
  const hp = def.hp + (def.hp >= 2 ? Math.floor(stageIdx / 3) : 0);
  enemies.push({
    type, mesh, hp, radius: def.radius, score: def.score,
    t: 0, baseY: y, fireCool: 1 + Math.random(), ...o,
  });
}

function killEnemy(e, i) {
  const big = e.type === 'heavy';
  burst(e.mesh.position, big ? 26 : 14, big ? 22 : 16, big ? 1.4 : 1);
  audio.explode();
  addScore(e.score);
  if (e.drops) dropPowerup(e.mesh.position);
  // pity drops: an unpowered pilot finds spare parts everywhere
  else if (player.weapon < 2 && Math.random() < 0.09) dropPowerup(e.mesh.position);
  // and once in a stage, something priceless tumbles out of the wreckage
  else if (!novaDropped && levelTime > 25 && Math.random() < 0.025) {
    novaDropped = true;
    dropNova(e.mesh.position);
  }
  if (e.type === 'ast') {
    // shatter into fragments
    for (const vy of [-5, 1, 5])
      spawnEnemy('astS', e.mesh.position.y, {
        x: e.mesh.position.x, vy: vy + (Math.random() - 0.5) * 3,
        sp: 12 + Math.random() * 8,
      });
  }
  if (e.type === 'splitter') {
    for (const off of [3, -3])
      spawnEnemy('mini', e.mesh.position.y + off, {
        x: e.mesh.position.x, phase: Math.random() * 6,
      });
  }
  scene.remove(e.mesh);
  enemies.splice(i, 1);
  shake = Math.max(shake, big ? 0.5 : 0.2);
}

// stinger detonation: a blinding cross of light — the four beams do the damage
const blasts = [];
function stingerDetonate(e, i) {
  const pos = e.mesh.position.clone().setZ(0);
  scene.remove(e.mesh);
  enemies.splice(i, 1);
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(30, 2.4, 0.5), mat));
  const v = new THREE.Mesh(new THREE.BoxGeometry(2.4, 30, 0.5), mat);
  g.add(v);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), mat));
  const light = new THREE.PointLight(0xffffff, 140, 45);
  g.add(light);
  g.position.copy(pos);
  scene.add(g);
  blasts.push({ g, mat, light, t: 0 });
  burst(pos, 22, 22, 1.3);
  audio.stingerBoom();
  shake = Math.max(shake, 0.8);
  rumble(0.7, 1, 250);
}

function updateBlasts(dt) {
  for (let i = blasts.length - 1; i >= 0; i--) {
    const b = blasts[i];
    b.t += dt;
    const k = b.t / 0.5;
    b.mat.opacity = Math.max(0, 1 - k);
    b.light.intensity = 140 * Math.max(0, 1 - k);
    b.g.scale.setScalar(1 + k * 0.35);
    if (b.t < 0.4 && player.alive && player.invuln <= 0) {
      const dx = Math.abs(player.pos.x - b.g.position.x);
      const dy = Math.abs(player.pos.y - b.g.position.y);
      if ((dx < 15.5 && dy < 1.9) || (dy < 15.5 && dx < 1.9)) playerDie();
    }
    if (b.t > 0.55) {
      scene.remove(b.g);
      blasts.splice(i, 1);
    }
  }
}

// mine proximity detonation: radial burst, no score
function detonateMine(e, i) {
  const p = e.mesh.position;
  for (let k = 0; k < 8; k++)
    enemyFireAngle(p, k / 8 * Math.PI * 2, 17);
  burst(p, 18, 18, 1.1);
  audio.explode();
  shake = Math.max(shake, 0.4);
  scene.remove(e.mesh);
  enemies.splice(i, 1);
}

function enemyFire(from, speed, angleOff) {
  const b = take(enemyBullets);
  if (!b) return;
  b.mesh.position.copy(from);
  b.mesh.scale.setScalar(1);
  b.home = 0;
  const dir = new THREE.Vector3().subVectors(player.pos, from).normalize();
  if (angleOff) {
    const a = Math.atan2(dir.y, dir.x) + angleOff;
    dir.set(Math.cos(a), Math.sin(a), 0);
  }
  b.vel.copy(dir.multiplyScalar(speed));
  b.life = 7;
  audio.enemyShoot();
}

function enemyFireAngle(from, angle, speed) {
  const b = take(enemyBullets);
  if (!b) return;
  b.mesh.position.copy(from);
  b.mesh.scale.setScalar(1);
  b.home = 0;
  b.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
  b.life = 7;
}

// slow orb that curves toward the player for a while, then flies straight
function enemyFireHoming(from, speed) {
  const b = take(enemyBullets);
  if (!b) return;
  b.mesh.position.copy(from);
  b.mesh.scale.setScalar(1.45);
  b.home = 1.8;
  const dir = new THREE.Vector3().subVectors(player.pos, from).normalize();
  b.vel.copy(dir.multiplyScalar(speed));
  b.life = 7;
  audio.enemyShoot();
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.t += dt;
    const m = e.mesh;

    if (e.type === 'drone') {
      m.position.x -= 20 * dt;
      m.position.y = e.baseY + Math.sin(e.t * 3 + (e.phase || 0)) * (e.amp ?? 5);
      m.rotation.x += 3 * dt;
      m.userData.ring.rotation.y += 4 * dt;
    } else if (e.type === 'darter') {
      const sp = 14 + Math.min(1, e.t * 0.7) * 34; // accelerates into a charge
      m.position.x -= sp * dt;
      m.rotation.x += 6 * dt;
    } else if (e.type === 'turret') {
      // gun emplacements HOLD their ground now — they leave when you make them
      e.holdX = e.holdX ?? play.fw * (0.35 + Math.random() * 0.3);
      if (m.position.x > e.holdX) m.position.x -= 9 * dt;
      m.rotation.z += 1.2 * dt;
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < play.fw - 4 && player.alive) {
        enemyFire(m.position, 24);
        e.fireCool = 2.2;
      }
    } else if (e.type === 'tank') {
      m.position.x -= 20 * dt; // crawling with the ground scroll
      m.userData.turret.rotation.z = Math.atan2(
        player.pos.y - m.position.y, player.pos.x - m.position.x);
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < play.fw - 4 && player.alive) {
        enemyFire(m.position, 22);
        e.fireCool = 2.6;
      }
    } else if (e.type === 'heavy') {
      m.position.x -= 7 * dt;
      m.position.y = e.baseY + Math.sin(e.t * 1.2) * 2;
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < play.fw - 6 && player.alive) {
        enemyFire(m.position, 22, 0);
        enemyFire(m.position, 22, 0.3);
        enemyFire(m.position, 22, -0.3);
        e.fireCool = 2.8;
      }
    } else if (e.type === 'mine') {
      m.position.x -= 6 * dt;
      m.position.y = e.baseY + Math.sin(e.t * 1.6) * 1.4;
      m.rotation.z += 0.8 * dt;
      m.userData.glow.visible = Math.floor(e.t * 4) % 2 === 0;
      if (player.alive && d2(m.position, player.pos) < 6) {
        detonateMine(e, i);
        continue;
      }
    } else if (e.type === 'orbiter') {
      e.cx = (e.cx ?? play.fw + 6) - 12 * dt;
      const a = (e.a0 || 0) + e.t * (e.omega || 2);
      m.position.set(e.cx + Math.cos(a) * 3.4, e.baseY + Math.sin(a) * 3.4, 0);
      m.rotation.y += 3 * dt;
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < play.fw - 4 && player.alive) {
        enemyFire(m.position, 23);
        e.fireCool = 2.6;
      }
    } else if (e.type === 'weaver') {
      m.position.x -= 14 * dt;
      m.position.y = e.baseY + Math.sin(e.t * 2 + (e.phase || 0)) * (e.amp ?? 7);
      m.rotation.x += 4 * dt;
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < play.fw - 4 && player.alive) {
        enemyFire(m.position, 25);
        e.fireCool = 2.8;
      }
    } else if (e.type === 'raider') {
      m.position.x -= (e.sp || 28) * dt;
      m.position.y += (e.vy || 0) * dt;
      m.rotation.x += 8 * dt;
      if (!e.fired && m.position.x < play.fw * 0.4 && player.alive) {
        e.fired = true;
        enemyFire(m.position, 26);
      }
      if (Math.abs(m.position.y) > play.lat + 8) {
        scene.remove(m);
        enemies.splice(i, 1);
        continue;
      }
    } else if (e.type === 'burrower') {
      if (e.buried === undefined) { e.buried = true; e.fuse = 1.8 + Math.random() * 0.6; }
      if (e.buried) {
        m.position.x -= 20 * dt; // mound carried along with the ground scroll
        const s = 1 + Math.sin(e.t * 10) * 0.12;
        m.userData.mound.scale.set(1.2 * s, 1.2 * s, 0.45);
        if (e.t >= e.fuse) {
          e.buried = false;
          m.userData.mound.visible = false;
          m.userData.body.visible = true;
          const at = new THREE.Vector3(m.position.x, m.position.y, 0);
          burst(at, 10, 12, 0.9);
          for (let k = 0; k < 6; k++) enemyFireAngle(at, k / 6 * Math.PI * 2, 14);
          audio.explode();
        }
      } else {
        m.position.z = Math.min(0, m.position.z + 16 * dt); // claw up to flight level
        m.position.x -= 16 * dt;
        m.position.y = e.baseY + Math.sin(e.t * 2.2) * 3;
        m.userData.body.rotation.x += 9 * dt; // drill spin
        e.fireCool -= dt;
        if (e.fireCool <= 0 && player.alive) {
          enemyFire(m.position, 23);
          e.fireCool = 3;
        }
      }
    } else if (e.type === 'phantom') {
      // cycle: visible -> fade -> cloaked hunt -> reappear with a spread
      e.ph = e.ph ?? 0; // 0 visible, 1 fading, 2 cloaked, 3 appearing
      e.phT = (e.phT ?? 2) - dt;
      const mat = m.userData.mat;
      if (e.ph === 0) {
        m.position.x -= 14 * dt;
        m.position.y = e.baseY + Math.sin(e.t * 1.8) * 4;
        if (e.phT <= 0) { e.ph = 1; e.phT = 0.7; }
      } else if (e.ph === 1) {
        mat.opacity = Math.max(0.08, e.phT / 0.7);
        m.position.x -= 14 * dt;
        if (e.phT <= 0) { e.ph = 2; e.phT = 1.6; e.cloaked = true; }
      } else if (e.ph === 2) {
        m.position.x -= 22 * dt; // hunts your lane while cloaked
        m.position.y += THREE.MathUtils.clamp(player.pos.y - m.position.y, -1, 1) * 10 * dt;
        e.baseY = m.position.y;
        if (e.phT <= 0) { e.ph = 3; e.phT = 0.5; }
      } else {
        mat.opacity = Math.min(1, 1 - e.phT / 0.5);
        if (e.phT <= 0) {
          e.ph = 0; e.phT = 2; e.cloaked = false;
          mat.opacity = 1;
          if (player.alive && m.position.x < play.fw - 4) {
            enemyFire(m.position, 24, 0);
            enemyFire(m.position, 24, 0.25);
            enemyFire(m.position, 24, -0.25);
          }
        }
      }
    } else if (e.type === 'lancer') {
      const holdX = -play.fw + 50; // paces ahead of you (rail: rides your speed)
      if (!e.leaving && m.position.x > holdX) m.position.x -= 20 * dt;
      else if (!e.leaving) {
        m.position.y = e.baseY + Math.sin(e.t * 1.2) * 5;
        e.volley = e.volley ?? 0;
        e.fireCool -= dt;
        if (e.fireCool <= 0 && player.alive) {
          if (!e.tele) { // telegraph: tip glows before the lance
            e.tele = true;
            m.userData.tipMat.color.setHex(0xffffff);
            e.fireCool = 0.55;
          } else {
            e.tele = false;
            m.userData.tipMat.color.setHex(0x303860);
            for (let k = 0; k < 3; k++)
              setTimeout(() => { if (state === 'playing' && player.alive) enemyFire(m.position, 36); }, k * 90);
            e.volley++;
            e.fireCool = 2.2;
            if (e.volley >= 3) e.leaving = true;
          }
        }
      } else m.position.x -= 32 * dt; // done: punches past you
    } else if (e.type === 'bastion') {
      // rolls in, parks, and cycles three attack patterns until destroyed
      e.holdX = e.holdX ?? play.fw * 0.55;
      if (!e.parked) {
        m.position.x -= 10 * dt;
        if (m.position.x <= e.holdX) e.parked = true;
      } else {
        e.hopT = (e.hopT ?? 5) - dt;
        if (e.hopT <= 0) { // repositions to a fresh firing lane
          e.targetY = (Math.random() * 2 - 1) * (play.lat - 8);
          e.hopT = 7;
        }
        if (e.targetY !== undefined)
          m.position.y += THREE.MathUtils.clamp(e.targetY - m.position.y, -1, 1) * 8 * dt;
        m.position.x = e.holdX + Math.sin(e.t * 0.7) * 2;
      }
      m.userData.ring.rotation.z += 2 * dt;
      m.userData.core.scale.setScalar(1 + Math.sin(e.t * 5) * 0.12);
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < play.fw - 4 && player.alive) {
        e.pattern = ((e.pattern ?? -1) + 1) % 3;
        const from = m.position.clone();
        if (e.pattern === 0) { // aimed burst
          for (let k = 0; k < 3; k++)
            setTimeout(() => { if (state === 'playing' && player.alive) enemyFire(from, 26); }, k * 130);
        } else if (e.pattern === 1) { // fan
          for (let k = -2; k <= 2; k++) enemyFire(from, 21, k * 0.24);
        } else { // ring
          const off = Math.random() * Math.PI;
          for (let k = 0; k < 10; k++)
            enemyFireAngle(from, off + k / 10 * Math.PI * 2, 15);
          audio.enemyShoot();
        }
        e.fireCool = 3.2;
      }
    } else if (e.type === 'stinger') {
      if (player.alive) {
        const dx = player.pos.x - m.position.x, dy = player.pos.y - m.position.y;
        const d = Math.hypot(dx, dy) || 1;
        m.position.x += dx / d * 24 * dt;
        m.position.y += dy / d * 24 * dt;
        if (d < 3.4 || e.t > 14) { stingerDetonate(e, i); continue; }
      } else m.position.x -= 12 * dt;
      m.rotation.x += 7 * dt;
      m.rotation.z += 4 * dt;
      m.userData.glow.visible = Math.floor(e.t * 7) % 2 === 0; // frantic blink
    } else if (e.type === 'guardian') {
      if (e.form === undefined) e.form = 1;
      if (e.form === 1 && e.hp <= 15) { // the shell cracks — form two
        e.form = 2;
        e.radius = 1.8;
        m.userData.shell.visible = false;
        for (let k = 0; k < 4; k++) m.userData['spike' + k].visible = false;
        m.userData.core.visible = true;
        burst(m.position, 22, 20, 1.3);
        audio.explode();
        shake = Math.max(shake, 0.5);
        for (let k = 0; k < 8; k++)
          enemyFireAngle(m.position, k / 8 * Math.PI * 2, 16);
      }
      if (e.form === 1) {
        if (m.position.x > play.fw * 0.55) m.position.x -= 8 * dt;
        m.position.y = e.baseY + Math.sin(e.t * 0.9) * 3;
        m.rotation.z += 1.4 * dt;
        m.rotation.y += 0.8 * dt;
        e.fireCool -= dt;
        if (e.fireCool <= 0 && m.position.x < play.fw - 4 && player.alive) {
          for (let k = -2; k <= 2; k++) enemyFire(m.position, 22, k * 0.22);
          e.fireCool = 3;
        }
      } else {
        m.position.x -= 22 * dt; // berserk core: fast, erratic, spiteful
        m.position.y = e.baseY + Math.sin(e.t * 3.5) * 9;
        m.rotation.x += 8 * dt;
        e.fireCool -= dt;
        if (e.fireCool <= 0 && player.alive) {
          const off = Math.random() * Math.PI;
          for (let k = 0; k < 8; k++)
            enemyFireAngle(m.position, off + k / 8 * Math.PI * 2, 15);
          e.fireCool = 2.4;
        }
      }
    } else if (e.type === 'cruiser') {
      m.position.x -= 6.5 * dt;
      m.position.y = e.baseY + Math.sin(e.t * 0.8) * 1.5;
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < play.fw - 6 && player.alive) {
        for (const dy of [-8, -4, 0, 4, 8]) // broadside wall
          enemyFireAngle(new THREE.Vector3(m.position.x - 4, m.position.y + dy, 0), Math.PI, 22);
        enemyFire(m.position, 24);
        audio.enemyShoot();
        e.fireCool = 4;
      }
    } else if (e.type === 'egg') {
      m.position.x -= 12 * dt; // rides the hive wall toward you
      const pulse = 1 + Math.sin(e.t * 5) * 0.08;
      m.scale.set(pulse, pulse, pulse);
      e.spawnT = (e.spawnT ?? 2) - dt;
      if (e.spawnT <= 0 && m.position.x < play.fw - 6 && enemies.length < 40 && player.alive) {
        spawnEnemy('drone', m.position.y + (Math.random() - 0.5) * 4,
          { x: m.position.x - 2, amp: 3, phase: Math.random() * 6 });
        burst(m.position, 4, 6, 0.6);
        e.spawnT = 2.5;
      }
    } else if (e.type === 'splitter') {
      m.position.x -= 17 * dt;
      m.position.y = e.baseY + Math.sin(e.t * 2.4 + (e.phase || 0)) * 5;
      m.rotation.x += 3 * dt;
      m.rotation.y += 2 * dt;
    } else if (e.type === 'mini') {
      m.position.x -= 34 * dt;
      m.position.y = e.baseY + Math.sin(e.t * 6 + (e.phase || 0)) * 3;
      m.rotation.x += 8 * dt;
    } else if (e.type === 'junk') {
      m.position.x -= (e.sp || 12) * dt;
      m.position.y += (e.vy || 0) * dt;
      m.rotation.x += 1.1 * dt;
      m.rotation.z += 0.8 * dt;
      if (Math.abs(m.position.y) > play.lat + 8) {
        scene.remove(m);
        enemies.splice(i, 1);
        continue;
      }
    } else if (e.type === 'ast' || e.type === 'astS') {
      m.position.x -= (e.sp || 12) * dt;
      m.position.y += (e.vy || 0) * dt;
      m.rotation.x += (e.type === 'ast' ? 0.7 : 2.2) * dt;
      m.rotation.y += 0.5 * dt;
      if (Math.abs(m.position.y) > play.lat + 8) {
        scene.remove(m);
        enemies.splice(i, 1);
        continue;
      }
    }

    if (m.position.x < -play.fw - 8) {
      scene.remove(m);
      enemies.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------- bosses
let boss = null;

function makeCarrier() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x5a4a6a, emissive: 0x140a20, metalness: 0.6, roughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2434, metalness: 0.7, roughness: 0.5 });

  g.add(new THREE.Mesh(new THREE.BoxGeometry(13, 7, 6), hullMat));
  const prow = new THREE.Mesh(new THREE.ConeGeometry(3.4, 6, 4), hullMat);
  prow.rotation.z = Math.PI / 2;
  prow.rotation.y = Math.PI / 4;
  prow.position.x = -9;
  g.add(prow);
  for (const yy of [-4.6, 4.6]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 2.4), darkMat);
    tower.position.set(2, yy, 0);
    g.add(tower);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4.4, 8), darkMat);
    gun.rotation.z = Math.PI / 2;
    gun.position.set(-2.5, yy, 0);
    g.add(gun);
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff40c0, emissive: 0xa01060, metalness: 0.2, roughness: 0.2 }));
  core.position.x = -7.4;
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.35, 8, 30),
    new THREE.MeshStandardMaterial({ color: 0xc080ff, emissive: 0x301050 }));
  ring.position.x = -7.4;
  g.add(ring);
  const coreLight = new THREE.PointLight(0xff50c0, 60, 40);
  coreLight.position.x = -7;
  g.add(coreLight);
  for (const yy of [-2, 2]) {
    const fl = new THREE.Mesh(new THREE.ConeGeometry(1, 3.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xff9040 }));
    fl.rotation.z = -Math.PI / 2;
    fl.position.set(8.6, yy, 0);
    g.add(fl);
  }
  g.userData = { core, ring };
  g.position.set(play.fw + 24, 0, 0);
  scene.add(g);
  return {
    kind: 'carrier', mesh: g, hp: 260, maxHp: 260, radius: 6.5,
    t: 0, entered: false, cool: { aim: 2, fan: 3.5, ring: 2, spawn: 3 }, dying: 0,
  };
}

function makeSerpent() {
  const headMat = new THREE.MeshStandardMaterial({ color: 0x3a8a4a, emissive: 0x0a2a12, metalness: 0.5, roughness: 0.4 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, emissive: 0x081a0c, metalness: 0.5, roughness: 0.5 });
  const finMat = new THREE.MeshStandardMaterial({ color: 0x80ffb0, emissive: 0x104020 });

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.ConeGeometry(2.0, 5, 6), headMat);
  skull.rotation.z = Math.PI / 2; // nose toward -x
  head.add(skull);
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 5), finMat);
  crest.position.set(1.4, 1.6, 0);
  crest.rotation.z = -0.5;
  head.add(crest);
  for (const zz of [-0.8, 0.8]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd040 }));
    eye.position.set(-0.8, 0.6, zz);
    head.add(eye);
  }
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.4), bodyMat);
  jaw.position.set(-1.2, -0.9, 0);
  head.add(jaw);
  const headLight = new THREE.PointLight(0x60ff90, 40, 30);
  head.add(headLight);
  head.position.set(play.fw + 30, 0, 0);
  scene.add(head);

  const segs = [], segR = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Group();
    const r = 1.9 - i * 0.12;
    s.add(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), bodyMat));
    if (i % 2 === 0) {
      const fin = new THREE.Mesh(new THREE.TorusGeometry(r + 0.45, 0.14, 6, 16), finMat);
      s.add(fin);
      s.userData.fin = fin;
    }
    s.position.copy(head.position);
    scene.add(s);
    segs.push(s);
    segR.push(r + 0.3);
  }

  const trail = [head.position.clone()];

  return {
    kind: 'serpent', mesh: head, segs, segR, trail,
    hp: 260, maxHp: 260, radius: 2.7,
    t: 0, entered: false, cool: { aim: 2.5, fan: 4, ring: 3, spawn: 5 }, dying: 0,
    prev: head.position.clone(),
  };
}

function makeFortress() {
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xa03010, metalness: 0.3, roughness: 0.25 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x4a3a55, emissive: 0x140a18, metalness: 0.7, roughness: 0.45 });

  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 1), coreMat);
  g.add(core);
  const rings = [];
  for (const [rx, ry] of [[Math.PI / 2, 0], [Math.PI / 6, Math.PI / 3]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.5, 8, 40), armorMat);
    ring.rotation.set(rx, ry, 0);
    g.add(ring);
    rings.push(ring);
  }
  for (let i = 0; i < 4; i++) { // diagonal armor plates
    const a = Math.PI / 4 + i * Math.PI / 2;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.6, 2.6), armorMat);
    plate.position.set(Math.cos(a) * 6.4, Math.sin(a) * 6.4, 0);
    plate.rotation.z = a;
    g.add(plate);
  }
  g.add(new THREE.PointLight(0xff8030, 80, 50));
  g.position.set(play.fw + 26, 0, 0);
  scene.add(g);

  const pods = [];
  for (const a0 of [0, Math.PI]) {
    const pm = new THREE.Group();
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 10), turretMat));
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.5, 6), spikeMat);
      const a = i / 6 * Math.PI * 2;
      sp.position.set(Math.cos(a) * 2.1, Math.sin(a) * 2.1, 0);
      sp.rotation.z = a - Math.PI / 2;
      pm.add(sp);
    }
    pm.position.copy(g.position);
    scene.add(pm);
    pods.push({ mesh: pm, hp: 55, alive: true, a0 });
  }

  return {
    kind: 'fortress', mesh: g, core, coreMat, rings, pods,
    hp: 320, maxHp: 320, totalMax: 430, bounty: 15000,
    radius: 4.6, podR: 2.5, t: 0, entered: false, dying: 0,
    spiralA: 0, spiralT: 0,
    dashT: 8, dashPhase: 'idle', dashClock: 0, dashX: 0,
    cool: { pod: 2.2, fan: 3.2, aim: 2.4, ring: 3, spawn: 5, homing: 3.2, mine: 6 },
  };
}

function destroyPod(p) {
  p.alive = false;
  burst(p.mesh.position, 24, 22, 1.3);
  audio.explode();
  addScore(2000);
  scene.remove(p.mesh);
  shake = Math.max(shake, 0.7);
  if (boss && !boss.pods.some((q) => q.alive))
    say('commander', "Shield generators down — the core is exposed! Hit it with everything you've got!", 'c_pods', 3);
}

// stage 4 boss: a colossal strip-mining crawler on the planet surface
function makeHarvester() {
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x7a3a22, emissive: 0x1c0c06, metalness: 0.6, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2e2622, metalness: 0.7, roughness: 0.6 });
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x40ff80, emissive: 0x10a040, metalness: 0.3, roughness: 0.25 });

  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(12, 9, 3.5), hullMat));
  for (const yy of [-5.6, 5.6]) { // giant treads
    const tread = new THREE.Mesh(new THREE.BoxGeometry(15, 2.6, 2.4), darkMat);
    tread.position.set(0, yy, -1);
    g.add(tread);
  }
  // front scoop maw
  const scoop = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 9, 8, 1, true), darkMat);
  scoop.rotation.z = Math.PI / 2;
  scoop.position.set(-7.5, 0, -0.5);
  g.add(scoop);
  // twin shoulder cannons
  const cannons = [];
  for (const yy of [-3.6, 3.6]) {
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 5, 8), darkMat);
    gun.rotation.z = Math.PI / 2;
    gun.position.set(-5, yy, 2.2);
    g.add(gun);
    cannons.push(new THREE.Vector3(-7.5, yy, 0));
  }
  // exposed reactor core on the spine — the weak point
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), coreMat);
  core.position.set(-2.5, 0, 2.8);
  g.add(core);
  const cage = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 6, 24), darkMat);
  cage.position.copy(core.position);
  g.add(cage);
  g.add(new THREE.PointLight(0x40ff80, 60, 40));
  for (const yy of [2.5, -2.5]) { // smokestacks
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 3, 7), hullMat);
    stack.rotation.x = Math.PI / 2;
    stack.position.set(4.5, yy, 3);
    g.add(stack);
  }
  g.position.set(play.fw + 26, 0, -4);
  scene.add(g);

  return {
    kind: 'harvester', mesh: g, core, coreMat, cage, cannons,
    hp: 340, maxHp: 340, bounty: 20000,
    radius: 6.8, t: 0, entered: false, dying: 0,
    dashT: 9, dashPhase: 'idle', dashClock: 0, dashX: 0,
    cool: { aim: 2.2, fan: 3.4, ring: 3, spawn: 6, homing: 3, barrage: 2.2 },
  };
}

// stage 5 boss: a burrowing drill-worm that cycles under and above the sand
function makeDrillmaw() {
  const drillMat = new THREE.MeshStandardMaterial({ color: 0xc0b8a8, metalness: 0.8, roughness: 0.35 });
  const fleshMat = new THREE.MeshStandardMaterial({ color: 0x8a4a68, emissive: 0x200a14, metalness: 0.4, roughness: 0.5 });
  const finMat = new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: 0x402008 });

  const head = new THREE.Group();
  const spinner = new THREE.Group(); // the drill bit spins around its own axis
  for (const [r, len, xx] of [[1.3, 3, -3.6], [2.0, 2.6, -1.2], [2.5, 3, 1.4]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, len, 7), drillMat);
    cone.rotation.z = Math.PI / 2; // nose toward -x
    cone.position.x = xx;
    spinner.add(cone);
  }
  head.add(spinner);
  head.userData.spinner = spinner;
  for (const zz of [-1.6, 1.6]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd040 }));
    eye.position.set(2.2, 0.8, zz);
    head.add(eye);
  }
  head.add(new THREE.PointLight(0xffa060, 40, 30));
  head.position.set(play.fw * 0.5, 0, -9);
  head.visible = false;
  scene.add(head);

  const segs = [], segR = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Group();
    const r = 2.2 - i * 0.25;
    s.add(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), fleshMat));
    if (i % 2 === 0) s.add(new THREE.Mesh(new THREE.TorusGeometry(r + 0.4, 0.16, 6, 16), finMat));
    s.position.copy(head.position);
    s.visible = false;
    scene.add(s);
    segs.push(s);
    segR.push(r + 0.3);
  }

  const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 0), moundMat);
  mound.scale.set(1.3, 1.3, 0.4);
  mound.position.set(play.fw + 10, 0, -6.5);
  scene.add(mound);

  return {
    kind: 'drillmaw', mesh: head, segs, segR, mound, extras: [mound],
    trail: [head.position.clone()],
    hp: 320, maxHp: 320, bounty: 22000, radius: 3.2,
    t: 0, entered: true, dying: 0,
    state: 'buried', stateT: 4, prev: head.position.clone(),
    cool: { aim: 2, fan: 3.5 },
  };
}

// stage 6 boss: a golem welded out of wrecks — knock it apart and it rebuilds itself once
function makeColossus() {
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xffa020, emissive: 0xa04808, metalness: 0.3, roughness: 0.25 });
  const g = new THREE.Group();

  const addPart = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  // torso: welded hull plates
  addPart(new THREE.Mesh(new THREE.BoxGeometry(6.5, 8.5, 4.5), junkMat), 0.5, 0, 0);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 3), rustMat), -2.5, 3.2, 0.8);
  addPart(new THREE.Mesh(new THREE.BoxGeometry(3.5, 4, 2.6), rustMat), 2.8, -3.4, -0.6);
  addPart(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 5, 7), junkMat), -1, -4.5, 1);
  // head with one angry eye
  addPart(new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 2.8), junkMat), -0.5, 6.4, 0);
  const eye = addPart(new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3020 })), -1.8, 6.4, 0);
  // exposed reactor core — the weak point
  const core = addPart(new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), coreMat), -3.6, 0, 0.5);
  g.add(new THREE.PointLight(0xffa020, 60, 40));
  // orbiting fist flails (positioned procedurally each frame)
  const fists = [];
  for (let i = 0; i < 2; i++) {
    const fist = addPart(new THREE.Mesh(new THREE.DodecahedronGeometry(2, 0), junkMat), 0, 9, 0);
    const chain = addPart(new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.8), rustMat), 0, 4.5, 0);
    fists.push({ fist, chain });
  }

  // every solid part remembers home so the golem can fall apart and rebuild
  const parts = [];
  for (const c of g.children) {
    if (!c.isMesh) continue;
    parts.push({
      mesh: c, home: c.position.clone(),
      vel: new THREE.Vector3((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 12),
      spin: (Math.random() - 0.5) * 8,
    });
  }

  g.position.set(play.fw + 24, 0, 0);
  scene.add(g);
  return {
    kind: 'colossus', mesh: g, core, eye, fists, parts,
    hp: 300, reserve: 200, maxHp: 300, totalMax: 500, bounty: 24000,
    radius: 6.2, t: 0, entered: false, dying: 0,
    cState: 'fight', cT: 0, enraged: false,
    cool: { throw: 2.4, fan: 3.6, ring: 3.2, homing: 3.5 },
  };
}

function colossusCollapse() {
  const b = boss;
  b.cState = 'collapsed';
  b.cT = 2.6;
  burst(b.mesh.position, 40, 26, 1.8);
  audio.bigExplode();
  shake = 1.2;
  for (const p of b.parts) { // re-roll scatter velocities
    p.vel.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 12);
    p.spin = (Math.random() - 0.5) * 8;
  }
  say('kamus', "Oh come ON. It's putting itself back together?!", 'k_scrap', 2.5);
}

// stage 7 boss: Zeraa's personal warship, racing you down the conduit
function makeSiren() {
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xd8dce8, metalness: 0.8, roughness: 0.2, transparent: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xff70d8, emissive: 0x60204a, metalness: 0.5, roughness: 0.3, transparent: true });

  const g = new THREE.Group();
  const hull = new THREE.Group(); // rolled flat for the chase-cam view
  g.add(hull);
  const body = new THREE.Mesh(new THREE.ConeGeometry(2.2, 11, 8), hullMat);
  body.rotation.z = Math.PI / 2; // nose toward the player
  hull.add(body);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 10), trimMat);
  canopy.position.set(1.5, 1.2, 0);
  canopy.scale.set(1.6, 0.8, 0.9);
  hull.add(canopy);
  for (const zz of [-1, 1]) { // swept crescent wings
    const wing = new THREE.Mesh(new THREE.TorusGeometry(4, 0.5, 6, 22, Math.PI), trimMat);
    wing.rotation.x = zz * Math.PI / 2.4;
    wing.position.set(2, 0, zz * 2.4);
    hull.add(wing);
  }
  if (viewMode !== 'side') hull.rotation.x = Math.PI / 2;
  const veil = new THREE.Mesh(new THREE.SphereGeometry(6.4, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff90e0, transparent: true, opacity: 0, depthWrite: false }));
  g.add(veil);
  g.add(new THREE.PointLight(0xff70d8, 60, 40));
  g.position.set(play.fw + 24, 0, 0);
  scene.add(g);

  return {
    kind: 'siren', mesh: g, veilMesh: veil, mats: [hullMat, trimMat],
    hp: 380, maxHp: 380, bounty: 26000,
    radius: 4.4, t: 0, entered: false, dying: 0,
    veiled: false, veilT: 9, spiralA: 0, spiralT: 0,
    cool: { aim: 2.2, fan: 3.6, spawn: 7 },
  };
}

// stage 8 boss: a Gorgon replica of the SF-01 built from Zeraa's surveillance
// files — it shadows your movement on a delay and returns your own fire
function makeMirror() {
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.7, roughness: 0.3, transparent: true });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x1d5a3e, emissive: 0x0a3020, metalness: 0.5, roughness: 0.4, transparent: true });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(1.3, 6.4, 10), hullMat);
  body.rotation.z = Math.PI / 2; // nose toward the player — your dark reflection
  g.add(body);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0x800a0a, metalness: 0.2, roughness: 0.1, transparent: true }));
  canopy.position.set(-0.6, 0.6, 0);
  canopy.scale.set(1.5, 0.8, 0.8);
  g.add(canopy);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 4), accentMat);
  wing.position.set(1.3, -0.1, 0);
  g.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.8, 0.16), accentMat);
  tail.position.set(2.2, 0.8, 0);
  g.add(tail);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff5050, transparent: true }));
  flame.rotation.z = -Math.PI / 2;
  flame.position.set(4, 0, 0);
  g.add(flame);
  g.add(new THREE.PointLight(0xff4040, 40, 30));
  g.position.set(play.fw + 20, 0, 0);
  scene.add(g);
  const mats = [];
  g.traverse((c) => { if (c.isMesh) mats.push(c.material); });

  return {
    kind: 'mirror', mesh: g, mats, flame,
    hp: 360, maxHp: 360, bounty: 26000,
    radius: 2.8, t: 0, entered: false, dying: 0,
    hist: [], fireQ: [], prevFC: 0, mirrorCount: 0,
    cloaked: false, cloakT: 6,
    cool: { base: 3, spawn: 8 },
  };
}

function updateMirror(dt) {
  const b = boss, m = b.mesh;
  b.t += dt;
  b.flame.scale.y = 0.8 + Math.random() * 0.5;

  if (b.dying > 0) {
    b.dying -= dt;
    if (!b.saidWatch) {
      b.saidWatch = true;
      say('zeraa', 'They built it from MY files on you, darling. For what it is worth... the original is better.', 'z_watch', 3.5);
    }
    if (Math.random() < 0.4) {
      burst(m.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3)), 10, 18, 1);
      audio.explode();
      shake = Math.max(shake, 0.5);
    }
    if (b.dying <= 0) {
      burst(m.position, 50, 28, 1.8);
      audio.bigExplode();
      shake = 1.4;
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    m.position.x -= 14 * dt;
    if (m.position.x <= play.fw - 14) {
      b.entered = true;
      say('kamus', "It flies like me... banks like me... Gorgon, you built a KNOCKOFF?! Now I'm insulted.", 'k_boss8');
    }
    return;
  }

  const phase = bossPhase();
  const delay = phase === 1 ? 1.2 : phase === 2 ? 0.8 : 0.5;

  // record your movement and echo it back after the delay
  b.hist.push({ t: b.t, y: player.pos.y });
  while (b.hist.length > 2 && b.hist[0].t < b.t - 2) b.hist.shift();
  let echoY = 0;
  for (let i = b.hist.length - 1; i >= 0; i--) {
    if (b.hist[i].t <= b.t - delay) { echoY = b.hist[i].y; break; }
  }
  m.position.x = play.fw - 14 + Math.sin(b.t * 0.6) * 3;
  m.position.y = THREE.MathUtils.lerp(m.position.y,
    THREE.MathUtils.clamp(echoY, -(play.lat - 6), play.lat - 6), Math.min(1, 8 * dt));
  m.rotation.x = THREE.MathUtils.lerp(m.rotation.x, ship.rotation.x * -1, 6 * dt); // mirrored bank

  // cloak flicker (phase 2+)
  if (phase >= 2) {
    b.cloakT -= dt;
    if (!b.cloaked && b.cloakT <= 0) { b.cloaked = true; b.cloakT = 1.5; audio.radio(); }
    else if (b.cloaked && b.cloakT <= 0) { b.cloaked = false; b.cloakT = phase === 3 ? 4 : 6; }
  }
  const fade = b.cloaked ? 0.1 : 1;
  for (const mat of b.mats) mat.opacity += (fade - mat.opacity) * Math.min(1, 6 * dt);

  if (!player.alive) return;

  // your own shots, returned with interest
  if (player.fireCool > b.prevFC + 0.05) b.fireQ.push(b.t);
  b.prevFC = player.fireCool;
  while (b.fireQ.length && b.fireQ[0] <= b.t - delay) {
    b.fireQ.shift();
    b.mirrorCount++;
    const every = phase === 1 ? 3 : 2;
    if (b.mirrorCount % every === 0 && !b.cloaked) {
      if (phase >= 2) {
        enemyFire(m.position, 30, 0);
        enemyFire(m.position, 30, 0.18);
        enemyFire(m.position, 30, -0.18);
      } else enemyFire(m.position, 30);
    }
  }
  // baseline volley so a pacifist run can't stall it out
  b.cool.base -= dt;
  if (b.cool.base <= 0 && !b.cloaked) {
    for (let k = 0; k < 3; k++)
      setTimeout(() => {
        if (boss && boss.kind === 'mirror' && !boss.dying && !boss.cloaked && player.alive)
          enemyFire(boss.mesh.position, 28);
      }, k * 130);
    b.cool.base = phase === 1 ? 4 : phase === 2 ? 3 : 2.2;
  }
  if (phase >= 2) {
    b.cool.spawn -= dt;
    if (b.cool.spawn <= 0) {
      spawnEnemy(phase === 3 ? 'splitter' : 'phantom', (Math.random() * 2 - 1) * (play.lat - 8));
      b.cool.spawn = phase === 3 ? 5.5 : 8;
    }
  }
}

// stage 9 boss: the BROOD QUEEN — mother of the entire swarm, racing you
// down her own hive throat, laying live clutches as she goes
function makeQueen() {
  const chitinMat = new THREE.MeshStandardMaterial({ color: 0x4a2a3a, emissive: 0x140810, metalness: 0.5, roughness: 0.4 });
  const sacMat = new THREE.MeshStandardMaterial({ color: 0xe0b050, emissive: 0x6a4210, metalness: 0.1, roughness: 0.4 });

  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(3, 14, 12), chitinMat);
  head.scale.set(1.2, 1, 1);
  g.add(head);
  for (const zz of [-1.2, 1.2]) { // mandibles
    const mand = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.6, 6), chitinMat);
    mand.rotation.z = Math.PI / 2 + zz * 0.25;
    mand.position.set(-3, zz * 0.4, zz * 1.6);
    g.add(mand);
  }
  for (const [yy, zz] of [[1.2, -1], [1.2, 1], [1.7, -0.4], [1.7, 0.4]]) { // eyes
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x80ff40 }));
    eye.position.set(-2, yy, zz);
    g.add(eye);
  }
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 10), chitinMat);
  thorax.position.x = 3.5;
  g.add(thorax);
  const sac = new THREE.Mesh(new THREE.SphereGeometry(4, 14, 12), sacMat); // the weak point
  sac.position.x = 8;
  sac.scale.set(1.3, 0.95, 0.95);
  g.add(sac);
  for (let i = 0; i < 6; i++) { // legs
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 4.5, 5), chitinMat);
    leg.position.set(i * 1.6 - 1, (i % 2 === 0 ? 1 : -1) * 2.6, -1);
    leg.rotation.x = (i % 2 === 0 ? 1 : -1) * 0.8;
    g.add(leg);
  }
  g.add(new THREE.PointLight(0xc0ff60, 50, 40));
  g.position.set(play.fw + 26, 0, 0);
  scene.add(g);

  return {
    kind: 'queen', mesh: g, sac, sacMat,
    hp: 400, maxHp: 400, bounty: 30000,
    radius: 3.6, sacOff: 8, sacR: 4.4,
    t: 0, entered: false, dying: 0,
    dashT: 9, dashPhase: 'idle', dashClock: 0, dashX: 0,
    cool: { spit: 2.4, brood: 6, clutch: 9, ring: 3.4 },
  };
}

function updateQueen(dt) {
  const b = boss, m = b.mesh;
  b.t += dt;
  b.sac.scale.setScalar(1 + Math.sin(b.t * 4) * 0.05);
  b.sac.scale.x *= 1.3;

  if (b.dying > 0) {
    b.dying -= dt;
    if (Math.random() < 0.45) {
      burst(m.position.clone().add(new THREE.Vector3(
        Math.random() * 12 - 4, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4)), 12, 20, 1.3);
      audio.explode();
      shake = Math.max(shake, 0.6);
    }
    if (b.dying <= 0) {
      burst(m.position, 70, 32, 2.2);
      audio.bigExplode();
      shake = 1.6;
      // the swarm dies with its mother: clear every hatchling on screen
      for (let i = enemies.length - 1; i >= 0; i--) {
        burst(enemies[i].mesh.position, 6, 10, 0.8);
        scene.remove(enemies[i].mesh);
        enemies.splice(i, 1);
      }
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    m.position.x -= 14 * dt;
    if (m.position.x <= -play.fw + 58) {
      b.entered = true;
      say('kamus', "THAT'S the queen?! She's the size of a cruiser... Okay. Aim for the squishy part.", 'k_boss9');
    }
    return;
  }

  const phase = bossPhase();

  // lunge cycle (phase 3): she snaps back at you down the tunnel
  if (phase >= 3) {
    if (b.dashPhase === 'idle') {
      b.dashT -= dt;
      if (b.dashT <= 0) {
        b.dashPhase = 'tele';
        b.dashClock = 0.6;
        b.sacMat.emissive.setHex(0xffffff);
        audio.hit();
      }
    } else if (b.dashPhase === 'tele') {
      b.dashClock -= dt;
      if (b.dashClock <= 0) {
        b.dashPhase = 'lunge';
        b.dashClock = 0.5;
        b.sacMat.emissive.setHex(0x6a4210);
      }
    } else if (b.dashPhase === 'lunge') {
      b.dashClock -= dt;
      b.dashX = Math.max(b.dashX - 46 * dt, -(play.fw * 2 - 34));
      if (b.dashClock <= 0) b.dashPhase = 'return';
    } else {
      b.dashX += 18 * dt;
      if (b.dashX >= 0) { b.dashX = 0; b.dashPhase = 'idle'; b.dashT = 6; }
    }
  }
  const sp = phase === 1 ? 1 : phase === 2 ? 1.25 : 1.5;
  m.position.x = -play.fw + 58 + Math.sin(b.t * 0.45) * 4 + b.dashX;
  m.position.y = Math.sin(b.t * 0.7 * sp) * (play.lat - 9);
  m.rotation.x = Math.cos(b.t * 0.7 * sp) * 0.2;

  if (!player.alive) return;

  b.cool.spit -= dt; // acid spit, aimed
  if (b.cool.spit <= 0) {
    for (let k = 0; k < 3; k++)
      setTimeout(() => {
        if (boss && boss.kind === 'queen' && !boss.dying && player.alive)
          enemyFire(boss.mesh.position, 27);
      }, k * 140);
    b.cool.spit = phase === 1 ? 2.5 : phase === 2 ? 1.9 : 1.4;
  }
  b.cool.brood -= dt; // live hatchlings
  if (b.cool.brood <= 0 && enemies.length < 40) {
    for (const off of [4, -4])
      spawnEnemy(phase === 3 ? 'splitter' : 'drone', m.position.y + off,
        { x: m.position.x - 4, amp: 3 });
    b.cool.brood = phase === 1 ? 6.5 : 5;
  }
  b.cool.clutch -= dt; // lays a live clutch into the tunnel — priority target
  if (b.cool.clutch <= 0 && enemies.length < 38) {
    spawnEnemy('egg', THREE.MathUtils.clamp(m.position.y, -(play.lat - 6), play.lat - 6),
      { x: m.position.x - 9 });
    audio.enemyShoot();
    b.cool.clutch = phase === 3 ? 8 : 10;
  }
  if (phase >= 2) {
    b.cool.ring -= dt; // spore burst
    if (b.cool.ring <= 0) {
      const off = Math.random() * Math.PI;
      const n = phase === 3 ? 14 : 11;
      for (let k = 0; k < n; k++)
        enemyFireAngle(m.position, off + k / n * Math.PI * 2, 15);
      audio.enemyShoot();
      b.cool.ring = 3.4;
    }
  }
}

// stage 10 boss: the CHROME FANG — Vex's flagship, a cathedral with engines
function makeChromeFang() {
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0x9aa0ac, metalness: 0.9, roughness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x201826, metalness: 0.7, roughness: 0.5 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x5a2080, emissive: 0x1c0a2a, metalness: 0.6, roughness: 0.4 });

  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 5), darkMat);
  g.add(hull);
  const fang = new THREE.Mesh(new THREE.ConeGeometry(2.6, 10, 4), chromeMat); // the namesake prow
  fang.rotation.z = Math.PI / 2;
  fang.rotation.y = Math.PI / 4;
  fang.position.x = -12;
  g.add(fang);
  for (const yy of [-3.4, 3.4]) { // cape-like fins
    const fin = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 0.6), trimMat);
    fin.position.set(3, yy, 0);
    fin.rotation.z = yy > 0 ? -0.25 : 0.25;
    g.add(fin);
  }
  // the bridge tower — Vex's throne sits here (weak point)
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 3), chromeMat);
  bridge.position.set(4, 4.4, 0);
  g.add(bridge);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  eye.position.set(1.8, 4.4, 0);
  g.add(eye);
  for (const yy of [-1.6, 1.6]) { // engines
    const fl = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4, 8),
      new THREE.MeshBasicMaterial({ color: 0xb060ff }));
    fl.rotation.z = -Math.PI / 2;
    fl.position.set(9.5, yy, 0);
    g.add(fl);
  }
  g.add(new THREE.PointLight(0xb060ff, 60, 45));
  g.position.set(play.fw + 26, 0, 0);
  scene.add(g);

  return {
    kind: 'chromefang', mesh: g, eye,
    hp: 450, maxHp: 450, bounty: 32000,
    radius: 7, bridgeOff: new THREE.Vector3(4, 4.4, 0), bridgeR: 3.2,
    t: 0, entered: false, dying: 0, zeraaTurn: false,
    gapPhase: Math.random() * Math.PI * 2,
    dashT: 8, dashPhase: 'idle', dashClock: 0, dashX: 0,
    cool: { wall: 4, aim: 2.4, fan: 3.6, launch: 7, spiral: 0 },
    spiralA: 0,
  };
}

function updateChromeFang(dt) {
  const b = boss, m = b.mesh;
  b.t += dt;

  if (b.dying > 0) {
    b.dying -= dt;
    if (!b.saidFlee) {
      b.saidFlee = true;
      say('vex', 'This ship... was only ONE of my bodies, little pilot. Come to the palace. Come and MEET the rest.', 'v_flee', 4);
    }
    if (Math.random() < 0.45) {
      burst(m.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6)), 14, 22, 1.5);
      audio.explode();
      shake = Math.max(shake, 0.7);
    }
    if (b.dying <= 0) {
      burst(m.position, 80, 34, 2.4);
      audio.bigExplode();
      shake = 1.7;
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    m.position.x -= 11 * dt;
    if (m.position.x <= play.fw - 17) {
      b.entered = true;
      say('vex', 'Alone at last, little pilot. No fleet, no home, no siren song to save you. Only the Fang.', 'v_boss10', 4);
      say('kamus', "That's not a ship, that's a cathedral with engines. Fine. Big things make big targets.", 'k_boss10', 3);
    }
    return;
  }

  const phase = bossPhase();

  // at half health, Zeraa picks her side — in front of everyone
  if (!b.zeraaTurn && b.hp <= b.maxHp * 0.5) {
    b.zeraaTurn = true;
    zeraaRun();
    b.hp -= 30;
    updateBossBar();
    burst(m.position.clone().add(new THREE.Vector3(-6, 2, 0)), 24, 22, 1.5);
    audio.explode();
    say('vex', 'ZERAA?! You dare turn that ship against ME?! TRAITOR!', 'v_shock', 3);
    say('zeraa', 'I told you, darling — I chose the wrong side. Consider this my resignation.', 'z_side', 3.5);
  }

  // dash ram (phase 3)
  if (phase >= 3) {
    if (b.dashPhase === 'idle') {
      b.dashT -= dt;
      if (b.dashT <= 0) { b.dashPhase = 'tele'; b.dashClock = 0.7; b.eye.material.color.setHex(0xffffff); audio.hit(); }
    } else if (b.dashPhase === 'tele') {
      b.dashClock -= dt;
      if (b.dashClock <= 0) { b.dashPhase = 'lunge'; b.dashClock = 0.6; b.eye.material.color.setHex(0xff2020); }
    } else if (b.dashPhase === 'lunge') {
      b.dashClock -= dt;
      b.dashX = Math.max(b.dashX - 44 * dt, -play.fw * 1.1);
      if (b.dashClock <= 0) b.dashPhase = 'return';
    } else {
      b.dashX += 16 * dt;
      if (b.dashX >= 0) { b.dashX = 0; b.dashPhase = 'idle'; b.dashT = 6; }
    }
  }
  m.position.x = play.fw - 17 + Math.sin(b.t * 0.4) * 2.5 + b.dashX;
  m.position.y = Math.sin(b.t * 0.55 * (phase === 3 ? 1.4 : 1)) * (play.lat - 13);

  if (!player.alive) return;

  b.cool.wall -= dt; // the rolling broadside: a wall with a moving gap
  if (b.cool.wall <= 0) {
    b.gapPhase += 1.1;
    const gapY = Math.sin(b.gapPhase) * (play.lat - 9);
    for (let y = -play.lat + 3; y <= play.lat - 3; y += 3.6) {
      if (Math.abs(y - gapY) < 5.2) continue; // the way through
      enemyFireAngle(new THREE.Vector3(m.position.x - 10, y, 0), Math.PI, 20);
    }
    audio.enemyShoot();
    b.cool.wall = phase === 1 ? 4.4 : phase === 2 ? 3.6 : 3;
  }
  b.cool.aim -= dt;
  if (b.cool.aim <= 0) {
    for (let k = 0; k < 3; k++)
      setTimeout(() => {
        if (boss && boss.kind === 'chromefang' && !boss.dying && player.alive)
          enemyFire(boss.mesh.position.clone().add(boss.bridgeOff), 28);
      }, k * 130);
    b.cool.aim = phase === 1 ? 2.6 : 2;
  }
  if (phase >= 2) {
    b.cool.fan -= dt;
    if (b.cool.fan <= 0) {
      for (let k = -2; k <= 2; k++) enemyFire(m.position, 23, k * 0.22);
      b.cool.fan = 3.4;
    }
    b.cool.launch -= dt;
    if (b.cool.launch <= 0 && enemies.length < 30) { // scrambles interceptors
      raiders(2);
      b.cool.launch = 8;
    }
  }
  if (phase >= 3) {
    b.cool.spiral += dt;
    while (b.cool.spiral >= 0.14) {
      b.cool.spiral -= 0.14;
      enemyFireAngle(m.position, b.spiralA, 17);
      enemyFireAngle(m.position, -b.spiralA + Math.PI, 17);
      b.spiralA += 0.48;
    }
  }
}

// stage 11 boss: the SERPENT THRONE — Vex's walking throne-mech, stomping the
// palace grounds. Alternates ranged stance (exposed) and charge stance (shielded)
function makeThrone() {
  const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x16101e, metalness: 0.8, roughness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.9, roughness: 0.2 });
  const snakeMat = new THREE.MeshStandardMaterial({ color: 0x5a2080, emissive: 0x1c0a2a, metalness: 0.6, roughness: 0.4 });

  const g = new THREE.Group();
  // four stomping legs
  const legs = [];
  for (const [yy, xx] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 7, 6), obsidianMat);
    leg.rotation.x = Math.PI / 2;
    leg.position.set(xx, yy, -2);
    g.add(leg);
    legs.push(leg);
  }
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.5, 2, 8), obsidianMat);
  dais.rotation.x = Math.PI / 2;
  g.add(dais);
  // coiled serpent armrests
  for (const yy of [-3.4, 3.4]) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(2, 0.5, 6, 18, Math.PI * 1.5), snakeMat);
    coil.position.set(0, yy, 1.6);
    g.add(coil);
  }
  const throne = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.2, 4.6), obsidianMat);
  throne.position.set(1.6, 0, 3);
  g.add(throne);
  // Vex himself on the throne — the weak point
  const vexBody = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 6), snakeMat);
  vexBody.position.set(-0.6, 0, 3.4);
  vexBody.rotation.x = Math.PI / 2;
  g.add(vexBody);
  const vexHead = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), chromeMat);
  vexHead.position.set(-0.6, 0, 4.9);
  g.add(vexHead);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  eye.position.set(-1.3, 0, 4.9);
  g.add(eye);
  // charge-stance shield dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8.4, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xb060ff, transparent: true, opacity: 0, depthWrite: false }));
  g.add(dome);
  g.add(new THREE.PointLight(0xb060ff, 60, 45));
  g.position.set(play.fw + 26, 0, -3);
  scene.add(g);

  return {
    kind: 'throne', mesh: g, legs, dome, eye,
    hp: 500, maxHp: 500, bounty: 36000,
    radius: 7, vexOff: new THREE.Vector3(-0.6, 0, 0), vexR: 3,
    t: 0, entered: false, dying: 0,
    stance: 'ranged', stanceT: 8, baseX: 0, chargeX: 0,
    gapPhase: Math.random() * Math.PI * 2, spiralA: 0, spiralT: 0,
    cool: { wall: 4.2, aim: 2.4, homing: 3.4, spawn: 7, ring: 1.2 },
  };
}

function updateThrone(dt) {
  const b = boss, m = b.mesh;
  b.t += dt;
  b.legs.forEach((leg, i) => { // stomping gait
    leg.position.z = -2 + Math.max(0, Math.sin(b.t * 5 + i * Math.PI / 2)) * 0.9;
  });

  if (b.dying > 0) {
    b.dying -= dt;
    if (!b.saidDefeat) {
      b.saidDefeat = true;
      say('vex', 'A chair... it was only a CHAIR. The Gorgon core waits for me, little pilot. Come — and watch me become ETERNAL.', 'v_defeat', 4.5);
    }
    if (Math.random() < 0.45) {
      burst(m.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, Math.random() * 6)), 14, 22, 1.5);
      audio.explode();
      shake = Math.max(shake, 0.7);
    }
    if (b.dying <= 0) {
      burst(m.position, 80, 34, 2.4);
      audio.bigExplode();
      shake = 1.7;
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    m.position.x -= 10 * dt;
    if (m.position.x <= play.fw - 16) {
      b.entered = true;
      b.baseX = m.position.x;
      say('vex', 'You wished to meet the rest of me? BEHOLD the Serpent Throne. Kneel, little pilot — everyone does, in the end.', 'v_boss11', 4.5);
      say('kamus', "A giant walking chair. He built a giant... walking... CHAIR. I can't let him win — imagine the sequel.", 'k_boss11', 3.5);
    }
    return;
  }

  const phase = bossPhase();

  // stance clock: exposed artillery platform <-> shielded charging stomp
  b.stanceT -= dt;
  if (b.stance === 'ranged' && b.stanceT <= 0) {
    b.stance = 'charge';
    b.stanceT = phase === 3 ? 7 : 6;
    audio.hit();
  } else if (b.stance === 'charge' && b.stanceT <= 0) {
    b.stance = 'ranged';
    b.stanceT = phase === 3 ? 6 : 8;
  }
  const shielded = b.stance === 'charge';
  b.dome.material.opacity += ((shielded ? 0.22 : 0) - b.dome.material.opacity) * Math.min(1, 6 * dt);

  if (shielded) {
    // stomps down the field toward you, shrugging off fire, ringing on each step
    b.chargeX = Math.min(b.chargeX + 14 * dt, play.fw * 1.15);
    b.ringT = (b.ringT ?? 0) - dt;
    if (b.ringT <= 0 && player.alive) {
      const n = phase === 3 ? 12 : 9;
      const off = Math.random() * Math.PI;
      for (let k = 0; k < n; k++)
        enemyFireAngle(m.position, off + k / n * Math.PI * 2, 16);
      audio.enemyShoot();
      shake = Math.max(shake, 0.3);
      b.ringT = 1.3;
    }
  } else {
    b.chargeX = Math.max(0, b.chargeX - 20 * dt); // withdraws to its firing line
  }
  m.position.x = b.baseX - b.chargeX + Math.sin(b.t * 0.4) * 2;
  m.position.y = Math.sin(b.t * 0.5 * (phase === 3 ? 1.4 : 1)) * (play.lat - 12);

  if (!player.alive || shielded) return;

  b.cool.wall -= dt; // artillery wall with a gap
  if (b.cool.wall <= 0) {
    b.gapPhase += 1.3;
    const gapY = Math.sin(b.gapPhase) * (play.lat - 10);
    for (let y = -play.lat + 3; y <= play.lat - 3; y += 3.8) {
      if (Math.abs(y - gapY) < 5.4) continue;
      enemyFireAngle(new THREE.Vector3(m.position.x - 8, y, 0), Math.PI, 19);
    }
    audio.enemyShoot();
    b.cool.wall = phase === 1 ? 4.6 : phase === 2 ? 3.8 : 3.2;
  }
  b.cool.aim -= dt;
  if (b.cool.aim <= 0) {
    for (let k = 0; k < 3; k++)
      setTimeout(() => {
        if (boss && boss.kind === 'throne' && !boss.dying && boss.stance === 'ranged' && player.alive)
          enemyFire(boss.mesh.position, 28);
      }, k * 130);
    b.cool.aim = phase === 1 ? 2.6 : 2;
  }
  if (phase >= 2) {
    b.cool.homing -= dt;
    if (b.cool.homing <= 0) {
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, 5, 0)), 17);
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, -5, 0)), 17);
      b.cool.homing = phase === 3 ? 2.8 : 3.4;
    }
  }
  if (phase >= 3) {
    b.cool.spawn -= dt; // the royal guard sallies out
    if (b.cool.spawn <= 0 && enemies.length < 32) {
      spawnEnemy('tank', m.position.y + (Math.random() > 0.5 ? 9 : -9));
      spawnEnemy('lancer', (Math.random() * 2 - 1) * (play.lat - 8));
      b.cool.spawn = 8;
    }
  }
}

// stage 12 boss: VEX ETERNAL — three forms. The exo-frame, the Gorgon's Eye,
// and at the last, Gorgon Prime: what's left of Vex fused into the core itself.
function makeVexFinal() {
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x16101e, metalness: 0.8, roughness: 0.3 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.9, roughness: 0.2 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x5a2080, emissive: 0x1c0a2a, metalness: 0.6, roughness: 0.4 });

  // FORM 1 — VEX ASCENDANT: a fighter-sized exo-frame with his skull for a nose
  const f1 = new THREE.Group();
  const f1body = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 6), darkMat);
  f1body.rotation.z = Math.PI / 2;
  f1.add(f1body);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), chromeMat);
  skull.position.x = -3.2;
  f1.add(skull);
  const f1eye = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  f1eye.position.set(-4.1, 0.2, 0);
  f1.add(f1eye);
  for (const zz of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.25, 2.6), trimMat);
    blade.position.set(1.2, 0, zz * 2.2);
    blade.rotation.y = zz * 0.4;
    f1.add(blade);
  }
  const f1flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 8),
    new THREE.MeshBasicMaterial({ color: 0xb060ff }));
  f1flame.rotation.z = -Math.PI / 2;
  f1flame.position.x = 4.4;
  f1.add(f1flame);

  // FORM 2 — THE GORGON'S EYE: the core opens; four shield plates orbit it
  const f2 = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(5, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x2a1830, emissive: 0x0e0614, metalness: 0.5, roughness: 0.4 }));
  f2.add(orb);
  const iris = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd040, emissive: 0xa06010, metalness: 0.2, roughness: 0.2 }));
  iris.position.x = -3.2;
  f2.add(iris);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x100808 }));
  pupil.position.x = -4.6;
  f2.add(pupil);
  const plates = [];
  for (let i = 0; i < 4; i++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.6, 3.2), chromeMat);
    f2.add(plate);
    plates.push(plate);
  }
  f2.visible = false;

  // FORM 3 — GORGON PRIME: the cracked core, spiked, with Vex's face in it
  const f3 = new THREE.Group();
  const core3 = new THREE.Mesh(new THREE.SphereGeometry(5, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x6a1020, emissive: 0x400810, metalness: 0.3, roughness: 0.3 }));
  f3.add(core3);
  for (let i = 0; i < 8; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.4, 5), darkMat);
    const a = i / 8 * Math.PI * 2;
    spike.position.set(Math.cos(a) * 5.2, Math.sin(a) * 5.2, 0);
    spike.rotation.z = a - Math.PI / 2;
    f3.add(spike);
  }
  const face = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), chromeMat);
  face.position.x = -4.4;
  f3.add(face);
  const f3eye = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  f3eye.position.set(-5.6, 0.3, 0);
  f3.add(f3eye);
  f3.visible = false;

  const light = new THREE.PointLight(0xb060ff, 70, 50);
  f1.add(light.clone()); f2.add(light.clone()); f3.add(light.clone());
  const start = new THREE.Vector3(play.fw + 24, 0, 0);
  f1.position.copy(start); f2.position.copy(start); f3.position.copy(start);
  scene.add(f1); scene.add(f2); scene.add(f3);

  return {
    kind: 'vexfinal', mesh: f1, forms: [f1, f2, f3], extras: [f1, f2, f3],
    plates, core3, form: 1, formHp: [300, 350, 250],
    hp: 300, reserve: 600, maxHp: 300, totalMax: 900, bounty: 50000,
    radius: 3.2, t: 0, entered: false, dying: 0, transitionT: 0,
    dashT: 6.5, dashPhase: 'idle', dashClock: 0, dashX: 0,
    spiralA: 0, spiralT: 0, gapPhase: 0,
    cool: { aim: 2.2, fan: 3.4, wall: 4, homing: 3, ring: 2.6, spawn: 6 },
  };
}

function vexNextForm() {
  const b = boss;
  b.form += 1;
  const next = b.formHp[b.form - 1];
  b.hp = next;
  b.reserve -= next;
  b.transitionT = 2.4;
  burst(b.mesh.position, 50, 30, 2);
  audio.bigExplode();
  shake = 1.4;
  // dps-driven music escalation: the theme TRANSFORMS with each form
  if (audioStarted) audio.swapSong(b.form === 2 ? 'boss12b' : 'boss12c', 0.7);
  if (b.form === 2) {
    say('vex', 'Flesh... failed me. The CORE will not. BEHOLD THE EYE OF THE GORGON.', 'v_form2', 3.5);
  } else {
    // the sacrifice: Zeraa takes the gaze meant for Kamus
    zeraaRun();
    say('zeraa', "Kamus, MOVE— One good deed, darling... make it count—", 'z_sacrifice', 3);
    say('kamus', 'ZERAA! ...You want eternal, Vex? Let me show you what BURNS forever.', 'k_rage', 3.5);
    player.shield = true; // her parting gift
    updateLivesHud();
  }
}

function updateVexFinal(dt) {
  const b = boss;
  b.t += dt;

  if (b.transitionT > 0) { // form swap: invulnerable, wreathed in explosions
    b.transitionT -= dt;
    if (Math.random() < 0.4) {
      burst(b.mesh.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 4)), 10, 18, 1.2);
      audio.explode();
    }
    if (b.transitionT <= 1.2 && b.mesh !== b.forms[b.form - 1]) {
      const pos = b.mesh.position.clone();
      b.mesh.visible = false;
      b.mesh = b.forms[b.form - 1];
      b.mesh.position.copy(pos);
      b.mesh.visible = true;
      b.radius = b.form === 1 ? 3.2 : 5.2;
    }
    return;
  }

  if (b.dying > 0) {
    b.dying -= dt;
    if (!b.saidEnd) {
      b.saidEnd = true;
      say('vex', 'Impossible... I was... I was going to be... eternal...', 'v_end', 3.5);
    }
    if (Math.random() < 0.5) {
      burst(b.mesh.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6)), 16, 24, 1.6);
      audio.explode();
      shake = Math.max(shake, 0.8);
    }
    if (b.dying <= 0) {
      burst(b.mesh.position, 90, 36, 2.6);
      audio.bigExplode();
      shake = 2;
      for (let i = enemies.length - 1; i >= 0; i--) { // the Gorgon dies entirely
        burst(enemies[i].mesh.position, 6, 10, 0.8);
        scene.remove(enemies[i].mesh);
        enemies.splice(i, 1);
      }
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    b.mesh.position.x -= 14 * dt;
    if (b.mesh.position.x <= play.fw - 14) {
      b.entered = true;
      say('vex', 'You are too late, little pilot. The core and I are ONE. Kneel before VEX ETERNAL.', 'v_eternal', 4);
    }
    return;
  }

  const m = b.mesh;
  if (b.form === 1) {
    // exo-frame: fast, personal, duelist
    if (b.dashPhase === 'idle') {
      b.dashT -= dt;
      if (b.dashT <= 0) { b.dashPhase = 'lunge'; b.dashClock = 0.5; audio.hit(); }
    } else if (b.dashPhase === 'lunge') {
      b.dashClock -= dt;
      b.dashX = Math.max(b.dashX - 40 * dt, -play.fw * 1.2);
      if (b.dashClock <= 0) b.dashPhase = 'return';
    } else {
      b.dashX += 18 * dt;
      if (b.dashX >= 0) { b.dashX = 0; b.dashPhase = 'idle'; b.dashT = 6.5; }
    }
    m.position.x = play.fw - 14 + Math.sin(b.t * 0.7) * 5 + b.dashX;
    m.position.y = Math.sin(b.t * 1.1) * (play.lat - 8);
    m.rotation.x = Math.cos(b.t * 1.1) * 0.4;
    if (!player.alive) return;
    b.cool.aim -= dt;
    if (b.cool.aim <= 0) {
      for (let k = 0; k < 3; k++)
        setTimeout(() => {
          if (boss && boss.kind === 'vexfinal' && !boss.dying && !boss.transitionT && player.alive)
            enemyFire(boss.mesh.position, 30);
        }, k * 120);
      b.cool.aim = 1.9;
    }
    b.cool.fan -= dt;
    if (b.cool.fan <= 0) {
      for (let k = -2; k <= 2; k++) enemyFire(m.position, 24, k * 0.2);
      b.cool.fan = 3.2;
    }
  } else if (b.form === 2) {
    // the Eye: fortified artillery core behind orbiting plates
    m.position.x = play.fw - 15 + Math.sin(b.t * 0.3) * 2;
    m.position.y = Math.sin(b.t * 0.4) * (play.lat - 14);
    b.plates.forEach((p, i) => {
      const a = b.t * 1.2 + i * Math.PI / 2;
      p.position.set(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 0);
      p.rotation.z = a;
    });
    if (!player.alive) return;
    b.spiralT += dt;
    while (b.spiralT >= 0.12) {
      b.spiralT -= 0.12;
      enemyFireAngle(m.position, b.spiralA, 17);
      enemyFireAngle(m.position, -b.spiralA + Math.PI, 17);
      b.spiralA += 0.46;
    }
    b.cool.wall -= dt;
    if (b.cool.wall <= 0) {
      b.gapPhase += 1.2;
      const gapY = Math.sin(b.gapPhase) * (play.lat - 9);
      for (let y = -play.lat + 3; y <= play.lat - 3; y += 3.8) {
        if (Math.abs(y - gapY) < 5.4) continue;
        enemyFireAngle(new THREE.Vector3(m.position.x - 7, y, 0), Math.PI, 19);
      }
      audio.enemyShoot();
      b.cool.wall = 4.2;
    }
    b.cool.homing -= dt;
    if (b.cool.homing <= 0) {
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, 5, 0)), 17);
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, -5, 0)), 17);
      b.cool.homing = 3;
    }
  } else {
    // Gorgon Prime: pure escalation — survive the storm
    const pulse = 1 + Math.sin(b.t * 6) * 0.05;
    b.core3.scale.setScalar(pulse);
    m.position.x = play.fw - 15;
    m.position.y = Math.sin(b.t * 0.6) * (play.lat - 12);
    if (!player.alive) return;
    b.spiralT += dt;
    while (b.spiralT >= 0.09) {
      b.spiralT -= 0.09;
      enemyFireAngle(m.position, b.spiralA, 19);
      enemyFireAngle(m.position, -b.spiralA + Math.PI, 19);
      b.spiralA += 0.52;
    }
    b.cool.ring -= dt;
    if (b.cool.ring <= 0) {
      const off = Math.random() * Math.PI;
      for (let k = 0; k < 14; k++)
        enemyFireAngle(m.position, off + k / 14 * Math.PI * 2, 16);
      audio.enemyShoot();
      b.cool.ring = 2.6;
    }
    b.cool.aim -= dt;
    if (b.cool.aim <= 0) {
      enemyFire(m.position, 30);
      b.cool.aim = 1.6;
    }
    b.cool.spawn -= dt;
    if (b.cool.spawn <= 0 && enemies.length < 26) {
      spawnEnemy(Math.random() > 0.5 ? 'phantom' : 'splitter',
        (Math.random() * 2 - 1) * (play.lat - 8));
      b.cool.spawn = 6;
    }
  }
}

function spawnBoss() {
  const st = STAGES[stageIdx];
  boss = st.makeBoss();
  document.getElementById('bossname').textContent = st.bossName;
  document.getElementById('bossbar-wrap').classList.add('on');
  updateBossBar();
}

function updateBossBar() {
  let hp = boss.hp + (boss.reserve || 0);
  if (boss.pods) for (const p of boss.pods) if (p.alive) hp += Math.max(0, p.hp);
  document.getElementById('bossbar').style.width =
    Math.max(0, hp / (boss.totalMax || boss.maxHp) * 100) + '%';
}

function bossPhase() {
  return boss.hp > boss.maxHp * 0.66 ? 1 : boss.hp > boss.maxHp * 0.33 ? 2 : 3;
}

function removeBoss() {
  scene.remove(boss.mesh);
  if (boss.segs) for (const s of boss.segs) scene.remove(s);
  if (boss.pods) for (const p of boss.pods) if (p.alive) scene.remove(p.mesh);
  if (boss.extras) for (const e of boss.extras) scene.remove(e);
  boss = null;
  document.getElementById('bossbar-wrap').classList.remove('on');
}

function updateBoss(dt) {
  if (!boss) return;
  if (boss.kind === 'carrier') updateCarrier(dt);
  else if (boss.kind === 'serpent') updateSerpent(dt);
  else if (boss.kind === 'fortress') updateFortress(dt);
  else if (boss.kind === 'harvester') updateHarvester(dt);
  else if (boss.kind === 'drillmaw') updateDrillmaw(dt);
  else if (boss.kind === 'colossus') updateColossus(dt);
  else if (boss.kind === 'siren') updateSiren(dt);
  else if (boss.kind === 'mirror') updateMirror(dt);
  else if (boss.kind === 'queen') updateQueen(dt);
  else if (boss.kind === 'chromefang') updateChromeFang(dt);
  else if (boss.kind === 'throne') updateThrone(dt);
  else updateVexFinal(dt);
}

function updateSiren(dt) {
  const b = boss, m = b.mesh;
  b.t += dt;

  if (b.dying > 0) {
    b.dying -= dt;
    if (!b.saidFlee) {
      b.saidFlee = true;
      say('zeraa', '...Perhaps I chose the wrong side after all. Until next time, darling.', 'z_flee', 3);
    }
    if (b.dying > 0.8 && Math.random() < 0.4) {
      burst(m.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4)), 10, 18, 1.1);
      audio.explode();
      shake = Math.max(shake, 0.5);
    }
    if (b.dying <= 0.8) m.position.x += 90 * dt; // she RUNS — trailing smoke, not dead
    if (b.dying <= 0) {
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    m.position.x -= 18 * dt;
    if (m.position.x <= -play.fw + 58) {
      b.entered = true;
      say('zeraa', "Don't take it personally, darling. The Gorgon always collects its debts.", 'z_boss', 3);
    }
    return;
  }

  const phase = bossPhase();

  // veil cycle (phase 2+): cloaks, slings homing orbs, decloaks with a ring
  if (phase >= 2) {
    b.veilT -= dt;
    if (!b.veiled && b.veilT <= 0) {
      b.veiled = true;
      b.veilT = 3;
      b.homingT = 0.4;
      audio.radio();
    } else if (b.veiled && b.veilT <= 0) {
      b.veiled = false;
      b.veilT = phase === 3 ? 6 : 8;
      const off = Math.random() * Math.PI; // decloak strike
      for (let k = 0; k < 12; k++)
        enemyFireAngle(m.position, off + k / 12 * Math.PI * 2, 16);
      audio.enemyShoot();
    }
  }
  const fade = b.veiled ? 0.12 : 1;
  for (const mat of b.mats) mat.opacity += (fade - mat.opacity) * Math.min(1, 6 * dt);
  b.veilMesh.material.opacity = b.veiled ? 0.18 + Math.sin(b.t * 6) * 0.06 : 0;

  // paces ahead of you in the conduit, weaving
  m.position.x = -play.fw + 58 + Math.sin(b.t * 0.5) * 5;
  m.position.y = Math.sin(b.t * 0.75 * (phase === 3 ? 1.5 : 1)) * (play.lat - 8);
  m.rotation.x = Math.cos(b.t * 0.75) * 0.35; // banks with her own weave

  if (!player.alive) return;

  if (b.veiled) { // homing orbs slip out of the shimmer
    b.homingT -= dt;
    if (b.homingT <= 0) {
      enemyFireHoming(m.position, 17);
      b.homingT = 1.1;
    }
    return; // no other attacks while veiled
  }

  b.cool.aim -= dt;
  if (b.cool.aim <= 0) {
    for (let k = 0; k < 3; k++)
      setTimeout(() => {
        if (boss && boss.kind === 'siren' && !boss.dying && !boss.veiled && player.alive)
          enemyFire(boss.mesh.position, 28);
      }, k * 130);
    b.cool.aim = phase === 1 ? 2.4 : phase === 2 ? 1.9 : 1.4;
  }
  b.cool.fan -= dt;
  if (b.cool.fan <= 0) {
    for (let k = -2; k <= 2; k++) enemyFire(m.position, 22, k * 0.22);
    b.cool.fan = phase === 3 ? 2.8 : 3.6;
  }
  if (phase === 3) { // desperate twin spirals
    b.spiralT += dt;
    while (b.spiralT >= 0.12) {
      b.spiralT -= 0.12;
      enemyFireAngle(m.position, b.spiralA, 18);
      enemyFireAngle(m.position, -b.spiralA + Math.PI, 18);
      b.spiralA += 0.5;
    }
  }
  b.cool.spawn -= dt;
  if (b.cool.spawn <= 0) { // mirror escorts
    spawnEnemy(phase === 3 ? 'splitter' : 'phantom', (Math.random() * 2 - 1) * (play.lat - 8));
    b.cool.spawn = phase === 3 ? 5 : 7;
  }
}

function updateColossus(dt) {
  const b = boss, m = b.mesh;
  b.t += dt;
  b.core.rotation.y += 1.5 * dt;

  if (b.dying > 0) {
    b.dying -= dt;
    if (Math.random() < 0.45) {
      const p = m.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 6));
      burst(p, 14, 22, 1.4);
      audio.explode();
      shake = Math.max(shake, 0.7);
    }
    if (b.dying <= 0) {
      burst(m.position, 70, 32, 2.2);
      audio.bigExplode();
      shake = 1.6;
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    m.position.x -= 11 * dt;
    if (m.position.x <= play.fw - 15) {
      b.entered = true;
      say('kamus', 'The junk is fighting back?! Nova, your yard is HAUNTED!', 'k_boss6');
    }
    return;
  }

  if (b.cState === 'collapsed') {
    b.cT -= dt;
    for (const p of b.parts) { // pieces drift apart, slowly spinning
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.z += p.spin * dt;
      p.vel.multiplyScalar(1 - dt * 0.8);
    }
    if (b.cT <= 0) {
      b.cState = 'reassemble';
      b.cT = 1.8;
    }
    return;
  }
  if (b.cState === 'reassemble') {
    b.cT -= dt;
    const k = Math.min(1, 4 * dt);
    for (const p of b.parts) {
      p.mesh.position.lerp(p.home, k);
      p.mesh.rotation.x *= 1 - k;
      p.mesh.rotation.y *= 1 - k;
      p.mesh.rotation.z *= 1 - k;
    }
    if (b.cT <= 0) {
      b.cState = 'fight';
      b.enraged = true;
      for (const p of b.parts) { p.mesh.position.copy(p.home); p.mesh.rotation.set(0, 0, 0); }
      const off = Math.random() * Math.PI; // rebirth blast
      for (let k2 = 0; k2 < 14; k2++)
        enemyFireAngle(m.position, off + k2 / 14 * Math.PI * 2, 17);
      audio.bigExplode();
      shake = 1;
    }
    return;
  }

  // fight
  const rage = b.enraged ? 1.35 : 1;
  m.position.x = play.fw - 15 + Math.sin(b.t * 0.45) * 3;
  m.position.y = Math.sin(b.t * 0.6 * rage) * (play.lat - 13);
  // swing the fist flails
  b.fists.forEach((f, i) => {
    const a = b.t * 1.6 * rage + i * Math.PI;
    const fx = Math.cos(a) * 10, fy = Math.sin(a) * 8;
    f.fist.position.set(fx, fy, 0);
    f.chain.position.set(fx * 0.5, fy * 0.5, 0);
    f.chain.rotation.z = Math.atan2(fy, fx);
    f.chain.scale.x = Math.hypot(fx, fy) * 0.55;
  });

  if (!player.alive) return;

  b.cool.throw -= dt;
  if (b.cool.throw <= 0) { // hurls a chunk of debris at you
    const dy = player.pos.y - m.position.y;
    const dx = Math.max(6, m.position.x - player.pos.x);
    spawnEnemy('astS', m.position.y, {
      x: m.position.x - 7,
      sp: 26, vy: THREE.MathUtils.clamp(dy / (dx / 26), -15, 15),
    });
    b.cool.throw = (b.enraged ? 1.8 : 2.4);
  }
  b.cool.fan -= dt;
  if (b.cool.fan <= 0) {
    for (let k = -2; k <= 2; k++) enemyFire(m.position, 23, k * 0.24);
    b.cool.fan = b.enraged ? 2.8 : 3.6;
  }
  if (b.enraged) {
    b.cool.ring -= dt;
    if (b.cool.ring <= 0) {
      const off = Math.random() * Math.PI;
      for (let k = 0; k < 12; k++)
        enemyFireAngle(m.position, off + k / 12 * Math.PI * 2, 16);
      audio.enemyShoot();
      b.cool.ring = 3.2;
    }
    b.cool.homing -= dt;
    if (b.cool.homing <= 0) {
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, 5, 0)), 17);
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, -5, 0)), 17);
      b.cool.homing = 3.5;
    }
  }
}

function updateCarrier(dt) {
  const b = boss, m = b.mesh;
  b.t += dt;
  m.userData.ring.rotation.x += 2 * dt;
  m.userData.core.rotation.y += 1.5 * dt;

  if (b.dying > 0) {
    b.dying -= dt;
    if (Math.random() < 0.35) {
      const p = m.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6));
      burst(p, 12, 20, 1.3);
      audio.explode();
      shake = Math.max(shake, 0.6);
    }
    if (b.dying <= 0) {
      burst(m.position, 60, 30, 2);
      audio.bigExplode();
      shake = 1.4;
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    m.position.x -= 12 * dt;
    if (m.position.x <= play.fw - 16) {
      b.entered = true;
      say('kamus', 'Whoa— that thing is HUGE. Locking on to the core.', 'k_boss1');
    }
    return;
  }

  const phase = bossPhase();
  const speedMul = phase === 1 ? 1 : phase === 2 ? 1.4 : 1.8;
  m.position.y = Math.sin(b.t * 0.7 * speedMul) * (play.lat - 12);
  m.position.x = play.fw - 16 + Math.sin(b.t * 0.4) * 3;

  const corePos = m.position.clone().add(new THREE.Vector3(-7.4, 0, 0));
  if (!player.alive) return;

  b.cool.aim -= dt;
  if (b.cool.aim <= 0) {
    for (let k = 0; k < 3; k++)
      setTimeout(() => { if (boss && !boss.dying && player.alive) enemyFire(corePos, 30); }, k * 130);
    b.cool.aim = phase === 1 ? 2.4 : phase === 2 ? 1.8 : 1.3;
  }
  b.cool.fan -= dt;
  if (b.cool.fan <= 0) {
    for (let k = -2; k <= 2; k++) enemyFire(corePos, 24, k * 0.22);
    b.cool.fan = phase === 1 ? 4 : 3;
  }
  if (phase >= 2) {
    b.cool.ring -= dt;
    if (b.cool.ring <= 0) {
      const n = phase === 2 ? 12 : 16;
      const off = Math.random() * Math.PI;
      for (let k = 0; k < n; k++)
        enemyFireAngle(corePos, off + k / n * Math.PI * 2, 16);
      audio.enemyShoot();
      b.cool.ring = phase === 2 ? 3.2 : 2.4;
    }
  }
  if (phase === 3) {
    b.cool.spawn -= dt;
    if (b.cool.spawn <= 0) {
      spawnEnemy('drone', (Math.random() * 2 - 1) * (play.lat - 8), { amp: 4 });
      b.cool.spawn = 4;
    }
  }
}

function updateSerpent(dt) {
  const b = boss, head = b.mesh;
  b.t += dt;
  for (const s of b.segs) if (s.userData.fin) s.userData.fin.rotation.y += 3 * dt;

  if (b.dying > 0) {
    b.dying -= dt;
    if (Math.random() < 0.4) {
      const s = b.segs[(Math.random() * b.segs.length) | 0];
      burst(s.position, 12, 20, 1.2);
      audio.explode();
      shake = Math.max(shake, 0.6);
    }
    if (b.dying <= 0) {
      burst(head.position, 50, 28, 1.8);
      audio.bigExplode();
      shake = 1.4;
      removeBoss();
      stageClear();
    }
    return;
  }

  b.prev.copy(head.position);

  if (!b.entered) {
    head.position.x -= 16 * dt;
    if (head.position.x <= play.fw * 0.55) {
      b.entered = true;
      say('kamus', "It moves like a snake... aim for the head. Got it.", 'k_boss2');
    }
  } else {
    const phase = bossPhase();
    const sp = phase === 1 ? 1 : phase === 2 ? 1.3 : 1.6;
    const target = new THREE.Vector3(
      play.fw * 0.28 + Math.sin(b.t * 0.55 * sp) * play.fw * 0.42,
      Math.sin(b.t * 0.9 * sp + 1.2) * (play.lat - 8), 0);
    head.position.lerp(target, Math.min(1, 3.2 * dt));
  }

  // orient the head into its motion, drag the body along the trail
  const dx = head.position.x - b.prev.x, dy = head.position.y - b.prev.y;
  if (Math.abs(dx) + Math.abs(dy) > 0.001)
    head.rotation.z = Math.atan2(dy, dx) + Math.PI;
  // record the path only when the head actually travels, then place segments
  // at fixed arc-length spacing so the body stays stretched at any speed
  if (head.position.distanceTo(b.trail[0]) > 0.22)
    b.trail.unshift(head.position.clone());
  if (b.trail.length > 260) b.trail.pop();
  const spacing = 2.6;
  let acc = 0, ti = 0;
  for (let s = 0; s < b.segs.length; s++) {
    const want = (s + 1) * spacing;
    while (ti < b.trail.length - 1 && acc < want) {
      acc += b.trail[ti].distanceTo(b.trail[ti + 1]);
      ti++;
    }
    b.segs[s].position.copy(b.trail[ti]);
  }

  if (!b.entered || !player.alive) return;

  const phase = bossPhase();
  b.cool.aim -= dt;
  if (b.cool.aim <= 0) {
    for (let k = 0; k < 3; k++)
      setTimeout(() => { if (boss && !boss.dying && player.alive) enemyFire(boss.mesh.position, 28); }, k * 140);
    b.cool.aim = phase === 1 ? 2.4 : phase === 2 ? 1.7 : 1.2;
  }
  b.cool.fan -= dt;
  if (b.cool.fan <= 0) {
    for (let k = -2; k <= 2; k++) enemyFire(head.position, 22, k * 0.26);
    b.cool.fan = phase === 1 ? 4.2 : 3.2;
  }
  if (phase >= 2) {
    b.cool.ring -= dt;
    if (b.cool.ring <= 0) {
      const tail = b.segs[b.segs.length - 1];
      const n = 10 + phase * 2;
      const off = Math.random() * Math.PI;
      for (let k = 0; k < n; k++)
        enemyFireAngle(tail.position, off + k / n * Math.PI * 2, 15);
      audio.enemyShoot();
      b.cool.ring = phase === 2 ? 3.4 : 2.6;
    }
  }
  if (phase === 3) {
    b.cool.spawn -= dt;
    if (b.cool.spawn <= 0) {
      const tail = b.segs[b.segs.length - 1];
      spawnEnemy('mine', tail.position.y, { x: Math.min(tail.position.x, play.fw - 4) });
      b.cool.spawn = 5;
    }
  }
}

function updateFortress(dt) {
  const b = boss, m = b.mesh;
  b.t += dt;
  b.rings[0].rotation.z += 0.9 * dt;
  b.rings[1].rotation.z -= 1.3 * dt;
  b.core.rotation.y += 1.2 * dt;

  if (b.dying > 0) {
    b.dying -= dt;
    if (Math.random() < 0.45) {
      const p = m.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6));
      burst(p, 14, 22, 1.4);
      audio.explode();
      shake = Math.max(shake, 0.7);
    }
    if (b.dying <= 0) {
      burst(m.position, 70, 32, 2.2);
      audio.bigExplode();
      shake = 1.6;
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    m.position.x -= 11 * dt;
    if (m.position.x <= play.fw - 18) {
      b.entered = true;
      say('kamus', 'A fortress?! ...Fine. Big things make big targets.', 'k_boss3');
    }
  }

  const podsAlive = b.pods.some((p) => p.alive);
  const phase = podsAlive ? 0
    : b.hp > b.maxHp * 0.55 ? 1
    : b.hp > b.maxHp * 0.2 ? 2 : 3;

  if (b.entered) {
    // telegraphed dash toward the player (late phases)
    if (phase >= 2) {
      if (b.dashPhase === 'idle') {
        b.dashT -= dt;
        if (b.dashT <= 0) {
          b.dashPhase = 'tele';
          b.dashClock = 0.6;
          b.coreMat.emissive.setHex(0xffffff);
          audio.hit();
        }
      } else if (b.dashPhase === 'tele') {
        b.dashClock -= dt;
        if (b.dashClock <= 0) {
          b.dashPhase = 'lunge';
          b.dashClock = 0.55;
          b.coreMat.emissive.setHex(0xa03010);
        }
      } else if (b.dashPhase === 'lunge') {
        b.dashClock -= dt;
        b.dashX = Math.max(b.dashX - 38 * dt, -play.fw * 0.9);
        if (b.dashClock <= 0) b.dashPhase = 'return';
      } else { // return
        b.dashX += 16 * dt;
        if (b.dashX >= 0) {
          b.dashX = 0;
          b.dashPhase = 'idle';
          b.dashT = phase === 3 ? 5.5 : 7;
        }
      }
    }
    m.position.x = play.fw - 18 + Math.sin(b.t * 0.5) * 2.5 + b.dashX;
    m.position.y = Math.sin(b.t * 0.75) * (play.lat - 13);
  }

  // pods orbit the core
  for (const p of b.pods) {
    if (!p.alive) continue;
    const a = p.a0 + b.t * 0.95;
    p.mesh.position.set(m.position.x + Math.cos(a) * 8.5, m.position.y + Math.sin(a) * 8.5, 0);
    p.mesh.rotation.z += 2 * dt;
  }

  if (!b.entered || !player.alive) return;

  if (podsAlive) {
    b.cool.pod -= dt;
    if (b.cool.pod <= 0) {
      for (const p of b.pods) {
        if (!p.alive) continue;
        const from = p.mesh.position.clone();
        enemyFire(from, 26);
        setTimeout(() => {
          if (boss && boss.kind === 'fortress' && !boss.dying && player.alive) enemyFire(from, 26);
        }, 140);
      }
      b.cool.pod = 2.4;
    }
    b.cool.fan -= dt;
    if (b.cool.fan <= 0) {
      for (let k = -2; k <= 2; k++) enemyFire(m.position, 22, k * 0.24);
      b.cool.fan = 3.4;
    }
    return;
  }

  // core exposed: rotating spiral stream(s)
  const spiralInt = phase === 3 ? 0.085 : phase === 2 ? 0.1 : 0.11;
  const spiralSp = phase === 3 ? 21 : 19;
  b.spiralT += dt;
  while (b.spiralT >= spiralInt) {
    b.spiralT -= spiralInt;
    enemyFireAngle(m.position, b.spiralA, spiralSp);
    if (phase >= 2) enemyFireAngle(m.position, -b.spiralA + Math.PI, spiralSp);
    b.spiralA += 0.42;
  }

  b.cool.aim -= dt;
  if (b.cool.aim <= 0) {
    for (let k = 0; k < 3; k++)
      setTimeout(() => {
        if (boss && boss.kind === 'fortress' && !boss.dying && player.alive) enemyFire(boss.mesh.position, 30);
      }, k * 130);
    b.cool.aim = phase === 1 ? 2.4 : 2.0;
  }
  if (phase >= 2) {
    b.cool.homing -= dt;
    if (b.cool.homing <= 0) {
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, 4, 0)), 17);
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, -4, 0)), 17);
      b.cool.homing = phase === 3 ? 2.8 : 3.2;
    }
  }
  if (phase === 3) {
    b.cool.ring -= dt;
    if (b.cool.ring <= 0) {
      const off = Math.random() * Math.PI;
      for (let k = 0; k < 14; k++)
        enemyFireAngle(m.position, off + k / 14 * Math.PI * 2, 16);
      audio.enemyShoot();
      b.cool.ring = 3;
    }
    b.cool.mine -= dt;
    if (b.cool.mine <= 0) {
      spawnEnemy('mine', m.position.y, { x: Math.max(m.position.x - 10, -play.fw + 10) });
      b.cool.mine = 6;
    }
  }
  b.cool.spawn -= dt;
  if (phase >= 1 && b.cool.spawn <= 0) {
    spawnEnemy('drone', (Math.random() * 2 - 1) * (play.lat - 8), { amp: 4 });
    b.cool.spawn = 5;
  }
}

function updateHarvester(dt) {
  const b = boss, m = b.mesh;
  b.t += dt;
  b.core.rotation.y += 1.4 * dt;
  b.cage.rotation.x += 1.8 * dt;

  if (b.dying > 0) {
    b.dying -= dt;
    if (Math.random() < 0.45) {
      const p = m.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 12, Math.random() * 5));
      burst(p, 14, 22, 1.4);
      audio.explode();
      shake = Math.max(shake, 0.7);
    }
    if (b.dying <= 0) {
      burst(m.position, 70, 32, 2.2);
      audio.bigExplode();
      shake = 1.6;
      removeBoss();
      stageClear();
    }
    return;
  }

  if (!b.entered) {
    m.position.x -= 10 * dt;
    if (m.position.x <= play.fw - 15) {
      b.entered = true;
      say('kamus', "It's EATING the city! Get off my planet, you overgrown lawnmower!", 'k_boss4');
    }
  }

  const phase = b.hp > b.maxHp * 0.7 ? 1 : b.hp > b.maxHp * 0.45 ? 2 : b.hp > b.maxHp * 0.2 ? 3 : 4;

  if (b.entered) {
    // telegraphed forward charge (late phases): it revs and plows toward you
    if (phase >= 3) {
      if (b.dashPhase === 'idle') {
        b.dashT -= dt;
        if (b.dashT <= 0) {
          b.dashPhase = 'tele';
          b.dashClock = 0.7;
          b.coreMat.emissive.setHex(0xffffff);
          audio.hit();
        }
      } else if (b.dashPhase === 'tele') {
        b.dashClock -= dt;
        if (b.dashClock <= 0) {
          b.dashPhase = 'lunge';
          b.dashClock = 0.6;
          b.coreMat.emissive.setHex(0x10a040);
        }
      } else if (b.dashPhase === 'lunge') {
        b.dashClock -= dt;
        b.dashX = Math.max(b.dashX - 42 * dt, -play.fw * 0.95);
        if (b.dashClock <= 0) b.dashPhase = 'return';
      } else {
        b.dashX += 15 * dt;
        if (b.dashX >= 0) {
          b.dashX = 0;
          b.dashPhase = 'idle';
          b.dashT = phase === 4 ? 5 : 7;
        }
      }
    }
    const sp = phase >= 3 ? 1.4 : 1;
    m.position.x = play.fw - 15 + Math.sin(b.t * 0.35) * 2 + b.dashX;
    m.position.y = Math.sin(b.t * 0.55 * sp) * (play.lat - 12);
    m.rotation.z = Math.sin(b.t * 4) * 0.012; // heavy machinery shudder
  }

  if (!b.entered || !player.alive) return;

  // twin cannon alternating aimed bursts
  b.cool.aim -= dt;
  if (b.cool.aim <= 0) {
    b.gunSide = !b.gunSide;
    for (let k = 0; k < 3; k++)
      setTimeout(() => {
        if (boss && boss.kind === 'harvester' && !boss.dying && player.alive)
          enemyFire(boss.mesh.position.clone().add(boss.cannons[b.gunSide ? 0 : 1]), 28);
      }, k * 120);
    b.cool.aim = phase === 1 ? 2.4 : phase === 2 ? 1.9 : 1.5;
  }
  b.cool.fan -= dt;
  if (b.cool.fan <= 0) {
    for (let k = -2; k <= 2; k++) enemyFire(m.position, 23, k * 0.24);
    b.cool.fan = phase >= 3 ? 2.8 : 3.6;
  }
  if (phase >= 2) {
    b.cool.ring -= dt;
    if (b.cool.ring <= 0) { // mortar ring bursting outward
      const n = phase >= 4 ? 16 : 12;
      const off = Math.random() * Math.PI;
      for (let k = 0; k < n; k++)
        enemyFireAngle(m.position, off + k / n * Math.PI * 2, 15);
      audio.enemyShoot();
      b.cool.ring = phase >= 4 ? 2.4 : 3.2;
    }
    b.cool.spawn -= dt;
    if (b.cool.spawn <= 0) { // rolls out escort tanks
      spawnEnemy('tank', m.position.y + (Math.random() > 0.5 ? 8 : -8));
      b.cool.spawn = phase >= 3 ? 4.5 : 6;
    }
  }
  if (phase >= 3) {
    b.cool.homing -= dt;
    if (b.cool.homing <= 0) {
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, 5, 0)), 17);
      enemyFireHoming(m.position.clone().add(new THREE.Vector3(0, -5, 0)), 17);
      b.cool.homing = phase === 4 ? 2.6 : 3.2;
    }
  }
  if (phase === 4) {
    b.cool.barrage -= dt;
    if (b.cool.barrage <= 0) {
      for (let k = -3; k <= 3; k++) enemyFire(m.position, 26, k * 0.14);
      b.cool.barrage = 2.4;
    }
  }
}

function updateDrillmaw(dt) {
  const b = boss, head = b.mesh;
  b.t += dt;
  b.stateT -= dt;
  head.userData.spinner.rotation.x += 9 * dt;

  if (b.dying > 0) {
    b.dying -= dt;
    if (Math.random() < 0.4) {
      const s = b.segs[(Math.random() * b.segs.length) | 0];
      burst(s.position.clone().setZ(0), 12, 20, 1.2);
      audio.explode();
      shake = Math.max(shake, 0.6);
    }
    if (b.dying <= 0) {
      burst(head.position.clone().setZ(0), 55, 30, 2);
      audio.bigExplode();
      shake = 1.5;
      removeBoss();
      stageClear();
    }
    return;
  }

  const phase = bossPhase();
  const latMax = (STAGES[stageIdx].canyon ? canyonWallY() : play.lat) - 8;

  const pushTrail = () => {
    if (head.position.distanceTo(b.trail[0]) > 0.25)
      b.trail.unshift(head.position.clone());
    if (b.trail.length > 200) b.trail.pop();
    const spacing = 3.0;
    let acc = 0, ti = 0;
    for (let s = 0; s < b.segs.length; s++) {
      const want = (s + 1) * spacing;
      while (ti < b.trail.length - 1 && acc < want) {
        acc += b.trail[ti].distanceTo(b.trail[ti + 1]);
        ti++;
      }
      b.segs[s].position.copy(b.trail[ti]);
    }
  };

  if (b.state === 'buried') {
    // the dust mound stalks the player; the worm is untouchable down there
    const speed = 13 + phase * 4;
    const dir = new THREE.Vector3(player.pos.x - b.mound.position.x,
      player.pos.y - b.mound.position.y, 0);
    if (dir.length() > 0.5) {
      dir.normalize();
      b.mound.position.x += dir.x * speed * dt;
      b.mound.position.y = THREE.MathUtils.clamp(
        b.mound.position.y + dir.y * speed * dt, -latMax, latMax);
    }
    const s = 1 + Math.sin(b.t * 9) * 0.12;
    b.mound.scale.set(1.3 * s, 1.3 * s, 0.4);
    if (Math.random() < 0.2) burst(b.mound.position.clone().setZ(-4), 2, 5, 0.6);
    if (b.stateT <= 0) {
      b.state = 'erupt';
      b.stateT = 0.55;
      b.mound.visible = false;
      head.position.set(b.mound.position.x, b.mound.position.y, -9);
      b.trail.length = 0;
      b.trail.push(head.position.clone());
      head.visible = true;
      for (const s2 of b.segs) { s2.visible = true; s2.position.copy(head.position); }
      burst(head.position.clone().setZ(0), 20, 16, 1.3);
      audio.explode();
      shake = Math.max(shake, 0.6);
      if (!b.saidIntro) {
        b.saidIntro = true;
        say('kamus', "It swims through ROCK?! Fine — I'll shoot the rock.", 'k_boss5');
      }
    }
    return;
  }

  if (b.state === 'erupt') {
    head.position.z = Math.min(0, head.position.z + 17 * dt);
    pushTrail();
    if (b.stateT <= 0) {
      b.state = 'surfaced';
      b.stateT = phase === 3 ? 5.5 : 7;
      head.position.z = 0;
      const n = 8 + phase * 2;
      for (let k = 0; k < n; k++)
        enemyFireAngle(head.position, k / n * Math.PI * 2, 15);
      audio.enemyShoot();
    }
    return;
  }

  if (b.state === 'surfaced') {
    b.prev.copy(head.position);
    head.position.x = THREE.MathUtils.clamp(
      head.position.x + Math.sin(b.t * 0.8) * 9 * dt, -play.fw * 0.2, play.fw - 8);
    head.position.y = THREE.MathUtils.clamp(
      head.position.y + Math.cos(b.t * 0.6) * 11 * dt, -latMax, latMax);
    const dx = head.position.x - b.prev.x, dy = head.position.y - b.prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.001)
      head.rotation.z = Math.atan2(dy, dx) + Math.PI;
    pushTrail();
    if (player.alive) {
      b.cool.aim -= dt;
      if (b.cool.aim <= 0) {
        for (let k = 0; k < 3; k++)
          setTimeout(() => {
            if (boss && boss.kind === 'drillmaw' && boss.state === 'surfaced' && player.alive)
              enemyFire(boss.mesh.position, 27);
          }, k * 140);
        b.cool.aim = phase === 1 ? 2.3 : phase === 2 ? 1.8 : 1.3;
      }
      if (phase >= 2) {
        b.cool.fan -= dt;
        if (b.cool.fan <= 0) {
          for (let k = -2; k <= 2; k++) enemyFire(head.position, 21, k * 0.26);
          b.cool.fan = 3.4;
        }
      }
    }
    if (b.stateT <= 0) {
      b.state = 'dive';
      b.stateT = 0.5;
    }
    return;
  }

  // dive
  head.position.z -= 20 * dt;
  pushTrail();
  if (b.stateT <= 0) {
    head.visible = false;
    for (const s of b.segs) s.visible = false;
    b.mound.visible = true;
    b.mound.position.set(head.position.x, head.position.y, -6.5);
    b.state = 'buried';
    b.stateT = phase === 3 ? 3 : 4.5;
    if (phase >= 2) // it leaves spawn behind
      spawnEnemy('burrower', THREE.MathUtils.clamp(head.position.y, -latMax, latMax),
        { x: THREE.MathUtils.clamp(head.position.x, -play.fw * 0.2, play.fw - 6) });
  }
}

function hitBoss(dmg) {
  if (!boss || !boss.entered || boss.dying > 0) return;
  boss.hp -= dmg;
  if (boss.hp <= 0 && boss.reserve > 0) {
    if (boss.kind === 'vexfinal') {
      vexNextForm(); // sheds a form and fights on
    } else {
      // the colossus falls apart... and pulls itself back together
      boss.hp = boss.reserve;
      boss.reserve = 0;
      colossusCollapse();
    }
    updateBossBar();
    return;
  }
  updateBossBar();
  if (boss.hp <= 0) {
    boss.dying = boss.kind === 'fortress' || boss.kind === 'harvester' ? 3.2 : 2.6;
    addScore(boss.bounty || 10000);
    audio.stopSong();
    audio.bigExplode();
  }
}

// carrier core flash on hit
function flashCarrierCore() {
  boss.mesh.userData.core.material.emissive.setHex(0xffffff);
  setTimeout(() => {
    if (boss && boss.kind === 'carrier')
      boss.mesh.userData.core.material.emissive.setHex(0xa01060);
  }, 60);
}

// ---------------------------------------------------------------- stages
let stageIdx = 0;
let levelTime = 0;
let eventIdx = 0;
let bossPhaseStarted = false;
let astTimer = 2;
let saidPower = false;
let saidShield = false;
let saidOrbital = false;

function droneWave(n, y, amp, spacing) {
  for (let i = 0; i < n; i++)
    setTimeout(() => { if (state === 'playing') spawnEnemy('drone', y, { amp, phase: i * 0.9 }); },
      i * (spacing || 380));
}
function darterStack(ys) {
  for (const y of ys) spawnEnemy('darter', y);
}
function orbiterPair(y) {
  spawnEnemy('orbiter', y, { a0: 0, omega: 2 });
  spawnEnemy('orbiter', y, { a0: Math.PI, omega: 2 });
}
function mineRow(ys) {
  ys.forEach((y, i) =>
    setTimeout(() => { if (state === 'playing') spawnEnemy('mine', y); }, i * 250));
}
function bossWarning(voiceId, text) {
  say('commander', text, voiceId, 3);
  setTimeout(() => {
    if (state !== 'playing') return;
    document.getElementById('warning').classList.add('on');
    audio.siren();
    audio.stopSong();
  }, 1800);
}
function bossArrive() {
  document.getElementById('warning').classList.remove('on');
  audio.playSong(STAGES[stageIdx].bossSong);
  spawnBoss();
  bossPhaseStarted = true;
}

const TIMELINE1 = [
  { t: 0.5,  fn: () => say('commander',
      'Kamus, this is Command. Hostile fighters are swarming Sector Seven. Clear a path to the belt — and come back in one piece.', 'c_briefing1', 4) },
  { t: 1.2,  fn: () => say('kamus', 'This is Kamus, launching now. Systems green — engaging hostiles.', 'k_launch', 3) },
  { t: 2,    fn: () => droneWave(5, 4, 5) },
  { t: 6,    fn: () => droneWave(5, -8, 5) },
  { t: 10,   fn: () => darterStack([10, 3, -4, -11]) },
  { t: 14,   fn: () => { droneWave(4, 8, 4); spawnEnemy('turret', -6); } },
  { t: 19,   fn: () => { spawnEnemy('turret', 8); spawnEnemy('turret', -8); spawnEnemy('bastion', 0); droneWave(4, 0, 7); } },
  { t: 25,   fn: () => say('commander',
      "Heads up — heavy gunship on your scope. It's armored, but it's carrying weapon pods. Take it down.", 'c_heavy', 3) },
  { t: 26,   fn: () => { spawnEnemy('heavy', 2, { drops: true }); droneWave(4, -10, 3); } },
  { t: 32,   fn: () => darterStack([12, 6, 0, -6, -12]) },
  { t: 34,   fn: () => darterStack([9, 3, -3, -9]) },
  { t: 38,   fn: () => { droneWave(7, 6, 8); spawnEnemy('turret', -10); } },
  { t: 44,   fn: () => { spawnEnemy('heavy', -6); spawnEnemy('heavy', 8); } },
  { t: 51,   fn: () => { droneWave(6, 12, 4, 300); droneWave(6, -12, 4, 300); spawnEnemy('bastion', -5); } },
  { t: 58,   fn: () => { spawnEnemy('turret', 0); spawnEnemy('turret', 10); spawnEnemy('turret', -10); darterStack([5, -5]); } },
  { t: 65,   fn: () => { spawnEnemy('heavy', 0, { drops: true }); spawnEnemy('turret', 9); spawnEnemy('turret', -9); } },
  { t: 72,   fn: () => { droneWave(9, 0, 12, 260); } },
  { t: 79,   fn: () => bossWarning('c_warning1',
      "Massive energy signature inbound... it's the GORGON VORTEX! All batteries, Kamus — hit the core!") },
  { t: 84,   fn: bossArrive },
];

const TIMELINE2 = [
  { t: 0.5,  fn: () => say('commander',
      'Stage two, pilot. The Shattered Belt. Rocks, mines, and worse. Fly sharp.', 'c_briefing2', 3.5) },
  { t: 1.4,  fn: () => say('kamus', "Copy that, Command. Threading the belt — don't wait up.", 'k_stage2', 3) },
  { t: 5,    fn: () => droneWave(4, 5, 5) },
  { t: 9,    fn: () => orbiterPair(0) },
  { t: 13,   fn: () => say('commander', "Minefield ahead! Don't brush against anything that blinks.", 'c_mines', 3) },
  { t: 14,   fn: () => mineRow([10, 5, 0, -5, -10]) },
  { t: 19,   fn: () => darterStack([8, 2, -4, -10]) },
  { t: 24,   fn: () => { orbiterPair(8); orbiterPair(-8); spawnEnemy('bastion', 2); droneWave(4, 0, 6) } },
  { t: 30,   fn: () => { spawnEnemy('heavy', 2, { drops: true }); mineRow([9, -9]); } },
  { t: 37,   fn: () => { darterStack([11, 5, -1, -7]); spawnEnemy('turret', 0); } },
  { t: 43,   fn: () => mineRow([12, 8, 4, 0, -4, -8, -12]) },
  { t: 49,   fn: () => { orbiterPair(5); orbiterPair(-5); spawnEnemy('bastion', -5); droneWave(5, 10, 4); } },
  { t: 56,   fn: () => { spawnEnemy('heavy', -6); spawnEnemy('heavy', 8, { drops: true }); } },
  { t: 63,   fn: () => droneWave(10, 0, 12, 260) },
  { t: 69,   fn: () => { spawnEnemy('turret', 9); spawnEnemy('turret', -9); orbiterPair(0); } },
  { t: 75,   fn: () => { mineRow([10, 0, -10]); darterStack([6, -6]); } },
  { t: 80,   fn: () => bossWarning('c_warning2',
      "Reading a segmented signature... enormous... Kamus, it's the BASILISK. The head is the weak point!") },
  { t: 85,   fn: bossArrive },
];

function raiders(n) {
  for (let i = 0; i < n; i++)
    setTimeout(() => {
      if (state !== 'playing') return;
      const top = i % 2 === 0;
      spawnEnemy('raider', top ? view.h - 4 : -(view.h - 4), {
        vy: (top ? -1 : 1) * (12 + Math.random() * 6),
        sp: 26 + Math.random() * 8,
      });
    }, i * 450);
}
function weaverWall(ys) {
  ys.forEach((y, i) => spawnEnemy('weaver', y, { phase: i * 1.3 }));
}
function tankRow(ys) {
  ys.forEach((y, i) =>
    setTimeout(() => { if (state === 'playing') spawnEnemy('tank', y); }, i * 400));
}
// burrowers erupt mid-screen, not at the edge — xFrac places the mound
function burrowers(ys, xFrac) {
  ys.forEach((y, i) =>
    setTimeout(() => {
      if (state === 'playing')
        spawnEnemy('burrower', y, { x: play.fw * (xFrac ?? 0.45) + (Math.random() - 0.5) * 6 });
    }, i * 300));
}

// stage 2 ambient hazard: a steady drizzle of asteroids until the boss warning
function beltAmbient(dt) {
  astTimer -= dt;
  if (astTimer <= 0 && levelTime > 4 && levelTime < 78) {
    spawnEnemy('ast', (Math.random() * 2 - 1) * (play.lat - 4), {
      vy: (Math.random() - 0.5) * 7,
      sp: 10 + Math.random() * 8,
    });
    astTimer = 2.0 + Math.random() * 1.8;
  }
}

// stage 6 ambient: drifting wreck debris
function junkAmbient(dt) {
  astTimer -= dt;
  if (astTimer <= 0 && levelTime > 4 && levelTime < 79) {
    spawnEnemy('junk', (Math.random() * 2 - 1) * (play.lat - 4), {
      vy: (Math.random() - 0.5) * 6,
      sp: 9 + Math.random() * 8,
    });
    astTimer = 1.9 + Math.random() * 1.5;
  }
}

// stage 3 ambient: faster, denser rock storm
function mawAmbient(dt) {
  astTimer -= dt;
  if (astTimer <= 0 && levelTime > 4 && levelTime < 80) {
    spawnEnemy('ast', (Math.random() * 2 - 1) * (play.lat - 4), {
      vy: (Math.random() - 0.5) * 9,
      sp: 14 + Math.random() * 9,
    });
    astTimer = 1.2 + Math.random() * 1.1;
  }
}

const TIMELINE3 = [
  { t: 0.5,  fn: () => say('commander',
      "Negative on that homecoming, Kamus. We traced the swarm to its source — a fortress core deep in the Gorgon's Maw. End this, and the sector sleeps easy.", 'c_briefing3', 4.5) },
  { t: 2.5,  fn: () => say('kamus', 'Rain check on dinner, then. Punching through!', 'k_stage3', 2.5) },
  { t: 4,    fn: () => { droneWave(6, 6, 5); droneWave(6, -6, 5, 300); } },
  { t: 8,    fn: () => weaverWall([8, 0, -8]) },
  { t: 12,   fn: () => { darterStack([12, 7, 2, -3, -8, -13]); mineRow([10, -10]); } },
  { t: 16,   fn: () => { orbiterPair(7); orbiterPair(-7); spawnEnemy('weaver', 0); } },
  { t: 21,   fn: () => { raiders(4); droneWave(5, 0, 10); } },
  { t: 26,   fn: () => { spawnEnemy('heavy', 4, { drops: true }); spawnEnemy('heavy', -8); weaverWall([10, -2]); } },
  { t: 31,   fn: () => { spawnEnemy('turret', 8); spawnEnemy('bastion', 0); spawnEnemy('turret', -8); darterStack([10, 4, -2, -8, -12]) } },
  { t: 35,   fn: () => say('zeraa', "Intelligence confirms it, darling — the swarm thickens near the fortress. You're getting close.", 'z_swarm', 3) },
  { t: 36,   fn: () => { droneWave(12, 0, 12, 200); raiders(3); } },
  { t: 41,   fn: () => { mineRow([12, 8, 4, 0, -4, -8, -12]); weaverWall([6, -6, 0]); } },
  { t: 46,   fn: () => { orbiterPair(9); orbiterPair(0); orbiterPair(-9); darterStack([11, 5, -1, -7, -11, 8]); } },
  { t: 52,   fn: () => { spawnEnemy('heavy', 6, { drops: true }); spawnEnemy('heavy', -6); spawnEnemy('bastion', 0); spawnEnemy('turret', 11); droneWave(6, -11, 4, 250); } },
  { t: 58,   fn: () => { raiders(6); mineRow([8, 0, -8]); } },
  { t: 63,   fn: () => { weaverWall([12, 6, -6, -12]); droneWave(8, 0, 9, 250); } },
  { t: 69,   fn: () => { spawnEnemy('turret', 10); spawnEnemy('turret', -10); spawnEnemy('turret', 5); spawnEnemy('turret', -5); darterStack([13, 9, 3, -3, -9, -13, 0]); } },
  { t: 75,   fn: () => { spawnEnemy('heavy', 0, { drops: true }); orbiterPair(8); orbiterPair(-8); droneWave(6, 0, 12, 220); raiders(3); } },
  { t: 81,   fn: () => bossWarning('c_warning3',
      "That's it... the MEDUSA PRIME. Twin shield generators, then the core. Take it apart, Kamus!") },
  { t: 86,   fn: bossArrive },
];

const TIMELINE4 = [
  { t: 0.5,  fn: () => say('commander',
      "Kamus... about that dinner. The homeworld just went dark — the swarm beat you there. They're burning YOUR city.", 'c_briefing4', 4.5) },
  { t: 3,    fn: () => say('kamus', 'My city... Alright, Swarm. Now it\'s PERSONAL.', 'k_stage4', 3) },
  { t: 5,    fn: () => droneWave(5, 5, 5) },
  { t: 9,    fn: () => tankRow([8, 0, -8]) },
  { t: 13,   fn: () => { darterStack([10, 4, -2, -8]); droneWave(4, -10, 4) } },
  { t: 17,   fn: () => say('commander', "They've landed armor. Watch for ground fire!", 'c_armor', 3) },
  { t: 18,   fn: () => { tankRow([10, 3, -4, -11]); weaverWall([7, -7]); } },
  { t: 24,   fn: () => { raiders(4); droneWave(5, 0, 9); } },
  { t: 29,   fn: () => { spawnEnemy('heavy', 3, { drops: true }); tankRow([9, -9]); } },
  { t: 35,   fn: () => { orbiterPair(7); orbiterPair(-7); darterStack([11, 5, -1, -7, -12]); } },
  { t: 41,   fn: () => { tankRow([12, 6, 0, -6, -12]); droneWave(6, 8, 5, 300); } },
  { t: 47,   fn: () => { weaverWall([9, 0, -9]); raiders(3); } },
  { t: 53,   fn: () => { spawnEnemy('heavy', -5); spawnEnemy('heavy', 7, { drops: true }); tankRow([10, 0, -10]); } },
  { t: 59,   fn: () => { droneWave(10, 0, 12, 240); darterStack([8, -8]); } },
  { t: 65,   fn: () => { tankRow([11, 4, -4, -11]); orbiterPair(0); weaverWall([8, -8]); } },
  { t: 72,   fn: () => { spawnEnemy('heavy', 0, { drops: true }); raiders(4); tankRow([7, -7]); } },
  { t: 78,   fn: () => { droneWave(8, 0, 10, 240); darterStack([10, 5, -5, -10]); } },
  { t: 82,   fn: () => bossWarning('c_warning4',
      "Seismic contact... something COLOSSAL is chewing through the capital. Kamus — kill the World Eater!") },
  { t: 87,   fn: bossArrive },
];

const TIMELINE5 = [
  { t: 0.5,  fn: () => say('commander',
      "The harvest fleet is fleeing up the Red Canyon toward their dig site. It's a shooting gallery in there, Kamus — walls tight, guns hot.", 'c_briefing5', 4.5) },
  { t: 3,    fn: () => say('kamus', 'Tight walls, huh? Good thing I never learned to fly straight.', 'k_stage5', 3) },
  { t: 5,    fn: () => droneWave(5, 4, 4) },
  { t: 9,    fn: () => tankRow([7, -7]) },
  { t: 12.5, fn: () => say('klorp', 'Seismic spikes! They swim BENEATH the sand — regard every mound with suspicion!', 'd_burrow', 3) },
  { t: 13,   fn: () => burrowers([8, -8], 0.45) },
  { t: 18,   fn: () => { darterStack([9, 3, -3, -9]); droneWave(4, -6, 4); } },
  { t: 23,   fn: () => raiders(4) },
  { t: 27,   fn: () => { spawnEnemy('heavy', 2, { drops: true }); tankRow([9, -9]); } },
  { t: 33,   fn: () => { burrowers([5, -5, 0], 0.35); weaverWall([9, -9]); } },
  { t: 39,   fn: () => { mineRow([8, 0, -8]); darterStack([11, 5, -5, -11]); } },
  { t: 45,   fn: () => { tankRow([10, 4, -4, -10]); droneWave(8, 0, 9, 260); } },
  { t: 51,   fn: () => { burrowers([7, -2, -9], 0.55); orbiterPair(5); } },
  { t: 57,   fn: () => { spawnEnemy('heavy', -5); spawnEnemy('heavy', 6, { drops: true }); raiders(3); } },
  { t: 63,   fn: () => { weaverWall([8, 0, -8]); tankRow([6, -6]); burrowers([3, -3], 0.3); } },
  { t: 70,   fn: () => { droneWave(10, 0, 11, 240); darterStack([9, 4, -4, -9, 0]); } },
  { t: 76,   fn: () => { burrowers([9, 2, -5, -10], 0.5); tankRow([8, -8]); raiders(3); } },
  { t: 82,   fn: () => bossWarning('c_warning5',
      "The seismic readings just went off the scale... it's coming UP. Kamus, the DRILLMAW — hit it when it surfaces!") },
  { t: 87,   fn: bossArrive },
];

const TIMELINE6 = [
  { t: 0.5,  fn: () => say('commander',
      'Not quite, Kamus. Their salvage fleet is regrouping in the orbital junkyard — the wrecks of the first war. Clear it out, and the swarm has nowhere left to hide.', 'c_briefing6', 4.5) },
  { t: 3.5,  fn: () => say('kamus', 'A graveyard of ships... show some respect, Swarm. This is hallowed ground.', 'k_stage6', 3) },
  { t: 6,    fn: () => droneWave(5, 4, 5) },
  { t: 10,   fn: () => { spawnEnemy('turret', 7); spawnEnemy('turret', -7); } },
  { t: 14,   fn: () => { orbiterPair(6); orbiterPair(-6); } },
  { t: 17,   fn: () => say('nova', 'Careful in there, hotshot — I salvaged half my rig from that yard. Some of those wrecks still bite.', 'n_junk', 3.5) },
  { t: 19,   fn: () => { weaverWall([8, -8]); darterStack([10, 3, -4, -11]); } },
  { t: 24,   fn: () => mineRow([9, 0, -9]) },
  { t: 29,   fn: () => { spawnEnemy('heavy', 3, { drops: true }); spawnEnemy('turret', -8); spawnEnemy('turret', 10); } },
  { t: 35,   fn: () => { raiders(4); spawnEnemy('bastion', 0); droneWave(6, 0, 8); } },
  { t: 41,   fn: () => { weaverWall([9, 0, -9]); mineRow([6, -6]); } },
  { t: 47,   fn: () => { orbiterPair(8); orbiterPair(0); orbiterPair(-8); darterStack([12, 6, -6, -12]); } },
  { t: 53,   fn: () => { spawnEnemy('heavy', -5); spawnEnemy('heavy', 7, { drops: true }); spawnEnemy('turret', 0); } },
  { t: 59,   fn: () => { droneWave(10, 0, 11, 240); raiders(3); } },
  { t: 65,   fn: () => { weaverWall([10, 4, -4, -10]); mineRow([8, 0, -8]); } },
  { t: 71,   fn: () => { spawnEnemy('turret', 9); spawnEnemy('turret', -9); spawnEnemy('turret', 4); spawnEnemy('turret', -4); darterStack([11, 5, -1, -7, -12, 8]); } },
  { t: 76,   fn: () => { spawnEnemy('heavy', 0, { drops: true }); orbiterPair(7); orbiterPair(-7); droneWave(6, 0, 12, 220); } },
  { t: 81,   fn: () => bossWarning('c_warning6',
      "Energy spike in the debris core... the wrecks are... ASSEMBLING?! Kamus — the yard itself is coming for you!") },
  { t: 86,   fn: bossArrive },
];

function phantoms(ys) {
  ys.forEach((y, i) =>
    setTimeout(() => { if (state === 'playing') spawnEnemy('phantom', y); }, i * 500));
}
function splitters(ys) {
  ys.forEach((y, i) =>
    setTimeout(() => { if (state === 'playing') spawnEnemy('splitter', y, { phase: i * 1.1 }); }, i * 400));
}
function eggs(ys) {
  ys.forEach((y, i) =>
    setTimeout(() => { if (state === 'playing') spawnEnemy('egg', y); }, i * 350));
}
// kamikaze stingers — some slip in from BEHIND you
function stingers(n, fromBehind) {
  for (let i = 0; i < n; i++)
    setTimeout(() => {
      if (state !== 'playing') return;
      const behind = fromBehind && i % 2 === 0;
      spawnEnemy('stinger', (Math.random() * 2 - 1) * (play.lat - 6),
        behind ? { x: -play.fw + 3 } : {});
    }, i * 600);
}

const TIMELINE7 = [
  { t: 0.5,  fn: () => say('commander',
      "I don't like this shortcut, Kamus. Zeraa's intel has been... convenient. Eyes open in there.", 'c_briefing7', 3.5) },
  { t: 3.5,  fn: () => say('kamus', 'A glowing space highway. Sure. What could possibly go wrong.', 'k_stage7', 3) },
  { t: 6,    fn: () => droneWave(6, 5, 5) },
  { t: 10,   fn: () => darterStack([9, 3, -3, -9]) },
  { t: 14,   fn: () => { weaverWall([8, -8]); splitters([4, -4]); } },
  { t: 19,   fn: () => phantoms([6, -6]) },
  { t: 24,   fn: () => { spawnEnemy('lancer', 7); spawnEnemy('lancer', -7); } },
  { t: 29,   fn: () => { spawnEnemy('heavy', 2, { drops: true }); droneWave(5, -8, 4); } },
  { t: 34,   fn: () => { splitters([8, 0, -8]); mineRow([6, -6]); } },
  // ------- the betrayal -------
  { t: 40,   fn: () => say('zeraa',
      'You were magnificent, darling. Truly. But the Velvet Nebula fell to the Gorgon long ago... and I am what survival looks like.', 'z_betray', 4.5) },
  { t: 44.5, fn: () => say('kamus', 'Zeraa...?! The intel, the shortcuts — it was YOU. All of it.', 'k_betray', 3.5) },
  { t: 46,   fn: () => phantoms([8, 0, -8]) },
  { t: 49,   fn: () => say('vex', 'She sings so sweetly, does she not? Welcome to your funeral procession, little pilot.', 'v_gloat', 3.5) },
  { t: 50,   fn: () => { spawnEnemy('lancer', 5); spawnEnemy('lancer', -5); darterStack([10, -10]); } },
  { t: 53,   fn: () => say('commander', "Kamus, punch through! That's an ORDER! We are not losing you to that snake's honey trap!", 'c_rage', 3.5) },
  { t: 55,   fn: () => { spawnEnemy('heavy', -3, { drops: true }); splitters([6, -6]); } },
  { t: 61,   fn: () => { phantoms([7, -7]); weaverWall([3, -3]); mineRow([9, 0, -9]); stingers(2); } },
  { t: 67,   fn: () => { spawnEnemy('lancer', 8); spawnEnemy('lancer', 0); spawnEnemy('lancer', -8); } },
  { t: 72,   fn: () => { droneWave(10, 0, 10, 240); splitters([5, -5]); } },
  { t: 77,   fn: () => { phantoms([9, 2, -6]); spawnEnemy('heavy', 4, { drops: true }); } },
  { t: 81,   fn: () => bossWarning('c_warning7',
      "Her ship just entered the conduit — she's coming to finish it herself. Kamus... make her regret it.") },
  { t: 86,   fn: bossArrive },
];

const TIMELINE8 = [
  { t: 0.5,  fn: () => say('commander',
      "The Ghost Nebula, Kamus. A dead zone — our sensors are blind in there and comms will come and go. You're on your own.", 'c_briefing8', 4) },
  { t: 4,    fn: () => say('kamus', 'Blind sensors, ghost stories, glowing fog. Love it. Going in.', 'k_stage8', 3) },
  { t: 6,    fn: () => droneWave(6, 4, 5) },
  { t: 10,   fn: () => phantoms([7, -7]) },
  { t: 14,   fn: () => { weaverWall([8, -8]); splitters([3, -3]); } },
  { t: 18,   fn: () => say('klorp', 'Fascinating! The fog refracts their cloaking fields — trust your EYES, pilot, not the radar!', 'd_ghost', 3.5) },
  { t: 19,   fn: () => phantoms([9, 0, -9]) },
  { t: 24,   fn: () => { spawnEnemy('lancer', 6); spawnEnemy('lancer', -6); darterStack([10, -10]); } },
  { t: 29,   fn: () => { spawnEnemy('heavy', 2, { drops: true }); phantoms([5, -5]); } },
  { t: 35,   fn: () => { orbiterPair(7); orbiterPair(-7); spawnEnemy('bastion', 0); splitters([8, -8]); } },
  { t: 41,   fn: () => { mineRow([9, 0, -9]); phantoms([6, -6]); weaverWall([2, -2]); } },
  { t: 47,   fn: () => { spawnEnemy('lancer', 8); spawnEnemy('guardian', 0); spawnEnemy('lancer', -8); } },
  { t: 53,   fn: () => { spawnEnemy('heavy', -4); spawnEnemy('heavy', 6, { drops: true }); phantoms([8, -8]); } },
  { t: 59,   fn: () => { droneWave(10, 0, 11, 240); splitters([5, -5]); } },
  { t: 65,   fn: () => { phantoms([10, 4, -4, -10]); stingers(2, true); } },
  { t: 71,   fn: () => { spawnEnemy('lancer', 5); spawnEnemy('lancer', -5); weaverWall([9, -9]); mineRow([6, -6]); } },
  { t: 76,   fn: () => { spawnEnemy('heavy', 0, { drops: true }); phantoms([7, 0, -7]); } },
  { t: 81,   fn: () => bossWarning('c_warning8',
      "Contact! Single fighter signature... Kamus, telemetry says it's YOUR ship. Twice.") },
  { t: 86,   fn: bossArrive },
];

const TIMELINE9 = [
  { t: 0.5,  fn: () => say('commander',
      'This is it, Kamus. The brood-hive. Every drone that ever shot at you hatched in there. Burn it out, and the swarm dies with it.', 'c_briefing9', 4) },
  { t: 4,    fn: () => say('kamus', "Into the belly of the beast. If I don't make it back... someone feed my sock.", 'k_stage9', 3) },
  { t: 6,    fn: () => droneWave(8, 0, 8, 300) },
  { t: 10,   fn: () => eggs([8, -8]) },
  { t: 11,   fn: () => say('klorp', 'Egg clusters! They hatch FASTER when agitated — pop them QUICKLY, pilot!', 'd_hive', 3) },
  { t: 15,   fn: () => { droneWave(6, 5, 6); splitters([3, -3]); } },
  { t: 20,   fn: () => { eggs([10, 0, -10]); weaverWall([6, -6]); } },
  { t: 26,   fn: () => { spawnEnemy('heavy', 2, { drops: true }); droneWave(6, -6, 5); } },
  { t: 31,   fn: () => { darterStack([10, 4, -2, -8, -12]); eggs([5, -5]); } },
  { t: 36,   fn: () => phantoms([7, -7]) },
  { t: 41,   fn: () => { eggs([9, 3, -3, -9]); splitters([6, 0, -6]); } },
  { t: 47,   fn: () => say('vex',
      'Those are my CHILDREN, little pilot. When the Queen is done with you, I will pick my teeth with your wings.', 'v_fury', 3.5) },
  { t: 48,   fn: () => { spawnEnemy('lancer', 6); spawnEnemy('lancer', -6); droneWave(8, 0, 9, 260); } },
  { t: 54,   fn: () => { eggs([8, -8]); spawnEnemy('heavy', -3, { drops: true }); stingers(2); } },
  { t: 60,   fn: () => { droneWave(12, 0, 11, 220); splitters([7, -7]); } },
  { t: 66,   fn: () => { eggs([10, 0, -10]); darterStack([9, 3, -3, -9]); } },
  { t: 72,   fn: () => { spawnEnemy('heavy', 4, { drops: true }); phantoms([6, -6]); droneWave(6, 0, 10, 260); } },
  { t: 77,   fn: () => { eggs([6, -6]); splitters([2, -2]); } },
  { t: 81,   fn: () => bossWarning('c_warning9',
      "The hive's heart is just ahead... Massive biosign. Kamus — the QUEEN is coming to meet you.") },
  { t: 86,   fn: bossArrive },
];

const TIMELINE10 = [
  { t: 0.5,  fn: () => say('commander',
      'Vex emptied every dock he has left — the armada is between you and home. And Kamus? The Argo is done hiding. We are coming WITH you.', 'c_briefing10', 4.5) },
  { t: 4.5,  fn: () => say('kamus', 'The whole armada versus me and my sock... and the Argo. Alright. Let\'s dance.', 'k_stage10', 3) },
  { t: 7,    fn: () => { droneWave(6, 4, 5); darterStack([9, -9]); } },
  { t: 12,   fn: () => say('nova', "Argo broadside inbound on your six — duck or dance, flyboy!", 'n_argo', 2.5) },
  { t: 13.5, fn: argoVolley },
  { t: 15,   fn: () => { spawnEnemy('cruiser', 5); weaverWall([9, -9]); } },
  { t: 21,   fn: () => { raiders(4); splitters([4, -4]); } },
  { t: 26,   fn: () => { spawnEnemy('cruiser', -6); spawnEnemy('heavy', 6, { drops: true }); } },
  { t: 32,   fn: () => { phantoms([7, -7]); darterStack([11, 5, -5, -11]); } },
  { t: 36,   fn: argoVolley },
  { t: 38,   fn: () => { spawnEnemy('cruiser', 8); spawnEnemy('cruiser', -8); spawnEnemy('bastion', 3); droneWave(6, 0, 8); } },
  { t: 45,   fn: () => { spawnEnemy('guardian', 4); spawnEnemy('lancer', -6); mineRow([8, 0, -8]); } },
  { t: 50,   fn: () => say('vex', 'You burn my children... and dare approach MY fleet? Come then, little pilot. Come DIE at scale.', 'v_taunt10', 4) },
  { t: 52,   fn: () => { spawnEnemy('cruiser', 0); spawnEnemy('heavy', -8, { drops: true }); weaverWall([10, -10]); } },
  { t: 58,   fn: argoVolley },
  { t: 59,   fn: () => { raiders(5); splitters([6, 0, -6]); stingers(3, true); } },
  { t: 65,   fn: () => { spawnEnemy('cruiser', 7); spawnEnemy('cruiser', -7); phantoms([3, -3]); } },
  { t: 70,   fn: () => { say('zeraa', 'Missed me, darling? Duck.', 'z_assist', 2); zeraaRun(); } },
  { t: 72,   fn: () => { droneWave(10, 0, 10, 240); darterStack([8, 2, -4, -10]); } },
  { t: 77,   fn: () => { spawnEnemy('heavy', 3, { drops: true }); spawnEnemy('cruiser', -4); argoVolley(); } },
  { t: 81,   fn: () => bossWarning('c_warning10',
      'The flagship is breaking formation... the CHROME FANG. Vex is aboard, Kamus. End this war.') },
  { t: 86,   fn: bossArrive },
];

const TIMELINE11 = [
  { t: 0.5,  fn: () => say('commander',
      "Vex's homeworld, Kamus. Obsidian towers, royal guard, and a theater shield over the palace itself. We'll worry about the shield when you reach it.", 'c_briefing11', 4.5) },
  { t: 4.5,  fn: () => say('kamus', 'Knock knock, your majesty. Housecall.', 'k_stage11', 2.5) },
  { t: 7,    fn: () => { tankRow([8, -8]); droneWave(5, 3, 5); } },
  { t: 12,   fn: () => { spawnEnemy('lancer', 6); spawnEnemy('lancer', -6); burrowers([3, -3], 0.45); } },
  { t: 17,   fn: () => say('vex', 'You walk on MY soil now, little pilot. Every stone here has orders to kill you.', 'v_palace', 3.5) },
  { t: 18,   fn: () => { weaverWall([9, -9]); tankRow([11, 4, -4, -11]); } },
  { t: 24,   fn: () => { raiders(4); phantoms([5, -5]); } },
  { t: 29,   fn: () => { spawnEnemy('cruiser', 5); spawnEnemy('heavy', -6, { drops: true }); } },
  { t: 35,   fn: () => { burrowers([8, 0, -8], 0.35); splitters([4, -4]); mineRow([10, -10]); } },
  // ------- the shield gate -------
  { t: 41,   fn: () => {
      document.getElementById('warning').classList.add('on');
      say('commander', "There it is — the theater shield. Our guns can't crack it, Kamus. We can't follow you past this point—", 'c_shield', 3.5);
    } },
  { t: 45.5, fn: () => {
      document.getElementById('warning').classList.remove('on');
      say('zeraa', 'But I still know the palace codes, darling... There. The gate is open. Bring it down on his head.', 'z_gate', 3.5);
      showMsg('THEATER SHIELD DOWN — PALACE OPEN', 2.5);
      audio.powerup();
    } },
  { t: 49,   fn: () => { tankRow([9, 0, -9]); spawnEnemy('lancer', 7); spawnEnemy('lancer', -7); } },
  { t: 55,   fn: () => { spawnEnemy('guardian', -3); weaverWall([6, -6]); burrowers([5, -5], 0.5); } },
  { t: 61,   fn: () => { phantoms([8, 0, -8]); raiders(4); stingers(2); } },
  { t: 67,   fn: () => { spawnEnemy('heavy', 4, { drops: true }); tankRow([12, 6, -6, -12]); } },
  { t: 73,   fn: () => { droneWave(10, 0, 10, 240); splitters([7, -7]); mineRow([8, 0, -8]); } },
  { t: 78,   fn: () => { spawnEnemy('cruiser', 6); spawnEnemy('cruiser', -6); burrowers([2, -2], 0.4); } },
  { t: 82,   fn: () => bossWarning('c_warning11',
      'The palace doors are opening... something is WALKING out. Kamus — the throne room came to YOU.') },
  { t: 87,   fn: bossArrive },
];

// THE FINALE — three acts, three camera modes:
// over the fortress (top-down) -> down the core shaft (rail) -> the heart (side)
const TIMELINE12 = [
  { t: 0.5,  fn: () => say('commander',
      'There it is, Kamus. The Gorgon core — a fortress the size of a moon, and Vex is somewhere inside becoming... something. Everything we have is behind you.', 'c_briefing12', 5) },
  { t: 5,    fn: () => say('kamus', "One moon-sized death fortress. Sock's lucky, guns are hot. Let's write the ending.", 'k_stage12', 3) },
  { t: 7,    fn: () => { tankRow([9, -9]); weaverWall([5, -5]); } },
  { t: 12,   fn: () => { spawnEnemy('cruiser', 6); raiders(4); } },
  { t: 17,   fn: () => { tankRow([12, 4, -4, -12]); spawnEnemy('lancer', 0); } },
  { t: 22,   fn: () => { spawnEnemy('heavy', -5, { drops: true }); burrowers([6, -6], 0.45); } },
  { t: 27,   fn: () => { spawnEnemy('cruiser', 8); spawnEnemy('cruiser', -8); spawnEnemy('bastion', 0); weaverWall([2, -2]); } },
  { t: 31,   fn: () => { tankRow([8, -8]); raiders(3); } },
  { t: 33,   fn: () => say('commander', "The intake shaft is open — Zeraa's codes, one last time. DIVE, Kamus. Straight down its throat!", 'c_dive', 3.5) },
  { t: 36,   fn: () => {
      switchView('rail', { groundColor: 0x241016, fogFar: 260, fogColor: 0x120608,
        railColors: { a: 0xff4040, b: 0x8040ff, arch: 0x802030 } });
      showBanner('THE CORE SHAFT', 3);
      if (audioStarted) audio.swapSong('level12b', 0.6); // the theme picks up speed
    } },
  { t: 38,   fn: () => droneWave(6, 3, 5) },
  { t: 42,   fn: () => { splitters([5, -5]); mineRow([8, 0, -8]); stingers(2); } },
  { t: 47,   fn: () => phantoms([7, 0, -7]) },
  { t: 52,   fn: () => { spawnEnemy('lancer', 6); spawnEnemy('lancer', -6); droneWave(6, -4, 6); } },
  { t: 57,   fn: () => { spawnEnemy('heavy', 3, { drops: true }); spawnEnemy('guardian', -4); } },
  { t: 62,   fn: () => { phantoms([5, -5]); mineRow([6, -6]); droneWave(8, 0, 9, 260); } },
  { t: 67,   fn: () => say('kamus', "I can see it. The heart. It's... it's looking at me.", 'k_core', 3) },
  { t: 70,   fn: () => {
      switchView('side', { backdrop: 'nebula', backdropTint: 0xff3050 });
      showBanner('THE HEART OF THE GORGON', 3);
      if (audioStarted) audio.swapSong('level12c', 0.6); // the theme turns to dread
    } },
  { t: 72,   fn: () => { phantoms([6, -6]); spawnEnemy('cruiser', 0); } },
  { t: 76,   fn: () => { spawnEnemy('heavy', 4, { drops: true }); splitters([3, -3]); stingers(3, true); } },
  { t: 81,   fn: () => bossWarning('c_warning12',
      "Everything he has left is in that chamber, Kamus. And everything WE have is with you. All of us. GO.") },
  { t: 86,   fn: bossArrive },
];

const STAGES = [
  {
    name: 'STAGE 1 — SECTOR 7 APPROACH', place: 'SECTOR 7',
    backdrop: 'station',
    song: 'level', bossSong: 'boss',
    bossName: 'GORGON VORTEX - DREAD CARRIER',
    timeline: TIMELINE1, ambient: null, makeBoss: makeCarrier,
    theme: { planet: 0x7040a0, planetEm: 0x1a0a30, ring: 0xc0a0ff },
    clearSay: () => {
      say('kamus', 'Carrier down! Sector Seven is breathing again.', 'k_clear1', 3);
      say('vex', 'You have swatted a single fly, little pilot. The Gorgon has teeth yet.', 'v_taunt1', 3);
    },
  },
  {
    name: 'STAGE 2 — THE SHATTERED BELT', place: 'THE SHATTERED BELT',
    backdrop: 'bigrocks',
    song: 'level2', bossSong: 'boss2',
    bossName: 'BASILISK REX - BELT SERPENT',
    timeline: TIMELINE2, ambient: beltAmbient, makeBoss: makeSerpent,
    theme: { planet: 0xb05a28, planetEm: 0x301206, ring: 0xffc08a },
    clearSay: () => say('kamus', "Basilisk destroyed! Command... I'm coming home.", 'k_victory', 3),
  },
  {
    name: "STAGE 3 — THE GORGON'S MAW", place: "THE GORGON'S MAW",
    backdrop: 'nebula', backdropTint: 0xff4030,
    song: 'level3', bossSong: 'boss3',
    bossName: 'MEDUSA PRIME - FORTRESS CORE',
    timeline: TIMELINE3, ambient: mawAmbient, makeBoss: makeFortress,
    theme: { planet: 0x8a2020, planetEm: 0x3a0808, ring: 0xff8060 },
    clearSay: () => say('kamus', "Fortress core destroyed! That's checkmate... Command, I'm REALLY coming home this time.", 'k_final', 3.5),
  },
  {
    name: 'STAGE 4 — COMING HOME TO TROUBLE', place: 'THE HOMEWORLD',
    view: 'top', groundColor: 0x2e5c30,
    song: 'level4', bossSong: 'boss4',
    bossName: 'HARVESTER TYRANT - WORLD EATER',
    timeline: TIMELINE4, ambient: null, makeBoss: makeHarvester,
    theme: { planet: 0x2e5c30, planetEm: 0x0a2010, ring: 0x88c090 },
    clearSay: () => say('kamus', "Capital's safe... but the diggers are retreating up the Red Canyon. Oh no you don't.", 'k_clear4', 3.5),
  },
  {
    name: 'STAGE 5 — CANYON RUN', place: 'THE RED CANYON',
    view: 'top', canyon: true, groundColor: 0x7a4530,
    song: 'level5', bossSong: 'boss5',
    bossName: 'DRILLMAW - CANYON TERROR',
    timeline: TIMELINE5, ambient: null, makeBoss: makeDrillmaw,
    theme: { planet: 0x8a4520, planetEm: 0x2a1206, ring: 0xcc8866 },
    clearSay: () => say('kamus', "Drillmaw's a fossil. Command... please tell me that was the last of them.", 'k_clear5', 3),
  },
  {
    name: 'STAGE 6 — ORBITAL JUNKYARD', place: 'THE ORBITAL JUNKYARD',
    backdrop: 'wrecks',
    song: 'level6', bossSong: 'boss6',
    bossName: 'SCRAP COLOSSUS - GRAVE GOLEM',
    timeline: TIMELINE6, ambient: junkAmbient, makeBoss: makeColossus,
    theme: { planet: 0x606a78, planetEm: 0x161a20, ring: 0x9aa8b8 },
    clearSay: () => {
      say('kamus', "Scrap that. Literally. Command, I'm running on fumes — is there a fast lane home?", 'k_clear6', 3);
      say('zeraa', 'There is, darling — the Velvet Passage. An old warp conduit. It will cut your journey to nothing. Trust me.', 'z_passage', 3.5);
    },
  },
  {
    name: 'STAGE 7 — THE VELVET PASSAGE', place: 'THE VELVET PASSAGE',
    view: 'rail', groundColor: 0x241a45,
    song: 'level7', bossSong: 'boss7',
    bossName: "SIREN CHARIOT - ZERAA'S VEIL",
    timeline: TIMELINE7, ambient: null, makeBoss: makeSiren,
    theme: { planet: 0x3a2a6a, planetEm: 0x100a24, ring: 0xb090ff },
    clearSay: () => {
      say('kamus', "Track's clear. Command... she played me. She played ALL of us.", 'k_clear7', 3);
      say('commander', "Then we make her regret it. Come home through the Ghost Nebula — the swarm won't follow you in there.", 'c_steel', 3.5);
    },
  },
  {
    name: 'STAGE 8 — NEBULA OF GHOSTS', place: 'THE GHOST NEBULA',
    backdrop: 'nebula', backdropTint: 0x40c890,
    song: 'level8', bossSong: 'boss8',
    bossName: 'MIRROR KAMUS - GORGON REPLICA',
    fogFar: 120, fogColor: 0x0e1a14,
    timeline: TIMELINE8, ambient: null, makeBoss: makeMirror,
    theme: { planet: 0x4a6a58, planetEm: 0x122018, ring: 0x9adbb8 },
    clearSay: () => {
      say('kamus', "Scratch one knockoff. Command, I'm done playing defense — where's the NEST?", 'k_clear8', 3);
      say('commander', 'The nebula gave us more than cover — we mapped their brood-hive. Rest up, pilot. Tomorrow we end the swarm at its source.', 'c_map', 4);
    },
  },
  {
    name: 'STAGE 9 — HIVE DESCENT', place: 'THE BROOD-HIVE',
    view: 'rail', groundColor: 0x3a1418,
    railColors: { a: 0xd8c8a0, b: 0xff8040, arch: 0xaa4030 },
    fogFar: 240, fogColor: 0x140806,
    song: 'level9', bossSong: 'boss9',
    bossName: 'BROOD QUEEN - MOTHER OF THE SWARM',
    timeline: TIMELINE9, ambient: null, makeBoss: makeQueen,
    theme: { planet: 0x6a3040, planetEm: 0x200a10, ring: 0xc08070 },
    clearSay: () => say('kamus', "The nest is ash. No more hatchlings, no more swarm... Now there's just HIM.", 'k_clear9', 3),
  },
  {
    name: 'STAGE 10 — THE VEX ARMADA', place: 'THE VEX ARMADA',
    backdrop: 'fleet',
    song: 'level10', bossSong: 'boss10',
    bossName: "CHROME FANG - VEX'S FLAGSHIP",
    timeline: TIMELINE10, ambient: null, makeBoss: makeChromeFang,
    theme: { planet: 0x4a1a2a, planetEm: 0x180810, ring: 0xff6060 },
    clearSay: () => say('kamus', "The Fang is down and the armada's scattering. One palace left, Vex. Keep the throne warm.", 'k_clear10', 3.5),
  },
  {
    name: 'STAGE 11 — PALACE ASSAULT', place: "VEX'S PALACE",
    view: 'top', groundColor: 0x1a1024,
    song: 'level11', bossSong: 'boss11',
    bossName: "SERPENT THRONE - VEX'S WALKER",
    timeline: TIMELINE11, ambient: null, makeBoss: makeThrone,
    theme: { planet: 0x2a1a3a, planetEm: 0x0e0816, ring: 0x8060c0 },
    clearSay: () => say('kamus', "The throne is scrap, and whatever's left of him crawled into that core. One more flight. Let's end the war.", 'k_clear11', 3.5),
  },
  {
    name: 'FINAL STAGE — HEART OF THE GORGON', place: 'THE GORGON CORE',
    view: 'top', groundColor: 0x1c1420,
    song: 'level12', bossSong: 'boss12',
    bossName: 'VEX ETERNAL',
    timeline: TIMELINE12, ambient: null, makeBoss: makeVexFinal,
    theme: { planet: 0x3a1020, planetEm: 0x160408, ring: 0xff4040 },
    victorySay: () => {
      say('zeraa', 'Takes more than a star to kill a diva, darling. See you at dinner.', 'z_alive', 3);
      say('kamus', 'World Eater eaten. The homeworld is safe... NOW somebody owes me dinner.', 'k_home', 3.5);
      say('commander', "Confirmed kill... the belt is clear. Outstanding flying, Kamus. Come home — dinner's on me.", 'c_victory', 4);
    },
  },
];

// ---------------------------------------------------------------- input
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code))
    e.preventDefault();
  // on the title screen, the very first interaction only unlocks audio
  // (browsers block sound until a gesture) so the title theme gets heard
  const consumed = firstGesture();
  if (state !== 'paused') audio.resume();
  if (e.code === 'Enter' && !consumed) menuAdvance();
  if (e.code === 'KeyP' && (state === 'playing' || state === 'paused')) togglePause();
  if (e.code === 'KeyX') togglePlasma();
  if (e.code === 'KeyC') fireNova();
  if (e.code === 'Escape' && state === 'gameover') toTitle();
  if (state === 'title' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
    selectedStage = THREE.MathUtils.clamp(
      selectedStage + (e.code === 'ArrowRight' ? 1 : -1), 0, bestStage);
    updateStageSelect();
    audio.talk(420);
  }
  if (e.code === 'KeyH' && state === 'title') { // pair a DualSense (WebHID)
    dualsense.connect()
      .then(() => showMsg('DUALSENSE LINKED — ADAPTIVE TRIGGERS ON', 3))
      .catch((err) => showMsg('DUALSENSE: ' + String(err.message || err).slice(0, 40).toUpperCase(), 3));
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('pointerdown', () => {
  const consumed = firstGesture();
  if (state !== 'paused') audio.resume();
  if (!consumed) menuAdvance();
});

let padStartPrev = false;
let padFirePrev = false;
let padPlasmaPrev = false;
let padNovaPrev = false;
function readInput() {
  let x = 0, y = 0, fire = false, start = false, padFire = false;
  let padPlasma = false, padNova = false;
  let trig = 0; // analog trigger pull 0..1 — governs main-gun spread
  if (keys['ArrowLeft'] || keys['KeyA']) x -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) x += 1;
  if (keys['ArrowUp'] || keys['KeyW']) y += 1;
  if (keys['ArrowDown'] || keys['KeyS']) y -= 1;
  if (keys['Space'] || keys['KeyZ']) fire = true;

  // read EVERY connected pad (Windows/Bluetooth Xbox pads sometimes leave a
  // ghost entry in slot 0, so never trust just the first one) and tolerate
  // non-"standard" mappings where the dpad shows up as axes 6/7 or a hat axis
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    const dz = 0.22;
    const ax = pad.axes || [];
    const btn = (i) => !!(pad.buttons && pad.buttons[i] && pad.buttons[i].pressed);
    if (ax.length > 1) {
      if (Math.abs(ax[0]) > dz) x += ax[0];
      if (Math.abs(ax[1]) > dz) y -= ax[1];
    }
    if (pad.mapping !== 'standard') {
      if (ax.length > 7) { // dpad exposed as a pair of digital axes
        if (Math.abs(ax[6]) > 0.5) x += Math.sign(ax[6]);
        if (Math.abs(ax[7]) > 0.5) y -= Math.sign(ax[7]);
      }
      if (ax.length > 9 && ax[9] >= -1 && ax[9] <= 1) { // dpad as an 8-way hat
        const h = Math.round((ax[9] + 1) / (2 / 7));
        if (h >= 0 && h <= 7) {
          if (h === 7 || h === 0 || h === 1) y += 1;
          if (h >= 3 && h <= 5) y -= 1;
          if (h >= 1 && h <= 3) x += 1;
          if (h >= 5 && h <= 7) x -= 1;
        }
      }
    }
    if (btn(14)) x -= 1; // dpad buttons (standard mapping)
    if (btn(15)) x += 1;
    if (btn(12)) y += 1;
    if (btn(13)) y -= 1;
    for (const bi of [0, 1, 2, 6]) // A/B/X + LT = fire (digital, full spread)
      if (btn(bi)) { fire = true; padFire = true; trig = 1; }
    // RT/R2 is the PRESSURE trigger: pull depth selects the spread level
    if (pad.buttons[7]) {
      const v = pad.buttons[7].value || (pad.buttons[7].pressed ? 1 : 0);
      if (v > 0.05) { fire = true; padFire = true; trig = Math.max(trig, v); }
    }
    if (btn(3)) padPlasma = true;              // Y = plasma toggle
    if (btn(4) || btn(5)) padNova = true;      // bumpers = NOVA bomb
    if (btn(9) || btn(8)) start = true;        // menu / view
  }
  const startEdge = start && !padStartPrev;
  padStartPrev = start;
  const fireEdge = padFire && !padFirePrev;
  padFirePrev = padFire;
  const plasmaEdge = padPlasma && !padPlasmaPrev;
  padPlasmaPrev = padPlasma;
  const novaEdge = padNova && !padNovaPrev;
  padNovaPrev = padNova;
  if (fire && trig === 0) trig = 1; // keyboard / face buttons: full pull
  return { x: THREE.MathUtils.clamp(x, -1, 1), y: THREE.MathUtils.clamp(y, -1, 1),
    fire, trig, startEdge, fireEdge, plasmaEdge, novaEdge };
}

function rumble(strong, weak, ms) {
  dualsense.rumble(strong, weak, ms); // richer haptics when a DualSense is paired
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (pad && pad.connected && pad.vibrationActuator) {
      pad.vibrationActuator.playEffect('dual-rumble',
        { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
      break;
    }
  }
}
window.addEventListener('gamepadconnected', (e) =>
  showMsg('GAMEPAD LINKED : ' + e.gamepad.id.slice(0, 28).toUpperCase(), 2.5));

// ---------------------------------------------------------------- HUD
let score = 0;
let hiscore = Number(localStorage.getItem('starkamus-hi') || 0);
const el = (id) => document.getElementById(id);

function addScore(n) {
  score += n;
  if (score > hiscore) { hiscore = score; localStorage.setItem('starkamus-hi', String(hiscore)); }
  el('score').textContent = score;
  el('hiscore').textContent = 'HI ' + hiscore;
}
function updateLivesHud() {
  el('lives').innerHTML = '&#9650;'.repeat(Math.max(0, player.lives));
  el('power').innerHTML = 'PWR&nbsp;' + '&#9646;'.repeat(player.weapon) +
    '&#9670;'.repeat(player.options) +
    (player.shield ? '&nbsp;&#9678;' : '') +
    (player.nova ? '&nbsp;&#10022;' : '');
}

let msgTimer = 0;
function showMsg(text, secs) {
  const m = el('msg');
  m.textContent = text;
  m.classList.add('on');
  msgTimer = secs;
}

let bannerTimer = null;
function showBanner(text, secs) {
  el('stagebanner-text').textContent = text;
  el('stagebanner').classList.add('on');
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el('stagebanner').classList.remove('on'), (secs || 3.2) * 1000);
}

// ---------------------------------------------------------------- portraits
function drawPixels(ctx, rows, cmap) {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = cmap[ch] || '#000';
      ctx.fillRect(x, y, 1, 1);
    });
  });
}
function pixelDataURL(rows, cmap) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#04101c';
  ctx.fillRect(0, 0, 16, 16);
  drawPixels(ctx, rows, cmap);
  return c.toDataURL();
}

const KAMUS_ROWS = [
  '....dGGGGGGd....',
  '...dGggggggGd...',
  '..dGggggggggGd..',
  '..GgggggggggGG..',
  '..GgGGGGGGGGgG..',
  '..GgVvvvvvvVgG..',
  '..GgVvvvvvvVgG..',
  '..GgGVVVVVVGgG..',
  '..dGssssssssGd..',
  '...dssssssssd...',
  '...dssdssdssd...',
  '...dssssssssd...',
  '....dssddssd....',
  '....ddooooddd...',
  '...dooooooood...',
  '..ddooooooodd...',
];
const KAMUS_CMAP = { G: '#1d7a3e', g: '#2fae5c', V: '#1a7a99', v: '#3ee6ff', s: '#e8b88a', d: '#0a1420', o: '#c8d8e8' };

const CMDR_ROWS = [
  '....dCCCCCCd....',
  '...dCccccccCd...',
  '..dCcccyycccCd..',
  '..dCccccccccCd..',
  '..dCCCCCCCCCCd..',
  '..wwssssssssww..',
  '..wssessssessw..',
  '..wssssssssssw..',
  '...sswwwwwwss...',
  '...sswwwwwwss...',
  '...ssssssssss...',
  '....ssssssss....',
  '....dssssssd....',
  '...duuuyyuuud...',
  '..dduuuuuuuudd..',
  '..duuuuuuuuuud..',
];
const CMDR_CMAP = { C: '#24334a', c: '#3b4d68', y: '#ffc23e', s: '#d9a97e', w: '#cfd6dd', d: '#0a1420', u: '#2a3a55', e: '#142030' };

// supporting cast pixel fallbacks (film characters)
const NOVA_ROWS = [
  '...dhhhhhhhd....',
  '..dhhhhhhhhhd...',
  '.dhhrrrrrrrhhd..',
  '.dhrrrrrrrrrhd..',
  '.dhhsssssssshd..',
  '.dhsseesseeshd..',
  '.dhhssssssssd...',
  '..dhssddddssd...',
  '..ddssssssssd...',
  '...dsssssssd....',
  '...dwwwwwwwwd...',
  '..dowwwwwwood...',
  '..doooooooood...',
  '.ddoooooooood...',
];
const NOVA_CMAP = { h: '#2a1a12', r: '#cc2233', s: '#d9a06a', e: '#181410', w: '#f0e8e0', o: '#e07020', d: '#0a1420' };
const ZERAA_ROWS = [
  '..p..dSSSSd..p..',
  '..dpdSSSSSSdpd..',
  '...dSSSSSSSSd...',
  '..dSttttttttSd..',
  '..dSttttttttSd..',
  '..dttyttttyttd..',
  '..dttttttttttd..',
  '..dtttddddtttd..',
  '...dttttttttd...',
  '....dttttttd....',
  '....duuuuuud....',
  '...duuuuuuuud...',
  '..dduuuuuuuudd..',
  '..duuuuuuuuuud..',
];
const ZERAA_CMAP = { S: '#d8dce8', t: '#38c8c0', y: '#ffd040', p: '#ff70d8', u: '#c0c8dc', d: '#0a1420' };
const KLORP_ROWS = [
  '..y..........y..',
  '..dy........yd..',
  '...db......bd...',
  '...dbbbbbbbbd...',
  '..dbbbbbbbbbbd..',
  '..dbBbbbbbbBbd..',
  '..dbbbbbbbbbbd..',
  '..dbbBBBBBBbbd..',
  '...dbbbbbbbbd...',
  '..dwwbbbbbbwwd..',
  '..dwwbbbbbbwwd..',
  '..dwwdbbbbdwwd..',
  '...dwwddddwwd...',
  '...dwwwwwwwwd...',
  '..ddwwwwwwwwdd..',
];
const KLORP_CMAP = { b: '#7a2030', B: '#4a1420', y: '#ffe080', w: '#e8ecf0', d: '#0a1420' };
const VEX_ROWS = [
  '....dkkkkkkd....',
  '...dkkkkkkkkd...',
  '..dkkmmmmmmkkd..',
  '..dkmmmmmmmmkd..',
  '..dkmmRRmmmmkd..',
  '..dkmmmmmmmmkd..',
  '..dkmmkkkkmmkd..',
  '..dkkmmmmmmkkd..',
  '...dkkkkkkkkd...',
  '..dpkkkkkkkkpd..',
  '..dppkkkkkkppd..',
  '..dpkkkkkkkkpd..',
  '.ddppppppppppd..',
  '.dppppppppppppd.',
];
const VEX_CMAP = { k: '#181c24', m: '#c8ccd4', R: '#ff2020', p: '#5a2080', d: '#0a1420' };

// pixel fallbacks now; real anime portraits (assets/portraits/<who>.png) take over if present
const portraitSrc = {
  kamus: pixelDataURL(KAMUS_ROWS, KAMUS_CMAP),
  commander: pixelDataURL(CMDR_ROWS, CMDR_CMAP),
  nova: pixelDataURL(NOVA_ROWS, NOVA_CMAP),
  zeraa: pixelDataURL(ZERAA_ROWS, ZERAA_CMAP),
  klorp: pixelDataURL(KLORP_ROWS, KLORP_CMAP),
  vex: pixelDataURL(VEX_ROWS, VEX_CMAP),
};
// the HUD avatar shows the same Kamus portrait the comm box uses
const avatarEl = el('avatar');
avatarEl.src = portraitSrc.kamus;
for (const who of Object.keys(portraitSrc)) {
  const probe = new Image();
  probe.onload = () => {
    portraitSrc[who] = probe.src;
    if (who === 'kamus') avatarEl.src = probe.src;
  };
  probe.src = 'assets/portraits/' + who + '.png';
}

// ---------------------------------------------------------------- voice comms
const COMM_CHARS = {
  kamus:     { name: 'LT. KAMUS — FIGHTER SF-01',   color: '#3ee6ff', pitch: 400 },
  commander: { name: 'COMMANDER — CV ARGO',          color: '#ffc23e', pitch: 210 },
  nova:      { name: 'NOVA VASQUEZ — HANGAR CHIEF',  color: '#ff7040', pitch: 470 },
  zeraa:     { name: 'AMB. ZERAA — VELVET NEBULA',   color: '#ff70d8', pitch: 520 },
  klorp:     { name: 'DR. KLORP — SCIENCE OFFICER',  color: '#57ff8a', pitch: 320 },
  vex:       { name: 'ADM. VEX — GORGON SWARM',      color: '#ff3030', pitch: 150 },
};
const commQ = [];
let comm = null;

function say(who, text, voiceId, minDur) {
  if (voiceId && (commQ.some((c) => c.vid === voiceId) || (comm && comm.vid === voiceId)))
    return; // don't spam-queue the same line
  commQ.push({ who, text, vid: voiceId, minDur: minDur || 2.4 });
}

function closeComm() {
  comm = null;
  el('comm').classList.remove('on', 'commander');
}

function updateComms(dt) {
  if (state === 'title') {
    if (comm) closeComm();
    commQ.length = 0;
    return;
  }
  if (!comm && commQ.length) {
    // if a previous line is still speaking (e.g. across a stage transition),
    // hold the queue instead of talking over it
    if (audio.activeVoices > 0) return;
    comm = commQ.shift();
    comm.t = 0;
    comm.shown = 0;
    const vDur = comm.vid ? audio.playVoice(comm.vid) : 0;
    comm.voiced = vDur > 0;
    comm.dur = Math.max(comm.minDur, vDur + 0.6, comm.text.length / 26 + 1.3);
    const ch = COMM_CHARS[comm.who] || COMM_CHARS.kamus;
    const box = el('comm');
    box.classList.add('on');
    box.style.borderColor = ch.color;
    box.style.boxShadow = '0 0 16px ' + ch.color + '55';
    const nameEl = el('comm-name');
    nameEl.textContent = ch.name;
    nameEl.style.color = ch.color;
    el('comm-portrait').src = portraitSrc[comm.who] || portraitSrc.kamus;
    el('comm-text').textContent = '';
    audio.radio();
  }
  if (comm) {
    comm.t += dt;
    const chars = Math.min(comm.text.length, Math.floor(comm.t * 42));
    if (chars !== comm.shown) {
      comm.shown = chars;
      el('comm-text').textContent = comm.text.slice(0, chars);
      if (!comm.voiced && chars % 3 === 0 && chars < comm.text.length)
        audio.talk((COMM_CHARS[comm.who] || COMM_CHARS.kamus).pitch);
    }
    if (comm.t >= comm.dur) closeComm();
  }
}

// ---------------------------------------------------------------- state machine
let state = 'title'; // title | playing | paused | gameover | clear | victory
let shake = 0;
let audioStarted = false;

// returns true if this gesture was consumed to unlock audio on the title screen
function firstGesture() {
  if (audioStarted) return false;
  audioStarted = true;
  audio.init();
  if (state === 'title') {
    audio.playSong('title');
    el('title-press').textContent = 'PRESS ENTER / START TO LAUNCH';
    return true;
  }
  return false;
}

function menuAdvance() {
  if (state === 'title') startGame();
  else if (state === 'gameover') continueGame();
  else if (state === 'victory') startCredits();
  else if (state === 'credits') toTitle();
}

// arcade continue: same stage, score wiped, a fighting-chance loadout,
// and emergency supply drops so you can rebuild before the boss
let continuesUsed = 0;
function continueGame() {
  continuesUsed++;
  score = 0;
  startStage(stageIdx, false);
  player.lives = 3;
  player.weapon = 2;
  player.options = 0;
  player.shield = false;
  player.plasma = 100;
  player.droneMode = 'seeker';
  player.nova = 0;
  player.heat = 0;
  player.overheated = false;
  addScore(0);
  updateLivesHud();
  showMsg('CONTINUE — SUPPLY DROPS INBOUND', 2.5);
  for (const [delay, y] of [[4000, 5], [12000, -5], [20000, 0]])
    setTimeout(() => {
      if (state === 'playing') dropPowerup(new THREE.Vector3(play.fw * 0.7, y, 0));
    }, delay);
}

// stage select: highest stage reached is remembered across sessions
let bestStage = Number(localStorage.getItem('starkamus-best') || 0);
let selectedStage = 0;
function updateStageSelect() {
  const s = el('stage-select');
  if (!s) return;
  s.innerHTML = bestStage > 0
    ? '&#9664;&nbsp;START&nbsp;AT&nbsp;STAGE&nbsp;' + (selectedStage + 1) +
      '&nbsp;&#9654;&nbsp;&nbsp;(BEST:&nbsp;' + (bestStage + 1) + ')'
    : '';
}

function toTitle() {
  cleanupField();
  audio.stopVoices();
  applyViewMode('side');
  setBackdrop(null);
  ship.rotation.set(0, 0, 0);
  state = 'title';
  el('gameover').classList.remove('on');
  el('clear').classList.remove('on');
  el('victory').classList.remove('on');
  el('credits').classList.remove('on');
  el('title').classList.add('on');
  el('hud').classList.remove('on');
  updateStageSelect();
  if (audioStarted) audio.playSong('title');
}

function startGame() {
  audio.stopVoices();
  continuesUsed = 0;
  startStage(selectedStage, true);
}

// ---------------------------------------------------------------- credits
let creditsT = 0;
let creditsRollH = 0;
let creditsStinger = false;
function startCredits() {
  cleanupField();
  audio.stopVoices();
  applyViewMode('side');
  setBackdrop('station');
  state = 'credits';
  el('victory').classList.remove('on');
  el('hud').classList.remove('on');
  el('cr-stats').textContent =
    'FINAL SCORE: ' + score + '   ·   CONTINUES USED: ' + continuesUsed;
  el('credits').classList.add('on');
  creditsT = 0;
  creditsStinger = false;
  creditsRollH = el('credits-roll').offsetHeight;
  ship.visible = true;
  if (audioStarted) audio.playSong('credits');
}

function updateCredits(dt) {
  creditsT += dt;
  const holdArea = el('credits-window').offsetHeight;
  const y = holdArea - creditsT * 30; // px/s crawl
  el('credits-roll').style.transform = 'translateY(' + y + 'px)';
  // Vex gets the last word, of course
  if (!creditsStinger && y < -(creditsRollH - holdArea * 0.8)) {
    creditsStinger = true;
    say('vex', 'Eternal means... patient, little pilot. Enjoy your dinner.', 'v_post', 4);
  }
  // gentle attract flight under the roll
  const t = clock.elapsedTime;
  player.pos.set(-play.fw + 14 + Math.sin(t * 0.5) * 4, Math.sin(t * 0.7) * 6, 0);
  ship.position.copy(player.pos);
  ship.rotation.x = Math.sin(t * 0.7) * -0.25;
  ship.userData.flame.scale.y = 0.8 + Math.random() * 0.4;
  if (y < -(creditsRollH + 60)) toTitle(); // rolled out — back to the marquee
}

function startStage(i, fresh) {
  cleanupField();
  stageIdx = i;
  const st = STAGES[i];
  applyViewMode(st.view || 'side');
  state = 'playing';
  levelTime = 0;
  eventIdx = 0;
  bossPhaseStarted = false;
  astTimer = 2;
  if (fresh) {
    score = 0;
    player.lives = 3;
    player.weapon = 1;
    player.shield = false;
    player.options = 0;
    player.plasma = 100;
    player.droneMode = 'seeker';
    player.nova = 0;
    player.heat = 0;
    player.overheated = false;
    saidPower = false;
    saidShield = false;
    saidOrbital = false;
  }
  novaDropped = false;
  if (i > bestStage) {
    bestStage = i;
    localStorage.setItem('starkamus-best', String(i));
  }
  player.alive = true;
  player.invuln = 2.5;
  player.pos.set(-play.fw + 12, 0, 0);
  ship.rotation.set(0, 0, 0);
  ship.visible = true;
  el('title').classList.remove('on');
  el('gameover').classList.remove('on');
  el('clear').classList.remove('on');
  el('victory').classList.remove('on');
  el('hud').classList.add('on');
  planetBallMat.color.setHex(st.theme.planet);
  planetBallMat.emissive.setHex(st.theme.planetEm);
  planetRingMat.color.setHex(st.theme.ring);
  if (st.view === 'top' || st.view === 'rail')
    grassMatRef.color.setHex(st.groundColor || 0x2e5c30);
  canyonGroup.visible = st.view === 'top' && !!st.canyon;
  if (canyonGroup.visible) {
    const cw = canyonWallY();
    for (const w of canyonWalls) {
      w.position.y = w.userData.side * cw;
      w.position.x = w.userData.seg * 260;
    }
  }
  railGroup.visible = st.view === 'rail';
  if (railGroup.visible) {
    railSegs.forEach((s, i) => { s.position.x = i * 260; });
    const rc = st.railColors || { a: 0x3ee6ff, b: 0xff4bd8, arch: 0x60d0ff };
    railMats.a.color.setHex(rc.a);
    railMats.b.color.setHex(rc.b);
    railMats.arch.color.setHex(rc.arch);
  }
  for (const tile of groundTiles) // city/trees hidden on the energy highway
    for (const d of tile.userData.deco) d.visible = st.view !== 'rail';
  if (st.fogFar) scene.fog.far = st.fogFar;      // e.g. the Ghost Nebula closes in
  if (st.fogColor) scene.fog.color.setHex(st.fogColor);
  setBackdrop(st.backdrop, st.backdropTint);
  zeraaRunT = -1;
  zeraaDart.visible = false;
  showBanner(st.name);
  addScore(0);
  updateLivesHud();
  if (audioStarted) audio.playSong(st.song);
}

function cleanupField() {
  for (let i = enemies.length - 1; i >= 0; i--) scene.remove(enemies[i].mesh);
  enemies.length = 0;
  if (boss) removeBoss();
  document.getElementById('warning').classList.remove('on');
  el('stagebanner').classList.remove('on');
  for (const p of playerBullets) release(p);
  for (const p of enemyBullets) release(p);
  for (const p of particles) release(p);
  for (const p of powerups) release(p);
  for (const p of beams) release(p);
  for (const p of novas) release(p);
  for (let i = blasts.length - 1; i >= 0; i--) {
    scene.remove(blasts[i].g);
    blasts.splice(i, 1);
  }
  el('msg').classList.remove('on');
  commQ.length = 0;
  closeComm();
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    el('paused').classList.add('on');
    audio.suspend();
  } else if (state === 'paused') {
    state = 'playing';
    el('paused').classList.remove('on');
    audio.resume();
  }
}

function playerDie() {
  if (!player.alive || player.invuln > 0) return;
  if (player.shield) { // the bubble eats one hit
    player.shield = false;
    updateLivesHud();
    burst(player.pos, 14, 18, 0.9);
    audio.explode();
    rumble(0.5, 0.3, 200);
    shake = Math.max(shake, 0.5);
    player.invuln = 1.5;
    showMsg('SHIELD DOWN!', 1.5);
    return;
  }
  player.alive = false;
  ship.visible = false;
  burst(player.pos, 30, 24, 1.3);
  audio.playerHit();
  rumble(1, 0.6, 400);
  shake = 1;
  player.lives -= 1;
  player.weapon = Math.max(1, player.weapon - 1);
  updateLivesHud();
  if (player.lives < 0) {
    setTimeout(() => gameOver(), 1200);
  } else {
    say('kamus', 'Aggh— I\'m hit! Ejecting!', 'k_hit', 1.8);
    if (player.lives === 0)
      say('commander', 'Kamus, that was our last reserve ship. Bring this one home.', 'c_lastlife', 3);
    player.respawnT = 1.6;
  }
}

function gameOver() {
  if (state !== 'playing') return;
  state = 'gameover';
  audio.stopSong();
  audio.playSong('gameover');
  say('commander', "Kamus? Kamus, respond!... We've lost him. All units, fall back.", 'c_gameover', 4);
  el('go-score').textContent = 'FINAL SCORE : ' + score;
  el('gameover').classList.add('on');
}

function stageClear() {
  if (state !== 'playing') return;
  addScore(0);
  if (stageIdx < STAGES.length - 1) {
    state = 'clear';
    player.lives += 1; // reinforcement ship
    updateLivesHud();
    audio.playSong('clear');
    if (STAGES[stageIdx].clearSay) STAGES[stageIdx].clearSay();
    el('clear-title').textContent = 'STAGE ' + (stageIdx + 1) + ' CLEAR';
    el('clear-score').textContent = 'SCORE : ' + score + '   —   REINFORCEMENT SHIP +1';
    el('clear-next').textContent = 'ENTERING ' + STAGES[stageIdx + 1].place + '...';
    el('clear').classList.add('on');
    const next = stageIdx + 1;
    setTimeout(() => {
      if (state === 'clear') startStage(next, false);
    }, 8000); // long enough for the clear comm line to finish speaking
  } else {
    state = 'victory';
    audio.playSong('victory');
    if (STAGES[stageIdx].victorySay) {
      STAGES[stageIdx].victorySay();
    } else {
      say('kamus', "Still breathing, Command. Zeraa got away... but so did I. Coming home — for REAL this time.", 'k_survive', 3.5);
      say('commander', "Confirmed kill... the belt is clear. Outstanding flying, Kamus. Come home — dinner's on me.", 'c_victory', 4);
    }
    el('v-score').textContent = 'FINAL SCORE : ' + score;
    el('victory').classList.add('on');
    // let the curtain-call comms breathe, then roll credits
    setTimeout(() => { if (state === 'victory') startCredits(); }, 24000);
  }
}

// ---------------------------------------------------------------- update
// per-shot haptics: each weapon has its own thump (DualSense gets HID pulses,
// Xbox pads get rumble ticks; harmless without a controller)
function shotPulse(kind) {
  if (kind === 1) rumble(0, 0.12, 30);
  else if (kind === 2) rumble(0.05, 0.2, 35);
  else if (kind === 3) rumble(0.14, 0.32, 45);
  else if (kind === 'beam') rumble(0.35, 0.15, 85);
}

// lvl = spread actually fired this volley (trigger pull, capped by upgrades)
function firePlayer(lvl) {
  const spawn = (dy, angle) => {
    const b = take(playerBullets);
    if (!b) return;
    b.mesh.position.set(player.pos.x + 2.6, player.pos.y + dy, 0);
    b.vel.set(Math.cos(angle || 0) * 95, Math.sin(angle || 0) * 95, 0);
    b.mesh.rotation.z = Math.PI / 2 + (angle || 0);
    b.life = 1.4;
  };
  if (lvl === 1) spawn(0, 0);
  else if (lvl === 2) { spawn(0.9, 0); spawn(-0.9, 0); }
  else { spawn(0.9, 0); spawn(-0.9, 0); spawn(0.4, 0.16); spawn(-0.4, -0.16); }
  shotPulse(lvl);
  audio.shoot();
}

// drones fight on their own now: seeker mode auto-locks the nearest target,
// plasma mode dumps the charge into wide piercing beams while you hold fire
const droneCool = [0, 0];
let beamCool = 0;
function updateDrones(dt, input) {
  player.plasma = Math.min(100, player.plasma + 6 * dt); // trickle recharge
  if (player.options === 0 || !player.alive) return;
  if (player.droneMode === 'seeker') {
    for (let i = 0; i < player.options; i++) {
      droneCool[i] -= dt;
      if (droneCool[i] > 0) continue;
      let target = null, best = 1e9;
      for (const e of enemies) {
        if (e.cloaked || (e.type === 'burrower' && e.buried) || e.type === 'tank') continue;
        const d = d2(optionMeshes[i].position, e.mesh.position);
        if (d < best) { best = d; target = e.mesh.position; }
      }
      if (!target && boss && boss.entered && boss.dying <= 0) target = boss.mesh.position;
      if (!target) continue;
      const b = take(playerBullets);
      if (!b) continue;
      b.mesh.position.copy(optionMeshes[i].position);
      const a = Math.atan2(target.y - b.mesh.position.y, target.x - b.mesh.position.x);
      b.vel.set(Math.cos(a) * 75, Math.sin(a) * 75, 0);
      b.mesh.rotation.z = Math.PI / 2 + a;
      b.life = 1.4;
      droneCool[i] = 0.55;
    }
  } else if (input.fire && player.plasma > 0) {
    beamCool -= dt;
    if (beamCool <= 0) {
      for (let i = 0; i < player.options; i++) spawnBeam(optionMeshes[i].position);
      player.plasma -= 6;
      beamCool = 0.35;
      if (player.plasma <= 0) {
        player.plasma = 0;
        player.droneMode = 'seeker';
        showMsg('PLASMA DEPLETED — SEEKERS ONLINE', 1.8);
        dualsense.setTrigger('fire');
      }
    }
  }
}

function togglePlasma() {
  if (state !== 'playing' || player.options === 0) return;
  if (player.droneMode === 'plasma') {
    player.droneMode = 'seeker';
    showMsg('SEEKER MODE', 1.2);
    dualsense.setTrigger('fire');
  } else if (player.plasma >= 25) {
    player.droneMode = 'plasma';
    showMsg('PLASMA BEAMS ARMED — HOLD FIRE', 1.6);
    audio.powerup();
    dualsense.setTrigger('plasma');
  } else {
    showMsg('PLASMA CHARGING...', 1.2);
  }
}

function fireNova() {
  if (state !== 'playing' || !player.nova) return;
  player.nova = 0;
  updateLivesHud();
  const f = el('flash');
  f.classList.add('on');
  setTimeout(() => f.classList.remove('on'), 150);
  for (const b of enemyBullets) release(b); // every hostile bullet, gone
  burst(player.pos, 40, 30, 1.6);
  shake = 1.6;
  player.invuln = Math.max(player.invuln, 1.2);
  audio.novaBoom();
  rumble(1, 1, 500);
  showMsg('N O V A', 1.5);
}

function updatePlayer(dt, input) {
  if (!player.alive) {
    for (const om of optionMeshes) om.visible = false;
    player.respawnT -= dt;
    if (player.respawnT <= 0 && player.lives >= 0) {
      player.alive = true;
      player.invuln = 2.5;
      player.pos.set(-play.fw + 12, 0, 0);
      ship.visible = true;
      say('kamus', 'New ship, same pilot. Back in the fight!', 'k_respawn', 2);
    }
    return;
  }
  if (viewMode === 'top') {
    // top-down: up-key flies up-screen (+x world), left/right strafes (screen-right = -y)
    player.pos.x += input.y * player.speed * dt;
    player.pos.y -= input.x * player.speed * dt;
  } else if (viewMode === 'rail') {
    // rail: strafe across the track; up/down nudges throttle (small depth drift)
    player.pos.y -= input.x * player.speed * dt;
    player.pos.x += input.y * player.speed * 0.35 * dt;
  } else {
    player.pos.x += input.x * player.speed * dt;
    player.pos.y += input.y * player.speed * dt;
  }
  if (viewMode === 'rail')
    player.pos.x = THREE.MathUtils.clamp(player.pos.x, -play.fw + 8, -play.fw + 24);
  else // the whole screen belongs to the pilot
    player.pos.x = THREE.MathUtils.clamp(player.pos.x, -play.fw + 4, play.fw - 5);
  let latLim = play.lat - 5.5;
  if (viewMode === 'top' && STAGES[stageIdx].canyon)
    latLim = Math.min(latLim, canyonWallY() - 5); // the canyon squeezes you in
  player.pos.y = THREE.MathUtils.clamp(player.pos.y, -latLim, latLim);
  ship.position.copy(player.pos);
  if (viewMode === 'top') {
    // roll into strafes, seen from above
    ship.rotation.x = THREE.MathUtils.lerp(ship.rotation.x, input.x * 0.6, 10 * dt);
    ship.rotation.z = THREE.MathUtils.lerp(ship.rotation.z, -input.x * 0.16, 10 * dt);
    ship.rotation.y = THREE.MathUtils.lerp(ship.rotation.y, 0, 10 * dt);
  } else if (viewMode === 'rail') {
    // seen from behind: bank hard into the strafe, drift the nose
    ship.rotation.x = THREE.MathUtils.lerp(ship.rotation.x, input.x * 0.7, 10 * dt);
    ship.rotation.z = THREE.MathUtils.lerp(ship.rotation.z, -input.x * 0.22, 10 * dt);
    ship.rotation.y = THREE.MathUtils.lerp(ship.rotation.y, 0, 10 * dt);
  } else {
    ship.rotation.x = THREE.MathUtils.lerp(ship.rotation.x, -input.y * 0.55, 10 * dt);
    ship.rotation.y = THREE.MathUtils.lerp(ship.rotation.y, input.x * 0.18, 10 * dt);
    ship.rotation.z = THREE.MathUtils.lerp(ship.rotation.z, 0, 10 * dt);
  }
  const boost = viewMode === 'top' ? input.y : input.x;
  const fl = ship.userData.flame;
  fl.scale.y = 0.8 + Math.random() * 0.5 + (boost > 0 ? 0.5 : 0);
  const sh = ship.userData.shield;
  sh.visible = player.shield;
  if (player.shield) sh.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.05);
  // orbital drones circle in the gameplay plane (reads right in every view)
  for (let i = 0; i < optionMeshes.length; i++) {
    const om = optionMeshes[i];
    om.visible = i < player.options && ship.visible;
    if (i < player.options) {
      const a = clock.elapsedTime * 2.6 + i * Math.PI;
      om.position.set(player.pos.x + Math.cos(a) * 4.4, player.pos.y + Math.sin(a) * 4.4, 0);
      om.rotation.y += 4 * dt;
    }
  }
  fl.material.color.setHSL(0.52 + Math.random() * 0.05, 1, 0.6 + Math.random() * 0.2);

  if (player.invuln > 0) {
    player.invuln -= dt;
    ship.visible = Math.floor(player.invuln * 12) % 2 === 0;
    if (player.invuln <= 0) ship.visible = true;
  }

  // main gun: trigger pull depth = spread level, capped by collected upgrades.
  // full spread runs HOT — ride it too long and the gun locks to single shot
  const zone = input.trig > 0.75 ? 3 : input.trig > 0.4 ? 2 : input.trig > 0 ? 1 : 0;
  let lvl = Math.min(player.weapon, zone);
  if (player.overheated) lvl = Math.min(lvl, 1);
  player.fireCool -= dt;
  if (input.fire && player.fireCool <= 0 && lvl > 0) {
    firePlayer(lvl);
    player.fireCool = 0.13;
  }
  const firingHot = input.fire && lvl === 3;
  player.heat = THREE.MathUtils.clamp(player.heat + (firingHot ? 24 : -28) * dt, 0, 100);
  if (!player.overheated && player.heat >= 100) {
    player.overheated = true;
    showMsg('WEAPON OVERHEAT — EASE OFF!', 2);
    audio.overheat();
    rumble(0.8, 0.4, 450);
    dualsense.setTrigger('loose'); // the trigger goes dead in your finger
  } else if (player.overheated && player.heat <= 30) {
    player.overheated = false;
    showMsg('WEAPON COOLED', 1.2);
    audio.cooled();
  }
  // adaptive trigger tracks the gun state (throttled inside setTrigger)
  if (player.droneMode !== 'plasma' && !player.overheated) {
    if (player.heat > 35) dualsense.setTrigger('heat', (player.heat - 35) / 65);
    else dualsense.setTrigger('fire');
  }
  updateDrones(dt, input);
}

function updateBullets(dt) {
  for (const b of playerBullets) {
    if (!b.active) continue;
    b.mesh.position.addScaledVector(b.vel, dt);
    b.life -= dt;
    if (b.life <= 0 || b.mesh.position.x > play.fw + 8) release(b);
  }
  for (const b of enemyBullets) {
    if (!b.active) continue;
    if (b.home > 0 && player.alive) {
      b.home -= dt;
      const cur = Math.atan2(b.vel.y, b.vel.x);
      const tgt = Math.atan2(player.pos.y - b.mesh.position.y, player.pos.x - b.mesh.position.x);
      let d = tgt - cur;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const na = cur + THREE.MathUtils.clamp(d, -2.6 * dt, 2.6 * dt);
      const sp = b.vel.length();
      b.vel.set(Math.cos(na) * sp, Math.sin(na) * sp, 0);
    }
    b.mesh.position.addScaledVector(b.vel, dt);
    b.mesh.rotation.z += 6 * dt;
    b.life -= dt;
    const p = b.mesh.position;
    if (b.life <= 0 || Math.abs(p.x) > play.fw + 10 || Math.abs(p.y) > play.lat + 10) release(b);
  }
  for (const p of particles) {
    if (!p.active) continue;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += 8 * dt;
    p.mesh.rotation.y += 6 * dt;
    p.life -= dt;
    p.mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 2.2));
    if (p.life <= 0) release(p);
  }
  for (const b of beams) {
    if (!b.active) continue;
    b.mesh.position.addScaledVector(b.vel, dt);
    b.life -= dt;
    if (b.life <= 0 || b.mesh.position.x > play.fw + 10) release(b);
  }
  for (const p of powerups) {
    if (!p.active) continue;
    p.mesh.position.x += p.vel.x * dt;
    p.mesh.position.y = p.baseY + Math.sin(p.life * 3) * 1.5;
    p.mesh.rotation.y += 3 * dt;
    p.mesh.rotation.x += 2 * dt;
    p.life -= dt;
    if (p.life <= 0 || p.mesh.position.x < -play.fw - 6) release(p);
  }
  for (const p of novas) {
    if (!p.active) continue;
    p.mesh.position.x += p.vel.x * dt;
    p.mesh.position.y = p.baseY + Math.sin(p.life * 4) * 1.8;
    p.mesh.rotation.y += 5 * dt;
    p.life -= dt;
    if (p.life <= 0 || p.mesh.position.x < -play.fw - 6) release(p);
  }
}

// bullet-vs-boss test; returns damage dealt (0 = no hit)
function bossBulletDamage(bp) {
  if (!boss || !boss.entered || boss.dying > 0) return 0;
  if (boss.kind === 'carrier') {
    const corePos = boss.mesh.position.clone().add(new THREE.Vector3(-7.4, 0, 0));
    if (d2(bp, corePos) < 4.5) { flashCarrierCore(); return 2; } // core sweet spot
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    return 0;
  }
  if (boss.kind === 'serpent') {
    // only the head takes damage, the body armors it
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    for (let i = 0; i < boss.segs.length; i++) {
      if (d2(bp, boss.segs[i].position) < boss.segR[i]) return -1; // blocked
    }
    return 0;
  }
  if (boss.kind === 'fortress') {
    // pods are targets; the core is shielded until both pods die
    for (const p of boss.pods) {
      if (p.alive && d2(bp, p.mesh.position) < boss.podR + 0.6) {
        p.hp -= 1;
        if (p.hp <= 0) destroyPod(p);
        updateBossBar();
        return -1; // absorbed by the pod (damage already applied)
      }
    }
    if (d2(bp, boss.mesh.position) < boss.radius + 0.5)
      return boss.pods.some((p) => p.alive) ? -1 : 1;
    return 0;
  }
  if (boss.kind === 'drillmaw') {
    // untouchable while underground; head is the target, body blocks
    if ((boss.state !== 'surfaced' && boss.state !== 'erupt') ||
        boss.mesh.position.z < -2.5) return 0;
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    for (let i = 0; i < boss.segs.length; i++)
      if (d2(bp, boss.segs[i].position) < boss.segR[i]) return -1;
    return 0;
  }
  if (boss.kind === 'colossus') {
    if (boss.cState !== 'fight') return 0; // scattered parts can't be hurt
    const core = boss.mesh.position.clone().add(boss.core.position);
    if (d2(bp, core) < 2.6) return 2; // reactor core sweet spot
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    return 0;
  }
  if (boss.kind === 'siren') {
    if (boss.veiled) return 0; // shots pass straight through the veil
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    return 0;
  }
  if (boss.kind === 'mirror') {
    if (boss.cloaked) return 0; // it isn't where you think it is
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    return 0;
  }
  if (boss.kind === 'queen') {
    const sacPos = boss.mesh.position.clone().add(new THREE.Vector3(boss.sacOff, 0, 0));
    if (d2(bp, sacPos) < boss.sacR) return 2; // the egg sac is soft
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    return 0;
  }
  if (boss.kind === 'chromefang') {
    const bridgePos = boss.mesh.position.clone().add(boss.bridgeOff);
    if (d2(bp, bridgePos) < boss.bridgeR) return 2; // aim for the throne
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    return 0;
  }
  if (boss.kind === 'throne') {
    if (boss.stance === 'charge') return -1; // the dome shrugs it off
    const vexPos = boss.mesh.position.clone().add(boss.vexOff);
    if (d2(bp, vexPos) < boss.vexR) return 2; // Vex himself, on his chair
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    return 0;
  }
  if (boss.kind === 'vexfinal') {
    if (boss.transitionT > 0) return 0; // mid-metamorphosis
    if (boss.form === 2) { // the Eye hides behind its plates
      for (const p of boss.plates) {
        const pp = boss.mesh.position.clone().add(p.position);
        if (d2(bp, pp) < 2.7) return -1;
      }
    }
    if (d2(bp, boss.mesh.position) < boss.radius) return 1;
    return 0;
  }
  // harvester: exposed spine reactor takes double damage
  const reactor = boss.mesh.position.clone().add(boss.core.position);
  if (d2(bp, reactor) < 2.8) return 2;
  if (d2(bp, boss.mesh.position) < boss.radius) return 1;
  return 0;
}

function bossTouchesPlayer() {
  if (!boss || boss.dying > 0) return false;
  if (boss.kind === 'siren' && boss.veiled) return false; // she isn't really there
  if (boss.kind === 'mirror' && boss.cloaked) return false;
  if (boss.kind === 'vexfinal' && boss.transitionT > 0) return false;
  if (boss.kind === 'queen') {
    const sacPos = boss.mesh.position.clone().add(new THREE.Vector3(boss.sacOff, 0, 0));
    if (d2(sacPos, player.pos) < boss.sacR + player.radius) return true;
    return d2(boss.mesh.position, player.pos) < boss.radius + player.radius;
  }
  if (boss.kind === 'drillmaw') {
    // only dangerous while it's actually out of the ground
    if ((boss.state !== 'surfaced' && boss.state !== 'erupt') ||
        boss.mesh.position.z < -2) return false;
    if (d2(boss.mesh.position, player.pos) < boss.radius + player.radius) return true;
    for (let i = 0; i < boss.segs.length; i++)
      if (d2(boss.segs[i].position, player.pos) < boss.segR[i] + player.radius) return true;
    return false;
  }
  if (boss.kind === 'colossus') {
    if (boss.cState !== 'fight') return false; // scattered wreckage drifts harmlessly
    if (d2(boss.mesh.position, player.pos) < boss.radius + player.radius) return true;
    for (const f of boss.fists) { // the swinging fists hurt
      const fp = boss.mesh.position.clone().add(f.fist.position);
      if (d2(fp, player.pos) < 2.4 + player.radius) return true;
    }
    return false;
  }
  // ground units (harvester, throne-mech): you fly safely above them
  if (boss.kind !== 'harvester' && boss.kind !== 'throne' &&
      d2(boss.mesh.position, player.pos) < boss.radius + player.radius) return true;
  if (boss.kind === 'serpent') {
    for (let i = 0; i < boss.segs.length; i++)
      if (d2(boss.segs[i].position, player.pos) < boss.segR[i] + player.radius) return true;
  } else if (boss.kind === 'fortress') {
    for (const p of boss.pods)
      if (p.alive && d2(p.mesh.position, player.pos) < boss.podR + player.radius) return true;
  }
  return false;
}

function collide() {
  // player bullets vs enemies / boss
  for (const b of playerBullets) {
    if (!b.active) continue;
    const bp = b.mesh.position;
    let hit = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.cloaked) continue; // shots pass through a cloaked phantom
      if (d2(bp, e.mesh.position) < e.radius + 0.8) {
        e.hp -= 1;
        audio.hit();
        burst(bp, 3, 8, 0.5);
        if (e.hp <= 0) killEnemy(e, i);
        hit = true;
        break;
      }
    }
    if (!hit) {
      const dmg = bossBulletDamage(bp);
      if (dmg !== 0) {
        if (dmg > 0) hitBoss(dmg);
        audio.hit();
        burst(bp, 3, 8, 0.5);
        hit = true;
      }
    }
    if (hit) release(b);
  }

  // plasma beams: pierce through ranks, punch bosses hard
  for (const b of beams) {
    if (!b.active) continue;
    const bp = b.mesh.position;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.cloaked || b.hitSet.has(e)) continue;
      if (d2(bp, e.mesh.position) < e.radius + 2.2) {
        b.hitSet.add(e);
        e.hp -= 2;
        audio.hit();
        burst(bp, 4, 10, 0.6);
        if (e.hp <= 0) killEnemy(e, i);
        b.pierce--;
        if (b.pierce <= 0) { release(b); break; }
      }
    }
    if (!b.active) continue;
    const dmg = bossBulletDamage(bp);
    if (dmg !== 0) {
      if (dmg > 0) hitBoss(dmg + 2);
      burst(bp, 6, 12, 0.8);
      audio.hit();
      release(b);
    }
  }

  if (!player.alive || player.invuln > 0) return;

  for (const b of enemyBullets) {
    if (!b.active) continue;
    if (d2(b.mesh.position, player.pos) < player.radius + 0.6) {
      release(b);
      playerDie();
      return;
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.type === 'tank' || (e.type === 'burrower' && e.buried) || e.cloaked) continue; // can't ram what isn't there
    if (d2(e.mesh.position, player.pos) < e.radius + player.radius) {
      killEnemy(e, i);
      playerDie();
      return;
    }
  }
  if (bossTouchesPlayer()) {
    playerDie();
    return;
  }
  for (const p of novas) {
    if (!p.active) continue;
    if (d2(p.mesh.position, player.pos) < 3.2) {
      release(p);
      player.nova = 1;
      updateLivesHud();
      audio.powerup();
      showMsg('NOVA BOMB — PRESS C / PAD LB', 2.2);
    }
  }
  for (const p of powerups) {
    if (!p.active) continue;
    if (d2(p.mesh.position, player.pos) < 3) {
      release(p);
      if (player.weapon < 3) {
        player.weapon += 1;
        showMsg('WEAPON POWER UP!', 1.6);
      } else if (player.options < 2) {
        player.options += 1;
        showMsg('ORBITAL DRONE DEPLOYED!', 1.8);
        if (!saidOrbital) {
          saidOrbital = true;
          say('nova', 'Orbital drones are live — my little angry babies. Bring them home in one piece!', 'n_orbital', 3);
        }
      } else if (!player.shield) {
        player.shield = true;
        showMsg('SHIELD UP!', 1.6);
        if (!saidShield) {
          saidShield = true;
          say('nova', "That bubble's my best work — it eats ONE hit. Don't get cocky, flyboy.", 'n_shield', 3);
        }
      } else {
        addScore(1000);
        showMsg('MAX POWER — BONUS 1000', 1.6);
      }
      updateLivesHud();
      audio.powerup();
      if (!saidPower) {
        saidPower = true;
        say('kamus', "Ooh — weapons upgrade! Now we're talking.", 'k_power', 2);
      }
    }
  }
}

// ---------------------------------------------------------------- main loop
const clock = new THREE.Clock();

function frame() {
  // rAF stalls in hidden/background tabs; fall back to a timer so the game
  // (and headless testing) keeps running. Hidden timers are throttled to
  // ~1 Hz, so tick() catches up in fixed sub-steps to hold real-time pace.
  if (document.hidden) setTimeout(frame, 33);
  else requestAnimationFrame(frame);
  const raw = Math.min(clock.getDelta(), 2);
  const input = readInput();

  if (input.startEdge) {
    const consumed = firstGesture();
    if (!consumed) {
      if (state === 'title' || state === 'gameover' || state === 'victory' || state === 'credits') menuAdvance();
      else if (state === 'playing' || state === 'paused') togglePause();
    }
  } else if (input.fireEdge &&
      (state === 'title' || state === 'gameover' || state === 'victory' || state === 'credits')) {
    // A / fire also advances menus — Start alone was easy to miss on some pads
    if (!firstGesture()) menuAdvance();
  }
  if (input.plasmaEdge) togglePlasma();
  if (input.novaEdge) fireNova();

  if (state === 'paused') { renderer.render(scene, camera); return; }

  let remaining = raw;
  while (remaining > 0) {
    const dt = Math.min(remaining, 0.05);
    tick(dt, input);
    remaining -= dt;
  }

  // camera: slight follow + shake, with cinematic blending across view switches
  const sx = (Math.random() - 0.5) * shake * 1.6;
  const sy = (Math.random() - 0.5) * shake * 1.6;
  const wantPos = new THREE.Vector3();
  const wantUp = new THREE.Vector3();
  const wantTarget = new THREE.Vector3();
  if (viewMode === 'top') {
    wantUp.set(1, 0, 0); // world +x = screen up: enemies pour in from the top
    wantPos.set(player.pos.x * 0.05 + sx, player.pos.y * 0.08 + sy, 62);
    wantTarget.set(wantPos.x, wantPos.y, 0);
  } else if (viewMode === 'rail') {
    wantUp.set(0, 0, 1); // chase cam: low behind the ship, looking down the track
    wantPos.set(player.pos.x - 16 + sx * 0.4, player.pos.y * 0.85 + sy, 10);
    wantTarget.set(player.pos.x + 26, player.pos.y * 0.55, 1);
  } else {
    wantUp.set(0, 1, 0);
    wantPos.set(player.pos.x * 0.06 + sx, 3 + player.pos.y * 0.08 + sy, 62);
    wantTarget.set(wantPos.x, wantPos.y - 3, 0);
  }
  lastCamTarget.copy(wantTarget);
  if (camBlend < 1) {
    camBlend = Math.min(1, camBlend + raw / 2.4);
    const k = camBlend * camBlend * (3 - 2 * camBlend); // smoothstep swing
    camera.position.lerpVectors(camFrom.pos, wantPos, k);
    camera.up.lerpVectors(camFrom.up, wantUp, k).normalize();
    camera.lookAt(
      THREE.MathUtils.lerp(camFrom.target.x, wantTarget.x, k),
      THREE.MathUtils.lerp(camFrom.target.y, wantTarget.y, k),
      THREE.MathUtils.lerp(camFrom.target.z, wantTarget.z, k));
  } else {
    camera.position.copy(wantPos);
    camera.up.copy(wantUp);
    camera.lookAt(wantTarget);
  }

  renderer.render(scene, camera);
}

function tick(dt, input) {
  updateZeraaRun(dt);
  updateBackdrop(dt, clock.elapsedTime);
  if (viewMode !== 'side') {
    updateGround(dt);
  } else {
    scrollStars(dt);
    planet.rotation.y += 0.02 * dt;
    planet.position.x -= 0.4 * dt;
    if (planet.position.x < -view.w * 1.6) planet.position.x = view.w * 1.6;
    for (const r of bgRocks) {
      r.position.x -= r.userData.speed * dt;
      r.rotation.x += r.userData.spin * dt;
      r.rotation.y += r.userData.spin * 0.7 * dt;
      if (r.position.x < -view.w * 1.5) {
        r.position.x = view.w * 1.5;
        r.position.y = (Math.random() * 2 - 1) * view.h;
      }
    }
  }

  if (state === 'playing') {
    levelTime += dt;
    const st = STAGES[stageIdx];
    while (eventIdx < st.timeline.length && st.timeline[eventIdx].t <= levelTime) {
      st.timeline[eventIdx].fn();
      eventIdx++;
    }
    if (st.ambient) st.ambient(dt);
    updatePlayer(dt, input);
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    updateBlasts(dt);
    collide();
    el('plasma').style.width = player.plasma + '%';
    el('plasma-wrap').style.opacity = player.options > 0 ? 1 : 0.15;
    el('heat').style.width = player.heat + '%';
    el('heat-wrap').style.opacity = player.weapon >= 3 ? 1 : 0.15;
    el('heat-wrap').classList.toggle('hot', player.overheated);

    if (msgTimer > 0) {
      msgTimer -= dt;
      if (msgTimer <= 0) el('msg').classList.remove('on');
    }
  } else {
    updateBullets(dt);
    if (state === 'credits') updateCredits(dt);
    if (state === 'title') {
      ship.visible = true;
      const t = clock.elapsedTime;
      player.pos.set(-play.fw + 14 + Math.sin(t * 0.6) * 3, Math.sin(t * 0.9) * 4, 0);
      ship.position.copy(player.pos);
      ship.rotation.x = Math.sin(t * 0.9) * -0.3;
      ship.userData.flame.scale.y = 0.8 + Math.random() * 0.4;
    }
    if (boss) updateBoss(dt);
  }

  updateComms(dt);
  shake = Math.max(0, shake - dt * 2.5);
}

// debug/testing hook (console only)
window.__sk = {
  warp(t) {
    levelTime = t;
    const tl = STAGES[stageIdx].timeline;
    eventIdx = tl.findIndex((e) => e.t > t);
    if (eventIdx < 0) eventIdx = tl.length;
  },
  stage(i) { startStage(i, false); },
  get boss() { return boss; },
  get state() { return state; },
  get player() { return player; },
  get stageIdx() { return stageIdx; },
  hurtBoss(n) { hitBoss(n); },
  say,
  spawnEnemy,
  enemies,
  audio,
  voiceIds: VOICE_IDS,
  scene,
  play,
};

updateLivesHud();
updateStageSelect();
addScore(0);
frame();
