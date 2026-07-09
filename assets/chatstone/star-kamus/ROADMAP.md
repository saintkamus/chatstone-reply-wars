# STAR KAMUS — 12-Stage Campaign Roadmap

Stages 1–4 are BUILT. Stages 5–12 are designed and slot into the existing
data-driven stage system (`STAGES[]` in main.js: timeline + view mode + boss
factory + two songs each). Each stage alternates or mixes the two view modes:
**side** (Gradius-style) and **top** (Star Force-style, planet surface).

| # | Stage | View | Setting | Boss | Gimmick |
|---|-------|------|---------|------|---------|
| 1 | Sector 7 Approach | side | open space | GORGON VORTEX (carrier) | core weak point ✅ |
| 2 | The Shattered Belt | side | asteroid belt | BASILISK REX (serpent) | head-only damage ✅ |
| 3 | The Gorgon's Maw | side | red nebula | MEDUSA PRIME (fortress) | shield pods first ✅ |
| 4 | Coming Home to Trouble | top | burning home city | HARVESTER TYRANT (crawler) | ground armor ✅ |
| 5 | Canyon Run | top | homeworld canyons | DRILLMAW (burrowing worm) | erupts from the ground at intervals; canyon walls constrain lateral movement ✅ |
| 6 | Orbital Junkyard | side | wrecked fleet graveyard | SCRAP COLOSSUS (junk golem) | reassembles itself once at 0 HP — two lives ✅ |
| 7 | The Velvet Passage | rail | warp-conduit highway | SIREN CHARIOT (Zeraa's warship) | THE BETRAYAL: Zeraa revealed as the Gorgon's spy; boss paces you Rez-style, cloaks via her "veil" ✅ |
| 8 | Nebula of Ghosts | side | glowing fog | MIRROR KAMUS (Gorgon replica) | mimics your movement on a delay, returns your own fire, cloak-flickers; built from Zeraa's files ✅ |
| 9 | Hive Descent | rail | plunging into the swarm hive | BROOD QUEEN | egg clusters hatch drones until popped; Queen lays live clutches mid-fight, lunges in phase 3; her death wipes every hatchling ✅ |
| 10 | The Vex Armada | side | fleet battle | CHROME FANG (Vex's flagship) | rolling broadside walls w/ moving gap; Argo support volleys; cruiser enemies; Zeraa turns sides at 50% boss HP ✅ |
| 11 | Palace Assault | top | Vex's obsidian palace | SERPENT THRONE (Vex's walker) | Zeraa opens the theater shield mid-stage; boss alternates exposed ranged stance and shielded charging stomp ✅ |
| 12 | Heart of the Gorgon | top→rail→side | the Gorgon core | VEX ETERNAL (3 forms) | Death-Star finale: overflight → core-shaft dive → heart chamber; exo-frame → shielded Eye → Gorgon Prime bullet-hell; Zeraa sacrifice grants her shield; full-cast curtain call over victory ✅ |

**THE CAMPAIGN IS COMPLETE — 12/12 STAGES.** Post-game ideas: stage select +
continues, difficulty settings, a boss-rush mode, score attack leaderboards,
and the Gradius-style power-up selection bar.

**View modes:** side (Gradius), top (Star Force), rail (chase-cam conduit — added with stage 7).
**Power chain:** weapon ×3 → orbital drones ×2 → one-hit shield → bonus points.
**New enemy tier (stage 7+, backfill into 8-12):** phantom (cloaker), lancer (paces you,
telegraphed lance volleys), splitter/mini. Older stages keep the classic roster.

## New systems worth adding along the way
- **Stage select / continue** (unlock stages as cleared; localStorage).
- **Bomb / special weapon** (limited screen-clear, classic shmup pressure valve).
- **Canyon walls** (stage 5): lateral kill-zones that force weaving.
- **Allied fire** (stage 10): scripted friendly volleys, pure spectacle.
- **New enemy types to spread across 5–12**: burrower (erupts under you),
  shield drone (projects a wall), kamikaze skiff, tentacle segment, decloaker.

## Voice lines
Each new stage wants ~4 lines (c_briefingN, k_stageN, c_warningN, k_bossN)
plus occasional specials — same pattern as stages 1–4. Admiral Vex should get
his own voice for stages 10–12 (`v_*` ids) — taunts over the radio, tying into
the short film's villain.

## Music
Each stage: one level theme + one boss theme in audio.js's note-array format.
Vex's leitmotif (the film villain) should appear in stages 10–12 themes.
