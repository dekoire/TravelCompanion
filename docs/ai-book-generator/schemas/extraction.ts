import { z } from 'zod';
import {
  Confidence, Evidence, EventType, KnowledgeLevel, Predicate,
  RelationshipDimensions, Slug, TempId,
} from './common';

export const ExtractedEvent = z.object({
  tempId: TempId,
  type: EventType,
  summary: z.string().min(10).max(300),
  participants: z.array(z.object({
    characterSlug: Slug,
    role: z.enum(['agent', 'patient', 'witness', 'mentioned']),
  }).strict()).max(8),
  objects: z.array(Slug).max(8).default([]),
  location: Slug.nullable(),
  visibility: z.enum(['public', 'semi_public', 'private', 'secret']),
  importance: z.number().int().min(1).max(5),
  threadSlugs: z.array(Slug).max(4).default([]),
  causedBy: z.array(TempId).max(4).default([]),
  evidence: Evidence,
}).strict();

export const FactDelta = z.object({
  op: z.enum(['set', 'close']),
  subject: Slug,
  predicate: Predicate,
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown())]).nullable(),
  valueKey: z.string().max(60).optional(),
  validFromScene: z.number().int().optional(),
  validUntilScene: z.number().int().optional(),
  causedBy: TempId.optional(),
  confidence: Confidence.default(1),
  evidence: Evidence,
}).strict();

export const KnowledgeDelta = z.object({
  factRef: z.string().max(80),
  characterSlug: Slug,
  from: KnowledgeLevel,
  to: KnowledgeLevel,
  believes: z.string().max(200).optional(),
  source: z.enum(['witnessed', 'told', 'inferred', 'deceived', 'overheard', 'read']),
  causedBy: TempId.optional(),
  evidence: Evidence,
}).strict();

export const RelationshipDelta = z.object({
  pair: z.tuple([Slug, Slug]),
  delta: RelationshipDimensions,
  addressChange: z.object({
    aToB: z.enum(['formal', 'informal']).optional(),
    bToA: z.enum(['formal', 'informal']).optional(),
  }).strict().nullable().default(null),
  reason: z.string().max(200),
  causedBy: TempId.optional(),
  evidence: Evidence,
}).strict();

export const ThreadDelta = z.object({
  threadSlug: Slug,
  action: z.enum(['introduce', 'advance', 'complicate', 'reverse', 'pay_off', 'dormant', 'abandon']),
  beatKind: z.string().max(40).optional(),
  note: z.string().max(300),
  status: z.enum(['planned', 'open', 'dormant', 'resolved', 'abandoned']),
}).strict();

export const Utterance = z.object({
  speakerSlug: Slug,
  impliedKnowledge: z.array(z.string().max(80)).max(5),
  quote: z.string().min(5).max(400),
  start: z.number().int(),
  end: z.number().int(),
}).strict();

export const Contradiction = z.object({
  expected: z.string().max(200),
  textImplies: z.string().max(200),
  severity: z.enum(['high', 'medium', 'low']),
  evidence: Evidence,
}).strict();

export const SceneExtraction = z.object({
  sceneSlug: Slug,
  storyTime: z.object({
    start: z.string(), end: z.string(),
    durationMinutes: z.number().int(),
    gapFromPrevMinutes: z.number().int(),
    timeOfDay: z.enum(['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night', 'late_night']),
    isFlashback: z.boolean().default(false),
  }).strict(),
  location: Slug.nullable(),
  presentCharacters: z.array(Slug).max(10),

  events: z.array(ExtractedEvent).max(12).default([]),
  factDeltas: z.array(FactDelta).max(25).default([]),
  knowledgeDeltas: z.array(KnowledgeDelta).max(12).default([]),
  relationshipDeltas: z.array(RelationshipDelta).max(8).default([]),
  threadDeltas: z.array(ThreadDelta).max(6).default([]),

  newEntities: z.array(z.object({
    kind: z.enum(['character', 'location', 'object', 'faction', 'concept']),
    proposedSlug: Slug,
    name: z.string().max(80),
    significance: z.number().int().min(1).max(5),
    evidence: Evidence,
  }).strict()).max(8).default([]),

  readerQuestions: z.object({
    raised: z.array(z.object({
      question: z.string().max(200),
      salience: z.enum(['high', 'medium', 'low']),
    }).strict()).max(5).default([]),
    answered: z.array(z.string()).max(5).default([]),
  }).strict(),

  cardCompliance: z.object({
    requiredEventsCovered: z.array(TempId).default([]),
    requiredEventsMissing: z.array(TempId).default([]),
    forbiddenEventsOccurred: z.array(z.string()).default([]),
    requiredChangesMet: z.array(z.string()).default([]),
    requiredChangesUnmet: z.array(z.string()).default([]),
  }).strict(),

  utterances: z.array(Utterance).max(20).default([]),
  contradictions: z.array(Contradiction).max(6).default([]),
  summary: z.string().min(20).max(800),
}).strict();

export const ChapterSummary = z.object({
  oneLine: z.string().max(200),
  keyEvents: z.array(z.object({ tempId: TempId, why: z.string().max(160) }).strict()).max(6),
  causeEffect: z.array(z.object({ cause: z.string().max(160), effect: z.string().max(160) }).strict()).max(6),
  newFacts: z.array(z.string().max(160)).max(15),
  locationChanges: z.array(z.object({ characterSlug: Slug, from: Slug.nullable(), to: Slug }).strict()).max(10),
  objectChanges: z.array(z.object({ objectSlug: Slug, change: z.string().max(160) }).strict()).max(10),
  knowledgeChanges: z.array(z.object({ characterSlug: Slug, learned: z.string().max(120) }).strict()).max(10),
  relationshipChanges: z.array(z.object({ pair: z.string(), change: z.string().max(120) }).strict()).max(8),
  threadsOpened: z.array(Slug).default([]),
  threadsAdvanced: z.array(Slug).default([]),
  threadsClosed: z.array(Slug).default([]),
  emotionalEndState: z.array(z.object({ characterSlug: Slug, state: z.string().max(80) }).strict()).max(6),
  lastConcreteAction: z.string().max(300),
  lastLine: z.string().max(400),
  openQuestions: z.array(z.string().max(200)).max(6).default([]),
  transitionToNext: z.string().max(300),
  tensionEstimate: z.number().int().min(0).max(100),
}).strict();

export const ChapterExtraction = z.object({
  chapterNo: z.number().int(),
  scenes: z.array(SceneExtraction).min(1).max(8),
  chapterSummary: ChapterSummary,
}).strict();

export type ChapterExtraction = z.infer<typeof ChapterExtraction>;
