import type { SizeClass } from '@abg/schemas';

export interface BookTypeLimits {
  readonly minWords: number;
  readonly maxWords: number;
  readonly minChapterWords: number;
  readonly maxChapterWords: number;
  readonly minChapters: number;
  readonly maxChapters: number;
  readonly idealChapterWords: number;
  readonly track: 'fiction' | 'non_fiction';
}

/**
 * Harte Grenzen je Buchtyp (02 §3). Die "mindestens 800 Woerter pro Kapitel"-Regel
 * gilt NUR fuer Erwachsenen-/YA-Fiktion; Kinderbuecher haben eigene Grenzen.
 */
export const BOOK_TYPE_LIMITS: Readonly<Record<string, BookTypeLimits>> = {
  // ─ Fiction, Erwachsene / YA ─
  short_story:   { minWords: 1_000,  maxWords: 15_000,  minChapterWords: 600,  maxChapterWords: 6_000, minChapters: 1,  maxChapters: 8,   idealChapterWords: 1_600, track: 'fiction' },
  novella:       { minWords: 15_000, maxWords: 45_000,  minChapterWords: 800,  maxChapterWords: 6_000, minChapters: 6,  maxChapters: 22,  idealChapterWords: 2_400, track: 'fiction' },
  novel:         { minWords: 45_000, maxWords: 150_000, minChapterWords: 800,  maxChapterWords: 8_000, minChapters: 12, maxChapters: 60,  idealChapterWords: 2_900, track: 'fiction' },
  epic:          { minWords: 140_000,maxWords: 400_000, minChapterWords: 800,  maxChapterWords: 8_000, minChapters: 40, maxChapters: 140, idealChapterWords: 3_100, track: 'fiction' },
  young_adult:   { minWords: 45_000, maxWords: 100_000, minChapterWords: 800,  maxChapterWords: 6_000, minChapters: 15, maxChapters: 50,  idealChapterWords: 2_600, track: 'fiction' },
  romance:       { minWords: 45_000, maxWords: 120_000, minChapterWords: 800,  maxChapterWords: 6_000, minChapters: 15, maxChapters: 50,  idealChapterWords: 2_700, track: 'fiction' },
  mystery:       { minWords: 55_000, maxWords: 130_000, minChapterWords: 800,  maxChapterWords: 6_000, minChapters: 18, maxChapters: 55,  idealChapterWords: 2_900, track: 'fiction' },
  thriller:      { minWords: 60_000, maxWords: 140_000, minChapterWords: 800,  maxChapterWords: 6_000, minChapters: 20, maxChapters: 70,  idealChapterWords: 2_400, track: 'fiction' },
  fantasy:       { minWords: 70_000, maxWords: 250_000, minChapterWords: 800,  maxChapterWords: 8_000, minChapters: 20, maxChapters: 90,  idealChapterWords: 3_200, track: 'fiction' },
  scifi:         { minWords: 60_000, maxWords: 200_000, minChapterWords: 800,  maxChapterWords: 8_000, minChapters: 18, maxChapters: 80,  idealChapterWords: 3_100, track: 'fiction' },
  historical:    { minWords: 70_000, maxWords: 180_000, minChapterWords: 800,  maxChapterWords: 8_000, minChapters: 20, maxChapters: 70,  idealChapterWords: 3_200, track: 'fiction' },
  horror:        { minWords: 45_000, maxWords: 130_000, minChapterWords: 800,  maxChapterWords: 6_000, minChapters: 15, maxChapters: 55,  idealChapterWords: 2_600, track: 'fiction' },
  literary:      { minWords: 55_000, maxWords: 150_000, minChapterWords: 800,  maxChapterWords: 8_000, minChapters: 12, maxChapters: 50,  idealChapterWords: 3_400, track: 'fiction' },

  // ─ Fiction, Kinder (eigene Grenzen, 02 §3.1) ─
  picture_book:  { minWords: 200,    maxWords: 1_500,   minChapterWords: 80,   maxChapterWords: 400,   minChapters: 1,  maxChapters: 16,  idealChapterWords: 200,   track: 'fiction' },
  early_reader:  { minWords: 1_200,  maxWords: 7_000,   minChapterWords: 150,  maxChapterWords: 800,   minChapters: 3,  maxChapters: 20,  idealChapterWords: 400,   track: 'fiction' },
  chapter_book:  { minWords: 5_000,  maxWords: 20_000,  minChapterWords: 400,  maxChapterWords: 1_800, minChapters: 5,  maxChapters: 25,  idealChapterWords: 1_000, track: 'fiction' },
  middle_grade:  { minWords: 20_000, maxWords: 65_000,  minChapterWords: 700,  maxChapterWords: 3_000, minChapters: 10, maxChapters: 45,  idealChapterWords: 1_700, track: 'fiction' },

  // ─ Non-Fiction ─
  guidebook:     { minWords: 15_000, maxWords: 90_000,  minChapterWords: 800,  maxChapterWords: 7_000, minChapters: 5,  maxChapters: 40,  idealChapterWords: 3_000, track: 'non_fiction' },
  how_to:        { minWords: 12_000, maxWords: 80_000,  minChapterWords: 700,  maxChapterWords: 7_000, minChapters: 5,  maxChapters: 40,  idealChapterWords: 2_800, track: 'non_fiction' },
  textbook:      { minWords: 40_000, maxWords: 250_000, minChapterWords: 1_500,maxChapterWords: 9_000, minChapters: 8,  maxChapters: 60,  idealChapterWords: 4_500, track: 'non_fiction' },
  business:      { minWords: 20_000, maxWords: 90_000,  minChapterWords: 900,  maxChapterWords: 7_000, minChapters: 6,  maxChapters: 35,  idealChapterWords: 3_000, track: 'non_fiction' },
  self_help:     { minWords: 20_000, maxWords: 80_000,  minChapterWords: 900,  maxChapterWords: 6_000, minChapters: 6,  maxChapters: 35,  idealChapterWords: 2_800, track: 'non_fiction' },
  biography:     { minWords: 50_000, maxWords: 180_000, minChapterWords: 1_500,maxChapterWords: 9_000, minChapters: 10, maxChapters: 50,  idealChapterWords: 4_000, track: 'non_fiction' },
  memoir:        { minWords: 40_000, maxWords: 140_000, minChapterWords: 1_200,maxChapterWords: 8_000, minChapters: 10, maxChapters: 45,  idealChapterWords: 3_500, track: 'non_fiction' },
  essay_collection:{minWords: 20_000,maxWords: 120_000, minChapterWords: 1_000,maxChapterWords: 9_000, minChapters: 5,  maxChapters: 40,  idealChapterWords: 3_500, track: 'non_fiction' },
  reference:     { minWords: 30_000, maxWords: 300_000, minChapterWords: 500,  maxChapterWords: 9_000, minChapters: 6,  maxChapters: 80,  idealChapterWords: 3_000, track: 'non_fiction' },
  cookbook:      { minWords: 15_000, maxWords: 120_000, minChapterWords: 400,  maxChapterWords: 8_000, minChapters: 4,  maxChapters: 30,  idealChapterWords: 2_500, track: 'non_fiction' },
  travel_guide:  { minWords: 20_000, maxWords: 150_000, minChapterWords: 600,  maxChapterWords: 9_000, minChapters: 5,  maxChapters: 50,  idealChapterWords: 3_000, track: 'non_fiction' },
};

