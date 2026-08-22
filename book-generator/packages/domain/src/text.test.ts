import { describe, expect, it } from 'vitest';
import {
  countWords, countSentences, dialogueRatio, measureStyle, splitScenes,
  stripMetaText, stitchWithOverlap, lastNWords, stripSceneMarkers,
} from './text';
import { getLocale } from './locale';

const DE = getLocale('de-DE');
const EN = getLocale('en-US');

describe('countWords', () => {
  it('zählt deutsche Komposita als ein Wort', () => {
    expect(countWords('Donaudampfschifffahrtsgesellschaft', 'de-DE')).toBe(1);
  });

  it('zählt Bindestrich-Komposita als ein Wort', () => {
    // Intl.Segmenter allein liefert hier 3 — das widerspricht der Publishing-
    // Konvention (Word zählt 1). joinHyphenatedWords korrigiert das.
    expect(countWords('Schwarz-Weiß-Fotografie', 'de-DE')).toBe(1);
    expect(countWords('E-Mail', 'de-DE')).toBe(1);
    expect(countWords('U-Bahn-Station', 'de-DE')).toBe(1);
  });

  it('behandelt Gedankenstriche weiter als Satzzeichen', () => {
    expect(countWords('Wort — Gedanke', 'de-DE')).toBe(2);
    expect(countWords('Wort – Gedanke', 'de-DE')).toBe(2);
    expect(countWords('ein-, zweimal', 'de-DE')).toBe(2);
  });

  it('zählt Zahlen und Apostroph-Formen als ein Wort', () => {
    expect(countWords('1.234', 'de-DE')).toBe(1);
    expect(countWords('3,5', 'de-DE')).toBe(1);
    expect(countWords("geht's", 'de-DE')).toBe(1);
  });

  it('ignoriert Satzzeichen', () => {
    expect(countWords('Hallo, Welt! Wie geht es dir?', 'de-DE')).toBe(6);
  });

  it('ignoriert Szenenmarker', () => {
    expect(countWords('<<<SCENE sc_1>>>\nEin Wort.\n<<<END>>>', 'de-DE')).toBe(2);
  });

  it('zählt Kursiv-Markup nicht als Wort', () => {
    expect(countWords('Er dachte *das ist falsch* und ging.', 'de-DE'))
      .toBe(countWords('Er dachte das ist falsch und ging.', 'de-DE'));
  });

  it('ist bei leerem Text null', () => {
    expect(countWords('', 'de-DE')).toBe(0);
    expect(countWords('   \n\n  ', 'de-DE')).toBe(0);
  });
});

describe('countSentences', () => {
  it('trennt an Satzzeichen', () => {
    expect(countSentences('Eins. Zwei! Drei?', 'de-DE')).toBe(3);
  });
});

describe('dialogueRatio', () => {
  it('erkennt deutsche Anführungszeichen', () => {
    const text = '„Guten Morgen“, sagte sie.';
    const r = dialogueRatio(text, DE);
    expect(r).toBeGreaterThan(0.4);
    expect(r).toBeLessThanOrEqual(1);
  });

  it('ist null ohne Dialog', () => {
    expect(dialogueRatio('Der Regen fiel auf das Dach.', DE)).toBe(0);
  });

  it('zählt Gedankenrede nicht als Dialog', () => {
    const withThought = 'Sie schwieg. *Das kann nicht sein*, dachte sie. Der Wind drehte.';
    expect(dialogueRatio(withThought, DE)).toBe(0);
  });

  it('erkennt Guillemets als Stilvariante', () => {
    expect(dialogueRatio('»Komm herein«, sagte er.', DE)).toBeGreaterThan(0.3);
  });

  it('nutzt englische Quotes bei englischem Locale', () => {
    expect(dialogueRatio('“Good morning,” she said.', EN)).toBeGreaterThan(0.4);
  });

  it('misst auch bei gemischten Anführungszeichen', () => {
    // Modelle liefern regelmäßig „Text" statt „Text“. Wer nur das exakte Paar
    // sucht, misst hier 0 und repariert anschließend das falsche Problem.
    expect(dialogueRatio('„Sie haben ihn gehabt", sagte sie leise.', DE)).toBeGreaterThan(0.4);
    expect(dialogueRatio('„Sie haben ihn gehabt“, sagte sie leise.', DE)).toBeGreaterThan(0.4);
  });

  it('zählt gemischte Paare nicht doppelt', () => {
    expect(dialogueRatio('„Guten Morgen“, sagte sie.', DE)).toBeLessThanOrEqual(1);
  });

  it('ignoriert unbalancierte Quotes über Absatzgrenzen', () => {
    const text = 'Er sagte „etwas Wichtiges\n\nEin neuer Absatz ohne Ende.';
    expect(dialogueRatio(text, DE)).toBe(0);
  });
});

describe('measureStyle', () => {
  it('liefert konsistente Kennzahlen', () => {
    const text = 'Kurz. Ein etwas längerer Satz mit mehreren Wörtern darin.\n\n'
      + '„Und ein Dialog“, sagte sie leise.';
    const m = measureStyle(text, DE);
    expect(m.sentences).toBe(3);
    expect(m.paragraphs).toBe(2);
    expect(m.words).toBeGreaterThan(10);
    expect(m.avgSentenceWords).toBeCloseTo(m.words / m.sentences, 1);
    expect(m.sentenceLengthSd).toBeGreaterThan(0);
    expect(m.typeTokenRatio).toBeGreaterThan(0);
    expect(m.typeTokenRatio).toBeLessThanOrEqual(1);
  });
});

