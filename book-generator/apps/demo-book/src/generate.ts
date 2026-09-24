import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DemoGenerator, createPictureBook } from '@abg/picturebook';
import { renderSpreadPlaceholder } from '@abg/render';
import { READING_RULES } from '@abg/domain';

/**
 * Erzeugt ein Demo-Bilderbuch und schreibt es als eigenstaendige Seite.
 *
 * Die Doppelseiten werden zur Bauzeit gerendert und eingebettet — die fertige
 * Seite braucht weder Pipeline noch Zod noch sonst eine Laufzeit.
 */

const PROMPT = 'Ein kleiner Fuchs namens Nuri, der zusammen mit einer Elster '
  + 'den Ort sucht, an dem der Wind anfängt';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(process.cwd(), 'apps', 'demo-book', 'dist');
void here;

const result = await createPictureBook({
  prompt: PROMPT,
  pageCount: 32,
  targetAge: '6+',
  medium: 'watercolor',
  paletteHue: 138,
}, new DemoGenerator());

const { plan, validation, understood, readingLevel } = result;
const rules = READING_RULES[readingLevel];

const spreads = plan.spreads.map((s) => ({
  index: s.index,
  pages: s.pages,
  beat: s.beat,
  text: s.text,
  layout: s.layout,
  svg: renderSpreadPlaceholder(s, plan),
}));

const esc = (s: string): string => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hero = plan.characters.find((c) => c.role === 'protagonist');
const companion = plan.characters.find((c) => c.role === 'companion');

const template = readTemplate();
const html = template
  .replace('__TITLE__', esc(plan.title))
  .replace(/__TITLE_TEXT__/g, esc(plan.title))
  .replace('__PREMISE__', esc(plan.premise))
  .replace('__REFRAIN__', esc(plan.refrain ?? ''))
  .replace('__HERO__', esc(hero?.name ?? ''))
  .replace('__HERO_DESC__', esc(hero?.visualDescriptor ?? ''))
  .replace('__COMPANION__', esc(companion?.name ?? ''))
  .replace('__COMPANION_DESC__', esc(companion?.visualDescriptor ?? ''))
  .replace('__HERO_HUE__', String(hero?.paletteSeed ?? 0))
  .replace('__COMPANION_HUE__', String(companion?.paletteSeed ?? 0))
  .replace('__PAGE_COUNT__', String(result.pageCount))
  .replace('__PROMPT__', esc(PROMPT))
  .replace('__AGE__', esc(rules.ageLabel))
  .replace('__SPREAD_COUNT__', String(spreads.length))
  .replace('__WORDS__', String(validation.stats.totalWords))
  .replace('__AVG__', String(validation.stats.avgWordsPerSpread))
  .replace('__LAYOUTS__', String(validation.stats.layoutsUsed))
  .replace('__ISSUES__', String(validation.issues.length))
  .replace('__OK__', validation.ok ? 'druckfähig' : 'nicht druckfähig')
  .replace('__SPREADS__', spreads.map(spreadHtml).join('\n'))
  .replace('__THUMBS__', spreads.map(thumbHtml).join('\n'));

function spreadHtml(s: typeof spreads[number]): string {
  return `<figure class="spread" data-index="${s.index}"${s.index === 1 ? '' : ' hidden'}>
  ${s.svg}
  <figcaption>
    <span class="pages">Seite ${s.pages[0]}–${s.pages[1]}</span>
    <span class="beat">${esc(s.beat)}</span>
  </figcaption>
  <p class="sr-only">${esc(s.text)}</p>
</figure>`;
}

function thumbHtml(s: typeof spreads[number]): string {
  return `<button class="thumb" data-goto="${s.index}" type="button">
  ${s.svg}
  <span class="thumb-label">${s.pages[0]}–${s.pages[1]}</span>
</button>`;
}

function readTemplate(): string {
  // Die Vorlage liegt im App-Ordner und wird zur Bauzeit eingelesen.
  return readFileSync(join(process.cwd(), 'apps', 'demo-book', 'template.html'), 'utf8');
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);

console.log(`Demo-Buch: "${plan.title}"`);
console.log(`  ${spreads.length} Doppelseiten, ${validation.stats.totalWords} Wörter`);
console.log(`  Prüfung: ${validation.ok ? 'druckfähig' : 'NICHT druckfähig'}, `
  + `${validation.issues.length} Befund(e)`);
console.log(`  Aus dem Prompt gelesen: ${Object.entries(understood.derived)
  .filter(([, v]) => v === 'prompt').map(([k]) => k).join(', ')}`);
console.log(`  -> ${join(outDir, 'index.html')}`);
