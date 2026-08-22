/**
 * Act-Skelett (04 §4). Vollstaendig deterministisch — kein LLM.
 * Ein Modell, das Wortbudgets "schaetzt", liefert 28 Kapitel mit 61.000 statt 82.000 Woertern.
 */

export interface BeatAnchor {
  readonly at: number;          // Position 0..1 im Buch
  readonly beat: string;
  readonly actIndex: number;
}

export const ANCHORS_4ACT: readonly BeatAnchor[] = [
  { at: 0.00, beat: 'opening_image',     actIndex: 0 },
  { at: 0.10, beat: 'inciting_incident', actIndex: 0 },
  { at: 0.22, beat: 'first_threshold',   actIndex: 1 },
  { at: 0.37, beat: 'first_pinch',       actIndex: 1 },
  { at: 0.50, beat: 'midpoint',          actIndex: 1 },
  { at: 0.62, beat: 'second_pinch',      actIndex: 2 },
  { at: 0.75, beat: 'all_is_lost',       actIndex: 2 },
  { at: 0.80, beat: 'dark_night',        actIndex: 2 },
  { at: 0.88, beat: 'climax',            actIndex: 3 },
  { at: 0.96, beat: 'resolution',        actIndex: 3 },
];

export const ANCHORS_3ACT: readonly BeatAnchor[] = [
  { at: 0.00, beat: 'opening_image',     actIndex: 0 },
  { at: 0.12, beat: 'inciting_incident', actIndex: 0 },
  { at: 0.25, beat: 'first_threshold',   actIndex: 1 },
  { at: 0.50, beat: 'midpoint',          actIndex: 1 },
  { at: 0.72, beat: 'all_is_lost',       actIndex: 1 },
  { at: 0.85, beat: 'climax',            actIndex: 2 },
  { at: 0.95, beat: 'resolution',        actIndex: 2 },
];

/** Kurzgeschichte: keine Acts, nur drei Phasen. */
export const ANCHORS_XS: readonly BeatAnchor[] = [
  { at: 0.00, beat: 'opening_image',     actIndex: 0 },
  { at: 0.30, beat: 'inciting_incident', actIndex: 0 },
  { at: 0.75, beat: 'climax',            actIndex: 0 },
  { at: 0.92, beat: 'resolution',        actIndex: 0 },
];

export const ACT_SHARE: Readonly<Record<number, readonly number[]>> = {
  1: [1.0],
  3: [0.25, 0.5, 0.25],
  4: [0.22, 0.28, 0.28, 0.22],
  5: [0.18, 0.24, 0.22, 0.22, 0.14],
};

export function anchorsFor(actCount: number): readonly BeatAnchor[] {
  if (actCount <= 1) return ANCHORS_XS;
  if (actCount === 3) return ANCHORS_3ACT;
  return ANCHORS_4ACT;
}

export interface ActPlan {
  actIndex: number;
  chapterFrom: number;
  chapterTo: number;
  chapterCount: number;
  wordBudget: number;
  share: number;
  anchors: Array<{ beat: string; chapterNo: number }>;
}

export interface ArcSkeleton {
  actCount: number;
  acts: ActPlan[];
  /** Beat -> Kapitelnummer, fuer Chapter-Card-Erzeugung und Outline-Lint. */
  anchorChapters: Record<string, number>;
  partCount: number | null;
}

