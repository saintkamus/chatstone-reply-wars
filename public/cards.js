// cards.js — texture factory for Chatstone.
// Loads the 2x2 card sheets, auto-crops each quadrant to the card's bounding
// box (the sheets have near-black margins), and builds canvas textures:
//   - full card faces for hand cards / previews
//   - composited board-minion faces with live attack/health gems + status icons
//   - procedural token cards (Sticker/Emoji/Bubble) from the frame sheet
//   - hero plates from the portrait sheet
import * as THREE from './lib/three.module.js';

const CARD_W = 512, CARD_H = 700;          // normalized card face size
export const CARD_ASPECT = CARD_W / CARD_H;

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('failed to load ' + url));
    img.src = url;
  });
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Find the bright-pixel bounding box of one quadrant of a sheet (cards sit on
// a near-black background). Scanned at reduced resolution for speed.
function quadrantBBox(img, qx, qy) {
  const S = 160;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const qw = img.width / 2, qh = img.height / 2;
  ctx.drawImage(img, qx * qw, qy * qh, qw, qh, 0, 0, S, S);
  const d = ctx.getImageData(0, 0, S, S).data;
  let minX = S, minY = S, maxX = 0, maxY = 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const lum = d[i] * 0.3 + d[i + 1] * 0.5 + d[i + 2] * 0.2;
      if (lum > 42) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) { minX = 8; minY = 4; maxX = S - 8; maxY = S - 4; }
  // Map back to source pixels with a tiny outward pad so we don't shave edges.
  const pad = 1.5;
  return {
    x: qx * qw + Math.max(0, (minX - pad)) / S * qw,
    y: qy * qh + Math.max(0, (minY - pad)) / S * qh,
    w: Math.min(S, maxX - minX + 2 * pad) / S * qw,
    h: Math.min(S, maxY - minY + 2 * pad) / S * qh,
  };
}

