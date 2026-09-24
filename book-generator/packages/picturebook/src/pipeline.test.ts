import { describe, expect, it } from 'vitest';
import { planPages, validatePictureBook, readingLevelForAge } from '@abg/domain';
import { renderSpreadPlaceholder, spreadDataUri } from '@abg/render';
import { DemoGenerator, demoInputFromPrompt } from './demo-generator';
import {
  GeneratorError, type CompletionRequest, type CompletionResult, type TextGenerator,
} from './generator';
import { createPictureBook, updateSpread, imagePromptsFor } from './pipeline';

const PROMPT = 'Ein kleiner Fuchs namens Nuri, der den Ort sucht, an dem der Wind anfängt';

function demo(): DemoGenerator { return new DemoGenerator(); }

/** Generator, der einen festen String liefert — fuer Fehlerpfade. */
class FixedGenerator implements TextGenerator {
  readonly name = 'fixed';
  readonly synthetic = true;
  calls = 0;
  constructor(private readonly out: string | (() => never)) {}
  async complete(_req: CompletionRequest): Promise<CompletionResult> {
    this.calls++;
    if (typeof this.out === 'function') this.out();
    return { text: this.out as string };
  }
}

describe('createPictureBook', () => {
  it('erzeugt ein druckfähiges Buch aus einem Prompt', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    expect(r.plan.spreads).toHaveLength(planPages(32).storySpreads);
    expect(r.validation.ok).toBe(true);
    expect(r.pageCount).toBe(32);
    expect(r.readingLevel).toBe('pre_reader');
  });

  it('weist aus, dass kein Sprachmodell beteiligt war', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    expect(r.generator).toEqual({ name: 'demo', synthetic: true });
  });

  it('meldet zurück, was es aus dem Prompt gelesen hat', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    expect(r.understood.heroName).toBe('Nuri');
    expect(r.understood.derived.heroName).toBe('prompt');
    expect(r.understood.derived.goal).toBe('prompt');
  });

  it('übernimmt Überschreibungen und markiert sie als gesetzt', async () => {
    const r = await createPictureBook(
      { prompt: 'Eine Geschichte', overrides: { heroName: 'Juno', place: 'auf dem Dach' } },
      demo());
    expect(r.understood.heroName).toBe('Juno');
    expect(r.understood.place).toBe('auf dem Dach');
    expect(r.understood.derived.heroName).toBe('prompt');
  });

  it('funktioniert für jede druckbare Seitenzahl', async () => {
    for (const pageCount of [24, 32, 40, 48] as const) {
      const r = await createPictureBook({ prompt: PROMPT, pageCount }, demo());
      expect(r.plan.spreads).toHaveLength(planPages(pageCount).storySpreads);
      expect(r.validation.ok).toBe(true);
    }
  });

  it('vergibt korrekte Seitenzahlen', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    expect(r.plan.spreads[0]!.pages).toEqual([4, 5]);
    expect(r.plan.spreads.at(-1)!.pages).toEqual([30, 31]);
    for (const s of r.plan.spreads) expect(s.pages[0] % 2).toBe(0);
  });

  it('setzt den Figurendeskriptor in jeden Bildprompt ein', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    const hero = r.plan.characters.find((c) => c.role === 'protagonist')!;
    const withHero = r.plan.spreads
      .map((s, i) => ({ s, prompt: r.imagePrompts[i]! }))
      .filter((x) => x.s.charactersPresent.includes(hero.slug));
    expect(withHero.length).toBeGreaterThan(8);
    for (const x of withHero) expect(x.prompt).toContain(hero.visualDescriptor);
  });

  it('lässt Text und Bild verschiedene Arbeit tun', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    expect(r.validation.stats.redundancyMax).toBeLessThan(0.6);
  });

  it('leitet die Lesestufe aus dem Zielalter ab', async () => {
    const r = await createPictureBook({ prompt: PROMPT, targetAge: '9+' }, demo());
    expect(r.readingLevel).toBe('early_reader');
  });

  it('schreibt für ältere Kinder mehr Text je Doppelseite', async () => {
    const young = await createPictureBook({ prompt: PROMPT, targetAge: '6+' }, demo());
    const older = await createPictureBook({ prompt: PROMPT, targetAge: '9+' }, demo());
    expect(older.validation.stats.avgWordsPerSpread)
      .toBeGreaterThan(young.validation.stats.avgWordsPerSpread);
  });

  it('normalisiert den Farbton', async () => {
    const r = await createPictureBook({ prompt: PROMPT, paletteHue: 400 }, demo());
    expect(r.plan.style.paletteHue).toBe(40);
  });

  it('lehnt einen leeren Prompt ab', async () => {
    await expect(createPictureBook({ prompt: '   ' }, demo())).rejects.toThrow(GeneratorError);
  });
});

