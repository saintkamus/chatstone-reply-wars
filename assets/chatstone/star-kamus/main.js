// STAR KAMUS — side-view 3D space shooter. Two stages, two very angry bosses.
import * as THREE from './vendor/three.module.js';
import { ChipAudio } from './audio.js';

const audio = new ChipAudio();

// voice comm assets (generated externally, e.g. Seedance). Missing files are fine:
// comms fall back to text + blips. Drop mp3/wav/m4a/ogg into assets/voice/.
const VOICE_IDS = [
  'k_launch', 'k_boss1', 'k_clear1', 'k_stage2', 'k_boss2', 'k_victory',
  'k_hit', 'k_respawn', 'k_power',
  'c_briefing1', 'c_heavy', 'c_warning1', 'c_briefing2', 'c_mines', 'c_warning2',
  'c_lastlife', 'c_gameover', 'c_victory',
];
audio.fetchVoices('assets/voice/', VOICE_IDS);

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x02030a, 90, 220);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 1, 400);
camera.position.set(0, 3, 62);
camera.lookAt(0, 0, 0);

// visible half-extents of the z=0 gameplay plane
const view = { w: 40, h: 26 };
function computeView() {
  view.h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  view.w = view.h * camera.aspect;
}
computeView();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  computeView();
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
  { pts: makeStars(160, -12, 0.55, 0xffffff), speed: 26 },
  { pts: makeStars(140, -30, 0.8, 0x9fc8ff), speed: 12 },
  { pts: makeStars(110, -55, 1.2, 0x5f6fb8), speed: 5 },
];
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

// ---------------------------------------------------------------- player
const ship = new THREE.Group();
{
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xd8e4f0, metalness: 0.5, roughness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x2fae5c, metalness: 0.4, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5.4, 10), hullMat);
  body.rotation.z = -Math.PI / 2;
  ship.add(body);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x35d0ff, emissive: 0x0a4a70, metalness: 0.2, roughness: 0.1 }));
  canopy.position.set(0.5, 0.5, 0);
  canopy.scale.set(1.5, 0.8, 0.8);
  ship.add(canopy);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 3.4), accentMat);
  wing.position.set(-1.1, -0.1, 0);
  ship.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.14), accentMat);
  tail.position.set(-1.9, 0.7, 0);
  ship.add(tail);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 8),
    new THREE.MeshBasicMaterial({ color: 0x66eaff }));
  flame.rotation.z = Math.PI / 2;
  flame.position.set(-3.4, 0, 0);
  ship.add(flame);
  ship.userData.flame = flame;
  const glow = new THREE.PointLight(0x44ccff, 30, 22);
  glow.position.set(-3.2, 0, 0);
  ship.add(glow);
  scene.add(ship);
}

