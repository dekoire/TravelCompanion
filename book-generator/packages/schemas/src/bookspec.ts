import { z } from 'zod';
import { Language, Pov, SizeClass, Tense, Track } from './common';

export const ContentRating = z.object({
  targetAge: z.enum(['all', '6+', '9+', '12+', '16+', '18+']),
  violence: z.enum(['none', 'mild', 'moderate', 'graphic']),
  sexualContent: z.enum(['none', 'implied', 'moderate', 'explicit']),
  language: z.enum(['none', 'mild', 'strong']),
  darkThemes: z.enum(['none', 'mild', 'moderate', 'heavy']),
  substanceUse: z.enum(['none', 'mild', 'moderate', 'heavy']),
  selfHarm: z.enum(['none', 'referenced', 'depicted']),
  contentWarnings: z.array(z.string().max(60)).max(15),
  hardBlocks: z.array(z.enum([
    'sexual_content_minors', 'real_person_sexual', 'hate_speech', 'actionable_wrongdoing',
  ])),
}).strict();

export const CharacterSeed = z.object({
  role: z.enum(['protagonist', 'antagonist', 'love_interest', 'mentor', 'ally', 'foil', 'supporting']),
  name: z.string().min(1).max(80),
  age: z.number().int().min(0).max(400).optional(),
  traits: z.array(z.string().max(40)).max(8).default([]),
  goal: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
}).strict();

export const StyleSpec = z.object({
  preset: z.string().max(60),
  toneWords: z.array(z.string().max(30)).max(6),
  humorLevel: z.enum(['none', 'low', 'medium', 'high']),
  descriptionDensity: z.enum(['sparse', 'medium', 'rich']),
  sentenceRhythm: z.enum(['short', 'varied', 'flowing']),
  quoteStyle: z.enum(['de_low_high', 'de_guillemets', 'en_double', 'fr_guillemets', 'dash']),
  genderStyle: z.enum(['none', 'doppelnennung', 'gendersternchen', 'neutral']),
  numeralStyle: z.enum(['spell_under_13', 'spell_under_10', 'digits']),
}).strict();

export const BookSpec = z.object({
  specVersion: z.literal('1.0.0'),
  bookId: z.string(),
  specHash: z.string(),
  track: Track,
  bookType: z.string(),
  sizeClass: SizeClass,

  content: z.object({
    workingTitle: z.string().min(1).max(140),
    userIdea: z.string().max(4000),                       // sanitisiert, siehe 13 §3
    userMustInclude: z.array(z.string().max(120)).max(20).default([]),
    userMustAvoid: z.array(z.string().max(120)).max(20).default([]),
    genre: z.string().max(40),
    subgenres: z.array(z.string().max(40)).max(3).default([]),
    themes: z.array(z.string().max(60)).max(5).default([]),
    settingHint: z.string().max(300).optional(),
    desiredEnding: z.string().max(600).optional(),
    characters: z.array(CharacterSeed).max(12).default([]),
    authorName: z.string().max(80).optional(),
    dedication: z.string().max(300).nullable().default(null),
    series: z.object({ seriesId: z.string().nullable(), index: z.number().int().nullable() }),
  }).strict(),

  form: z.object({
    language: Language,
    pov: Pov,
    povMode: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('single'), characterName: z.string() }).strict(),
      z.object({ kind: z.literal('rotating'), order: z.array(z.string()).min(2).max(5),
                 switchLevel: z.literal('chapter') }).strict(),
      z.object({ kind: z.literal('omniscient') }).strict(),
    ]),
    tense: Tense,
    style: StyleSpec,
    chapterTitles: z.enum(['numbered', 'titled', 'numbered_titled', 'none']),
    chapterHeadingImages: z.boolean().default(false),
  }).strict(),

  scope: z.object({
    targetWords: z.number().int().min(300).max(400_000),
    targetChapters: z.number().int().min(1).max(200),
    wordsPerChapter: z.number().int().min(80).max(8000),
    scenesPerChapter: z.tuple([z.number().int(), z.number().int()]),
    actCount: z.number().int().min(0).max(5),
    partCount: z.number().int().min(2).max(6).nullable(),
    toleranceChapterPct: z.number().default(10),
    toleranceHardPct: z.number().default(20),
    toleranceBookPct: z.number().default(5),
  }).strict(),

  rating: ContentRating,

  deliverables: z.object({
    cover: z.boolean(),
    coverStyle: z.string().max(60).optional(),
    chapterImages: z.boolean(),
    audiobook: z.boolean(),
    formats: z.array(z.enum(['epub', 'pdf', 'pdf_print', 'docx', 'txt', 'm4b'])),
    kdpReady: z.boolean().default(false),
  }).strict(),

  budget: z.object({
    maxInputTokens: z.number().int(),
    maxOutputTokens: z.number().int(),
    maxThinkingTokens: z.number().int(),
    maxRepairsPerIssue: z.number().int().default(2),
    maxRepairsPerScene: z.number().int().default(3),
    maxRepairsPerChapter: z.number().int().default(5),
    maxChapterRegenerations: z.number().int().default(1),
    reserveFinalAuditPct: z.number().default(12),
    reserveUserEditsPct: z.number().default(8),
    hardStopPct: z.number().default(130),
  }).strict(),

  technical: z.object({
    modelProfileId: z.string(),
    modelProfileSnapshot: z.record(z.string(), z.unknown()),
    promptRegistryVersion: z.string(),
    schemaVersion: z.string(),
    localeProfile: z.record(z.string(), z.unknown()),
    createdAt: z.string(),
    pipelineProfile: SizeClass,
  }).strict(),
}).strict();

export type BookSpec = z.infer<typeof BookSpec>;
export type ContentRating = z.infer<typeof ContentRating>;
export type CharacterSeed = z.infer<typeof CharacterSeed>;
export type StyleSpec = z.infer<typeof StyleSpec>;
export type QuoteStyle = StyleSpec['quoteStyle'];
export type PovMode = BookSpec['form']['povMode'];
