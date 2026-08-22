/**
 * Gemeinsame Bausteine aller Schemas.
 * Regeln:
 *  - Jedes Schema, das ein LLM erzeugt, ist .strict() — unbekannte Keys sind ein Fehler.
 *  - IDs, die ein LLM erzeugt, heissen immer *TempId und werden serverseitig gemappt.
 *  - Jedes Delta-Objekt hat ein Evidence-Feld. Ohne Beleg kein Canon.
 */
import { z } from 'zod';

export const Uuid = z.string().uuid();
export const Slug = z.string().regex(/^[a-z][a-z0-9_]{1,60}$/);
export const TempId = z.string().regex(/^[a-z][a-z0-9_]{0,30}$/);
export const IsoDateTime = z.iso.datetime({ offset: true });

/** Wörtlicher Beleg im Kapiteltext. Wird deterministisch gegroundet (10 §3). */
export const Evidence = z.object({
  quote: z.string().min(15).max(400),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
}).strict();

export const Confidence = z.number().min(0).max(1);

export const Severity = z.enum(['block', 'high', 'medium', 'low', 'info']);

export const Language = z.enum(['de-DE', 'de-AT', 'de-CH', 'en-US', 'en-GB', 'fr-FR', 'es-ES', 'it-IT']);

export const Track = z.enum(['fiction', 'non_fiction']);

export const SizeClass = z.enum(['XS', 'S', 'M', 'L', 'XL']);

export const Pov = z.enum(['first', 'second', 'third_limited', 'third_omniscient', 'epistolary', 'mixed']);
export const Tense = z.enum(['past', 'present']);

/** Geschlossener Prädikat-Katalog (07 §3). Erweiterung nur mit Migration + Check-Anpassung. */
export const Predicate = z.enum([
  'location', 'owner', 'possession', 'status', 'alive', 'injury', 'condition',
  'emotion', 'motivation', 'ability', 'appearance_mutable', 'age', 'role',
  'member_of', 'flag',
]);

/** Geschlossener Event-Typkatalog (07 §5). */
export const EventType = z.enum([
  'movement', 'arrival', 'departure', 'object_transfer', 'object_lost', 'object_found',
  'object_destroyed', 'injury', 'healing', 'death', 'birth', 'revelation', 'deception',
  'promise', 'betrayal', 'agreement', 'conflict', 'reconciliation', 'discovery',
  'decision', 'travel', 'time_skip', 'relationship_shift', 'ability_gained',
  'ability_lost', 'rule_invoked',
]);

export const KnowledgeLevel = z.enum([
  'unaware', 'suspects', 'believes_false', 'misled', 'knows', 'confirmed',
]);

export const RelationshipDimensions = z.object({
  trust: z.number().int().min(-100).max(100).optional(),
  closeness: z.number().int().min(-100).max(100).optional(),
  conflict: z.number().int().min(-100).max(100).optional(),
  power: z.number().int().min(-100).max(100).optional(),
  loyalty: z.number().int().min(-100).max(100).optional(),
  romantic: z.number().int().min(0).max(100).optional(),
  respect: z.number().int().min(-100).max(100).optional(),
}).strict();

/**
 * Ausdrucksgrammatik für Pre-/Postconditions (04 §9.1).
 * Wird von packages/domain/conditions.ts geparst — niemals eval().
 */
export const ConditionExpr = z.string()
  .regex(/^(location|possession|owner|knows|believes|alive|injured|present|trust|closeness|address_mode|state|flag|usage)\([a-z0-9_,\s]+\)\s*(=|!=|>=|<=|in|notin)\s*[A-Za-z0-9_"'\-\s]+$/)
  .max(200);

// ─── Abgeleitete TypeScript-Typen ────────────────────────────────────────────
// Zod-Schemas sind Werte; der Rest des Systems braucht auch die Typen.

export type Severity = z.infer<typeof Severity>;
export type Language = z.infer<typeof Language>;
export type Track = z.infer<typeof Track>;
export type SizeClass = z.infer<typeof SizeClass>;
export type Pov = z.infer<typeof Pov>;
export type Tense = z.infer<typeof Tense>;
export type Predicate = z.infer<typeof Predicate>;
export type EventType = z.infer<typeof EventType>;
export type KnowledgeLevel = z.infer<typeof KnowledgeLevel>;
export type RelationshipDimensions = z.infer<typeof RelationshipDimensions>;
export type Evidence = z.infer<typeof Evidence>;
