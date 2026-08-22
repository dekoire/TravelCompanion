import { z } from 'zod';
import { Language, Pov, Tense, Track } from './common';
import { CharacterSeed, ContentRating, StyleSpec } from './bookspec';

/**
 * Rohe Wizard-Eingabe. Alles ausser den ersten vier Feldern ist optional —
 * `deriveSpec()` fuellt den Rest deterministisch auf (03 §3).
 *
 * Ein Nutzer, der nur "Roman", "Krimi", "Deutsch" und eine Idee angibt,
 * muss starten koennen.
 */
export const WizardInput = z.object({
  track: Track.default('fiction'),
  bookType: z.string().min(2).max(40),
  genre: z.string().min(2).max(40).default('general'),
  language: Language.default('de-DE'),

  workingTitle: z.string().max(140).optional(),
  userIdea: z.string().max(4000).default(''),
  userMustInclude: z.array(z.string().max(120)).max(20).default([]),
  userMustAvoid: z.array(z.string().max(120)).max(20).default([]),
  subgenres: z.array(z.string().max(40)).max(3).default([]),
  themes: z.array(z.string().max(60)).max(8).default([]),
  settingHint: z.string().max(300).optional(),
  desiredEnding: z.string().max(600).optional(),
  characters: z.array(CharacterSeed).max(12).default([]),
  authorName: z.string().max(80).optional(),

  /** Nutzer gibt Zielumfang an; Kapitelzahl darf er, muss er aber nicht. */
  targetWords: z.number().int().min(200).max(400_000).optional(),
  targetChapters: z.number().int().min(1).max(200).optional(),
  wordsPerChapter: z.number().int().min(50).max(12_000).optional(),

  pov: Pov.optional(),
  povCharacterName: z.string().max(80).optional(),
  povOrder: z.array(z.string().max(80)).max(5).optional(),
  tense: Tense.optional(),
  style: StyleSpec.partial().optional(),
  chapterTitles: z.enum(['numbered', 'titled', 'numbered_titled', 'none']).optional(),

  rating: ContentRating.partial().optional(),

  deliverables: z.object({
    cover: z.boolean().optional(),
    coverStyle: z.string().max(60).optional(),
    chapterImages: z.boolean().optional(),
    audiobook: z.boolean().optional(),
    formats: z.array(z.enum(['epub', 'pdf', 'pdf_print', 'docx', 'txt', 'm4b'])).optional(),
    kdpReady: z.boolean().optional(),
  }).optional(),
}).strict();

export type WizardInput = z.infer<typeof WizardInput>;
export type WizardInputRaw = z.input<typeof WizardInput>;
