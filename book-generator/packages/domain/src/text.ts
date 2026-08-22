import type { LocaleProfile } from './locale';

/** Markup, das nicht als Prosa zaehlt. */
const SCENE_MARKER = /<<<(?:SCENE\s+[A-Za-z0-9_]+|END)>>>/g;
const EMPHASIS = /\*([^*\n]{1,400})\*/g;

/**
 * Verbindet Bindestrich-Komposita zu einem Token.
 *
 * Intl.Segmenter zerlegt "E-Mail" in zwei wortartige Segmente. Die Publishing-
 * Konvention (und Word) zaehlt es als ein Wort — und danach richten sich
 * Preis, Seitenprognose und Budget. Nur der einfache Bindestrich zwischen zwei
 * Buchstaben wird verbunden; Gedankenstriche bleiben Satzzeichen.
 */
const INTRA_WORD_HYPHEN = /(\p{L})[-\u2010\u2011](?=\p{L})/gu;

export function joinHyphenatedWords(text: string): string {
  return text.replace(INTRA_WORD_HYPHEN, '$1');
}

/** Entfernt Markup, behaelt aber den Text (fuer Wortzaehlung). */
export function stripMarkup(text: string): string {
  return text.replace(SCENE_MARKER, ' ').replace(EMPHASIS, '$1');
}

/** Entfernt kursive Gedankenrede vollstaendig (fuer die Dialogmessung). */
export function removeThoughtMarkup(text: string): string {
  return text.replace(SCENE_MARKER, ' ').replace(EMPHASIS, ' ');
}

/**
 * Die EINZIGE Wortzaehlung im System (02 §5.1).
 * Kein split(/\s+/) — deutsche Komposita und Bindestrichwoerter zaehlen als ein Wort.
 */
export function countWords(text: string, locale: string): number {
  const seg = new Intl.Segmenter(locale, { granularity: 'word' });
  let n = 0;
  for (const s of seg.segment(joinHyphenatedWords(stripMarkup(text)))) if (s.isWordLike) n++;
  return n;
}

export function countSentences(text: string, locale: string): number {
  const seg = new Intl.Segmenter(locale, { granularity: 'sentence' });
  let n = 0;
  for (const s of seg.segment(stripMarkup(text))) if (s.segment.trim().length > 0) n++;
  return n;
}

export function splitSentences(text: string, locale: string): string[] {
  const seg = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const out: string[] = [];
  for (const s of seg.segment(text)) {
    const t = s.segment.trim();
    if (t.length > 0) out.push(t);
  }
  return out;
}

export function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
}

export interface StyleMetrics {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentenceWords: number;
  avgParagraphSentences: number;
  /** Standardabweichung der Satzlaenge — Mass fuer Rhythmusvielfalt. */
  sentenceLengthSd: number;
  dialogueRatio: number;
  typeTokenRatio: number;
}

export function measureStyle(text: string, locale: LocaleProfile): StyleMetrics {
  const clean = stripMarkup(text);
  const sentences = splitSentences(clean, locale.bcp47);
  const paragraphs = splitParagraphs(clean);
  const perSentence = sentences.map((s) => countWords(s, locale.bcp47));
  const words = perSentence.reduce((a, b) => a + b, 0);
  const avg = sentences.length ? words / sentences.length : 0;
  const variance = sentences.length
    ? perSentence.reduce((acc, w) => acc + (w - avg) ** 2, 0) / sentences.length
    : 0;

  const tokens = lowerWords(clean, locale.bcp47);
  const ttr = tokens.length ? new Set(tokens).size / tokens.length : 0;

  return {
    words,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgSentenceWords: round2(avg),
    avgParagraphSentences: paragraphs.length ? round2(sentences.length / paragraphs.length) : 0,
    sentenceLengthSd: round2(Math.sqrt(variance)),
    dialogueRatio: dialogueRatio(text, locale),
    typeTokenRatio: round2(ttr),
  };
}

/**
 * Dialoganteil (11 §2.9): Zeichen innerhalb von Anfuehrungszeichen geteilt durch
 * Gesamtzeichen ohne Whitespace. Gedankenrede (*kursiv*) zaehlt nicht als Dialog.
 */
export function dialogueRatio(text: string, locale: LocaleProfile): number {
  const stripped = removeThoughtMarkup(text);
  const total = stripped.replace(/\s/g, '').length;
  if (total === 0) return 0;

  // Der erste passende Stil gewinnt: sonst zaehlt ein gemischtes Paar doppelt.
  let inside = 0;
  for (const [open, close] of locale.quotePairs) {
    const hit = charsBetween(stripped, open, close);
    if (hit > 0) { inside = hit; break; }
  }
  return round3(Math.min(inside / total, 1));
}

