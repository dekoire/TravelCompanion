import { describe, expect, it } from 'vitest';
import type { BookSpec } from '@abg/schemas';
import { WizardInput } from '@abg/schemas';
import { deriveSpec } from './derive';
import { validateSpec } from './validate';

const OPTS = {
  bookId: 'b_test', modelProfileId: 'mp_test', promptRegistryVersion: 'pr_test',
  now: () => '2026-08-22T10:00:00.000Z',
};

function spec(partial: Record<string, unknown> = {}): BookSpec {
  return deriveSpec(
    WizardInput.parse({ bookType: 'novel', genre: 'mystery', language: 'de-DE', ...partial }),
    OPTS,
  );
}

/** Erzwingt eine Konfiguration, die deriveSpec so nie erzeugen würde. */
function forced(base: BookSpec, override: Partial<BookSpec['scope']>): BookSpec {
  return { ...base, scope: { ...base.scope, ...override } };
}

const codes = (list: Array<{ code: string }>) => list.map((f) => f.code);

describe('validateSpec — gültige Specs', () => {
  it('akzeptiert eine normale Roman-Spec', () => {
    const r = validateSpec(spec({ targetWords: 82_000 }));
    expect(r.ok).toBe(true);
    expect(r.blockers).toHaveLength(0);
  });

  it('akzeptiert ein Kinderbuch mit kurzen Kapiteln', () => {
    const r = validateSpec(spec({ bookType: 'chapter_book', targetWords: 10_000 }));
    expect(r.ok).toBe(true);
  });

  it('akzeptiert eine Kurzgeschichte', () => {
    const r = validateSpec(spec({ bookType: 'short_story', targetWords: 8_000 }));
    expect(r.ok).toBe(true);
  });
});

describe('V001 — Wortzahl außerhalb des Typkorridors', () => {
  it('blockiert einen 5.000-Wörter-Roman', () => {
    const s = forced(spec({ targetWords: 82_000 }), { targetWords: 5_000 });
    const r = validateSpec(s);
    expect(codes(r.blockers)).toContain('V001');
  });

  it('liefert brauchbare Gegenvorschläge', () => {
    const s = forced(spec({ targetWords: 82_000 }), { targetWords: 5_000 });
    const v001 = validateSpec(s).blockers.find((b) => b.code === 'V001');
    expect(v001?.suggestions.length).toBeGreaterThan(0);
    expect(v001?.suggestions[0]?.patch).toBeDefined();
  });
});

describe('V002/V003 — der Fall aus dem Ausgangskonzept', () => {
  // "30 Kapitel × 350 Wörter dürfen nicht als 220-Seiten-Roman verkauft werden."
  const broken = () => forced(spec({ targetWords: 80_000 }), {
    targetWords: 80_000, targetChapters: 30, wordsPerChapter: 350,
  });

  it('blockiert, statt nur zu warnen', () => {
    const r = validateSpec(broken());
    expect(r.ok).toBe(false);
    expect(codes(r.blockers)).toContain('V003');
    expect(codes(r.blockers)).toContain('V002');
  });

  it('erklärt die Abweichung mit Zahlen', () => {
    const v002 = validateSpec(broken()).blockers.find((b) => b.code === 'V002');
    expect(v002?.message).toContain('10.500');
    expect(v002?.message).toContain('80.000');
  });

  it('bietet drei Auswege an', () => {
    const v002 = validateSpec(broken()).blockers.find((b) => b.code === 'V002');
    expect(v002?.suggestions.length).toBe(3);
  });

  it('warnt nur bei kleiner Abweichung', () => {
    const s = forced(spec({ targetWords: 80_000 }), {
      targetWords: 80_000, targetChapters: 28, wordsPerChapter: 3_100,  // 86.800, +8,5 %
    });
    const r = validateSpec(s);
    expect(codes(r.blockers)).not.toContain('V002');
    expect(codes(r.warnings)).toContain('W001');
  });
});

describe('V003 — Mindestkapitellänge ist typabhängig', () => {
  it('blockiert 350 Wörter pro Kapitel bei einem Roman', () => {
    const s = forced(spec({ targetWords: 80_000 }), { wordsPerChapter: 350, targetChapters: 229 });
    expect(codes(validateSpec(s).blockers)).toContain('V003');
  });

  it('erlaubt 350 Wörter pro Kapitel bei einem Erstlesebuch', () => {
    const s = spec({ bookType: 'early_reader', targetWords: 3_500, wordsPerChapter: 350 });
    expect(codes(validateSpec(s).blockers)).not.toContain('V003');
  });

  it('schlägt bei einem Roman den Wechsel zum Kinderbuch vor', () => {
    const s = forced(spec({ targetWords: 80_000 }), { wordsPerChapter: 350, targetChapters: 229 });
    const v003 = validateSpec(s).blockers.find((b) => b.code === 'V003');
    expect(JSON.stringify(v003?.suggestions)).toContain('chapter_book');
  });
});

describe('V004/V005 — obere Grenzen', () => {
  it('blockiert zu lange Kapitel', () => {
    const s = forced(spec({ targetWords: 90_000 }), { wordsPerChapter: 9_000, targetChapters: 10 });
    expect(codes(validateSpec(s).blockers)).toContain('V004');
  });

  it('blockiert zu viele Kapitel', () => {
    const s = forced(spec({ targetWords: 80_000 }), { targetChapters: 120, wordsPerChapter: 667 });
    expect(codes(validateSpec(s).blockers)).toContain('V005');
  });
});

