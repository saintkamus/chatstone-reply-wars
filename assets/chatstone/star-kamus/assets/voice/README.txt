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
k_victory   final boss destroyed        c_warning2   boss 2 inbound warning
k_hit       shot down / ejecting        c_lastlife   last reserve ship warning
k_respawn   back in a new ship          c_gameover   pilot lost (game over)
k_power     weapon power-up             c_victory    mission complete praise

Example: k_launch.mp3, c_briefing1.mp3, ...
Exact scripts (wording + emotion directions) are in the chat / project notes.
