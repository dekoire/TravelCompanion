import { describe, expect, it } from 'vitest';
import {
  budgetState, costCents, creditsForBook, estimateBudget, rebalanceChapterTarget,
} from './budget';
import { getLocale } from './locale';

const DE = getLocale('de-DE');
const EN = getLocale('en-US');

describe('estimateBudget', () => {
  const de100k = estimateBudget({
    targetWords: 100_000, targetChapters: 30, sizeClass: 'L', tokensPerWord: DE.tokensPerWord,
  });

  it('liegt für 100k Wörter Deutsch im dokumentierten Korridor', () => {
    // Doku 18 §2.2: realistischer Normalfall 450k–600k Output-Tokens.
    const total = de100k.draftOutputTokens + de100k.supportOutputTokens + de100k.repairOutputTokens;
    expect(total).toBeGreaterThan(430_000);
    expect(total).toBeLessThan(640_000);
  });

  it('setzt den sichtbaren Kapiteltext als größten Einzelposten an', () => {
    expect(de100k.draftOutputTokens).toBeGreaterThan(de100k.repairOutputTokens);
    expect(de100k.phases['draft']!.output).toBeGreaterThan(de100k.phases['audits']!.output);
  });

  it('rechnet Deutsch deutlich teurer als Englisch', () => {
    const en = estimateBudget({
      targetWords: 100_000, targetChapters: 30, sizeClass: 'L', tokensPerWord: EN.tokensPerWord,
    });
    const ratio = de100k.maxOutputTokens / en.maxOutputTokens;
    expect(ratio).toBeGreaterThan(1.4);
    expect(ratio).toBeLessThan(1.6);
  });

  it('belastet kleine Bücher anteilig stärker mit dem Planungssockel', () => {
    const xs = estimateBudget({ targetWords: 8_000, targetChapters: 5, sizeClass: 'XS', tokensPerWord: 2 });
    const m = estimateBudget({ targetWords: 80_000, targetChapters: 28, sizeClass: 'M', tokensPerWord: 2 });
    const perWordXs = xs.maxOutputTokens / 8_000;
    const perWordM = m.maxOutputTokens / 80_000;
    expect(perWordXs).toBeGreaterThan(perWordM);
  });

  it('liefert eine vollständige Phasenaufschlüsselung', () => {
    for (const phase of ['planning', 'draft', 'extraction', 'audits', 'repairs']) {
      expect(de100k.phases[phase]!.output).toBeGreaterThan(0);
      expect(de100k.phases[phase]!.input).toBeGreaterThan(0);
    }
  });

  it('plant mehr Input als Output ein', () => {
    expect(de100k.maxInputTokens).toBeGreaterThan(de100k.maxOutputTokens * 3);
  });
});

describe('costCents', () => {
  const price = {
    inputPerMTok: 30, cachedInputPerMTok: 7.5, outputPerMTok: 250, thinkingPerMTok: 250,
  };

  it('rechnet ohne Cache korrekt', () => {
    const c = costCents({ inputTokens: 1_000_000, cachedInputTokens: 0,
      outputTokens: 1_000_000, thinkingTokens: 0 }, price);
    expect(c).toBeCloseTo(280, 1);
  });

  it('macht Caching sichtbar günstiger', () => {
    const without = costCents({ inputTokens: 1_000_000, cachedInputTokens: 0,
      outputTokens: 0, thinkingTokens: 0 }, price);
    const withCache = costCents({ inputTokens: 1_000_000, cachedInputTokens: 550_000,
      outputTokens: 0, thinkingTokens: 0 }, price);
    expect(withCache).toBeLessThan(without);
    expect(withCache / without).toBeCloseTo(0.5875, 2);
  });

  it('ist bei Nullverbrauch null', () => {
    expect(costCents({ inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, thinkingTokens: 0 },
      price)).toBe(0);
  });
});

describe('rebalanceChapterTarget', () => {
  const base = { targetWords: 84_000, totalChapters: 28, plannedNext: 3_000 };

  it('gleicht einen Rückstand aus, ohne zu übersteuern', () => {
    // 10 Kapitel geschrieben, aber nur 25.000 statt 30.000 Wörter.
    const t = rebalanceChapterTarget({ ...base, committedWords: 25_000, committedChapters: 10 });
    expect(t).toBeGreaterThan(3_000);
    expect(t).toBeLessThanOrEqual(3_750);   // max +25 %
  });

  it('gleicht einen Überschuss aus', () => {
    const t = rebalanceChapterTarget({ ...base, committedWords: 35_000, committedChapters: 10 });
    expect(t).toBeLessThan(3_000);
    expect(t).toBeGreaterThanOrEqual(2_250); // max -25 %
  });

  it('kürzt den Climax nie', () => {
    const t = rebalanceChapterTarget({
      ...base, committedWords: 40_000, committedChapters: 10, isClimax: true,
    });
    expect(t).toBeGreaterThanOrEqual(3_000);
  });

  it('bleibt stabil, wenn alles nach Plan läuft', () => {
    const t = rebalanceChapterTarget({ ...base, committedWords: 30_000, committedChapters: 10 });
    expect(t).toBe(3_000);
  });

  it('ist am Buchende unauffällig', () => {
    const t = rebalanceChapterTarget({ ...base, committedWords: 84_000, committedChapters: 28 });
    expect(t).toBe(3_000);
  });
});

describe('budgetState', () => {
  const base = { budgetTokens: 100_000, totalChapters: 28, hardStopPct: 130 };

  it('meldet ok im Plan', () => {
    expect(budgetState({ ...base, spentTokens: 30_000, committedChapters: 10 }).state).toBe('ok');
  });

  it('warnt bei 80 % Verbrauch', () => {
    expect(budgetState({ ...base, spentTokens: 82_000, committedChapters: 25 }).state).toBe('warn');
  });

  it('warnt bei ungünstiger Hochrechnung, obwohl noch Budget da ist', () => {
    // 5 von 28 Kapiteln haben 25 % verbraucht -> Hochrechnung 140 %.
    const r = budgetState({ ...base, spentTokens: 25_000, committedChapters: 5 });
    expect(r.projectedPct).toBeGreaterThan(115);
    expect(r.state).toBe('over');
  });

  it('stoppt hart bei 130 %', () => {
    expect(budgetState({ ...base, spentTokens: 131_000, committedChapters: 27 }).state)
      .toBe('hard_stop');
  });
});

describe('creditsForBook', () => {
  it('rechnet 1 Credit je 1.000 Zielwörter für mittlere Bücher', () => {
    expect(creditsForBook(80_000, 'M')).toBe(80);
  });

  it('belastet Kurzgeschichten anteilig stärker', () => {
    expect(creditsForBook(10_000, 'XS')).toBeGreaterThan(10);
  });

  it('belastet sehr große Bücher etwas stärker', () => {
    expect(creditsForBook(200_000, 'XL')).toBeGreaterThan(200);
  });
});
