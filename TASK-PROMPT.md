# Solmar Streets — round 4 for make.fun gta6-01 "Make GTA 6"

Bounty: gta6-01 "Make GTA 6", $1,666 in USDC, entries close 24 Nov 2026 22:00 WIB
(15:00 UTC), result due 10 Dec 2026. Account @ugm, payout wallet
HuTKhpksoA17CPMKZYDA6QQcetezv4wmLWqsJ234vU9K. Repo:
https://github.com/aufaakmalbunaya/solmar-streets, local copy
~/workspace/makefun/gta6-01-game. Build to WIN: the AI judge ranks entries
head-to-head on the dossier plus a contact sheet of the screenshots, so
completeness and visible polish in the screenshots matter most.

## What round 3 left us

Round 3 (commit cf838fd) is SCORED with judge win rate 98.5241%, 12W/0D/0L,
rank #1462 of 4,545. Round 2 was 97.9975%, #3563. The top-100 cutoff is
98.9409% and the top entry is 99.3343%. The gap to the paid top 100 is only
0.42 judge points, and round 3 gained 0.53, so a similar real gain in round 4
plausibly reaches the paid top 100 (1st $500 / 2nd $250 / 3rd $150 / 4-10 $38 /
11-25 $10 / 26-50 $6 / 51-100 $4). What the top entries have that Solmar
Streets still lacks (from the public leaderboard titles): a chase camera,
shops and safehouses, and 7-12 story missions. Solmar Streets already has a
5-star wanted system with helicopter and roadblocks, 8 story jobs, car radio,
3 weapons, NOS, and a full day/night cycle.

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
and music, a start screen, and a localStorage save (version 2) with autosave
and a Continue button.

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
README template, repo About text, entry-message template, quota, max_total)
and ~/workspace/makefun/gta6-01-kit/gta6-01-kit/RULES.txt plus
competition.yaml.

## Round 4 work: chase cam, save v3, shops + safehouse, four more jobs

In priority order:

1. Chase camera (game/src/main.js + game/src/hud.js + game/index.html):
   a third-person follow camera in addition to the current orbit view. Press
   C to toggle while playing; while driving in chase mode the camera sits
   behind the car and follows it smoothly (lerped position, looking ahead of
   the car), instead of orbiting. The HUD shows the camera mode while
   driving, the driving hint lists the C binding, and the title screen lists
   it. The chase screenshot uses chase cam. The orbit view keeps working
   exactly as before.
2. Save system v3 (game/src/save.js + game/src/main.js): extend the existing
   save, do not build a second system. The save now also stores the wanted
   level, the camera mode and the NOS tank, and the version bumps to 3.
   Loading an old v1/v2 save still works (missing fields fall back to safe
   defaults). Continue on the title screen restores cash, mission progress,
   weapons, health, position, wanted level and camera mode. The post-story
   save still happens when the last job completes.
3. Shops + safehouse (new game/src/shops.js + game/src/config.js +
   game/src/hud.js + game/index.html): three visible map locations on the
   beachfront, each a real 3D building with a sign and a minimap marker:
   Big Iron Guns (west beach) sells pistol ammo, SMG ammo and shotgun shells
   for cash; Doc Sal's clinic (east beach) heals to full and refills the NOS
   tank for cash; Rosa's Safehouse (south beach, near the pier) clears the
   wanted level and heals to full for free. Walk up to one and the HUD shows
   what it sells and which key buys it (4/5/6 at the gun shop, 7 at the
   clinic, H at the safehouse); buying deducts cash and grants the item, and
   a purchase the player cannot afford or has not unlocked is refused with a
   toast, not a silent no-op.
4. game/src/missions.js: four more jobs (12 total), in the same style as the
   existing jobs and wired into the same progression: Job 9 Payday Run
   (deliver: garage to café, 2 stars on pickup, $2200), Job 10 The Long Cut
   (timed 90-second run to the safehouse at 2 stars, $2500), Job 11 Harbor
   Revenge (kill 5 Lobos at the docks, boss, $2800), Job 12 The Voss
   Takedown (kill 8 Lobos at the pier, boss, $4000, the finale). The story
   screen now comes after job 12. No existing job changes.
5. game/src/shots.js + screenshots/ + shots.json: retake the four shots as
   real renders of the game's own code — 1-start.jpg (title), 2-shop.jpg
   (Jax on foot at Big Iron Guns with the shop hint showing), 3-chase.jpg
   (4-star chase in chase cam: pursuit cars, roadblock, helicopter),
   4-mission.jpg (job 12 pier shootout). Keep exactly 4 screenshots, each
   under 256 KiB.

Keep the change focused on these five items. Every round-3 feature keeps
working: the 5-star wanted system, helicopter, roadblocks, radio, weapons,
NOS, day/night cycle and the first eight jobs. Do not break determinism:
the staged shots still come from a fixed seed, and main.ts output is still
byte-identical over two runs.

## Verify before committing

1. Serve with `node serve.ts` and playtest in headless Chromium (the Chrome
   for Testing binary in the Playwright cache works here; drive it over CDP
   from Node, which has a built-in WebSocket client): load the game with no
   console errors and no network requests, start a game, and confirm the
   chase cam toggles with C and follows the car, the save/load round-trip
   restores cash, mission, wanted and camera mode, a shop purchase deducts
   cash and grants the item, the safehouse clears wanted and heals, and jobs
   9-12 play.
2. Confirm no regressions: drive, steal a car, start a mission, raise the
   wanted level, job 4 escape, job 5 end-to-end, busted, wasted, wanted
   decay, post-story save, determinism. Run main.ts twice into separate dirs
   and diff the outputs.
3. Screenshots are real renders, exactly 4 files, each under 256 KiB, long
   side at most 1280, short side at least 480.

## Commit and push

Push helper: ~/workspace/makefun/ghpush-solmar.py — read it first and reuse
its Git Data API push method (the gh CLI is NOT logged in). Commit message:
"Solmar Streets round 4: chase cam, shops + safehouse, 4 more jobs, save v3".
Do NOT bundle, check-submit, or submit the entry — the parent bundles,
checks, and submits. Do NOT start, stop, or seal any recording. Report the
new commit SHA (verified with git ls-remote) and the recording id.

## Hard limits

A recording (ID 01a1ee71-d0c8-739a-9cdc-81fda1335cf4, PID 18314) is already
running and watching this session. Do NOT start, stop, or restart any
recording, and do NOT run any makefun record/bundle/check/submit command.
Do NOT touch the keypair (~/workspace/makefun/makefun-keypair.json) or the
API key (~/.makefun/credentials), and never print either. Do NOT claim
anything or spend anything. Work only inside ~/workspace/makefun/gta6-01-game
(plus reading the requirements, the kit, and the push helper). Never delete,
truncate, rewrite, retry, undo or compress any session message or session
file. Never write or edit code outside a recording.

When done, return: repo URL, new commit SHA, recording id, what changed and
how it was verified (commands + results), screenshot verification (sizes,
what each shows), and anything that would block bundle/check/submit.