describe('Fehler des Generators', () => {
  it('meldet ungültiges JSON als Generatorfehler', async () => {
    const gen = new FixedGenerator('das ist kein JSON');
    await expect(createPictureBook({ prompt: PROMPT }, gen))
      .rejects.toThrow(/kein gültiges JSON/);
  });

  it('gibt dem Modell genau einen Nachbesserungsversuch', async () => {
    const gen = new FixedGenerator('kaputt');
    await expect(createPictureBook({ prompt: PROMPT }, gen)).rejects.toThrow();
    // Erstversuch plus eine Nachbesserung — danach ist Schluss, kein Ratespiel.
    expect(gen.calls).toBe(2);
  });

  it('nimmt eine gelungene Nachbesserung an', async () => {
    const good = await demo().complete({
      prompt: 'genau 14 Doppelseiten\nLESESTUFE 3–5\n<idee>Test</idee>\n'
        + 'Technik: watercolor\nPalette: 120 Grad',
    });
    let n = 0;
    const flaky: TextGenerator = {
      name: 'flaky', synthetic: true,
      async complete(): Promise<CompletionResult> {
        return { text: ++n === 1 ? 'kaputt' : good.text };
      },
    };
    const r = await createPictureBook({ prompt: PROMPT }, flaky);
    expect(r.repairs).toBe(1);
    expect(r.validation.ok).toBe(true);
  });

  it('meldet Schemaverstöße mit konkretem Feld', async () => {
    const gen = new FixedGenerator(JSON.stringify({ title: 'X', spreads: [] }));
    await expect(createPictureBook({ prompt: PROMPT }, gen))
      .rejects.toThrow(/verletzt das Schema/);
  });

  it('reicht Anbieterfehler unverändert durch', async () => {
    const gen = new FixedGenerator(() => {
      throw new GeneratorError('Anbieter nicht erreichbar', 'unavailable');
    });
    await expect(createPictureBook({ prompt: PROMPT }, gen))
      .rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('meldet eine falsche Doppelseitenzahl', async () => {
    // Ein Modell, das 14 statt 22 Doppelseiten liefert, ist ein Fehler — kein
    // stillschweigend akzeptiertes kürzeres Buch.
    const { text } = await demo().complete({
      prompt: 'genau 14 Doppelseiten\nLESESTUFE 3–5\n<idee>Test</idee>\n'
        + 'Technik: watercolor\nPalette: 120 Grad',
    });
    const draft = JSON.parse(text) as Record<string, unknown>;
    const gen = new FixedGenerator(JSON.stringify(draft));
    await expect(createPictureBook({ prompt: PROMPT, pageCount: 48 }, gen))
      .rejects.toThrow(/22 sind bei 48 Seiten vorgesehen/);
  });
});

describe('demoInputFromPrompt', () => {
  it('liest alle Parameter aus dem Auftragstext', () => {
    const prompt = [
      'Schreibe ein Bilderbuch mit genau 18 Doppelseiten.',
      '<idee>Ein Bär namens Juno, der fliegen lernt</idee>',
      'LESESTUFE 5–7',
      'Technik: crayon. Farbton der Palette: 42 Grad.',
    ].join('\n');
    const d = demoInputFromPrompt(prompt);
    expect(d.spreadCount).toBe(18);
    expect(d.readingLevel).toBe('early_reader');
    expect(d.medium).toBe('crayon');
    expect(d.paletteHue).toBe(42);
    expect(d.heroName).toBe('Juno');
  });

  it('fällt auf Vorgaben zurück, wenn der Prompt nichts hergibt', () => {
    const d = demoInputFromPrompt('irgendwas');
    expect(d.spreadCount).toBe(14);
    expect(d.medium).toBe('watercolor');
    expect(d.readingLevel).toBe('pre_reader');
  });

  it('lehnt ein unbekanntes Medium ab und nimmt die Vorgabe', () => {
    expect(demoInputFromPrompt('Technik: fingerpaint').medium).toBe('watercolor');
  });
});

describe('updateSpread', () => {
  it('ändert den Text und prüft neu', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    const u = updateSpread(r.plan, 3, { text: 'Ganz kurz.' },
      { readingLevel: 'pre_reader', pageCount: 32 });
    expect(u.spread.text).toBe('Ganz kurz.');
    expect(u.spread.textEdited).toBe(true);
    expect(u.validation.issues.some(
      (i) => i.spreadIndex === 3 && i.code === 'pb_text_too_short')).toBe(true);
  });

  it('lässt Seitenzahlen, Index und Seed unangetastet', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    const before = r.plan.spreads[2]!;
    const u = updateSpread(r.plan, 3, { text: 'Neuer Text hier drin.' },
      { readingLevel: 'pre_reader', pageCount: 32 });
    expect(u.spread.pages).toEqual(before.pages);
    expect(u.spread.index).toBe(before.index);
    expect(u.spread.seed).toBe(before.seed);
  });

  it('verändert den Bildprompt mit dem Bild-Brief', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    const u = updateSpread(r.plan, 1, { imageBrief: { setting: 'auf einem Leuchtturm' } },
      { readingLevel: 'pre_reader', pageCount: 32 });
    expect(u.imagePrompt).toContain('auf einem Leuchtturm');
  });

  it('lässt den ursprünglichen Plan unverändert', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    const original = r.plan.spreads[0]!.text;
    updateSpread(r.plan, 1, { text: 'Anders.' }, { readingLevel: 'pre_reader', pageCount: 32 });
    expect(r.plan.spreads[0]!.text).toBe(original);
  });

  it('wirft bei einer unbekannten Doppelseite', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    expect(() => updateSpread(r.plan, 99, { text: 'x' },
      { readingLevel: 'pre_reader', pageCount: 32 })).toThrow(RangeError);
  });
});

