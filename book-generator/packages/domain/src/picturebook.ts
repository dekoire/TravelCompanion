import type {
  CharacterSheet, PageCount, PictureBookDraft, PictureBookPlan, Spread, SpreadLayout,
} from '@abg/schemas';

/**
 * Bilderbuch-Logik. Vollstaendig deterministisch — kein LLM.
 *
 * Das Modell liefert Inhalt (Text, Bild-Brief). Alles, was konsistent bleiben
 * muss — Seitenzahlen, Figurenbeschreibungen, Stilanker, Seeds — rechnet Code.
 */

// ─── Druckbogen-Mathematik ───────────────────────────────────────────────────

/**
 * In einem gebundenen Buch ist Seite 1 eine rechte Seite. Eine Doppelseite ist
 * deshalb immer ein Paar (gerade links, ungerade rechts): (2,3), (4,5), …
 * Seite 1 und die letzte Seite stehen allein.
 *
 * Standardaufbau: S. 1 Schmutztitel, S. 2–3 Titeldoppelseite, letzte Seite
 * Impressum. Bleiben bei 32 Seiten genau 14 Story-Doppelseiten — das ist die
 * Zahl, mit der Bilderbuch-Verlage tatsaechlich arbeiten.
 */
export const FRONT_MATTER_PAGES = 3;
export const BACK_MATTER_PAGES = 1;

export interface PageLayoutPlan {
  pageCount: PageCount;
  frontMatterPages: number;
  backMatterPages: number;
  storySpreads: number;
  firstStoryPage: number;
  /** Seitenpaare je Doppelseite, 1-indiziert. */
  spreadPages: Array<[number, number]>;
}

export function planPages(pageCount: PageCount): PageLayoutPlan {
  const usable = pageCount - FRONT_MATTER_PAGES - BACK_MATTER_PAGES;
  const storySpreads = usable / 2;
  if (!Number.isInteger(storySpreads)) {
    throw new Error(`Seitenzahl ${pageCount} ergibt keine ganzen Doppelseiten`);
  }
  const firstStoryPage = FRONT_MATTER_PAGES + 1;
  const spreadPages: Array<[number, number]> = [];
  for (let i = 0; i < storySpreads; i++) {
    spreadPages.push([firstStoryPage + i * 2, firstStoryPage + i * 2 + 1]);
  }
  return {
    pageCount, frontMatterPages: FRONT_MATTER_PAGES, backMatterPages: BACK_MATTER_PAGES,
    storySpreads, firstStoryPage, spreadPages,
  };
}

export const ALLOWED_PAGE_COUNTS: readonly PageCount[] = [24, 32, 40, 48];

/** Naechste druckbare Seitenzahl zu einer gewuenschten Doppelseitenzahl. */
export function pageCountForSpreads(spreads: number): PageCount {
  const needed = spreads * 2 + FRONT_MATTER_PAGES + BACK_MATTER_PAGES;
  for (const p of ALLOWED_PAGE_COUNTS) if (p >= needed) return p;
  return 48;
}

// ─── Lesestufen ──────────────────────────────────────────────────────────────

export type ReadingLevel = 'pre_reader' | 'early_reader' | 'independent';

export interface ReadingRules {
  level: ReadingLevel;
  ageLabel: string;
  wordsPerSpread: [number, number];
  maxSentencesPerSpread: number;
  maxWordsPerSentence: number;
  /** Nebensatz-Marker, die auf dieser Stufe vermieden werden sollen. */
  discouragedConnectives: readonly string[];
  recommendRefrain: boolean;
}

export const READING_RULES: Readonly<Record<ReadingLevel, ReadingRules>> = {
  pre_reader: {
    level: 'pre_reader', ageLabel: '3–5',
    wordsPerSpread: [6, 32], maxSentencesPerSpread: 2, maxWordsPerSentence: 12,
    discouragedConnectives: ['obwohl', 'währenddessen', 'nachdem', 'sodass', 'indem',
                             'insofern', 'wohingegen', 'dennoch'],
    recommendRefrain: true,
  },
  early_reader: {
    level: 'early_reader', ageLabel: '5–7',
    wordsPerSpread: [12, 55], maxSentencesPerSpread: 3, maxWordsPerSentence: 15,
    discouragedConnectives: ['wohingegen', 'insofern', 'nichtsdestotrotz'],
    recommendRefrain: true,
  },
  independent: {
    level: 'independent', ageLabel: '7–9',
    wordsPerSpread: [25, 90], maxSentencesPerSpread: 5, maxWordsPerSentence: 20,
    discouragedConnectives: [],
    recommendRefrain: false,
  },
};

export function readingLevelForAge(targetAge: string): ReadingLevel {
  if (targetAge === 'all' || targetAge === '6+') return 'pre_reader';
  if (targetAge === '9+') return 'early_reader';
  return 'independent';
}

// ─── Deterministische Identitaeten ───────────────────────────────────────────

/** Stabiler Hash fuer Seeds und Farbtoene — gleicher Name, gleiche Farbe. */
export function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Farbidentitaet einer Figur. Haelt sie ueber alle Bilder erkennbar. */
export function paletteSeedFor(name: string): number {
  return stableHash(name) % 360;
}

export function spreadSeed(title: string, index: number): number {
  return stableHash(`${title}#${index}`) % 100000;
}

// ─── Bildprompt-Komposition ──────────────────────────────────────────────────

const CAMERA_LABEL: Record<string, string> = {
  extreme_wide: 'sehr weite Totale',
  wide: 'Totale',
  medium: 'Halbtotale',
  close: 'Nahaufnahme',
  extreme_close: 'Detailaufnahme',
};

