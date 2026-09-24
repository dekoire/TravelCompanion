import type { Provider, ProviderRequest, ProviderResponse } from './types';

/**
 * Demo-Provider: erzeugt einen Bilderbuch-Entwurf ohne jedes Modell.
 *
 * WICHTIG: Das ist KEINE KI-Generierung. Der Provider setzt aus Bausteinen einen
 * Entwurf zusammen, der Schema und Pruefungen besteht — damit Pipeline, Layout
 * und Editor ohne API-Key und ohne Kosten vollstaendig sichtbar sind.
 *
 * Er implementiert dieselbe `Provider`-Schnittstelle wie ein echter Anbieter und
 * laeuft durch denselben Gateway (Budget, Idempotenz, Schema-Validierung).
 * Ein echter Bild-/Textprovider ersetzt spaeter genau diese eine Klasse.
 */

export interface DemoBookInput {
  idea: string;
  heroName: string;
  heroKind: string;
  companionName?: string;
  companionKind?: string;
  place: string;
  goal: string;
  spreadCount: number;
  medium: 'watercolor' | 'cut_paper' | 'gouache' | 'crayon' | 'digital_soft' | 'ink_wash' | 'collage';
  paletteHue: number;
  /** Steuert die Textlaenge: aeltere Kinder brauchen mehr Text pro Doppelseite. */
  readingLevel?: 'pre_reader' | 'early_reader' | 'independent';
}

export const DEMO_INPUT_MARKER = 'demo-input';

/** Der Pipeline-Code haengt die Eingabe so an den Prompt an. */
export function encodeDemoInput(input: DemoBookInput): string {
  return `<!--${DEMO_INPUT_MARKER}:${JSON.stringify(input)}-->`;
}

function decodeDemoInput(prompt: string): DemoBookInput | null {
  const m = new RegExp(`<!--${DEMO_INPUT_MARKER}:([\\s\\S]*?)-->`).exec(prompt);
  if (!m?.[1]) return null;
  try { return JSON.parse(m[1]) as DemoBookInput; } catch { return null; }
}

// ─── Beat-Bausteine ──────────────────────────────────────────────────────────

type Camera = 'extreme_wide' | 'wide' | 'medium' | 'close' | 'extreme_close';
type Layout = 'full_bleed' | 'text_left' | 'text_right' | 'text_bottom' | 'vignette' | 'spot';
type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

interface BeatTemplate {
  beat: string;
  /** Der Text sagt, was man NICHT sieht: Gedanke, Ton, Zeit, Gefuehl. */
  text: string;
  subject: string;
  action: string;
  setting: string;
  mood: string;
  camera: Camera;
  layout: Layout;
  time: TimeOfDay;
  withCompanion: boolean;
  /** Refrain an dieser Stelle anhaengen? */
  refrain?: boolean;
  /** Zusatzsatz fuer hoehere Lesestufen — dort ist mehr Text pro Seite ueblich. */
  extra: string;
  core: boolean;
}

/**
 * Text und Bild-Brief beschreiben absichtlich VERSCHIEDENE Dinge.
 * Genau das misst die Redundanzpruefung in @abg/domain.
 */