const player = {
  pos: new THREE.Vector3(-view.w + 12, 0, 0),
  speed: 34,
  radius: 1.5,
  fireCool: 0,
  weapon: 1,       // 1..3
  lives: 3,
  invuln: 0,
  alive: true,
  respawnT: 0,
};

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
const playerBullets = makePool(70, () => {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.6, 3, 8), pBulletMat);
  m.rotation.z = Math.PI / 2;
  return m;
});
const eBulletMat = new THREE.MeshBasicMaterial({ color: 0xff7040 });
const eBulletCoreMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0 });
const enemyBullets = makePool(140, () => {
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
};

function spawnEnemy(type, y, opts) {
  const def = ENEMY_DEFS[type];
  const mesh = buildEnemy(type);
  const o = opts || {};
  mesh.position.set(o.x !== undefined ? o.x : view.w + 6, y, 0);
  scene.add(mesh);
  enemies.push({
    type, mesh, hp: def.hp, radius: def.radius, score: def.score,
    t: 0, baseY: y, fireCool: 1 + Math.random(), ...o,
  });
}

function killEnemy(e, i) {
  const big = e.type === 'heavy';
  burst(e.mesh.position, big ? 26 : 14, big ? 22 : 16, big ? 1.4 : 1);
  audio.explode();
  addScore(e.score);
  if (e.drops) dropPowerup(e.mesh.position);
  if (e.type === 'ast') {
    // shatter into fragments
    for (const vy of [-5, 1, 5])
      spawnEnemy('astS', e.mesh.position.y, {
        x: e.mesh.position.x, vy: vy + (Math.random() - 0.5) * 3,
        sp: 12 + Math.random() * 8,
      });
  }
  scene.remove(e.mesh);
  enemies.splice(i, 1);
  shake = Math.max(shake, big ? 0.5 : 0.2);
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
  b.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
  b.life = 7;
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
      m.position.x -= 9 * dt;
      m.rotation.z += 1.2 * dt;
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < view.w - 4 && player.alive) {
        enemyFire(m.position, 24);
        e.fireCool = 2.2;
      }
    } else if (e.type === 'heavy') {
      m.position.x -= 7 * dt;
      m.position.y = e.baseY + Math.sin(e.t * 1.2) * 2;
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < view.w - 6 && player.alive) {
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
      if (player.alive && m.position.distanceTo(player.pos) < 6) {
        detonateMine(e, i);
        continue;
      }
    } else if (e.type === 'orbiter') {
      e.cx = (e.cx ?? view.w + 6) - 12 * dt;
      const a = (e.a0 || 0) + e.t * (e.omega || 2);
      m.position.set(e.cx + Math.cos(a) * 3.4, e.baseY + Math.sin(a) * 3.4, 0);
      m.rotation.y += 3 * dt;
      e.fireCool -= dt;
      if (e.fireCool <= 0 && m.position.x < view.w - 4 && player.alive) {
        enemyFire(m.position, 23);
        e.fireCool = 2.6;
      }
    } else if (e.type === 'ast' || e.type === 'astS') {
      m.position.x -= (e.sp || 12) * dt;
      m.position.y += (e.vy || 0) * dt;
      m.rotation.x += (e.type === 'ast' ? 0.7 : 2.2) * dt;
      m.rotation.y += 0.5 * dt;
      if (Math.abs(m.position.y) > view.h + 8) {
        scene.remove(m);
        enemies.splice(i, 1);
        continue;
      }
    }

    if (m.position.x < -view.w - 8) {
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
  g.position.set(view.w + 24, 0, 0);
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
  head.position.set(view.w + 30, 0, 0);
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

function spawnBoss() {
  const st = STAGES[stageIdx];
  boss = st.makeBoss();
  document.getElementById('bossname').textContent = st.bossName;
  document.getElementById('bossbar-wrap').classList.add('on');
  updateBossBar();
}

function updateBossBar() {
  document.getElementById('bossbar').style.width =
    Math.max(0, boss.hp / boss.maxHp * 100) + '%';
}

function bossPhase() {
  return boss.hp > boss.maxHp * 0.66 ? 1 : boss.hp > boss.maxHp * 0.33 ? 2 : 3;
}

function removeBoss() {
  scene.remove(boss.mesh);
  if (boss.segs) for (const s of boss.segs) scene.remove(s);
  boss = null;
  document.getElementById('bossbar-wrap').classList.remove('on');
}

function updateBoss(dt) {
  if (!boss) return;
  if (boss.kind === 'carrier') updateCarrier(dt);
  else updateSerpent(dt);
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
    if (m.position.x <= view.w - 16) {
      b.entered = true;
      say('kamus', 'Whoa— that thing is HUGE. Locking on to the core.', 'k_boss1');
    }
    return;
  }

  const phase = bossPhase();
  const speedMul = phase === 1 ? 1 : phase === 2 ? 1.4 : 1.8;
  m.position.y = Math.sin(b.t * 0.7 * speedMul) * (view.h - 12);
  m.position.x = view.w - 16 + Math.sin(b.t * 0.4) * 3;

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
      spawnEnemy('drone', (Math.random() * 2 - 1) * (view.h - 8), { amp: 4 });
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
    if (head.position.x <= view.w * 0.55) {
      b.entered = true;
      say('kamus', "It moves like a snake... aim for the head. Got it.", 'k_boss2');
    }
  } else {
    const phase = bossPhase();
    const sp = phase === 1 ? 1 : phase === 2 ? 1.3 : 1.6;
    const target = new THREE.Vector3(
      view.w * 0.28 + Math.sin(b.t * 0.55 * sp) * view.w * 0.42,
      Math.sin(b.t * 0.9 * sp + 1.2) * (view.h - 8), 0);
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
      spawnEnemy('mine', tail.position.y, { x: Math.min(tail.position.x, view.w - 4) });
      b.cool.spawn = 5;
    }
  }
}

