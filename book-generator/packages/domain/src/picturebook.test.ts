import { describe, expect, it } from 'vitest';
import type { PictureBookPlan, Spread } from '@abg/schemas';
import {
  ALLOWED_PAGE_COUNTS, composeImagePrompt, finalizePlan, pageCountForSpreads,
  paletteSeedFor, planPages, readingLevelForAge, spreadSeed, stableHash,
} from './picturebook';
import { textImageRedundancy, validatePictureBook } from './picturebook-validate';

// ─── Druckbogen ──────────────────────────────────────────────────────────────

describe('planPages', () => {
  it('ergibt 14 Doppelseiten bei 32 Seiten — die Zahl, mit der Verlage arbeiten', () => {
    expect(planPages(32).storySpreads).toBe(14);
  });

  it('rechnet alle erlaubten Seitenzahlen durch', () => {
    expect(planPages(24).storySpreads).toBe(10);
    expect(planPages(40).storySpreads).toBe(18);
    expect(planPages(48).storySpreads).toBe(22);
  });

  it('beginnt jede Doppelseite auf einer geraden Seite', () => {
    // In einem gebundenen Buch ist Seite 1 rechts. Eine Doppelseite ist immer
    // (gerade links, ungerade rechts).
    for (const p of planPages(32).spreadPages) {
      expect(p[0] % 2).toBe(0);
      expect(p[1]).toBe(p[0] + 1);
    }
  });

  it('lässt Titelei und Impressum frei', () => {
    const plan = planPages(32);
    expect(plan.spreadPages[0]).toEqual([4, 5]);
    expect(plan.spreadPages.at(-1)).toEqual([30, 31]);
    // Seite 32 bleibt für das Impressum.
  });

  it('erlaubt nur druckbare Seitenzahlen', () => {
    expect(ALLOWED_PAGE_COUNTS).toEqual([24, 32, 40, 48]);
  });
});

describe('pageCountForSpreads', () => {
  it('wählt die nächste druckbare Seitenzahl', () => {
    expect(pageCountForSpreads(10)).toBe(24);
    expect(pageCountForSpreads(11)).toBe(32);
    expect(pageCountForSpreads(14)).toBe(32);
    expect(pageCountForSpreads(15)).toBe(40);
  });
});

// ─── Identitäten ─────────────────────────────────────────────────────────────

describe('deterministische Identitäten', () => {
  it('gibt derselben Figur immer dieselbe Farbe', () => {
    expect(paletteSeedFor('Mika')).toBe(paletteSeedFor('Mika'));
    expect(paletteSeedFor('Mika')).not.toBe(paletteSeedFor('Nuri'));
  });

  it('gibt derselben Doppelseite immer denselben Seed', () => {
    expect(spreadSeed('Der Bach', 3)).toBe(spreadSeed('Der Bach', 3));
    expect(spreadSeed('Der Bach', 3)).not.toBe(spreadSeed('Der Bach', 4));
  });

  it('hasht stabil', () => {
    expect(stableHash('abc')).toBe(stableHash('abc'));
    expect(stableHash('abc')).not.toBe(stableHash('abd'));
  });
});

describe('readingLevelForAge', () => {
  it('ordnet Zielalter einer Lesestufe zu', () => {
    expect(readingLevelForAge('6+')).toBe('pre_reader');
    expect(readingLevelForAge('9+')).toBe('early_reader');
    expect(readingLevelForAge('12+')).toBe('independent');
  });
});

// ─── Testdaten ───────────────────────────────────────────────────────────────

function spread(i: number, over: Partial<Spread> = {}): Spread {
  return {
    index: i,
    pages: [4 + (i - 1) * 2, 5 + (i - 1) * 2],
    beat: `Beat ${i}`,
    text: 'Das Wasser war lauter, als sie gedacht hatte. Mika zählte langsam bis drei.',
    imageBrief: {
      subject: 'Mika am Ufer', action: 'steht vor einem breiten Bach',
      setting: 'Waldbach mit glatten Steinen', mood: 'zögernd',
      cameraDistance: i % 3 === 0 ? 'wide' : i % 3 === 1 ? 'medium' : 'close',
      timeOfDay: 'midday',
    },
    charactersPresent: ['hero'],
    layout: (['full_bleed', 'text_left', 'text_right', 'text_bottom'] as const)[i % 4]!,
    textAnchor: 'below_image',
    seed: 1000 + i,
    textEdited: false,
    imageEdited: false,
    ...over,
  };
}

