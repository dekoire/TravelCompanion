import { describe, expect, it } from 'vitest';
import {
  findQuote, groundItems, levenshtein, normalizeForMatch, similarityRatio,
} from './grounding';

const TEXT = [
  'Der Regen hatte aufgehört, als June die Treppe hinabstieg.',
  'Im Mantelraum roch es nach nassem Tuch und altem Papier.',
  'Der Umschlag rutschte aus der Innentasche und fiel zu Boden.',
  'Sie hob ihn auf und las die erste Zeile, dann hörte sie Schritte.',
].join(' ');

const NORM = normalizeForMatch(TEXT);

describe('normalizeForMatch', () => {
  it('vereinheitlicht typografische Anführungszeichen', () => {
    expect(normalizeForMatch('„Hallo“')).toBe('"Hallo"');
    expect(normalizeForMatch('»Hallo«')).toBe('"Hallo"');
  });

  it('vereinheitlicht Striche', () => {
    expect(normalizeForMatch('a—b')).toBe('a-b');
  });

  it('kollabiert Whitespace', () => {
    expect(normalizeForMatch('a  \n b')).toBe('a b');
  });
});

describe('findQuote', () => {
  it('findet ein exaktes Zitat', () => {
    const r = findQuote(NORM, 'Der Umschlag rutschte aus der Innentasche');
    expect(r.found).toBe(true);
    if (r.found) {
      expect(r.method).toBe('exact');
      expect(NORM.slice(r.start, r.end)).toBe('Der Umschlag rutschte aus der Innentasche');
    }
  });

  it('nutzt den Offset-Hinweis, wenn er stimmt', () => {
    const quote = 'Im Mantelraum roch es nach nassem Tuch';
    const idx = NORM.indexOf(quote);
    const r = findQuote(NORM, quote, idx);
    expect(r.found && r.method).toBe('exact_at_hint');
  });

  it('findet das Zitat auch bei falschem Offset', () => {
    const quote = 'Im Mantelraum roch es nach nassem Tuch';
    const r = findQuote(NORM, quote, 9999);
    expect(r.found).toBe(true);
    if (r.found) expect(r.offsetDrift).toBeGreaterThan(400);
  });

  it('toleriert typografische Unterschiede', () => {
    const withQuotes = normalizeForMatch('Sie sagte „Guten Morgen“ und ging weiter.');
    const r = findQuote(withQuotes, '"Guten Morgen" und ging weiter');
    expect(r.found).toBe(true);
  });

  it('findet ein leicht abweichendes Zitat per Fuzzy-Suche', () => {
    // Ein Zeichen anders — das passiert bei Normalisierungsresten.
    const r = findQuote(NORM, 'Der Umschlag rutschte aus der Innentaschr');
    expect(r.found).toBe(true);
    if (r.found) expect(r.method).toBe('fuzzy');
  });

  it('lehnt ein erfundenes Zitat ab', () => {
    const r = findQuote(NORM, 'Tomas zog eine Waffe und schoss dreimal in die Luft.');
    expect(r.found).toBe(false);
    if (!r.found) expect(r.reason).toBe('quote_not_found');
  });

  it('lehnt zu kurze Zitate ab', () => {
    const r = findQuote(NORM, 'Regen');
    expect(r.found).toBe(false);
    if (!r.found) expect(r.reason).toBe('quote_too_short');
  });
});

describe('levenshtein / similarityRatio', () => {
  it('ist null bei identischen Strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(similarityRatio('abc', 'abc')).toBe(1);
  });

  it('zählt Einzeländerungen', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('bricht bei Überschreitung der Bandbreite ab', () => {
    expect(levenshtein('abcdefghij', 'zzzzzzzzzz', 3)).toBe(-1);
  });

  it('liefert 0 bei völlig verschiedenen Strings', () => {
    expect(similarityRatio('abcdefghij', 'zzzzzzzzzz')).toBe(0);
  });
});

describe('groundItems — die Vertrauensgrenze', () => {
  interface TestDelta {
    id: string;
    evidence?: { quote: string; start?: number };
    importance?: number;
    critical?: boolean;
  }

  const grounded = (quote: string, extra: Partial<TestDelta> = {}): TestDelta => ({
    id: quote.slice(0, 10), evidence: { quote }, ...extra,
  });

  it('akzeptiert belegte Deltas', () => {
    const r = groundItems([grounded('Der Umschlag rutschte aus der Innentasche')], TEXT);
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected).toHaveLength(0);
    expect(r.groundingRate).toBe(1);
  });

  it('verwirft halluzinierte Deltas', () => {
    const r = groundItems([grounded('June zog eine Pistole aus dem Regal.')], TEXT);
    expect(r.accepted).toHaveLength(0);
    expect(r.rejected[0]?.reason).toBe('quote_not_found');
  });

  it('verwirft Deltas ganz ohne Beleg', () => {
    const noEvidence: TestDelta = { id: 'x' };
    const r = groundItems([noEvidence], TEXT);
    expect(r.rejected[0]?.reason).toBe('no_evidence');
  });

  it('markiert wichtige Deltas gesondert', () => {
    const r = groundItems([grounded('Erfundenes Zitat ohne jede Grundlage hier.',
      { importance: 5 })], TEXT);
    expect(r.rejected[0]?.important).toBe(true);
  });

  it('markiert kritische Deltas gesondert', () => {
    const r = groundItems([grounded('Ebenfalls frei erfunden und nicht im Text.',
      { critical: true })], TEXT);
    expect(r.rejected[0]?.important).toBe(true);
  });

  it('korrigiert die Offsets auf den tatsächlichen Fundort', () => {
    const quote = 'Im Mantelraum roch es nach nassem Tuch';
    const item: TestDelta = { id: 'offset', evidence: { quote, start: 0 } };
    const r = groundItems([item], TEXT);
    const acc = r.accepted[0]!;
    expect(normalizeForMatch(TEXT).slice(acc.evidence.start, acc.evidence.end)).toBe(quote);
  });

  it('meldet die Extraktion als gescheitert bei zu vielen Fehlschlägen', () => {
    const items = [
      grounded('Der Regen hatte aufgehört, als June die Treppe hinabstieg.'),
      grounded('Frei erfundene Aussage Nummer eins ohne Beleg.'),
      grounded('Frei erfundene Aussage Nummer zwei ohne Beleg.'),
      grounded('Frei erfundene Aussage Nummer drei ohne Beleg.'),
    ];
    const r = groundItems(items, TEXT);
    expect(r.groundingRate).toBe(0.25);
    expect(r.extractionFailed).toBe(true);
  });

  it('gilt bei 100 % Belegquote nicht als gescheitert', () => {
    const r = groundItems([grounded('Sie hob ihn auf und las die erste Zeile')], TEXT);
    expect(r.extractionFailed).toBe(false);
  });

  it('ist bei leerer Liste unauffällig', () => {
    const r = groundItems([], TEXT);
    expect(r.groundingRate).toBe(1);
    expect(r.extractionFailed).toBe(false);
  });
});