const BEATS: BeatTemplate[] = [
  { core: true, beat: 'Die Welt vor dem Aufbruch',
    text: 'Morgens roch es nach nassem Gras. {hero} wusste noch nicht, dass heute alles anders wird.',
    subject: '{hero}, {heroKind}', action: 'steht barfuß vor der Haustür und streckt sich',
    setting: '{place} im ersten Licht', mood: 'ruhig, erwartungsvoll',
    camera: 'wide', layout: 'text_bottom', time: 'morning', withCompanion: false , extra: 'Die Fenster im Dorf waren noch dunkel.'},

  { core: true, beat: 'Der Wunsch', refrain: true,
    text: 'Seit drei Tagen dachte {hero} an nichts anderes. {refrain}',
    subject: '{hero}, klein im Bild', action: 'sitzt auf einem Zaunpfahl und schaut in die Ferne',
    setting: 'Wiesenrand mit hohem Gras', mood: 'sehnsüchtig',
    camera: 'medium', layout: 'text_left', time: 'morning', withCompanion: false , extra: 'Niemand hatte ihr gesagt, wo man so etwas findet.'},

  { core: false, beat: 'Der Rucksack',
    text: 'Zwei Äpfel, eine Schnur, ein Stein zum Glück. Mehr passte nicht hinein.',
    subject: '{hero}s Hände', action: 'packen kleine Dinge in eine Stofftasche',
    setting: 'Küchentisch am Fenster', mood: 'konzentriert',
    camera: 'close', layout: 'vignette', time: 'morning', withCompanion: false , extra: 'Die Schnur war zu kurz, aber sie nahm sie trotzdem mit.'},

  { core: true, beat: 'Der Aufbruch',
    text: 'Der Weg knirschte. Hinter {hero} wurde das Haus kleiner und kleiner.',
    subject: '{hero} von hinten', action: 'geht einen schmalen Pfad entlang',
    setting: 'Feldweg zwischen zwei Hecken', mood: 'aufbrechend',
    camera: 'extreme_wide', layout: 'full_bleed', time: 'morning', withCompanion: false , extra: 'Erst nach der Biegung drehte sie sich noch einmal um.'},

  { core: true, beat: 'Die Begegnung',
    text: 'Etwas raschelte. Dann noch einmal. „Suchst du auch etwas?", fragte eine Stimme.',
    subject: '{hero} und {companion}', action: 'treffen sich zwischen den Farnen',
    setting: 'Waldrand mit Farn', mood: 'überrascht, neugierig',
    camera: 'medium', layout: 'text_right', time: 'midday', withCompanion: true , extra: 'Zwischen den Farnen bewegte sich etwas Rotes.'},

  { core: false, beat: 'Gemeinsam weiter',
    text: 'Zu zweit ging es leichter. Sie erfanden ein Lied und vergaßen die Zeit.',
    subject: '{hero} und {companion}', action: 'laufen nebeneinander bergauf',
    setting: 'Hügelkette mit einzelnen Bäumen', mood: 'leicht, fröhlich',
    camera: 'wide', layout: 'text_bottom', time: 'midday', withCompanion: true , extra: 'Das Lied hatte keinen Text, nur eine Melodie.'},

  { core: true, beat: 'Das erste Hindernis',
    text: 'Das Wasser war lauter, als {hero} gedacht hatte. Sie zählte bis drei.',
    subject: '{hero} und {companion}', action: 'stehen am Ufer vor einem breiten Bach',
    setting: 'Waldbach mit glatten Steinen', mood: 'zögernd',
    camera: 'medium', layout: 'text_left', time: 'midday', withCompanion: true , extra: 'Am anderen Ufer standen die Bäume dichter.'},

  { core: false, beat: 'Der Versuch',
    text: 'Ein Stein wackelte. Der zweite hielt. Der dritte auch.',
    subject: '{hero} im Gegenlicht', action: 'balanciert über Steine im Wasser',
    setting: 'Bachlauf', mood: 'angespannt',
    camera: 'close', layout: 'vignette', time: 'midday', withCompanion: false , extra: 'Unter ihren Füßen schob sich das Wasser weiter.'},

  { core: false, beat: 'Die Rast', refrain: true,
    text: 'Sie teilten den letzten Apfel. {refrain}',
    subject: '{hero} und {companion}', action: 'sitzen an einen Baumstamm gelehnt',
    setting: 'Lichtung mit Moos', mood: 'müde, zufrieden',
    camera: 'medium', layout: 'spot', time: 'afternoon', withCompanion: true , extra: 'Der Apfel schmeckte nach Herbst, obwohl es Sommer war.'},

  { core: true, beat: 'Der Rückschlag',
    text: 'Plötzlich war der Pfad zu Ende. Niemand sagte etwas.',
    subject: '{hero} und {companion}', action: 'stehen vor einer dichten Dornenhecke',
    setting: 'Waldstück im Schatten', mood: 'ratlos',
    camera: 'wide', layout: 'text_right', time: 'afternoon', withCompanion: true , extra: 'Von irgendwoher kam ein Geräusch, das nicht dazugehörte.'},

  { core: false, beat: 'Der Umweg',
    text: 'Vielleicht war der lange Weg der richtige. Vielleicht auch nicht.',
    subject: '{hero} und {companion}', action: 'gehen an der Hecke entlang',
    setting: 'schmaler Streifen zwischen Hecke und Feld', mood: 'unsicher',
    camera: 'wide', layout: 'text_bottom', time: 'afternoon', withCompanion: true , extra: 'Die Hecke hörte einfach nicht auf.'},

  { core: true, beat: 'Der Tiefpunkt',
    text: 'Es wurde kühl. {hero} wollte nach Hause und sagte es nicht.',
    subject: '{hero} ganz klein', action: 'sitzt allein auf einem umgestürzten Baum',
    setting: 'Waldboden mit langen Schatten', mood: 'entmutigt, still',
    camera: 'medium', layout: 'text_left', time: 'evening', withCompanion: false , extra: 'Der Boden war kalt geworden.'},

  { core: false, beat: 'Der Trost',
    text: '„Ich bin noch da", sagte {companion} leise. Das half mehr als jeder Plan.',
    subject: '{hero} und {companion}', action: 'sitzen dicht nebeneinander',
    setting: 'Waldboden, tiefstehende Sonne', mood: 'warm, tröstlich',
    camera: 'close', layout: 'vignette', time: 'evening', withCompanion: true , extra: 'Irgendwo weiter oben rief ein Vogel dreimal.'},

  { core: true, beat: 'Die Idee',
    text: 'Und dann fiel es {hero} ein. So einfach, dass sie lachen musste.',
    subject: '{hero} im Profil', action: 'springt auf und zeigt nach oben',
    setting: 'Waldlichtung', mood: 'plötzliche Klarheit',
    camera: 'close', layout: 'text_right', time: 'evening', withCompanion: false , extra: 'Der Knoten musste halten. Er hielt.'},

  { core: false, beat: 'Die Vorbereitung',
    text: 'Sie brauchten die Schnur, den Stein und ein bisschen Mut.',
    subject: '{hero} und {companion}', action: 'knoten eine Schnur um einen Ast',
    setting: 'unter einem hohen Baum', mood: 'geschäftig',
    camera: 'medium', layout: 'spot', time: 'evening', withCompanion: true , extra: 'Unter ihnen wurde das Dorf zu einer Handvoll Lichter.'},

  { core: true, beat: 'Der Höhepunkt', refrain: true,
    text: 'Einen Atemzug lang war alles still. {refrain}',
    subject: '{hero} und {companion}', action: 'schweben über dem weiten Tal',
    setting: 'Himmel über {place}, Wolken von unten', mood: 'überwältigend, weit',
    camera: 'extreme_wide', layout: 'full_bleed', time: 'evening', withCompanion: true , extra: 'Sie hielt es so vorsichtig, als könnte es zerbrechen.'},

  { core: true, beat: 'Der Fund',
    text: 'Es war kleiner, als {hero} geglaubt hatte. Und genau richtig.',
    subject: '{hero}s offene Hände', action: 'halten etwas Kleines',
    setting: 'Kuppe mit weitem Blick', mood: 'staunend',
    camera: 'extreme_close', layout: 'vignette', time: 'evening', withCompanion: false , extra: 'Die Wiese lag schon halb im Schatten.'},

  { core: false, beat: 'Der Abschied',
    text: 'Sie versprachen sich nichts. Das mussten sie auch nicht.',
    subject: '{hero} und {companion}', action: 'winken sich über eine Wiese hinweg zu',
    setting: 'Wiese im letzten Licht', mood: 'wehmütig, warm',
    camera: 'wide', layout: 'text_bottom', time: 'evening', withCompanion: true , extra: 'Das Licht im Fenster war noch an.'},

  { core: true, beat: 'Der Heimweg',
    text: 'Der Weg zurück war derselbe und doch ein anderer.',
    subject: '{hero} von hinten', action: 'geht auf ein erleuchtetes Fenster zu',
    setting: '{place} in der Dämmerung', mood: 'ruhig, angekommen',
    camera: 'wide', layout: 'text_left', time: 'night', withCompanion: false , extra: 'Irgendwer hatte den Tisch schon gedeckt.'},

  { core: false, beat: 'Zuhause',
    text: 'Drinnen roch es nach Suppe. Draußen ging der Tag zu Ende.',
    subject: '{hero} im Türrahmen', action: 'zieht die Schuhe aus',
    setting: 'Hausflur, warmes Licht', mood: 'geborgen',
    camera: 'close', layout: 'spot', time: 'night', withCompanion: false , extra: 'Draußen strich der Wind über das Dach.'},

  { core: true, beat: 'Der letzte Blick', refrain: true,
    text: 'Bevor die Augen zufielen, dachte {hero} noch einmal daran. {refrain}',
    subject: '{hero} unter der Decke', action: 'liegt im Bett, das Fenster steht offen',
    setting: 'Kinderzimmer bei Nacht, Sterne', mood: 'friedlich',
    camera: 'medium', layout: 'full_bleed', time: 'night', withCompanion: false , extra: 'Der Vorhang bewegte sich, obwohl das Fenster zu war.'},

  { core: true, beat: 'Am nächsten Morgen',
    text: 'Am Morgen lag etwas auf der Fensterbank, das vorher nicht da war.',
    subject: 'Fensterbank mit einem kleinen Gegenstand', action: 'liegt im Morgenlicht',
    setting: 'Fensterbrett, Vorhang bewegt sich', mood: 'geheimnisvoll, offen',
    camera: 'extreme_close', layout: 'vignette', time: 'morning', withCompanion: false , extra: 'Der Tag ging langsam weiter.'},
];

