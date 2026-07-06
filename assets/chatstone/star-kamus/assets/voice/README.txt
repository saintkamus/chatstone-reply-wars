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
k_boss3     reaction to fortress boss   c_swarm      mid-stage swarm warning
k_final     stage 3 cleared (checkmate) c_warning3   boss 3 inbound warning
                                        c_pods       shield generators down

STAGE 4 (top-down, the homeworld):
k_stage4    "now it's personal"         c_briefing4  homeworld-under-attack twist
k_boss4     reaction to the World Eater c_armor      ground armor warning
k_home      final victory line          c_warning4   boss 4 inbound warning

Example: k_launch.mp3, c_briefing1.mp3, ...
NOTE: watch for trailing spaces in filenames ("c_briefing1 .wav" won't load).
Exact scripts (wording + emotion directions) are in the chat / project notes.
