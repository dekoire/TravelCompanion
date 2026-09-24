import { PictureBookDraft, type PictureBookPlan } from '@abg/schemas';
import {
  composeImagePrompt, finalizePlan, planPages, readingLevelForAge,
  validatePictureBook, type PbValidationResult, type ReadingLevel,
} from '@abg/domain';
import type { LlmGateway } from './gateway';
import { encodeDemoInput, type DemoBookInput } from './demo-provider';
import type { PromptSections, Usage } from './types';

/**
 * Bilderbuch-Pipeline (02 §2, 04 analog fuer den Bilderbuch-Fall).
 *
 * Reihenfolge:
 *   1. Seitenplan rechnen        CODE   — Druckbogen, Doppelseitenzahl
 *   2. Entwurf erzeugen          LLM    — Text und Bild-Briefs
 *   3. Plan vervollstaendigen    CODE   — Seitenzahlen, Seeds, Farbidentitaeten
 *   4. Bildprompts komponieren   CODE   — Figurendeskriptoren woertlich einsetzen
 *   5. Pruefen                   CODE   — Lesestufe, Layout, Redundanz, Druck
 */

export interface PictureBookRequest {
  bookId: string;
  idea: string;
  heroName: string;
  heroKind: string;
  companionName?: string;
  companionKind?: string;
  place: string;
  goal: string;
  pageCount: 24 | 32 | 40 | 48;
  targetAge: 'all' | '6+' | '9+' | '12+';
  medium: DemoBookInput['medium'];
  paletteHue: number;
}

export interface PictureBookResult {
  plan: PictureBookPlan;
  validation: PbValidationResult;
  imagePrompts: string[];
  readingLevel: ReadingLevel;
  usage: Usage;
  cached: boolean;
}

function buildSections(
  req: PictureBookRequest, spreadCount: number, readingLevel: ReadingLevel,
): PromptSections {
  const demo = encodeDemoInput({
    idea: req.idea, heroName: req.heroName, heroKind: req.heroKind,
    ...(req.companionName !== undefined ? { companionName: req.companionName } : {}),
    ...(req.companionKind !== undefined ? { companionKind: req.companionKind } : {}),
    place: req.place, goal: req.goal, spreadCount,
    medium: req.medium, paletteHue: req.paletteHue, readingLevel,
  });

  return {
    system: 'Du bist ein erfahrener Bilderbuchautor. Du schreibst ausschliesslich das '
      + 'angeforderte JSON, ohne Vorrede und ohne Erklaerung.',
    developer: [
      'Schreibe ein Bilderbuch als Folge von Doppelseiten.',
      'Auf jeder Doppelseite ist das BILD der Inhalt und der Text die Bildunterschrift.',
      'Der Text sagt, was man NICHT sieht: Gedanke, Ton, Zeit, Gefuehl.',
      'Er wiederholt niemals, was das Bild ohnehin zeigt.',
      'Der Bild-Brief beschreibt nur Sichtbares. Keine Figurenbeschreibung — die wird',
      'serverseitig aus dem Character Sheet eingesetzt.',
    ].join('\n'),
    canonStatic: [
      `Seitenzahl: ${req.pageCount} (Druckbogen, nicht verhandelbar)`,
      `Doppelseiten fuer die Geschichte: ${spreadCount}`,
      `Zielalter: ${req.targetAge}`,
      `Technik: ${req.medium}`,
    ].join('\n'),
    canonDynamic: '',
    memory: '',
    plan: [
      `Hauptfigur: ${req.heroName} (${req.heroKind})`,
      req.companionName ? `Begleitung: ${req.companionName} (${req.companionKind})` : '',
      `Ort: ${req.place}`,
      `Ziel: ${req.goal}`,
    ].filter(Boolean).join('\n'),
    negativeList: 'Keine Schrift im Bild. Keine Moral am Schluss. Kein "und die Moral von '
      + 'der Geschicht". Keine erklaerenden Saetze, die das Bild doppeln.',
    userData: { user_idea: req.idea },
    task: `Erzeuge genau ${spreadCount} Doppelseiten als JSON nach Schema.\n${demo}`,
  };
}

export async function generatePictureBook(
  req: PictureBookRequest, gateway: LlmGateway,
): Promise<PictureBookResult> {
  // 1. Seitenplan — deterministisch, vor jedem Modellaufruf
  const pages = planPages(req.pageCount);
  const readingLevel = readingLevelForAge(req.targetAge);

  // 2. Entwurf
  const result = await gateway.callStructured({
    capability: 'PLANNER',
    operation: 'picturebook.draft',
    bookId: req.bookId,
    targetId: 'book',
    promptVersion: 'pb_1',
    sections: buildSections(req, pages.storySpreads, readingLevel),
    schema: PictureBookDraft,
  });

  // 3. Vervollstaendigen
  const plan = finalizePlan(result.data, req.pageCount);

  // 4. Bildprompts
  const imagePrompts = plan.spreads.map((s) => composeImagePrompt(s, plan));

  // 5. Pruefen
  const validation = validatePictureBook(plan, { readingLevel, pageCount: req.pageCount });

  return {
    plan, validation, imagePrompts, readingLevel,
    usage: result.usage, cached: result.cached,
  };
}
