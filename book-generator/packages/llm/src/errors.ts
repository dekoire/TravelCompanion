/**
 * Fehlerklassen (16 §5). Nur TRANSIENT wird wiederholt — blindes Retry auf
 * SCHEMA oder REFUSAL verbrennt Budget ohne Aussicht auf Erfolg.
 */
export type ErrorClass =
  | 'TRANSIENT'
  | 'TRUNCATION'
  | 'SCHEMA'
  | 'REFUSAL'
  | 'CONTENT_BLOCK'
  | 'BUDGET'
  | 'DEPENDENCY'
  | 'FATAL';

export class LlmError extends Error {
  constructor(
    readonly errorClass: ErrorClass,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = `LlmError(${errorClass})`;
  }
  get retryable(): boolean {
    return this.errorClass === 'TRANSIENT';
  }
}

export class TransientError extends LlmError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('TRANSIENT', message, details);
  }
}

export class SchemaError extends LlmError {
  constructor(message: string, readonly issues: unknown, readonly rawOutput: string) {
    super('SCHEMA', message, { issues });
  }
}

export class RefusalError extends LlmError {
  constructor(message: string, readonly rawOutput: string) {
    super('REFUSAL', message, {});
  }
}

export class ContentBlockError extends LlmError {
  constructor(message: string, readonly categories: string[] = []) {
    super('CONTENT_BLOCK', message, { categories });
  }
}

export class BudgetExceededError extends LlmError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('BUDGET', message, details);
  }
}

export class TruncationError extends LlmError {
  constructor(message: string, readonly partial: string) {
    super('TRUNCATION', message, {});
  }
}

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export function classifyHttpStatus(status: number, message = ''): LlmError {
  if (TRANSIENT_STATUS.has(status)) {
    return new TransientError(`HTTP ${status}: ${message}`, { status });
  }
  if (status === 400) return new LlmError('DEPENDENCY', `HTTP 400: ${message}`, { status });
  return new LlmError('FATAL', `HTTP ${status}: ${message}`, { status });
}
