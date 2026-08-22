import { describe, expect, it } from 'vitest';
import { ChapterCard, SceneCard } from './cards';
import { ChapterExtraction, FactDelta, SceneExtraction } from './extraction';
import { Issue, SemanticCheckResult, VerificationResult } from './issues';
import { WizardInput } from './wizard';
import { Evidence } from './common';

const evidence = { quote: 'Der Umschlag rutschte aus der Innentasche.', start: 100, end: 141 };

describe('Evidence — ohne Beleg kein Canon', () => {
  it('akzeptiert ein ausreichend langes Zitat', () => {
    expect(Evidence.safeParse(evidence).success).toBe(true);
  });

  it('lehnt zu kurze Zitate ab', () => {
    expect(Evidence.safeParse({ quote: 'kurz', start: 0, end: 4 }).success).toBe(false);
  });

  it('lehnt fehlende Offsets ab', () => {
    expect(Evidence.safeParse({ quote: evidence.quote }).success).toBe(false);
  });

  it('lehnt Zusatzfelder ab', () => {
    expect(Evidence.safeParse({ ...evidence, confidence: 1 }).success).toBe(false);
  });
});

describe('FactDelta', () => {
  const base = {
    op: 'set', subject: 'archive_key', predicate: 'owner', value: 'june', evidence,
  };

  it('akzeptiert ein vollständiges Delta', () => {
    expect(FactDelta.safeParse(base).success).toBe(true);
  });

  it('erzwingt einen Beleg', () => {
    const { evidence: _drop, ...withoutEvidence } = base;
    expect(FactDelta.safeParse(withoutEvidence).success).toBe(false);
  });

  it('lehnt ein Prädikat außerhalb des Katalogs ab', () => {
    // Ein neuer Prädikat-Typ ist eine bewusste Entscheidung mit Check-Anpassung,
    // kein Nebeneffekt eines Prompts.
    expect(FactDelta.safeParse({ ...base, predicate: 'stimmung' }).success).toBe(false);
  });

  it('lehnt einen ungültigen Slug ab', () => {
    expect(FactDelta.safeParse({ ...base, subject: 'Archive Key' }).success).toBe(false);
    expect(FactDelta.safeParse({ ...base, subject: '123key' }).success).toBe(false);
  });

  it('setzt confidence auf 1, wenn nicht angegeben', () => {
    const r = FactDelta.parse(base);
    expect(r.confidence).toBe(1);
  });
});

describe('SceneExtraction', () => {
  const minimal = {
    sceneSlug: 'sc_14_2',
    storyTime: {
      start: '1894-10-12T20:40', end: '1894-10-12T21:05',
      durationMinutes: 25, gapFromPrevMinutes: 15, timeOfDay: 'night', isFlashback: false,
    },
    location: 'coat_room',
    presentCharacters: ['june'],
    readerQuestions: { raised: [], answered: [] },
    cardCompliance: {
      requiredEventsCovered: [], requiredEventsMissing: [], forbiddenEventsOccurred: [],
      requiredChangesMet: [], requiredChangesUnmet: [],
    },
    summary: 'June entdeckt im Mantelraum den zweiten Brief und verlaesst das Archiv.',
  };

  it('akzeptiert eine minimale Szene mit Defaults', () => {
    const r = SceneExtraction.parse(minimal);
    expect(r.events).toEqual([]);
    expect(r.factDeltas).toEqual([]);
    expect(r.contradictions).toEqual([]);
  });

  it('erzwingt eine Zusammenfassung', () => {
    const { summary: _s, ...without } = minimal;
    expect(SceneExtraction.safeParse(without).success).toBe(false);
  });

  it('begrenzt die Anzahl der Deltas', () => {
    const many = Array.from({ length: 30 }, () => ({
      op: 'set', subject: 'x', predicate: 'flag', value: true, evidence,
    }));
    expect(SceneExtraction.safeParse({ ...minimal, factDeltas: many }).success).toBe(false);
  });

  it('lehnt unbekannte Tageszeiten ab', () => {
    expect(SceneExtraction.safeParse({
      ...minimal, storyTime: { ...minimal.storyTime, timeOfDay: 'irgendwann' },
    }).success).toBe(false);
  });

  it('lehnt unbekannte Felder ab', () => {
    expect(SceneExtraction.safeParse({ ...minimal, zusatz: 'halluziniert' }).success).toBe(false);
  });
});

describe('ChapterExtraction', () => {
  it('verlangt mindestens eine Szene', () => {
    expect(ChapterExtraction.safeParse({ chapterNo: 1, scenes: [], chapterSummary: {} }).success)
      .toBe(false);
  });
});

describe('Issue', () => {
  const base = {
    category: 'timeline', code: 'impossible_travel', severity: 'high', confidence: 1,
    message: 'June ist in 20 Minuten vom Leuchtturm zum Hafen gelangt.',
    evidence: [{ ...evidence, role: 'violation' }],
  };

  it('akzeptiert einen vollständigen Befund', () => {
    expect(Issue.safeParse(base).success).toBe(true);
  });

  it('verlangt mindestens einen Beleg — ohne Zitat kein Befund', () => {
    expect(Issue.safeParse({ ...base, evidence: [] }).success).toBe(false);
  });

  it('kennt die Rolle "widerspricht" für den Gegenbeleg', () => {
    const r = Issue.safeParse({
      ...base,
      evidence: [{ ...evidence, role: 'violation' }, { ...evidence, role: 'contradicts' }],
    });
    expect(r.success).toBe(true);
  });

  it('lehnt eine unbekannte Kategorie ab', () => {
    expect(Issue.safeParse({ ...base, category: 'gefuehl' }).success).toBe(false);
  });
});

