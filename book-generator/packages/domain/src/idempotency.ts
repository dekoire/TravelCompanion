import { createHash } from 'node:crypto';
import { stableStringify } from './derive';

/**
 * Idempotenz-Schluessel (01 §6.4, 16 §4).
 * Reproduzierbarkeit entsteht durch Persistenz des Ergebnisses, nicht durch
 * Wiederholbarkeit des Calls — deshalb zeigen die Keys auf gespeicherte Resultate.
 */

export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function hashObject(value: unknown): string {
  return sha256(stableStringify(value));
}

export interface JobKeyInput {
  bookVersionId: string;
  operation: string;
  targetKind: 'book' | 'part' | 'act' | 'chapter' | 'scene';
  targetId: string;
  /** Hash der fachlichen Eingaben (Card-Version, State, Read-Set). */
  inputHash: string;
  promptVersion: string;
  modelId: string;
  /** 'initial' oder 'repair:<issueId>:<n>' — eine Reparatur ist absichtlich ein anderer Job. */
  attemptClass?: string;
}

export function jobIdempotencyKey(i: JobKeyInput): string {
  return sha256([
    i.bookVersionId, i.operation, i.targetKind, i.targetId,
    i.inputHash, i.promptVersion, i.modelId, i.attemptClass ?? 'initial',
  ].join(' '));
}

export interface LlmKeyInput {
  bookId: string;
  operation: string;
  targetId: string;
  promptVersion: string;
  modelId: string;
  temperature: number;
  /** Hash des final assemblierten Prompt-Bodys. */
  contextHash: string;
  repairAttempt?: number;
  /** Fortsetzungs-Calls nach Truncation duerfen den Erst-Call nicht treffen. */
  continuation?: number;
}

export function llmIdempotencyKey(i: LlmKeyInput): string {
  return sha256([
    i.bookId, i.operation, i.targetId, i.promptVersion, i.modelId,
    i.temperature.toFixed(3), i.contextHash,
    String(i.repairAttempt ?? 0), String(i.continuation ?? 0),
  ].join(' '));
}

/** Hash der statischen Prompt-Sektionen — steuert die Cache-Trefferquote (09 §6). */
export function canonStaticHash(parts: {
  bookId: string;
  promptVersion: string;
  modelId: string;
  staticSections: unknown;
}): string {
  return sha256([
    parts.bookId, parts.promptVersion, parts.modelId,
    stableStringify(parts.staticSections),
  ].join(' '));
}