/**
 * Zulaessige Schlusszeichen je Oeffnungszeichen.
 *
 * Modelle mischen Anfuehrungszeichen regelmaessig („Text" statt „Text“). Wer nur
 * das exakte Paar sucht, misst den Dialoganteil dann als 0 und repariert das
 * falsche Problem. Die Typografie wird separat geprueft und im Renderer
 * vereinheitlicht — die Messung darf daran nicht scheitern.
 */
const CLOSERS: Readonly<Record<string, readonly string[]>> = {
  '\u201E': ['\u201C', '\u201D', '"'],   // „  ->  “ ” "
  '\u00BB': ['\u00AB', '\u00BB', '"'],   // »  ->  « » "
  '\u00AB': ['\u00BB', '\u00AB', '"'],   // «  ->  » « "
  '\u201C': ['\u201D', '\u201C', '"'],   // “  ->  ” “ "
  '\u2018': ['\u2019', '\u2018', "'"],   // ‘  ->  ’ ‘ '
  '"': ['"'],
};

function closersFor(open: string, fallback: string): readonly string[] {
  return CLOSERS[open] ?? [fallback];
}

/** Zaehlt Nicht-Whitespace-Zeichen zwischen Quote-Paaren, inklusive der Marken. */
function charsBetween(text: string, open: string, close: string): number {
  const closers = closersFor(open, close);
  const symmetric = closers.length === 1 && closers[0] === open;
  let total = 0;
  let i = 0;

  while (i < text.length) {
    const start = text.indexOf(open, i);
    if (start === -1) break;

    // Naechstes zulaessiges Schlusszeichen nehmen, egal welches der Varianten.
    let end = -1;
    for (const c of closers) {
      const idx = text.indexOf(c, start + open.length);
      if (idx !== -1 && (end === -1 || idx < end)) end = idx + c.length;
    }
    if (end === -1) break;

    const span = text.slice(start, end);
    // Ein "Dialog" ueber mehrere Absaetze ist fast immer ein unbalanciertes Paar.
    if (!span.includes('\n\n')) total += span.replace(/\s/g, '').length;
    i = end;
    if (symmetric && i >= text.length) break;
  }
  return total;
}

export function lowerWords(text: string, locale: string): string[] {
  const seg = new Intl.Segmenter(locale, { granularity: 'word' });
  const out: string[] = [];
  for (const s of seg.segment(joinHyphenatedWords(text))) {
    if (s.isWordLike) out.push(s.segment.toLocaleLowerCase(locale));
  }
  return out;
}

// ─── Szenenmarker (08 §3) ────────────────────────────────────────────────────

export interface SplitScene {
  sceneSlug: string;
  text: string;
  /** Offsets im BEREINIGTEN Kapiteltext (ohne Marker). */
  charStart: number;
  charEnd: number;
}

export interface SplitResult {
  cleanText: string;
  scenes: SplitScene[];
  ok: boolean;
  problems: string[];
}

/**
 * Trennt den Kapiteltext an <<<SCENE id>>>-Markern und liefert den bereinigten
 * Text plus Offsets. Die Offsets beziehen sich auf den bereinigten Text, weil
 * darauf spaeter das Grounding arbeitet.
 */
export function splitScenes(raw: string, expectedSlugs?: readonly string[]): SplitResult {
  const re = /<<<SCENE\s+([A-Za-z0-9_]+)>>>/g;
  const problems: string[] = [];
  const marks: Array<{ slug: string; start: number; end: number }> = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    marks.push({ slug: m[1] as string, start: m.index, end: m.index + m[0].length });
  }

  if (marks.length === 0) {
    const cleanText = stripSceneMarkers(raw);
    problems.push('no_scene_markers');
    return {
      cleanText,
      scenes: [{ sceneSlug: expectedSlugs?.[0] ?? 'scene_1', text: cleanText, charStart: 0, charEnd: cleanText.length }],
      ok: false,
      problems,
    };
  }

  const endMarker = raw.indexOf('<<<END>>>');
  const bodyEnd = endMarker === -1 ? raw.length : endMarker;

  const scenes: SplitScene[] = [];
  let clean = '';
  for (let i = 0; i < marks.length; i++) {
    const cur = marks[i]!;
    const nextStart = i + 1 < marks.length ? marks[i + 1]!.start : bodyEnd;
    const body = raw.slice(cur.end, nextStart).replace(/^\s*\n/, '').trimEnd();
    clean += (clean.length > 0 ? '\n\n' : '') + body;
    scenes.push({
      sceneSlug: cur.slug,
      text: body,
      charStart: clean.length - body.length,
      charEnd: clean.length,
    });
  }

  if (expectedSlugs) {
    const got = scenes.map((s) => s.sceneSlug);
    if (got.length !== expectedSlugs.length) problems.push('scene_count_mismatch');
    for (let i = 0; i < Math.min(got.length, expectedSlugs.length); i++) {
      if (got[i] !== expectedSlugs[i]) { problems.push('scene_order_wrong'); break; }
    }
  }
  if (endMarker === -1) problems.push('missing_end_marker');

  return { cleanText: clean, scenes, ok: problems.length === 0, problems };
}

