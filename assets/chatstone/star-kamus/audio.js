// STAR KAMUS - chiptune audio engine (WebAudio, 16-bit console flavor)
// Sequenced square/triangle leads over a light echo bus, noise-based drums.

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- song construction helpers ----------

// driving eighth-note bass line: root, root, +5th, root, root, +octave, +5th, root
function bassBar(start, root, pat) {
  const p = pat || [0, 0, 7, 0, 0, 12, 7, 0];
  const out = [];
  for (let i = 0; i < 8; i++) out.push([start + i * 0.5, root + p[i], 0.48]);
  return out;
}

// off-beat chord stabs (two-note dyads), classic shmup pulse
function stabBar(start, tones) {
  const out = [];
  for (const b of [0.5, 1.5, 2.5, 3.5])
    for (const t of tones) out.push([start + b, t, 0.22]);
  return out;
}

function drumBar(start, opts) {
  const o = opts || {};
  const out = [];
  for (const b of o.kick || [0, 2]) out.push([start + b, 'k']);
  for (const b of o.snare || [1, 3]) out.push([start + b, 's']);
  for (const b of o.hat || [0.5, 1.5, 2.5, 3.5]) out.push([start + b, 'h']);
  return out;
}

function bars(fn, roots) {
  let out = [];
  roots.forEach((r, i) => { out = out.concat(fn(i * 4, r)); });
  return out;
}

// ---------- LEVEL 1 THEME : "Vector Dawn" (A minor, 160bpm, 8 bars) ----------
const LEVEL_LEAD = [
  [0, 76, 1], [1, 72, .5], [1.5, 74, .5], [2, 76, 1], [3, 69, 1],
  [4, 74, .5], [4.5, 72, .5], [5, 69, 1], [6, 72, .5], [6.5, 74, .5], [7, 72, .5], [7.5, 69, .5],
  [8, 71, 1], [9, 74, 1], [10, 79, 1.5], [11.5, 74, .5],
  [12, 76, 1.5], [13.5, 72, .5], [14, 69, 2],
  [16, 81, .5], [16.5, 76, .5], [17, 81, .5], [17.5, 76, .5], [18, 79, 1], [19, 76, 1],
  [20, 77, 1], [21, 76, .5], [21.5, 74, .5], [22, 72, 1], [23, 74, 1],
  [24, 71, .5], [24.5, 74, .5], [25, 79, 1], [26, 77, .5], [26.5, 74, .5], [27, 71, 1],
  [28, 68, 1], [29, 71, 1], [30, 76, 2],
];
const LEVEL_ROOTS = [45, 41, 43, 45, 45, 41, 43, 40]; // Am F G Am Am F G E
const LEVEL_STABS = [[57, 60], [53, 57], [55, 59], [57, 60], [57, 60], [53, 57], [55, 59], [52, 56]];

const SONG_LEVEL = {
  bpm: 160, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.135, vib: 6, notes: LEVEL_LEAD },
    { wave: 'square', gain: 0.045, detune: 8, notes: LEVEL_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.30, notes: bars(bassBar, LEVEL_ROOTS) },
    { wave: 'square', gain: 0.035, notes: LEVEL_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i === 7 ? { kick: [0, 2, 3.5], snare: [1, 3, 3.75] } : null)).flat() },
  ],
};

// ---------- BOSS THEME : "Gorgon Vortex" (D minor + tritone, 174bpm, 4 bars) ----------
const BOSS_LEAD = [
  [0, 74, .5], [.5, 77, .5], [1, 76, .5], [1.5, 77, .5], [2, 74, 1], [3, 68, 1],
  [4, 69, .5], [4.5, 74, .5], [5, 72, .5], [5.5, 74, .5], [6, 69, 1], [7, 65, 1],
  [8, 77, .5], [8.5, 80, .5], [9, 79, .5], [9.5, 80, .5], [10, 77, 1], [11, 74, 1],
  [12, 76, .5], [12.5, 74, .5], [13, 71, .5], [13.5, 68, .5], [14, 64, 1], [15, 68, 1],
];
const BOSS_ROOTS = [38, 38, 41, 40];
const BOSS_BASS_PAT = [0, 0, 0, 6, 0, 0, 7, 6];
const BOSS_STABS = [[50, 53], [50, 53], [53, 57], [52, 56]];

const SONG_BOSS = {
  bpm: 174, beats: 16, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 9, notes: BOSS_LEAD },
    { wave: 'sawtooth', gain: 0.035, detune: 10, notes: BOSS_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.32, notes: bars((s, r) => bassBar(s, r, BOSS_BASS_PAT), BOSS_ROOTS) },
    { wave: 'square', gain: 0.04, notes: BOSS_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, 1.5, 2], snare: [1, 3], hat: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5],
      })).flat() },
  ],
};

// ---------- TITLE THEME : sparse arpeggio ----------
const SONG_TITLE = {
  bpm: 104, beats: 8, loop: true,
  tracks: [
    { wave: 'triangle', gain: 0.16, notes: [
      [0, 57, .5], [.5, 60, .5], [1, 64, .5], [1.5, 69, .5], [2, 72, .5], [2.5, 69, .5], [3, 64, .5], [3.5, 60, .5],
      [4, 55, .5], [4.5, 59, .5], [5, 62, .5], [5.5, 67, .5], [6, 71, .5], [6.5, 67, .5], [7, 62, .5], [7.5, 59, .5],
    ]},
    { wave: 'square', gain: 0.03, vib: 5, notes: [[0, 76, 3.5], [4, 74, 3.5]] },
  ],
};

const SONG_CLEAR = {
  bpm: 140, beats: 8, loop: false,
  tracks: [
    { wave: 'square', gain: 0.14, notes: [
      [0, 69, .25], [.25, 72, .25], [.5, 76, .25], [.75, 81, 1.5],
      [2.5, 79, .25], [2.75, 81, .25], [3, 84, 2.5],
    ]},
    { wave: 'triangle', gain: 0.26, notes: [[0, 45, 2], [2.5, 43, .5], [3, 45, 2.5]] },
    { wave: 'square', gain: 0.04, notes: [[3, 72, 2.5], [3, 76, 2.5]] },
  ],
};

const SONG_GAMEOVER = {
  bpm: 92, beats: 8, loop: false,
  tracks: [
    { wave: 'square', gain: 0.12, vib: 5, notes: [
      [0, 64, .75], [1, 62, .75], [2, 60, .75], [3, 57, 2.5],
    ]},
    { wave: 'triangle', gain: 0.26, notes: [[0, 48, 1], [1, 47, 1], [2, 45, 1], [3, 33, 3]] },
  ],
};