describe('V006/V007/V008 — Rating gegen Zielalter', () => {
  it('blockiert sexuelle Inhalte bei Zielalter 12+', () => {
    const s = spec({ rating: { targetAge: '12+', sexualContent: 'implied' } });
    expect(codes(validateSpec(s).blockers)).toContain('V006');
  });

  it('blockiert drastische Gewalt bei Zielalter 9+', () => {
    const s = spec({ rating: { targetAge: '9+', violence: 'graphic' } });
    expect(codes(validateSpec(s).blockers)).toContain('V006');
  });

  it('blockiert explizite Inhalte bei 16+', () => {
    const s = spec({ rating: { targetAge: '16+', sexualContent: 'explicit' } });
    expect(codes(validateSpec(s).blockers)).toContain('V007');
  });

  it('erlaubt explizite Inhalte bei 18+', () => {
    const s = spec({ rating: { targetAge: '18+', sexualContent: 'explicit' } });
    expect(codes(validateSpec(s).blockers)).not.toContain('V007');
  });

  it('blockiert dargestellte Selbstverletzung unter 16', () => {
    const s = spec({ rating: { targetAge: '12+', selfHarm: 'depicted' } });
    expect(codes(validateSpec(s).blockers)).toContain('V008');
  });

  it('erlaubt Erwähnung von Selbstverletzung bei 16+', () => {
    const s = spec({ rating: { targetAge: '16+', selfHarm: 'referenced' } });
    expect(codes(validateSpec(s).blockers)).not.toContain('V008');
  });
});

describe('V011/V012 — Perspektive', () => {
  it('blockiert eine unbekannte Perspektivfigur', () => {
    const base = spec({ characters: [{ role: 'protagonist', name: 'June', traits: [] }] });
    const s: BookSpec = {
      ...base,
      form: { ...base.form, povMode: { kind: 'single', characterName: 'Tomas' } },
    };
    expect(codes(validateSpec(s).blockers)).toContain('V011');
  });

  it('bietet die vorhandenen Figuren als Korrektur an', () => {
    const base = spec({ characters: [{ role: 'protagonist', name: 'June', traits: [] }] });
    const s: BookSpec = {
      ...base,
      form: { ...base.form, povMode: { kind: 'single', characterName: 'Tomas' } },
    };
    const v011 = validateSpec(s).blockers.find((b) => b.code === 'V011');
    expect(v011?.suggestions[0]?.label).toContain('June');
  });

  it('blockiert rotierende Perspektive mit unbekannten Figuren', () => {
    const s = spec({
      characters: [{ role: 'protagonist', name: 'June', traits: [] }],
      povOrder: ['June', 'Unbekannt'],
    });
    expect(codes(validateSpec(s).blockers)).toContain('V011');
  });
});

describe('V014/V015 — Sprache und Sachbuch', () => {
  it('blockiert eine nicht unterstützte Sprache', () => {
    const base = spec();
    const s: BookSpec = { ...base, form: { ...base.form, language: 'ja-JP' as never } };
    expect(codes(validateSpec(s).blockers)).toContain('V014');
  });

  it('blockiert ein Sachbuch ohne Thema', () => {
    const s = spec({ bookType: 'guidebook', targetWords: 40_000, userIdea: '' });
    expect(codes(validateSpec(s).blockers)).toContain('V015');
  });

  it('akzeptiert ein Sachbuch mit Thema', () => {
    const s = spec({
      bookType: 'guidebook', targetWords: 40_000,
      userIdea: 'Cashflow-Steuerung in kleinen Handwerksbetrieben, praxisnah erklärt.',
    });
    expect(codes(validateSpec(s).blockers)).not.toContain('V015');
  });
});

describe('Warnungen blockieren nicht', () => {
  it('warnt bei sehr großen Büchern', () => {
    const s = spec({ bookType: 'epic', targetWords: 200_000 });
    const r = validateSpec(s);
    expect(codes(r.warnings)).toContain('W006');
    expect(r.ok).toBe(true);
  });

  it('warnt bei zu vielen Themen', () => {
    const s = spec({ themes: ['a', 'b', 'c', 'd', 'e'] });
    // deriveSpec kappt auf 5 — die Warnung greift ab 5.
    expect(codes(validateSpec(s).warnings)).toContain('W003');
  });

  it('warnt bei Humor im Horror', () => {
    const s = spec({ genre: 'horror', style: { humorLevel: 'high' } });
    expect(codes(validateSpec(s).warnings)).toContain('W004');
  });

  it('warnt bei Du-Perspektive', () => {
    const s = spec({ pov: 'second' });
    expect(codes(validateSpec(s).warnings)).toContain('W005');
  });

  it('warnt bei Hörbuch mit wechselnder Perspektive', () => {
    const s = spec({ povOrder: ['A', 'B'], deliverables: { audiobook: true } });
    expect(codes(validateSpec(s).warnings)).toContain('W009');
  });
});

describe('Robustheit', () => {
  it('liefert für jeden Blocker eine verständliche Meldung', () => {
    const s = forced(spec({ targetWords: 80_000 }), {
      targetWords: 80_000, targetChapters: 30, wordsPerChapter: 350,
    });
    for (const b of validateSpec(s).blockers) {
      expect(b.message.length).toBeGreaterThan(20);
      expect(b.field).toBeTruthy();
      expect(b.code).toMatch(/^V\d{3}$/);
    }
  });

  it('erzeugt keine Duplikate desselben Codes für dasselbe Feld', () => {
    const r = validateSpec(spec({ targetWords: 82_000 }));
    const keys = [...r.blockers, ...r.warnings].map((f) => `${f.code}:${f.field}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