function plan(spreadCount = 14, over: Partial<PictureBookPlan> = {}): PictureBookPlan {
  return {
    title: 'Vielleicht heute',
    dedication: null,
    premise: 'Mika sucht etwas, das es vielleicht gar nicht gibt.',
    refrain: null,
    characters: [{
      slug: 'hero', name: 'Mika', role: 'protagonist',
      visualDescriptor: 'ein Kind, runde Wangen, kurze dunkle Haare, gelbe Regenjacke',
      paletteSeed: 40, scaleRelative: 1, species: 'Kind',
    }],
    style: {
      medium: 'watercolor', paletteName: 'Moosgrün und Salbei', paletteHue: 120,
      lineQuality: 'soft', lighting: 'warm_daylight',
      negativePrompt: 'Text, Buchstaben, verzerrte Hände',
      styleAnchor: 'Kinderbuch-Illustration in Aquarell, weiche Verläufe.',
    },
    spreads: Array.from({ length: spreadCount }, (_, i) => spread(i + 1)),
    ...over,
  };
}

const V = { readingLevel: 'pre_reader' as const, pageCount: 32 as const };
const codes = (r: ReturnType<typeof validatePictureBook>) => r.issues.map((i) => i.code);

// ─── Bildprompt ──────────────────────────────────────────────────────────────

describe('composeImagePrompt', () => {
  const p = plan();

  it('setzt den Figurendeskriptor wörtlich ein — das hält die Figur gleich', () => {
    const prompt = composeImagePrompt(p.spreads[0]!, p);
    expect(prompt).toContain('gelbe Regenjacke');
    expect(prompt).toContain('Mika');
  });

  it('enthält den Stilanker auf jeder Seite', () => {
    for (const s of p.spreads) {
      expect(composeImagePrompt(s, p)).toContain(p.style.styleAnchor);
    }
  });

  it('verbietet Schrift im Bild', () => {
    expect(composeImagePrompt(p.spreads[0]!, p)).toContain('Kein Text, keine Buchstaben');
  });

  it('fordert eine freie Fläche für den Text an', () => {
    expect(composeImagePrompt(p.spreads[0]!, p)).toMatch(/freilassen/);
  });

  it('nennt das Größenverhältnis bei mehreren Figuren', () => {
    const p2 = plan(14, {
      characters: [
        ...plan().characters,
        { slug: 'companion', name: 'Nuri', role: 'companion',
          visualDescriptor: 'ein kleiner Fuchs mit geknicktem Ohr und Halstuch',
          paletteSeed: 20, scaleRelative: 0.55, species: 'Fuchs' },
      ],
      spreads: [spread(1, { charactersPresent: ['hero', 'companion'] })],
    });
    const prompt = composeImagePrompt(p2.spreads[0]!, p2);
    expect(prompt).toContain('Größenverhältnis');
    expect(prompt).toContain('0.55×');
  });

  it('ist deterministisch', () => {
    expect(composeImagePrompt(p.spreads[3]!, p)).toBe(composeImagePrompt(p.spreads[3]!, p));
  });
});

// ─── Redundanz ───────────────────────────────────────────────────────────────

describe('textImageRedundancy — der klassische Bilderbuchfehler', () => {
  it('erkennt Text, der nur das Bild beschreibt', () => {
    const s = spread(1, {
      text: 'Der Hund rennt schnell über die grüne Wiese.',
      imageBrief: { ...spread(1).imageBrief,
        subject: 'Ein Hund', action: 'rennt über eine grüne Wiese' },
    });
    expect(textImageRedundancy(s)).toBeGreaterThanOrEqual(0.6);
  });

  it('gibt Text, der etwas anderes sagt, niedrige Werte', () => {
    const s = spread(1, {
      text: 'Niemand hörte, wie leise die Tür wieder zufiel.',
      imageBrief: { ...spread(1).imageBrief,
        subject: 'Mika am Ufer', action: 'steht vor einem breiten Bach' },
    });
    expect(textImageRedundancy(s)).toBeLessThan(0.3);
  });

  it('meldet Redundanz als Issue mit konkretem Hinweis', () => {
    const p = plan(14);
    p.spreads[2] = spread(3, {
      text: 'Der Hund rennt schnell über die grüne Wiese.',
      imageBrief: { ...spread(3).imageBrief,
        subject: 'Ein Hund', action: 'rennt über eine grüne Wiese' },
    });
    const r = validatePictureBook(p, V);
    const issue = r.issues.find((i) => i.code === 'pb_text_image_redundancy');
    expect(issue).toBeDefined();
    expect(issue?.hint).toContain('NICHT sieht');
  });
});

// ─── Validierung ─────────────────────────────────────────────────────────────

