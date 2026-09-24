import { z } from 'zod';
import { Slug } from './common';

/**
 * Bilderbuch-Modell (Doppelseite als Einheit).
 *
 * Der entscheidende Unterschied zum Roman: Hier ist das BILD der Inhalt und der
 * Text die Bildunterschrift — nicht umgekehrt. Ein `chapterImages: boolean` kann
 * das nicht ausdruecken. Die Einheit ist die Doppelseite (Spread), nicht das Kapitel.
 */

// ─── Druckvorgaben ───────────────────────────────────────────────────────────

/**
 * Bilderbuecher werden in Bogen gedruckt. Erlaubt sind nur Seitenzahlen, die
 * durch 8 teilbar sind — 32 Seiten ist der Branchenstandard. Das ist keine
 * Konvention, die man ignorieren kann: eine 30-seitige Datei ist nicht druckbar.
 */
export const PageCount = z.union([
  z.literal(24), z.literal(32), z.literal(40), z.literal(48),
]);

export const SpreadLayout = z.enum([
  'full_bleed',      // Bild randlos ueber beide Seiten, Text im Bild
  'text_left',       // Bild rechts, Text links
  'text_right',      // Bild links, Text rechts
  'text_bottom',     // Bild oben ueber beide Seiten, Text unten
  'vignette',        // freigestelltes Bild in der Mitte, Text darunter
  'spot',            // kleines Bild, viel Weissraum — fuer ruhige Momente
]);

export const TextAnchor = z.enum([
  'top_left', 'top_right', 'bottom_left', 'bottom_right', 'center', 'below_image',
]);

export const CameraDistance = z.enum([
  'extreme_wide', 'wide', 'medium', 'close', 'extreme_close',
]);

// ─── Figuren ─────────────────────────────────────────────────────────────────

/**
 * Character Sheet. `visualDescriptor` wird WOERTLICH in jeden Bildprompt
 * eingesetzt, auf dem die Figur vorkommt (19 §4). Er wird einmal erzeugt und
 * danach eingefroren — sonst aendert sich das Gesicht von Seite zu Seite.
 */
export const CharacterSheet = z.object({
  slug: Slug,
  name: z.string().min(1).max(60),
  role: z.enum(['protagonist', 'companion', 'antagonist', 'supporting']),
  /** Eingefroren. Aenderung = alle Bilder neu. */
  visualDescriptor: z.string().min(20).max(400),
  /** Deterministische Farbidentitaet — haelt die Figur ueber alle Bilder erkennbar. */
  paletteSeed: z.number().int().min(0).max(360),
  /** Groessenverhaeltnis zur Hauptfigur, fuer konsistente Massstaebe. */
  scaleRelative: z.number().min(0.1).max(10).default(1),
  species: z.string().max(60).default('Mensch'),
}).strict();

export const StyleGuide = z.object({
  medium: z.enum(['watercolor', 'cut_paper', 'gouache', 'crayon', 'digital_soft',
                  'ink_wash', 'collage']),
  paletteName: z.string().max(60),
  /** Basis-Farbton in Grad; alle Spreads variieren davon deterministisch. */
  paletteHue: z.number().int().min(0).max(360),
  lineQuality: z.enum(['soft', 'bold', 'sketchy', 'none']),
  lighting: z.enum(['warm_daylight', 'golden_hour', 'overcast', 'night', 'lamplight']),
  /** Wird an jeden Bildprompt angehaengt. */
  negativePrompt: z.string().max(400),
  /** Wird an jeden Bildprompt angehaengt — haelt den Stil konstant. */
  styleAnchor: z.string().min(10).max(300),
}).strict();

// ─── Doppelseite ─────────────────────────────────────────────────────────────

/**
 * Was das Modell liefert: die inhaltliche Beschreibung.
 * Der fertige Bildprompt wird daraus DETERMINISTISCH komponiert (siehe
 * composeImagePrompt in @abg/domain) — Figurenbeschreibung und Stilanker
 * duerfen nicht dem Modell ueberlassen werden, sonst driften sie.
 */
export const ImageBrief = z.object({
  /** Wer oder was im Bild ist. Ein Eigenname allein ist zulaessig. */
  subject: z.string().min(2).max(200),
  action: z.string().min(3).max(200),
  setting: z.string().min(3).max(200),
  mood: z.string().min(3).max(80),
  cameraDistance: CameraDistance,
  timeOfDay: z.enum(['morning', 'midday', 'afternoon', 'evening', 'night']),
}).strict();

export const Spread = z.object({
  index: z.number().int().min(1).max(24),
  /** Tatsaechliche Seitenzahlen im gedruckten Buch. */
  pages: z.tuple([z.number().int(), z.number().int()]),
  beat: z.string().min(3).max(120),
  /** Die Bildunterschrift — das ist der gesamte Text dieser Doppelseite. */
  text: z.string().min(1).max(600),
  imageBrief: ImageBrief,
  charactersPresent: z.array(Slug).max(6),
  layout: SpreadLayout,
  textAnchor: TextAnchor,
  /** Deterministisch aus index abgeleitet — gleicher Spread, gleiches Bild. */
  seed: z.number().int(),
  /** Vom Nutzer im Editor ueberschrieben? Dann nicht mehr neu generieren. */
  textEdited: z.boolean().default(false),
  imageEdited: z.boolean().default(false),
}).strict();

export const PictureBookPlan = z.object({
  title: z.string().min(1).max(120),
  dedication: z.string().max(200).nullable().default(null),
  /** Die eine Frage, die das Buch beantwortet. Haelt 14 Spreads zusammen. */
  premise: z.string().min(10).max(300),
  /** Wiederkehrender Satz — das wichtigste Mittel im Bilderbuch. */
  refrain: z.string().max(120).nullable().default(null),
  characters: z.array(CharacterSheet).min(1).max(6),
  style: StyleGuide,
  spreads: z.array(Spread).min(6).max(24),
}).strict();

/** Was der Generator liefert — ohne die deterministisch berechneten Felder. */
export const PictureBookDraft = z.object({
  title: z.string().min(1).max(120),
  premise: z.string().min(10).max(300),
  refrain: z.string().max(120).nullable().default(null),
  characters: z.array(CharacterSheet.omit({ paletteSeed: true }).extend({
    paletteSeed: z.number().int().min(0).max(360).optional(),
  })).min(1).max(6),
  style: StyleGuide,
  spreads: z.array(Spread.omit({ pages: true, seed: true, textEdited: true, imageEdited: true }))
    .min(6).max(24),
}).strict();

export type PageCount = z.infer<typeof PageCount>;
export type SpreadLayout = z.infer<typeof SpreadLayout>;
export type TextAnchor = z.infer<typeof TextAnchor>;
export type CameraDistance = z.infer<typeof CameraDistance>;
export type CharacterSheet = z.infer<typeof CharacterSheet>;
export type StyleGuide = z.infer<typeof StyleGuide>;
export type ImageBrief = z.infer<typeof ImageBrief>;
export type Spread = z.infer<typeof Spread>;
export type PictureBookPlan = z.infer<typeof PictureBookPlan>;
export type PictureBookDraft = z.infer<typeof PictureBookDraft>;
