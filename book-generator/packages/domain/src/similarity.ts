/**
 * Aehnlichkeitsmasse fuer Kapitelanfaenge und Namensvarianten (11 §2.3, §2.8).
 * Erststufe vor teuren Embeddings — Reihenfolge laut Gap-Analyse C4.
 */
import { levenshtein } from './grounding';

const COMBINING = new RegExp('[\\u0300-\\u036F]', 'g');
const NON_WORD = new RegExp('[^a-z0-9\\u00e4\\u00f6\\u00fc\\u00df ]+', 'g');

export function trigrams(s: string): Set<string> {
  const norm = ' ' + s.toLowerCase().normalize('NFD')
    .replace(COMBINING, '')
    .replace(NON_WORD, ' ')
    .replace(/\s+/g, ' ')
    .trim() + ' ';
  const out = new Set<string>();
  for (let i = 0; i + 3 <= norm.length; i++) out.add(norm.slice(i, i + 3));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : Math.round((inter / union) * 1000) / 1000;
}

export function trigramSimilarity(a: string, b: string): number {
  return jaccard(trigrams(a), trigrams(b));
}

/** Containment: wie viel von `part` steckt in `whole`. Fuer Namensvarianten nuetzlich. */
export function trigramContainment(part: string, whole: string): number {
  const p = trigrams(part);
  const w = trigrams(whole);
  if (p.size === 0) return 0;
  let inter = 0;
  for (const x of p) if (w.has(x)) inter++;
  return Math.round((inter / p.size) * 1000) / 1000;
}

export interface OpeningSimilarityFinding {
  againstChapter: number;
  similarity: number;
  needsEmbeddingCheck: boolean;
}

/**
 * `opening_similarity`: Trigramm-Jaccard als Erstfilter.
 * Erst bei Ueberschreitung lohnt ein Embedding-Vergleich (Kostenordnung 1:200).
 */
export function compareOpenings(
  current: string,
  previous: ReadonlyArray<{ chapterNo: number; first200Words: string }>,
  threshold = 0.32,
): OpeningSimilarityFinding[] {
  const cur = trigrams(first200(current));
  return previous
    .map((p) => ({
      againstChapter: p.chapterNo,
      similarity: jaccard(cur, trigrams(first200(p.first200Words))),
      needsEmbeddingCheck: false,
    }))
    .filter((f) => f.similarity >= threshold)
    .map((f) => ({ ...f, needsEmbeddingCheck: true }))
    .sort((a, b) => b.similarity - a.similarity);
}

export function first200(text: string, n = 200): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}

/**
 * `name_near_miss` (11 §2.3): "Ardmore" vs. "Ardmoor".
 *
 * Trigramm-Jaccard allein reicht bei kurzen Eigennamen NICHT: die beiden Namen
 * oben kommen nur auf 0,4, weil sich bei sieben Zeichen schon zwei abweichende
 * Trigramme stark auswirken. Deshalb wie in 06 §7 beschrieben zweigleisig:
 * kleine Editierdistanz ODER hohe Trigramm-Aehnlichkeit.
 */
export interface NameNearMiss {
  candidate: string;
  canonical: string;
  similarity: number;
  editDistance: number;
  reason: 'edit_distance' | 'trigram';
}

export function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(COMBINING, '').replace(/[^a-z0-9]/g, '');
}

export function findNameNearMisses(
  candidates: readonly string[],
  canonical: readonly string[],
  opts: { maxEdits?: number; trigramLower?: number; trigramUpper?: number; minLength?: number } = {},
): NameNearMiss[] {
  const maxEdits = opts.maxEdits ?? 2;
  const lower = opts.trigramLower ?? 0.72;
  const upper = opts.trigramUpper ?? 0.99;
  const minLength = opts.minLength ?? 4;

  const out: NameNearMiss[] = [];
  for (const c of candidates) {
    const cn = normalizeName(c);
    if (cn.length < minLength) continue;

    for (const k of canonical) {
      const kn = normalizeName(k);
      if (cn === kn) continue;                       // identisch (auch nach Normalisierung)
      if (Math.abs(cn.length - kn.length) > maxEdits) continue;

      // Kurze Namen brauchen eine strengere absolute Grenze als lange:
      // bei 5 Zeichen ist eine Distanz von 2 schon ein anderer Name.
      const budget = Math.min(maxEdits, Math.max(1, Math.floor(Math.min(cn.length, kn.length) / 3)));
      const dist = levenshtein(cn, kn, budget);
      const tri = trigramSimilarity(c, k);

      if (dist >= 0 && dist <= budget) {
        out.push({ candidate: c, canonical: k, similarity: tri, editDistance: dist,
                   reason: 'edit_distance' });
      } else if (tri >= lower && tri <= upper) {
        out.push({ candidate: c, canonical: k, similarity: tri, editDistance: dist,
                   reason: 'trigram' });
      }
    }
  }
  return out.sort((a, b) => a.editDistance - b.editDistance || b.similarity - a.similarity);
}