describe('validatePictureBook — Druckbogen', () => {
  it('akzeptiert 14 Doppelseiten bei 32 Seiten', () => {
    expect(validatePictureBook(plan(14), V).ok).toBe(true);
  });

  it('blockiert eine falsche Anzahl Doppelseiten', () => {
    const r = validatePictureBook(plan(13), V);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('pb_spread_count_mismatch');
  });

  it('blockiert falsche Seitenzahlen', () => {
    const p = plan(14);
    p.spreads[0] = spread(1, { pages: [7, 8] });
    expect(codes(validatePictureBook(p, V))).toContain('pb_wrong_page_numbers');
  });

  it('blockiert eine Doppelseite, die links auf einer ungeraden Seite beginnt', () => {
    const p = plan(14);
    p.spreads[0] = spread(1, { pages: [5, 6] });
    expect(codes(validatePictureBook(p, V))).toContain('pb_spread_not_aligned');
  });
});

describe('validatePictureBook — Figuren', () => {
  it('blockiert eine Figur ohne Character Sheet', () => {
    const p = plan(14);
    p.spreads[0] = spread(1, { charactersPresent: ['hero', 'unbekannt'] });
    const r = validatePictureBook(p, V);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('pb_character_without_sheet');
  });

  it('warnt vor einer ungenutzten Figur', () => {
    const p = plan(14, {
      characters: [...plan().characters, {
        slug: 'ghost', name: 'Niemand', role: 'supporting',
        visualDescriptor: 'eine Figur, die im Buch nie auftaucht, grau gekleidet',
        paletteSeed: 1, scaleRelative: 1, species: 'Mensch',
      }],
    });
    expect(codes(validatePictureBook(p, V))).toContain('pb_unused_character');
  });

  it('warnt, wenn die Hauptfigur zu selten zu sehen ist', () => {
    const p = plan(14);
    for (let i = 0; i < 10; i++) {
      p.spreads[i] = spread(i + 1, { charactersPresent: [], layout: 'spot' });
    }
    expect(codes(validatePictureBook(p, V))).toContain('pb_protagonist_absent');
  });
});

describe('validatePictureBook — Lesestufe', () => {
  it('blockiert zu viel Text für 3–5-Jährige', () => {
    const p = plan(14);
    p.spreads[0] = spread(1, {
      text: 'Mika ging langsam weiter und dachte dabei an den Morgen, an das Frühstück, '
        + 'an den Weg über die Wiese, an den kalten Wind und an alles, was noch kommen würde, '
        + 'bevor die Sonne endgültig hinter den Hügeln verschwinden konnte.',
    });
    const r = validatePictureBook(p, V);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('pb_text_too_long');
  });

  it('erlaubt denselben Text auf einer höheren Lesestufe nicht automatisch', () => {
    const p = plan(14);
    p.spreads[0] = spread(1, { text: 'Kurz.' });
    expect(codes(validatePictureBook(p, V))).toContain('pb_text_too_short');
  });

  it('warnt bei zu langen Sätzen', () => {
    const p = plan(14);
    p.spreads[0] = spread(1, {
      text: 'Mika dachte lange über alles nach was an diesem Morgen passiert war und dann noch mehr.',
    });
    expect(codes(validatePictureBook(p, V))).toContain('pb_sentence_too_long');
  });

  it('merkt schwierige Anschlüsse für die kleinste Lesestufe an', () => {
    const p = plan(14);
    p.spreads[0] = spread(1, { text: 'Sie blieb stehen, obwohl der Weg noch weiterging.' });
    expect(codes(validatePictureBook(p, V))).toContain('pb_discouraged_connective');
  });
});

describe('validatePictureBook — Rhythmus', () => {
  it('warnt bei zu wenig Layout-Abwechslung', () => {
    const p = plan(14, {
      spreads: Array.from({ length: 14 }, (_, i) => spread(i + 1, { layout: 'text_left' })),
    });
    expect(codes(validatePictureBook(p, V))).toContain('pb_layout_monotony');
  });

  it('meldet drei gleiche Layouts hintereinander', () => {
    const p = plan(14);
    for (const i of [0, 1, 2]) p.spreads[i] = spread(i + 1, { layout: 'vignette' });
    expect(codes(validatePictureBook(p, V))).toContain('pb_layout_repeat');
  });

  it('vermisst eine randlose Doppelseite für den Höhepunkt', () => {
    const p = plan(14, {
      spreads: Array.from({ length: 14 }, (_, i) =>
        spread(i + 1, { layout: (['text_left', 'text_right', 'vignette'] as const)[i % 3]! })),
    });
    expect(codes(validatePictureBook(p, V))).toContain('pb_no_full_bleed');
  });

  it('meldet vier gleiche Bildausschnitte hintereinander', () => {
    const p = plan(14);
    for (const i of [0, 1, 2, 3]) {
      p.spreads[i] = spread(i + 1, {
        imageBrief: { ...spread(i + 1).imageBrief, cameraDistance: 'medium' },
      });
    }
    expect(codes(validatePictureBook(p, V))).toContain('pb_camera_monotony');
  });

  it('meldet doppelte Beats', () => {
    const p = plan(14);
    p.spreads[5] = spread(6, { beat: 'Beat 1' });
    expect(codes(validatePictureBook(p, V))).toContain('pb_duplicate_beat');
  });
});

