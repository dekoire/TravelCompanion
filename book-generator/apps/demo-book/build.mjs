import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const alias = (name) => join(root, 'packages', name, 'src', 'index.ts');

const tmp = mkdtempSync(join(tmpdir(), 'abg-demo-'));
const bundle = join(tmp, 'generate.mjs');

await build({
  entryPoints: [join(here, 'src', 'generate.ts')],
  bundle: true, format: 'esm', platform: 'node', target: ['node20'],
  packages: 'bundle', legalComments: 'none',
  alias: {
    '@abg/schemas': alias('schemas'),
    '@abg/domain': alias('domain'),
    '@abg/render': alias('render'),
    '@abg/picturebook': alias('picturebook'),
  },
  outfile: bundle,
});

await import(`file://${bundle}`);
rmSync(tmp, { recursive: true, force: true });
