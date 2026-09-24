import type { PictureBookPlan, Spread } from '@abg/schemas';
import {
  READING_RULES, planPages, spreadSentences, spreadWordCount,
  type ReadingLevel,
} from './picturebook';

/**
 * Bilderbuch-Pruefungen. Alle deterministisch, alle kostenlos.
 *
 * Die Fehlerklassen sind andere als beim Roman: hier gibt es keine Timeline und
 * keinen Besitzwechsel, dafuer Druckbogen, Lesestufe, Figurenkonsistenz im Bild
 * und — der Klassiker — Text, der nur beschreibt, was man ohnehin sieht.
 */

export type PbSeverity = 'block' | 'warn' | 'info';

export interface PbIssue {
  code: string;
  severity: PbSeverity;
  spreadIndex: number | null;
  message: string;
  hint?: string;
}

export interface PbValidationResult {
  ok: boolean;
  issues: PbIssue[];
  stats: {
    spreads: number;
    totalWords: number;
    avgWordsPerSpread: number;
    layoutsUsed: number;
    charactersUsed: number;
    redundancyMax: number;
  };
}

const STOPWORDS = new Set([
  'der','die','das','den','dem','des','ein','eine','einen','einem','einer','eines',
  'und','oder','aber','in','an','auf','aus','bei','mit','nach','von','vor','zu','zur','zum',
  'ist','war','sind','waren','hat','hatte','haben','wird','wurde','werden','sich','es',
  'er','sie','ihr','ihm','ihn','nicht','noch','schon','auch','so','sehr','dann','da','dort',
  'ueber','über','unter','für','fuer','durch','um','am','im','als','wie','sein','seine','seinen',
]);

function contentWords(s: string): Set<string> {
  const seg = new Intl.Segmenter('de-DE', { granularity: 'word' });
  const out = new Set<string>();
  for (const x of seg.segment(s)) {
    if (!x.isWordLike) continue;
    const w = x.segment.toLocaleLowerCase('de-DE');
    if (w.length > 3 && !STOPWORDS.has(w)) out.add(w);
  }
  return out;
}

/**
 * Wie stark doppelt der Text das Bild?
 *
 * Das ist der haeufigste Fehler in KI-erzeugten Bilderbuechern: „Der Hund
 * rennt über die Wiese." unter einem Bild von einem Hund, der über eine Wiese
 * rennt. Gute Bilderbuecher lassen Bild und Text UNTERSCHIEDLICHE Arbeit tun —
 * das Bild zeigt, der Text sagt, was man nicht sieht (Gedanken, Ton, Zeit).
 */
export function textImageRedundancy(spread: Spread): number {
  const t = contentWords(spread.text);
  const i = contentWords(`${spread.imageBrief.subject} ${spread.imageBrief.action}`);
  if (t.size === 0 || i.size === 0) return 0;
  let overlap = 0;
  for (const w of t) if (i.has(w)) overlap++;
  return Math.round((overlap / Math.min(t.size, i.size)) * 100) / 100;
}

const TEXT_IN_IMAGE = /\b(schild|buchstabe|wort|worte|text|schrift|zeitung|brief|plakat|banner|titel|zahl|ziffer)\w*/i;

