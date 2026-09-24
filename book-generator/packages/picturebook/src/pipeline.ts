import { PictureBookDraft, type PictureBookPlan, type Spread } from '@abg/schemas';
import {
  composeImagePrompt, finalizePlan, planPages, readingLevelForAge,
  validatePictureBook, type PbValidationResult, type ReadingLevel,
} from '@abg/domain';
import {
  GeneratorError, extractJson,
  type CompletionUsage, type TextGenerator,
} from './generator';
import { pictureBookJsonSchema } from './vercel-gateway';
import { PICTUREBOOK_SYSTEM, buildModelPrompt, parsePrompt, type ParsedPrompt } from './prompt';

/**
 * Bilderbuch-Pipeline.
 *
 * Code → Modell → Code. Kein Gateway, keine Budgets, keine Kostenrechnung —
 * nur die Schritte, die das Ergebnis richtig machen:
 *
 *   1. Seitenplan rechnen         CODE    Druckbogen, Doppelseitenzahl
 *   2. Prompt verstehen           CODE    Figur, Ort, Ziel (heuristisch)
 *   3. Auftrag bauen              CODE    Regeln, Lesestufe, Schema
 *   4. Entwurf erzeugen           MODELL  Text und Bild-Briefs
 *   5. Entwurf pruefen            CODE    Schema, dann vervollstaendigen
 *   6. Bildprompts komponieren    CODE    Figurendeskriptoren woertlich
 *   7. Buch pruefen               CODE    Druck, Lesestufe, Rhythmus, Redundanz
 */

export type PageCount = 24 | 32 | 40 | 48;

export const MEDIA = ['watercolor', 'cut_paper', 'gouache', 'crayon', 'digital_soft',
                      'ink_wash', 'collage'] as const;
export type Medium = (typeof MEDIA)[number];

export interface CreateBookInput {
  /** Freitext. Die einzige Pflichtangabe. */
  prompt: string;
  pageCount?: PageCount;
  readingLevel?: ReadingLevel;
  /** Alternativ zur Lesestufe: Zielalter. */
  targetAge?: 'all' | '6+' | '9+' | '12+';
  medium?: Medium;
  paletteHue?: number;
  /** Ueberschreibt, was aus dem Prompt gelesen wurde. */
  overrides?: Partial<Pick<ParsedPrompt,
    'heroName' | 'heroKind' | 'companionName' | 'companionKind' | 'place' | 'goal'>>;
}

export interface CreateBookResult {
  plan: PictureBookPlan;
  validation: PbValidationResult;
  imagePrompts: string[];
  readingLevel: ReadingLevel;
  pageCount: PageCount;
  /** Was aus dem Prompt gelesen wurde und was Vorgabe blieb. */
  understood: ParsedPrompt;
  generator: { name: string; synthetic: boolean; modelId?: string };
  usage?: CompletionUsage;
  /** Wie oft das Modell nachbessern musste, bis das JSON passte. */
  repairs: number;
  durationMs: number;
}

const DEFAULTS = {
  pageCount: 32 as PageCount,
  medium: 'watercolor' as Medium,
  paletteHue: 120,
};

export function resolveReadingLevel(input: CreateBookInput): ReadingLevel {
  if (input.readingLevel) return input.readingLevel;
  if (input.targetAge) return readingLevelForAge(input.targetAge);
  return 'pre_reader';
}