describe('validatePictureBook — Refrain und Bild-Briefs', () => {
  it('warnt, wenn ein Refrain zu selten vorkommt', () => {
    const p = plan(14, { refrain: 'Vielleicht heute.' });
    p.spreads[0] = spread(1, { text: 'Sie wartete noch kurz. Vielleicht heute.' });
    expect(codes(validatePictureBook(p, V))).toContain('pb_refrain_underused');
  });

  it('akzeptiert einen Refrain ab drei Vorkommen', () => {
    const p = plan(14, { refrain: 'Vielleicht heute.' });
    for (const i of [0, 4, 9]) {
      p.spreads[i] = spread(i + 1, { text: 'Sie wartete noch kurz. Vielleicht heute.' });
    }
    expect(codes(validatePictureBook(p, V))).not.toContain('pb_refrain_underused');
  });

  it('warnt, wenn der Bild-Brief Schrift im Bild verlangt', () => {
    const p = plan(14);
    p.spreads[0] = spread(1, {
      imageBrief: { ...spread(1).imageBrief, setting: 'vor einem Schild mit großen Buchstaben' },
    });
    const r = validatePictureBook(p, V);
    expect(codes(r)).toContain('pb_text_in_image_risk');
    expect(r.issues.find((i) => i.code === 'pb_text_in_image_risk')?.hint)
      .toContain('Typografie');
  });
});

describe('validatePictureBook — Kennzahlen', () => {
  it('liefert brauchbare Statistik', () => {
    const r = validatePictureBook(plan(14), V);
    expect(r.stats.spreads).toBe(14);
    expect(r.stats.totalWords).toBeGreaterThan(100);
    expect(r.stats.avgWordsPerSpread).toBeGreaterThan(5);
    expect(r.stats.layoutsUsed).toBeGreaterThanOrEqual(3);
    expect(r.stats.charactersUsed).toBe(1);
  });

  it('sortiert Blocker vor Warnungen', () => {
    const r = validatePictureBook(plan(13), V);
    expect(r.issues[0]?.severity).toBe('block');
  });
});

// ─── finalizePlan ────────────────────────────────────────────────────────────

describe('finalizePlan', () => {
  const draft = {
    title: 'Vielleicht heute',
    premise: 'Mika sucht etwas, das es vielleicht gar nicht gibt.',
    refrain: null,
    characters: [{
      slug: 'hero', name: 'Mika', role: 'protagonist' as const,
      visualDescriptor: 'ein Kind, runde Wangen, kurze dunkle Haare, gelbe Regenjacke',
      scaleRelative: 1, species: 'Kind',
    }],
    style: plan().style,
    spreads: Array.from({ length: 14 }, (_, i) => {
      const { pages: _p, seed: _s, textEdited: _t, imageEdited: _i, ...rest } = spread(i + 1);
      return rest;
    }),
  };

  it('vergibt Seitenzahlen und Seeds', () => {
    const p = finalizePlan(draft, 32);
    expect(p.spreads[0]!.pages).toEqual([4, 5]);
    expect(p.spreads[13]!.pages).toEqual([30, 31]);
    expect(p.spreads[0]!.seed).toBeGreaterThan(0);
  });

  it('leitet fehlende Farbidentitäten aus dem Namen ab', () => {
    const p = finalizePlan(draft, 32);
    expect(p.characters[0]!.paletteSeed).toBe(paletteSeedFor('Mika'));
  });

  it('ist deterministisch', () => {
    expect(JSON.stringify(finalizePlan(draft, 32)))
      .toBe(JSON.stringify(finalizePlan(draft, 32)));
  });

  it('erzeugt einen Plan, der die Prüfung besteht', () => {
    expect(validatePictureBook(finalizePlan(draft, 32), V).ok).toBe(true);
  });
});
