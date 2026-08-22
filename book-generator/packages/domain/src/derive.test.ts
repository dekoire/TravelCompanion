import { describe, expect, it } from 'vitest';
import { WizardInput } from '@abg/schemas';
import { deriveScope, deriveSpec, freezeSpec, stableStringify } from './derive';
import { sha256 } from './idempotency';

const OPTS = {
  bookId: 'b_test',
  modelProfileId: 'mp_test',
  promptRegistryVersion: 'pr_test',
  now: () => '2026-08-22T10:00:00.000Z',
};

function input(partial: Record<string, unknown> = {}) {
  return WizardInput.parse({ bookType: 'novel', genre: 'mystery', language: 'de-DE', ...partial });
}

describe('deriveScope', () => {
  it('leitet Kapitelanzahl aus der Zielwortzahl ab', () => {
    const s = deriveScope(input({ targetWords: 82_000 }));
    expect(s.targetChapters).toBeGreaterThan(20);
    expect(s.targetChapters).toBeLessThan(35);
    // Kapitel × Wörter muss zum Ziel passen — das ist die Kernzusage.
    const product = s.targetChapters * s.wordsPerChapter;
    expect(Math.abs(product - 82_000) / 82_000).toBeLessThan(0.05);
  });

  it('respektiert eine vorgegebene Kapitelanzahl', () => {
    const s = deriveScope(input({ targetWords: 80_000, targetChapters: 20 }));
    expect(s.targetChapters).toBe(20);
    expect(s.wordsPerChapter).toBe(4_000);
  });

  it('leitet Kapitelanzahl aus Kapitellänge ab', () => {
    const s = deriveScope(input({ targetWords: 60_000, wordsPerChapter: 3_000 }));
    expect(s.targetChapters).toBe(20);
  });

  it('ist deterministisch', () => {
    const a = deriveScope(input({ targetWords: 82_000 }));
    const b = deriveScope(input({ targetWords: 82_000 }));
    expect(a).toEqual(b);
  });

  it('klassifiziert Größen korrekt', () => {
    expect(deriveScope(input({ bookType: 'short_story', targetWords: 8_000 })).sizeClass).toBe('XS');
    expect(deriveScope(input({ bookType: 'novella', targetWords: 30_000 })).sizeClass).toBe('S');
    expect(deriveScope(input({ targetWords: 80_000 })).sizeClass).toBe('M');
    expect(deriveScope(input({ targetWords: 120_000 })).sizeClass).toBe('L');
    expect(deriveScope(input({ bookType: 'epic', targetWords: 200_000 })).sizeClass).toBe('XL');
  });

  it('vergibt Parts nur bei XL', () => {
    expect(deriveScope(input({ targetWords: 80_000 })).partCount).toBeNull();
    const xl = deriveScope(input({ bookType: 'epic', targetWords: 210_000 }));
    expect(xl.partCount).toBeGreaterThanOrEqual(2);
    expect(xl.partCount).toBeLessThanOrEqual(6);
  });

  it('reduziert Akte bei wenigen Kapiteln', () => {
    const s = deriveScope(input({ targetWords: 60_000, targetChapters: 8 }));
    expect(s.actCount).toBeLessThanOrEqual(3);
  });

  it('setzt einen sinnvollen Szenenkorridor', () => {
    const s = deriveScope(input({ targetWords: 82_000 }));
    expect(s.scenesPerChapter[0]).toBeGreaterThanOrEqual(1);
    expect(s.scenesPerChapter[1]).toBeGreaterThan(s.scenesPerChapter[0]);
    expect(s.scenesPerChapter[1]).toBeLessThanOrEqual(8);
  });

  it('funktioniert ohne jede Umfangsangabe', () => {
    const s = deriveScope(input());
    expect(s.targetWords).toBeGreaterThan(0);
    expect(s.targetChapters).toBeGreaterThan(0);
    expect(s.wordsPerChapter).toBeGreaterThan(0);
  });
});

