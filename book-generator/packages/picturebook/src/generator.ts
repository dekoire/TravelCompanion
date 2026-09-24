/**
 * Textgenerator — die gesamte Schnittstelle zu einem Sprachmodell.
 *
 * Bewusst minimal: ein String rein, ein String raus. Kein Capability-Routing,
 * keine Budgetverwaltung, keine Idempotenz, keine Kostenrechnung. Wer den
 * Service betreibt, bringt seinen eigenen Anbieter mit und rechnet dort ab.
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

export interface TextGenerator {
  /** Erscheint in der API-Antwort, damit nachvollziehbar ist, wer geschrieben hat. */
  readonly name: string;
  /** true, wenn kein Sprachmodell beteiligt ist. Der Service weist das aus. */
  readonly synthetic: boolean;
  complete(req: CompletionRequest): Promise<string>;
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
 * Die Antwortstruktur unterscheidet sich je Anbieter, deshalb wird der Pfad zum
 * Text als Funktion uebergeben. Damit laesst sich praktisch jede Chat-API in
 * wenigen Zeilen anbinden, ohne dass dieses Paket einen Anbieter kennt.
 */
export interface HttpGeneratorOptions {
  name: string;
  endpoint: string;
  headers: Record<string, string>;
  /** Baut den anbieterspezifischen Request-Body. */
  buildBody: (req: CompletionRequest) => unknown;
  /** Holt den Text aus der anbieterspezifischen Antwort. */
  readText: (response: unknown) => string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class HttpJsonGenerator implements TextGenerator {
  readonly name: string;
  readonly synthetic = false;
  private readonly o: HttpGeneratorOptions;

  constructor(options: HttpGeneratorOptions) {
    this.o = options;
    this.name = options.name;
  }

  async complete(req: CompletionRequest): Promise<string> {
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
          `${this.name}: HTTP ${res.status} ${body.slice(0, 300)}`,
          res.status === 429 || res.status >= 500 ? 'unavailable' : 'invalid_output');
      }
      const json: unknown = await res.json();
      const text = this.o.readText(json);
      if (typeof text !== 'string' || text.length === 0) {
        throw new GeneratorError(`${this.name}: leere Antwort`, 'invalid_output');
      }
      return text;
    } catch (err) {
      if (err instanceof GeneratorError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new GeneratorError(`${this.name}: Zeitüberschreitung nach ${timeout} ms`, 'timeout', err);
      }
      throw new GeneratorError(`${this.name}: ${(err as Error).message}`, 'unavailable', err);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Holt JSON aus einer Antwort, die es in Code-Fences oder Vorrede verpackt hat. */
export function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fence = /```(?:json)?\s*\n?([\s\S]*?)\n?```/.exec(trimmed);
  if (fence?.[1]) return fence[1].trim();
  const first = trimmed.search(/[[{]/);
  return first > 0 ? trimmed.slice(first) : trimmed;
}
