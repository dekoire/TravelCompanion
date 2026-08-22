import { z } from 'zod';
import { Confidence, Evidence, Severity } from './common';

export const IssueCategory = z.enum([
  'facts', 'timeline', 'location', 'possession', 'knowledge', 'character_voice',
  'character_consistency', 'relationship', 'world_rule', 'plot', 'thread', 'clue',
  'structure', 'style', 'repetition', 'pacing', 'length', 'dialogue', 'pov', 'tense',
  'rating', 'meta_text', 'nonfiction_claim', 'terminology', 'redundancy', 'technical',
]);

export const RepairStrategy = z.enum([
  'auto_fix', 'sentence_rewrite', 'paragraph_rewrite', 'scene_rewrite',
  'chapter_regenerate', 'plan_change', 'user_decision',
]);

/** Von semantischen Prüfern und Audits erzeugt. Deterministische Checks bauen dasselbe Objekt im Code. */
export const Issue = z.object({
  category: IssueCategory,
  code: z.string().max(60),
  severity: Severity,
  confidence: Confidence,
  message: z.string().min(10).max(600),
  evidence: z.array(Evidence.extend({
    chapterNo: z.number().int().optional(),
    role: z.enum(['violation', 'contradicts', 'context']),
  }).strict()).min(1).max(4),
  suggestedFix: z.object({
    strategy: RepairStrategy,
    target: z.object({
      sceneIndex: z.number().int().optional(),
      charStart: z.number().int().optional(),
      charEnd: z.number().int().optional(),
    }).strict().optional(),
    instruction: z.string().max(600),
  }).strict().optional(),
  downstreamRisk: z.object({
    chapters: z.array(z.number().int()).max(20),
    reason: z.string().max(300),
  }).strict().optional(),
}).strict();

/** Ausgabeformat des semantischen Kapitel-Checks. Max 6 Befunde erzwingen. */
export const SemanticCheckResult = z.object({
  issues: z.array(Issue).max(6),
  overallAssessment: z.string().max(600),
  chapterFulfillsFunction: z.boolean(),
}).strict();

/** Ausgabeformat der billigen Ja/Nein-Verifikation (10 §5). */
export const VerificationResult = z.object({
  answer: z.enum(['yes', 'no', 'unclear']),
  quote: z.string().max(400).nullable(),
  charApprox: z.number().int().nullable(),
  confidence: Confidence,
  reasoning: z.string().max(300),
}).strict();

/** Rating-Klassifikation (03 §5.1). */
export const RatingClassification = z.object({
  violence: z.enum(['none', 'mild', 'moderate', 'graphic']),
  sexualContent: z.enum(['none', 'implied', 'moderate', 'explicit']),
  language: z.enum(['none', 'mild', 'strong']),
  darkThemes: z.enum(['none', 'mild', 'moderate', 'heavy']),
  substanceUse: z.enum(['none', 'mild', 'moderate', 'heavy']),
  selfHarm: z.enum(['none', 'referenced', 'depicted']),
  hardBlockHits: z.array(z.string()).max(5),
  worstExcerpt: z.string().max(300).nullable(),
}).strict();

/** Eingangsmoderation (13 §4). */
export const ModerationResult = z.object({
  action: z.enum(['allow', 'restrict', 'block']),
  categories: z.record(z.string(), z.number().min(0).max(1)),
  reasons: z.array(z.string().max(200)).max(6),
  suggestedRewrite: z.string().max(1000).nullable(),
}).strict();

export type Issue = z.infer<typeof Issue>;
export type IssueCategory = z.infer<typeof IssueCategory>;
export type RepairStrategy = z.infer<typeof RepairStrategy>;
export type SemanticCheckResult = z.infer<typeof SemanticCheckResult>;
export type VerificationResult = z.infer<typeof VerificationResult>;
export type RatingClassification = z.infer<typeof RatingClassification>;
export type ModerationResult = z.infer<typeof ModerationResult>;