// ---------- LEVEL 2 THEME : "Belt Runner" (C minor, 168bpm, 8 bars) ----------
const LEVEL2_LEAD = [
  [0, 72, .5], [.5, 75, .5], [1, 79, 1], [2, 77, .5], [2.5, 75, .5], [3, 74, 1],
  [4, 75, 1], [5, 72, .5], [5.5, 68, .5], [6, 72, 2],
  [8, 74, .5], [8.5, 77, .5], [9, 82, 1], [10, 79, .5], [10.5, 77, .5], [11, 74, 1],
  [12, 75, .5], [12.5, 74, .5], [13, 72, 1], [14, 79, 2],
  [16, 84, .5], [16.5, 79, .5], [17, 84, .5], [17.5, 79, .5], [18, 82, 1], [19, 79, 1],
  [20, 80, 1], [21, 79, .5], [21.5, 77, .5], [22, 75, 1], [23, 77, 1],
  [24, 74, .5], [24.5, 77, .5], [25, 82, 1], [26, 80, .5], [26.5, 77, .5], [27, 74, 1],
  [28, 71, 1], [29, 74, 1], [30, 79, 2],
];
const LEVEL2_ROOTS = [36, 44, 46, 36, 36, 44, 46, 43]; // Cm Ab Bb Cm Cm Ab Bb G
const LEVEL2_STABS = [[60, 63], [56, 60], [58, 62], [60, 63], [60, 63], [56, 60], [58, 62], [55, 59]];

const SONG_LEVEL2 = {
  bpm: 168, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.135, vib: 6, notes: LEVEL2_LEAD },
    { wave: 'square', gain: 0.045, detune: 8, notes: LEVEL2_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.30, notes: bars(bassBar, LEVEL2_ROOTS) },
    { wave: 'square', gain: 0.035, notes: LEVEL2_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i === 7 ? { kick: [0, 2, 3.5], snare: [1, 3, 3.75] } : { kick: [0, 1.75, 2] })).flat() },
  ],
};

// ---------- BOSS 2 THEME : "Serpent Coil" (E phrygian, 178bpm, 4 bars) ----------
const BOSS2_LEAD = [
  [0, 76, .5], [.5, 79, .5], [1, 77, .5], [1.5, 79, .5], [2, 76, 1], [3, 71, 1],
  [4, 72, .5], [4.5, 76, .5], [5, 74, .5], [5.5, 76, .5], [6, 72, 1], [7, 67, 1],
  [8, 79, .5], [8.5, 83, .5], [9, 81, .5], [9.5, 83, .5], [10, 79, 1], [11, 77, 1],
  [12, 77, .5], [12.5, 76, .5], [13, 74, .5], [13.5, 72, .5], [14, 71, 1], [15, 77, 1],
];
const BOSS2_ROOTS = [40, 40, 41, 40]; // E E F E — phrygian menace
const BOSS2_BASS_PAT = [0, 0, 1, 0, 0, 12, 7, 1];
const BOSS2_STABS = [[52, 55], [52, 55], [53, 57], [52, 55]];

const SONG_BOSS2 = {
  bpm: 178, beats: 16, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 9, notes: BOSS2_LEAD },
    { wave: 'sawtooth', gain: 0.035, detune: 10, notes: BOSS2_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.32, notes: bars((s, r) => bassBar(s, r, BOSS2_BASS_PAT), BOSS2_ROOTS) },
    { wave: 'square', gain: 0.04, notes: BOSS2_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, 1.5, 2, 3.5], snare: [1, 3], hat: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5],
      })).flat() },
  ],
};

// ---------- LEVEL 3 THEME : "March on the Maw" (D minor, 172bpm, 8 bars) ----------
const LEVEL3_LEAD = [
  [0, 74, .5], [.5, 77, .5], [1, 74, .5], [1.5, 77, .5], [2, 79, 1], [3, 77, .5], [3.5, 76, .5],
  [4, 74, 1], [5, 72, .5], [5.5, 70, .5], [6, 74, 2],
  [8, 76, .5], [8.5, 79, .5], [9, 84, 1], [10, 81, .5], [10.5, 79, .5], [11, 76, 1],
  [12, 77, .5], [12.5, 76, .5], [13, 74, 1], [14, 69, 2],
  [16, 86, .5], [16.5, 81, .5], [17, 86, .5], [17.5, 81, .5], [18, 84, 1], [19, 81, 1],
  [20, 82, 1], [21, 81, .5], [21.5, 79, .5], [22, 77, 1], [23, 79, 1],
  [24, 81, .5], [24.5, 79, .5], [25, 77, .5], [25.5, 76, .5], [26, 73, 1], [27, 76, 1],
  [28, 74, .5], [28.5, 77, .5], [29, 81, .5], [29.5, 84, .5], [30, 86, 2],
];
const LEVEL3_ROOTS = [38, 46, 36, 38, 38, 43, 45, 38]; // Dm Bb C Dm Dm Gm A Dm
const LEVEL3_STABS = [[62, 65], [58, 62], [60, 64], [62, 65], [62, 65], [55, 58], [57, 61], [62, 65]];

const SONG_LEVEL3 = {
  bpm: 172, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.135, vib: 7, notes: LEVEL3_LEAD },
    { wave: 'square', gain: 0.05, detune: 9, notes: LEVEL3_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.30, notes: bars(bassBar, LEVEL3_ROOTS) },
    { wave: 'square', gain: 0.035, notes: LEVEL3_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i % 4 === 3 ? { kick: [0, 1.5, 2, 3.5], snare: [1, 3, 3.75] }
                    : { kick: [0, 1.5, 2] })).flat() },
  ],
};

// ---------- BOSS 3 THEME : "Medusa Prime" (C minor chromatic, 184bpm, 4 bars) ----------
const BOSS3_LEAD = [
  [0, 72, .5], [.5, 75, .5], [1, 73, .5], [1.5, 75, .5], [2, 72, 1], [3, 67, 1],
  [4, 68, .5], [4.5, 72, .5], [5, 70, .5], [5.5, 72, .5], [6, 68, 1], [7, 63, 1],
  [8, 75, .5], [8.5, 79, .5], [9, 77, .5], [9.5, 79, .5], [10, 75, 1], [11, 73, 1],
  [12, 73, .5], [12.5, 72, .5], [13, 70, .5], [13.5, 68, .5], [14, 67, 1], [15, 73, 1],
];
const BOSS3_ROOTS = [36, 36, 37, 36]; // C C Db C — half-step dread
const BOSS3_BASS_PAT = [0, 0, 0, 1, 0, 12, 7, 6];
const BOSS3_STABS = [[60, 63], [60, 63], [61, 65], [60, 63]];

const SONG_BOSS3 = {
  bpm: 184, beats: 16, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 10, notes: BOSS3_LEAD },
    { wave: 'sawtooth', gain: 0.04, detune: 11, notes: BOSS3_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.33, notes: bars((s, r) => bassBar(s, r, BOSS3_BASS_PAT), BOSS3_ROOTS) },
    { wave: 'square', gain: 0.04, notes: BOSS3_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, .75, 1.5, 2, 2.75], snare: [1, 3],
        hat: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5],
      })).flat() },
  ],
};

