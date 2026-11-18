# Solmar Streets — round 3 for make.fun gta6-01 "Make GTA 6"

Bounty: gta6-01 "Make GTA 6", $1,666 in USDC, entries close 24 Nov 2026 22:00 WIB
(15:00 UTC), result due 10 Dec 2026. Account @ugm, payout wallet
HuTKhpksoA17CPMKZYDA6QQcetezv4wmLWqsJ234vU9K. Repo:
https://github.com/aufaakmalbunaya/solmar-streets, local copy
~/workspace/makefun/gta6-01-game. Build to WIN: the AI judge ranks entries
head-to-head on the dossier plus a contact sheet of the screenshots, so
completeness and visible polish in the screenshots matter most.

## What round 2 left us

Round 2 (commit ec4091d, submission 01a1eaec) is SCORED with judge win rate
97.9975%, rank #3563 of 4,510. The top entry is at 99.3343%. The gap to the
top 100 is large, so round 3 must add real, judge-visible completeness, not
polish alone. What the top entries have that Solmar Streets lacks: 7-12 story
missions, 5-star police with helicopter chases and roadblocks, car radio,
shops/safehouses/garages, multiple weapons, NOS boost, car theft,
16 districts, chase camera. Solmar Streets already has a 5-mission story, a
save system, and a day/night cycle.

## The game as it stands (after round 3)

Solmar Streets is a 3D open-world crime game in a procedural coastal city,
built on three.js (vendored under game/vendor/, no network requests, static
files only, keyboard + mouse). Jax Moreno returns to Solmar in debt to Mama
Rosa and works eight story jobs for her: First Errand (meet her at Café
Solmar), Hot Wheels (steal a yellow coupe, deliver it to the east garage),
Lobo Trouble (take out 3 Lobos at the docks), The Getaway (grab a package at
the marina, lose the police, deliver it), Voss's Trap (defeat 6 Lobos on the
pier), The Stash (recover Rosa's money at the docks, lose the heat, bring it
home), Harbor Heat (clear 4 Lobos from the marina), and The Voss File (a
timed 75-second run to the pier at 3 stars). The city has a road grid,
traffic and pedestrians, cars to steal, a 5-star wanted system with pursuit
cars, officers on foot, roadblocks from 3 stars and a police helicopter with
a searchlight from 4 stars, pistol/SMG/shotgun combat (SMG after job 3,
shotgun after job 6, keys 1/2/3), an NOS boost (hold Shift while driving),
a three-station synthesised car radio (Q cycles SOLMAR FM, LOBOS ROCK,
MARINA NIGHTS), a HUD with health, cash, wanted stars, weapon, radio, NOS
gauge, mission objective, speedometer and a live minimap (with helicopter
and roadblock blips), a day/night cycle with a HUD clock, synthesised sound
and music, a start screen, and a localStorage save with autosave.

Entry shape at the repo root: main.ts (Node 22, standard library only) copies
game/ and screenshots/ to /output and writes /output/dossier.json with
buildDossier from vendor/makefun-game.ts. serve.ts serves game/ on
http://localhost:8080 for playtesting. shots.json lists the four staged
screenshots; game/src/shots.js stages them deterministically from a seed:
1-start.jpg (title over the city), 2-drive.jpg (driving through traffic),
3-chase.jpg (4-star chase: pursuit cars, roadblock, helicopter, radio, NOS),
4-mission.jpg (job 7 marina shootout, SMG in hand).

Hard caps: at most 4 screenshots, each at most 256 KiB, long side at most
1280, short side at least 480; game/ at most 993 files and 48 MiB; main.ts
must finish within 10 s on 1 CPU / 1 GB and be deterministic over two runs.
Verify with MAKEFUN_OUTPUT_DIR=out node main.ts run twice and diff.

Read first: ~/workspace/makefun/gta6-01-requirements.json (full requirements,
README template, repo About text, entry-message template, quota 5/day,
max_total 10) and ~/workspace/makefun/gta6-01-kit/gta6-01-kit/RULES.txt plus
competition.yaml.

## Round 3 work: police escalation, three more jobs, radio, weapons, NOS

In priority order:

1. game/src/police.js + game/src/config.js: 5-star escalation. Roadblocks
   from 3 stars (two police cars parked across the road ahead of Jax, lights
   flashing, real collision; a second block at 5 stars; a block Jax drives
   past moves ahead again). Police helicopter from 4 stars: a box-built heli
   circling above Jax with a spinning rotor and a searchlight cone on the
   ground; while it is up, hiding to cool the heat takes a longer distance
   (90 m instead of 48 m). Minimap shows roadblocks as red squares and the
   helicopter as a yellow ring.
2. game/src/missions.js: three more jobs (8 total). Job 6 The Stash
   (deliver: grab the stash at the docks, lose the heat, bring it to the
   café, $1200). Job 7 Harbor Heat (kill 4 Lobos at the marina, $1800).
   Job 8 The Voss File (new timed type: reach the pier in 75 seconds at
   3 stars, $2500; running out of time fails the job and it must be tried
   again). The story screen now comes after job 8.
3. game/src/audio.js + game/src/hud.js + game/index.html: car radio. Three
   synthesised stations (SOLMAR FM, LOBOS ROCK, MARINA NIGHTS), each its own
   chord loop, wave and tempo; Q cycles stations; the HUD shows the station
   while driving. No audio files, no network.
4. game/src/combat.js + game/src/config.js + game/src/vehicles.js: weapon
   variety and NOS. Pistol, SMG (fast, 30-round mag, unlocked after job 3),
   shotgun (5 pellets, spread, unlocked after job 6); keys 1/2/3 switch,
   R reloads, ammo per weapon, HUD shows the weapon and its ammo. NOS: hold
   Shift while driving for harder accel and a 52 top speed, draining a tank
   that refills slowly; a blue flame shows at the exhaust and the HUD has a
   NOS gauge.
5. game/src/shots.js + screenshots/: retake 3-chase.jpg at 4 stars (dusk)
   and 4-mission.jpg at the job 7 marina shootout, as real renders of the
   game's own code. Keep 4 screenshots total, each under 256 KiB.

Keep the change focused on these five items. The existing jobs, missions,
police behaviour and save format must keep working: saves gain a weapons
field (version 2) and load old saves too.

## Verify before committing

1. Serve with `node serve.ts` and playtest in headless Chromium: load the
   game with no console errors and no network requests, start a game, and
   confirm the helicopter and roadblock appear at 4 stars, the radio cycles
   stations, the weapons switch, NOS boosts the car, and jobs 6-8 play.
   Exercise the new features through the ?shot= scenes and through real play.
2. Confirm no regressions: drive, steal a car, start a mission, raise the
   wanted level. Run main.ts twice into separate dirs and diff the outputs.
3. Run the kit check locally if it runs here
   (from the kit dir: node cli/makefun.mjs check --repo <repo>) and
   bundle --dry-run to confirm the sessions are found, and report the output.

## Commit and push

Push helper: ~/workspace/makefun/ghpush-solmar.py — read it first and reuse
its Git Data API push method (the gh CLI is NOT logged in). Commit message:
"Solmar Streets round 3: helicopter + roadblocks, 3 more jobs, radio, weapons, NOS".
Do NOT bundle, check-submit, or submit the entry — the parent bundles,
checks, and submits. Report the new commit SHA and the recording id.

## Hard limits

A recording (ID 01a1ee3a-62fd-71a9-9486-6fe37e035733) is already running and
watching Muse app sessions. Do NOT start, stop, or restart any recording
until the build is done, then stop it and report its id. Do NOT run any
makefun record/bundle/check/submit command except the check and bundle
--dry-run named above, and do NOT submit the entry. Do NOT touch the
keypair (~/workspace/makefun/makefun-keypair.json) or the API key
(~/.makefun/credentials), and never print either. Do NOT claim anything or
spend anything. Work only inside ~/workspace/makefun/gta6-01-game (plus
reading the requirements, the kit, and the push helper). Never delete,
truncate, rewrite, retry, undo or compress any session message or session
file. Never write or edit code outside a recording.

When done, return: repo URL, new commit SHA, recording id, what changed and
how it was verified (commands + results), check output if any, screenshot
verification (sizes, what each shows), and anything that would block
bundle/check/submit.
