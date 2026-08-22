/**
 * Locale-Profile (02 §5). Sprache konfiguriert Algorithmen, nicht nur Prompts.
 * tokensPerWord wird im Betrieb empirisch nachgefuehrt (18 §2.1).
 */
export interface LocaleProfile {
  readonly bcp47: string;
  /** Anfuehrungszeichen-Paare, Reihenfolge = Prioritaet bei der Dialogmessung. */
  readonly quotePairs: ReadonlyArray<readonly [string, string]>;
  /** Kalkulationsbasis Tokens je sichtbarem Wort. */
  readonly tokensPerWord: number;
  /** Fuer die Seitenprognose. */
  readonly wordsPerPage: number;
  /** Lesegeschwindigkeit fuer die Lesedauer. */
  readonly wordsPerMinute: number;
  /** Gibt es eine Du/Sie-Achse? (de/fr ja, en nein) */
  readonly formalityAxis: boolean;
  readonly hasGenderedForms: boolean;
  readonly dialogueStyle: 'quotes' | 'dashes';
}

const DE: LocaleProfile = {
  bcp47: 'de-DE',
  quotePairs: [['„', '“'], ['»', '«'], ['“', '”'], ['"', '"']],
  tokensPerWord: 2.0,
  wordsPerPage: 280,
  wordsPerMinute: 220,
  formalityAxis: true,
  hasGenderedForms: true,
  dialogueStyle: 'quotes',
};

export const LOCALES: Readonly<Record<string, LocaleProfile>> = {
  'de-DE': DE,
  'de-AT': { ...DE, bcp47: 'de-AT' },
  'de-CH': { ...DE, bcp47: 'de-CH', quotePairs: [['«', '»'], ['„', '“'], ['"', '"']] },
  'en-US': {
    bcp47: 'en-US',
    quotePairs: [['“', '”'], ['"', '"'], ['‘', '’']],
    tokensPerWord: 1.35,
    wordsPerPage: 300,
    wordsPerMinute: 250,
    formalityAxis: false,
    hasGenderedForms: false,
    dialogueStyle: 'quotes',
  },
  'en-GB': {
    bcp47: 'en-GB',
    quotePairs: [['‘', '’'], ['“', '”'], ['"', '"']],
    tokensPerWord: 1.35,
    wordsPerPage: 300,
    wordsPerMinute: 250,
    formalityAxis: false,
    hasGenderedForms: false,
    dialogueStyle: 'quotes',
  },
  'fr-FR': {
    bcp47: 'fr-FR',
    quotePairs: [['«', '»'], ['"', '"']],
    tokensPerWord: 1.7,
    wordsPerPage: 290,
    wordsPerMinute: 230,
    formalityAxis: true,
    hasGenderedForms: true,
    dialogueStyle: 'dashes',
  },
  'es-ES': {
    bcp47: 'es-ES',
    quotePairs: [['«', '»'], ['"', '"']],
    tokensPerWord: 1.6,
    wordsPerPage: 290,
    wordsPerMinute: 230,
    formalityAxis: true,
    hasGenderedForms: true,
    dialogueStyle: 'dashes',
  },
  'it-IT': {
    bcp47: 'it-IT',
    quotePairs: [['«', '»'], ['“', '”'], ['"', '"']],
    tokensPerWord: 1.6,
    wordsPerPage: 290,
    wordsPerMinute: 230,
    formalityAxis: true,
    hasGenderedForms: true,
    dialogueStyle: 'quotes',
  },
};

export function getLocale(bcp47: string): LocaleProfile {
  const l = LOCALES[bcp47];
  if (!l) throw new Error(`Unsupported locale: ${bcp47}`);
  return l;
}

export function isSupportedLocale(bcp47: string): boolean {
  return bcp47 in LOCALES;
}