/** Buchtypen mit eigenen Kinderbuch-Grenzen — hier gilt die 800-Woerter-Regel NICHT. */
export const CHILDREN_TYPES = new Set(['picture_book', 'early_reader', 'chapter_book', 'middle_grade']);

export interface SizeClassSpec {
  readonly sizeClass: SizeClass;
  readonly minWords: number;
  readonly maxWords: number;
  readonly actCount: number;
  readonly usesParts: boolean;
  readonly styleVariants: number;
  readonly humanCheckpoints: ReadonlyArray<'outline' | 'style' | 'act1' | 'midpoint' | 'every_part'>;
  readonly midpointAudit: boolean;
  readonly actAudit: boolean;
  readonly memoryCompaction: boolean;
}

/** Pipeline-Profile je Groessenklasse (02 §3.2). */
export const SIZE_CLASSES: readonly SizeClassSpec[] = [
  { sizeClass: 'XS', minWords: 0,       maxWords: 14_999,  actCount: 0, usesParts: false, styleVariants: 2, humanCheckpoints: ['outline', 'style'],                        midpointAudit: false, actAudit: false, memoryCompaction: false },
  { sizeClass: 'S',  minWords: 15_000,  maxWords: 49_999,  actCount: 3, usesParts: false, styleVariants: 2, humanCheckpoints: ['outline', 'style', 'act1'],                midpointAudit: false, actAudit: true,  memoryCompaction: false },
  { sizeClass: 'M',  minWords: 50_000,  maxWords: 94_999,  actCount: 4, usesParts: false, styleVariants: 3, humanCheckpoints: ['outline', 'style', 'act1'],                midpointAudit: true,  actAudit: true,  memoryCompaction: false },
  { sizeClass: 'L',  minWords: 95_000,  maxWords: 149_999, actCount: 4, usesParts: false, styleVariants: 3, humanCheckpoints: ['outline', 'style', 'act1', 'midpoint'],    midpointAudit: true,  actAudit: true,  memoryCompaction: true },
  { sizeClass: 'XL', minWords: 150_000, maxWords: Infinity,actCount: 4, usesParts: true,  styleVariants: 3, humanCheckpoints: ['outline', 'style', 'act1', 'every_part'],  midpointAudit: true,  actAudit: true,  memoryCompaction: true },
];

export function classifySize(targetWords: number): SizeClassSpec {
  for (const s of SIZE_CLASSES) {
    if (targetWords >= s.minWords && targetWords <= s.maxWords) return s;
  }
  return SIZE_CLASSES[SIZE_CLASSES.length - 1]!;
}

export function getSizeClassSpec(sizeClass: SizeClass): SizeClassSpec {
  const s = SIZE_CLASSES.find((x) => x.sizeClass === sizeClass);
  if (!s) throw new Error(`Unknown size class: ${sizeClass}`);
  return s;
}

export function getBookTypeLimits(bookType: string): BookTypeLimits | undefined {
  return BOOK_TYPE_LIMITS[bookType];
}

/**
 * Mindestwortzahl je Kapitel. Fuer Erwachsenen-/YA-Fiktion 800 (03 §4.1 V003),
 * fuer Kinderbuecher der typspezifische Wert.
 */
export function minChapterWordsFor(bookType: string): number {
  return BOOK_TYPE_LIMITS[bookType]?.minChapterWords ?? 800;
}

export function isChildrenBook(bookType: string): boolean {
  return CHILDREN_TYPES.has(bookType);
}

export const AGE_ORDER = ['all', '6+', '9+', '12+', '16+', '18+'] as const;
export type AgeRating = (typeof AGE_ORDER)[number];

export function ageValue(age: string): number {
  const map: Record<string, number> = { all: 0, '6+': 6, '9+': 9, '12+': 12, '16+': 16, '18+': 18 };
  return map[age] ?? 18;
}
