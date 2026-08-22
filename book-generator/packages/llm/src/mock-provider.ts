import type { Provider, ProviderRequest, ProviderResponse, FinishReason, Usage } from './types';
import { TransientError, classifyHttpStatus } from './errors';

/**
 * Mock-Provider (01 §5). Nicht optional: ohne ihn ist keine Testsuite bezahlbar.
 * Liefert zu jedem Fixture-Tag ein hinterlegtes Skript und erlaubt Fehlerinjektion.
 */

export type MockStep =
  | { kind: 'text'; text: string; finishReason?: FinishReason; usage?: Partial<Usage> }
  | { kind: 'json'; value: unknown; finishReason?: FinishReason; usage?: Partial<Usage> }
  | { kind: 'raw'; text: string; finishReason?: FinishReason }
  | { kind: 'http_error'; status: number; message?: string }
  | { kind: 'throw'; error: Error };

export interface MockScript {
  /** Wird der Reihe nach abgearbeitet; der letzte Schritt wiederholt sich. */
  steps: MockStep[];
}

export interface MockProviderOptions {
  name?: string;
  /** Fixtures nach Tag. Der Tag kommt aus LlmRequest.fixtureTag. */
  scripts?: Record<string, MockScript>;
  /** Fallback, wenn kein Tag passt. */
  defaultScript?: MockScript;
  /** Simulierte Latenz je Call (fuer Tests: 0). */
  latencyMs?: number;
}

export interface MockCallRecord {
  modelId: string;
  prompt: string;
  system: string;
  maxOutputTokens: number;
  cacheKey?: string;
  hasSchema: boolean;
}

export class MockProvider implements Provider {
  readonly name: string;
  private readonly scripts: Record<string, MockScript>;
  private readonly defaultScript: MockScript;
  private readonly latencyMs: number;
  private readonly cursor = new Map<string, number>();

  /** Alle Calls, fuer Assertions in Tests. */
  readonly calls: MockCallRecord[] = [];

  constructor(opts: MockProviderOptions = {}) {
    this.name = opts.name ?? 'mock';
    this.scripts = opts.scripts ?? {};
    this.defaultScript = opts.defaultScript ?? {
      steps: [{ kind: 'text', text: 'Mock-Ausgabe.' }],
    };
    this.latencyMs = opts.latencyMs ?? 0;
  }

  /** Fixture-Tag wird ueber den Prompt transportiert (siehe gateway.renderPrompt). */
  private tagOf(prompt: string): string {
    const m = /<!--fixture:([a-z0-9_.-]+)-->/i.exec(prompt);
    return m?.[1] ?? 'default';
  }

  async generate(req: ProviderRequest): Promise<ProviderResponse> {
    this.calls.push({
      modelId: req.modelId,
      prompt: req.prompt,
      system: req.system,
      maxOutputTokens: req.maxOutputTokens,
      ...(req.cacheKey !== undefined ? { cacheKey: req.cacheKey } : {}),
      hasSchema: req.jsonSchema !== undefined,
    });

    if (this.latencyMs > 0) await sleep(this.latencyMs);
    if (req.signal?.aborted) throw new TransientError('aborted');

    const tag = this.tagOf(req.prompt);
    const script = this.scripts[tag] ?? this.defaultScript;
    const i = this.cursor.get(tag) ?? 0;
    const step = script.steps[Math.min(i, script.steps.length - 1)];
    this.cursor.set(tag, i + 1);
    if (!step) throw new Error(`Mock script "${tag}" has no steps`);

    switch (step.kind) {
      case 'http_error':
        throw classifyHttpStatus(step.status, step.message ?? 'mock');
      case 'throw':
        throw step.error;
      case 'raw':
        return this.respond(req, step.text, step.finishReason ?? 'stop');
      case 'json':
        return this.respond(req, JSON.stringify(step.value), step.finishReason ?? 'stop',
          step.usage);
      case 'text':
      default:
        return this.respond(req, step.text, step.finishReason ?? 'stop', step.usage);
    }
  }

  private respond(
    req: ProviderRequest, text: string, finishReason: FinishReason,
    usageOverride?: Partial<Usage>,
  ): ProviderResponse {
    // Grobe, aber stabile Token-Schaetzung: 4 Zeichen je Token.
    const inputTokens = Math.ceil((req.prompt.length + req.system.length) / 4);
    const outputTokens = Math.ceil(text.length / 4);
    // Cache-Simulation: mit cacheKey gelten 55 % des Inputs als gecached.
    const cachedInputTokens = req.cacheKey ? Math.floor(inputTokens * 0.55) : 0;
    return {
      text,
      finishReason,
      usage: {
        inputTokens, outputTokens, cachedInputTokens, thinkingTokens: 0,
        ...usageOverride,
      },
      modelId: req.modelId,
      requestId: `mock_${this.calls.length}`,
    };
  }

  reset(): void {
    this.cursor.clear();
    this.calls.length = 0;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Erzeugt einen Kapiteltext mit korrekten Szenenmarkern (fuer Pipeline-Tests). */
export function mockChapterText(sceneSlugs: readonly string[], wordsPerScene = 120): string {
  const sentence = 'Der Regen hatte aufgehört, als sie die Treppe hinabstieg und lauschte. ';
  const parts = sceneSlugs.map((slug) => {
    const words: string[] = [];
    while (words.join(' ').split(' ').length < wordsPerScene) words.push(sentence.trim());
    return `<<<SCENE ${slug}>>>\n${words.join(' ')}`;
  });
  return parts.join('\n\n') + '\n<<<END>>>';
}