export function validatePictureBook(
  plan: PictureBookPlan,
  opts: { readingLevel: ReadingLevel; pageCount: 24 | 32 | 40 | 48 },
): PbValidationResult {
  const issues: PbIssue[] = [];
  const rules = READING_RULES[opts.readingLevel];
  const pages = planPages(opts.pageCount);
  const add = (i: PbIssue) => issues.push(i);

  // ── Druckbogen ──────────────────────────────────────────────────────────
  if (plan.spreads.length !== pages.storySpreads) {
    add({
      code: 'pb_spread_count_mismatch', severity: 'block', spreadIndex: null,
      message: `${plan.spreads.length} Doppelseiten passen nicht in ein ${opts.pageCount}-seitiges `
        + `Buch — dort sind genau ${pages.storySpreads} Story-Doppelseiten vorgesehen.`,
      hint: `Seiten 1–${pages.frontMatterPages} sind Titelei, die letzte Seite ist Impressum.`,
    });
  }
  for (const s of plan.spreads) {
    const expected = pages.spreadPages[s.index - 1];
    if (expected && (s.pages[0] !== expected[0] || s.pages[1] !== expected[1])) {
      add({
        code: 'pb_wrong_page_numbers', severity: 'block', spreadIndex: s.index,
        message: `Doppelseite ${s.index} traegt die Seitenzahlen ${s.pages.join('/')}, `
          + `erwartet sind ${expected.join('/')}.`,
      });
    }
    if (s.pages[0] % 2 !== 0) {
      add({
        code: 'pb_spread_not_aligned', severity: 'block', spreadIndex: s.index,
        message: `Doppelseite ${s.index} beginnt auf einer ungeraden Seite (${s.pages[0]}). `
          + 'In einem gebundenen Buch ist die linke Seite immer gerade.',
      });
    }
  }

  // ── Figuren ─────────────────────────────────────────────────────────────
  const sheets = new Map(plan.characters.map((c) => [c.slug, c]));
  const appearances = new Map<string, number>();

  for (const s of plan.spreads) {
    for (const slug of s.charactersPresent) {
      appearances.set(slug, (appearances.get(slug) ?? 0) + 1);
      if (!sheets.has(slug)) {
        add({
          code: 'pb_character_without_sheet', severity: 'block', spreadIndex: s.index,
          message: `Auf Doppelseite ${s.index} kommt „${slug}" vor, aber es gibt kein `
            + 'Character Sheet dafür.',
          hint: 'Ohne festen Bildbeschreiber sieht die Figur auf jeder Seite anders aus.',
        });
      }
    }
  }
  for (const c of plan.characters) {
    const n = appearances.get(c.slug) ?? 0;
    if (n === 0) {
      add({
        code: 'pb_unused_character', severity: 'warn', spreadIndex: null,
        message: `„${c.name}" hat ein Character Sheet, kommt aber auf keiner Doppelseite vor.`,
        hint: 'Entweder einbauen oder streichen.',
      });
    }
    if (c.role === 'protagonist' && n < plan.spreads.length * 0.6) {
      add({
        code: 'pb_protagonist_absent', severity: 'warn', spreadIndex: null,
        message: `Die Hauptfigur „${c.name}" ist nur auf ${n} von ${plan.spreads.length} `
          + 'Doppelseiten zu sehen.',
        hint: 'In Bilderbüchern trägt die Hauptfigur den Blick des Kindes durch das Buch.',
      });
    }
  }

  // ── Text je Doppelseite ─────────────────────────────────────────────────
  let totalWords = 0;
  let redundancyMax = 0;

  for (const s of plan.spreads) {
    const words = spreadWordCount(s.text);
    const sentences = spreadSentences(s.text);
    totalWords += words;

    if (words < rules.wordsPerSpread[0]) {
      add({
        code: 'pb_text_too_short', severity: 'warn', spreadIndex: s.index,
        message: `Doppelseite ${s.index}: ${words} Wörter — für Lesestufe ${rules.ageLabel} `
          + `sind ${rules.wordsPerSpread[0]}–${rules.wordsPerSpread[1]} vorgesehen.`,
      });
    }
    if (words > rules.wordsPerSpread[1]) {
      add({
        code: 'pb_text_too_long', severity: 'block', spreadIndex: s.index,
        message: `Doppelseite ${s.index}: ${words} Wörter sind zu viel für Lesestufe `
          + `${rules.ageLabel} (max. ${rules.wordsPerSpread[1]}).`,
        hint: 'Auf einer Bilderbuchseite muss Platz für das Bild bleiben.',
      });
    }
    if (sentences.length > rules.maxSentencesPerSpread) {
      add({
        code: 'pb_too_many_sentences', severity: 'warn', spreadIndex: s.index,
        message: `Doppelseite ${s.index}: ${sentences.length} Sätze, empfohlen sind `
          + `höchstens ${rules.maxSentencesPerSpread}.`,
      });
    }
    for (const sent of sentences) {
      const sw = spreadWordCount(sent);
      if (sw > rules.maxWordsPerSentence) {
        add({
          code: 'pb_sentence_too_long', severity: 'warn', spreadIndex: s.index,
          message: `Doppelseite ${s.index}: ein Satz mit ${sw} Wörtern `
            + `(max. ${rules.maxWordsPerSentence} für ${rules.ageLabel}).`,
          hint: `„${sent.slice(0, 60)}…"`,
        });
        break;
      }
    }
    for (const conn of rules.discouragedConnectives) {
      if (new RegExp(`\\b${conn}\\b`, 'i').test(s.text)) {
        add({
          code: 'pb_discouraged_connective', severity: 'info', spreadIndex: s.index,
          message: `Doppelseite ${s.index}: „${conn}" ist für Lesestufe ${rules.ageLabel} `
            + 'ein schwieriger Anschluss.',
        });
        break;
      }
    }

    // ── Text doppelt das Bild ──────────────────────────────────────────────
    const red = textImageRedundancy(s);
    redundancyMax = Math.max(redundancyMax, red);
    if (red >= 0.6) {
      add({
        code: 'pb_text_image_redundancy', severity: 'warn', spreadIndex: s.index,
        message: `Doppelseite ${s.index}: Der Text sagt zu ${Math.round(red * 100)} % dasselbe `
          + 'wie das Bild.',
        hint: 'Das Bild zeigt, was passiert. Der Text sollte sagen, was man NICHT sieht — '
          + 'was die Figur denkt, hört oder fürchtet.',
      });
    }

    // ── Bildprompt bittet um Schrift ───────────────────────────────────────
    const briefText = `${s.imageBrief.subject} ${s.imageBrief.action} ${s.imageBrief.setting}`;
    if (TEXT_IN_IMAGE.test(briefText)) {
      add({
        code: 'pb_text_in_image_risk', severity: 'warn', spreadIndex: s.index,
        message: `Doppelseite ${s.index}: Der Bild-Brief verlangt Schrift im Bild `
          + '(Schild, Brief, Buchstaben …).',
        hint: 'Bildmodelle setzen Buchstaben unzuverlässig. Schrift gehört als Typografie '
          + 'darübergelegt, nicht ins generierte Bild.',
      });
    }

    // ── Leere Doppelseite ──────────────────────────────────────────────────
    if (s.charactersPresent.length === 0 && s.layout !== 'spot' && s.layout !== 'vignette') {
      add({
        code: 'pb_empty_spread', severity: 'info', spreadIndex: s.index,
        message: `Doppelseite ${s.index} zeigt keine Figur.`,
        hint: 'Als Atempause oder Ortswechsel in Ordnung — sonst fehlt der Blickanker.',
      });
    }
  }

  // ── Rhythmus ueber das ganze Buch ───────────────────────────────────────
  const layouts = plan.spreads.map((s) => s.layout);
  const distinctLayouts = new Set(layouts).size;
  if (distinctLayouts < 3 && plan.spreads.length >= 8) {
    add({
      code: 'pb_layout_monotony', severity: 'warn', spreadIndex: null,
      message: `Nur ${distinctLayouts} verschiedene Layouts über ${plan.spreads.length} `
        + 'Doppelseiten — das Buch wirkt gleichförmig.',
    });
  }
  for (let i = 2; i < layouts.length; i++) {
    if (layouts[i] === layouts[i - 1] && layouts[i] === layouts[i - 2]) {
      add({
        code: 'pb_layout_repeat', severity: 'info', spreadIndex: i + 1,
        message: `Doppelseiten ${i - 1}–${i + 1} nutzen dreimal hintereinander `
          + `dasselbe Layout (${layouts[i]}).`,
      });
      break;
    }
  }
  if (!layouts.includes('full_bleed') && plan.spreads.length >= 8) {
    add({
      code: 'pb_no_full_bleed', severity: 'info', spreadIndex: null,
      message: 'Keine einzige randlose Doppelseite.',
      hint: 'Der Höhepunkt eines Bilderbuchs ist fast immer randlos — das ist der Moment, '
        + 'in dem das Bild den Text verdrängt.',
    });
  }

  const cameras = plan.spreads.map((s) => s.imageBrief.cameraDistance);
  for (let i = 3; i < cameras.length; i++) {
    if (cameras[i] === cameras[i - 1] && cameras[i] === cameras[i - 2] && cameras[i] === cameras[i - 3]) {
      add({
        code: 'pb_camera_monotony', severity: 'info', spreadIndex: i + 1,
        message: `Viermal hintereinander derselbe Bildausschnitt (${cameras[i]}).`,
        hint: 'Wechselnde Nähe erzeugt den Rhythmus beim Umblättern.',
      });
      break;
    }
  }

  // ── Refrain ─────────────────────────────────────────────────────────────
  if (plan.refrain) {
    const needle = plan.refrain.toLocaleLowerCase('de-DE').replace(/[.!?…]+$/, '');
    const hits = plan.spreads.filter(
      (s) => s.text.toLocaleLowerCase('de-DE').includes(needle)).length;
    if (hits < 3) {
      add({
        code: 'pb_refrain_underused', severity: 'warn', spreadIndex: null,
        message: `Der Refrain „${plan.refrain}" kommt nur ${hits}× vor.`,
        hint: 'Ein Refrain trägt erst ab drei Wiederholungen — Kinder warten darauf.',
      });
    }
  } else if (rules.recommendRefrain && plan.spreads.length >= 10) {
    add({
      code: 'pb_no_refrain', severity: 'info', spreadIndex: null,
      message: 'Kein wiederkehrender Satz.',
      hint: 'Für Lesestufe ' + rules.ageLabel + ' ist ein Refrain das stärkste Einzelmittel.',
    });
  }

  // ── Doppelte Beats ──────────────────────────────────────────────────────
  const beats = new Map<string, number>();
  for (const s of plan.spreads) {
    const k = s.beat.toLocaleLowerCase('de-DE').trim();
    const prev = beats.get(k);
    if (prev !== undefined) {
      add({
        code: 'pb_duplicate_beat', severity: 'warn', spreadIndex: s.index,
        message: `Doppelseiten ${prev} und ${s.index} haben denselben Beat („${s.beat}").`,
      });
    } else {
      beats.set(k, s.index);
    }
  }

  const order: Record<PbSeverity, number> = { block: 0, warn: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]
    || (a.spreadIndex ?? 0) - (b.spreadIndex ?? 0));

  return {
    ok: !issues.some((i) => i.severity === 'block'),
    issues,
    stats: {
      spreads: plan.spreads.length,
      totalWords,
      avgWordsPerSpread: plan.spreads.length
        ? Math.round(totalWords / plan.spreads.length) : 0,
      layoutsUsed: distinctLayouts,
      charactersUsed: appearances.size,
      redundancyMax,
    },
  };
}