const MEDIUM_ANCHOR: Record<string, string> = {
  watercolor: 'Kinderbuch-Illustration in Aquarell, weiche Verläufe, sichtbares Papierkorn.',
  cut_paper: 'Kinderbuch-Illustration als Scherenschnitt-Collage, klare Kanten, geschichtete Flächen.',
  gouache: 'Kinderbuch-Illustration in Gouache, satte deckende Farben, sichtbarer Pinselstrich.',
  crayon: 'Kinderbuch-Illustration in Wachsmalkreide, körnige Textur, kindliche Linienführung.',
  digital_soft: 'Kinderbuch-Illustration, weiche digitale Malerei, sanfte Kanten.',
  ink_wash: 'Kinderbuch-Illustration als Tuschelavierung, lockere Linie, lasierende Flächen.',
  collage: 'Kinderbuch-Illustration als Papiercollage aus gefundenen Materialien.',
};

const PALETTE_NAME = (hue: number): string => {
  if (hue < 40) return 'warmes Ocker und Terrakotta';
  if (hue < 80) return 'Sonnengelb und helles Gras';
  if (hue < 150) return 'Moosgrün und Salbei';
  if (hue < 210) return 'Meerblau und Nebelgrau';
  if (hue < 270) return 'Abendblau und Flieder';
  if (hue < 320) return 'Beerenrot und Pflaume';
  return 'Rosenholz und warmes Grau';
};

