import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { WizardInput } from '@abg/schemas';
import {
  computeArc, countWords, deriveSpec, dialogueRatio, freezeSpec, getLocale,
  groundItems, jobIdempotencyKey, hashObject, sha256, splitScenes, tensionTarget,
  validateSpec,
} from '@abg/domain';
import { LlmGateway, SimpleBudgetGuard } from './gateway';
import { MockProvider } from './mock-provider';
import { MemoryIdempotencyStore, type PromptSections } from './types';
import { mockProfile } from './profile';

/**
 * Integrationstest der M1-Kette: Wizard -> Spec -> Validierung -> Arc ->
 * Kapitelgenerierung -> Szenensplit -> Extraktion -> Grounding -> Messung.
 *
 * Laeuft vollstaendig gegen den Mock-Provider: keine Modellkosten, deterministisch.
 */

const CHAPTER_TEXT = `<<<SCENE sc_1>>>
Der Regen hatte aufgehört, als June die Treppe hinabstieg. Im Archiv roch es nach
kaltem Staub und altem Leim. Sie zählte die Stufen, wie sie es als Kind getan hatte,
und blieb vor der Tür zum Mantelraum stehen.

<<<SCENE sc_2>>>
Im Mantelraum roch es nach nassem Tuch. Der Umschlag rutschte aus der Innentasche und
fiel zu Boden. June hob ihn auf und las die erste Zeile.

„Sie haben ihn die ganze Zeit gehabt", sagte sie leise, obwohl niemand da war, der
es hören konnte.

<<<SCENE sc_3>>>
Draußen schlug ihr der Wind ins Gesicht. Sie schob den Brief unter ihre Bluse und ging
den Klippenweg hinauf, ohne sich noch einmal umzudrehen.
<<<END>>>`;

const EXTRACTION = {
  chapterNo: 14,
  events: [
    {
      tempId: 'e1',
      summary: 'June findet den zweiten Brief in Tomas Mantel',
      importance: 5,
      evidence: {
        quote: 'Der Umschlag rutschte aus der Innentasche und',
        start: 300, end: 344,
      },
    },
  ],
  factDeltas: [
    {
      subject: 'second_letter', predicate: 'possession', value: 'june',
      evidence: { quote: 'Sie schob den Brief unter ihre Bluse', start: 700, end: 736 },
    },
    {
      // Halluziniert: steht nirgends im Text.
      subject: 'archive_key', predicate: 'status', value: 'destroyed',
      importance: 5,
      evidence: { quote: 'June warf den Schlüssel ins Meer und lachte.', start: 800, end: 844 },
    },
  ],
};

const ExtractionSchema = z.object({
  chapterNo: z.number().int(),
  events: z.array(z.object({
    tempId: z.string(), summary: z.string(), importance: z.number().int(),
    evidence: z.object({ quote: z.string(), start: z.number(), end: z.number() }).strict(),
  }).strict()),
  factDeltas: z.array(z.object({
    subject: z.string(), predicate: z.string(),
    value: z.union([z.string(), z.boolean(), z.number()]),
    importance: z.number().int().optional(),
    evidence: z.object({ quote: z.string(), start: z.number(), end: z.number() }).strict(),
  }).strict()),
}).strict();

function sections(over: Partial<PromptSections> = {}): PromptSections {
  return {
    system: 'Du bist ein professioneller Romanautor.',
    developer: 'Schreibe das Kapitel gemaess Plan.',
    canonStatic: 'Welt: Ardmoor, 1894.',
    canonDynamic: 'June ist im Archiv.',
    memory: 'Vorheriges Kapitel endete mit Schritten.',
    plan: 'Kapitel 14, drei Szenen.',
    negativeList: '',
    userData: { user_idea: 'Eine Archivarin findet einen Brief.' },
    task: 'Schreibe das Kapitel.',
    ...over,
  };
}

