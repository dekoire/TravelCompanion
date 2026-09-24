/**
 * Textgenerator — die gesamte Schnittstelle zu einem Sprachmodell.
 *
 * Bewusst minimal: ein Auftrag rein, Text raus. Kein Capability-Routing, keine
 * Budgetverwaltung, keine Idempotenz, keine Kostenrechnung. Wer den Service
 * betreibt, bringt seinen Anbieter mit und rechnet dort ab.
 *
 * Alles, was den Service ausmacht — Seitenplan, Prueflogik, Bildprompts,
 * Figurenkonsistenz — liegt davor und dahinter, nicht hier.
 */
export interface CompletionRequest {
  /** Systemanweisung, sofern der Anbieter eine kennt. */
  system?: string;
  /** Der eigentliche Auftrag. */
  prompt: string;
  /** JSON-Schema fuer Anbieter mit Structured Output. Optional. */
  jsonSchema?: unknown;
  maxOutputTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface CompletionUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompletionResult {
  text: string;
  /**
   * Das Modell, das tatsaechlich geantwortet hat. Bei einem Gateway mit
   * Fallback-Kette ist das nicht zwingend das angefragte — genau deshalb
   * gehoert es in die Antwort.
   */
  modelId?: string;
  usage?: CompletionUsage;
}

export interface TextGenerator {
  /** Erscheint in der API-Antwort, damit nachvollziehbar ist, wer geschrieben hat. */
  readonly name: string;
  /** true, wenn kein Sprachmodell beteiligt ist. Der Service weist das aus. */
  readonly synthetic: boolean;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

export class GeneratorError extends Error {
  constructor(
    message: string,
    readonly kind: 'unavailable' | 'invalid_output' | 'refused' | 'timeout' = 'unavailable',
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GeneratorError';
  }
}

/**
 * Adapter fuer jeden Anbieter, der JSON ueber HTTP spricht.
 *
 * Die Antwortstruktur unterscheidet sich je Anbieter, deshalb werden Body-Bau
 * und Textextraktion als Funktionen uebergeben. Damit laesst sich praktisch
 * jede Chat-API anbinden, ohne dass dieses Paket einen Anbieter kennt.
 */
export interface HttpGeneratorOptions {
  name: string;
  endpoint: string;
  headers: Record<string, string>;
  buildBody: (req: CompletionRequest) => unknown;
  readResult: (response: unknown) => CompletionResult;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  synthetic?: boolean;
}

export class HttpJsonGenerator implements TextGenerator {
  readonly name: string;
  readonly synthetic: boolean;
  protected readonly o: HttpGeneratorOptions;

  constructor(options: HttpGeneratorOptions) {
    this.o = options;
    this.name = options.name;
    this.synthetic = options.synthetic ?? false;
  }

  /**
   * Entfernt Geheimnisse aus Anbieter-Fehlertexten.
   *
   * Manche Anbieter spiegeln den gesendeten Schluessel in ihrer Fehlermeldung.
   * Dieser Text landet in Logs und in API-Antworten.
   */
  protected redact(text: string): string {
    let out = text;
    for (const value of Object.values(this.o.headers)) {
      const secret = value.replace(/^Bearer\s+/i, '').trim();
      if (secret.length >= 8) out = out.split(secret).join('[entfernt]');
    }
    return out;
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const f = this.o.fetchImpl ?? fetch;
    const timeout = this.o.timeoutMs ?? 180_000;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    req.signal?.addEventListener('abort', () => ctrl.abort(), { once: true });

    try {
      const res = await f(this.o.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...this.o.headers },
        body: JSON.stringify(this.o.buildBody(req)),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new GeneratorError(
          `${this.name}: HTTP ${res.status} ${this.redact(body).slice(0, 300)}`,
          classifyStatus(res.status));
      }

      const json: unknown = await res.json();
      const result = this.o.readResult(json);
      if (typeof result.text !== 'string' || result.text.length === 0) {
        throw new GeneratorError(`${this.name}: leere Antwort`, 'invalid_output');
      }
      return result;
    } catch (err) {
      if (err instanceof GeneratorError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new GeneratorError(
          `${this.name}: Zeitüberschreitung nach ${timeout} ms`, 'timeout', err);
      }
      throw new GeneratorError(`${this.name}: ${(err as Error).message}`, 'unavailable', err);
    } finally {
      clearTimeout(timer);
    }
  }
}

export function classifyStatus(status: number): GeneratorError['kind'] {
  if (status === 429 || status >= 500) return 'unavailable';
  if (status === 403 || status === 451) return 'refused';
  return 'invalid_output';
}

/** Holt JSON aus einer Antwort, die es in Code-Fences oder Vorrede verpackt hat. */
export function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fence = /```(?:json)?\s*\n?([\s\S]*?)\n?```/.exec(trimmed);
  if (fence?.[1]) return fence[1].trim();
  const first = trimmed.search(/[[{]/);
  return first > 0 ? trimmed.slice(first) : trimmed;
}