const TIME_LABEL: Record<string, string> = {
  morning: 'Morgenlicht', midday: 'Mittagslicht', afternoon: 'Nachmittagslicht',
  evening: 'Abendlicht', night: 'Nacht',
};

const MEDIUM_LABEL: Record<string, string> = {
  watercolor: 'Aquarell', cut_paper: 'Scherenschnitt-Collage', gouache: 'Gouache',
  crayon: 'Wachsmalkreide', digital_soft: 'weiche digitale Malerei',
  ink_wash: 'Tuschelavierung', collage: 'Collage',
};

/** Wo im Bild Platz fuer Text bleiben muss. */
const TEXT_SPACE: Record<string, string> = {
  top_left: 'oben links', top_right: 'oben rechts',
  bottom_left: 'unten links', bottom_right: 'unten rechts',
  center: 'in der Bildmitte', below_image: 'unter dem Bild',
};

/**
 * Setzt den fertigen Bildprompt zusammen (12 §2.8: Prompt-Idee vom Modell,
 * Figurendeskriptoren und Stilanker deterministisch).
 *
 * Der `visualDescriptor` jeder anwesenden Figur geht WOERTLICH mit ein. Genau
 * das haelt dieselbe Figur ueber 14 Bilder hinweg gleich aussehend.
 */
export function composeImagePrompt(spread: Spread, plan: PictureBookPlan): string {
  const byslug = new Map(plan.characters.map((c) => [c.slug, c]));
  const present = spread.charactersPresent
    .map((s) => byslug.get(s))
    .filter((c): c is CharacterSheet => Boolean(c));

  const lines: string[] = [];
  lines.push(plan.style.styleAnchor);
  lines.push(`Technik: ${MEDIUM_LABEL[plan.style.medium] ?? plan.style.medium}.`);
  lines.push('');
  lines.push(`Szene: ${spread.imageBrief.subject} — ${spread.imageBrief.action}`);
  lines.push(`Ort: ${spread.imageBrief.setting}, ${TIME_LABEL[spread.imageBrief.timeOfDay]}`);
  lines.push(`Stimmung: ${spread.imageBrief.mood}`);
  lines.push(`Bildausschnitt: ${CAMERA_LABEL[spread.imageBrief.cameraDistance]}`);

  if (present.length > 0) {
    lines.push('');
    lines.push('Figuren — exakt so darstellen, unverändert auf allen Seiten:');
    for (const c of present) lines.push(`  • ${c.name}: ${c.visualDescriptor}`);
    if (present.length > 1) {
      const scales = present.map((c) => `${c.name} ${c.scaleRelative}×`).join(', ');
      lines.push(`  Größenverhältnis: ${scales}`);
    }
  }

  lines.push('');
  lines.push(`Farbwelt: ${plan.style.paletteName}. Licht: ${plan.style.lighting}. `
    + `Linien: ${plan.style.lineQuality}.`);
  lines.push(`Format: Doppelseite, Querformat 2:1. Layout: ${layoutHint(spread.layout)}.`);
  lines.push(`Ruhige Fläche ${TEXT_SPACE[spread.textAnchor]} freilassen — dort steht der Text.`);
  lines.push('');
  lines.push('Kein Text, keine Buchstaben, keine Schrift, keine Zahlen im Bild.');
  lines.push(`Vermeiden: ${plan.style.negativePrompt}`);

  return lines.join('\n');
}

function layoutHint(layout: SpreadLayout): string {
  switch (layout) {
    case 'full_bleed':  return 'randlos über beide Seiten';
    case 'text_left':   return 'Motiv rechts, linke Seite ruhig';
    case 'text_right':  return 'Motiv links, rechte Seite ruhig';
    case 'text_bottom': return 'Motiv im oberen Bilddrittel, unten ruhig';
    case 'vignette':    return 'freigestelltes Motiv auf hellem Grund';
    case 'spot':        return 'kleines Motiv, viel Weißraum';
    default:            return 'randlos';
  }
}

// ─── Draft → Plan (deterministische Vervollstaendigung) ──────────────────────

export function finalizePlan(draft: PictureBookDraft, pageCount: PageCount): PictureBookPlan {
  const pages = planPages(pageCount);

  const characters: CharacterSheet[] = draft.characters.map((c) => ({
    ...c,
    paletteSeed: c.paletteSeed ?? paletteSeedFor(c.name),
    scaleRelative: c.scaleRelative ?? 1,
    species: c.species ?? 'Mensch',
  }));

  const spreads: Spread[] = draft.spreads.map((s, i) => ({
    ...s,
    index: i + 1,
    pages: pages.spreadPages[i] ?? [0, 0],
    seed: spreadSeed(draft.title, i + 1),
    textEdited: false,
    imageEdited: false,
  }));

  return {
    title: draft.title,
    dedication: null,
    premise: draft.premise,
    refrain: draft.refrain,
    characters,
    style: draft.style,
    spreads,
  };
}

// ─── Textmessung ─────────────────────────────────────────────────────────────

export function spreadWordCount(text: string, locale = 'de-DE'): number {
  const seg = new Intl.Segmenter(locale, { granularity: 'word' });
  let n = 0;
  for (const s of seg.segment(text)) if (s.isWordLike) n++;
  return n;
}

export function spreadSentences(text: string, locale = 'de-DE'): string[] {
  const seg = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const out: string[] = [];
  for (const s of seg.segment(text)) {
    const t = s.segment.trim();
    if (t.length > 0) out.push(t);
  }
  return out;
}
