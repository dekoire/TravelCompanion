import { PictureBookDraft } from '@abg/schemas';
import { z } from 'zod';
import {
  HttpJsonGenerator, GeneratorError,
  type CompletionRequest, type CompletionResult,
} from './generator';

/**
 * Vercel AI Gateway.
 *
 * Ein Endpunkt, ein Schluessel, viele Modelle — die Abrechnung laeuft bei
 * Vercel, nicht hier. Genau deshalb passt es zu diesem Service: er braucht
 * weder Anbieterverwaltung noch Kostenrechnung.
 *
 * Belegt durch die Vercel-Dokumentation (Stand der Einbindung):
 *   Endpunkt   POST https://ai-gateway.vercel.sh/v1/chat/completions
 *   Auth       Authorization: Bearer <AI_GATEWAY_API_KEY | VERCEL_OIDC_TOKEN>
 *   Modell-ID  "anbieter/modell", z. B. "anthropic/claude-opus-5"
 *   Fallback   Feld `models` als Gateway-Erweiterung
 *   Format     OpenAI-kompatibel (choices[0].message.content, usage)
 */

export const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

export interface VercelGatewayOptions {
  /** AI_GATEWAY_API_KEY oder VERCEL_OIDC_TOKEN. */
  apiKey: string;
  /** Modell-ID in der Form "anbieter/modell". */
  model: string;
  /** Weitere Modelle, die das Gateway der Reihe nach versucht. */
  fallbackModels?: string[];
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /**
   * Wie das Antwortformat erzwungen wird:
   *   'json_object'  — nur "gib JSON zurueck" (breiteste Modellunterstuetzung)
   *   'json_schema'  — Schema mitgeben (bessere Treue, nicht jedes Modell kann es)
   *   'none'         — gar nichts
   * Vorgabe ist 'json_object': die eigentliche Pruefung macht ohnehin Zod,
   * und ein Schema, das ein Modell nicht versteht, kostet den ganzen Aufruf.
   */
  responseFormat?: 'json_object' | 'json_schema' | 'none';
  /** Routing-Vorgabe des Gateways, z. B. { sort: 'cost' }. */
  provider?: Record<string, unknown>;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class VercelGatewayGenerator extends HttpJsonGenerator {
  readonly model: string;

  constructor(options: VercelGatewayOptions) {
    if (!options.apiKey) {
      throw new GeneratorError('Vercel AI Gateway: kein API-Schlüssel', 'refused');
    }
    if (!/^[a-z0-9-]+\/[a-z0-9._-]+$/i.test(options.model)) {
      throw new GeneratorError(
        `Vercel AI Gateway: "${options.model}" ist keine gültige Modell-ID. `
        + 'Erwartet wird "anbieter/modell", z. B. "anthropic/claude-opus-5".', 'refused');
    }

    const format = options.responseFormat ?? 'json_object';

    super({
      name: 'vercel-ai-gateway',
      synthetic: false,
      endpoint: options.endpoint ?? AI_GATEWAY_URL,
      headers: { authorization: `Bearer ${options.apiKey}` },
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),

      buildBody: (req: CompletionRequest) => ({
        model: options.model,
        ...(options.fallbackModels?.length ? { models: options.fallbackModels } : {}),
        ...(options.provider ? { provider: options.provider } : {}),
        messages: [
          ...(req.system ? [{ role: 'system', content: req.system }] : []),
          { role: 'user', content: req.prompt },
        ],
        stream: false,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        ...(req.maxOutputTokens !== undefined ? { max_tokens: req.maxOutputTokens } : {}),
        ...responseFormatFor(format, req.jsonSchema),
      }),

      readResult: (raw: unknown): CompletionResult => {
        const r = raw as ChatCompletionResponse;
        const choice = r.choices?.[0];
        const text = choice?.message?.content ?? '';

        if (choice?.finish_reason === 'length') {
          throw new GeneratorError(
            'Vercel AI Gateway: Antwort war abgeschnitten (max_tokens zu klein)',
            'invalid_output');
        }
        if (choice?.finish_reason === 'content_filter') {
          throw new GeneratorError(
            'Vercel AI Gateway: Das Modell hat die Ausgabe gesperrt', 'refused');
        }

        return {
          text,
          // Bei einer Fallback-Kette ist das nicht zwingend das angefragte Modell.
          ...(r.model ? { modelId: r.model } : {}),
          ...(r.usage
            ? { usage: {
                inputTokens: r.usage.prompt_tokens ?? 0,
                outputTokens: r.usage.completion_tokens ?? 0,
              } }
            : {}),
        };
      },
    });

    this.model = options.model;
  }
}

function responseFormatFor(
  mode: 'json_object' | 'json_schema' | 'none', schema: unknown,
): Record<string, unknown> {
  if (mode === 'none') return {};
  if (mode === 'json_schema' && schema) {
    return {
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'picture_book', schema, strict: false },
      },
    };
  }
  return { response_format: { type: 'json_object' } };
}

/**
 * JSON-Schema des Bilderbuch-Entwurfs, fuer Anbieter mit Structured Output.
 *
 * Bewusst NICHT im strict-Modus: der Entwurf hat optionale Felder und
 * Vorgabewerte, und strict verlangt, dass jedes Feld in `required` steht.
 * Die verbindliche Pruefung macht ohnehin Zod nach der Antwort.
 */
let cached: unknown;
export function pictureBookJsonSchema(): unknown {
  cached ??= z.toJSONSchema(PictureBookDraft, { target: 'draft-7', io: 'input' });
  return cached;
}

/** Baut den Generator aus der Umgebung. Gibt null zurueck, wenn kein Schluessel da ist. */
export function gatewayFromEnv(
  env: Record<string, string | undefined>,
): VercelGatewayGenerator | null {
  const apiKey = env['AI_GATEWAY_API_KEY'] ?? env['VERCEL_OIDC_TOKEN'];
  if (!apiKey) return null;

  const model = env['ABG_MODEL'] ?? 'anthropic/claude-opus-5';
  const fallbacks = (env['ABG_FALLBACK_MODELS'] ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);

  return new VercelGatewayGenerator({
    apiKey,
    model,
    ...(fallbacks.length ? { fallbackModels: fallbacks } : {}),
    ...(env['ABG_RESPONSE_FORMAT']
      ? { responseFormat: env['ABG_RESPONSE_FORMAT'] as 'json_object' | 'json_schema' | 'none' }
      : {}),
  });
}
