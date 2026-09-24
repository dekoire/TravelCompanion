import {
  DemoGenerator, MemoryBookStore, createPictureBook, imagePromptsFor, makeBookId,
  revalidate, updateSpread,
  type BookStore, type CreateBookInput, type Medium, type PageCount, type SpreadPatch,
  type StoredBook, type TextGenerator,
} from '@abg/picturebook';
import { GeneratorError } from '@abg/picturebook';
import { renderSpreadPlaceholder } from '@abg/render';
import type { ReadingLevel } from '@abg/domain';
import { ApiError, badRequest, notFound, jsonResponse, errorResponse } from './errors';
import { authenticate, type AuthConfig } from './auth';

/**
 * HTTP-API des Bilderbuch-Service.
 *
 * Framework-frei und auf Web-Standards (Request/Response), damit dieselbe
 * Funktion unter node:http, Vercel, Cloudflare Workers, Deno oder Bun laeuft.
 * Keine Abhaengigkeit ausser den eigenen Paketen.
 */

export interface ServiceOptions {
  generator: TextGenerator;
  store?: BookStore;
  auth: AuthConfig;
  basePath?: string;
  now?: () => number;
  makeId?: () => string;
  /** Obergrenze fuer die Prompt-Laenge. */
  maxPromptChars?: number;
}

export interface Service {
  handle(request: Request): Promise<Response>;
  readonly store: BookStore;
}

const PAGE_COUNTS: readonly PageCount[] = [24, 32, 40, 48];
const LEVELS: readonly ReadingLevel[] = ['pre_reader', 'early_reader', 'independent'];
const MEDIA_LIST: readonly string[] = ['watercolor', 'cut_paper', 'gouache', 'crayon',
  'digital_soft', 'ink_wash', 'collage'];