// ---------- LEVEL 4 THEME : "Homecoming Under Fire" (G minor, 164bpm, 8 bars) ----------
const LEVEL4_LEAD = [
  [0, 74, .5], [.5, 70, .5], [1, 74, .5], [1.5, 77, .5], [2, 79, 1], [3, 77, .5], [3.5, 74, .5],
  [4, 75, 1], [5, 74, .5], [5.5, 72, .5], [6, 70, 2],
  [8, 74, .5], [8.5, 77, .5], [9, 82, 1], [10, 79, .5], [10.5, 77, .5], [11, 74, 1],
  [12, 77, 1], [13, 75, .5], [13.5, 72, .5], [14, 69, 2],
  [16, 79, .5], [16.5, 82, .5], [17, 86, 1], [18, 84, .5], [18.5, 82, .5], [19, 79, 1],
  [20, 79, 1], [21, 77, .5], [21.5, 75, .5], [22, 74, 1], [23, 75, 1],
  [24, 77, .5], [24.5, 79, .5], [25, 81, 1], [26, 79, .5], [26.5, 77, .5], [27, 74, 1],
  [28, 74, 1], [29, 73, 1], [30, 78, 2],
];
const LEVEL4_ROOTS = [43, 39, 46, 41, 43, 39, 41, 38]; // Gm Eb Bb F Gm Eb F D
const LEVEL4_STABS = [[55, 58], [51, 55], [58, 62], [53, 57], [55, 58], [51, 55], [53, 57], [50, 54]];

const SONG_LEVEL4 = {
  bpm: 164, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.135, vib: 6, notes: LEVEL4_LEAD },
    { wave: 'square', gain: 0.05, detune: 8, notes: LEVEL4_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.30, notes: bars(bassBar, LEVEL4_ROOTS) },
    { wave: 'square', gain: 0.035, notes: LEVEL4_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i === 7 ? { kick: [0, 2, 3.5], snare: [1, 3, 3.75] } : null)).flat() },
  ],
};

// ---------- BOSS 4 THEME : "World Eater" (F minor stomp, 176bpm, 4 bars) ----------
const BOSS4_LEAD = [
  [0, 77, .5], [.5, 80, .5], [1, 79, .5], [1.5, 80, .5], [2, 77, 1], [3, 72, 1],
  [4, 73, .5], [4.5, 77, .5], [5, 75, .5], [5.5, 77, .5], [6, 73, 1], [7, 68, 1],
  [8, 80, .5], [8.5, 84, .5], [9, 82, .5], [9.5, 84, .5], [10, 80, 1], [11, 79, 1],
  [12, 79, .5], [12.5, 77, .5], [13, 75, .5], [13.5, 73, .5], [14, 72, 1], [15, 77, 1],
];
const BOSS4_ROOTS = [41, 41, 44, 41]; // F F Ab F
const BOSS4_BASS_PAT = [0, 0, 1, 0, 0, 7, 6, 1];
const BOSS4_STABS = [[53, 56], [53, 56], [56, 60], [53, 56]];

const SONG_BOSS4 = {
  bpm: 176, beats: 16, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 9, notes: BOSS4_LEAD },
    { wave: 'sawtooth', gain: 0.04, detune: 10, notes: BOSS4_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.33, notes: bars((s, r) => bassBar(s, r, BOSS4_BASS_PAT), BOSS4_ROOTS) },
    { wave: 'square', gain: 0.04, notes: BOSS4_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, 1, 2, 3], snare: [1, 3], // four-on-the-floor walker stomp
        hat: [.5, 1.5, 2.5, 3.5],
      })).flat() },
  ],
};

// ---------- LEVEL 5 THEME : "Canyon Run" (E minor, 170bpm, 8 bars) ----------
const LEVEL5_LEAD = [
  [0, 76, .5], [.5, 79, .5], [1, 76, .5], [1.5, 74, .5], [2, 76, 1], [3, 71, 1],
  [4, 72, .5], [4.5, 76, .5], [5, 79, 1], [6, 76, .5], [6.5, 72, .5], [7, 74, 1],
  [8, 74, .5], [8.5, 78, .5], [9, 81, 1], [10, 78, .5], [10.5, 74, .5], [11, 71, 1],
  [12, 76, 1.5], [13.5, 74, .5], [14, 76, 2],
  [16, 83, .5], [16.5, 79, .5], [17, 83, .5], [17.5, 79, .5], [18, 81, 1], [19, 79, 1],
  [20, 79, .5], [20.5, 76, .5], [21, 72, 1], [22, 76, .5], [22.5, 79, .5], [23, 84, 1],
  [24, 86, .5], [24.5, 83, .5], [25, 81, .5], [25.5, 78, .5], [26, 74, 1], [27, 78, 1],
  [28, 79, .5], [28.5, 78, .5], [29, 75, 1], [30, 76, 2],
];
const LEVEL5_ROOTS = [40, 36, 38, 40, 40, 36, 38, 47]; // Em C D Em Em C D B
const LEVEL5_STABS = [[55, 59], [52, 55], [54, 57], [55, 59], [55, 59], [52, 55], [54, 57], [59, 63]];

const SONG_LEVEL5 = {
  bpm: 170, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.135, vib: 6, notes: LEVEL5_LEAD },
    { wave: 'square', gain: 0.05, detune: 8, notes: LEVEL5_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.30, notes: bars(bassBar, LEVEL5_ROOTS) },
    { wave: 'square', gain: 0.035, notes: LEVEL5_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i === 3 || i === 7 ? { kick: [0, 1.75, 2, 3.5], snare: [1, 3, 3.75] } : null)).flat() },
  ],
};

// ---------- BOSS 5 THEME : "Drillmaw" (A phrygian, 180bpm, 4 bars) ----------
const BOSS5_LEAD = [
  [0, 81, .5], [.5, 84, .5], [1, 82, .5], [1.5, 84, .5], [2, 81, 1], [3, 76, 1],
  [4, 77, .5], [4.5, 81, .5], [5, 79, .5], [5.5, 81, .5], [6, 77, 1], [7, 72, 1],
  [8, 84, .5], [8.5, 88, .5], [9, 86, .5], [9.5, 88, .5], [10, 84, 1], [11, 82, 1],
  [12, 82, .5], [12.5, 81, .5], [13, 79, .5], [13.5, 77, .5], [14, 76, 1], [15, 82, 1],
];
const BOSS5_ROOTS = [45, 45, 46, 45]; // A A Bb A
const BOSS5_BASS_PAT = [0, 0, 1, 0, 0, 12, 7, 1];
const BOSS5_STABS = [[57, 60], [57, 60], [58, 62], [57, 60]];

const SONG_BOSS5 = {
  bpm: 180, beats: 16, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 9, notes: BOSS5_LEAD },
    { wave: 'sawtooth', gain: 0.04, detune: 10, notes: BOSS5_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.33, notes: bars((s, r) => bassBar(s, r, BOSS5_BASS_PAT), BOSS5_ROOTS) },
    { wave: 'square', gain: 0.04, notes: BOSS5_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, .75, 1.5, 2, 2.75], snare: [1, 3],
        hat: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5],
      })).flat() },
  ],
};

