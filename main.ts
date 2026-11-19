// Neon Coast Cover Studio hand-in program (Node 22, standard library only).
// Copies the static app (app/) and the screenshots to the output folder, then writes dossier.json
// with the kit's vendored library. Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Every file the static app needs; a missing one fails the build instead of shipping a broken entry.
const REQUIRED_APP_FILES = [
  'index.html', 'style.css',
  'src/main.js', 'src/state.js', 'src/render.js', 'src/layouts.js', 'src/grades.js', 'src/export.js', 'src/shots.js',
];

function validateInputs(): string[] {
  for (const f of REQUIRED_APP_FILES) {
    if (!existsSync(join(root, 'app', f))) throw new Error(`missing app/${f} beside main.ts`);
  }
  const shotsDir = join(root, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error('missing screenshots/ beside main.ts');
  const shots = readdirSync(shotsDir).filter((n) => /\.(png|jpe?g|webp)$/i.test(n)).sort();
  if (shots.length === 0) throw new Error('screenshots/ contains no images');
  return shots;
}

// Recursively list files under dir as [relative path, size in bytes], sorted by path.
function listFiles(dir: string, prefix = ''): [string, number][] {
  const rows: [string, number][] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name), rel = prefix ? `${prefix}/${name}` : name, st = statSync(full);
    if (st.isDirectory()) rows.push(...listFiles(full, rel));
    else rows.push([rel, st.size]);
  }
  return rows;
}

const shotNames = validateInputs();
mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// Same caps the scorer applies: text budget, screenshot count/size, app file count/size/path length.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, caps));

// Per-file byte table of the hand-in, grouped by folder with subtotals and a grand total.
const groups: [string, [string, number][]][] = [
  ['app', listFiles(join(outDir, 'app'), 'app')],
  ['screenshots', listFiles(join(outDir, 'screenshots'), 'screenshots')],
];
const width = Math.max(...groups.flatMap(([, rows]) => rows.map(([p]) => p.length)));
let grand = 0;
for (const [name, rows] of groups) {
  const sub = rows.reduce((a, [, n]) => a + n, 0);
  grand += sub;
  for (const [p, n] of rows) console.log(`${p.padEnd(width)}  ${String(n).padStart(9)} B`);
  console.log(`${`-- ${name}: ${rows.length} files`.padEnd(width)}  ${String(sub).padStart(9)} B`);
}
console.log(`${'== total'.padEnd(width)}  ${String(grand).padStart(9)} B (caps: ${caps.app_max_files} app files, ${caps.screenshots.max_bytes} B per screenshot)`);
for (const [p, n] of groups[1][1]) if (n > caps.screenshots.max_bytes) throw new Error(`${p} is ${n} B, over the ${caps.screenshots.max_bytes} B cap`);
console.log(`${shotNames.length} screenshots validated`);
console.log(`wrote ${outDir}/app, ${outDir}/screenshots and ${outDir}/dossier.json`);
