// Neon Coast Cover Studio hand-in program (Node 22, standard library only).
// Copies the static app (app/) and the screenshots to the output folder, then writes dossier.json
// with the kit's vendored library. Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(name: string, required: boolean): void {
  const from = join(root, name);
  if (!existsSync(from)) {
    if (required) throw new Error(`missing ${name}/ beside main.ts`);
    return;
  }
  cpSync(from, join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('app', true);
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
copyTree('screenshots', false);

// Same caps the scorer applies: text budget, screenshot count/size, app file count/size/path length.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, caps));
console.log(`wrote ${outDir}/app, ${outDir}/screenshots and ${outDir}/dossier.json`);
