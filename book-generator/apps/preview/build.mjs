import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, 'dist');
mkdirSync(out, { recursive: true });

const alias = (name) => join(root, 'packages', name, 'src', 'index.ts');

const result = await build({
  entryPoints: [join(here, 'src', 'main.ts')],
  bundle: true,
  format: 'iife',
  target: ['es2022'],
  platform: 'browser',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  alias: {
    '@abg/schemas': alias('schemas'),
    '@abg/domain': alias('domain'),
    '@abg/llm': alias('llm'),
    '@abg/render': alias('render'),
  },
  outfile: join(out, 'app.js'),
  metafile: true,
});

writeFileSync(join(out, 'index.html'), readFileSync(join(here, 'index.html')));

const bytes = Object.values(result.metafile.outputs)[0].bytes;
console.log(`app.js  ${(bytes / 1024).toFixed(1)} KB`);
console.log(`-> ${out}`);
