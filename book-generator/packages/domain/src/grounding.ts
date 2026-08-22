/**
 * Quote-Grounding (10 §3) — die Vertrauensgrenze des Systems.
 * Ein extrahierter Fakt wird nur Canon, wenn sein Beleg woertlich im Text steht.
 * Vollstaendig deterministisch, kein LLM.
 */

const QUOTE_CHARS = /[“”„‟‘’‚«»‹›]/g;
const DASHES = /[‐-―−]/g;
const WS = /\s+/g;

/** Normalisierung fuer den Vergleich. Aendert NICHT den gespeicherten Text. */
export function normalizeForMatch(s: string): string {
  return s
    .normalize('NFC')
    .replace(QUOTE_CHARS, '"')
    .replace(DASHES, '-')
    .replace(WS, ' ')
    .trim();
}

export interface QuoteHit {
  found: true;
  start: number;
  end: number;
  method: 'exact_at_hint' | 'exact' | 'fuzzy';
  similarity: number;
  offsetDrift: number;
}
export interface QuoteMiss {
  found: false;
  reason: 'quote_too_short' | 'quote_not_found';
  bestSimilarity: number;
}
export type QuoteResult = QuoteHit | QuoteMiss;

export interface GroundingOptions {
  minQuoteLength?: number;
  hintTolerance?: number;
  fuzzyThreshold?: number;
  maxOffsetDrift?: number;
}

const DEFAULTS: Required<GroundingOptions> = {
  minQuoteLength: 15,
  hintTolerance: 40,
  fuzzyThreshold: 0.94,
  maxOffsetDrift: 400,
};

/**
 * Sucht ein Zitat im Text. Reihenfolge: exakt am Hinweis-Offset -> exakt irgendwo -> fuzzy.
 * Die zurueckgegebenen Offsets beziehen sich auf den NORMALISIERTEN Text.
 */
export function findQuote(
  haystackNormalized: string,
  quote: string,
  hint?: number,
  opts: GroundingOptions = {},
): QuoteResult {
  const o = { ...DEFAULTS, ...opts };
  const q = normalizeForMatch(quote);
  if (q.length < o.minQuoteLength) return { found: false, reason: 'quote_too_short', bestSimilarity: 0 };

  if (hint !== undefined && hint >= 0) {
    const from = Math.max(0, hint - o.hintTolerance);
    const idx = haystackNormalized.indexOf(q, from);
    if (idx !== -1 && idx - from <= q.length + o.hintTolerance * 2) {
      return hit(idx, q.length, 'exact_at_hint', 1, hint);
    }
  }

  const idx = haystackNormalized.indexOf(q);
  if (idx !== -1) return hit(idx, q.length, 'exact', 1, hint);

  const fz = fuzzyFind(haystackNormalized, q, o.fuzzyThreshold);
  if (fz) return hit(fz.start, fz.length, 'fuzzy', fz.similarity, hint);

  return { found: false, reason: 'quote_not_found', bestSimilarity: fz ? 1 : bestGuess(haystackNormalized, q) };
}

function hit(start: number, length: number, method: QuoteHit['method'],
             similarity: number, hint?: number): QuoteHit {
  return {
    found: true,
    start,
    end: start + length,
    method,
    similarity: Math.round(similarity * 1000) / 1000,
    offsetDrift: hint === undefined ? 0 : Math.abs(start - hint),
  };
}

/**
 * Fuzzy-Suche: Ankerung ueber die ersten Woerter, dann Levenshtein-Verhaeltnis
 * auf einem Fenster in Zitatlaenge. Bewusst konservativ (Default 0.94).
 */
