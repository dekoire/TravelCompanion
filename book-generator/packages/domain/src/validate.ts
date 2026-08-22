import type { BookSpec } from '@abg/schemas';
import { isSupportedLocale } from './locale';
import { ageValue, getBookTypeLimits, getSizeClassSpec, isChildrenBook } from './limits';

export type FindingSeverity = 'block' | 'warn';

export interface SpecPatch {
  label: string;
  patch: Record<string, unknown>;
}

export interface ValidationFinding {
  code: string;
  severity: FindingSeverity;
  field: string;
  message: string;
  suggestions: SpecPatch[];
}

export interface ValidationResult {
  ok: boolean;
  blockers: ValidationFinding[];
  warnings: ValidationFinding[];
}

const RATING_ORDER = {
  violence: ['none', 'mild', 'moderate', 'graphic'],
  sexualContent: ['none', 'implied', 'moderate', 'explicit'],
  language: ['none', 'mild', 'strong'],
  darkThemes: ['none', 'mild', 'moderate', 'heavy'],
  substanceUse: ['none', 'mild', 'moderate', 'heavy'],
  selfHarm: ['none', 'referenced', 'depicted'],
} as const;

function level(axis: keyof typeof RATING_ORDER, value: string): number {
  return (RATING_ORDER[axis] as readonly string[]).indexOf(value);
}

/**
 * Deterministische Spec-Validierung (03 §4).
 *
 * BEWUSST OHNE LLM. Die semantischen Warnungen W007/W008 (Genre-Widersprueche)
 * sind hier nicht enthalten — sie laufen ueber `SemanticSpecCheck` im llm-Paket
 * und koennen niemals blockieren.
 */