export function stripSceneMarkers(text: string): string {
  return text.replace(SCENE_MARKER, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Meta-Text (08 §8) ───────────────────────────────────────────────────────

const META_PATTERNS: RegExp[] = [
  /^(?:Hier ist|Natürlich|Gerne|Sicher|Selbstverständlich)[^\n]{0,80}[:.]\s*\n+/i,
  /^(?:Kapitel|Chapter)\s+\d+\s*[:–-]?[^\n]*\n+/i,
  /\n+(?:Ende des Kapitels|Fortsetzung folgt)\.?\s*$/i,
  /\n+-{3,}\s*\n+(?:Anmerkung|Hinweis|Zusammenfassung)[\s\S]*$/i,
  /\n+\*?\(?(?:Wortanzahl|Wortzahl|Word count):?\s*[\d.,]+[^\n]*\)?\*?\s*$/i,
];

const CODE_FENCE = /^\s*```(?:markdown|text|plaintext)?\s*\n([\s\S]*?)\n```\s*$/;

/** Signale, die ein ISSUE erzeugen statt still entfernt zu werden. */
const HARD_META_SIGNALS: Array<{ code: string; re: RegExp }> = [
  { code: 'ai_self_reference', re: /\bals (?:eine? )?(?:KI|Sprachmodell|AI)\b/i },
  { code: 'ai_self_reference', re: /\bas an? (?:AI|language model)\b/i },
  { code: 'model_refusal', re: /\b(?:I cannot|I can't help|Ich kann (?:dabei|dir dabei) nicht helfen)\b/i },
  { code: 'placeholder', re: /\[(?:[A-ZÄÖÜ][^\]\n]{2,30})\]/ },
  { code: 'placeholder', re: /\b(?:TODO|TBD|XXX|Lorem ipsum)\b/ },
  { code: 'external_url', re: /\bhttps?:\/\/\S+|\b[\w.-]+@[\w.-]+\.\w{2,}\b/ },
];

export interface MetaScanResult {
  text: string;
  removed: string[];
  signals: Array<{ code: string; match: string; index: number }>;
}

export function stripMetaText(raw: string): MetaScanResult {
  let text = raw;
  const removed: string[] = [];

  const fence = CODE_FENCE.exec(text);
  if (fence?.[1]) { text = fence[1]; removed.push('code_fence'); }

  for (const p of META_PATTERNS) {
    const before = text;
    text = text.replace(p, '');
    if (text !== before) removed.push(p.source.slice(0, 30));
  }
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  const signals: MetaScanResult['signals'] = [];
  for (const { code, re } of HARD_META_SIGNALS) {
    const m = re.exec(text);
    if (m) signals.push({ code, match: m[0], index: m.index });
  }
  return { text, removed, signals };
}

// ─── Fortsetzung nach Truncation (08 §7) ────────────────────────────────────

/**
 * Fuegt eine Fortsetzung an und entfernt die Ueberlappung.
 * Deterministisch: laengster gemeinsamer Suffix/Praefix ab minOverlap Zeichen.
 *
 * Der Standardwert ist bewusst niedrig (16): eine stehengebliebene Dopplung ist
 * ein sichtbarer Textfehler, ein faelschlich entfernter 16-Zeichen-Anschluss
 * dagegen kaum wahrnehmbar. 16 Zeichen identischer Prosa sind praktisch nie Zufall.
 */
export function stitchWithOverlap(head: string, tail: string, minOverlap = 16): string {
  const maxCheck = Math.min(head.length, tail.length, 1200);
  for (let len = maxCheck; len >= minOverlap; len--) {
    if (head.slice(head.length - len) === tail.slice(0, len)) {
      return head + tail.slice(len);
    }
  }
  const needsSpace = !/\s$/.test(head) && !/^\s/.test(tail);
  return head + (needsSpace ? ' ' : '') + tail;
}

export function lastNWords(text: string, n: number, locale = 'de-DE'): string {
  // Bewusst OHNE Hyphen-Normalisierung: die Offsets muessen auf den Originaltext zeigen.
  const seg = new Intl.Segmenter(locale, { granularity: 'word' });
  const idx: number[] = [];
  for (const s of seg.segment(text)) if (s.isWordLike) idx.push(s.index);
  if (idx.length <= n) return text;
  return text.slice(idx[idx.length - n]!);
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
