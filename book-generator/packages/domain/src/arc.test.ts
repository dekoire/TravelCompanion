import { describe, expect, it } from 'vitest';
import { computeArc, largestRemainder, tensionTarget, deterministicNoise } from './arc';

describe('largestRemainder', () => {
  it('trifft die Gesamtsumme exakt', () => {
    const r = largestRemainder([2.4, 3.3, 4.3], 10, 0);
    expect(r.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('hält das Minimum je Position ein', () => {
    const r = largestRemainder([0.1, 0.1, 9.8], 12, 1);
    expect(Math.min(...r)).toBeGreaterThanOrEqual(1);
    expect(r.reduce((a, b) => a + b, 0)).toBe(12);
  });

  it('korrigiert nach unten, wenn das Minimum die Summe überzieht', () => {
    const r = largestRemainder([1, 1, 1, 1], 4, 1);
    expect(r).toEqual([1, 1, 1, 1]);
  });

  it('wirft, wenn die Verteilung unmöglich ist', () => {
    expect(() => largestRemainder([1, 1, 1], 2, 1)).toThrow();
  });

  it('ist deterministisch', () => {
    expect(largestRemainder([2.5, 2.5, 5], 10, 0))
      .toEqual(largestRemainder([2.5, 2.5, 5], 10, 0));
  });
});

describe('computeArc', () => {
  const arc = computeArc({ targetWords: 82_000, targetChapters: 28, actCount: 4 });

  it('verteilt alle Kapitel lückenlos', () => {
    expect(arc.acts.reduce((a, x) => a + x.chapterCount, 0)).toBe(28);
    for (let i = 1; i < arc.acts.length; i++) {
      expect(arc.acts[i]!.chapterFrom).toBe(arc.acts[i - 1]!.chapterTo + 1);
    }
    expect(arc.acts[0]!.chapterFrom).toBe(1);
    expect(arc.acts.at(-1)!.chapterTo).toBe(28);
  });

  it('verteilt das Wortbudget exakt', () => {
    expect(arc.acts.reduce((a, x) => a + x.wordBudget, 0)).toBe(82_000);
  });

  it('gibt den Akten ein plausibles Größenverhältnis', () => {
    // Mittelakte sind länger als Anfang und Ende.
    expect(arc.acts[1]!.wordBudget).toBeGreaterThan(arc.acts[0]!.wordBudget);
    expect(arc.acts[2]!.wordBudget).toBeGreaterThan(arc.acts[3]!.wordBudget);
  });

  it('legt opening_image in Kapitel 1', () => {
    expect(arc.anchorChapters['opening_image']).toBe(1);
  });

  it('legt den Midpoint in die Buchmitte', () => {
    const mid = arc.anchorChapters['midpoint']!;
    expect(mid).toBeGreaterThanOrEqual(13);
    expect(mid).toBeLessThanOrEqual(16);
  });

  it('hält die Ankerreihenfolge ein', () => {
    const order = ['opening_image', 'inciting_incident', 'first_threshold', 'midpoint',
                   'all_is_lost', 'climax', 'resolution'];
    const chapters = order.map((b) => arc.anchorChapters[b]!);
    for (let i = 1; i < chapters.length; i++) {
      expect(chapters[i]!).toBeGreaterThan(chapters[i - 1]!);
    }
  });

  it('ordnet jeden Anker einem Akt zu', () => {
    const assigned = arc.acts.flatMap((a) => a.anchors.map((x) => x.beat));
    for (const beat of Object.keys(arc.anchorChapters)) {
      expect(assigned).toContain(beat);
    }
  });

  it('funktioniert mit drei Akten', () => {
    const a3 = computeArc({ targetWords: 30_000, targetChapters: 12, actCount: 3 });
    expect(a3.acts).toHaveLength(3);
    expect(a3.acts.reduce((s, x) => s + x.chapterCount, 0)).toBe(12);
  });

  it('funktioniert ohne Akte (Kurzgeschichte)', () => {
    const a1 = computeArc({ targetWords: 6_000, targetChapters: 3, actCount: 1 });
    expect(a1.acts).toHaveLength(1);
    expect(a1.acts[0]!.chapterCount).toBe(3);
  });

  it('kommt mit genau so vielen Kapiteln wie Akten zurecht', () => {
    const a = computeArc({ targetWords: 20_000, targetChapters: 4, actCount: 4 });
    expect(a.acts.every((x) => x.chapterCount === 1)).toBe(true);
  });

  it('ist deterministisch', () => {
    const b = computeArc({ targetWords: 82_000, targetChapters: 28, actCount: 4 });
    expect(JSON.stringify(b)).toBe(JSON.stringify(arc));
  });
});

describe('tensionTarget', () => {
  const arc = computeArc({ targetWords: 82_000, targetChapters: 28, actCount: 4 });

  it('bleibt im gültigen Bereich', () => {
    for (let i = 1; i <= 28; i++) {
      const t = tensionTarget(i, 28, arc);
      expect(t).toBeGreaterThanOrEqual(5);
      expect(t).toBeLessThanOrEqual(100);
    }
  });

  it('steigt über das Buch hinweg', () => {
    const early = tensionTarget(3, 28, arc);
    const late = tensionTarget(25, 28, arc);
    expect(late).toBeGreaterThan(early);
  });

  it('erhöht die Spannung im Climax', () => {
    const climax = arc.anchorChapters['climax']!;
    expect(tensionTarget(climax, 28, arc)).toBeGreaterThan(tensionTarget(climax - 3, 28, arc));
  });

  it('senkt die Spannung in der Auflösung', () => {
    const res = arc.anchorChapters['resolution']!;
    const climax = arc.anchorChapters['climax']!;
    expect(tensionTarget(res, 28, arc)).toBeLessThan(tensionTarget(climax, 28, arc));
  });

  it('ist nicht monoton — sonst wäre die Kurve ein Sägezahn ohne Atempausen', () => {
    const values = Array.from({ length: 28 }, (_, i) => tensionTarget(i + 1, 28, arc));
    const drops = values.filter((v, i) => i > 0 && v < values[i - 1]!).length;
    expect(drops).toBeGreaterThan(2);
  });

  it('ist deterministisch', () => {
    expect(tensionTarget(14, 28, arc)).toBe(tensionTarget(14, 28, arc));
  });
});

describe('deterministicNoise', () => {
  it('liefert für gleiche Eingabe gleiches Rauschen', () => {
    expect(deterministicNoise(7, 5)).toBe(deterministicNoise(7, 5));
  });

  it('bleibt in der Amplitude', () => {
    for (let i = 0; i < 50; i++) {
      expect(Math.abs(deterministicNoise(i, 5))).toBeLessThanOrEqual(5);
    }
  });

  it('unterscheidet sich zwischen Kapiteln', () => {
    expect(deterministicNoise(1, 5)).not.toBe(deterministicNoise(2, 5));
  });
});
