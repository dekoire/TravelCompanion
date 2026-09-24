import { describe, expect, it } from 'vitest';
import { planPages, validatePictureBook, readingLevelForAge } from '@abg/domain';
import { renderSpreadPlaceholder, spreadDataUri, wrapText } from '@abg/render';
import { LlmGateway } from './gateway';
import { DemoPictureBookProvider, buildDemoDraft } from './demo-provider';
import { generatePictureBook, type PictureBookRequest } from './picturebook-pipeline';
import { MemoryIdempotencyStore } from './types';
import { mockProfile } from './profile';

function gateway() {
  const provider = new DemoPictureBookProvider();
  const gw = new LlmGateway({
    providers: { mock: provider },
    modelProfile: mockProfile(),
    store: new MemoryIdempotencyStore(),
    sleep: async () => {},
    randomId: () => 'testid',
    now: () => 1_000,
  });
  return { gw, provider };
}

const REQ: PictureBookRequest = {
  bookId: 'pb_1',
  idea: 'Ein Kind sucht etwas, das es vielleicht gar nicht gibt',
  heroName: 'Mika',
  heroKind: 'ein Kind',
  companionName: 'Nuri',
  companionKind: 'ein kleiner Fuchs',
  place: 'am Rand des Dorfes',
  goal: 'den Ort zu finden, an dem der Wind anfängt',
  pageCount: 32,
  targetAge: '6+',
  medium: 'watercolor',
  paletteHue: 120,
};

describe('Bilderbuch-Pipeline end-to-end', () => {
  it('erzeugt ein vollständiges, druckbares Buch', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);

    expect(r.plan.spreads).toHaveLength(planPages(32).storySpreads);
    expect(r.plan.title.length).toBeGreaterThan(0);
    expect(r.validation.ok).toBe(true);
    expect(r.validation.issues.filter((i) => i.severity === 'block')).toHaveLength(0);
  });

  it('besteht die Prüfung für jede erlaubte Seitenzahl', async () => {
    for (const pageCount of [24, 32, 40, 48] as const) {
      const { gw } = gateway();
      const r = await generatePictureBook({ ...REQ, bookId: `pb_${pageCount}`, pageCount }, gw);
      expect(r.plan.spreads).toHaveLength(planPages(pageCount).storySpreads);
      expect(r.validation.ok).toBe(true);
    }
  });

  it('vergibt korrekte Seitenzahlen', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    expect(r.plan.spreads[0]!.pages).toEqual([4, 5]);
    expect(r.plan.spreads.at(-1)!.pages).toEqual([30, 31]);
    for (const s of r.plan.spreads) expect(s.pages[0] % 2).toBe(0);
  });

  it('setzt in jedem Bildprompt denselben Figurendeskriptor ein', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    const hero = r.plan.characters.find((c) => c.slug === 'hero')!;
    const withHero = r.plan.spreads
      .map((s, i) => ({ s, prompt: r.imagePrompts[i]! }))
      .filter((x) => x.s.charactersPresent.includes('hero'));
    expect(withHero.length).toBeGreaterThan(8);
    for (const x of withHero) expect(x.prompt).toContain(hero.visualDescriptor);
  });

  it('hält den Text unter der Grenze der Lesestufe', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    expect(r.readingLevel).toBe('pre_reader');
    expect(r.validation.stats.avgWordsPerSpread).toBeLessThanOrEqual(32);
  });

  it('lässt Text und Bild verschiedene Arbeit tun', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    // Kein einziger Spread darf den Bildinhalt nur nacherzählen.
    expect(r.validation.stats.redundancyMax).toBeLessThan(0.6);
  });

  it('nutzt mehrere Layouts und mindestens eine randlose Doppelseite', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    expect(r.validation.stats.layoutsUsed).toBeGreaterThanOrEqual(3);
    expect(r.plan.spreads.some((s) => s.layout === 'full_bleed')).toBe(true);
  });

  it('ist deterministisch — gleiche Eingabe, gleiches Buch', async () => {
    const a = await generatePictureBook(REQ, gateway().gw);
    const b = await generatePictureBook(REQ, gateway().gw);
    expect(JSON.stringify(a.plan)).toBe(JSON.stringify(b.plan));
  });

  it('läuft über den echten Gateway — Idempotenz greift', async () => {
    const { gw, provider } = gateway();
    await generatePictureBook(REQ, gw);
    const second = await generatePictureBook(REQ, gw);
    expect(second.cached).toBe(true);
    expect(provider.calls).toHaveLength(1);
  });

  it('validiert den Entwurf gegen das Schema — ein kaputter Entwurf fliegt raus', async () => {
    const { gw } = gateway();
    // Der Demo-Provider liefert bewusst valide Daten; hier prüfen wir, dass das
    // Schema überhaupt greift, indem wir den Entwurf direkt beschädigen.
    const broken = buildDemoDraft({
      idea: 'x', heroName: 'Mika', heroKind: 'Kind', place: 'hier', goal: 'dort',
      spreadCount: 14, medium: 'watercolor', paletteHue: 120,
    }) as Record<string, unknown>;
    delete broken['title'];
    const { PictureBookDraft } = await import('@abg/schemas');
    expect(PictureBookDraft.safeParse(broken).success).toBe(false);
    void gw;
  });
});

