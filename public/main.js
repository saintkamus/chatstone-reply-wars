// main.js — boot, WebSocket protocol, lobby and HUD glue for Chatstone.
// The server (server.js) is authoritative; this file forwards intents from
// the 3D scene and mirrors every broadcast state into the scene + HUD.
import { loadArt } from './cards.js';
import { GameScene } from './scene.js';

const $ = id => document.getElementById(id);

/* ============================== tiny synth =============================== */
const sfx = (() => {
  let ctx = null;
  const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
  function tone(freq, dur, { type = 'triangle', vol = 0.18, slide = 0, delay = 0 } = {}) {
    const a = ac();
    const t0 = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const fx = {
    click:  () => tone(620, 0.06, { type: 'square', vol: 0.05 }),
    draw:   () => tone(330, 0.16, { slide: 290, vol: 0.10 }),
    play:   () => { tone(220, 0.18, { slide: 160, vol: 0.14 }); tone(440, 0.12, { delay: 0.06, vol: 0.08 }); },
    attack: () => tone(160, 0.22, { type: 'sawtooth', slide: -70, vol: 0.12 }),
    hit:    () => { tone(90, 0.18, { type: 'square', slide: -40, vol: 0.16 }); tone(55, 0.22, { type: 'sawtooth', slide: -20, vol: 0.12 }); },
    death:  () => tone(240, 0.5, { type: 'sawtooth', slide: -180, vol: 0.10 }),
    reveal: () => { tone(523, 0.18, { vol: 0.09 }); tone(784, 0.22, { delay: 0.09, vol: 0.09 }); },
    turn:   () => { tone(392, 0.16, { vol: 0.12 }); tone(587, 0.26, { delay: 0.12, vol: 0.12 }); },
    win:    () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, { delay: i * 0.13, vol: 0.14 })),
    lose:   () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, { delay: i * 0.16, type: 'sawtooth', vol: 0.10 })),
  };
  return name => { try { if (fx[name]) fx[name](); } catch (e) { /* audio blocked until first gesture */ } };
})();
window.addEventListener('pointerdown', () => sfx('boot'), { once: true });  // unlock audio context

/* ============================== boot ===================================== */
let scene = null;
let art = null;
let ws = null;
let lastTurnSeen = null;
let gameStarted = false;

const bus = {
  send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); },
  sfx,
  toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    t.style.animation = 'none';
    void t.offsetWidth;             // restart the CSS animation
    t.style.animation = '';
    sfx('click');
  },
  preview(name, minion) {
    const p = $('card-preview');
    if (!name) { p.classList.add('hidden'); return; }
    const canvas = minion ? art.minionCanvas(minion) : art.cardCanvas(name);
    $('card-preview-img').src = canvas.toDataURL();
    p.classList.remove('hidden');
  },
  reveal(name, label) {
    const r = $('reveal');
    $('reveal-img').src = art.cardCanvas(name).toDataURL();
    $('reveal-label').textContent = `${label} ${name}`;
    r.classList.remove('hidden');
    r.style.animation = 'none';
    void r.offsetWidth;
    r.style.animation = '';
  },
  targetHint(on) { $('target-hint').classList.toggle('hidden', !on); },
};

async function boot() {
  $('conn-status').textContent = 'loading assets…';
  art = await loadArt();
  scene = new GameScene($('game-canvas'), art, bus);
  window.__scene = scene;   // debug/testing handle
  connect();
}
boot().catch(err => {
  $('conn-status').textContent = 'failed to load: ' + err.message;
  console.error(err);
});

/* ============================== websocket ================================ */
function connect() {
  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  ws = new WebSocket(proto + location.host);
  ws.onopen = () => { $('conn-status').textContent = 'connected'; };
  ws.onclose = () => {
    $('conn-status').textContent = 'disconnected — refresh to reconnect';
    if (gameStarted) bus.toast('Connection lost — refresh the page');
  };
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    handle(m);
  };
}