export function createService(options: ServiceOptions): Service {
  const store = options.store ?? new MemoryBookStore();
  const generator = options.generator ?? new DemoGenerator();
  const base = (options.basePath ?? '/v1').replace(/\/$/, '');
  const now = options.now ?? Date.now;
  const makeId = options.makeId ?? (() => makeBookId(now));
  const maxPromptChars = options.maxPromptChars ?? 2000;

  async function handle(request: Request): Promise<Response> {
    try {
      return await route(request);
    } catch (err) {
      return errorResponse(err);
    }
  }

  async function route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (path === `${base}/health` || path === '/health') {
      return jsonResponse({
        status: 'ok',
        generator: { name: generator.name, synthetic: generator.synthetic },
        pageCounts: PAGE_COUNTS,
        readingLevels: LEVELS,
        media: MEDIA_LIST,
      });
    }

    if (!path.startsWith(`${base}/`)) return notFound('Unbekannter Pfad');

    const owner = authenticate(request, options.auth);
    const rest = path.slice(base.length);
    const segments = rest.split('/').filter(Boolean);

    // /books
    if (segments[0] !== 'books') return notFound('Unbekannte Ressource');

    if (segments.length === 1) {
      if (request.method === 'POST') return createBook(request, owner);
      if (request.method === 'GET') return listBooks(url, owner);
      return methodNotAllowed(['GET', 'POST']);
    }

    const id = segments[1]!;

    if (segments.length === 2) {
      if (request.method === 'GET') return getBook(url, owner, id);
      if (request.method === 'DELETE') return deleteBook(owner, id);
      return methodNotAllowed(['GET', 'DELETE']);
    }

    if (segments.length === 3 && segments[2] === 'prompts') {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      const book = await require(owner, id);
      return jsonResponse({
        bookId: book.id,
        prompts: imagePromptsFor(book.plan).map((prompt, i) => ({
          spread: i + 1, pages: book.plan.spreads[i]?.pages, prompt,
        })),
      });
    }

    if (segments.length === 3 && segments[2] === 'validate') {
      if (request.method !== 'POST' && request.method !== 'GET') {
        return methodNotAllowed(['GET', 'POST']);
      }
      const book = await require(owner, id);
      return jsonResponse({
        bookId: book.id,
        validation: revalidate(book.plan, {
          readingLevel: book.readingLevel, pageCount: book.pageCount,
        }),
      });
    }

    // /books/:id/spreads/:n[/image.svg]
    if (segments[2] === 'spreads' && segments[3]) {
      const index = Number(segments[3]);
      if (!Number.isInteger(index) || index < 1) return badRequest('Ungültiger Doppelseiten-Index');
      const book = await require(owner, id);
      const spread = book.plan.spreads.find((s) => s.index === index);
      if (!spread) return notFound(`Doppelseite ${index} gibt es nicht`);

      if (segments.length === 5 && (segments[4] === 'image.svg' || segments[4] === 'image')) {
        if (request.method !== 'GET') return methodNotAllowed(['GET']);
        const svg = renderSpreadPlaceholder(spread, book.plan, {
          showWatermark: url.searchParams.get('watermark') !== 'false',
          showPageNumbers: url.searchParams.get('pageNumbers') !== 'false',
        });
        return new Response(svg, {
          status: 200,
          headers: {
            'content-type': 'image/svg+xml; charset=utf-8',
            'cache-control': 'private, max-age=60',
            ...corsHeaders(),
          },
        });
      }

      if (segments.length === 4) {
        if (request.method === 'GET') {
          return jsonResponse({
            spread,
            imagePrompt: imagePromptsFor(book.plan)[index - 1],
          });
        }
        if (request.method === 'PATCH') return patchSpread(request, book, index);
        return methodNotAllowed(['GET', 'PATCH']);
      }
    }

    return notFound('Unbekannte Ressource');
  }

  // ── Handler ────────────────────────────────────────────────────────────

  async function createBook(request: Request, owner: string): Promise<Response> {
    const body = await readJson(request);
    const input = parseCreateInput(body, maxPromptChars);

    let result;
    try {
      result = await createPictureBook(input, generator, now);
    } catch (err) {
      if (err instanceof GeneratorError) {
        const status = err.kind === 'unavailable' ? 503
          : err.kind === 'timeout' ? 504
          : err.kind === 'refused' ? 422 : 502;
        throw new ApiError(status, 'generator_failed', err.message, { kind: err.kind });
      }
      throw err;
    }

    const iso = new Date(now()).toISOString();
    const book: StoredBook = {
      id: makeId(), owner, createdAt: iso, updatedAt: iso,
      input, understood: result.understood, plan: result.plan,
      pageCount: result.pageCount, readingLevel: result.readingLevel,
      generator: result.generator,
    };
    await store.create(book);

    return jsonResponse(bookPayload(book, {
      validation: result.validation,
      imagePrompts: result.imagePrompts,
      durationMs: result.durationMs,
    }), 201, { location: `${base}/books/${book.id}` });
  }

  async function getBook(url: URL, owner: string, id: string): Promise<Response> {
    const book = await require(owner, id);
    const withPrompts = url.searchParams.get('include')?.split(',').includes('prompts');
    return jsonResponse(bookPayload(book, {
      validation: revalidate(book.plan, {
        readingLevel: book.readingLevel, pageCount: book.pageCount,
      }),
      ...(withPrompts ? { imagePrompts: imagePromptsFor(book.plan) } : {}),
    }));
  }

  async function listBooks(url: URL, owner: string): Promise<Response> {
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const res = await store.list({
      owner,
      limit: Number.isFinite(limit) ? limit : 20,
      ...(cursor ? { cursor } : {}),
    });
    return jsonResponse({
      books: res.books.map((b) => ({
        id: b.id, title: b.plan.title, createdAt: b.createdAt, updatedAt: b.updatedAt,
        pageCount: b.pageCount, readingLevel: b.readingLevel,
        spreads: b.plan.spreads.length, generator: b.generator,
      })),
      nextCursor: res.nextCursor,
    });
  }

  async function deleteBook(owner: string, id: string): Promise<Response> {
    const gone = await store.remove(owner, id);
    if (!gone) return notFound('Buch nicht gefunden');
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  async function patchSpread(
    request: Request, book: StoredBook, index: number,
  ): Promise<Response> {
    const body = await readJson(request);
    const patch = parseSpreadPatch(body, book);
    const result = updateSpread(book.plan, index, patch, {
      readingLevel: book.readingLevel, pageCount: book.pageCount,
    });
    const updated: StoredBook = {
      ...book, plan: result.plan, updatedAt: new Date(now()).toISOString(),
    };
    await store.put(updated);
    return jsonResponse({
      spread: result.spread,
      imagePrompt: result.imagePrompt,
      validation: result.validation,
    });
  }

  async function require(owner: string, id: string): Promise<StoredBook> {
    const book = await store.get(owner, id);
    if (!book) throw new ApiError(404, 'not_found', 'Buch nicht gefunden');
    return book;
  }

  return { handle, store };
}