// ---------- LEVEL 6 THEME : "Junkyard Drift" (B minor, 166bpm, 8 bars) ----------
const LEVEL6_LEAD = [
  [0, 78, .5], [.5, 74, .5], [1, 78, .5], [1.5, 79, .5], [2, 81, 1], [3, 79, .5], [3.5, 78, .5],
  [4, 79, 1], [5, 78, .5], [5.5, 76, .5], [6, 74, 2],
  [8, 76, .5], [8.5, 79, .5], [9, 83, 1], [10, 81, .5], [10.5, 79, .5], [11, 76, 1],
  [12, 78, 1.5], [13.5, 76, .5], [14, 78, 2],
  [16, 86, .5], [16.5, 83, .5], [17, 86, .5], [17.5, 83, .5], [18, 85, 1], [19, 83, 1],
  [20, 79, 1], [21, 81, .5], [21.5, 79, .5], [22, 78, 1], [23, 76, 1],
  [24, 81, .5], [24.5, 79, .5], [25, 78, .5], [25.5, 76, .5], [26, 73, 1], [27, 76, 1],
  [28, 74, .5], [28.5, 73, .5], [29, 74, 1], [30, 78, 2],
];
const LEVEL6_ROOTS = [47, 43, 45, 47, 47, 43, 45, 42]; // Bm G A Bm Bm G A F#
const LEVEL6_STABS = [[59, 62], [55, 59], [57, 61], [59, 62], [59, 62], [55, 59], [57, 61], [54, 58]];

const SONG_LEVEL6 = {
  bpm: 166, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.135, vib: 6, notes: LEVEL6_LEAD },
    { wave: 'square', gain: 0.05, detune: 8, notes: LEVEL6_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.30, notes: bars(bassBar, LEVEL6_ROOTS) },
    { wave: 'square', gain: 0.035, notes: LEVEL6_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i % 2 === 1 ? { kick: [0, 1.75, 2], snare: [1, 3, 3.5] } : null)).flat() },
  ],
};

// ---------- BOSS 6 THEME : "Scrap Colossus" (D phrygian stomp, 172bpm, 4 bars) ----------
const BOSS6_LEAD = [
  [0, 74, .5], [.5, 77, .5], [1, 75, .5], [1.5, 77, .5], [2, 74, 1], [3, 69, 1],
  [4, 70, .5], [4.5, 74, .5], [5, 72, .5], [5.5, 74, .5], [6, 70, 1], [7, 65, 1],
  [8, 77, .5], [8.5, 81, .5], [9, 79, .5], [9.5, 81, .5], [10, 77, 1], [11, 75, 1],
  [12, 75, .5], [12.5, 74, .5], [13, 72, .5], [13.5, 70, .5], [14, 69, 1], [15, 75, 1],
];
const BOSS6_ROOTS = [38, 38, 39, 38]; // D D Eb D
const BOSS6_BASS_PAT = [0, 0, 1, 0, 0, 7, 6, 1];
const BOSS6_STABS = [[62, 65], [62, 65], [63, 67], [62, 65]];

const SONG_BOSS6 = {
  bpm: 172, beats: 16, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 9, notes: BOSS6_LEAD },
    { wave: 'sawtooth', gain: 0.04, detune: 10, notes: BOSS6_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.33, notes: bars((s, r) => bassBar(s, r, BOSS6_BASS_PAT), BOSS6_ROOTS) },
    { wave: 'square', gain: 0.04, notes: BOSS6_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, 1, 2, 3], snare: [1, 3], hat: [.5, 1.5, 2.5, 3.5],
      })).flat() },
  ],
};

// ---------- LEVEL 7 THEME : "The Velvet Passage" (C# minor, 174bpm, 8 bars) ----------
const LEVEL7_LEAD = [
  [0, 76, .5], [.5, 80, .5], [1, 76, .5], [1.5, 75, .5], [2, 76, 1], [3, 73, 1],
  [4, 81, .5], [4.5, 78, .5], [5, 76, 1], [6, 73, .5], [6.5, 76, .5], [7, 78, 1],
  [8, 78, .5], [8.5, 75, .5], [9, 71, 1], [10, 75, .5], [10.5, 78, .5], [11, 83, 1],
  [12, 80, 1.5], [13.5, 78, .5], [14, 76, 2],
  [16, 85, .5], [16.5, 80, .5], [17, 85, .5], [17.5, 80, .5], [18, 83, 1], [19, 80, 1],
  [20, 81, 1], [21, 80, .5], [21.5, 78, .5], [22, 76, 1], [23, 78, 1],
  [24, 78, .5], [24.5, 80, .5], [25, 83, 1], [26, 81, .5], [26.5, 78, .5], [27, 75, 1],
  [28, 75, .5], [28.5, 76, .5], [29, 78, 1], [30, 80, 2],
];
const LEVEL7_ROOTS = [37, 45, 47, 37, 37, 45, 47, 44]; // C#m A B C#m C#m A B G#
const LEVEL7_STABS = [[61, 64], [57, 61], [59, 63], [61, 64], [61, 64], [57, 61], [59, 63], [56, 60]];

const SONG_LEVEL7 = {
  bpm: 174, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.135, vib: 7, notes: LEVEL7_LEAD },
    { wave: 'square', gain: 0.05, detune: 9, notes: LEVEL7_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.30, notes: bars(bassBar, LEVEL7_ROOTS) },
    { wave: 'square', gain: 0.035, notes: LEVEL7_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i === 7 ? { kick: [0, 1.75, 2, 3.5], snare: [1, 3, 3.75] } : { kick: [0, 2, 2.5] })).flat() },
  ],
};

// ---------- BOSS 7 THEME : "Siren Chariot" (F# minor, 182bpm, 4 bars) ----------
const BOSS7_LEAD = [
  [0, 78, .5], [.5, 81, .5], [1, 80, .5], [1.5, 81, .5], [2, 78, 1], [3, 73, 1],
  [4, 74, .5], [4.5, 78, .5], [5, 76, .5], [5.5, 78, .5], [6, 74, 1], [7, 69, 1],
  [8, 81, .5], [8.5, 85, .5], [9, 83, .5], [9.5, 85, .5], [10, 81, 1], [11, 80, 1],
  [12, 80, .5], [12.5, 78, .5], [13, 76, .5], [13.5, 74, .5], [14, 73, 1], [15, 80, 1],
];
const BOSS7_ROOTS = [42, 42, 45, 44]; // F# F# A G#
const BOSS7_BASS_PAT = [0, 0, 7, 0, 0, 12, 7, 1];
const BOSS7_STABS = [[54, 57], [54, 57], [57, 61], [56, 60]];

const SONG_BOSS7 = {
  bpm: 182, beats: 16, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 10, notes: BOSS7_LEAD },
    { wave: 'sawtooth', gain: 0.04, detune: 11, notes: BOSS7_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.33, notes: bars((s, r) => bassBar(s, r, BOSS7_BASS_PAT), BOSS7_ROOTS) },
    { wave: 'square', gain: 0.04, notes: BOSS7_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, 1.5, 2, 3.5], snare: [1, 3],
        hat: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5],
      })).flat() },
  ],
};

