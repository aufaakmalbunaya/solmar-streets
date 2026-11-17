# Solmar Streets — round 2 for make.fun gta6-01 "Make GTA 6"

Bounty: gta6-01 "Make GTA 6", $1,666 in USDC, entries close 24 Nov 2026 22:00 WIB
(15:00 UTC), result due 10 Dec 2026. Account @ugm, payout wallet
HuTKhpksoA17CPMKZYDA6QQcetezv4wmLWqsJ234vU9K. Repo:
https://github.com/aufaakmalbunaya/solmar-streets, local copy
~/workspace/makefun/gta6-01-game. Build to WIN: the AI judge ranks entries
head-to-head on the dossier plus a contact sheet of the screenshots, so
completeness and visible polish in the screenshots matter most.

## What round 1 left us

Round 1 scored 28 of 29 checks. The one failure was transcripts_witnessed:
this file already existed with its final content when the recording began, so
the recorded agent wrote no line of it. The fix is this file itself: it was
deleted and rewritten from scratch inside the round 2 recorded session, so
every line of it is witnessed. Round 1 submission 01a1eac7, claim code
AF-N13HJ, is dead. Round 1 also scored thinking_reproduces 99.0%.

## The game as it stands

Solmar Streets is a 3D open-world crime game in a procedural coastal city,
built on three.js (vendored under game/vendor/, no network requests, static
files only, keyboard + mouse). Jax Moreno returns to Solmar in debt to Mama
Rosa and works five story jobs for her: First Errand (meet her at Café
Solmar), Hot Wheels (steal a yellow coupe, deliver it to the east garage),
Lobo Trouble (take out 3 Lobos at the docks), The Getaway (grab a package at
the marina, lose the police, deliver it), and Voss's Trap (defeat 6 Lobos on
the pier). The city has a road grid, traffic and pedestrians, cars to steal,
a 5-star wanted system with pursuit cars and officers on foot, pistol combat
(click to shoot, R reload, F punch), a HUD with health, cash, wanted stars,
mission objective, speedometer and a live minimap, synthesised sound and
music, a start screen, and a localStorage save with autosave.

Entry shape at the repo root: main.ts (Node 22, standard library only) copies
game/ and screenshots/ to /output and writes /output/dossier.json with
buildDossier from vendor/makefun-game.ts. serve.ts serves game/ on
http://localhost:8080 for playtesting. shots.json lists the four staged
screenshots; game/src/shots.js stages them deterministically from a seed:
1-start.jpg (title over the city), 2-drive.jpg (driving through traffic),
3-chase.jpg (3-star police chase), 4-mission.jpg (dock shootout).

Hard caps: at most 4 screenshots, each at most 256 KiB, long side at most
1280, short side at least 480; game/ at most 993 files and 48 MiB; main.ts
must finish within 10 s on 1 CPU / 1 GB and be deterministic over two runs.
Verify with MAKEFUN_OUTPUT_DIR=out node main.ts run twice and diff.

Read first: ~/workspace/makefun/gta6-01-requirements.json (full requirements,
README template, repo About text, entry-message template, quota 5/day,
max_total 10) and ~/workspace/makefun/gta6-01-kit/gta6-01-kit/RULES.txt plus
competition.yaml.

## Round 2 work: one real improvement — a day/night cycle

Add a full day/night cycle to Solmar, the one big GTA-style system the game
still lacks:

- game/src/config.js: a DAY table — a full 24-hour day passes in 600 real
  seconds, and the game opens at 09:00.
- game/src/city.js: the sun, moon, sky, fog, hemisphere light and street
  lamps all follow the clock. Sunrise 06:00, sunset 18:00. The sky blends
  from day blue through orange dusk to deep night blue; the sun light fades
  from 1.6 to about 0.1 and the hemisphere light from about 0.95 to about
  0.35, so night is dark but still playable; street-lamp emissive brightens
  after dark; clouds fade at night; a pale moon replaces the sun ball at
  night. The city exposes city.clock with the current hour, minute and a
  day/dusk/night label.
- game/index.html + game/src/hud.js: a clock readout in the stats panel
  showing the time and a sun/dusk/moon mark.
- game/src/main.js: a ?tod=H query parameter stages a time of day, so a
  screenshot can be taken at dusk, e.g. ?shot=chase&seed=1&tod=18.5.
- screenshots/3-chase.jpg: retake it at dusk with headless Chromium
  (Playwright chromium-1243 is cached in ~/.cache/ms-playwright) to show the
  cycle, the police light bars and the HUD clock in one frame. Keep 4
  screenshots total, each under 256 KiB. The other three stay as they are:
  the cycle moves only about a quarter of a game hour during a 5–6 s staged
  scene, so the morning scenes do not change.

Keep the change focused: one system only, no other gameplay changes. The
existing jobs, missions, police behaviour and save format must keep working
unchanged.

## Verify before committing

1. Serve with `node serve.ts` and playtest in headless Chromium: load the
   game with no console errors and no network requests, start a game, and
   confirm the clock advances, the sky darkens toward night, and the lamps
   brighten. Exercise the new feature through the ?tod= parameter and through
   real elapsed time.
2. Confirm no regressions: drive, steal a car, start a mission, raise the
   wanted level. Run main.ts twice into separate dirs and diff the outputs.
3. Run the kit's grade-local if it works here
   (from the kit dir: node cli/makefun.mjs grade-local --kit . --bot <repo>
   --driver process --worktree) and report its output.

## Commit and push

Push helper: ~/workspace/makefun/ghpush-solmar.py — read it first and reuse
its Git Data API push method (the gh CLI is NOT logged in). Commit message:
"Solmar Streets round 2: day/night cycle, witnessed TASK-PROMPT rewrite".
Report the new commit SHA.

## Hard limits

A recording (ID 01a1eace-5645-7007-971d-085760357640) is already running and
watching Muse app sessions. Do NOT start, stop, or restart any recording.
Do NOT run any makefun record/bundle/check/submit command, and do NOT submit
the entry — the parent bundles, checks, and submits. Do NOT touch the
keypair (~/workspace/makefun/makefun-keypair.json) or the API key
(~/.makefun/credentials), and never print either. Do NOT claim anything or
spend anything. Work only inside ~/workspace/makefun/gta6-01-game (plus
reading the requirements, the kit, and the push helper). Never delete,
truncate, rewrite, retry, undo or compress any session message or session
file. Never write or edit code outside a recording.

When done, return: repo URL, new commit SHA, what the improvement is and how
it was verified (commands + results), grade-local output if any, screenshot
verification (sizes, what each shows), and anything that would block
bundle/check/submit.