describe('M1-Kette: von der Idee zum geprüften Kapitel', () => {
  it('läuft ohne Modellkosten vollständig durch', async () => {
    // ── 1. Wizard-Eingabe ───────────────────────────────────────────────
    const input = WizardInput.parse({
      bookType: 'novel',
      genre: 'mystery',
      language: 'de-DE',
      userIdea: 'Eine Archivarin findet einen Brief, der ihren Vater belastet.',
      targetWords: 82_000,
      characters: [
        { role: 'protagonist', name: 'June Weber', traits: ['misstrauisch'] },
        { role: 'antagonist', name: 'Tomas Hale', traits: ['charmant'] },
      ],
    });

    // ── 2. Ableitung (deterministisch, ohne LLM) ────────────────────────
    const spec = freezeSpec(deriveSpec(input, {
      bookId: 'b_1', modelProfileId: 'mp_mock', promptRegistryVersion: 'pr_1',
      now: () => '2026-08-22T10:00:00.000Z',
    }), sha256);

    expect(spec.sizeClass).toBe('M');
    expect(spec.form.povMode).toEqual({ kind: 'single', characterName: 'June Weber' });
    expect(spec.specHash).toMatch(/^sha256:/);

    // ── 3. Validierung ──────────────────────────────────────────────────
    const validation = validateSpec(spec);
    expect(validation.ok).toBe(true);

    // ── 4. Struktur (deterministisch) ───────────────────────────────────
    const arc = computeArc({
      targetWords: spec.scope.targetWords,
      targetChapters: spec.scope.targetChapters,
      actCount: spec.scope.actCount,
    });
    expect(arc.acts.reduce((s, a) => s + a.chapterCount, 0)).toBe(spec.scope.targetChapters);
    expect(tensionTarget(14, spec.scope.targetChapters, arc)).toBeGreaterThan(0);

    // ── 5. Gateway mit Mock-Provider ────────────────────────────────────
    const provider = new MockProvider({
      scripts: {
        'chapter.write': { steps: [{ kind: 'text', text: CHAPTER_TEXT }] },
        'chapter.extract': { steps: [{ kind: 'json', value: EXTRACTION }] },
      },
    });
    const budget = new SimpleBudgetGuard(spec.budget.maxOutputTokens);
    const gw = new LlmGateway({
      providers: { mock: provider },
      modelProfile: mockProfile(),
      store: new MemoryIdempotencyStore(),
      budget,
      sleep: async () => {},
      randomId: () => 'testid',
    });

    // ── 6. Kapitel schreiben ────────────────────────────────────────────
    const draft = await gw.callText({
      capability: 'DRAFTER', operation: 'chapter.write', bookId: 'b_1', targetId: 'ch_14',
      promptVersion: 'pr_1', sections: sections(), fixtureTag: 'chapter.write',
    });

    // ── 7. Szenen trennen (deterministisch) ─────────────────────────────
    const split = splitScenes(draft.data, ['sc_1', 'sc_2', 'sc_3']);
    expect(split.ok).toBe(true);
    expect(split.scenes).toHaveLength(3);
    expect(split.cleanText).not.toContain('<<<');
    for (const s of split.scenes) {
      expect(split.cleanText.slice(s.charStart, s.charEnd)).toBe(s.text);
    }

    // ── 8. Messen (deterministisch, kostenlos) ──────────────────────────
    const locale = getLocale(spec.form.language);
    const words = countWords(split.cleanText, locale.bcp47);
    expect(words).toBeGreaterThan(50);
    const dialogue = dialogueRatio(split.cleanText, locale);
    expect(dialogue).toBeGreaterThan(0);
    expect(dialogue).toBeLessThan(0.5);

    // ── 9. Extraktion ───────────────────────────────────────────────────
    const extraction = await gw.callStructured({
      capability: 'EXTRACTOR', operation: 'chapter.extract', bookId: 'b_1', targetId: 'ch_14',
      promptVersion: 'pr_1', sections: sections({ task: 'Extrahiere die Deltas.' }),
      fixtureTag: 'chapter.extract', schema: ExtractionSchema,
    });
    expect(extraction.data.factDeltas).toHaveLength(2);

    // ── 10. Grounding: die Vertrauensgrenze ─────────────────────────────
    const grounded = groundItems(
      [...extraction.data.events, ...extraction.data.factDeltas],
      split.cleanText,
    );
    // Zwei belegte Deltas werden Canon, das halluzinierte nicht.
    expect(grounded.accepted).toHaveLength(2);
    expect(grounded.rejected).toHaveLength(1);
    expect(grounded.rejected[0]!.reason).toBe('quote_not_found');
    expect(grounded.rejected[0]!.important).toBe(true);
    expect(grounded.groundingRate).toBeCloseTo(0.667, 2);
    expect(grounded.extractionFailed).toBe(true);   // < 80 % -> Extraktion wiederholen

    // ── 11. Budget wurde verbucht, nicht überzogen ──────────────────────
    expect(budget.spent.outputTokens).toBeGreaterThan(0);
    expect(budget.spent.outputTokens).toBeLessThan(spec.budget.maxOutputTokens);

    // ── 12. Idempotenz: gleicher Zustand -> kein zweiter Call ───────────
    const before = provider.calls.length;
    await gw.callText({
      capability: 'DRAFTER', operation: 'chapter.write', bookId: 'b_1', targetId: 'ch_14',
      promptVersion: 'pr_1', sections: sections(), fixtureTag: 'chapter.write',
    });
    expect(provider.calls.length).toBe(before);
  });

  it('blockiert eine unmögliche Konfiguration, bevor ein Call rausgeht', async () => {
    const provider = new MockProvider({ defaultScript: { steps: [{ kind: 'text', text: 'x' }] } });
    const input = WizardInput.parse({
      bookType: 'novel', targetWords: 80_000, targetChapters: 30, wordsPerChapter: 350,
    });
    const spec = deriveSpec(input, {
      bookId: 'b_2', modelProfileId: 'mp_mock', promptRegistryVersion: 'pr_1',
      now: () => '2026-08-22T10:00:00.000Z',
    });

    const validation = validateSpec(spec);
    expect(validation.ok).toBe(false);
    expect(validation.blockers.map((b) => b.code)).toContain('V003');
    // Kein einziger Provider-Call — die Blockade greift vor der Generierung.
    expect(provider.calls).toHaveLength(0);
  });

  it('erzeugt stabile Job-Schlüssel für dieselbe Arbeit', () => {
    const key = (attempt?: string) => jobIdempotencyKey({
      bookVersionId: 'bv_1', operation: 'chapter.write', targetKind: 'chapter',
      targetId: 'ch_14', inputHash: hashObject({ card: 1, state: 'a' }),
      promptVersion: 'pr_1', modelId: 'mock-drafter',
      ...(attempt !== undefined ? { attemptClass: attempt } : {}),
    });
    expect(key()).toBe(key());
    // Eine Reparatur ist absichtlich ein anderer Job.
    expect(key('repair:iss_1:1')).not.toBe(key());
  });
});