function pickBeats(count: number): BeatTemplate[] {
  const core = BEATS.filter((b) => b.core);
  const extra = BEATS.filter((b) => !b.core);
  if (count <= core.length) {
    // Kernbeats in Originalreihenfolge ausduennen, Anfang und Ende behalten.
    const keep = new Set<number>([0, core.length - 1]);
    let i = 1;
    while (keep.size < count && i < core.length - 1) { keep.add(i); i += 1; }
    return core.filter((_, idx) => keep.has(idx)).slice(0, count);
  }
  const out = [...core];
  let e = 0;
  while (out.length < count && e < extra.length) {
    const item = extra[e]!;
    const pos = BEATS.indexOf(item);
    // an die urspruengliche Position im Gesamtbogen einsortieren
    const before = BEATS.slice(0, pos).filter((b) => out.includes(b)).length;
    out.splice(Math.min(before, out.length), 0, item);
    e++;
  }
  return out.slice(0, count);
}

function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}

/** Baut den Bilderbuch-Entwurf. Gleiche Eingabe = gleiches Ergebnis. */
export function buildDemoDraft(input: DemoBookInput): unknown {
  const hero = input.heroName.trim() || 'Mika';
  const heroKind = input.heroKind.trim() || 'ein Kind';
  const companion = (input.companionName ?? '').trim() || 'Nuri';
  const companionKind = (input.companionKind ?? '').trim() || 'ein kleiner Fuchs';
  const place = input.place.trim() || 'am Rand des Dorfes';
  const goal = input.goal.trim() || 'etwas zu finden, das es vielleicht gar nicht gibt';

  const refrain = `Vielleicht heute.`;
  const vars = { hero, heroKind, companion, companionKind, place, goal, refrain };

  const beats = pickBeats(input.spreadCount);
  const usesCompanion = beats.some((b) => b.withCompanion);

  const characters: unknown[] = [
    {
      slug: 'hero', name: hero, role: 'protagonist',
      visualDescriptor: `${heroKind}, runde Wangen, kurze dunkle Haare, gelbe Regenjacke, `
        + 'blaue Hose, immer barfuß oder in roten Stiefeln',
      scaleRelative: 1, species: heroKind,
    },
  ];
  if (usesCompanion) {
    characters.push({
      slug: 'companion', name: companion, role: 'companion',
      visualDescriptor: `${companionKind}, buschiger Schwanz mit weißer Spitze, `
        + 'ein Ohr leicht geknickt, trägt ein verknotetes Halstuch',
      scaleRelative: 0.55, species: companionKind,
    });
  }

  const spreads = beats.map((b, i) => {
    const present = ['hero'];
    if (b.withCompanion && usesCompanion) present.push('companion');
    const isObjectOnly = b.subject.startsWith('Fensterbank');
    const needsMore = input.readingLevel === 'early_reader'
      || input.readingLevel === 'independent';
    const base = fill(b.text, { ...vars, refrain });
    const text = needsMore ? `${base} ${fill(b.extra, vars)}` : base;
    return {
      index: i + 1,
      beat: fill(b.beat, vars),
      text,
      imageBrief: {
        subject: fill(b.subject, vars),
        action: fill(b.action, vars),
        setting: fill(b.setting, vars),
        mood: b.mood,
        cameraDistance: b.camera,
        timeOfDay: b.time,
      },
      charactersPresent: isObjectOnly ? [] : present,
      layout: b.layout,
      textAnchor: b.layout === 'full_bleed'
        ? (i % 2 === 0 ? 'bottom_left' : 'top_right')
        : 'below_image',
    };
  });

  return {
    title: titleFrom(input.idea, hero),
    premise: `${hero} macht sich auf, ${goal}.`,
    refrain,
    characters,
    style: {
      medium: input.medium,
      paletteName: PALETTE_NAME(input.paletteHue),
      paletteHue: input.paletteHue,
      lineQuality: input.medium === 'cut_paper' ? 'none' : 'soft',
      lighting: 'warm_daylight',
      negativePrompt: 'Text, Buchstaben, Wasserzeichen, Logos, verzerrte Hände, '
        + 'gruselige Gesichter, Fotorealismus',
      styleAnchor: MEDIUM_ANCHOR[input.medium] ?? MEDIUM_ANCHOR['watercolor']!,
    },
    spreads,
  };
}

function titleFrom(idea: string, hero: string): string {
  const cleaned = idea.trim().replace(/\s+/g, ' ');
  if (cleaned.length >= 8 && cleaned.length <= 60) {
    return cleaned.replace(/[.!?]+$/, '');
  }
  return `${hero} und das, was noch fehlt`;
}

export class DemoPictureBookProvider implements Provider {
  readonly name = 'demo';
  readonly calls: ProviderRequest[] = [];

  async generate(req: ProviderRequest): Promise<ProviderResponse> {
    this.calls.push(req);
    const input = decodeDemoInput(req.prompt);
    if (!input) {
      throw new Error('DemoPictureBookProvider: keine Demo-Eingabe im Prompt gefunden');
    }
    const draft = buildDemoDraft(input);
    const text = JSON.stringify(draft);
    const inputTokens = Math.ceil((req.prompt.length + req.system.length) / 4);
    return {
      text,
      finishReason: 'stop',
      usage: {
        inputTokens,
        outputTokens: Math.ceil(text.length / 4),
        cachedInputTokens: req.cacheKey ? Math.floor(inputTokens * 0.55) : 0,
        thinkingTokens: 0,
      },
      modelId: req.modelId,
      requestId: `demo_${this.calls.length}`,
    };
  }
}