export async function createPictureBook(
  input: CreateBookInput, generator: TextGenerator, now: () => number = Date.now,
): Promise<CreateBookResult> {
  const started = now();

  if (!input.prompt?.trim()) {
    throw new GeneratorError('prompt darf nicht leer sein', 'invalid_output');
  }

  // 1. Seitenplan
  const pageCount = input.pageCount ?? DEFAULTS.pageCount;
  const pages = planPages(pageCount);
  const readingLevel = resolveReadingLevel(input);
  const medium = input.medium ?? DEFAULTS.medium;
  const paletteHue = clampHue(input.paletteHue ?? DEFAULTS.paletteHue);

  // 2. Prompt verstehen, Ueberschreibungen anwenden
  const parsed = parsePrompt(input.prompt);
  const understood: ParsedPrompt = { ...parsed, derived: { ...parsed.derived } };
  for (const [k, v] of Object.entries(input.overrides ?? {})) {
    if (v === undefined || v === null || v === '') continue;
    (understood as unknown as Record<string, unknown>)[k] = v;
    understood.derived[k as keyof ParsedPrompt['derived']] = 'prompt';
  }

  // 3. + 4. Auftrag und Entwurf
  const modelPrompt = buildModelPrompt({
    prompt: input.prompt, spreadCount: pages.storySpreads,
    readingLevel, medium, paletteHue, hints: understood,
  });

  const baseRequest = {
    system: PICTUREBOOK_SYSTEM,
    prompt: modelPrompt,
    jsonSchema: pictureBookJsonSchema(),
    temperature: 0.9,
    maxOutputTokens: 8000,
  };

  let response = await generator.complete(baseRequest);

  // 5. Pruefen. Bei ungueltigem JSON EIN Nachbesserungsversuch mit der
  //    konkreten Fehlermeldung — danach ist es ein Fehler, kein Ratespiel.
  let draft;
  let repairs = 0;
  try {
    draft = parseDraft(response.text, generator.name);
  } catch (first) {
    if (!(first instanceof GeneratorError)) throw first;
    repairs = 1;
    response = await generator.complete({
      ...baseRequest,
      prompt: [
        modelPrompt,
        '',
        'DEIN LETZTES JSON WAR UNGUELTIG.',
        first.message,
        'Gib ausschliesslich korrigiertes JSON zurueck. Keine Erklaerung.',
      ].join('\n'),
      temperature: 0.4,
    });
    draft = parseDraft(response.text, generator.name);
  }
  const plan = finalizePlan(draft, pageCount);

  if (plan.spreads.length !== pages.storySpreads) {
    throw new GeneratorError(
      `${generator.name} lieferte ${plan.spreads.length} Doppelseiten, `
      + `${pages.storySpreads} sind bei ${pageCount} Seiten vorgesehen`,
      'invalid_output');
  }

  // 6. + 7.
  const imagePrompts = plan.spreads.map((s) => composeImagePrompt(s, plan));
  const validation = validatePictureBook(plan, { readingLevel, pageCount });

  return {
    plan, validation, imagePrompts, readingLevel, pageCount, understood,
    generator: {
      name: generator.name,
      synthetic: generator.synthetic,
      ...(response.modelId ? { modelId: response.modelId } : {}),
    },
    ...(response.usage ? { usage: response.usage } : {}),
    repairs,
    durationMs: now() - started,
  };
}

function parseDraft(raw: string, generatorName: string): PictureBookDraft {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch (e) {
    throw new GeneratorError(
      `${generatorName} lieferte kein gültiges JSON: ${(e as Error).message}`, 'invalid_output');
  }
  const parsed = PictureBookDraft.safeParse(json);
  if (!parsed.success) {
    const detail = parsed.error.issues.slice(0, 5)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    throw new GeneratorError(
      `${generatorName} verletzt das Schema: ${detail}`, 'invalid_output');
  }
  return parsed.data;
}

// ─── Nachtraegliche Aenderungen ──────────────────────────────────────────────

export interface SpreadPatch {
  beat?: string;
  text?: string;
  layout?: Spread['layout'];
  textAnchor?: Spread['textAnchor'];
  charactersPresent?: string[];
  imageBrief?: Partial<Spread['imageBrief']>;
}

export interface UpdateResult {
  plan: PictureBookPlan;
  validation: PbValidationResult;
  spread: Spread;
  imagePrompt: string;
}

/**
 * Aendert eine Doppelseite und prueft das Buch neu.
 *
 * Seitenzahlen, Index und Seed bleiben unangetastet — sie gehoeren zum
 * Seitenplan, nicht zum Inhalt.
 */
export function updateSpread(
  plan: PictureBookPlan, index: number, patch: SpreadPatch,
  opts: { readingLevel: ReadingLevel; pageCount: PageCount },
): UpdateResult {
  const i = plan.spreads.findIndex((s) => s.index === index);
  if (i < 0) throw new RangeError(`Doppelseite ${index} gibt es nicht`);
  const current = plan.spreads[i]!;

  const next: Spread = {
    ...current,
    ...(patch.beat !== undefined ? { beat: patch.beat } : {}),
    ...(patch.text !== undefined ? { text: patch.text, textEdited: true } : {}),
    ...(patch.layout !== undefined ? { layout: patch.layout, imageEdited: true } : {}),
    ...(patch.textAnchor !== undefined ? { textAnchor: patch.textAnchor, imageEdited: true } : {}),
    ...(patch.charactersPresent !== undefined
      ? { charactersPresent: patch.charactersPresent, imageEdited: true } : {}),
    ...(patch.imageBrief
      ? { imageBrief: { ...current.imageBrief, ...patch.imageBrief }, imageEdited: true } : {}),
  };

  const nextPlan: PictureBookPlan = {
    ...plan,
    spreads: plan.spreads.map((s, n) => (n === i ? next : s)),
  };

  return {
    plan: nextPlan,
    validation: validatePictureBook(nextPlan, opts),
    spread: next,
    imagePrompt: composeImagePrompt(next, nextPlan),
  };
}

export function revalidate(
  plan: PictureBookPlan, opts: { readingLevel: ReadingLevel; pageCount: PageCount },
): PbValidationResult {
  return validatePictureBook(plan, opts);
}

export function imagePromptsFor(plan: PictureBookPlan): string[] {
  return plan.spreads.map((s) => composeImagePrompt(s, plan));
}

const clampHue = (n: number): number => ((Math.round(n) % 360) + 360) % 360;