export function fuzzyFind(
  haystack: string, needle: string, threshold: number,
): { start: number; length: number; similarity: number } | null {
  const anchorWords = needle.split(' ').slice(0, 4).join(' ');
  if (anchorWords.length < 6) return null;

  const candidates: number[] = [];
  let from = 0;
  while (candidates.length < 40) {
    const i = haystack.indexOf(anchorWords, from);
    if (i === -1) break;
    candidates.push(i);
    from = i + 1;
  }

  // Kein Anker gefunden: grobes Raster mit halber Zitatlaenge als Schrittweite.
  if (candidates.length === 0) {
    const step = Math.max(20, Math.floor(needle.length / 2));
    for (let i = 0; i + needle.length <= haystack.length && candidates.length < 400; i += step) {
      candidates.push(i);
    }
  }

  let best: { start: number; length: number; similarity: number } | null = null;
  for (const start of candidates) {
    for (const delta of [0, -2, 2, -5, 5]) {
      const len = needle.length + delta;
      if (len <= 0 || start + len > haystack.length) continue;
      const window = haystack.slice(start, start + len);
      const sim = similarityRatio(window, needle);
      if (sim >= threshold && (!best || sim > best.similarity)) {
        best = { start, length: len, similarity: sim };
      }
    }
  }
  return best;
}

function bestGuess(haystack: string, needle: string): number {
  const anchor = needle.split(' ').slice(0, 3).join(' ');
  return anchor.length > 4 && haystack.includes(anchor) ? 0.5 : 0;
}

/** Levenshtein-Verhaeltnis 0..1, mit fruehem Ausstieg bei zu grosser Distanz. */
export function similarityRatio(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b, Math.ceil(maxLen * 0.2));
  if (dist < 0) return 0;
  return 1 - dist / maxLen;
}

/** Bandbegrenzter Levenshtein. Gibt -1 zurueck, wenn maxDist ueberschritten wird. */
export function levenshtein(a: string, b: string, maxDist = Infinity): number {
  if (Math.abs(a.length - b.length) > maxDist) return -1;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    let rowMin = cur[0]!;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (cur[j]! < rowMin) rowMin = cur[j]!;
    }
    if (rowMin > maxDist) return -1;
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[n]!;
}

// ─── Delta-Grounding ─────────────────────────────────────────────────────────

export interface GroundableEvidence { quote: string; start?: number; end?: number }
export interface Groundable { evidence?: GroundableEvidence; importance?: number; critical?: boolean }

export interface GroundedItem<T> {
  item: T;
  evidence: { quote: string; start: number; end: number };
  method: QuoteHit['method'];
  offsetDrift: number;
}
export interface RejectedItem<T> {
  item: T;
  reason: QuoteMiss['reason'] | 'no_evidence';
  important: boolean;
}
export interface GroundingReport<T> {
  accepted: Array<GroundedItem<T>>;
  rejected: Array<RejectedItem<T>>;
  /** Anteil belegter Deltas — die wichtigste technische Kennzahl (20 §1). */
  groundingRate: number;
  offsetDriftCount: number;
  /** true, wenn die Extraktion insgesamt als gescheitert gilt (> 20 % unbelegt). */
  extractionFailed: boolean;
}

export function groundItems<T extends Groundable>(
  items: readonly T[],
  cleanText: string,
  opts: GroundingOptions = {},
): GroundingReport<T> {
  const o = { ...DEFAULTS, ...opts };
  const hay = normalizeForMatch(cleanText);
  const accepted: Array<GroundedItem<T>> = [];
  const rejected: Array<RejectedItem<T>> = [];
  let offsetDriftCount = 0;

  for (const item of items) {
    const ev = item.evidence;
    const important = (item.importance ?? 0) >= 4 || item.critical === true;
    if (!ev?.quote) { rejected.push({ item, reason: 'no_evidence', important }); continue; }

    const res = findQuote(hay, ev.quote, ev.start, o);
    if (!res.found) { rejected.push({ item, reason: res.reason, important }); continue; }
    if (res.offsetDrift > o.maxOffsetDrift) offsetDriftCount++;

    accepted.push({
      item,
      evidence: { quote: hay.slice(res.start, res.end), start: res.start, end: res.end },
      method: res.method,
      offsetDrift: res.offsetDrift,
    });
  }

  const total = items.length;
  const rate = total === 0 ? 1 : accepted.length / total;
  return {
    accepted,
    rejected,
    groundingRate: Math.round(rate * 1000) / 1000,
    offsetDriftCount,
    extractionFailed: total > 0 && rate < 0.8,
  };
}
