import type { BookSpec, PovMode, QuoteStyle, SizeClass, WizardInput } from '@abg/schemas';
import { getLocale } from './locale';
import {
  BOOK_TYPE_LIMITS, classifySize, getBookTypeLimits, getSizeClassSpec,
} from './limits';
import { clamp } from './arc';
import { estimateBudget } from './budget';

export interface DeriveOptions {
  bookId: string;
  modelProfileId: string;
  promptRegistryVersion: string;
  schemaVersion?: string;
  now?: () => string;
}

export interface DerivedScope {
  sizeClass: SizeClass;
  targetWords: number;
  targetChapters: number;
  wordsPerChapter: number;
  scenesPerChapter: [number, number];
  actCount: number;
  partCount: number | null;
}

/**
 * Leitet aus der Wizard-Eingabe die vollstaendigen Umfangsgroessen ab (03 §3).
 * Vollstaendig deterministisch: gleiche Eingabe -> gleiches Ergebnis.
 */
export function deriveScope(input: WizardInput): DerivedScope {
  const limits = getBookTypeLimits(input.bookType);
  const ideal = limits?.idealChapterWords ?? 2_900;

  // 1) Zielwortzahl: Nutzerwert, sonst Mitte des Typkorridors.
  const targetWords = input.targetWords
    ?? (limits ? Math.round((limits.minWords + limits.maxWords) / 2 / 1000) * 1000 : 80_000);

  // 2) Kapitelanzahl
  let targetChapters: number;
  let wordsPerChapter: number;

  if (input.targetChapters && input.wordsPerChapter) {
    targetChapters = input.targetChapters;
    wordsPerChapter = input.wordsPerChapter;
  } else if (input.targetChapters) {
    targetChapters = input.targetChapters;
    wordsPerChapter = Math.round(targetWords / targetChapters);
  } else if (input.wordsPerChapter) {
    wordsPerChapter = input.wordsPerChapter;
    targetChapters = Math.max(1, Math.round(targetWords / wordsPerChapter));
  } else {
    const lo = limits?.minChapters ?? 1;
    const hi = limits?.maxChapters ?? 200;
    targetChapters = clamp(Math.round(targetWords / ideal) || 1, lo, hi);
    wordsPerChapter = Math.round(targetWords / targetChapters);
  }

  // 3) Groessenklasse und Acts
  const sizeSpec = classifySize(targetWords);
  let actCount = sizeSpec.actCount;
  if (actCount > 0 && targetChapters <= 20) actCount = Math.min(actCount, 3);
  if (actCount > 0 && targetChapters < 3) actCount = 1;

  const partCount = sizeSpec.usesParts
    ? clamp(Math.ceil(targetWords / 70_000), 2, 6)
    : null;

  // 4) Szenenkorridor
  const scenesMin = Math.max(1, Math.floor(wordsPerChapter / 1_400));
  const scenesMax = Math.max(scenesMin + 1, Math.ceil(wordsPerChapter / 650));

  return {
    sizeClass: sizeSpec.sizeClass,
    targetWords,
    targetChapters,
    wordsPerChapter,
    scenesPerChapter: [scenesMin, Math.min(scenesMax, 8)],
    actCount,
    partCount,
  };
}

const DEFAULT_STYLE = {
  preset: 'neutral',
  toneWords: [] as string[],
  humorLevel: 'low' as const,
  descriptionDensity: 'medium' as const,
  sentenceRhythm: 'varied' as const,
  quoteStyle: 'de_low_high' as const,
  genderStyle: 'none' as const,
  numeralStyle: 'spell_under_13' as const,
};

const QUOTE_STYLE_BY_LANG: Record<string, QuoteStyle> = {
  'de-DE': 'de_low_high', 'de-AT': 'de_low_high', 'de-CH': 'de_guillemets',
  'en-US': 'en_double', 'en-GB': 'en_double',
  'fr-FR': 'fr_guillemets', 'es-ES': 'fr_guillemets', 'it-IT': 'fr_guillemets',
};

const DEFAULT_RATING = {
  targetAge: '16+' as const,
  violence: 'moderate' as const,
  sexualContent: 'none' as const,
  language: 'mild' as const,
  darkThemes: 'moderate' as const,
  substanceUse: 'mild' as const,
  selfHarm: 'none' as const,
  contentWarnings: [] as string[],
  // Nicht abwaehlbar (03 §2).
  hardBlocks: [
    'sexual_content_minors', 'real_person_sexual', 'hate_speech', 'actionable_wrongdoing',
  ] as Array<'sexual_content_minors' | 'real_person_sexual' | 'hate_speech' | 'actionable_wrongdoing'>,
};

const CHILD_RATING_BY_TYPE: Record<string, { targetAge: '6+' | '9+' | '12+' }> = {
  picture_book: { targetAge: '6+' },
  early_reader: { targetAge: '6+' },
  chapter_book: { targetAge: '9+' },
  middle_grade: { targetAge: '9+' },
};

/**
 * Baut aus der Wizard-Eingabe die vollstaendige BookSpec.
 * Kein LLM beteiligt — Kosten und Umfang muessen garantierbar sein.
 */