describe('splitScenes', () => {
  const raw = '<<<SCENE sc_1>>>\nErste Szene.\n<<<SCENE sc_2>>>\nZweite Szene.\n<<<END>>>';

  it('trennt an Markern und entfernt sie', () => {
    const r = splitScenes(raw, ['sc_1', 'sc_2']);
    expect(r.ok).toBe(true);
    expect(r.scenes.map((s) => s.sceneSlug)).toEqual(['sc_1', 'sc_2']);
    expect(r.cleanText).not.toContain('<<<');
    expect(r.cleanText).toContain('Erste Szene.');
  });

  it('liefert Offsets, die im bereinigten Text stimmen', () => {
    const r = splitScenes(raw, ['sc_1', 'sc_2']);
    for (const s of r.scenes) {
      expect(r.cleanText.slice(s.charStart, s.charEnd)).toBe(s.text);
    }
  });

  it('meldet fehlende Marker statt hart zu scheitern', () => {
    const r = splitScenes('Nur Text ohne Marker.', ['sc_1']);
    expect(r.ok).toBe(false);
    expect(r.problems).toContain('no_scene_markers');
    expect(r.cleanText).toBe('Nur Text ohne Marker.');
  });

  it('erkennt falsche Reihenfolge', () => {
    const r = splitScenes('<<<SCENE sc_2>>>\nA\n<<<SCENE sc_1>>>\nB\n<<<END>>>', ['sc_1', 'sc_2']);
    expect(r.problems).toContain('scene_order_wrong');
  });

  it('erkennt fehlenden END-Marker', () => {
    const r = splitScenes('<<<SCENE sc_1>>>\nA', ['sc_1']);
    expect(r.problems).toContain('missing_end_marker');
  });
});

describe('stripMetaText', () => {
  it('entfernt Vorreden', () => {
    const r = stripMetaText('Hier ist dein Kapitel:\n\nDer Regen fiel.');
    expect(r.text).toBe('Der Regen fiel.');
    expect(r.removed.length).toBeGreaterThan(0);
  });

  it('entfernt Kapitelüberschriften (die kommen aus der DB)', () => {
    expect(stripMetaText('Kapitel 14: Der zweite Brief\n\nSie ging.').text).toBe('Sie ging.');
  });

  it('entfernt Wortzahl-Nachsätze', () => {
    expect(stripMetaText('Text.\n\n(Wortanzahl: 2.913)').text).toBe('Text.');
  });

  it('packt Code-Fences aus', () => {
    expect(stripMetaText('```markdown\nDer Text.\n```').text).toBe('Der Text.');
  });

  it('meldet KI-Selbstreferenz als Signal statt sie zu entfernen', () => {
    const r = stripMetaText('Als KI kann ich das nicht schreiben.');
    expect(r.signals.map((s) => s.code)).toContain('ai_self_reference');
  });

  it('meldet Platzhalter', () => {
    const r = stripMetaText('Sie sah [Name] an.');
    expect(r.signals.map((s) => s.code)).toContain('placeholder');
  });

  it('meldet URLs im Prosatext', () => {
    const r = stripMetaText('Mehr unter https://example.com dazu.');
    expect(r.signals.map((s) => s.code)).toContain('external_url');
  });

  it('lässt sauberen Text unverändert', () => {
    const clean = 'Der Regen hatte aufgehört. Sie ging hinaus.';
    const r = stripMetaText(clean);
    expect(r.text).toBe(clean);
    expect(r.signals).toHaveLength(0);
  });
});

describe('stitchWithOverlap', () => {
  it('entfernt die Überlappung', () => {
    const head = 'Sie ging durch den Regen und dachte an den Brief in ihrer Tasche.';
    const tail = 'den Brief in ihrer Tasche. Dann blieb sie stehen.';
    const r = stitchWithOverlap(head, tail, 20);
    expect(r).toBe('Sie ging durch den Regen und dachte an den Brief in ihrer Tasche. Dann blieb sie stehen.');
    expect(r.match(/den Brief in ihrer Tasche/g)).toHaveLength(1);
  });

  it('fügt ohne Überlappung mit Leerzeichen zusammen', () => {
    expect(stitchWithOverlap('Erster Teil.', 'Zweiter Teil.', 30))
      .toBe('Erster Teil. Zweiter Teil.');
  });

  it('erkennt auch kurze Nahtstellen mit dem Standardwert', () => {
    // 26 Zeichen Überlappung — mit einem Mindestwert von 30 bliebe die Dopplung stehen.
    const head = 'Sie ging weiter und dachte an den Brief in ihrer Tasche.';
    const tail = 'den Brief in ihrer Tasche. Dann blieb sie stehen.';
    const r = stitchWithOverlap(head, tail);
    expect(r.match(/den Brief in ihrer Tasche/g)).toHaveLength(1);
  });

  it('dedupliziert nicht bei zufälligen Kurzfolgen', () => {
    const r = stitchWithOverlap('Sie ging.', 'Ging sie?');
    expect(r).toBe('Sie ging. Ging sie?');
  });
});

describe('lastNWords', () => {
  it('liefert die letzten n Wörter', () => {
    const t = 'eins zwei drei vier fünf sechs';
    expect(countWords(lastNWords(t, 3), 'de-DE')).toBe(3);
    expect(lastNWords(t, 3)).toContain('sechs');
  });

  it('gibt bei kurzem Text alles zurück', () => {
    expect(lastNWords('nur drei wörter', 10)).toBe('nur drei wörter');
  });
});

describe('stripSceneMarkers', () => {
  it('entfernt alle Marker und normalisiert Leerzeilen', () => {
    expect(stripSceneMarkers('<<<SCENE a>>>\n\n\nText\n<<<END>>>')).toBe('Text');
  });
});