// ---------- LEVEL 8 THEME : "Nebula of Ghosts" (E minor, 168bpm, 8 bars) ----------
const LEVEL8_LEAD = [
  [0, 76, .5], [.5, 79, .5], [1, 77, .5], [1.5, 79, .5], [2, 76, 1], [3, 71, 1],
  [4, 77, 1], [5, 76, .5], [5.5, 74, .5], [6, 72, 2],
  [8, 79, .5], [8.5, 83, .5], [9, 81, .5], [9.5, 83, .5], [10, 79, 1], [11, 77, 1],
  [12, 75, 1], [13, 76, .5], [13.5, 79, .5], [14, 76, 2],
  [16, 88, .5], [16.5, 83, .5], [17, 88, .5], [17.5, 83, .5], [18, 86, 1], [19, 83, 1],
  [20, 77, 1], [21, 79, .5], [21.5, 77, .5], [22, 76, 1], [23, 72, 1],
  [24, 79, .5], [24.5, 77, .5], [25, 76, .5], [25.5, 74, .5], [26, 71, 1], [27, 74, 1],
  [28, 75, .5], [28.5, 76, .5], [29, 75, 1], [30, 76, 2],
];
const LEVEL8_ROOTS = [40, 41, 40, 47, 40, 41, 43, 47]; // Em F Em B Em F G B
const LEVEL8_STABS = [[52, 55], [53, 57], [52, 55], [59, 63], [52, 55], [53, 57], [55, 59], [59, 63]];

const SONG_LEVEL8 = {
  bpm: 168, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.13, vib: 9, notes: LEVEL8_LEAD },
    { wave: 'square', gain: 0.05, detune: 10, notes: LEVEL8_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.30, notes: bars(bassBar, LEVEL8_ROOTS) },
    { wave: 'square', gain: 0.03, notes: LEVEL8_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i % 2 === 1 ? { kick: [0, 2.5], snare: [1, 3], hat: [.5, 1.5, 2.5, 3.25, 3.5] } : { kick: [0, 2.5] })).flat() },
  ],
};

// ---------- BOSS 8 THEME : "Mirror Match" ----------
// the stage 1 melody, played back WRONG — sawtooth, dark bass, too fast
const SONG_BOSS8 = {
  bpm: 176, beats: 16, loop: true,
  tracks: [
    { wave: 'sawtooth', gain: 0.115, vib: 12, notes: LEVEL_LEAD.filter(n => n[0] < 16) },
    { wave: 'square', gain: 0.05, detune: 12, notes: LEVEL_LEAD.filter(n => n[0] < 16).map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.33, notes: bars((s, r) => bassBar(s, r, [0, 0, 1, 0, 0, 12, 7, 6]), [45, 41, 43, 40]) },
    { wave: 'square', gain: 0.04, notes: [[57, 60], [53, 57], [55, 59], [52, 56]].map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, 1.5, 2, 3.5], snare: [1, 3], hat: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5],
      })).flat() },
  ],
};

// ---------- LEVEL 9 THEME : "Hive Descent" (G minor, 172bpm, 8 bars) ----------
const LEVEL9_LEAD = [
  [0, 79, .5], [.5, 82, .5], [1, 80, .5], [1.5, 82, .5], [2, 79, 1], [3, 74, 1],
  [4, 75, .5], [4.5, 79, .5], [5, 77, .5], [5.5, 79, .5], [6, 75, 1], [7, 70, 1],
  [8, 80, .5], [8.5, 79, .5], [9, 77, .5], [9.5, 75, .5], [10, 74, 1], [11, 77, 1],
  [12, 79, 1.5], [13.5, 77, .5], [14, 79, 2],
  [16, 86, .5], [16.5, 82, .5], [17, 86, .5], [17.5, 82, .5], [18, 84, 1], [19, 82, 1],
  [20, 80, 1], [21, 79, .5], [21.5, 77, .5], [22, 75, 1], [23, 72, 1],
  [24, 74, .5], [24.5, 77, .5], [25, 79, 1], [26, 80, .5], [26.5, 79, .5], [27, 75, 1],
  [28, 74, .5], [28.5, 75, .5], [29, 74, 1], [30, 79, 2],
];
const LEVEL9_ROOTS = [43, 43, 44, 43, 43, 41, 39, 43]; // Gm Gm Ab Gm Gm F Eb Gm
const LEVEL9_STABS = [[55, 58], [55, 58], [56, 60], [55, 58], [55, 58], [53, 57], [51, 55], [55, 58]];

const SONG_LEVEL9 = {
  bpm: 172, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.135, vib: 8, notes: LEVEL9_LEAD },
    { wave: 'square', gain: 0.05, detune: 9, notes: LEVEL9_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.31, notes: bars((s, r) => bassBar(s, r, [0, 0, 1, 0, 0, 12, 7, 1]), LEVEL9_ROOTS) },
    { wave: 'square', gain: 0.035, notes: LEVEL9_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        { kick: [0, 1.5, 2], snare: [1, 3], hat: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5] })).flat() },
  ],
};

// ---------- BOSS 9 THEME : "Brood Queen" (C minor skitter, 186bpm, 4 bars) ----------
const BOSS9_LEAD = [
  [0, 72, .5], [.5, 75, .5], [1, 73, .5], [1.5, 75, .5], [2, 72, 1], [3, 67, 1],
  [4, 79, .5], [4.5, 82, .5], [5, 80, .5], [5.5, 82, .5], [6, 79, 1], [7, 75, 1],
  [8, 73, .5], [8.5, 77, .5], [9, 75, .5], [9.5, 77, .5], [10, 73, 1], [11, 68, 1],
  [12, 75, .5], [12.5, 73, .5], [13, 72, .5], [13.5, 70, .5], [14, 67, 1], [15, 73, 1],
];
const BOSS9_ROOTS = [36, 39, 37, 36]; // C Eb Db C
const BOSS9_STABS = [[60, 63], [63, 67], [61, 65], [60, 63]];

const SONG_BOSS9 = {
  bpm: 186, beats: 16, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 11, notes: BOSS9_LEAD },
    { wave: 'sawtooth', gain: 0.04, detune: 12, notes: BOSS9_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.33, notes: bars((s, r) => bassBar(s, r, [0, 0, 1, 0, 0, 7, 6, 1]), BOSS9_ROOTS) },
    { wave: 'square', gain: 0.04, notes: BOSS9_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, .75, 1.5, 2, 2.75], snare: [1, 3],
        hat: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5],
      })).flat() },
  ],
};

// ---------- LEVEL 10 THEME : "March of the Argo" (D minor martial, 170bpm) ----------
const LEVEL10_LEAD = [
  [0, 74, .75], [.75, 74, .25], [1, 77, 1], [2, 74, .75], [2.75, 74, .25], [3, 81, 1],
  [4, 79, .5], [4.5, 77, .5], [5, 79, 1], [6, 74, 2],
  [8, 77, .75], [8.75, 77, .25], [9, 82, 1], [10, 81, .5], [10.5, 79, .5], [11, 77, 1],
  [12, 76, 1], [13, 73, .5], [13.5, 76, .5], [14, 81, 2],
  [16, 86, .75], [16.75, 86, .25], [17, 84, .5], [17.5, 82, .5], [18, 81, 1], [19, 79, 1],
  [20, 79, .75], [20.75, 79, .25], [21, 82, 1], [22, 79, .5], [22.5, 77, .5], [23, 74, 1],
  [24, 76, .5], [24.5, 79, .5], [25, 84, 1], [26, 84, .5], [26.5, 83, .5], [27, 79, 1],
  [28, 81, .75], [28.75, 79, .25], [29, 77, .5], [29.5, 76, .5], [30, 74, 2],
];
const LEVEL10_ROOTS = [38, 43, 46, 45, 38, 43, 36, 45]; // Dm Gm Bb A Dm Gm C A
const LEVEL10_STABS = [[62, 65], [55, 58], [58, 62], [57, 61], [62, 65], [55, 58], [60, 64], [57, 61]];