describe('deriveSpec', () => {
  it('füllt eine minimale Eingabe zu einer vollständigen Spec auf', () => {
    const spec = deriveSpec(input({ userIdea: 'Eine Archivarin findet einen Brief.' }), OPTS);
    expect(spec.specVersion).toBe('1.0.0');
    expect(spec.form.tense).toBe('past');
    expect(spec.form.style.quoteStyle).toBe('de_low_high');
    expect(spec.deliverables.formats.length).toBeGreaterThan(0);
    expect(spec.budget.maxOutputTokens).toBeGreaterThan(0);
  });

  it('setzt die harten Sperren immer, auch wenn der Nutzer sie weglässt', () => {
    const spec = deriveSpec(input({ rating: { targetAge: '18+' } }), OPTS);
    expect(spec.rating.hardBlocks).toContain('sexual_content_minors');
    expect(spec.rating.hardBlocks).toHaveLength(4);
  });

  it('kann harte Sperren nicht durch Nutzereingabe überschreiben', () => {
    const spec = deriveSpec(input({ rating: { hardBlocks: [] } }), OPTS);
    expect(spec.rating.hardBlocks).toHaveLength(4);
  });

  it('setzt bei Kinderbüchern ein konservatives Rating', () => {
    const spec = deriveSpec(input({ bookType: 'chapter_book', targetWords: 10_000 }), OPTS);
    expect(spec.rating.targetAge).toBe('9+');
    expect(spec.rating.violence).toBe('mild');
    expect(spec.rating.sexualContent).toBe('none');
  });

  it('wählt Anführungszeichen nach Sprache', () => {
    expect(deriveSpec(input({ language: 'en-US' }), OPTS).form.style.quoteStyle).toBe('en_double');
    expect(deriveSpec(input({ language: 'fr-FR' }), OPTS).form.style.quoteStyle).toBe('fr_guillemets');
    expect(deriveSpec(input({ language: 'de-CH' }), OPTS).form.style.quoteStyle).toBe('de_guillemets');
  });

  it('leitet die Perspektivfigur aus dem Protagonisten ab', () => {
    const spec = deriveSpec(input({
      characters: [{ role: 'protagonist', name: 'June Weber', traits: [] }],
    }), OPTS);
    expect(spec.form.povMode).toEqual({ kind: 'single', characterName: 'June Weber' });
  });

  it('nutzt rotierende Perspektive, wenn mehrere angegeben sind', () => {
    const spec = deriveSpec(input({ povOrder: ['June', 'Tomas'] }), OPTS);
    expect(spec.form.povMode.kind).toBe('rotating');
  });

  it('fällt ohne Figuren auf auktorial zurück', () => {
    expect(deriveSpec(input(), OPTS).form.povMode.kind).toBe('omniscient');
  });

  it('leitet den Track aus dem Buchtyp ab, nicht aus der Nutzerangabe', () => {
    const spec = deriveSpec(input({ bookType: 'guidebook', track: 'fiction' }), OPTS);
    expect(spec.track).toBe('non_fiction');
  });

  it('rechnet das Budget mit der Token-Rate der Sprache', () => {
    const de = deriveSpec(input({ targetWords: 80_000, language: 'de-DE' }), OPTS);
    const en = deriveSpec(input({ targetWords: 80_000, language: 'en-US' }), OPTS);
    // Deutsch braucht ~2,0 Tokens/Wort, Englisch ~1,35 — das ist der Punkt,
    // an dem eine englische Kalkulation um ~45 % danebenliegt.
    expect(de.budget.maxOutputTokens).toBeGreaterThan(en.budget.maxOutputTokens * 1.3);
  });

  it('ist deterministisch bei fixierter Zeitquelle', () => {
    const a = deriveSpec(input({ targetWords: 80_000 }), OPTS);
    const b = deriveSpec(input({ targetWords: 80_000 }), OPTS);
    expect(stableStringify(a)).toBe(stableStringify(b));
  });
});

describe('freezeSpec', () => {
  it('setzt einen Hash', () => {
    const spec = freezeSpec(deriveSpec(input(), OPTS), sha256);
    expect(spec.specHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('ändert den Hash nicht bei reinem Modellwechsel', () => {
    const base = deriveSpec(input(), OPTS);
    const a = freezeSpec(base, sha256);
    const b = freezeSpec({ ...base, technical: { ...base.technical, modelProfileId: 'mp_other' } }, sha256);
    // technical.* fließt bewusst nicht in die Spec-Identität ein.
    expect(a.specHash).toBe(b.specHash);
  });

  it('ändert den Hash bei inhaltlicher Änderung', () => {
    const a = freezeSpec(deriveSpec(input({ targetWords: 80_000 }), OPTS), sha256);
    const b = freezeSpec(deriveSpec(input({ targetWords: 90_000 }), OPTS), sha256);
    expect(a.specHash).not.toBe(b.specHash);
  });
});

describe('stableStringify', () => {
  it('ist unabhängig von der Schlüsselreihenfolge', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });

  it('behält Array-Reihenfolge bei', () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });
});
