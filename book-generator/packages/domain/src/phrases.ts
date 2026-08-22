import { lowerWords } from './text';

/**
 * Phrasenstatistik und Wiederholungserkennung (11 §3).
 * Deterministisch, kostet keine Tokens — und liefert die Negativliste
 * fuer den naechsten Kontext.
 */

const STOPWORDS_DE = new Set([
  'der','die','das','den','dem','des','ein','eine','einen','einem','einer','eines',
  'und','oder','aber','doch','denn','als','wie','wenn','dass','weil','ob',
  'ich','du','er','sie','es','wir','ihr','sich','mich','dir','ihm','ihn','ihnen',
  'in','an','auf','aus','bei','mit','nach','von','vor','zu','zur','zum','über','unter','für',
  'ist','war','sind','waren','hat','hatte','haben','hatten','wird','wurde','werden','wurden',
  'nicht','nur','noch','schon','auch','so','sehr','mehr','dann','da','hier','dort',
]);
const STOPWORDS_EN = new Set([
  'the','a','an','and','or','but','if','of','at','by','for','with','about','to','from',
  'in','on','is','was','are','were','be','been','has','had','have','it','its','he','she',
  'they','them','his','her','their','that','this','there','then','not','no','so','as',
]);

function stopwords(locale: string): Set<string> {
  return locale.startsWith('de') ? STOPWORDS_DE : STOPWORDS_EN;
}

export interface PhraseStat {
  ngram: string;
  n: number;
  count: number;
  chapters: number[];
  lastSeenChapter: number;
}

export interface PhraseIndex {
  locale: string;
  stats: Map<string, PhraseStat>;
  /** Bewusste Motive und Eigennamen, die nie als Wiederholung gelten. */
  allowed: Set<string>;
}

export function createPhraseIndex(locale: string, allowedMotifs: readonly string[] = []): PhraseIndex {
  return {
    locale,
    stats: new Map(),
    allowed: new Set(allowedMotifs.map((m) => m.toLocaleLowerCase(locale))),
  };
}

/** Erzeugt n-Gramme mit mindestens zwei Inhaltswoertern (3..6). */
export function extractNgrams(
  text: string, locale: string, minN = 3, maxN = 6,
): Map<string, number> {
  const words = lowerWords(text, locale);
  const sw = stopwords(locale);
  const out = new Map<string, number>();

  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      const slice = words.slice(i, i + n);
      const contentWords = slice.filter((w) => !sw.has(w) && w.length > 2).length;
      if (contentWords < 2) continue;
      const key = slice.join(' ');
      out.set(key, (out.get(key) ?? 0) + 1);
    }
  }
  return out;
}

/** Inkrementelle Aktualisierung nach jedem Commit. */
export function updatePhraseIndex(index: PhraseIndex, text: string, chapterNo: number): PhraseIndex {
  const grams = extractNgrams(text, index.locale);
  for (const [ngram, count] of grams) {
    if (index.allowed.has(ngram)) continue;
    const existing = index.stats.get(ngram);
    if (existing) {
      existing.count += count;
      if (!existing.chapters.includes(chapterNo)) existing.chapters.push(chapterNo);
      existing.lastSeenChapter = chapterNo;
    } else {
      index.stats.set(ngram, {
        ngram, n: ngram.split(' ').length, count,
        chapters: [chapterNo], lastSeenChapter: chapterNo,
      });
    }
  }
  return index;
}

/**
 * Negativliste fuer den naechsten Kontext (09 §1, Sektion [N]).
 * Laengere n-Gramme zuerst — sie sind spezifischer und damit nuetzlicher.
 */
export function selectNegativeList(index: PhraseIndex, limit = 15, minCount = 4): string[] {
  return [...index.stats.values()]
    .filter((s) => s.count >= minCount && s.chapters.length >= 2)
    .sort((a, b) => b.count - a.count || b.n - a.n || a.ngram.localeCompare(b.ngram))
    .slice(0, limit)
    .map((s) => s.ngram);
}

export interface OveruseFinding {
  ngram: string;
  totalCount: number;
  inChapter: number;
  chapters: number[];
}

/** `phrase_overuse` (11 §2.8): buchweit haeufig UND im aktuellen Kapitel mehrfach. */
export function detectOveruse(
  index: PhraseIndex, chapterText: string, chapterNo: number,
  opts: { bookThreshold?: number; chapterThreshold?: number } = {},
): OveruseFinding[] {
  const bookThreshold = opts.bookThreshold ?? 4;
  const chapterThreshold = opts.chapterThreshold ?? 2;
  const local = extractNgrams(chapterText, index.locale);
  const out: OveruseFinding[] = [];

  for (const [ngram, inChapter] of local) {
    if (inChapter < chapterThreshold) continue;
    if (index.allowed.has(ngram)) continue;
    const stat = index.stats.get(ngram);
    const total = (stat?.count ?? 0) + inChapter;
    if (total >= bookThreshold) {
      out.push({
        ngram, totalCount: total, inChapter,
        chapters: [...(stat?.chapters ?? []), chapterNo],
      });
    }
  }
  // Enthaltene kuerzere n-Gramme unterdruecken, wenn ein laengeres sie abdeckt.
  const sorted = out.sort((a, b) => b.ngram.length - a.ngram.length);
  const kept: OveruseFinding[] = [];
  for (const f of sorted) {
    if (!kept.some((k) => k.ngram.includes(f.ngram) && k.totalCount >= f.totalCount)) kept.push(f);
  }
  return kept.sort((a, b) => b.totalCount - a.totalCount);
}

/** Kuratierte Gestenliste — `gesture_overuse`. Bewusst klein und pflegbar. */
export const GESTURE_PATTERNS_DE: readonly string[] = [
  'atmete tief', 'nickte langsam', 'schauer lief', 'zuckte mit den schultern',
  'runzelte die stirn', 'für einen moment', 'die luft war schwer',
  'schluckte schwer', 'ballte die fäuste', 'biss sich auf die lippe',
  'holte tief luft', 'starrte ins leere', 'sah zu boden',
];

export function detectGestureOveruse(
  text: string, locale: string, threshold = 3,
): Array<{ phrase: string; count: number }> {
  const hay = ' ' + lowerWords(text, locale).join(' ') + ' ';
  const out: Array<{ phrase: string; count: number }> = [];
  for (const g of GESTURE_PATTERNS_DE) {
    let count = 0;
    let i = 0;
    for (;;) {
      const found = hay.indexOf(g, i);
      if (found === -1) break;
      count++;
      i = found + g.length;
    }
    if (count >= threshold) out.push({ phrase: g, count });
  }
  return out.sort((a, b) => b.count - a.count);
}
