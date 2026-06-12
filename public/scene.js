// scene.js — the 3D tabletop for Chatstone.
// Owns the Three.js scene: board, card meshes, heroes, end-turn button,
// raycast interaction (select / target / attack arrow), tweens and combat FX.
// Server state is authoritative: every applyState() rebuilds the dynamic
// meshes, then plays FX derived from diffing the previous state.
import * as THREE from './lib/three.module.js';
import { TARGETS, CARD_ASPECT } from './cards.js';

// ----- table layout constants (board plane is 16 x 9 on XZ, y up) -----------
const BOARD_W = 16, BOARD_H = 9;
const MY_ROW_Z = 2.55, OP_ROW_Z = -1.85;     // minion lanes (match painted slots)
const SLOT_DX = 1.72;
const MINION_W = 1.52, MINION_H = MINION_W / CARD_ASPECT;
const HAND_Z = 6.55, HAND_Y = 1.0;
const HAND_W = 1.78, HAND_H = HAND_W / CARD_ASPECT;
const MY_HERO_POS = new THREE.Vector3(0, 0.06, 4.08);
const OP_HERO_POS = new THREE.Vector3(0, 0.06, -3.62);
const END_TURN_POS = new THREE.Vector3(6.5, 0.16, 0.35);

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export class GameScene {
  /**
   * @param canvas  the <canvas>
   * @param art     texture factory from cards.js loadArt()
   * @param bus     { send(msg), toast(msg), preview(name|null, minion?), sfx(name),
   *                  reveal(name, label), targetHint(on) }
   */
  constructor(canvas, art, bus) {
    this.art = art;
    this.bus = bus;
    this.state = null;
    this.fullLog = [];
    this.pendingPlay = null;    // { name } set when we send play_card for a minion
    this.mode = { kind: 'idle' };  // idle | cast {handIndex, card, spec} | attack {index}
    this.tweens = new Set();
    this.texCache = new Map();  // canvas -> THREE texture (never disposed, canvases are cached upstream)
    this.hoverMesh = null;

    // --- renderer / scene / camera -----------------------------------------
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0a12);
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    this.camera.position.set(0, 11.6, 9.7);
    this.camera.lookAt(0, 0, 0.9);
    this.baseFov = 46;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.35);
    sun.position.set(5, 14, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
    this.scene.add(sun);

    // table backdrop + the painted board
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 60),
      new THREE.MeshBasicMaterial({ color: 0x07060c })
    );
    backdrop.rotation.x = -Math.PI / 2;
    backdrop.position.y = -0.25;
    this.scene.add(backdrop);

    const boardMat = new THREE.MeshStandardMaterial({ map: art.boardTexture, roughness: 0.95 });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W, BOARD_H), boardMat);
    board.rotation.x = -Math.PI / 2;
    board.receiveShadow = true;
    this.scene.add(board);

    // dynamic groups, rebuilt each state
    this.gHand = new THREE.Group();
    this.gMyBoard = new THREE.Group();
    this.gOpBoard = new THREE.Group();
    this.gOpHand = new THREE.Group();
    this.gFx = new THREE.Group();
    this.gGlow = new THREE.Group();
    this.scene.add(this.gHand, this.gMyBoard, this.gOpBoard, this.gOpHand, this.gFx, this.gGlow);

    // shared geometries
    this.geoMinion = new THREE.BoxGeometry(MINION_W, MINION_H, 0.05);
    this.geoHand = new THREE.BoxGeometry(HAND_W, HAND_H, 0.05);
    this.geoBack = new THREE.BoxGeometry(1.15, 1.15 / CARD_ASPECT, 0.05);
    this.geoGlowFlat = new THREE.PlaneGeometry(MINION_W * 1.45, MINION_H * 1.38);

    this.glowTex = {
      green: this._glowTexture('#46ff6a'),
      red: this._glowTexture('#ff4632'),
      gold: this._glowTexture('#ffd75a'),
    };

    // heroes + end turn button (persistent meshes)
    this.myHero = this._heroMesh(MY_HERO_POS);
    this.opHero = this._heroMesh(OP_HERO_POS);
    this.endTurn = this._endTurnMesh();
    this.scene.add(this.myHero, this.opHero, this.endTurn);

    // targeting arrow
    this.arrow = new THREE.Group();
    this.arrowMat = new THREE.MeshBasicMaterial({ color: 0xff5030, transparent: true, opacity: 0.92, depthTest: false });
    this.arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 14), this.arrowMat);
    this.arrowHead.renderOrder = 30;
    this.arrow.visible = false;
    this.arrow.add(this.arrowHead);
    this.scene.add(this.arrow);
    this.arrowTube = null;

    // input
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    canvas.addEventListener('pointermove', e => this._onMove(e));
    canvas.addEventListener('pointerdown', e => this._onDown(e));
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => { if (e.key === 'Escape') this._cancel(); });
    window.addEventListener('resize', () => this._resize());
    this._resize();

    this.renderer.setAnimationLoop(() => this._frame());
  }

  // ======================================================== textures / meshes
  _tex(canvas) {
    let t = this.texCache.get(canvas);
    if (!t) { t = this.art.texFromCanvas(canvas); this.texCache.set(canvas, t); }
    return t;
  }

  _glowTexture(color) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.shadowColor = color; ctx.shadowBlur = 38;
    ctx.strokeStyle = color; ctx.lineWidth = 12;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.roundRect(38, 30, 180, 196, 22);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  _cardMesh(geo, faceCanvas, backCanvas) {
    const edge = new THREE.MeshBasicMaterial({ color: 0x191522 });
    const face = new THREE.MeshBasicMaterial({ map: this._tex(faceCanvas) });
    const back = new THREE.MeshBasicMaterial({ map: this._tex(backCanvas || this.art.backCanvas) });
    const mesh = new THREE.Mesh(geo, [edge, edge, edge, edge, face, back]);
    mesh.castShadow = true;
    return mesh;
  }

  _heroMesh(pos) {
    const geo = new THREE.PlaneGeometry(2.45, 2.45);
    const mat = new THREE.MeshBasicMaterial({ transparent: true });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos);
    m.userData = { kind: pos === MY_HERO_POS ? 'myHero' : 'opHero' };
    return m;
  }

  _endTurnCanvas(active) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 192;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    if (active) { g.addColorStop(0, '#f7dc8e'); g.addColorStop(0.55, '#d8a84a'); g.addColorStop(1, '#9a6e10'); }
    else { g.addColorStop(0, '#5a5468'); g.addColorStop(1, '#322c3e'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(6, 6, 500, 180, 40); ctx.fill();
    ctx.lineWidth = 10; ctx.strokeStyle = active ? '#6b5212' : '#211c2c'; ctx.stroke();
    ctx.font = 'bold 74px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? '#2a1d08' : '#8d86a0';
    ctx.fillText(active ? 'END TURN' : 'ENEMY TURN', 256, 102);
    return c;
  }

  _endTurnMesh() {
    const geo = new THREE.BoxGeometry(2.15, 0.28, 0.85);
    const side = new THREE.MeshStandardMaterial({ color: 0x4a3a18, roughness: 0.6 });
    this.endTurnTopMat = new THREE.MeshBasicMaterial({ map: this._tex(this._endTurnCanvas(false)) });
    const m = new THREE.Mesh(geo, [side, side, this.endTurnTopMat, side, side, side]);
    m.position.copy(END_TURN_POS);
    m.castShadow = true;
    m.userData = { kind: 'endTurn' };
    return m;
  }

  _setEndTurn(active) {
    if (this._endTurnActive === active) return;
    this._endTurnActive = active;
    this.endTurnTopMat.map = this._tex(this._endTurnCanvas(active));
    this.endTurnTopMat.needsUpdate = true;
  }

  // ============================================================= state apply
  applyState(state) {
    const prev = this.state;
    const fx = prev ? this._diffFx(prev, state) : [];
    this.state = state;
    this.mode = { kind: 'idle' };
    this.bus.targetHint(false);
    this.arrow.visible = false;

    this._appendLog(state.log);
    this._rebuild(prev, fx);
    this._setEndTurn(state.turn === state.seat && !state.over);
    for (const f of fx) f();   // run FX after meshes exist
  }

  get myTurn() { const s = this.state; return s && !s.over && s.turn === s.seat; }

  // Merge the server's rolling 20-entry log into a full client-side log.
  // Returns entries that are new this update.
  _appendLog(entries) {
    const full = this.fullLog;
    let overlap = 0;
    for (let k = Math.min(entries.length, full.length); k > 0; k--) {
      let ok = true;
      for (let i = 0; i < k; i++) if (full[full.length - k + i] !== entries[i]) { ok = false; break; }
      if (ok) { overlap = k; break; }
    }
    this.newLog = entries.slice(overlap);
    full.push(...this.newLog);
    if (full.length > 400) full.splice(0, full.length - 400);
  }

  // Build FX closures by diffing prev → next, captured before the rebuild.
  _diffFx(prev, next) {
    const fx = [];
    const sfx = this.bus.sfx;

    // hero damage / heal popups
    const heroFx = (pPrev, pNext, heroMesh) => {
      const d = (pPrev.hp + pPrev.armor) - (pNext.hp + pNext.armor);
      if (d > 0) fx.push(() => { this._damageText(heroMesh.position, '-' + d, '#ff5040'); this._shake(heroMesh); sfx('hit'); });
      if (pNext.hp > pPrev.hp) fx.push(() => this._damageText(heroMesh.position, '+' + (pNext.hp - pPrev.hp), '#54ff7a'));
    };
    heroFx(prev.me, next.me, this.myHero);
    heroFx(prev.op, next.op, this.opHero);

    // minion deaths (multiset diff by name) + damage popups
    const rowFx = (prevBoard, nextBoard, rowZ) => {
      const left = nextBoard.map(m => m.name);
      prevBoard.forEach((m, i) => {
        const j = left.indexOf(m.name);
        if (j >= 0) {
          left[j] = null;
          const nm = nextBoard[j];
          if (nm.health < m.health) {
            fx.push(() => { this._damageText(this._slotPos(j, nextBoard.length, rowZ), String(nm.health - m.health), '#ff5040'); });
          }
        } else {
          // died — ghost card fades out at its old slot
          const pos = this._slotPos(i, prevBoard.length, rowZ);
          const canvas = this.art.minionCanvas(m);
          fx.push(() => { this._deathGhost(canvas, pos); sfx('death'); });
        }
      });
    };
    rowFx(prev.me.board, next.me.board, MY_ROW_Z);
    rowFx(prev.op.board, next.op.board, OP_ROW_Z);
    return fx;
  }

  _slotPos(i, n, z) {
    return new THREE.Vector3((i - (n - 1) / 2) * SLOT_DX, 0.07, z);
  }

  _rebuild(prev, fx) {
    const s = this.state;
    for (const g of [this.gHand, this.gMyBoard, this.gOpBoard, this.gOpHand, this.gGlow]) {
      for (let i = g.children.length - 1; i >= 0; i--) g.remove(g.children[i]);
    }
    this.hoverMesh = null;

    // ---- my hand: fanned arc facing the camera ----
    const hand = s.me.hand;
    const n = hand.length;
    const spread = Math.min(1.35, 9.4 / Math.max(n, 1));
    hand.forEach((c, i) => {
      const mesh = this._cardMesh(this.geoHand, this.art.cardCanvas(c.name));
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      const x = t * spread * n * 0.92;
      const y = HAND_Y + (1 - Math.abs(t) * 1.6) * 0.18;
      mesh.position.set(x, y, HAND_Z + Math.abs(t) * 0.22);
      mesh.lookAt(this.camera.position);
      mesh.rotateZ(-t * 0.30);
      mesh.userData = {
        kind: 'hand', index: i, card: c,
        home: mesh.position.clone(), homeQuat: mesh.quaternion.clone(),
        lift: 0,
      };
      this.gHand.add(mesh);
    });

    // entry animation for a drawn card. Hand positions are re-applied from
    // userData.home every frame (hover lift), so animate `home` itself.
    if (prev && s.me.hand.length > prev.me.hand.length && this.gHand.children.length) {
      const mesh = this.gHand.children[this.gHand.children.length - 1];
      const u = mesh.userData;
      const to = u.home.clone();
      const from = new THREE.Vector3(7.6, 0.5, 3.2);   // deck area, right side
      u.home.copy(from);
      this._tween(450, t => {
        u.home.lerpVectors(from, to, t);
        u.home.y += Math.sin(t * Math.PI) * 1.0;
      }, () => u.home.copy(to));
      this.bus.sfx('draw');
    }

    // ---- boards ----
    const buildRow = (board, group, z, mine) => {
      board.forEach((m, i) => {
        const mesh = this._cardMesh(this.geoMinion, this.art.minionCanvas(m));
        mesh.position.copy(this._slotPos(i, board.length, z));
        mesh.rotation.x = -Math.PI / 2;
        mesh.userData = { kind: mine ? 'myMinion' : 'opMinion', index: i, minion: m, home: mesh.position.clone() };
        group.add(mesh);
        // ready-to-attack glow
        if (mine && this.myTurn && m.attacksLeft > 0 && m.attack > 0) this._glowUnder(mesh.position, 'green');
        if (m.taunt) this._tauntRing(mesh.position);
      });
    };
    buildRow(s.me.board, this.gMyBoard, MY_ROW_Z, true);
    buildRow(s.op.board, this.gOpBoard, OP_ROW_Z, false);

    // played-minion entry animations
    if (prev) {
      if (s.me.board.length > prev.me.board.length && this.pendingPlay) {
        const idx = s.me.board.findIndex((m, i) => m.name === this.pendingPlay.name && (!prev.me.board[i] || prev.me.board[i].name !== m.name));
        const mesh = this.gMyBoard.children[idx >= 0 ? idx : s.me.board.length - 1];
        if (mesh) this._flyIn(mesh, new THREE.Vector3(mesh.position.x, 2.4, HAND_Z - 1.4));
        this.bus.sfx('play');
      }
      if (s.op.board.length > prev.op.board.length) {
        // find first new-by-position minion
        for (let i = 0; i < s.op.board.length; i++) {
          if (!prev.op.board[i] || prev.op.board[i].name !== s.op.board[i].name) {
            const mesh = this.gOpBoard.children[i];
            if (mesh) this._flyIn(mesh, new THREE.Vector3(mesh.position.x, 2.4, -4.6));
            break;
          }
        }
        this.bus.sfx('play');
      }
    }
    this.pendingPlay = null;

    // ---- opponent hand (card backs) ----
    const opN = s.op.hand;
    for (let i = 0; i < opN; i++) {
      const mesh = this._cardMesh(this.geoBack, this.art.backCanvas);
      const t = opN === 1 ? 0 : i / (opN - 1) - 0.5;
      mesh.position.set(t * Math.min(0.85, 7 / opN) * opN, 0.65 - Math.abs(t) * 0.1, -4.55);
      mesh.rotation.set(Math.PI / 2 + 0.45, 0, t * 0.25);   // tilted away: we see the back
      this.gOpHand.add(mesh);
    }

    // ---- heroes ----
    const heroPortrait = seat => (seat === 0 ? 0 : 2);   // pilot vs jester
    const heroName = seat => (seat === 0 ? this.art.HERO_NAMES[0] : this.art.HERO_NAMES[2]);
    this.myHero.material.map = this._tex(this.art.heroCanvas(heroPortrait(s.seat), heroName(s.seat), s.me.hp, s.me.armor));
    this.myHero.material.needsUpdate = true;
    this.opHero.material.map = this._tex(this.art.heroCanvas(heroPortrait(1 - s.seat), heroName(1 - s.seat), s.op.hp, s.op.armor));
    this.opHero.material.needsUpdate = true;

    // opponent reveal + attack lunges from fresh log lines
    const opP = 'P' + (2 - s.seat);   // opponent's log prefix ("P1"/"P2")
    for (const line of this.newLog || []) {
      let m;
      if ((m = line.match(/^(P\d) plays (.+)$/)) && m[1] === opP) {
        const name = m[2];
        this.bus.reveal(name, 'Opponent plays');
        this.bus.sfx('reveal');
      } else if ((m = line.match(/^(.+) hits face for \d+$/)) && s.turn !== s.seat) {
        this._lungeByName(this.gOpBoard, m[1], this.myHero.position);
      } else if ((m = line.match(/^(.+) trades with (.+)$/)) && s.turn !== s.seat) {
        const target = this.gMyBoard.children.find(c => c.userData.minion && c.userData.minion.name === m[2]);
        this._lungeByName(this.gOpBoard, m[1], target ? target.position : this.myHero.position);
      }
    }
  }

  _lungeByName(group, name, targetPos) {
    const mesh = group.children.find(c => c.userData.minion && c.userData.minion.name === name);
    if (mesh) this._lunge(mesh, targetPos);
  }

  _glowUnder(pos, color) {
    const m = new THREE.Mesh(this.geoGlowFlat, new THREE.MeshBasicMaterial({
      map: this.glowTex[color], transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.045, pos.z);
    this.gGlow.add(m);
    return m;
  }

  _tauntRing(pos) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(MINION_W * 0.62, MINION_W * 0.72, 36),
      new THREE.MeshBasicMaterial({ color: 0xb8c8e0, transparent: true, opacity: 0.5, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.04, pos.z);
    this.gGlow.add(m);
  }

  // =============================================================== tweens/FX
  _tween(d, up, done, ease = easeOutCubic) {
    const tw = { t0: performance.now(), d, up, done, ease };
    this.tweens.add(tw);
    return tw;
  }

  _flyIn(mesh, from) {
    const to = mesh.position.clone();
    mesh.position.copy(from);
    this._tween(420, t => {
      mesh.position.lerpVectors(from, to, t);
      mesh.position.y += Math.sin(t * Math.PI) * 0.9;
    }, () => mesh.position.copy(to));
  }

  _lunge(mesh, targetPos) {
    const from = mesh.userData.home ? mesh.userData.home.clone() : mesh.position.clone();
    const hit = targetPos.clone().lerp(from, 0.25);
    this.bus.sfx('attack');
    this._tween(360, t => {
      const k = t < 0.5 ? easeInOutQuad(t * 2) : 1 - easeInOutQuad((t - 0.5) * 2);
      mesh.position.lerpVectors(from, hit, k);
      mesh.position.y = from.y + Math.sin(Math.min(t * 2, 1) * Math.PI) * 0.55;
      if (!mesh.userData.hitDone && t >= 0.5) { mesh.userData.hitDone = true; this.bus.sfx('hit'); }
    }, () => { mesh.position.copy(from); mesh.userData.hitDone = false; }, easeInOutQuad);
  }

  _shake(mesh) {
    const base = mesh.position.clone();
    this._tween(380, t => {
      const a = (1 - t) * 0.14;
      mesh.position.set(base.x + (Math.random() - 0.5) * a, base.y, base.z + (Math.random() - 0.5) * a);
    }, () => mesh.position.copy(base));
  }

  _deathGhost(canvas, pos) {
    const mat = new THREE.MeshBasicMaterial({ map: this._tex(canvas), transparent: true });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(MINION_W, MINION_H), mat.clone());
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.12, pos.z);
    this.gFx.add(m);
    this._tween(620, t => {
      m.material.opacity = 1 - t;
      m.position.y = 0.12 + t * 0.8;
      m.rotation.z = t * 0.5;
      m.scale.setScalar(1 - t * 0.4);
    }, () => { this.gFx.remove(m); m.geometry.dispose(); m.material.dispose(); });
  }

  _damageText(pos, text, color) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 150px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 18; ctx.strokeStyle = '#000';
    ctx.strokeText(text, 128, 128);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.renderOrder = 40;
    sp.scale.setScalar(1.4);
    sp.position.set(pos.x, 1.1, pos.z);
    this.gFx.add(sp);
    this._tween(950, t => {
      sp.position.y = 1.1 + t * 1.1;
      sp.material.opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      sp.scale.setScalar(1.4 + t * 0.3);
    }, () => { this.gFx.remove(sp); sp.material.map.dispose(); sp.material.dispose(); });
  }

  // ================================================================== input
  _setPointer(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
  }

  _interactives() {
    return [
      ...this.gHand.children,
      ...this.gMyBoard.children,
      ...this.gOpBoard.children,
      this.myHero, this.opHero, this.endTurn,
    ];
  }

  _pick(e) {
    this._setPointer(e);
    const hits = this.ray.intersectObjects(this._interactives(), false);
    return hits.length ? hits[0].object : null;
  }

  _onMove(e) {
    if (!this.state) return;
    const mesh = this._pick(e);

    // hover bookkeeping
    if (mesh !== this.hoverMesh) {
      if (this.hoverMesh && this.hoverMesh.userData.kind === 'hand') this.hoverMesh.userData.lift = 0;
      this.hoverMesh = mesh;
      const u = mesh ? mesh.userData : null;
      if (u && u.kind === 'hand') { u.lift = 1; this.bus.preview(u.card.name, null); }
      else if (u && (u.kind === 'myMinion' || u.kind === 'opMinion')) this.bus.preview(u.minion.name, u.minion);
      else this.bus.preview(null);
      this.renderer.domElement.style.cursor = mesh ? 'pointer' : 'default';
    }

    // targeting arrow follows pointer
    if (this.mode.kind === 'cast' || this.mode.kind === 'attack') {
      const p = new THREE.Vector3();
      this.ray.ray.intersectPlane(this.groundPlane, p);
      if (p) this._drawArrow(this.mode.from, p);
    }
  }

  _onDown(e) {
    if (!this.state) return;
    if (e.button === 2) { this._cancel(); return; }
    if (e.button !== 0) return;
    this.bus.sfx('click');
    const mesh = this._pick(e);
    const u = mesh ? mesh.userData : null;

    if (this.mode.kind === 'cast') return this._clickCastTarget(u);
    if (this.mode.kind === 'attack') return this._clickAttackTarget(u);
    if (!u) return;

    const s = this.state;
    if (u.kind === 'endTurn') {
      if (!this.myTurn) return this.bus.toast(s.over ? 'The game is over' : "It's not your turn");
      return this.bus.send({ type: 'end_turn' });
    }
    if (u.kind === 'hand') {
      if (!this.myTurn) return this.bus.toast("It's not your turn");
      const c = u.card;
      if (c.cost > s.me.mana) return this.bus.toast(`Not enough mana (${c.cost} needed)`);
      if (c.type === 'Minion' && s.me.board.length >= 7) return this.bus.toast('Your board is full');
      const spec = TARGETS[c.name];
      if (spec) {
        this.mode = { kind: 'cast', handIndex: u.index, card: c, spec, from: mesh.position.clone() };
        this._highlightTargets(spec);
        this.bus.targetHint(true);
      } else {
        if (c.type === 'Minion') this.pendingPlay = { name: c.name };
        this.bus.send({ type: 'play_card', i: u.index });
      }
      return;
    }
    if (u.kind === 'myMinion') {
      if (!this.myTurn) return this.bus.toast("It's not your turn");
      const m = u.minion;
      if (m.attack < 1) return this.bus.toast(`${m.name} has no attack`);
      if (m.attacksLeft < 1) return this.bus.toast(`${m.name} isn't ready to attack`);
      this.mode = { kind: 'attack', index: u.index, from: mesh.position.clone() };
      this._highlightTargets({ who: 'op', what: 'attack' });
      this.bus.targetHint(true);
      return;
    }
  }

  _clickCastTarget(u) {
    const { spec, handIndex, card } = this.mode;
    const t = this._asTarget(u, spec);
    if (!t) return this.bus.toast('Invalid target');
    this._cancel();
    this.bus.send({ type: 'play_card', i: handIndex, target: t });
    if (card.type === 'Minion') this.pendingPlay = { name: card.name };
  }

  _clickAttackTarget(u) {
    const idx = this.mode.index;
    const s = this.state;
    if (!u || (u.kind !== 'opMinion' && u.kind !== 'opHero')) return this.bus.toast('Choose an enemy target');
    const taunts = s.op.board.some(m => m.taunt);
    if (u.kind === 'opHero') {
      if (taunts) return this.bus.toast('A Taunt minion is in the way');
      const att = this.gMyBoard.children[idx];
      if (att) this._lunge(att, this.opHero.position);
      this._cancel();
      return this.bus.send({ type: 'attack', a: idx, target: { what: 'hero' } });
    }
    const m = u.minion;
    if (m.stealth) return this.bus.toast("Can't target a Stealthed minion");
    if (taunts && !m.taunt) return this.bus.toast('A Taunt minion is in the way');
    const att = this.gMyBoard.children[idx];
    const tgt = this.gOpBoard.children[u.index];
    if (att && tgt) this._lunge(att, tgt.position);
    this._cancel();
    this.bus.send({ type: 'attack', a: idx, target: { what: 'minion', i: u.index } });
  }

  // Convert a clicked mesh into the server's target format, honoring the spec.
  _asTarget(u, spec) {
    if (!u) return null;
    if (u.kind === 'myHero' || u.kind === 'opHero') {
      if (spec.what === 'minion') return null;
      const who = u.kind === 'myHero' ? 'me' : 'op';
      if (spec.who !== 'any' && spec.who !== who) return null;
      return { who, what: 'hero' };
    }
    if (u.kind === 'myMinion' || u.kind === 'opMinion') {
      const who = u.kind === 'myMinion' ? 'me' : 'op';
      if (spec.who !== 'any' && spec.who !== who) return null;
      if (who === 'op' && u.minion.stealth) return null;
      return { who, what: 'minion', i: u.index };
    }
    return null;
  }

  // red glow under every legal target for the current mode
  _highlightTargets(spec) {
    const s = this.state;
    if (spec.what === 'attack') {
      const taunts = s.op.board.some(m => m.taunt);
      s.op.board.forEach((m, i) => {
        if (m.stealth || (taunts && !m.taunt)) return;
        this._glowUnder(this._slotPos(i, s.op.board.length, OP_ROW_Z), 'red');
      });
      if (!taunts) this._glowUnder(this.opHero.position, 'red');
      return;
    }
    const mark = (board, z, who) => board.forEach((m, i) => {
      if (who === 'op' && m.stealth) return;
      this._glowUnder(this._slotPos(i, board.length, z), 'red');
    });
    if (spec.who !== 'op') mark(s.me.board, MY_ROW_Z, 'me');
    if (spec.who !== 'me') mark(s.op.board, OP_ROW_Z, 'op');
    if (spec.what !== 'minion') {
      if (spec.who !== 'me') this._glowUnder(this.opHero.position, 'red');
      if (spec.who !== 'op') this._glowUnder(this.myHero.position, 'red');
    }
  }

  _cancel() {
    if (this.mode.kind === 'idle') return;
    this.mode = { kind: 'idle' };
    this.arrow.visible = false;
    this.bus.targetHint(false);
    // rebuild glows (drop red target markers, restore ready-glows)
    if (this.state) {
      for (let i = this.gGlow.children.length - 1; i >= 0; i--) this.gGlow.remove(this.gGlow.children[i]);
      this.state.me.board.forEach((m, i) => {
        if (this.myTurn && m.attacksLeft > 0 && m.attack > 0)
          this._glowUnder(this._slotPos(i, this.state.me.board.length, MY_ROW_Z), 'green');
        if (m.taunt) this._tauntRing(this._slotPos(i, this.state.me.board.length, MY_ROW_Z));
      });
      this.state.op.board.forEach((m, i) => {
        if (m.taunt) this._tauntRing(this._slotPos(i, this.state.op.board.length, OP_ROW_Z));
      });
    }
  }

  // curved targeting arrow from `from` to pointer position `to`
  _drawArrow(from, to) {
    const mid = from.clone().lerp(to, 0.5);
    mid.y += from.distanceTo(to) * 0.28 + 0.6;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from.x, from.y + 0.4, from.z), mid, new THREE.Vector3(to.x, 0.25, to.z)
    );
    if (this.arrowTube) {
      this.arrow.remove(this.arrowTube);
      this.arrowTube.geometry.dispose();
    }
    this.arrowTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.085, 8), this.arrowMat);
    this.arrowTube.renderOrder = 30;
    this.arrow.add(this.arrowTube);
    const end = curve.getPoint(1), beforeEnd = curve.getPoint(0.93);
    this.arrowHead.position.copy(end);
    this.arrowHead.lookAt(end.clone().add(end.clone().sub(beforeEnd)));
    this.arrowHead.rotateX(Math.PI / 2);
    this.arrow.visible = true;
  }

  // ================================================================== frame
  _frame() {
    const now = performance.now();
    for (const tw of this.tweens) {
      const t = Math.min(1, (now - tw.t0) / tw.d);
      tw.up(tw.ease(t));
      if (t >= 1) { this.tweens.delete(tw); if (tw.done) tw.done(); }
    }
    // hand hover lift (smooth)
    for (const mesh of this.gHand.children) {
      const u = mesh.userData;
      const selected = this.mode.kind === 'cast' && this.mode.handIndex === u.index;
      const target = (u.lift || selected) ? 1 : 0;
      u.liftK = (u.liftK ?? 0) + ((target - (u.liftK ?? 0)) * 0.22);
      const k = u.liftK;
      mesh.position.copy(u.home);
      mesh.position.y += k * 0.85;
      mesh.position.z -= k * 0.45;
      mesh.scale.setScalar(1 + k * 0.55);
      mesh.quaternion.copy(u.homeQuat);
      if (k > 0.01) {
        // straighten the card while inspecting it
        const q = new THREE.Quaternion();
        mesh.quaternion.slerp(q.setFromEuler(new THREE.Euler(-0.35, 0, 0)), k * 0.7);
      }
    }
    // gentle pulse on the end turn button when it's our turn
    if (this._endTurnActive) {
      this.endTurn.scale.setScalar(1 + Math.sin(now * 0.004) * 0.03);
    } else this.endTurn.scale.setScalar(1);

    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // keep the full board width in frame on narrow windows
    const baseAspect = 16 / 9.4;
    this.camera.fov = aspect >= baseAspect ? this.baseFov
      : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.baseFov / 2)) * baseAspect / aspect));
    this.camera.updateProjectionMatrix();
  }
}