const SONG_LEVEL10 = {
  bpm: 170, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 6, notes: LEVEL10_LEAD },
    { wave: 'square', gain: 0.05, detune: 8, notes: LEVEL10_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.31, notes: bars(bassBar, LEVEL10_ROOTS) },
    { wave: 'square', gain: 0.04, notes: LEVEL10_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i === 7 ? { kick: [0, 2], snare: [1, 2.5, 3, 3.25, 3.5, 3.75] } // snare roll into the repeat
                : { kick: [0, 2], snare: [1, 2.5, 3] })).flat() },
  ],
};

// ---------- BOSS 10 THEME : "Chrome Fang" — Vex's leitmotif (E/Bb tritone, 176bpm) ----------
const BOSS10_LEAD = [
  [0, 76, 1], [1, 82, 1], [2, 76, .5], [2.5, 79, .5], [3, 82, 1],
  [4, 81, .5], [4.5, 79, .5], [5, 76, 1], [6, 74, .5], [6.5, 76, .5], [7, 70, 1],
  [8, 76, 1], [9, 82, 1], [10, 83, .5], [10.5, 82, .5], [11, 79, 1],
  [12, 78, .5], [12.5, 76, .5], [13, 74, .5], [13.5, 73, .5], [14, 76, 2],
];
const BOSS10_ROOTS = [40, 40, 46, 44]; // E E Bb G# — the tritone snarl
const BOSS10_STABS = [[52, 58], [52, 58], [58, 64], [56, 62]]; // E+Bb dyads

const SONG_BOSS10 = {
  bpm: 176, beats: 16, loop: true,
  tracks: [
    { wave: 'sawtooth', gain: 0.115, vib: 8, notes: BOSS10_LEAD },
    { wave: 'square', gain: 0.05, detune: 10, notes: BOSS10_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.34, notes: bars((s, r) => bassBar(s, r, [0, 0, 0, 6, 0, 0, 7, 6]), BOSS10_ROOTS) },
    { wave: 'square', gain: 0.045, notes: BOSS10_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, 1.5, 2], snare: [3], hat: [0, 1, 2, 3], // imperial half-time stomp
      })).flat() },
  ],
};

// ---------- LEVEL 11 THEME : "Obsidian Palace" (B minor march, 168bpm) ----------
const LEVEL11_LEAD = [
  [0, 83, .5], [.5, 84, .5], [1, 83, .5], [1.5, 81, .5], [2, 78, 1], [3, 74, 1],
  [4, 72, .5], [4.5, 76, .5], [5, 79, 1], [6, 78, .5], [6.5, 76, .5], [7, 74, 1],
  [8, 83, .75], [8.75, 83, .25], [9, 84, 1], [10, 83, .5], [10.5, 81, .5], [11, 78, 1],
  [12, 76, .5], [12.5, 78, .5], [13, 74, 1], [14, 71, 2],
  [16, 86, .5], [16.5, 83, .5], [17, 86, .5], [17.5, 83, .5], [18, 84, 1], [19, 81, 1],
  [20, 79, 1], [21, 81, .5], [21.5, 79, .5], [22, 78, 1], [23, 76, 1],
  [24, 78, .75], [24.75, 78, .25], [25, 81, 1], [26, 79, .5], [26.5, 78, .5], [27, 74, 1],
  [28, 72, .5], [28.5, 74, .5], [29, 76, 1], [30, 71, 2],
];
const LEVEL11_ROOTS = [47, 48, 47, 42, 47, 48, 45, 42]; // B C B F# B C A F#
const LEVEL11_STABS = [[59, 62], [60, 64], [59, 62], [54, 58], [59, 62], [60, 64], [57, 61], [54, 58]];

const SONG_LEVEL11 = {
  bpm: 168, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.135, vib: 7, notes: LEVEL11_LEAD },
    { wave: 'square', gain: 0.05, detune: 9, notes: LEVEL11_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.31, notes: bars((s, r) => bassBar(s, r, [0, 0, 1, 0, 0, 12, 7, 1]), LEVEL11_ROOTS) },
    { wave: 'square', gain: 0.04, notes: LEVEL11_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        { kick: [0, 2], snare: [1, 2.5, 3], hat: [.5, 1.5, 2.5, 3.5] })).flat() },
  ],
};

// ---------- BOSS 11 THEME : "Serpent Throne" (Vex's motif, heavier, 180bpm) ----------
const BOSS11_LEAD = [
  [0, 76, .5], [.5, 82, .5], [1, 76, .5], [1.5, 82, .5], [2, 79, 1], [3, 76, 1],
  [4, 74, .5], [4.5, 80, .5], [5, 74, .5], [5.5, 80, .5], [6, 77, 1], [7, 74, 1],
  [8, 76, 1], [9, 82, 1], [10, 84, .5], [10.5, 82, .5], [11, 79, 1],
  [12, 80, .5], [12.5, 79, .5], [13, 77, .5], [13.5, 76, .5], [14, 74, 1], [15, 70, 1],
];
const BOSS11_ROOTS = [40, 46, 40, 44]; // E Bb E G# — the tritone, now stomping
const BOSS11_STABS = [[52, 58], [58, 64], [52, 58], [56, 62]];

const SONG_BOSS11 = {
  bpm: 180, beats: 16, loop: true,
  tracks: [
    { wave: 'sawtooth', gain: 0.115, vib: 9, notes: BOSS11_LEAD },
    { wave: 'square', gain: 0.05, detune: 11, notes: BOSS11_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.34, notes: bars((s, r) => bassBar(s, r, [0, 0, 0, 6, 0, 0, 7, 6]), BOSS11_ROOTS) },
    { wave: 'square', gain: 0.045, notes: BOSS11_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, 1, 2, 3], snare: [1, 3], hat: [.5, 1.5, 2.5, 3.5],
      })).flat() },
  ],
};

// ---------- LEVEL 12 THEME : "Heart of the Gorgon" (C minor epic, 176bpm) ----------
const LEVEL12_LEAD = [
  [0, 79, .5], [.5, 84, .5], [1, 79, .5], [1.5, 84, .5], [2, 87, 1], [3, 84, 1],
  [4, 86, .5], [4.5, 84, .5], [5, 82, 1], [6, 79, .5], [6.5, 77, .5], [7, 75, 1],
  [8, 77, .75], [8.75, 77, .25], [9, 82, 1], [10, 80, .5], [10.5, 79, .5], [11, 75, 1],
  [12, 74, .5], [12.5, 75, .5], [13, 77, 1], [14, 79, 2],
  [16, 84, .75], [16.75, 84, .25], [17, 87, 1], [18, 86, .5], [18.5, 84, .5], [19, 82, 1],
  [20, 80, 1], [21, 82, .5], [21.5, 80, .5], [22, 79, 1], [23, 77, 1],
  [24, 75, .5], [24.5, 79, .5], [25, 82, 1], [26, 84, .5], [26.5, 82, .5], [27, 79, 1],
  [28, 77, .5], [28.5, 79, .5], [29, 83, 1], [30, 84, 2],
];
const LEVEL12_ROOTS = [36, 44, 46, 43, 36, 44, 39, 43]; // Cm Ab Bb G Cm Ab Eb G
const LEVEL12_STABS = [[60, 63], [56, 60], [58, 62], [55, 59], [60, 63], [56, 60], [51, 55], [55, 59]];