// ── Payload-Aufbau ───────────────────────────────────────────────────────────

function bookPayload(book: StoredBook, extra: Record<string, unknown>): Record<string, unknown> {
  return {
    id: book.id,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    prompt: book.input.prompt,
    understood: book.understood,
    pageCount: book.pageCount,
    readingLevel: book.readingLevel,
    generator: book.generator,
    ...(book.generator.synthetic
      ? { notice: 'Dieser Entwurf stammt aus einem regelbasierten Demo-Generator, '
                + 'nicht aus einem Sprachmodell.' }
      : {}),
    book: book.plan,
    ...extra,
  };
}

// ── Eingabepruefung ──────────────────────────────────────────────────────────

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new ApiError(415, 'unsupported_media_type', 'content-type: application/json erwartet');
  }
  const text = await request.text();
  if (text.length > 64 * 1024) {
    throw new ApiError(413, 'payload_too_large', 'Anfrage größer als 64 KB');
  }
  if (!text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Objekt erwartet');
    }
    return parsed as Record<string, unknown>;
  } catch (e) {
    throw badRequestError(`Ungültiges JSON: ${(e as Error).message}`);
  }
}

export function parseCreateInput(
  body: Record<string, unknown>, maxPromptChars: number,
): CreateBookInput {
  const prompt = str(body['prompt']);
  if (!prompt) throw badRequestError('prompt fehlt');
  if (prompt.length > maxPromptChars) {
    throw badRequestError(`prompt ist länger als ${maxPromptChars} Zeichen`);
  }

  const input: CreateBookInput = { prompt };

  if (body['pageCount'] !== undefined) {
    const n = Number(body['pageCount']);
    if (!PAGE_COUNTS.includes(n as PageCount)) {
      throw badRequestError(
        `pageCount muss ${PAGE_COUNTS.join(', ')} sein — nur diese Seitenzahlen sind druckbar`);
    }
    input.pageCount = n as PageCount;
  }
  if (body['readingLevel'] !== undefined) {
    const v = str(body['readingLevel']);
    if (!LEVELS.includes(v as ReadingLevel)) {
      throw badRequestError(`readingLevel muss ${LEVELS.join(', ')} sein`);
    }
    input.readingLevel = v as ReadingLevel;
  }
  if (body['targetAge'] !== undefined) {
    const v = str(body['targetAge']);
    if (!['all', '6+', '9+', '12+'].includes(v)) {
      throw badRequestError('targetAge muss all, 6+, 9+ oder 12+ sein');
    }
    input.targetAge = v as CreateBookInput['targetAge'];
  }
  if (body['medium'] !== undefined) {
    const v = str(body['medium']);
    if (!MEDIA_LIST.includes(v)) {
      throw badRequestError(`medium muss eines von ${MEDIA_LIST.join(', ')} sein`);
    }
    input.medium = v as Medium;
  }
  if (body['paletteHue'] !== undefined) {
    const n = Number(body['paletteHue']);
    if (!Number.isFinite(n)) throw badRequestError('paletteHue muss eine Zahl sein');
    input.paletteHue = n;
  }
  if (body['overrides'] !== undefined) {
    const o = body['overrides'];
    if (typeof o !== 'object' || o === null) throw badRequestError('overrides muss ein Objekt sein');
    const allowed = ['heroName', 'heroKind', 'companionName', 'companionKind', 'place', 'goal'];
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (!allowed.includes(k)) throw badRequestError(`overrides.${k} ist unbekannt`);
      const s = str(v);
      if (s.length > 160) throw badRequestError(`overrides.${k} ist zu lang`);
      out[k] = s;
    }
    input.overrides = out as CreateBookInput['overrides'];
  }

  return input;
}

