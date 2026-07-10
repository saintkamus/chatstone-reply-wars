STAR KAMUS — voice comm assets
==============================
Drop generated voice lines in THIS folder. The game auto-detects them at load;
any missing file just falls back to text-only comms with retro blips.

Accepted formats (checked in this order): .mp3  .wav  .m4a  .ogg
Record CLEAN voice — the game applies the cockpit-radio bandpass filter itself.

KAMUS (the pilot — your voice)          COMMANDER (mothership voice)
------------------------------          ----------------------------
k_launch    stage 1 launch line         c_briefing1  stage 1 mission briefing
k_boss1     reaction to boss 1          c_heavy      heavy gunship warning
k_clear1    stage 1 cleared             c_warning1   boss 1 inbound warning
k_stage2    stage 2 acknowledgment      c_briefing2  stage 2 briefing
k_boss2     reaction to boss 2          c_mines      minefield warning
k_victory   stage 2 cleared (basilisk)  c_warning2   boss 2 inbound warning
k_hit       shot down / ejecting        c_lastlife   last reserve ship warning
k_respawn   back in a new ship          c_gameover   pilot lost (game over)
k_power     weapon power-up             c_victory    final victory praise

STAGE 3:
k_stage3    stage 3 acknowledgment      c_briefing3  stage 3 twist briefing
k_boss3     reaction to fortress boss   z_swarm      ZERAA: swarm intel (was c_swarm)
k_final     stage 3 cleared (checkmate) c_warning3   boss 3 inbound warning
                                        c_pods       shield generators down

STAGE 4 (top-down, the homeworld):
k_stage4    "now it's personal"         c_briefing4  homeworld-under-attack twist
k_boss4     reaction to the World Eater c_armor      ground armor warning
k_home      final victory line          c_warning4   boss 4 inbound warning

STAGE 5 (top-down, canyon run):
k_clear4    stage 4 cleared (pursuit)   c_briefing5  canyon chase briefing
k_stage5    cocky canyon quip           d_burrow     KLORP: "under the sand" (was c_burrow)
k_boss5     reaction to the Drillmaw    c_warning5   boss 5 inbound warning

STAGE 6 (side view, orbital junkyard):
k_clear5    stage 5 cleared (plea)      c_briefing6  junkyard briefing
k_stage6    "hallowed ground"           c_warning6   boss 6 inbound (wrecks assembling)
k_boss6     reaction to the Colossus    n_junk       NOVA: junkyard warning
k_scrap     boss reassembles quip

STAGE 7 (rail view, the betrayal):
k_clear6    stage 6 cleared (fumes)     c_briefing7  suspicious briefing
k_stage7    "what could go wrong"       c_rage       furious "punch through" order
k_betray    reaction to the betrayal    c_warning7   Zeraa's ship inbound
k_survive   victory (she got away)      z_passage    ZERAA: the honey-trap offer
n_orbital   NOVA: orbital drones live   z_betray     ZERAA: the reveal
v_gloat     VEX: gloating               z_boss       ZERAA: boss entrance
                                        z_flee       ZERAA: fleeing, first doubt
NOTE: k_home is RESERVED for the true campaign finale (stage 12 homecoming).

STAGE 8 (side view, ghost nebula):
k_clear7    stage 7 cleared (hollow)    c_steel      commander's cold resolve
k_stage8    "love it, going in"         c_briefing8  dead-zone briefing
k_boss8     reaction to Mirror Kamus    c_warning8   "it's YOUR ship. Twice."
d_ghost     KLORP: trust your eyes      z_watch      ZERAA: "the original is better"

STAGE 9 (rail view, the brood-hive):
k_clear8    stage 8 cleared (the nest)  c_map        "we mapped their brood-hive"
k_stage9    "feed my sock"              c_briefing9  burn-it-out briefing
k_boss9     reaction to the Queen       c_warning9   "the QUEEN is coming to meet you"
d_hive      KLORP: pop the eggs         v_fury       VEX: "those are my CHILDREN"

STAGE 10 (side view, fleet battle):
k_clear9    stage 9 cleared (just HIM)  c_briefing10 "the Argo is done hiding"
k_stage10   "let's dance"               c_warning10  the CHROME FANG warning
k_boss10    "cathedral with engines"    n_argo       NOVA: broadside callout
v_taunt10   VEX: "come DIE at scale"    v_boss10     VEX: "alone at last"
v_shock     VEX: "TRAITOR!"             z_assist     ZERAA: "missed me, darling?"
v_flee      VEX: "one of my bodies"     z_side       ZERAA: "my resignation"

STAGE 11 (top-down, palace assault):
k_clear10   stage 10 cleared            c_briefing11 palace defenses briefing
k_stage11   "knock knock, housecall"    c_shield     "we can't crack the shield—"
k_boss11    "a giant walking CHAIR"     z_gate       ZERAA: opens the palace gate
v_palace    VEX: "MY soil"              c_warning11  "the throne room came to YOU"
v_boss11    VEX: "BEHOLD" (mech)        v_defeat     VEX: "watch me become ETERNAL"

FINAL STAGE (top-down -> rail -> side, the Gorgon core):
k_clear11   stage 11 cleared            c_briefing12 the final briefing
k_stage12   "let's write the ending"    c_dive       "DIVE, straight down its throat"
k_core      "it's looking at me"        c_warning12  "all of us. GO."
k_rage      grief into fury             v_eternal    VEX: "kneel before VEX ETERNAL"
z_sacrifice ZERAA: takes the hit        v_form2      VEX: "BEHOLD THE EYE"
z_alive     ZERAA: "see you at dinner"  v_end        VEX: dying, almost human
v_post      VEX: post-credits stinger ("eternal means... patient")
(k_home — already recorded — plays in the victory curtain call)

All missing-line scripts (wording + emotion directions) live in
tools/voice-lines.json — same prompt format you already use with Seed Audio 1.0.

SUPPORTING CAST (short-film characters — id prefix = voice):
n_ = NOVA VASQUEZ    n_shield   first shield pickup quip
z_ = AMB. ZERAA      z_swarm    stage 3 swarm intel
d_ = DR. KLORP       d_burrow   stage 5 seismic warning
v_ = ADMIRAL VEX     v_taunt1   taunt after boss 1 falls
Portraits: drop assets/portraits/nova.png, zeraa.png, klorp.png, vex.png
(same specs as kamus/commander; pixel fallbacks used until then).

Example: k_launch.mp3, c_briefing1.mp3, ...
NOTE: watch for trailing spaces in filenames ("c_briefing1 .wav" won't load).
Exact scripts (wording + emotion directions) are in the chat / project notes.