const SONG_LEVEL12 = {
  bpm: 176, beats: 32, loop: true,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 7, notes: LEVEL12_LEAD },
    { wave: 'square', gain: 0.055, detune: 9, notes: LEVEL12_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'triangle', gain: 0.31, notes: bars((s, r) => bassBar(s, r, [0, 0, 1, 0, 0, 12, 7, 1]), LEVEL12_ROOTS) },
    { wave: 'square', gain: 0.04, notes: LEVEL12_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3, 4, 5, 6, 7].map(i => drumBar(i * 4,
        i === 7 ? { kick: [0, 1.5, 2, 3.5], snare: [1, 3, 3.5, 3.75] }
                : { kick: [0, 1.5, 2], snare: [1, 3] })).flat() },
  ],
};

// ---------- BOSS 12 THEME : "Vex Eternal" (the tritone unleashed, 188bpm) ----------
const BOSS12_LEAD = [
  [0, 76, .5], [.5, 82, .5], [1, 76, .5], [1.5, 82, .5], [2, 88, 1], [3, 82, 1],
  [4, 86, .5], [4.5, 84, .5], [5, 82, .5], [5.5, 80, .5], [6, 82, 1], [7, 76, 1],
  [8, 88, .5], [8.5, 87, .5], [9, 86, .5], [9.5, 84, .5], [10, 82, 1], [11, 79, 1],
  [12, 80, .5], [12.5, 82, .5], [13, 84, .5], [13.5, 86, .5], [14, 88, 2],
];
const BOSS12_ROOTS = [40, 46, 44, 46]; // E Bb G# Bb
const BOSS12_STABS = [[52, 58], [58, 64], [56, 62], [58, 64]];

const SONG_BOSS12 = {
  bpm: 188, beats: 16, loop: true,
  tracks: [
    { wave: 'sawtooth', gain: 0.115, vib: 10, notes: BOSS12_LEAD },
    { wave: 'square', gain: 0.06, detune: 12, notes: BOSS12_LEAD.map(n => [n[0], n[1] - 12, n[2]]) },
    { wave: 'square', gain: 0.03, detune: -8, notes: BOSS12_LEAD.map(n => [n[0], n[1] + 12, n[2]]) },
    { wave: 'triangle', gain: 0.34, notes: bars((s, r) => bassBar(s, r, [0, 0, 0, 6, 0, 0, 7, 6]), BOSS12_ROOTS) },
    { wave: 'square', gain: 0.045, notes: BOSS12_STABS.map((t, i) => stabBar(i * 4, t)).flat() },
    { drums: true, notes: [0, 1, 2, 3].map(i => drumBar(i * 4, {
        kick: [0, .75, 1.5, 2, 2.75, 3.5], snare: [1, 3],
        hat: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5],
      })).flat() },
  ],
};

// ---------- VICTORY FANFARE ----------
const SONG_VICTORY = {
  bpm: 132, beats: 12, loop: false,
  tracks: [
    { wave: 'square', gain: 0.14, vib: 5, notes: [
      [0, 69, .33], [.33, 73, .33], [.66, 76, .33], [1, 81, 1.5],
      [3, 79, .5], [3.5, 81, .5], [4, 83, 1.5],
      [6, 84, .5], [6.5, 83, .5], [7, 81, 1], [8, 85, 3.5],
    ]},
    { wave: 'square', gain: 0.05, notes: [[8, 76, 3.5], [8, 81, 3.5]] },
    { wave: 'triangle', gain: 0.28, notes: [
      [0, 45, 1], [1, 45, 1], [2, 50, 1], [3, 50, 1],
      [4, 52, 2], [6, 50, 1], [7, 52, 1], [8, 45, 3.5],
    ]},
    { drums: true, notes: [
      [0, 'k'], [1, 's'], [2, 'k'], [3, 's'], [4, 'k'], [5, 's'],
      [6, 'k'], [6.5, 'k'], [7, 's'], [7.5, 's'], [8, 'k'],
      [.5, 'h'], [1.5, 'h'], [2.5, 'h'], [3.5, 'h'], [4.5, 'h'], [5.5, 'h'],
    ]},
  ],
};

const SONGS = {
  level: SONG_LEVEL, boss: SONG_BOSS, title: SONG_TITLE,
  clear: SONG_CLEAR, gameover: SONG_GAMEOVER,
  level2: SONG_LEVEL2, boss2: SONG_BOSS2, victory: SONG_VICTORY,
  level3: SONG_LEVEL3, boss3: SONG_BOSS3,
  level4: SONG_LEVEL4, boss4: SONG_BOSS4,
  level5: SONG_LEVEL5, boss5: SONG_BOSS5,
  level6: SONG_LEVEL6, boss6: SONG_BOSS6,
  level7: SONG_LEVEL7, boss7: SONG_BOSS7,
  level8: SONG_LEVEL8, boss8: SONG_BOSS8,
  level9: SONG_LEVEL9, boss9: SONG_BOSS9,
  level10: SONG_LEVEL10, boss10: SONG_BOSS10,
  level11: SONG_LEVEL11, boss11: SONG_BOSS11,
  level12: SONG_LEVEL12, boss12: SONG_BOSS12,
};

// ---------- engine ----------

