// Solmar Streets, a gta6-01 entry (Node 22, standard library only).
//
// The game lives in this directory's game/ folder: plain static files a desktop
// browser loads offline — game/index.html and its ES modules, three.js vendored
// under game/vendor, no other library and no network request. This program is the
// entrypoint the grader runs: it hands the game in by copying game/ and
// screenshots/ from beside this file to /output, then writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// The game itself is a complete open-world crime game: a procedural coastal city
// to explore on foot and by car, traffic and pedestrians, cars to steal, a wanted
// system with police pursuit, a five-mission story, pistol combat, a day/night
// cycle with a HUD clock, a HUD with a live minimap, a start screen, a
// localStorage save and synthesised sound.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps (reference/gate.json): text_max_bytes is the only one that
// shapes the dossier's bytes. The rest make this program refuse an entry the
// scorer would refuse anyway — more than 4 screenshots, or one over 256 KiB;
// more than 993 files in game/ or 48 MiB of game files in all; or a path under
// game/ longer than 1000 bytes. game/ is counted beside /output's own entries:
// its screenshots/ folder and dossier.json.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