function texFromCanvas(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- stat gems
function drawGem(ctx, cx, cy, r, fill, value, valueColor) {
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r);
  g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = r * 0.16; ctx.strokeStyle = '#e7c068'; ctx.stroke();
  ctx.lineWidth = r * 0.05; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.stroke();
  ctx.font = `bold ${Math.round(r * 1.35)}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = r * 0.22; ctx.strokeStyle = '#000';
  ctx.strokeText(String(value), cx, cy + r * 0.05);
  ctx.fillStyle = valueColor; ctx.fillText(String(value), cx, cy + r * 0.05);
}

export async function loadArt() {
  const A = 'assets/chatstone/';
  const [manifest, frames, icons, heroes, board] = await Promise.all([
    fetch(A + 'manifest.json').then(r => r.json()),
    loadImage(A + 'card-frames.png'),
    loadImage(A + 'ui-icons.png'),
    loadImage(A + 'hero-portraits.png'),
    loadImage(A + 'game-board.png'),
  ]);

  // name -> { img, bbox } from the 2x2 sheets listed in the manifest
  const faces = new Map();
  await Promise.all(manifest.cardSheets.map(async sheet => {
    const img = await loadImage(sheet.file.replace(/^assets\//, 'assets/'));
    sheet.cards.forEach((name, i) => {
      const qx = i % 2, qy = (i / 2) | 0;
      faces.set(name, { img, bbox: quadrantBBox(img, qx, qy) });
    });
  }));

  // base stats by name (server card list mirrors the manifest)
  const baseStats = new Map(manifest.cards.map(c => [c.name, c]));
  baseStats.set('Bubble', { name: 'Bubble', cost: 1, type: 'Minion', attack: 1, health: 1, text: '' });
  baseStats.set('Sticker', { name: 'Sticker', cost: 1, type: 'Spell', text: 'Deal 1 damage to the enemy hero.' });
  baseStats.set('Emoji', { name: 'Emoji', cost: 0, type: 'Spell', text: 'Deal 1 damage to the enemy hero.' });

  // --- helpers over the shared sheets -------------------------------------
  // card-frames.png is a 4x2 grid of empty frames (384x512 each)
  const FR_W = frames.width / 4, FR_H = frames.height / 2;
  function drawFrame(ctx, idx, x, y, w, h) {
    const fx = (idx % 4) * FR_W, fy = ((idx / 4) | 0) * FR_H;
    // frames also sit on dark background; crop a fixed inset that works for the sheet
    const ix = FR_W * 0.045, iy = FR_H * 0.03;
    ctx.drawImage(frames, fx + ix, fy + iy, FR_W - 2 * ix, FR_H - 2 * iy, x, y, w, h);
  }
  // ui-icons.png is a 6x4 grid (256x256 each)
  const IC = 256;
  function drawIcon(ctx, col, row, x, y, size) {
    ctx.drawImage(icons, col * IC + 14, row * IC + 14, IC - 28, IC - 28, x, y, size, size);
  }

  // --- full card face ------------------------------------------------------
  const TOKEN_LOOK = {
    'Sticker': { frame: 4, icon: [0, 3] },   // jungle frame + smiley
    'Emoji':   { frame: 1, icon: [1, 1] },   // arcane frame + comedy masks
    'Bubble':  { frame: 7, icon: [3, 2] },   // tech frame + cube
  };

  const faceCache = new Map();
  function cardCanvas(name) {
    if (faceCache.has(name)) return faceCache.get(name);
    const c = makeCanvas(CARD_W, CARD_H);
    const ctx = c.getContext('2d');
    ctx.save();
    roundRectPath(ctx, 0, 0, CARD_W, CARD_H, 34);
    ctx.clip();
    const face = faces.get(name);
    if (face) {
      ctx.drawImage(face.img, face.bbox.x, face.bbox.y, face.bbox.w, face.bbox.h, 0, 0, CARD_W, CARD_H);
    } else {
      drawTokenFace(ctx, name);
    }
    ctx.restore();
    faceCache.set(name, c);
    return c;
  }

  // Procedural face for tokens (and any card missing art): frame + icon + text
  function drawTokenFace(ctx, name) {
    const look = TOKEN_LOOK[name] || { frame: 0, icon: [5, 3] };
    const stats = baseStats.get(name) || { cost: '?', text: '' };
    ctx.fillStyle = '#15121f';
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    // art behind the frame's oval window
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(CARD_W / 2, CARD_H * 0.30, CARD_W * 0.30, CARD_H * 0.225, 0, 0, Math.PI * 2);
    ctx.clip();
    const grad = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.3, 20, CARD_W / 2, CARD_H * 0.3, 240);
    grad.addColorStop(0, '#3a3358'); grad.addColorStop(1, '#120f1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    drawIcon(ctx, look.icon[0], look.icon[1], CARD_W / 2 - 110, CARD_H * 0.30 - 110, 220);
    ctx.restore();
    drawFrame(ctx, look.frame, 0, 0, CARD_W, CARD_H);
    // name on banner
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(40,25,5,.9)';
    ctx.strokeText(name, CARD_W / 2, CARD_H * 0.555);
    ctx.fillStyle = '#f7ecd2'; ctx.fillText(name, CARD_W / 2, CARD_H * 0.555);
    // rules text
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillStyle = '#241a08';
    wrapText(ctx, stats.text || '', CARD_W / 2, CARD_H * 0.70, CARD_W * 0.62, 36);
    // cost gem
    drawGem(ctx, 56, 60, 46, ['#9fd0ff', '#1b54a8'], stats.cost, '#fff');
    if (stats.type === 'Minion') {
      drawGem(ctx, 60, CARD_H - 62, 48, ['#ffd76a', '#9a6a08'], stats.attack, '#fff');
      drawGem(ctx, CARD_W - 60, CARD_H - 62, 48, ['#ff8a6a', '#a01808'], stats.health, '#fff');
    }
  }

  function wrapText(ctx, text, cx, cy, maxW, lineH) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    const y0 = cy - (lines.length - 1) * lineH / 2;
    lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * lineH));
  }

  // --- board minion face: card art + live stat gems + status icons ---------
  const minionCache = new Map();
  function minionCanvas(m) {
    const key = [m.name, m.attack, m.health, m.maxHealth, m.taunt ? 'T' : '', m.stealth ? 'S' : '', m.silenced ? 'X' : ''].join('|');
    if (minionCache.has(key)) return minionCache.get(key);
    const c = makeCanvas(CARD_W, CARD_H);
    const ctx = c.getContext('2d');
    ctx.drawImage(cardCanvas(m.name), 0, 0);

    if (m.stealth) {   // dusk veil + masks icon
      ctx.save();
      roundRectPath(ctx, 0, 0, CARD_W, CARD_H, 34); ctx.clip();
      ctx.fillStyle = 'rgba(20, 16, 50, 0.55)';
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      ctx.restore();
      drawIcon(ctx, 1, 1, CARD_W / 2 - 55, 26, 110);
    }
    if (m.taunt) drawIcon(ctx, 2, 0, CARD_W / 2 - 55, CARD_H - 130, 110);  // shield
    if (m.silenced) {
      drawIcon(ctx, 5, 2, CARD_W / 2 - 55, CARD_H * 0.36, 110);            // muted
    }
    const base = baseStats.get(m.name) || {};
    const atkColor = (base.attack != null && m.attack > base.attack) ? '#7CFC8a' : '#fff';
    const hpColor = m.health < m.maxHealth ? '#ff6a5a'
      : (base.health != null && m.maxHealth > base.health) ? '#7CFC8a' : '#fff';
    drawGem(ctx, 64, CARD_H - 68, 56, ['#ffd76a', '#9a6a08'], m.attack, atkColor);
    drawGem(ctx, CARD_W - 64, CARD_H - 68, 56, ['#ff8a6a', '#a01808'], m.health, hpColor);
    minionCache.set(key, c);
    if (minionCache.size > 220) minionCache.delete(minionCache.keys().next().value); // bound the cache
    return c;
  }

  // --- card back (dark swirl frame, idx 2 of the frame sheet) --------------
  const backCanvas = (() => {
    const c = makeCanvas(CARD_W, CARD_H);
    const ctx = c.getContext('2d');
    ctx.save();
    roundRectPath(ctx, 0, 0, CARD_W, CARD_H, 34); ctx.clip();
    ctx.fillStyle = '#171225'; ctx.fillRect(0, 0, CARD_W, CARD_H);
    drawFrame(ctx, 2, 0, 0, CARD_W, CARD_H);
    ctx.fillStyle = 'rgba(20,14,38,0.78)';   // hide the empty text box: it's a back
    roundRectPath(ctx, CARD_W * 0.12, CARD_H * 0.52, CARD_W * 0.76, CARD_H * 0.40, 24);
    ctx.fill();
    ctx.font = 'bold 52px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(231,192,104,.8)';
    ctx.fillText('CHATSTONE', CARD_W / 2, CARD_H * 0.74);
    ctx.restore();
    return c;
  })();

  // --- hero plates ----------------------------------------------------------
  // hero-portraits.png 2x2: 0=pilot 1=crystal-AI 2=jester 3=vault-golem
  const HERO_NAMES = ['Meny, the Pilot', 'Codex Prime', 'Migras the Prophet', 'The Treasury'];
  const heroCache = new Map();
  function heroCanvas(portrait, name, hp, armor) {
    const key = [portrait, hp, armor].join('|');
    if (heroCache.has(key)) return heroCache.get(key);
    const S = 512;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    const cx = S / 2, cy = S * 0.44, r = S * 0.34;
    // portrait in a gold ring
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const qw = heroes.width / 2, qh = heroes.height / 2;
    const qx = (portrait % 2) * qw, qy = ((portrait / 2) | 0) * qh;
    ctx.drawImage(heroes, qx, qy, qw, qh, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.lineWidth = 14;
    const ring = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    ring.addColorStop(0, '#f5d98a'); ring.addColorStop(1, '#8a6418');
    ctx.strokeStyle = ring;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.beginPath(); ctx.arc(cx, cy, r + 9, 0, Math.PI * 2); ctx.stroke();
    // name banner
    ctx.font = 'bold 36px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(name, cx, S * 0.88);
    ctx.fillStyle = '#efe3c4'; ctx.fillText(name, cx, S * 0.88);
    // hp gem (bottom right of portrait), armor (bottom left) when present
    drawGem(ctx, cx + r * 0.82, cy + r * 0.82, 56, ['#ff8a6a', '#a01808'], hp, hp < 30 ? '#ffd2c8' : '#fff');
    if (armor > 0) drawGem(ctx, cx - r * 0.82, cy + r * 0.82, 50, ['#cfd8e8', '#5a6678'], armor, '#fff');
    heroCache.set(key, c);
    if (heroCache.size > 40) heroCache.delete(heroCache.keys().next().value);
    return c;
  }

  // --- board texture ---------------------------------------------------------
  const boardTexture = texFromCanvas((() => {
    const c = makeCanvas(board.width, board.height);
    c.getContext('2d').drawImage(board, 0, 0);
    return c;
  })());

  return {
    manifest, baseStats,
    HERO_NAMES,
    cardCanvas,
    minionCanvas,
    backCanvas,
    heroCanvas,
    boardTexture,
    texFromCanvas,
    needsTarget(name) { return TARGETS[name] || null; },
    dataURL(name) { return cardCanvas(name).toDataURL(); },
  };
}

// Which cards need a target when played, and what's legal.
// who: 'me' | 'op' | 'any'   what: 'minion' | 'any' (any = minions + heroes)
export const TARGETS = {
  'Ad Hominem':           { who: 'any', what: 'any' },
  'Ad Populum':           { who: 'any', what: 'minion' },
  'Self Improvement Arc': { who: 'me',  what: 'minion' },
  'Move the Goalposts':   { who: 'op',  what: 'minion' },
};
