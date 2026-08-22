import { describe, expect, it } from 'vitest';
import {
  createPhraseIndex, detectGestureOveruse, detectOveruse, extractNgrams,
  selectNegativeList, updatePhraseIndex,
} from './phrases';
import { compareOpenings, findNameNearMisses, trigramSimilarity } from './similarity';

describe('extractNgrams', () => {
  it('erzeugt n-Gramme mit mindestens zwei Inhaltswörtern', () => {
    const g = extractNgrams('Ein Schauer lief ihr über den Rücken', 'de-DE', 3, 3);
    expect([...g.keys()]).toContain('ein schauer lief');
  });

  it('ignoriert reine Stoppwortfolgen', () => {
    const g = extractNgrams('und der die das mit von zu', 'de-DE', 3, 3);
    expect(g.size).toBe(0);
  });

  it('zählt Wiederholungen', () => {
    const g = extractNgrams('sie nickte langsam. er nickte langsam.', 'de-DE', 3, 3);
    expect(g.get('sie nickte langsam')).toBe(1);
    expect(g.get('er nickte langsam')).toBe(1);
  });
});

describe('PhraseIndex', () => {
  const phrase = 'Ein Schauer lief ihr über den Rücken.';

  it('akkumuliert über Kapitel', () => {
    const idx = createPhraseIndex('de-DE');
    updatePhraseIndex(idx, phrase, 1);
    updatePhraseIndex(idx, phrase, 2);
    const stat = idx.stats.get('ein schauer lief');
    expect(stat?.count).toBe(2);
    expect(stat?.chapters).toEqual([1, 2]);
  });

  it('liefert eine Negativliste für den nächsten Kontext', () => {
    const idx = createPhraseIndex('de-DE');
    for (let ch = 1; ch <= 5; ch++) updatePhraseIndex(idx, phrase, ch);
    const list = selectNegativeList(idx);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((p) => p.includes('schauer'))).toBe(true);
  });

  it('begrenzt die Negativliste', () => {
    const idx = createPhraseIndex('de-DE');
    for (let ch = 1; ch <= 6; ch++) {
      updatePhraseIndex(idx, 'Der lange Satz mit vielen verschiedenen Inhaltswoertern darin steht hier.', ch);
    }
    expect(selectNegativeList(idx, 5).length).toBeLessThanOrEqual(5);
  });

  it('schützt bewusste Motive vor der Negativliste', () => {
    const idx = createPhraseIndex('de-DE', ['das licht im leuchtturm']);
    for (let ch = 1; ch <= 6; ch++) {
      updatePhraseIndex(idx, 'Das Licht im Leuchtturm brannte.', ch);
    }
    expect(selectNegativeList(idx)).not.toContain('das licht im leuchtturm');
  });

  it('braucht Vorkommen in mindestens zwei Kapiteln', () => {
    const idx = createPhraseIndex('de-DE');
    updatePhraseIndex(idx, `${phrase} ${phrase} ${phrase} ${phrase}`, 1);
    expect(selectNegativeList(idx)).toHaveLength(0);
  });
});

describe('detectOveruse', () => {
  it('meldet buchweit häufige und im Kapitel wiederholte Phrasen', () => {
    const idx = createPhraseIndex('de-DE');
    for (let ch = 1; ch <= 3; ch++) {
      updatePhraseIndex(idx, 'Sie atmete tief durch und schwieg.', ch);
    }
    const chapter = 'Sie atmete tief durch. Später atmete tief durch die Nacht der Wind.';
    const findings = detectOveruse(idx, chapter, 4);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]!.totalCount).toBeGreaterThanOrEqual(4);
  });

  it('meldet nichts bei einmaligem Vorkommen', () => {
    const idx = createPhraseIndex('de-DE');
    expect(detectOveruse(idx, 'Ein völlig neuer Satz ohne Wiederholung.', 1)).toHaveLength(0);
  });

  it('unterdrückt kürzere n-Gramme, die in längeren enthalten sind', () => {
    const idx = createPhraseIndex('de-DE');
    for (let ch = 1; ch <= 4; ch++) {
      updatePhraseIndex(idx, 'Ein Schauer lief ihr über den Rücken.', ch);
    }
    const findings = detectOveruse(idx, 'Ein Schauer lief ihr über den Rücken. Ein Schauer lief ihr über den Rücken.', 5);
    const grams = findings.map((f) => f.ngram);
    // Nicht gleichzeitig "ein schauer lief" und "ein schauer lief ihr" melden.
    const nested = grams.filter((g) => grams.some((o) => o !== g && o.includes(g)));
    expect(nested).toHaveLength(0);
  });
});

