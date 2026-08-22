import { z } from 'zod';
import { ConditionExpr, Slug, TempId } from './common';

export const OpeningType = z.enum([
  'in_medias_res', 'dialogue', 'new_information', 'location_shift', 'action',
  'memory', 'immediate_consequence', 'sensory_detail', 'reflection', 'time_jump',
]);

export const ClosingType = z.enum([
  'revelation_hook', 'decision', 'cliffhanger', 'emotional_beat', 'question',
  'quiet_close', 'reversal', 'arrival',
]);

export const SceneType = z.enum([
  'action', 'dialogue', 'discovery', 'conflict', 'transition', 'reflection', 'flashback',
]);

export const ChapterCard = z.object({
  chapterNo: z.number().int().min(1),
  actIndex: z.number().int().min(0),
  partIndex: z.number().int().nullable().default(null),
  title: z.string().max(120).nullable(),
  beatAnchor: z.string().max(40).nullable(),
  povCharacterSlug: Slug.nullable(),

  primaryFunction: z.string().min(10).max(300),
  secondaryFunction: z.string().max(300).optional(),

  targetWords: z.number().int().min(80).max(8000),
  wordCorridor: z.tuple([z.number().int(), z.number().int()]),
  sceneCount: z.number().int().min(1).max(8),

  startState: z.object({
    location: Slug.nullable(),
    storyTime: z.string(),
    protagonistEmotion: z.string().max(120),
    requiredFacts: z.array(ConditionExpr).max(10).default([]),
  }).strict(),
  endState: z.object({
    location: Slug.nullable(),
    storyTime: z.string(),
    protagonistEmotion: z.string().max(120),
    requiredFacts: z.array(ConditionExpr).max(10).default([]),
  }).strict(),

  activeCharacters: z.array(Slug).max(10),
  mentionedCharacters: z.array(Slug).max(15).default([]),
  activeThreads: z.array(Slug).max(6),
  obligations: z.array(z.object({
    threadSlug: Slug,
    kind: z.enum(['beat', 'touch', 'setup_urgent']),
    what: z.string().max(300),
  }).strict()).max(4).default([]),

  requiredEvents: z.array(z.object({
    id: TempId,
    what: z.string().min(10).max(300),
    critical: z.boolean().default(false),
  }).strict()).max(6),
  forbiddenReveals: z.array(z.string().max(200)).max(8).default([]),
  forbiddenEvents: z.array(z.string().max(200)).max(8).default([]),

  tensionTarget: z.number().int().min(0).max(100),
  emotionalArc: z.object({ from: z.string().max(60), to: z.string().max(60) }).strict(),
  dialogueCorridor: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  pacing: z.enum(['slow', 'medium', 'medium_fast', 'fast']),
  openingType: OpeningType,
  closingType: ClosingType,
  cliffhanger: z.boolean().default(false),

  handshake: z.object({
    prevChapterLastLine: z.string().max(400).nullable(),
    timeGapMinutes: z.number().int().nullable(),
    mustNotRepeatOpenings: z.array(OpeningType).max(3).default([]),
  }).strict(),
}).strict();

export const SceneCard = z.object({
  sceneSlug: Slug,
  index: z.number().int().min(1),
  goal: z.string().min(10).max(300),
  type: SceneType,
  targetWords: z.number().int().min(60).max(4000),
  location: Slug.nullable(),
  storyTimeStart: z.string(),
  durationMinutes: z.number().int().min(0).max(100_000),
  presentCharacters: z.array(Slug).max(8),
  offscreenCharacters: z.array(Slug).max(8).default([]),
  objects: z.array(Slug).max(8).default([]),
  threads: z.array(Slug).max(4).default([]),

  preconditions: z.array(ConditionExpr).max(8).default([]),
  requiredChanges: z.array(ConditionExpr).max(8),
  forbiddenChanges: z.array(ConditionExpr).max(8).default([]),

  emotionalArc: z.object({ from: z.string().max(40), to: z.string().max(40) }).strict(),
  beats: z.array(z.string().min(5).max(200)).min(2).max(5),
  exitCondition: z.string().max(200),
  transitionToNext: z.enum(['hard_cut', 'continuous', 'time_skip', 'pov_shift', 'end_of_chapter']),
}).strict();

/** Was der PLANNER pro Batch liefert. */
export const ChapterCardBatch = z.object({
  cards: z.array(ChapterCard).min(1).max(8),
}).strict();

export type ChapterCard = z.infer<typeof ChapterCard>;
export type OpeningType = z.infer<typeof OpeningType>;
export type ClosingType = z.infer<typeof ClosingType>;
export type SceneType = z.infer<typeof SceneType>;
export type SceneCard = z.infer<typeof SceneCard>;