function handle(m) {
  switch (m.type) {
    case 'room_created':
      showWait(m.code, 'Waiting for an opponent…');
      break;
    case 'joined':
      showWait(m.code, 'Joined! Ready when you are.');
      $('btn-start').classList.remove('hidden');
      break;
    case 'opponent_joined':
      $('lobby-status').textContent = 'Opponent joined! Ready when you are.';
      $('btn-start').classList.remove('hidden');
      sfx('reveal');
      break;
    case 'opponent_left':
      bus.toast('Your opponent left the game');
      $('lobby-status').textContent = 'Opponent left.';
      break;
    case 'error':
      if ($('lobby').classList.contains('hidden')) bus.toast(m.msg);
      else $('lobby-error').textContent = m.msg;
      break;
    case 'state':
      onState(m.state);
      break;
  }
}

function showWait(code, status) {
  $('lobby-main').classList.add('hidden');
  $('lobby-wait').classList.remove('hidden');
  $('room-code').textContent = code;
  $('lobby-status').textContent = status;
  $('lobby-error').textContent = '';
}

/* ============================== game state =============================== */
let gameoverTimer = null;
function onState(s) {
  if (!gameStarted) {
    gameStarted = true;
    $('lobby').classList.add('hidden');
    $('hud').classList.remove('hidden');
  }
  $('gameover').classList.add('hidden');
  clearTimeout(gameoverTimer);   // a fresh state cancels any pending overlay

  scene.applyState(s);
  updateHud(s);

  // turn banner on change (and on the very first state)
  if (s.turn !== lastTurnSeen && !s.over) {
    lastTurnSeen = s.turn;
    const mine = s.turn === s.seat;
    banner(mine ? 'YOUR TURN' : 'ENEMY TURN');
    if (mine) sfx('turn');
  }

  if (s.over) {
    const won = s.winner === s.seat;
    gameoverTimer = setTimeout(() => {
      const title = $('gameover-title');
      title.textContent = won ? 'VICTORY' : (s.winner === -1 ? 'DRAW' : 'DEFEAT');
      title.classList.toggle('defeat', !won && s.winner !== -1);
      $('gameover-sub').textContent = won
        ? 'Your replies were simply better.'
        : (s.winner === -1 ? 'Mutually assured deletion.' : 'You have been ratioed.');
      $('gameover').classList.remove('hidden');
      sfx(won ? 'win' : 'lose');
    }, 900);   // let the final FX play first
  }
}

function banner(text) {
  const b = $('turn-banner');
  b.textContent = text;
  b.classList.remove('hidden');
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
}

function updateHud(s) {
  $('my-deck').textContent = s.me.deck;
  $('op-deck').textContent = s.op.deck;
  $('op-hand').textContent = s.op.hand;
  $('op-mana').textContent = `${s.op.mana}/${s.op.maxMana}`;

  // my mana crystals
  const bar = $('mana-bar');
  bar.innerHTML = '';
  for (let i = 0; i < s.me.maxMana; i++) {
    const c = document.createElement('span');
    c.className = 'crystal' + (i < s.me.mana ? '' : ' spent');
    bar.appendChild(c);
  }
  const label = document.createElement('span');
  label.textContent = ` ${s.me.mana}/${s.me.maxMana}`;
  label.style.marginLeft = '6px';
  bar.appendChild(label);

  // battle log (scene keeps the merged full log)
  const lines = $('log-lines');
  const freshCount = scene.newLog ? scene.newLog.length : 0;
  lines.innerHTML = '';
  const log = scene.fullLog.slice(-60);
  log.forEach((entry, i) => {
    const d = document.createElement('div');
    d.textContent = entry;
    if (i >= log.length - freshCount) d.className = 'fresh';
    lines.appendChild(d);
  });
  lines.scrollTop = lines.scrollHeight;
}

/* ============================== lobby buttons ============================ */
$('btn-create').onclick = () => { bus.send({ type: 'create_room' }); sfx('click'); };
$('btn-join').onclick = () => {
  const code = $('join-code').value.trim().toUpperCase();
  if (code.length !== 4) { $('lobby-error').textContent = 'Enter the 4-letter room code'; return; }
  bus.send({ type: 'join_room', code });
  sfx('click');
};
$('join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-join').click(); });
$('btn-start').onclick = () => { bus.send({ type: 'start_game' }); sfx('click'); };
$('btn-again').onclick = () => {
  lastTurnSeen = null;
  bus.send({ type: 'start_game' });
  sfx('click');
};