describe('Platzhalter-Bilder', () => {
  it('rendert gültiges, gekennzeichnetes SVG', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    const svg = renderSpreadPlaceholder(r.plan.spreads[0]!, r.plan);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('kein KI-Bild');
    expect(spreadDataUri(svg).startsWith('data:image/svg+xml')).toBe(true);
  });

  it('gibt derselben Figur auf allen Tagseiten dieselbe Farbe', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    const hero = r.plan.characters.find((c) => c.role === 'protagonist')!;
    const day = r.plan.spreads.filter(
      (s) => s.charactersPresent.includes(hero.slug) && s.imageBrief.timeOfDay !== 'night');
    expect(day.length).toBeGreaterThan(3);
    for (const s of day) {
      expect(renderSpreadPlaceholder(s, r.plan)).toContain(`hsl(${hero.paletteSeed} 62% 58%)`);
    }
  });
});

describe('imagePromptsFor', () => {
  it('liefert einen Prompt je Doppelseite', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    expect(imagePromptsFor(r.plan)).toHaveLength(r.plan.spreads.length);
  });
});

describe('Lesestufen sind nicht ineinander geschachtelt', () => {
  it('ein Text für Dreijährige ist für Sechsjährige zu dünn', async () => {
    const young = await createPictureBook({ prompt: PROMPT, targetAge: '6+' }, demo());
    const asOlder = validatePictureBook(young.plan, {
      readingLevel: readingLevelForAge('9+'), pageCount: 32,
    });
    expect(asOlder.issues.map((i) => i.code)).toContain('pb_text_too_short');
  });
});

describe('Platzhalter: mehrere SVGs in einem Dokument', () => {
  it('vergibt je Doppelseite eigene IDs', async () => {
    // Werden mehrere SVGs in dasselbe HTML eingebettet, löst url(#sky) sonst
    // immer auf die erste Definition auf — alle Seiten bekämen die Farben der
    // ersten. Bei der Vorschau fiel das nicht auf, weil sie data-URIs nutzt.
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    const ids = r.plan.spreads.map((s) => {
      const svg = renderSpreadPlaceholder(s, r.plan);
      return /id="sky-([a-z0-9]+)"/.exec(svg)?.[1];
    });
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('verweist nur auf eigene IDs', async () => {
    const r = await createPictureBook({ prompt: PROMPT }, demo());
    for (const s of r.plan.spreads) {
      const svg = renderSpreadPlaceholder(s, r.plan);
      const uid = /id="sky-([a-z0-9]+)"/.exec(svg)?.[1];
      for (const ref of svg.matchAll(/url\(#([a-z-]+)-([a-z0-9]+)\)/g)) {
        expect(ref[2]).toBe(uid);
      }
    }
  });
});