function hitBoss(dmg) {
  if (!boss || !boss.entered || boss.dying > 0) return;
  boss.hp -= dmg;
  updateBossBar();
  if (boss.hp <= 0) {
    boss.dying = 2.6;
    addScore(10000);
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
  { t: 19,   fn: () => { spawnEnemy('turret', 8); spawnEnemy('turret', -8); droneWave(4, 0, 7); } },
  { t: 25,   fn: () => say('commander',
      "Heads up — heavy gunship on your scope. It's armored, but it's carrying weapon pods. Take it down.", 'c_heavy', 3) },
  { t: 26,   fn: () => { spawnEnemy('heavy', 2, { drops: true }); droneWave(4, -10, 3); } },
  { t: 32,   fn: () => darterStack([12, 6, 0, -6, -12]) },
  { t: 34,   fn: () => darterStack([9, 3, -3, -9]) },
  { t: 38,   fn: () => { droneWave(7, 6, 8); spawnEnemy('turret', -10); } },
  { t: 44,   fn: () => { spawnEnemy('heavy', -6); spawnEnemy('heavy', 8); } },
  { t: 51,   fn: () => { droneWave(6, 12, 4, 300); droneWave(6, -12, 4, 300); } },
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
  { t: 24,   fn: () => { orbiterPair(8); orbiterPair(-8); droneWave(4, 0, 6) } },
  { t: 30,   fn: () => { spawnEnemy('heavy', 2, { drops: true }); mineRow([9, -9]); } },
  { t: 37,   fn: () => { darterStack([11, 5, -1, -7]); spawnEnemy('turret', 0); } },
  { t: 43,   fn: () => mineRow([12, 8, 4, 0, -4, -8, -12]) },
  { t: 49,   fn: () => { orbiterPair(5); orbiterPair(-5); droneWave(5, 10, 4); } },
  { t: 56,   fn: () => { spawnEnemy('heavy', -6); spawnEnemy('heavy', 8, { drops: true }); } },
  { t: 63,   fn: () => droneWave(10, 0, 12, 260) },
  { t: 69,   fn: () => { spawnEnemy('turret', 9); spawnEnemy('turret', -9); orbiterPair(0); } },
  { t: 75,   fn: () => { mineRow([10, 0, -10]); darterStack([6, -6]); } },
  { t: 80,   fn: () => bossWarning('c_warning2',
      "Reading a segmented signature... enormous... Kamus, it's the BASILISK. The head is the weak point!") },
  { t: 85,   fn: bossArrive },
];

// stage 2 ambient hazard: a steady drizzle of asteroids until the boss warning
function beltAmbient(dt) {
  astTimer -= dt;
  if (astTimer <= 0 && levelTime > 4 && levelTime < 78) {
    spawnEnemy('ast', (Math.random() * 2 - 1) * (view.h - 4), {
      vy: (Math.random() - 0.5) * 7,
      sp: 10 + Math.random() * 8,
    });
    astTimer = 2.0 + Math.random() * 1.8;
  }
}

const STAGES = [
  {
    name: 'STAGE 1 — SECTOR 7 APPROACH',
    song: 'level', bossSong: 'boss',
    bossName: 'GORGON VORTEX - DREAD CARRIER',
    timeline: TIMELINE1, ambient: null, makeBoss: makeCarrier,
    theme: { planet: 0x7040a0, planetEm: 0x1a0a30, ring: 0xc0a0ff },
  },
  {
    name: 'STAGE 2 — THE SHATTERED BELT',
    song: 'level2', bossSong: 'boss2',
    bossName: 'BASILISK REX - BELT SERPENT',
    timeline: TIMELINE2, ambient: beltAmbient, makeBoss: makeSerpent,
    theme: { planet: 0xb05a28, planetEm: 0x301206, ring: 0xffc08a },
  },
];

// ---------------------------------------------------------------- input
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code))
    e.preventDefault();
  firstGesture();
  if (e.code === 'Enter') menuAdvance();
  if (e.code === 'KeyP' && (state === 'playing' || state === 'paused')) togglePause();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('pointerdown', () => { firstGesture(); menuAdvance(); });