describe('detectGestureOveruse', () => {
  it('erkennt überstrapazierte Gesten', () => {
    const text = 'Sie nickte langsam. Er nickte langsam. Dann nickte langsam auch der Wirt.';
    const r = detectGestureOveruse(text, 'de-DE', 3);
    expect(r[0]?.phrase).toBe('nickte langsam');
    expect(r[0]?.count).toBe(3);
  });

  it('meldet unter der Schwelle nichts', () => {
    expect(detectGestureOveruse('Sie nickte langsam.', 'de-DE', 3)).toHaveLength(0);
  });
});

describe('trigramSimilarity', () => {
  it('ist bei identischem Text 1', () => {
    expect(trigramSimilarity('Der Regen fiel', 'Der Regen fiel')).toBe(1);
  });

  it('ist bei verschiedenem Text niedrig', () => {
    expect(trigramSimilarity('Der Regen fiel', 'Ganz andere Wörter hier'))
      .toBeLessThan(0.2);
  });

  it('ignoriert Groß-/Kleinschreibung und Satzzeichen', () => {
    expect(trigramSimilarity('Der Regen fiel!', 'der regen fiel')).toBeGreaterThan(0.9);
  });
});

describe('compareOpenings', () => {
  const previous = [
    { chapterNo: 1, first200Words: 'Der Regen hatte aufgehört, als sie die Treppe hinabstieg.' },
    { chapterNo: 2, first200Words: 'Im Hafen roch es nach Teer und kaltem Eisen an diesem Morgen.' },
  ];

  it('erkennt einen zu ähnlichen Kapitelanfang', () => {
    const findings = compareOpenings(
      'Der Regen hatte aufgehört, als sie die Treppe hinaufstieg.', previous);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]!.againstChapter).toBe(1);
    expect(findings[0]!.needsEmbeddingCheck).toBe(true);
  });

  it('meldet einen eigenständigen Anfang nicht', () => {
    expect(compareOpenings(
      'Tomas zählte die Stufen, während unten jemand eine Tür zuschlug.', previous))
      .toHaveLength(0);
  });
});

describe('findNameNearMisses', () => {
  it('erkennt Tippfehler in Eigennamen', () => {
    // Trigramm-Jaccard liegt hier nur bei ~0,4 — deshalb entscheidet die
    // Editierdistanz, nicht die Trigramm-Ähnlichkeit.
    const r = findNameNearMisses(['Ardmore'], ['Ardmoor', 'June']);
    expect(r[0]?.canonical).toBe('Ardmoor');
    expect(r[0]?.reason).toBe('edit_distance');
    expect(r[0]?.editDistance).toBeLessThanOrEqual(2);
  });

  it('erkennt doppelte Konsonanten und fehlende Endungen', () => {
    expect(findNameNearMisses(['Ardmoore'], ['Ardmoor'])).toHaveLength(1);
    expect(findNameNearMisses(['Tomass'], ['Tomas'])).toHaveLength(1);
  });

  it('meldet identische Namen nicht', () => {
    expect(findNameNearMisses(['Ardmoor'], ['Ardmoor'])).toHaveLength(0);
  });

  it('meldet Groß-/Kleinschreibung und Akzente nicht als Tippfehler', () => {
    expect(findNameNearMisses(['ARDMOOR'], ['Ardmoor'])).toHaveLength(0);
    expect(findNameNearMisses(['Cafe'], ['Café'])).toHaveLength(0);
  });

  it('meldet völlig verschiedene Namen nicht', () => {
    expect(findNameNearMisses(['Tomas'], ['Ardmoor'])).toHaveLength(0);
    expect(findNameNearMisses(['June'], ['Tomas'])).toHaveLength(0);
  });

  it('ignoriert sehr kurze Namen — dort ist jede Distanz bedeutungslos', () => {
    expect(findNameNearMisses(['Jo'], ['Bo'])).toHaveLength(0);
  });
});