export function deriveSpec(input: WizardInput, opts: DeriveOptions): BookSpec {
  const scope = deriveScope(input);
  const locale = getLocale(input.language);
  const track = BOOK_TYPE_LIMITS[input.bookType]?.track ?? input.track;

  const childRating = CHILD_RATING_BY_TYPE[input.bookType];
  const rating = {
    ...DEFAULT_RATING,
    ...(childRating
      ? { targetAge: childRating.targetAge, violence: 'mild' as const, darkThemes: 'mild' as const,
          language: 'none' as const, substanceUse: 'none' as const }
      : {}),
    ...(input.rating ?? {}),
    hardBlocks: DEFAULT_RATING.hardBlocks,
  };

  const protagonist = input.characters.find((c) => c.role === 'protagonist');
  const povMode = derivePovMode(input, protagonist?.name);
  const pov = input.pov ?? (povMode.kind === 'omniscient' ? 'third_omniscient' : 'third_limited');

  const budget = estimateBudget({
    targetWords: scope.targetWords,
    targetChapters: scope.targetChapters,
    sizeClass: scope.sizeClass,
    tokensPerWord: locale.tokensPerWord,
  });

  const nowIso = (opts.now ?? (() => new Date().toISOString()))();

  const spec: BookSpec = {
    specVersion: '1.0.0',
    bookId: opts.bookId,
    specHash: '',
    track,
    bookType: input.bookType,
    sizeClass: scope.sizeClass,

    content: {
      workingTitle: input.workingTitle ?? 'Ohne Titel',
      userIdea: input.userIdea,
      userMustInclude: input.userMustInclude,
      userMustAvoid: input.userMustAvoid,
      genre: input.genre,
      subgenres: input.subgenres,
      themes: input.themes.slice(0, 5),
      ...(input.settingHint !== undefined ? { settingHint: input.settingHint } : {}),
      ...(input.desiredEnding !== undefined ? { desiredEnding: input.desiredEnding } : {}),
      characters: input.characters,
      ...(input.authorName !== undefined ? { authorName: input.authorName } : {}),
      dedication: null,
      series: { seriesId: null, index: null },
    },

    form: {
      language: input.language,
      pov,
      povMode,
      tense: input.tense ?? 'past',
      style: {
        ...DEFAULT_STYLE,
        quoteStyle: QUOTE_STYLE_BY_LANG[input.language] ?? DEFAULT_STYLE.quoteStyle,
        ...(input.style ?? {}),
      },
      chapterTitles: input.chapterTitles ?? 'numbered_titled',
      chapterHeadingImages: false,
    },

    scope: {
      targetWords: scope.targetWords,
      targetChapters: scope.targetChapters,
      wordsPerChapter: scope.wordsPerChapter,
      scenesPerChapter: scope.scenesPerChapter,
      actCount: scope.actCount,
      partCount: scope.partCount,
      toleranceChapterPct: 10,
      toleranceHardPct: 20,
      toleranceBookPct: 5,
    },

    rating,

    deliverables: {
      cover: input.deliverables?.cover ?? true,
      ...(input.deliverables?.coverStyle !== undefined
        ? { coverStyle: input.deliverables.coverStyle } : {}),
      chapterImages: input.deliverables?.chapterImages ?? false,
      audiobook: input.deliverables?.audiobook ?? false,
      formats: input.deliverables?.formats ?? ['epub', 'pdf'],
      kdpReady: input.deliverables?.kdpReady ?? false,
    },

    budget: {
      maxInputTokens: budget.maxInputTokens,
      maxOutputTokens: budget.maxOutputTokens,
      maxThinkingTokens: budget.maxThinkingTokens,
      maxRepairsPerIssue: 2,
      maxRepairsPerScene: 3,
      maxRepairsPerChapter: 5,
      maxChapterRegenerations: 1,
      reserveFinalAuditPct: 12,
      reserveUserEditsPct: 8,
      hardStopPct: 130,
    },

    technical: {
      modelProfileId: opts.modelProfileId,
      modelProfileSnapshot: {},
      promptRegistryVersion: opts.promptRegistryVersion,
      schemaVersion: opts.schemaVersion ?? '1.0.0',
      localeProfile: { ...locale },
      createdAt: nowIso,
      pipelineProfile: scope.sizeClass,
    },
  };

  return spec;
}

function derivePovMode(input: WizardInput, protagonistName?: string): PovMode {
  if (input.pov === 'third_omniscient') return { kind: 'omniscient' };
  if (input.povOrder && input.povOrder.length >= 2) {
    return { kind: 'rotating', order: input.povOrder.slice(0, 5), switchLevel: 'chapter' };
  }
  const name = input.povCharacterName ?? protagonistName;
  if (name) return { kind: 'single', characterName: name };
  return { kind: 'omniscient' };
}

/** Der Spec-Hash schliesst technical.* aus — Modellwechsel aendert die Spec-Identitaet nicht. */
export function computeSpecHash(spec: BookSpec, sha256: (s: string) => string): string {
  const { technical: _technical, specHash: _specHash, ...rest } = spec;
  return 'sha256:' + sha256(stableStringify(rest));
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

/** Setzt den Hash und friert die Spec ein (03 §6). */
export function freezeSpec(spec: BookSpec, sha256: (s: string) => string): BookSpec {
  return { ...spec, specHash: computeSpecHash(spec, sha256) };
}