let padStartPrev = false;
function readInput() {
  let x = 0, y = 0, fire = false, start = false;
  if (keys['ArrowLeft'] || keys['KeyA']) x -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) x += 1;
  if (keys['ArrowUp'] || keys['KeyW']) y += 1;
  if (keys['ArrowDown'] || keys['KeyS']) y -= 1;
  if (keys['Space'] || keys['KeyZ']) fire = true;

  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    const dz = 0.22;
    if (Math.abs(pad.axes[0]) > dz) x += pad.axes[0];
    if (Math.abs(pad.axes[1]) > dz) y -= pad.axes[1];
    if (pad.buttons[14] && pad.buttons[14].pressed) x -= 1; // dpad
    if (pad.buttons[15] && pad.buttons[15].pressed) x += 1;
    if (pad.buttons[12] && pad.buttons[12].pressed) y += 1;
    if (pad.buttons[13] && pad.buttons[13].pressed) y -= 1;
    for (const bi of [0, 1, 2, 7]) // A B X RT
      if (pad.buttons[bi] && pad.buttons[bi].pressed) fire = true;
    if (pad.buttons[9] && pad.buttons[9].pressed) start = true;
    break;
  }
  const startEdge = start && !padStartPrev;
  padStartPrev = start;
  return { x: THREE.MathUtils.clamp(x, -1, 1), y: THREE.MathUtils.clamp(y, -1, 1), fire, startEdge };
}

function rumble(strong, weak, ms) {
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
  el('power').innerHTML = 'PWR&nbsp;' + '&#9646;'.repeat(player.weapon);
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

// pixel fallbacks now; real anime portraits (assets/portraits/*.png) take over if present
const portraitSrc = {
  kamus: pixelDataURL(KAMUS_ROWS, KAMUS_CMAP),
  commander: pixelDataURL(CMDR_ROWS, CMDR_CMAP),
};
for (const who of ['kamus', 'commander']) {
  const probe = new Image();
  probe.onload = () => { portraitSrc[who] = probe.src; };
  probe.src = 'assets/portraits/' + who + '.png';
}

// HUD avatar
drawPixels(el('avatar').getContext('2d'), KAMUS_ROWS, KAMUS_CMAP);

// ---------------------------------------------------------------- voice comms
const COMM_NAMES = {
  kamus: 'LT. KAMUS — FIGHTER SF-01',
  commander: 'COMMANDER — CV ARGO',
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
    comm = commQ.shift();
    comm.t = 0;
    comm.shown = 0;
    const vDur = comm.vid ? audio.playVoice(comm.vid) : 0;
    comm.voiced = vDur > 0;
    comm.dur = Math.max(comm.minDur, vDur + 0.6, comm.text.length / 26 + 1.3);
    const box = el('comm');
    box.classList.add('on');
    box.classList.toggle('commander', comm.who === 'commander');
    el('comm-name').textContent = COMM_NAMES[comm.who];
    el('comm-portrait').src = portraitSrc[comm.who];
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
        audio.talk(comm.who === 'commander' ? 210 : 400);
    }
    if (comm.t >= comm.dur) closeComm();
  }
}

// ---------------------------------------------------------------- state machine
let state = 'title'; // title | playing | paused | gameover | clear | victory
let shake = 0;
let audioStarted = false;

function firstGesture() {
  if (audioStarted) return;
  audioStarted = true;
  audio.init();
  if (state === 'title') audio.playSong('title');
}

function menuAdvance() {
  if (state === 'title') startGame();
  else if (state === 'gameover' || state === 'victory') toTitle();
}

function toTitle() {
  cleanupField();
  state = 'title';
  el('gameover').classList.remove('on');
  el('clear').classList.remove('on');
  el('victory').classList.remove('on');
  el('title').classList.add('on');
  el('hud').classList.remove('on');
  if (audioStarted) audio.playSong('title');
}

function startGame() { startStage(0, true); }

