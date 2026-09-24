import { describe, expect, it } from 'vitest';
import { PictureBookDraft } from '@abg/schemas';
import { GeneratorError } from './generator';
import {
  AI_GATEWAY_URL, VercelGatewayGenerator, gatewayFromEnv, pictureBookJsonSchema,
} from './vercel-gateway';

/** Antwort im OpenAI-kompatiblen Format, wie das Gateway sie liefert. */
function chatResponse(content: string, over: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({
    id: 'chatcmpl-1', object: 'chat.completion', created: 1, model: 'anthropic/claude-opus-5',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 1200, completion_tokens: 3400, total_tokens: 4600 },
    ...over,
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

interface Captured { url: string; init: RequestInit; body: Record<string, any> }

function capturing(response: () => Response): { fetchImpl: typeof fetch; calls: Captured[] } {
  const calls: Captured[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url), init: init ?? {},
      body: JSON.parse(String(init?.body ?? '{}')) as Record<string, any>,
    });
    return response();
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function gen(over: Record<string, unknown> = {}, response = () => chatResponse('{"ok":true}')) {
  const cap = capturing(response);
  const g = new VercelGatewayGenerator({
    apiKey: 'test-key', model: 'anthropic/claude-opus-5',
    fetchImpl: cap.fetchImpl, ...over,
  });
  return { g, calls: cap.calls };
}

describe('VercelGatewayGenerator — Aufbau der Anfrage', () => {
  it('spricht den dokumentierten Endpunkt an', async () => {
    const { g, calls } = gen();
    await g.complete({ prompt: 'Test' });
    expect(calls[0]!.url).toBe(AI_GATEWAY_URL);
    expect(calls[0]!.init.method).toBe('POST');
  });

  it('sendet den Schlüssel als Bearer-Token', async () => {
    const { g, calls } = gen();
    await g.complete({ prompt: 'Test' });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer test-key');
    expect(headers['content-type']).toBe('application/json');
  });

  it('baut System- und Nutzernachricht in der richtigen Reihenfolge', async () => {
    const { g, calls } = gen();
    await g.complete({ system: 'Du bist Autor.', prompt: 'Schreib ein Buch.' });
    expect(calls[0]!.body['messages']).toEqual([
      { role: 'system', content: 'Du bist Autor.' },
      { role: 'user', content: 'Schreib ein Buch.' },
    ]);
  });

  it('lässt die Systemnachricht weg, wenn keine da ist', async () => {
    const { g, calls } = gen();
    await g.complete({ prompt: 'Nur Nutzer.' });
    expect(calls[0]!.body['messages']).toHaveLength(1);
  });

  it('übersetzt die Parameter in OpenAI-Namen', async () => {
    const { g, calls } = gen();
    await g.complete({ prompt: 'x', temperature: 0.7, maxOutputTokens: 4000 });
    expect(calls[0]!.body['temperature']).toBe(0.7);
    expect(calls[0]!.body['max_tokens']).toBe(4000);
    expect(calls[0]!.body['stream']).toBe(false);
  });

  it('gibt Fallback-Modelle als Gateway-Erweiterung mit', async () => {
    const { g, calls } = gen({ fallbackModels: ['openai/gpt-5.6-sol', 'google/gemini-3.6-flash'] });
    await g.complete({ prompt: 'x' });
    expect(calls[0]!.body['model']).toBe('anthropic/claude-opus-5');
    expect(calls[0]!.body['models']).toEqual(['openai/gpt-5.6-sol', 'google/gemini-3.6-flash']);
  });

  it('reicht Routing-Vorgaben durch', async () => {
    const { g, calls } = gen({ provider: { sort: 'cost' } });
    await g.complete({ prompt: 'x' });
    expect(calls[0]!.body['provider']).toEqual({ sort: 'cost' });
  });
});

describe('VercelGatewayGenerator — Antwortformat', () => {
  it('verlangt standardmäßig nur JSON', async () => {
    const { g, calls } = gen();
    await g.complete({ prompt: 'x' });
    expect(calls[0]!.body['response_format']).toEqual({ type: 'json_object' });
  });

  it('gibt auf Wunsch das Schema mit', async () => {
    const { g, calls } = gen({ responseFormat: 'json_schema' });
    await g.complete({ prompt: 'x', jsonSchema: { type: 'object' } });
    expect(calls[0]!.body['response_format'].type).toBe('json_schema');
    expect(calls[0]!.body['response_format'].json_schema.schema).toEqual({ type: 'object' });
    // Kein strict: der Entwurf hat optionale Felder, strict verlangt alle.
    expect(calls[0]!.body['response_format'].json_schema.strict).toBe(false);
  });

  it('kann das Format ganz weglassen', async () => {
    const { g, calls } = gen({ responseFormat: 'none' });
    await g.complete({ prompt: 'x' });
    expect(calls[0]!.body['response_format']).toBeUndefined();
  });
});

describe('VercelGatewayGenerator — Antwort lesen', () => {
  it('liefert den Text', async () => {
    const { g } = gen({}, () => chatResponse('{"title":"Test"}'));
    expect((await g.complete({ prompt: 'x' })).text).toBe('{"title":"Test"}');
  });

  it('meldet, welches Modell tatsächlich geantwortet hat', async () => {
    // Bei einer Fallback-Kette ist das nicht zwingend das angefragte.
    const { g } = gen({ fallbackModels: ['openai/gpt-5.6-sol'] },
      () => chatResponse('{}', { model: 'openai/gpt-5.6-sol' }));
    expect((await g.complete({ prompt: 'x' })).modelId).toBe('openai/gpt-5.6-sol');
  });

  it('liefert den Tokenverbrauch', async () => {
    const { g } = gen();
    expect((await g.complete({ prompt: 'x' })).usage)
      .toEqual({ inputTokens: 1200, outputTokens: 3400 });
  });

  it('kommt ohne usage-Feld zurecht', async () => {
    const { g } = gen({}, () => chatResponse('{}', { usage: undefined }));
    expect((await g.complete({ prompt: 'x' })).usage).toBeUndefined();
  });
});

describe('VercelGatewayGenerator — Fehler', () => {
  const err = (status: number, body = 'fehler') => () =>
    new Response(body, { status, headers: { 'content-type': 'text/plain' } });

  it('behandelt 429 als vorübergehend', async () => {
    const { g } = gen({}, err(429));
    await expect(g.complete({ prompt: 'x' })).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('behandelt 500 als vorübergehend', async () => {
    const { g } = gen({}, err(500));
    await expect(g.complete({ prompt: 'x' })).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('behandelt 401 nicht als vorübergehend', async () => {
    const { g } = gen({}, err(401, 'invalid key'));
    await expect(g.complete({ prompt: 'x' })).rejects.toMatchObject({ kind: 'invalid_output' });
  });

  it('behandelt 403 als Verweigerung', async () => {
    const { g } = gen({}, err(403));
    await expect(g.complete({ prompt: 'x' })).rejects.toMatchObject({ kind: 'refused' });
  });

  it('erkennt eine abgeschnittene Antwort', async () => {
    const { g } = gen({}, () => chatResponse('{"title":"abgeschn', {
      choices: [{ index: 0, message: { content: '{"title":"abgeschn' }, finish_reason: 'length' }],
    }));
    await expect(g.complete({ prompt: 'x' })).rejects.toThrow(/abgeschnitten/);
  });

  it('erkennt einen Inhaltsfilter', async () => {
    const { g } = gen({}, () => chatResponse('', {
      choices: [{ index: 0, message: { content: '' }, finish_reason: 'content_filter' }],
    }));
    await expect(g.complete({ prompt: 'x' })).rejects.toMatchObject({ kind: 'refused' });
  });

  it('meldet eine leere Antwort', async () => {
    const { g } = gen({}, () => chatResponse('', { choices: [] }));
    await expect(g.complete({ prompt: 'x' })).rejects.toThrow(/leere Antwort/);
  });

  it('verrät den Schlüssel nicht in der Fehlermeldung', async () => {
    const { g } = gen({}, err(401, 'invalid api key: test-key'));
    let message = '';
    try { await g.complete({ prompt: 'x' }); } catch (e) { message = (e as Error).message; }
    expect(message).toContain('HTTP 401');
    // Der Anbieter spiegelt den Schlüssel in seiner Fehlermeldung — der Text
    // landet in Logs, deshalb darf er dort nicht stehen.
    expect(message).not.toContain('test-key');
  });
});

describe('VercelGatewayGenerator — Konfiguration', () => {
  it('verlangt einen Schlüssel', () => {
    expect(() => new VercelGatewayGenerator({ apiKey: '', model: 'anthropic/claude-opus-5' }))
      .toThrow(GeneratorError);
  });

  it('verlangt eine Modell-ID in der Form anbieter/modell', () => {
    expect(() => new VercelGatewayGenerator({ apiKey: 'k', model: 'claude-opus-5' }))
      .toThrow(/anbieter\/modell/);
    expect(() => new VercelGatewayGenerator({ apiKey: 'k', model: 'anthropic/claude-opus-5' }))
      .not.toThrow();
  });

  it('ist nicht synthetisch — hier schreibt ein echtes Modell', () => {
    const { g } = gen();
    expect(g.synthetic).toBe(false);
    expect(g.name).toBe('vercel-ai-gateway');
  });
});

describe('gatewayFromEnv', () => {
  it('gibt null zurück, wenn kein Schlüssel gesetzt ist', () => {
    expect(gatewayFromEnv({})).toBeNull();
  });

  it('nimmt AI_GATEWAY_API_KEY', () => {
    expect(gatewayFromEnv({ AI_GATEWAY_API_KEY: 'k' })).not.toBeNull();
  });

  it('nimmt ersatzweise VERCEL_OIDC_TOKEN', () => {
    expect(gatewayFromEnv({ VERCEL_OIDC_TOKEN: 'k' })).not.toBeNull();
  });

  it('liest Modell und Fallbacks aus der Umgebung', () => {
    const g = gatewayFromEnv({
      AI_GATEWAY_API_KEY: 'k',
      ABG_MODEL: 'openai/gpt-5.6-sol',
      ABG_FALLBACK_MODELS: 'anthropic/claude-opus-5, google/gemini-3.6-flash',
    });
    expect(g?.model).toBe('openai/gpt-5.6-sol');
  });

  it('hat eine Vorgabe für das Modell', () => {
    expect(gatewayFromEnv({ AI_GATEWAY_API_KEY: 'k' })?.model).toMatch(/^[a-z]+\//);
  });
});

describe('pictureBookJsonSchema', () => {
  it('erzeugt ein JSON-Schema aus dem Zod-Vertrag', () => {
    const s = pictureBookJsonSchema() as Record<string, any>;
    expect(s['type']).toBe('object');
    expect(Object.keys(s['properties'])).toEqual(
      expect.arrayContaining(['title', 'premise', 'characters', 'style', 'spreads']));
  });

  it('gibt bei jedem Aufruf dasselbe zurück', () => {
    expect(pictureBookJsonSchema()).toBe(pictureBookJsonSchema());
  });

  it('bleibt mit dem Zod-Vertrag in Deckung', () => {
    // Wenn jemand PictureBookDraft aendert, muss das Schema mitwandern —
    // es wird daraus erzeugt, nicht daneben gepflegt.
    const s = pictureBookJsonSchema() as Record<string, any>;
    const zodKeys = Object.keys(PictureBookDraft.shape);
    expect(Object.keys(s['properties']).sort()).toEqual(zodKeys.sort());
  });
});