export function validateSpec(spec: BookSpec): ValidationResult {
  const blockers: ValidationFinding[] = [];
  const warnings: ValidationFinding[] = [];
  const block = (f: Omit<ValidationFinding, 'severity'>) =>
    blockers.push({ ...f, severity: 'block' });
  const warn = (f: Omit<ValidationFinding, 'severity'>) =>
    warnings.push({ ...f, severity: 'warn' });

  const { scope, rating, form, content, bookType } = spec;
  const limits = getBookTypeLimits(bookType);

  // ── V014: Sprache ──────────────────────────────────────────────────────
  if (!isSupportedLocale(form.language)) {
    block({
      code: 'V014', field: 'form.language',
      message: `Die Sprache ${form.language} wird nicht unterstützt.`,
      suggestions: [{ label: 'Deutsch verwenden', patch: { 'form.language': 'de-DE' } }],
    });
  }

  // ── V001: Wortzahl im Typkorridor ──────────────────────────────────────
  if (!limits) {
    block({
      code: 'V017', field: 'bookType',
      message: `Unbekannter Buchtyp: ${bookType}.`,
      suggestions: [{ label: 'Als Roman behandeln', patch: { bookType: 'novel' } }],
    });
  } else if (scope.targetWords < limits.minWords || scope.targetWords > limits.maxWords) {
    const clamped = Math.min(limits.maxWords, Math.max(limits.minWords, scope.targetWords));
    block({
      code: 'V001', field: 'scope.targetWords',
      message: `${fmt(scope.targetWords)} Wörter liegen außerhalb des Korridors für „${bookType}" `
        + `(${fmt(limits.minWords)}–${fmt(limits.maxWords)}).`,
      suggestions: [
        { label: `Auf ${fmt(clamped)} Wörter anpassen`, patch: { 'scope.targetWords': clamped } },
        ...(scope.targetWords < limits.minWords
          ? [{ label: 'Als Novelle anlegen', patch: { bookType: 'novella' } }]
          : [{ label: 'Als Epos anlegen', patch: { bookType: 'epic' } }]),
      ],
    });
  }

  // ── V002: Kapitel × Wörter passt zum Ziel ──────────────────────────────
  const product = scope.targetChapters * scope.wordsPerChapter;
  const deviation = scope.targetWords > 0
    ? Math.abs(product - scope.targetWords) / scope.targetWords
    : 0;
  if (deviation > 0.15) {
    const fittingChapters = Math.max(1, Math.round(scope.targetWords / scope.wordsPerChapter));
    const fittingWords = Math.round(scope.targetWords / scope.targetChapters);
    block({
      code: 'V002', field: 'scope.targetChapters',
      message: `${scope.targetChapters} Kapitel × ${fmt(scope.wordsPerChapter)} Wörter ergeben `
        + `${fmt(product)} Wörter, das Ziel sind ${fmt(scope.targetWords)} `
        + `(${Math.round(deviation * 100)} % Abweichung).`,
      suggestions: [
        { label: `${scope.targetChapters} Kapitel × ${fmt(fittingWords)} Wörter`,
          patch: { 'scope.wordsPerChapter': fittingWords } },
        { label: `${fittingChapters} Kapitel × ${fmt(scope.wordsPerChapter)} Wörter`,
          patch: { 'scope.targetChapters': fittingChapters } },
        { label: `Gesamtziel auf ${fmt(product)} Wörter setzen`,
          patch: { 'scope.targetWords': product } },
      ],
    });
  } else if (deviation > 0.05) {
    warn({
      code: 'W001', field: 'scope.targetChapters',
      message: `Kapitelaufteilung weicht um ${Math.round(deviation * 100)} % vom Gesamtziel ab. `
        + 'Das gleicht die Budgetsteuerung während der Generierung aus.',
      suggestions: [],
    });
  }

  // ── V003 / V004: Kapitellänge ──────────────────────────────────────────
  if (limits && scope.wordsPerChapter < limits.minChapterWords) {
    const suggestedChapters = Math.max(
      1, Math.round(scope.targetWords / limits.idealChapterWords));
    const asScenes = Math.max(1, Math.round(scope.targetChapters / 3));
    block({
      code: 'V003', field: 'scope.wordsPerChapter',
      message: `${fmt(scope.wordsPerChapter)} Wörter pro Kapitel sind zu kurz für „${bookType}" `
        + `(mindestens ${fmt(limits.minChapterWords)}). Kürzere Abschnitte werden intern als `
        + 'Szenen behandelt, nicht als Kapitel.',
      suggestions: [
        { label: `${suggestedChapters} Kapitel × ${fmt(Math.round(scope.targetWords / suggestedChapters))} Wörter`,
          patch: { 'scope.targetChapters': suggestedChapters,
                   'scope.wordsPerChapter': Math.round(scope.targetWords / suggestedChapters) } },
        { label: `Als Szenen behandeln: ${asScenes} Kapitel mit je ~3 Szenen`,
          patch: { 'scope.targetChapters': asScenes,
                   'scope.wordsPerChapter': Math.round(scope.targetWords / asScenes) } },
        ...(isChildrenBook(bookType) ? [] : [{
          label: 'Als Kinderbuch anlegen (kürzere Kapitel erlaubt)',
          patch: { bookType: 'chapter_book' },
        }]),
      ],
    });
  }
  const hardMaxChapterWords = limits?.maxChapterWords ?? 8_000;
  if (scope.wordsPerChapter > hardMaxChapterWords) {
    const more = Math.ceil(scope.targetWords / hardMaxChapterWords);
    block({
      code: 'V004', field: 'scope.wordsPerChapter',
      message: `${fmt(scope.wordsPerChapter)} Wörter pro Kapitel sind zu lang. Über `
        + `${fmt(hardMaxChapterWords)} Wörtern hält kein Modell die Qualität in einem Zug.`,
      suggestions: [{ label: `Auf ${more} Kapitel aufteilen`,
        patch: { 'scope.targetChapters': more,
                 'scope.wordsPerChapter': Math.round(scope.targetWords / more) } }],
    });
  }

  // ── V005: Kapitelanzahl ────────────────────────────────────────────────
  if (limits && scope.targetChapters > limits.maxChapters) {
    block({
      code: 'V005', field: 'scope.targetChapters',
      message: `${scope.targetChapters} Kapitel sind zu viele für „${bookType}" `
        + `(maximal ${limits.maxChapters}).`,
      suggestions: [{ label: `Auf ${limits.maxChapters} Kapitel reduzieren`,
        patch: { 'scope.targetChapters': limits.maxChapters,
                 'scope.wordsPerChapter': Math.round(scope.targetWords / limits.maxChapters) } }],
    });
  }
  if (limits && scope.targetChapters < limits.minChapters) {
    warn({
      code: 'W010', field: 'scope.targetChapters',
      message: `${scope.targetChapters} Kapitel sind ungewöhnlich wenige für „${bookType}".`,
      suggestions: [],
    });
  }

  // ── V006 / V007 / V008: Rating gegen Zielalter ─────────────────────────
  const age = ageValue(rating.targetAge);
  if (age <= 12 && (
    level('sexualContent', rating.sexualContent) > level('sexualContent', 'none') ||
    rating.violence === 'graphic' ||
    rating.language === 'strong'
  )) {
    block({
      code: 'V006', field: 'rating',
      message: `Für Zielalter ${rating.targetAge} sind sexuelle Inhalte, drastische Gewalt `
        + 'und derbe Sprache ausgeschlossen.',
      suggestions: [{
        label: 'Rating auf kindgerecht setzen',
        patch: { 'rating.sexualContent': 'none', 'rating.violence': 'mild', 'rating.language': 'none' },
      }, { label: 'Zielalter auf 16+ anheben', patch: { 'rating.targetAge': '16+' } }],
    });
  }
  if (age <= 16 && level('sexualContent', rating.sexualContent) >= level('sexualContent', 'moderate')) {
    block({
      code: 'V007', field: 'rating.sexualContent',
      message: `Sexuelle Inhalte der Stufe „${rating.sexualContent}" erfordern Zielalter 18+.`,
      suggestions: [
        { label: 'Auf „angedeutet" reduzieren', patch: { 'rating.sexualContent': 'implied' } },
        { label: 'Zielalter auf 18+ setzen', patch: { 'rating.targetAge': '18+' } },
      ],
    });
  }
  if (rating.selfHarm === 'depicted' && age < 16) {
    block({
      code: 'V008', field: 'rating.selfHarm',
      message: 'Dargestellte Selbstverletzung erfordert mindestens Zielalter 16+.',
      suggestions: [
        { label: 'Nur erwähnen statt darstellen', patch: { 'rating.selfHarm': 'referenced' } },
        { label: 'Zielalter auf 16+ setzen', patch: { 'rating.targetAge': '16+' } },
      ],
    });
  }
  if (rating.hardBlocks.length < 4) {
    block({
      code: 'V018', field: 'rating.hardBlocks',
      message: 'Die harten Sperren sind nicht abwählbar und müssen vollständig gesetzt sein.',
      suggestions: [],
    });
  }

  // ── V010 / V011 / V012: Figuren und Perspektive ────────────────────────
  const isFiction = spec.track === 'fiction';
  const names = content.characters.map((c) => c.name);
  if (isFiction && scope.targetWords > 15_000
      && !content.characters.some((c) => c.role === 'protagonist')
      && content.characters.length > 0) {
    block({
      code: 'V010', field: 'content.characters',
      message: 'Es wurden Figuren angegeben, aber keine davon als Hauptfigur markiert.',
      suggestions: names[0]
        ? [{ label: `„${names[0]}" als Hauptfigur setzen`,
             patch: { 'content.characters.0.role': 'protagonist' } }]
        : [],
    });
  }
  if (form.povMode.kind === 'single' && names.length > 0
      && !names.includes(form.povMode.characterName)) {
    block({
      code: 'V011', field: 'form.povMode',
      message: `Die Perspektivfigur „${form.povMode.characterName}" kommt nicht in der `
        + 'Figurenliste vor.',
      suggestions: names.map((n) => ({
        label: `Perspektive: ${n}`, patch: { 'form.povMode.characterName': n },
      })),
    });
  }
  if (form.povMode.kind === 'rotating') {
    const order = form.povMode.order;
    if (order.length < 2 || order.length > 5) {
      block({
        code: 'V012', field: 'form.povMode.order',
        message: 'Wechselnde Perspektiven brauchen 2 bis 5 Figuren.',
        suggestions: [{ label: 'Auf eine Perspektive umstellen',
          patch: { 'form.povMode': { kind: 'single', characterName: order[0] ?? names[0] ?? '' } }}],
      });
    }
    const unknown = names.length > 0 ? order.filter((n) => !names.includes(n)) : [];
    if (unknown.length > 0) {
      block({
        code: 'V011', field: 'form.povMode.order',
        message: `Unbekannte Perspektivfiguren: ${unknown.join(', ')}.`,
        suggestions: [],
      });
    }
  }

  // ── V015: Non-Fiction braucht ein Thema ────────────────────────────────
  if (spec.track === 'non_fiction'
      && content.userIdea.trim().length < 20
      && content.themes.length === 0) {
    block({
      code: 'V015', field: 'content.userIdea',
      message: 'Für ein Sachbuch braucht das System ein Thema und ein Nutzenversprechen '
        + '(mindestens ein paar Sätze).',
      suggestions: [],
    });
  }

  // ── Warnungen ──────────────────────────────────────────────────────────
  const mainCount = content.characters.filter(
    (c) => c.role === 'protagonist' || c.role === 'antagonist' || c.role === 'love_interest').length;
  if (mainCount > 8) {
    warn({ code: 'W002', field: 'content.characters',
      message: `${mainCount} Hauptfiguren erhöhen das Risiko von Verwechslungen und Stimmdrift.`,
      suggestions: [] });
  }
  if (content.themes.length > 4) {
    warn({ code: 'W003', field: 'content.themes',
      message: `${content.themes.length} Themen verwässern erfahrungsgemäß den roten Faden.`,
      suggestions: [] });
  }
  if (form.style.humorLevel === 'high' && ['horror', 'thriller'].includes(content.genre)) {
    warn({ code: 'W004', field: 'form.style.humorLevel',
      message: `Viel Humor passt selten zu „${content.genre}".`, suggestions: [] });
  }
  if (form.pov === 'second') {
    warn({ code: 'W005', field: 'form.pov',
      message: 'Die Du-Perspektive ist experimentell; einige Stilprüfungen greifen dort nur eingeschränkt.',
      suggestions: [] });
  }
  if (scope.targetWords > 150_000) {
    warn({ code: 'W006', field: 'scope.targetWords',
      message: `Bei ${fmt(scope.targetWords)} Wörtern liegt die Laufzeit über 14 Stunden.`,
      suggestions: [] });
  }
  if (spec.deliverables.audiobook && form.povMode.kind === 'rotating') {
    warn({ code: 'W009', field: 'deliverables.audiobook',
      message: 'Hörbuch mit wechselnden Perspektiven macht die Stimmenzuordnung aufwendig.',
      suggestions: [] });
  }

  // Pipeline-Plausibilität: Acts müssen zu den Kapiteln passen.
  const sizeSpec = getSizeClassSpec(spec.sizeClass);
  if (scope.actCount > 0 && scope.targetChapters < scope.actCount) {
    block({
      code: 'V019', field: 'scope.actCount',
      message: `${scope.targetChapters} Kapitel können nicht auf ${scope.actCount} Akte verteilt werden.`,
      suggestions: [{ label: 'Ohne Akte strukturieren', patch: { 'scope.actCount': 0 } }],
    });
  }
  if (sizeSpec.usesParts && !scope.partCount) {
    warn({ code: 'W011', field: 'scope.partCount',
      message: 'Bücher dieser Größe sollten in Teile gegliedert werden.', suggestions: [] });
  }

  return { ok: blockers.length === 0, blockers, warnings };
}

function fmt(n: number): string {
  return n.toLocaleString('de-DE');
}