function startStage(i, fresh) {
  cleanupField();
  stageIdx = i;
  const st = STAGES[i];
  state = 'playing';
  levelTime = 0;
  eventIdx = 0;
  bossPhaseStarted = false;
  astTimer = 2;
  if (fresh) {
    score = 0;
    player.lives = 3;
    player.weapon = 1;
    saidPower = false;
  }
  player.alive = true;
  player.invuln = 2.5;
  player.pos.set(-view.w + 12, 0, 0);
  ship.visible = true;
  el('title').classList.remove('on');
  el('gameover').classList.remove('on');
  el('clear').classList.remove('on');
  el('victory').classList.remove('on');
  el('hud').classList.add('on');
  planetBallMat.color.setHex(st.theme.planet);
  planetBallMat.emissive.setHex(st.theme.planetEm);
  planetRingMat.color.setHex(st.theme.ring);
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
  if (stageIdx === 0) {
    state = 'clear';
    player.lives += 1; // reinforcement ship
    updateLivesHud();
    audio.playSong('clear');
    say('kamus', 'Carrier down! Sector Seven is breathing again.', 'k_clear1', 3);
    el('clear-score').textContent = 'SCORE : ' + score + '   —   REINFORCEMENT SHIP +1';
    el('clear').classList.add('on');
    setTimeout(() => {
      if (state === 'clear') startStage(1, false);
    }, 6500);
  } else {
    state = 'victory';
    audio.playSong('victory');
    say('kamus', "Basilisk destroyed! Command... I'm coming home.", 'k_victory', 3);
    say('commander', "Confirmed kill... the belt is clear. Outstanding flying, Kamus. Come home — dinner's on me.", 'c_victory', 4);
    el('v-score').textContent = 'FINAL SCORE : ' + score;
    el('victory').classList.add('on');
  }
}

// ---------------------------------------------------------------- update
function firePlayer() {
  const spawn = (dy, angle) => {
    const b = take(playerBullets);
    if (!b) return;
    b.mesh.position.set(player.pos.x + 2.6, player.pos.y + dy, 0);
    b.vel.set(Math.cos(angle || 0) * 95, Math.sin(angle || 0) * 95, 0);
    b.mesh.rotation.z = Math.PI / 2 + (angle || 0);
    b.life = 1.4;
  };
  if (player.weapon === 1) spawn(0, 0);
  else if (player.weapon === 2) { spawn(0.9, 0); spawn(-0.9, 0); }
  else { spawn(0.9, 0); spawn(-0.9, 0); spawn(0.4, 0.16); spawn(-0.4, -0.16); }
  audio.shoot();
}

function updatePlayer(dt, input) {
  if (!player.alive) {
    player.respawnT -= dt;
    if (player.respawnT <= 0 && player.lives >= 0) {
      player.alive = true;
      player.invuln = 2.5;
      player.pos.set(-view.w + 12, 0, 0);
      ship.visible = true;
      say('kamus', 'New ship, same pilot. Back in the fight!', 'k_respawn', 2);
    }
    return;
  }
  player.pos.x += input.x * player.speed * dt;
  player.pos.y += input.y * player.speed * dt;
  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -view.w + 4, view.w * 0.35);
  player.pos.y = THREE.MathUtils.clamp(player.pos.y, -view.h + 4.5, view.h - 5.5);
  ship.position.copy(player.pos);
  ship.rotation.x = THREE.MathUtils.lerp(ship.rotation.x, -input.y * 0.55, 10 * dt);
  ship.rotation.y = THREE.MathUtils.lerp(ship.rotation.y, input.x * 0.18, 10 * dt);
  const fl = ship.userData.flame;
  fl.scale.y = 0.8 + Math.random() * 0.5 + (input.x > 0 ? 0.5 : 0);
  fl.material.color.setHSL(0.52 + Math.random() * 0.05, 1, 0.6 + Math.random() * 0.2);

  if (player.invuln > 0) {
    player.invuln -= dt;
    ship.visible = Math.floor(player.invuln * 12) % 2 === 0;
    if (player.invuln <= 0) ship.visible = true;
  }

  player.fireCool -= dt;
  if (input.fire && player.fireCool <= 0) {
    firePlayer();
    player.fireCool = 0.13;
  }
}