export function computeArc(params: {
  targetWords: number;
  targetChapters: number;
  actCount: number;
  partCount?: number | null;
}): ArcSkeleton {
  const { targetWords, targetChapters } = params;
  const actCount = Math.max(1, params.actCount);
  const share = ACT_SHARE[actCount];
  if (!share) throw new Error(`No act share defined for actCount=${actCount}`);

  // Kapitel proportional auf Acts verteilen, jeder Act bekommt mindestens 1 Kapitel.
  const raw = share.map((s) => s * targetChapters);
  const counts = largestRemainder(raw, targetChapters, 1);

  // Wortbudgets proportional, Rundungsrest an den laengsten Act.
  const rawWords = share.map((s) => s * targetWords);
  const wordBudgets = largestRemainder(rawWords, targetWords, 0);

  const acts: ActPlan[] = [];
  let cursor = 1;
  for (let i = 0; i < actCount; i++) {
    const count = counts[i]!;
    acts.push({
      actIndex: i,
      chapterFrom: cursor,
      chapterTo: cursor + count - 1,
      chapterCount: count,
      wordBudget: wordBudgets[i]!,
      share: share[i]!,
      anchors: [],
    });
    cursor += count;
  }

  const anchorChapters: Record<string, number> = {};
  const used = new Set<number>();
  for (const a of anchorsFor(actCount)) {
    let ch = clamp(Math.round(a.at * targetChapters) || 1, 1, targetChapters);
    // Zwei Anker im selben Kapitel sind erlaubt, aber 'opening_image' gehoert in Kapitel 1.
    if (a.beat === 'opening_image') ch = 1;
    while (used.has(ch) && ch < targetChapters) ch++;
    used.add(ch);
    anchorChapters[a.beat] = ch;
    const act = acts.find((x) => ch >= x.chapterFrom && ch <= x.chapterTo);
    act?.anchors.push({ beat: a.beat, chapterNo: ch });
  }

  return {
    actCount,
    acts,
    anchorChapters,
    partCount: params.partCount ?? null,
  };
}

/**
 * Verteilt eine Gesamtmenge ganzzahlig nach Anteilen (Hare/Niemeyer),
 * mit garantiertem Minimum je Position. Summe ist exakt `total`.
 */
export function largestRemainder(raw: readonly number[], total: number, minEach: number): number[] {
  const n = raw.length;
  if (n === 0) return [];
  if (total < n * minEach) {
    throw new Error(`Cannot distribute ${total} across ${n} slots with minimum ${minEach}`);
  }

  const out = raw.map((r) => Math.max(minEach, Math.floor(r)));
  let sum = out.reduce((a, b) => a + b, 0);

  if (sum > total) {
    // Das Minimum hat die Summe ueberzogen: bei den groessten Posten abziehen.
    const order = out.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    let guard = n * total + n;
    while (sum > total && guard-- > 0) {
      let moved = false;
      for (const { i } of order) {
        if (sum === total) break;
        if (out[i]! > minEach) { out[i] = out[i]! - 1; sum--; moved = true; }
      }
      if (!moved) break;
    }
    return out;
  }

  const byRemainder = raw
    .map((r, i) => ({ rem: r - Math.floor(r), i }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  let k = 0;
  while (sum < total) {
    const idx = byRemainder[k % n]!.i;
    out[idx] = out[idx]! + 1;
    sum++;
    k++;
  }
  return out;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Zielspannung je Kapitel (04 §8.2). Deterministisch, aber nicht monoton —
 * Rauschen wird aus der Kapitelnummer abgeleitet, nicht zufaellig erzeugt.
 */
export function tensionTarget(chapterNo: number, totalChapters: number, arc: ArcSkeleton): number {
  const pos = totalChapters <= 1 ? 1 : (chapterNo - 1) / (totalChapters - 1);
  // Grundkurve: steigend mit flacherem Start
  let t = 25 + 60 * Math.pow(pos, 1.35);

  for (const [beat, ch] of Object.entries(arc.anchorChapters)) {
    if (ch !== chapterNo) continue;
    if (beat === 'climax') t += 18;
    else if (beat === 'midpoint' || beat === 'all_is_lost') t += 12;
    else if (beat === 'resolution') t -= 30;
    else if (beat === 'opening_image') t -= 10;
  }
  // Ruhe nach dem Sturm
  if (arc.anchorChapters['all_is_lost'] === chapterNo - 1) t -= 15;

  t += deterministicNoise(chapterNo, 5);
  return clamp(Math.round(t), 5, 100);
}

/** Reproduzierbares Rauschen aus der Kapitelnummer (kein Math.random). */
export function deterministicNoise(seed: number, amplitude: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return (frac * 2 - 1) * amplitude;
}
