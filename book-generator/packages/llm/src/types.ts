import type { ZodType } from 'zod';

/**
 * Capability-Profile statt hartkodierter Modellnamen (01 §6.1).
 * Modelle wechseln schneller als Architektur.
 */
export type Capability =
  | 'PLANNER'
  | 'DRAFTER'
  | 'EXTRACTOR'
  | 'VERIFIER'
  | 'AUDITOR'
  | 'CRITIC'
  | 'MODERATOR'
  | 'EMBED'
  | 'IMAGE'
  | 'TTS';

export interface ModelBinding {
  capability: Capability;
  provider: string;
  /** Exakte Modell-ID. Zur Implementierungszeit gegen die Provider-Doku pruefen. */
  modelId: string;
  temperature: number;
  topP?: number;
  maxOutputTokens: number;
  thinkingBudget?: number;
  timeoutMs: number;
  fallback?: Omit<ModelBinding, 'fallback'>;
}

export type ModelProfile = Readonly<Partial<Record<Capability, ModelBinding>>>;

export type FinishReason = 'stop' | 'length' | 'safety' | 'recitation' | 'other';

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  cachedInputTokens: number;
}

export function emptyUsage(): Usage {
  return { inputTokens: 0, outputTokens: 0, thinkingTokens: 0, cachedInputTokens: 0 };
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    thinkingTokens: a.thinkingTokens + b.thinkingTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
  };
}

/** Die Prompt-Sektionen in fester Reihenfolge (09 §1). Stabiles zuerst — Cache-Grenze. */
export interface PromptSections {
  system: string;
  developer: string;
  /** Statischer Canon: cache-faehig, byte-identisch ueber das ganze Buch. */
  canonStatic: string;
  canonDynamic: string;
  memory: string;
  plan: string;
  negativeList: string;
  /** Nutzerdaten. Werden vom Gateway neutralisiert und gekapselt. */
  userData: Record<string, string>;
  task: string;
}

export interface LlmRequest {
  capability: Capability;
  operation: string;
  bookId: string;
  targetId: string;
  sections: PromptSections;
  promptVersion: string;
  /** Ueberschreibt maxOutputTokens der Bindung, z. B. fuer Fortsetzungen. */
  maxOutputTokens?: number;
  repairAttempt?: number;
  continuation?: number;
  /** Nur fuer Tests/Fixtures: waehlt ein bestimmtes Mock-Skript. */
  fixtureTag?: string;
}

export interface LlmResult<T> {
  data: T;
  raw: string;
  finishReason: FinishReason;
  usage: Usage;
  modelId: string;
  provider: string;
  latencyMs: number;
  /** true, wenn das Ergebnis aus dem Idempotenz-Speicher kam (keine Kosten). */
  cached: boolean;
  idempotencyKey: string;
  /** Anzahl der Fortsetzungs-Calls, die noetig waren. */
  continuations: number;
  attempts: number;
}

export interface ProviderRequest {
  modelId: string;
  temperature: number;
  topP?: number;
  maxOutputTokens: number;
  thinkingBudget?: number;
  timeoutMs: number;
  /** Fertig assemblierter Prompt, Sektionen bereits gerendert. */
  prompt: string;
  /** Trennung fuer Provider, die ein System-Feld kennen. */
  system: string;
  /** JSON-Schema fuer Structured Output; undefined = freier Text. */
  jsonSchema?: unknown;
  /** Fuer Prefix-Caching: Hash der stabilen Sektionen. */
  cacheKey?: string;
  signal?: AbortSignal;
}

export interface ProviderResponse {
  text: string;
  finishReason: FinishReason;
  usage: Usage;
  modelId: string;
  requestId?: string;
}

export interface Provider {
  readonly name: string;
  generate(req: ProviderRequest): Promise<ProviderResponse>;
}

/** Persistenz der Idempotenz — in Produktion die Tabelle `llm_calls`. */
export interface IdempotencyStore {
  get(key: string): Promise<StoredCall | undefined>;
  put(key: string, value: StoredCall): Promise<void>;
}

export interface StoredCall {
  raw: string;
  finishReason: FinishReason;
  usage: Usage;
  modelId: string;
  provider: string;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, StoredCall>();
  async get(key: string): Promise<StoredCall | undefined> { return this.map.get(key); }
  async put(key: string, value: StoredCall): Promise<void> { this.map.set(key, value); }
  get size(): number { return this.map.size; }
}

/** Budgetwaechter. Wirft, bevor ein Call rausgeht — nicht danach. */
export interface BudgetGuard {
  check(estimatedOutputTokens: number): void;
  record(usage: Usage): void;
  readonly spent: Usage;
}

export interface StructuredRequest<T> extends LlmRequest {
  schema: ZodType<T>;
  jsonSchema?: unknown;
}