export class ChipAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.song = null;
    this.timer = null;
    this.live = new Set();
    this.voiceRaw = new Map();   // id -> ArrayBuffer (fetched, not yet decoded)
    this.voiceBuf = new Map();   // id -> AudioBuffer
    this.activeVoices = 0;
    this.voiceSources = new Set();
  }

  init() {
    if (this.ready) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;

    this.master = c.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(c.destination);

    // light echo bus for that 16-bit console reverb feel
    this.echo = c.createDelay(0.5);
    this.echo.delayTime.value = 0.27;
    const fb = c.createGain(); fb.gain.value = 0.28;
    const damp = c.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2600;
    this.echo.connect(damp); damp.connect(fb); fb.connect(this.echo);
    const echoOut = c.createGain(); echoOut.gain.value = 0.35;
    damp.connect(echoOut); echoOut.connect(this.master);

    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.9;
    this.musicBus.connect(this.master); this.musicBus.connect(this.echo);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    // voice comms bus: band-passed for a cockpit-radio feel
    this.voiceBus = c.createGain(); this.voiceBus.gain.value = 1.0;
    const vhp = c.createBiquadFilter(); vhp.type = 'highpass'; vhp.frequency.value = 260;
    const vlp = c.createBiquadFilter(); vlp.type = 'lowpass'; vlp.frequency.value = 3600;
    this.voiceBus.connect(vhp); vhp.connect(vlp); vlp.connect(this.master);

    // shared noise buffer for drums / explosions
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.ready = true;
    this._decodeVoices();
  }

  // ----- voice comms -----
  // Tries id.mp3 / .wav / .m4a / .ogg under `base`; missing files are simply skipped
  // (the game falls back to text-only comms with blips).
  async fetchVoices(base, ids) {
    const exts = ['mp3', 'wav', 'm4a', 'ogg'];
    await Promise.all(ids.map(async (id) => {
      for (const ext of exts) {
        try {
          const r = await fetch(base + id + '.' + ext);
          if (r.ok) { this.voiceRaw.set(id, await r.arrayBuffer()); return; }
        } catch (e) { /* offline or missing: text-only fallback */ }
      }
    }));
    if (this.ready) this._decodeVoices();
  }

  _decodeVoices() {
    for (const [id, raw] of this.voiceRaw) {
      if (this.voiceBuf.has(id)) continue;
      this.ctx.decodeAudioData(raw.slice(0),
        (buf) => this.voiceBuf.set(id, buf), () => {});
    }
  }

  hasVoice(id) { return this.voiceBuf.has(id); }

  // plays a loaded voice line, ducking the music; returns duration (0 if unavailable)
  playVoice(id) {
    if (!this.ready) return 0;
    const buf = this.voiceBuf.get(id);
    if (!buf) return 0;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(this.voiceBus);
    this.activeVoices++;
    this.voiceSources.add(src);
    this.musicBus.gain.setTargetAtTime(0.32, t, 0.06);
    src.onended = () => {
      this.voiceSources.delete(src);
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      if (this.activeVoices === 0)
        this.musicBus.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.18);
    };
    src.start(t);
    return buf.duration;
  }

  // hard-stop any in-flight voice lines (used when leaving a run for the menu)
  stopVoices() {
    if (!this.ready) return;
    for (const src of [...this.voiceSources]) {
      try { src.stop(); } catch (e) {}
    }
  }

  // radio squelch "krrsht" when a comm channel opens
  radio() {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2100; f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    s.start(t, Math.random()); s.stop(t + 0.13);
    this._blip(1400, 900, 0.05, 'square', 0.03);
  }

  // per-character text blip for comms without a voice file
  talk(baseHz) {
    this._blip(baseHz + Math.random() * 70, baseHz * 0.8, 0.035, 'square', 0.03);
  }

  resume() { if (this.ready && this.ctx.state !== 'running') this.ctx.resume(); }
  suspend() { if (this.ready && this.ctx.state === 'running') this.ctx.suspend(); }

  _track(node) {
    this.live.add(node);
    node.onended = () => this.live.delete(node);
  }

  // ----- sequencer: schedules one full loop pass at a time -----
  playSong(name) {
    if (!this.ready) return;
    this.stopSong();
    const song = SONGS[name];
    if (!song) return;
    this.song = song;
    let loopStart = this.ctx.currentTime + 0.06;
    const dur = song.beats * 60 / song.bpm;
    this._scheduleLoop(song, loopStart);
    if (song.loop) {
      this.timer = setInterval(() => {
        if (this.ctx.currentTime > loopStart + dur - 0.6) {
          loopStart += dur;
          this._scheduleLoop(song, loopStart);
        }
      }, 200);
    }
  }

  stopSong() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.song = null;
    const now = this.ctx ? this.ctx.currentTime : 0;
    for (const n of this.live) { try { n.stop(now); } catch (e) {} }
    this.live.clear();
  }

  _scheduleLoop(song, t0) {
    const spb = 60 / song.bpm;
    for (const tr of song.tracks) {
      if (tr.drums) {
        for (const [b, kind] of tr.notes) this._drum(kind, t0 + b * spb);
      } else {
        for (const [b, midi, len] of tr.notes)
          this._note(tr, midi, t0 + b * spb, Math.max(0.08, len * spb));
      }
    }
  }

  _note(tr, midi, t, dur) {
    const c = this.ctx;
    const osc = c.createOscillator();
    osc.type = tr.wave;
    osc.frequency.value = midiHz(midi);
    if (tr.detune) osc.detune.value = tr.detune;
    if (tr.vib) {
      const lfo = c.createOscillator(); lfo.frequency.value = 5.6;
      const lg = c.createGain(); lg.gain.value = tr.vib;
      lfo.connect(lg); lg.connect(osc.detune);
      lfo.start(t + 0.09); lfo.stop(t + dur + 0.1);
      this._track(lfo);
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(tr.gain, t + 0.008);
    g.gain.setValueAtTime(tr.gain, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.musicBus);
    osc.start(t); osc.stop(t + dur + 0.05);
    this._track(osc);
  }

  _drum(kind, t) {
    const c = this.ctx;
    if (kind === 'k') {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.11);
      const g = c.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g); g.connect(this.musicBus);
      o.start(t); o.stop(t + 0.14); this._track(o);
    } else if (kind === 's') {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
      const g = c.createGain();
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      s.connect(f); f.connect(g); g.connect(this.musicBus);
      s.start(t, Math.random()); s.stop(t + 0.12); this._track(s);
    } else {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7200;
      const g = c.createGain();
      g.gain.setValueAtTime(0.10, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      s.connect(f); f.connect(g); g.connect(this.musicBus);
      s.start(t, Math.random()); s.stop(t + 0.04); this._track(s);
    }
  }

  // ----- SFX -----
  _blip(startHz, endHz, dur, wave, gain) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = wave;
    o.frequency.setValueAtTime(startHz, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _boom(dur, gain, filterHz) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(filterHz, t);
    f.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    s.start(t, Math.random()); s.stop(t + dur + 0.02);
    // low thump
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(30, t + dur * 0.8);
    const og = c.createGain();
    og.gain.setValueAtTime(gain * 0.9, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.8);
    o.connect(og); og.connect(this.sfxBus);
    o.start(t); o.stop(t + dur);
  }

  shoot()      { this._blip(880, 240, 0.08, 'square', 0.07); }
  enemyShoot() { this._blip(300, 160, 0.09, 'square', 0.04); }
  hit()        { this._blip(220, 90, 0.07, 'sawtooth', 0.09); }
  explode()    { this._boom(0.35, 0.30, 3200); }
  bigExplode() { this._boom(0.9, 0.5, 2400); }
  playerHit()  { this._boom(0.6, 0.45, 3600); this._blip(600, 60, 0.4, 'sawtooth', 0.12); }
  powerup() {
    if (!this.ready) return;
    const seq = [72, 76, 79, 84];
    seq.forEach((m, i) => {
      const c = this.ctx, t = c.currentTime + i * 0.07;
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = midiHz(m);
      const g = c.createGain();
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.13);
    });
  }
  siren() {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    const g = c.createGain(); g.gain.value = 0.06;
    for (let i = 0; i < 6; i++) {
      o.frequency.setValueAtTime(240, t + i * 0.5);
      o.frequency.linearRampToValueAtTime(620, t + i * 0.5 + 0.42);
    }
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 3);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 3);
  }
}