export function parseSpreadPatch(
  body: Record<string, unknown>, book: StoredBook,
): SpreadPatch {
  const patch: SpreadPatch = {};
  const knownSlugs = new Set(book.plan.characters.map((c) => c.slug));

  if (body['text'] !== undefined) {
    const t = str(body['text']);
    if (t.length > 600) throw badRequestError('text ist länger als 600 Zeichen');
    patch.text = t;
  }
  if (body['beat'] !== undefined) patch.beat = str(body['beat']).slice(0, 120);
  if (body['layout'] !== undefined) {
    patch.layout = enumOr(body['layout'], ['full_bleed', 'text_left', 'text_right',
      'text_bottom', 'vignette', 'spot'], 'layout') as SpreadPatch['layout'];
  }
  if (body['textAnchor'] !== undefined) {
    patch.textAnchor = enumOr(body['textAnchor'], ['top_left', 'top_right', 'bottom_left',
      'bottom_right', 'center', 'below_image'], 'textAnchor') as SpreadPatch['textAnchor'];
  }
  if (body['charactersPresent'] !== undefined) {
    const arr = body['charactersPresent'];
    if (!Array.isArray(arr)) throw badRequestError('charactersPresent muss ein Array sein');
    for (const s of arr) {
      if (!knownSlugs.has(String(s))) {
        throw badRequestError(
          `charactersPresent enthält "${String(s)}" — dafür gibt es kein Figurenblatt`);
      }
    }
    patch.charactersPresent = arr.map(String);
  }
  if (body['imageBrief'] !== undefined) {
    const b = body['imageBrief'];
    if (typeof b !== 'object' || b === null) throw badRequestError('imageBrief muss ein Objekt sein');
    const src = b as Record<string, unknown>;
    const brief: SpreadPatch['imageBrief'] = {};
    for (const k of ['subject', 'action', 'setting', 'mood'] as const) {
      if (src[k] !== undefined) brief[k] = str(src[k]).slice(0, 200);
    }
    if (src['cameraDistance'] !== undefined) {
      brief.cameraDistance = enumOr(src['cameraDistance'],
        ['extreme_wide', 'wide', 'medium', 'close', 'extreme_close'],
        'imageBrief.cameraDistance') as NonNullable<SpreadPatch['imageBrief']>['cameraDistance'];
    }
    if (src['timeOfDay'] !== undefined) {
      brief.timeOfDay = enumOr(src['timeOfDay'],
        ['morning', 'midday', 'afternoon', 'evening', 'night'],
        'imageBrief.timeOfDay') as NonNullable<SpreadPatch['imageBrief']>['timeOfDay'];
    }
    patch.imageBrief = brief;
  }

  if (Object.keys(patch).length === 0) throw badRequestError('Keine änderbaren Felder angegeben');
  return patch;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : String(v ?? '').trim());

function enumOr(v: unknown, allowed: readonly string[], field: string): string {
  const s = str(v);
  if (!allowed.includes(s)) {
    throw badRequestError(`${field} muss eines von ${allowed.join(', ')} sein`);
  }
  return s;
}

function badRequestError(message: string): ApiError {
  return new ApiError(400, 'invalid_request', message);
}

function methodNotAllowed(allowed: string[]): Response {
  return jsonResponse(
    { error: { code: 'method_not_allowed', message: `Erlaubt: ${allowed.join(', ')}` } },
    405, { allow: allowed.join(', ') });
}

export function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
  };
}
