import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const alias = (name) => join(root, 'packages', name, 'src', 'index.ts');

const r = await build({
  entryPoints: [join(here, 'src', 'main.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node20'],
  packages: 'bundle',
  minify: false,
  legalComments: 'none',
  banner: { js: "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);" },
  alias: {
    '@abg/schemas': alias('schemas'),
    '@abg/domain': alias('domain'),
    '@abg/render': alias('render'),
    '@abg/picturebook': alias('picturebook'),
    '@abg/api': alias('api'),
  },
  outfile: join(here, 'dist', 'server.mjs'),
  metafile: true,
});

const bytes = Object.values(r.metafile.outputs)[0].bytes;
console.log(`server.mjs  ${(bytes / 1024).toFixed(1)} KB`);