describe('Demo-Provider', () => {
  it('erzeugt genau so viele Doppelseiten wie verlangt', () => {
    for (const n of [10, 14, 18, 22]) {
      const d = buildDemoDraft({
        idea: 'Test', heroName: 'Mika', heroKind: 'Kind', place: 'hier', goal: 'dort',
        spreadCount: n, medium: 'watercolor', paletteHue: 120,
      }) as { spreads: unknown[] };
      expect(d.spreads).toHaveLength(n);
    }
  });

  it('übernimmt die Namen aus der Eingabe', () => {
    const d = buildDemoDraft({
      idea: 'Test', heroName: 'Juno', heroKind: 'ein Bär', place: 'im Wald', goal: 'zu fliegen',
      companionName: 'Pit', companionKind: 'eine Elster',
      spreadCount: 14, medium: 'crayon', paletteHue: 30,
    }) as { characters: Array<{ name: string }>; premise: string };
    expect(d.characters.map((c) => c.name)).toContain('Juno');
    expect(d.characters.map((c) => c.name)).toContain('Pit');
    expect(d.premise).toContain('zu fliegen');
  });

  it('funktioniert ohne Begleitfigur', () => {
    const d = buildDemoDraft({
      idea: 'Test', heroName: 'Mika', heroKind: 'Kind', place: 'hier', goal: 'dort',
      spreadCount: 10, medium: 'watercolor', paletteHue: 120,
    }) as { characters: unknown[] };
    expect(d.characters.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Platzhalter-Renderer', () => {
  it('rendert gültiges SVG', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    const svg = renderSpreadPlaceholder(r.plan.spreads[0]!, r.plan);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 1600 800"');
  });

  it('kennzeichnet das Bild sichtbar als Platzhalter', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    expect(renderSpreadPlaceholder(r.plan.spreads[0]!, r.plan)).toContain('kein KI-Bild');
  });

  it('gibt derselben Figur auf allen Doppelseiten dieselbe Farbe', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    const hero = r.plan.characters.find((c) => c.slug === 'hero')!;
    const withHero = r.plan.spreads.filter((s) => s.charactersPresent.includes('hero'));
    const expected = `hsl(${hero.paletteSeed} 62% 58%)`;
    const nightFree = withHero.filter((s) => s.imageBrief.timeOfDay !== 'night');
    expect(nightFree.length).toBeGreaterThan(3);
    for (const s of nightFree) {
      expect(renderSpreadPlaceholder(s, r.plan)).toContain(expected);
    }
  });

  it('ist deterministisch', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    const a = renderSpreadPlaceholder(r.plan.spreads[2]!, r.plan);
    const b = renderSpreadPlaceholder(r.plan.spreads[2]!, r.plan);
    expect(a).toBe(b);
  });

  it('markiert Text, der nicht in den Satzspiegel passt', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    const overlong = {
      ...r.plan.spreads[0]!,
      layout: 'spot' as const,
      text: 'Wort '.repeat(160).trim(),
    };
    expect(renderSpreadPlaceholder(overlong, r.plan)).toContain('passt nicht in den Satzspiegel');
  });

  it('escapet Sonderzeichen im Text', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    const s = { ...r.plan.spreads[0]!, text: 'Mika sagte <b>"hallo"</b> & ging.' };
    const svg = renderSpreadPlaceholder(s, r.plan);
    expect(svg).toContain('&lt;b&gt;');
    expect(svg).not.toContain('<b>');
  });

  it('liefert eine verwendbare data-URI', async () => {
    const { gw } = gateway();
    const r = await generatePictureBook(REQ, gw);
    const uri = spreadDataUri(renderSpreadPlaceholder(r.plan.spreads[0]!, r.plan));
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
  });
});

describe('wrapText', () => {
  it('bricht an Wortgrenzen um', () => {
    expect(wrapText('eins zwei drei vier', 10, 5)).toEqual(['eins zwei', 'drei vier']);
  });

  it('kürzt bei zu vielen Zeilen mit Auslassung', () => {
    const lines = wrapText('eins zwei drei vier fünf sechs sieben', 10, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/…$/);
  });

  it('kommt mit leerem Text zurecht', () => {
    expect(wrapText('', 10, 3)).toEqual([]);
  });
});

describe('Lesestufen', () => {
  it('schreibt für ältere Kinder längere Texte', async () => {
    const young = await generatePictureBook({ ...REQ, targetAge: '6+' }, gateway().gw);
    const older = await generatePictureBook(
      { ...REQ, bookId: 'pb_9', targetAge: '9+' }, gateway().gw);

    expect(young.readingLevel).toBe('pre_reader');
    expect(older.readingLevel).toBe('early_reader');
    expect(older.validation.stats.avgWordsPerSpread)
      .toBeGreaterThan(young.validation.stats.avgWordsPerSpread);
  });

  it('besteht die Prüfung auf jeder Lesestufe', async () => {
    for (const age of ['6+', '9+', '12+'] as const) {
      const r = await generatePictureBook(
        { ...REQ, bookId: `pb_${age}`, targetAge: age }, gateway().gw);
      const blockers = r.validation.issues.filter((i) => i.severity === 'block');
      expect(blockers).toEqual([]);
    }
  });

  it('die Lesestufen sind NICHT ineinander geschachtelt', async () => {
    // Ein 8-Wort-Text ist für ein 3-jähriges Kind richtig und für ein 6-jähriges
    // zu dünn. Eine höhere Stufe ist deshalb nicht einfach "strenger" —
    // sie verschiebt Ober- UND Untergrenze.
    const young = await generatePictureBook({ ...REQ, targetAge: '6+' }, gateway().gw);
    const asOlder = validatePictureBook(young.plan, {
      readingLevel: readingLevelForAge('9+'), pageCount: 32,
    });
    expect(asOlder.issues.map((i) => i.code)).toContain('pb_text_too_short');
  });
});