function updateBullets(dt) {
  for (const b of playerBullets) {
    if (!b.active) continue;
    b.mesh.position.addScaledVector(b.vel, dt);
    b.life -= dt;
    if (b.life <= 0 || b.mesh.position.x > view.w + 8) release(b);
  }
  for (const b of enemyBullets) {
    if (!b.active) continue;
    b.mesh.position.addScaledVector(b.vel, dt);
    b.mesh.rotation.z += 6 * dt;
    b.life -= dt;
    const p = b.mesh.position;
    if (b.life <= 0 || Math.abs(p.x) > view.w + 10 || Math.abs(p.y) > view.h + 10) release(b);
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
  for (const p of powerups) {
    if (!p.active) continue;
    p.mesh.position.x += p.vel.x * dt;
    p.mesh.position.y = p.baseY + Math.sin(p.life * 3) * 1.5;
    p.mesh.rotation.y += 3 * dt;
    p.mesh.rotation.x += 2 * dt;
    p.life -= dt;
    if (p.life <= 0 || p.mesh.position.x < -view.w - 6) release(p);
  }
}

// bullet-vs-boss test; returns damage dealt (0 = no hit)
function bossBulletDamage(bp) {
  if (!boss || !boss.entered || boss.dying > 0) return 0;
  if (boss.kind === 'carrier') {
    const corePos = boss.mesh.position.clone().add(new THREE.Vector3(-7.4, 0, 0));
    if (bp.distanceTo(corePos) < 4.5) { flashCarrierCore(); return 2; } // core sweet spot
    if (bp.distanceTo(boss.mesh.position) < boss.radius) return 1;
    return 0;
  }
  // serpent: only the head takes damage, the body armors it
  if (bp.distanceTo(boss.mesh.position) < boss.radius) return 1;
  for (let i = 0; i < boss.segs.length; i++) {
    if (bp.distanceTo(boss.segs[i].position) < boss.segR[i]) return -1; // blocked
  }
  return 0;
}

function bossTouchesPlayer() {
  if (!boss || boss.dying > 0) return false;
  if (boss.kind === 'carrier')
    return boss.mesh.position.distanceTo(player.pos) < boss.radius + player.radius;
  if (boss.mesh.position.distanceTo(player.pos) < boss.radius + player.radius) return true;
  for (let i = 0; i < boss.segs.length; i++)
    if (boss.segs[i].position.distanceTo(player.pos) < boss.segR[i] + player.radius) return true;
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
      if (bp.distanceTo(e.mesh.position) < e.radius + 0.8) {
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

  if (!player.alive || player.invuln > 0) return;

  for (const b of enemyBullets) {
    if (!b.active) continue;
    if (b.mesh.position.distanceTo(player.pos) < player.radius + 0.6) {
      release(b);
      playerDie();
      return;
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.mesh.position.distanceTo(player.pos) < e.radius + player.radius) {
      killEnemy(e, i);
      playerDie();
      return;
    }
  }
  if (bossTouchesPlayer()) {
    playerDie();
    return;
  }
  for (const p of powerups) {
    if (!p.active) continue;
    if (p.mesh.position.distanceTo(player.pos) < 3) {
      release(p);
      if (player.weapon < 3) player.weapon += 1;
      else addScore(1000);
      updateLivesHud();
      audio.powerup();
      showMsg(player.weapon < 3 ? 'WEAPON POWER UP!' : 'MAX POWER!', 1.6);
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
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const input = readInput();

  if (input.startEdge) {
    firstGesture();
    if (state === 'title' || state === 'gameover' || state === 'victory') menuAdvance();
    else if (state === 'playing' || state === 'paused') togglePause();
  }

  if (state === 'paused') { renderer.render(scene, camera); return; }

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
    collide();

    if (msgTimer > 0) {
      msgTimer -= dt;
      if (msgTimer <= 0) el('msg').classList.remove('on');
    }
  } else {
    updateBullets(dt);
    if (state === 'title') {
      ship.visible = true;
      const t = clock.elapsedTime;
      player.pos.set(-view.w + 14 + Math.sin(t * 0.6) * 3, Math.sin(t * 0.9) * 4, 0);
      ship.position.copy(player.pos);
      ship.rotation.x = Math.sin(t * 0.9) * -0.3;
      ship.userData.flame.scale.y = 0.8 + Math.random() * 0.4;
    }
    if (boss) updateBoss(dt);
  }

  updateComms(dt);

  shake = Math.max(0, shake - dt * 2.5);
  const sx = (Math.random() - 0.5) * shake * 1.6;
  const sy = (Math.random() - 0.5) * shake * 1.6;
  camera.position.x = player.pos.x * 0.06 + sx;
  camera.position.y = 3 + player.pos.y * 0.08 + sy;
  camera.lookAt(camera.position.x, camera.position.y - 3, 0);

  renderer.render(scene, camera);
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
  audio,
  voiceIds: VOICE_IDS,
};

updateLivesHud();
addScore(0);
frame();