describe('SemanticCheckResult', () => {
  it('begrenzt die Befunde auf sechs', () => {
    const one = {
      category: 'plot', code: 'x', severity: 'low', confidence: 0.8,
      message: 'Eine ausreichend lange Meldung fuer den Test.',
      evidence: [{ ...evidence, role: 'violation' }],
    };
    const r = SemanticCheckResult.safeParse({
      issues: Array.from({ length: 7 }, () => one),
      overallAssessment: 'ok', chapterFulfillsFunction: true,
    });
    expect(r.success).toBe(false);
  });
});

describe('VerificationResult', () => {
  it('erlaubt "unclear" als Antwort', () => {
    const r = VerificationResult.safeParse({
      answer: 'unclear', quote: null, charApprox: null, confidence: 0.4,
      reasoning: 'Der Text laesst offen, ob der Schluessel verloren ging.',
    });
    expect(r.success).toBe(true);
  });
});

describe('ChapterCard', () => {
  const card = {
    chapterNo: 14, actIndex: 1, title: 'Der zweite Brief', beatAnchor: 'midpoint',
    povCharacterSlug: 'june',
    primaryFunction: 'Enthuellung: Tomas hat den zweiten Brief zurueckgehalten',
    targetWords: 3100, wordCorridor: [2790, 3410], sceneCount: 3,
    startState: { location: 'archive_hall', storyTime: '1894-10-12T18:00',
                  protagonistEmotion: 'angespannt', requiredFacts: [] },
    endState: { location: 'cliff_path', storyTime: '1894-10-12T22:15',
                protagonistEmotion: 'verraten', requiredFacts: [] },
    activeCharacters: ['june', 'tomas'], activeThreads: ['missing_letter'],
    requiredEvents: [{ id: 're_1', what: 'June entdeckt den zweiten Brief', critical: true }],
    tensionTarget: 72, emotionalArc: { from: 'hope', to: 'betrayal' },
    dialogueCorridor: [0.35, 0.55], pacing: 'medium_fast',
    openingType: 'in_medias_res', closingType: 'revelation_hook',
    handshake: { prevChapterLastLine: 'Sie loeschte die Lampe.', timeGapMinutes: 15,
                 mustNotRepeatOpenings: ['dialogue'] },
  };

  it('akzeptiert eine vollständige Karte', () => {
    expect(ChapterCard.safeParse(card).success).toBe(true);
  });

  it('begrenzt die Obligations auf vier — sonst wird das Kapitel zur Checkliste', () => {
    const four = { threadSlug: 't', kind: 'touch', what: 'x' };
    expect(ChapterCard.safeParse({
      ...card, obligations: Array.from({ length: 5 }, () => four),
    }).success).toBe(false);
  });

  it('lehnt eine unbekannte Eröffnungsart ab', () => {
    expect(ChapterCard.safeParse({ ...card, openingType: 'irgendwie' }).success).toBe(false);
  });

  it('verlangt eine erkennbare Kapitelfunktion', () => {
    expect(ChapterCard.safeParse({ ...card, primaryFunction: 'kurz' }).success).toBe(false);
  });
});

describe('SceneCard', () => {
  const scene = {
    sceneSlug: 'sc_14_2', index: 2, goal: 'June findet den zweiten Brief', type: 'discovery',
    targetWords: 1150, location: 'coat_room', storyTimeStart: '1894-10-12T20:40',
    durationMinutes: 25, presentCharacters: ['june'],
    requiredChanges: ['knows(june, second_letter_exists) = true'],
    emotionalArc: { from: 'anxious', to: 'shocked' },
    beats: ['June sucht ihren Schal', 'Der Umschlag faellt heraus'],
    exitCondition: 'Schritte auf der Treppe', transitionToNext: 'hard_cut',
  };

  it('akzeptiert eine vollständige Szenenkarte', () => {
    expect(SceneCard.safeParse(scene).success).toBe(true);
  });

  it('verlangt mindestens zwei Beats', () => {
    expect(SceneCard.safeParse({ ...scene, beats: ['nur einer'] }).success).toBe(false);
  });

  it('prüft die Ausdrucksgrammatik der Bedingungen', () => {
    expect(SceneCard.safeParse({
      ...scene, requiredChanges: ['June weiss jetzt von dem Brief'],
    }).success).toBe(false);
  });

  it('akzeptiert gültige Bedingungsausdrücke', () => {
    expect(SceneCard.safeParse({
      ...scene,
      preconditions: ['location(june) = archive_hall'],
      requiredChanges: ['possession(second_letter) = june'],
      forbiddenChanges: ['knows(june, letter_author_identity) = true'],
    }).success).toBe(true);
  });
});

describe('WizardInput', () => {
  it('kommt mit einer minimalen Eingabe aus', () => {
    const r = WizardInput.parse({ bookType: 'novel' });
    expect(r.language).toBe('de-DE');
    expect(r.track).toBe('fiction');
    expect(r.characters).toEqual([]);
  });

  it('begrenzt die Länge der Buchidee', () => {
    expect(WizardInput.safeParse({ bookType: 'novel', userIdea: 'x'.repeat(5000) }).success)
      .toBe(false);
  });

  it('lehnt unbekannte Felder ab', () => {
    expect(WizardInput.safeParse({ bookType: 'novel', geheim: true }).success).toBe(false);
  });
});
