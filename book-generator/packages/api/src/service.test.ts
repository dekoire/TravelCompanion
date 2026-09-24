import { describe, expect, it, beforeEach } from 'vitest';
import { DemoGenerator, MemoryBookStore, type TextGenerator } from '@abg/picturebook';
import { GeneratorError } from '@abg/picturebook';
import { createService, type Service } from './service';

const KEY = 'test_key_1';
const AUTH = { keys: { [KEY]: 'kunde_a', test_key_2: 'kunde_b' } };

function service(generator: TextGenerator = new DemoGenerator()): Service {
  return createService({
    generator, auth: AUTH, store: new MemoryBookStore(),
    now: () => 1_700_000_000_000,
    makeId: (() => { let n = 0; return () => `pb_test_${++n}`; })(),
  });
}

const req = (path: string, init: RequestInit = {}, key: string | null = KEY): Request =>
  new Request(`https://api.example.com${path}`, {
    ...init,
    headers: {
      ...(key ? { authorization: `Bearer ${key}` } : {}),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

const post = (path: string, body: unknown, key: string | null = KEY): Request =>
  req(path, { method: 'POST', body: JSON.stringify(body) }, key);

async function createBook(s: Service, body: unknown = { prompt: 'Ein Fuchs namens Nuri, der das Meer sucht' }) {
  const res = await s.handle(post('/v1/books', body));
  return { res, json: await res.json() as Record<string, any> };
}

describe('GET /v1/health', () => {
  it('antwortet ohne Schlüssel', async () => {
    const res = await service().handle(req('/v1/health', {}, null));
    expect(res.status).toBe(200);
    const j = await res.json() as Record<string, unknown>;
    expect(j['status']).toBe('ok');
  });

  it('nennt den Generator und die erlaubten Werte', async () => {
    const j = await (await service().handle(req('/v1/health', {}, null))).json() as any;
    expect(j.generator).toEqual({ name: 'demo', synthetic: true });
    expect(j.pageCounts).toEqual([24, 32, 40, 48]);
    expect(j.readingLevels).toContain('pre_reader');
  });
});

describe('Authentifizierung', () => {
  it('lehnt Anfragen ohne Schlüssel ab', async () => {
    const res = await service().handle(post('/v1/books', { prompt: 'x' }, null));
    expect(res.status).toBe(401);
    expect((await res.json() as any).error.code).toBe('unauthorized');
  });

  it('lehnt einen falschen Schlüssel ab', async () => {
    const res = await service().handle(post('/v1/books', { prompt: 'x' }, 'falsch'));
    expect(res.status).toBe(401);
  });

  it('trennt die Daten zweier Kunden', async () => {
    const s = service();
    const { json } = await createBook(s);
    const foreign = await s.handle(req(`/v1/books/${json['id']}`, {}, 'test_key_2'));
    expect(foreign.status).toBe(404);
  });

  it('erlaubt anonymen Zugriff nur, wenn ausdrücklich konfiguriert', async () => {
    const s = createService({
      generator: new DemoGenerator(),
      auth: { keys: {}, allowAnonymousAs: 'lokal' },
      store: new MemoryBookStore(),
    });
    const res = await s.handle(post('/v1/books', { prompt: 'Ein Fuchs, der das Meer sucht' }, null));
    expect(res.status).toBe(201);
  });
});

describe('POST /v1/books', () => {
  it('erzeugt ein Buch aus einem Prompt', async () => {
    const { res, json } = await createBook(service());
    expect(res.status).toBe(201);
    expect(res.headers.get('location')).toBe(`/v1/books/${json['id']}`);
    expect(json['book'].spreads).toHaveLength(14);
    expect(json['validation'].ok).toBe(true);
  });

  it('weist aus, dass kein Sprachmodell beteiligt war', async () => {
    const { json } = await createBook(service());
    expect(json['generator']).toEqual({ name: 'demo', synthetic: true });
    expect(json['notice']).toContain('Demo-Generator');
  });

  it('meldet zurück, was es aus dem Prompt gelesen hat', async () => {
    const { json } = await createBook(service());
    expect(json['understood'].heroName).toBe('Nuri');
    expect(json['understood'].derived.heroName).toBe('prompt');
  });

  it('liefert die Bildprompts gleich mit', async () => {
    const { json } = await createBook(service());
    expect(json['imagePrompts']).toHaveLength(14);
    expect(json['imagePrompts'][0]).toContain('Kein Text, keine Buchstaben');
  });

  it('akzeptiert alle druckbaren Seitenzahlen', async () => {
    for (const pageCount of [24, 32, 40, 48]) {
      const { res, json } = await createBook(service(), { prompt: 'Ein Fuchs', pageCount });
      expect(res.status).toBe(201);
      expect(json['book'].spreads.length).toBe((pageCount - 4) / 2);
    }
  });

  it('lehnt eine nicht druckbare Seitenzahl ab und sagt warum', async () => {
    const { res, json } = await createBook(service(), { prompt: 'Ein Fuchs', pageCount: 30 });
    expect(res.status).toBe(400);
    expect(json['error'].message).toContain('druckbar');
  });

  it('lehnt einen fehlenden Prompt ab', async () => {
    const { res, json } = await createBook(service(), { pageCount: 32 });
    expect(res.status).toBe(400);
    expect(json['error'].message).toContain('prompt fehlt');
  });

  it('lehnt einen zu langen Prompt ab', async () => {
    const { res } = await createBook(service(), { prompt: 'x'.repeat(3000) });
    expect(res.status).toBe(400);
  });

  it('lehnt unbekannte Überschreibungen ab', async () => {
    const { res, json } = await createBook(service(), {
      prompt: 'Ein Fuchs', overrides: { unbekannt: 'x' },
    });
    expect(res.status).toBe(400);
    expect(json['error'].message).toContain('overrides.unbekannt');
  });

  it('übernimmt gültige Überschreibungen', async () => {
    const { json } = await createBook(service(), {
      prompt: 'Eine Geschichte', overrides: { heroName: 'Juno' },
    });
    expect(json['understood'].heroName).toBe('Juno');
  });

  it('verlangt content-type application/json', async () => {
    const res = await service().handle(new Request('https://api.example.com/v1/books', {
      method: 'POST', body: 'prompt=x',
      headers: { authorization: `Bearer ${KEY}`, 'content-type': 'text/plain' },
    }));
    expect(res.status).toBe(415);
  });

  it('lehnt kaputtes JSON mit klarer Meldung ab', async () => {
    const res = await service().handle(new Request('https://api.example.com/v1/books', {
      method: 'POST', body: '{ kaputt',
      headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    }));
    expect(res.status).toBe(400);
    expect((await res.json() as any).error.message).toContain('JSON');
  });
});

describe('Generatorfehler werden übersetzt', () => {
  class Failing implements TextGenerator {
    readonly name = 'failing';
    readonly synthetic = false;
    constructor(private readonly kind: 'unavailable' | 'timeout' | 'invalid_output') {}
    async complete(): Promise<string> {
      throw new GeneratorError(`kaputt: ${this.kind}`, this.kind);
    }
  }

  it('meldet einen nicht erreichbaren Anbieter als 503', async () => {
    const { res } = await createBook(service(new Failing('unavailable')));
    expect(res.status).toBe(503);
  });

  it('meldet eine Zeitüberschreitung als 504', async () => {
    const { res } = await createBook(service(new Failing('timeout')));
    expect(res.status).toBe(504);
  });

  it('meldet unbrauchbare Ausgaben als 502', async () => {
    const { res, json } = await createBook(service(new Failing('invalid_output')));
    expect(res.status).toBe(502);
    expect(json['error'].code).toBe('generator_failed');
  });

  it('gibt interne Fehler nicht nach außen weiter', async () => {
    class Boom implements TextGenerator {
      readonly name = 'boom'; readonly synthetic = false;
      async complete(): Promise<string> { throw new Error('DB-Passwort war falsch'); }
    }
    const { res, json } = await createBook(service(new Boom()));
    expect(res.status).toBe(500);
    expect(JSON.stringify(json)).not.toContain('Passwort');
  });
});

describe('GET /v1/books/:id', () => {
  let s: Service;
  let id: string;
  beforeEach(async () => {
    s = service();
    id = (await createBook(s)).json['id'];
  });

  it('gibt das Buch zurück', async () => {
    const res = await s.handle(req(`/v1/books/${id}`));
    expect(res.status).toBe(200);
    expect((await res.json() as any).book.spreads).toHaveLength(14);
  });

  it('liefert Bildprompts nur auf Anforderung', async () => {
    const plain = await (await s.handle(req(`/v1/books/${id}`))).json() as any;
    expect(plain.imagePrompts).toBeUndefined();
    const full = await (await s.handle(req(`/v1/books/${id}?include=prompts`))).json() as any;
    expect(full.imagePrompts).toHaveLength(14);
  });

  it('meldet 404 für ein unbekanntes Buch', async () => {
    expect((await s.handle(req('/v1/books/pb_gibtsnicht'))).status).toBe(404);
  });
});

describe('PATCH /v1/books/:id/spreads/:n', () => {
  let s: Service;
  let id: string;
  beforeEach(async () => {
    s = service();
    id = (await createBook(s)).json['id'];
  });

  const patch = (n: number, body: unknown) =>
    s.handle(req(`/v1/books/${id}/spreads/${n}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }));

  it('ändert den Text und prüft neu', async () => {
    const res = await patch(3, { text: 'Der Wind drehte sich, ganz langsam und leise.' });
    expect(res.status).toBe(200);
    const j = await res.json() as any;
    expect(j.spread.text).toContain('Der Wind drehte sich');
    expect(j.spread.textEdited).toBe(true);
    expect(j.validation).toBeDefined();
  });

  it('meldet einen zu langen Text als Befund, ohne ihn zu verwerfen', async () => {
    const j = await (await patch(3, { text: 'Wort '.repeat(60).trim() })).json() as any;
    expect(j.validation.issues.some(
      (i: any) => i.spreadIndex === 3 && i.code === 'pb_text_too_long')).toBe(true);
  });

  it('gibt den neuen Bildprompt zurück', async () => {
    const j = await (await patch(1, { imageBrief: { setting: 'auf einem Leuchtturm' } })).json() as any;
    expect(j.imagePrompt).toContain('auf einem Leuchtturm');
  });

  it('speichert die Änderung', async () => {
    await patch(2, { beat: 'Neuer Beat' });
    const j = await (await s.handle(req(`/v1/books/${id}`))).json() as any;
    expect(j.book.spreads[1].beat).toBe('Neuer Beat');
  });

  it('lehnt eine Figur ohne Figurenblatt ab', async () => {
    const res = await patch(1, { charactersPresent: ['gibtsnicht'] });
    expect(res.status).toBe(400);
    expect((await res.json() as any).error.message).toContain('kein Figurenblatt');
  });

  it('lehnt ein unbekanntes Layout ab', async () => {
    expect((await patch(1, { layout: 'diagonal' })).status).toBe(400);
  });

  it('lehnt eine leere Änderung ab', async () => {
    expect((await patch(1, {})).status).toBe(400);
  });

  it('meldet 404 für eine unbekannte Doppelseite', async () => {
    expect((await patch(99, { text: 'x' })).status).toBe(404);
  });
});

describe('Bild-Endpunkt', () => {
  it('liefert SVG', async () => {
    const s = service();
    const id = (await createBook(s)).json['id'];
    const res = await s.handle(req(`/v1/books/${id}/spreads/1/image.svg`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/svg+xml');
    const body = await res.text();
    expect(body.startsWith('<svg')).toBe(true);
    expect(body).toContain('kein KI-Bild');
  });

  it('kann den Platzhalter-Hinweis abschalten', async () => {
    const s = service();
    const id = (await createBook(s)).json['id'];
    const res = await s.handle(req(`/v1/books/${id}/spreads/1/image.svg?watermark=false`));
    expect(await res.text()).not.toContain('kein KI-Bild');
  });
});

describe('Weitere Endpunkte', () => {
  it('listet Bücher des Kunden', async () => {
    const s = service();
    await createBook(s);
    await createBook(s, { prompt: 'Ein Bär, der fliegen lernt' });
    const j = await (await s.handle(req('/v1/books'))).json() as any;
    expect(j.books).toHaveLength(2);
    expect(j.books[0]).toHaveProperty('title');
  });

  it('liefert alle Bildprompts einzeln', async () => {
    const s = service();
    const id = (await createBook(s)).json['id'];
    const j = await (await s.handle(req(`/v1/books/${id}/prompts`))).json() as any;
    expect(j.prompts).toHaveLength(14);
    expect(j.prompts[0]).toHaveProperty('pages');
  });

  it('prüft ein Buch erneut', async () => {
    const s = service();
    const id = (await createBook(s)).json['id'];
    const j = await (await s.handle(req(`/v1/books/${id}/validate`))).json() as any;
    expect(j.validation.stats.spreads).toBe(14);
  });

  it('löscht ein Buch', async () => {
    const s = service();
    const id = (await createBook(s)).json['id'];
    expect((await s.handle(req(`/v1/books/${id}`, { method: 'DELETE' }))).status).toBe(204);
    expect((await s.handle(req(`/v1/books/${id}`))).status).toBe(404);
  });
});

describe('Protokoll-Verhalten', () => {
  it('beantwortet Preflight-Anfragen', async () => {
    const res = await service().handle(req('/v1/books', { method: 'OPTIONS' }, null));
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-methods')).toContain('PATCH');
  });

  it('meldet erlaubte Methoden bei falscher Methode', async () => {
    const res = await service().handle(req('/v1/books', { method: 'DELETE' }));
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toContain('POST');
  });

  it('meldet 404 für unbekannte Pfade', async () => {
    expect((await service().handle(req('/v1/irgendwas'))).status).toBe(404);
    expect((await service().handle(req('/gibtsnicht', {}, null))).status).toBe(404);
  });

  it('toleriert abschließende Schrägstriche', async () => {
    const res = await service().handle(req('/v1/health/', {}, null));
    expect(res.status).toBe(200);
  });
});
