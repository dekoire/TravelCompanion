import type { SizeClass } from '@abg/schemas';

/**
 * Token- und Kostenmodell (18 §2). Alle Anteile sind auf die sichtbare
 * Textmenge bezogen und stammen aus der Kalkulation in der Doku.
 */
export interface BudgetEstimate {
  /** Sichtbarer Kapiteltext. */
  draftOutputTokens: number;
  /** Planung, Extraktion, Summaries, Checks, Audits, Rebuild. */
  supportOutputTokens: number;
  /** Reserve fuer Reparaturen. */
  repairOutputTokens: number;
  maxOutputTokens: number;
  maxInputTokens: number;
  maxThinkingTokens: number;
  /** Aufschluesselung fuer die UI und fuer Kostenprognosen. */
  phases: Record<string, { output: number; input: number }>;
}

/** Anteile relativ zum sichtbaren Output (aus der Beispielkalkulation 18 §2.2). */
const PHASE_RATIOS: Record<string, { output: number; input: number }> = {
  planning:      { output: 0.09,  input: 0.45 },
  outlines:      { output: 0.07,  input: 0.30 },
  chapterCards:  { output: 0.11,  input: 0.90 },
  sceneCards:    { output: 0.10,  input: 1.10 },
  styleCalib:    { output: 0.105, input: 0.20 },
  draft:         { output: 1.00,  input: 1.80 },
  extraction:    { output: 0.225, input: 0.95 },
  verification:  { output: 0.07,  input: 1.90 },
  semanticCheck: { output: 0.12,  input: 1.50 },
  repairs:       { output: 0.20,  input: 0.75 },
  audits:        { output: 0.24,  input: 3.40 },
  canonRebuild:  { output: 0.20,  input: 1.00 },
  metadata:      { output: 0.02,  input: 0.15 },
};

/** Kleine Buecher tragen den fast fixen Planungssockel anteilig staerker. */
const SIZE_OVERHEAD: Record<SizeClass, number> = {
  XS: 1.45, S: 1.15, M: 1.0, L: 1.05, XL: 1.15,
};

export function estimateBudget(params: {
  targetWords: number;
  targetChapters: number;
  sizeClass: SizeClass;
  tokensPerWord: number;
}): BudgetEstimate {
  const { targetWords, tokensPerWord, sizeClass } = params;
  // Sichtbarer Output plus ~5 % Overhead (Marker, Titel, Verwurf).
  const visible = Math.round(targetWords * tokensPerWord * 1.05);
  const overhead = SIZE_OVERHEAD[sizeClass];

  const phases: BudgetEstimate['phases'] = {};
  let output = 0;
  let input = 0;
  for (const [name, r] of Object.entries(PHASE_RATIOS)) {
    const isFixedish = name !== 'draft';
    const factor = isFixedish ? overhead : 1;
    const o = Math.round(visible * r.output * factor);
    const i = Math.round(visible * r.input * factor);
    phases[name] = { output: o, input: i };
    output += o;
    input += i;
  }

  const draftOutputTokens = phases['draft']!.output;
  const repairOutputTokens = phases['repairs']!.output;
  const supportOutputTokens = output - draftOutputTokens - repairOutputTokens;

  return {
    draftOutputTokens,
    supportOutputTokens,
    repairOutputTokens,
    maxOutputTokens: Math.round(output * 1.15),   // Sicherheitsmarge
    maxInputTokens: Math.round(input * 1.15),
    maxThinkingTokens: Math.round(output * 0.35),
    phases,
  };
}

export interface PriceTable {
  /** Preis in Cent je 1 Mio. Tokens. */
  inputPerMTok: number;
  cachedInputPerMTok: number;
  outputPerMTok: number;
  thinkingPerMTok?: number;
}

export interface UsageTotals {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
}

export function costCents(usage: UsageTotals, price: PriceTable): number {
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const cents =
    (uncached / 1_000_000) * price.inputPerMTok +
    (usage.cachedInputTokens / 1_000_000) * price.cachedInputPerMTok +
    (usage.outputTokens / 1_000_000) * price.outputPerMTok +
    (usage.thinkingTokens / 1_000_000) * (price.thinkingPerMTok ?? price.outputPerMTok);
  return Math.round(cents * 10_000) / 10_000;
}

/**
 * Kapitelbudget nach jedem Commit neu berechnen (08 §9.1).
 * Gedaempft, damit ein Ausreisser nicht das ganze Restbuch verzerrt.
 */
export function rebalanceChapterTarget(params: {
  targetWords: number;
  totalChapters: number;
  committedWords: number;
  committedChapters: number;
  plannedNext: number;
  isClimax?: boolean;
}): number {
  const { targetWords, totalChapters, committedWords, committedChapters, plannedNext } = params;
  const remainingChapters = totalChapters - committedChapters;
  if (remainingChapters <= 0) return plannedNext;

  const remainingWords = Math.max(0, targetWords - committedWords);
  const baseline = remainingWords / remainingChapters;
  const blended = 0.7 * plannedNext + 0.3 * baseline;

  const lo = params.isClimax ? plannedNext : 0.75 * plannedNext;   // Climax nie kuerzen
  const hi = 1.25 * plannedNext;
  return Math.round(Math.min(hi, Math.max(lo, blended)));
}

export type BudgetState = 'ok' | 'warn' | 'over' | 'hard_stop';

/** Budgetampel (18 §8). */
export function budgetState(params: {
  spentTokens: number;
  budgetTokens: number;
  committedChapters: number;
  totalChapters: number;
  hardStopPct: number;
}): { state: BudgetState; usedPct: number; projectedPct: number } {
  const { spentTokens, budgetTokens, committedChapters, totalChapters, hardStopPct } = params;
  const usedPct = budgetTokens > 0 ? (spentTokens / budgetTokens) * 100 : 0;
  const projected = committedChapters > 0
    ? (spentTokens / committedChapters) * totalChapters
    : spentTokens;
  const projectedPct = budgetTokens > 0 ? (projected / budgetTokens) * 100 : 0;

  let state: BudgetState = 'ok';
  if (usedPct >= hardStopPct) state = 'hard_stop';
  else if (usedPct >= 100 || projectedPct >= 115) state = 'over';
  else if (usedPct >= 80 || projectedPct >= 105) state = 'warn';

  return { state, usedPct: r2(usedPct), projectedPct: r2(projectedPct) };
}

/** Credits: 1 Credit = 1.000 sichtbare Zielwoerter, mal Groessenfaktor (18 §4). */
const CREDIT_FACTOR: Record<SizeClass, number> = { XS: 1.4, S: 1.2, M: 1.0, L: 1.05, XL: 1.15 };

export function creditsForBook(targetWords: number, sizeClass: SizeClass): number {
  return Math.ceil((targetWords / 1000) * CREDIT_FACTOR[sizeClass] * 10) / 10;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;
