import type { CharacterSheet, PictureBookPlan, Spread } from '@abg/schemas';

/**
 * Deterministischer Platzhalter-Renderer fuer Bilderbuch-Doppelseiten.
 *
 * Erzeugt KEIN KI-Bild. Er zeigt, was ohne echtes Bildmodell schon pruefbar ist:
 * Layout, Textmenge im vorgesehenen Bereich, Bildausschnitt und — ueber den
 * paletteSeed — ob dieselbe Figur auf allen Doppelseiten dieselbe Farbidentitaet
 * behaelt. Der echte Bildprovider ersetzt spaeter genau diese eine Funktion.
 */

export const SPREAD_WIDTH = 1600;
export const SPREAD_HEIGHT = 800;

/** mulberry32 — kleiner, schneller, reproduzierbarer PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rect { x: number; y: number; w: number; h: number }

interface Regions { image: Rect; text: Rect; textOnImage: boolean }

function regionsFor(spread: Spread): Regions {
  const W = SPREAD_WIDTH, H = SPREAD_HEIGHT, M = 48;
  switch (spread.layout) {
    case 'text_left':
      return { image: { x: W / 2, y: 0, w: W / 2, h: H },
               text: { x: M, y: M, w: W / 2 - M * 2, h: H - M * 2 }, textOnImage: false };
    case 'text_right':
      return { image: { x: 0, y: 0, w: W / 2, h: H },
               text: { x: W / 2 + M, y: M, w: W / 2 - M * 2, h: H - M * 2 }, textOnImage: false };
    case 'text_bottom':
      return { image: { x: 0, y: 0, w: W, h: H * 0.66 },
               text: { x: M, y: H * 0.66 + M, w: W - M * 2, h: H * 0.34 - M * 1.5 },
               textOnImage: false };
    case 'vignette':
      return { image: { x: W * 0.16, y: 40, w: W * 0.68, h: H * 0.62 },
               text: { x: W * 0.16, y: H * 0.62 + 70, w: W * 0.68, h: H * 0.3 },
               textOnImage: false };
    case 'spot':
      return { image: { x: W * 0.58, y: H * 0.18, w: W * 0.3, h: H * 0.6 },
               text: { x: M * 2, y: H * 0.3, w: W * 0.42, h: H * 0.5 }, textOnImage: false };
    case 'full_bleed':
    default:
      return { image: { x: 0, y: 0, w: W, h: H },
               text: textBoxOnImage(spread), textOnImage: true };
  }
}

function textBoxOnImage(spread: Spread): Rect {
  const W = SPREAD_WIDTH, H = SPREAD_HEIGHT, M = 56;
  const w = W * 0.42, h = H * 0.3;
  switch (spread.textAnchor) {
    case 'top_left':     return { x: M, y: M, w, h };
    case 'top_right':    return { x: W - w - M, y: M, w, h };
    case 'bottom_right': return { x: W - w - M, y: H - h - M, w, h };
    case 'center':       return { x: (W - w) / 2, y: (H - h) / 2, w, h };
    case 'bottom_left':
    default:             return { x: M, y: H - h - M, w, h };
  }
}

/** Figurengroesse relativ zur Bildhoehe — der Bildausschnitt bestimmt sie. */
const FIGURE_SCALE: Record<string, number> = {
  extreme_wide: 0.10, wide: 0.20, medium: 0.38, close: 0.62, extreme_close: 0.92,
};

const TIME_SHIFT: Record<string, { hue: number; light: number; sat: number }> = {
  morning:   { hue: -8,  light: 6,   sat: -4 },
  midday:    { hue: 0,   light: 10,  sat: 0 },
  afternoon: { hue: 12,  light: 2,   sat: 4 },
  evening:   { hue: 28,  light: -6,  sat: 8 },
  night:     { hue: 200, light: -38, sat: -12 },
};

const hsl = (h: number, s: number, l: number): string =>
  `hsl(${((h % 360) + 360) % 360} ${clamp(s, 0, 100)}% ${clamp(l, 0, 100)}%)`;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

const esc = (s: string): string => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Greedy-Umbruch — SVG kann nicht selbst umbrechen. */
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur.length === 0) { cur = w; continue; }
    if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = (kept[maxLines - 1] ?? '').replace(/\s*\S*$/, '') + ' …';
    return kept;
  }
  return lines;
}

export interface PlaceholderOptions {
  /** Warnhinweis einblenden, dass es kein echtes Bild ist. Default: true. */
  showWatermark?: boolean;
  /** Seitenzahlen einblenden. Default: true. */
  showPageNumbers?: boolean;
}

/**
 * Rendert eine Doppelseite als SVG. Gleicher Spread + gleicher Plan =
 * byte-identisches Ergebnis.
 */
export function renderSpreadPlaceholder(
  spread: Spread, plan: PictureBookPlan, opts: PlaceholderOptions = {},
): string {
  const showWatermark = opts.showWatermark ?? true;
  const showPageNumbers = opts.showPageNumbers ?? true;

  const r = rng(spread.seed);
  const reg = regionsFor(spread);
  const shift = TIME_SHIFT[spread.imageBrief.timeOfDay] ?? TIME_SHIFT['midday']!;
  const baseHue = plan.style.paletteHue + shift.hue;
  const night = spread.imageBrief.timeOfDay === 'night';

  // Himmel und Boden bleiben in derselben Farbfamilie wie die Palette, der Boden
  // nur waermer und dunkler. Ein Versatz von +110 Grad macht aus einer gruenen
  // Palette einen blauen Boden — das sah nach Matsch aus, nicht nach Bilderbuch.
  const skyTop = hsl(baseHue, 40 + shift.sat, 88 + shift.light);
  const skyBottom = hsl(baseHue + 14, 44 + shift.sat, 76 + shift.light);
  const groundA = hsl(baseHue - 20, 42 + shift.sat, 58 + shift.light);
  const groundB = hsl(baseHue - 32, 46 + shift.sat, 44 + shift.light);
  const ink = night ? '#e8edf5' : '#20242c';

  const p: string[] = [];
  const horizon = reg.image.y + reg.image.h * (0.58 + r() * 0.12);

  // IDs muessen je Doppelseite eindeutig sein. Werden mehrere SVGs in dasselbe
  // Dokument eingebettet, loest url(#sky) sonst immer auf die erste Definition
  // auf — und alle Seiten bekommen die Verlaeufe der ersten.
  const uid = `s${spread.seed.toString(36)}`;

  p.push(`<defs>
    <linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyTop}"/><stop offset="100%" stop-color="${skyBottom}"/>
    </linearGradient>
    <linearGradient id="ground-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${groundA}"/><stop offset="100%" stop-color="${groundB}"/>
    </linearGradient>
    <clipPath id="frame-${uid}"><rect x="${reg.image.x}" y="${reg.image.y}" width="${reg.image.w}" height="${reg.image.h}" rx="${spread.layout === 'full_bleed' ? 0 : 14}"/></clipPath>
  </defs>`);

  // Papier
  p.push(`<rect width="${SPREAD_WIDTH}" height="${SPREAD_HEIGHT}" fill="${night ? '#0e1218' : '#fbfaf7'}"/>`);

  // ── Bildbereich ──────────────────────────────────────────────────────────
  p.push(`<g clip-path="url(#frame-${uid})">`);
  p.push(`<rect x="${reg.image.x}" y="${reg.image.y}" width="${reg.image.w}" height="${reg.image.h}" fill="url(#sky-${uid})"/>`);

  // Himmelskoerper
  const sunX = reg.image.x + reg.image.w * (0.14 + r() * 0.7);
  const sunY = reg.image.y + reg.image.h * (0.12 + r() * 0.18);
  p.push(`<circle cx="${f(sunX)}" cy="${f(sunY)}" r="${f(26 + r() * 22)}" fill="${
    night ? hsl(55, 60, 86) : hsl(48, 82, 82)}" opacity="0.9"/>`);

  // Wolken / Sterne
  const puffs = night ? 14 : 3 + Math.floor(r() * 4);
  for (let i = 0; i < puffs; i++) {
    const cx = reg.image.x + r() * reg.image.w;
    const cy = reg.image.y + r() * (horizon - reg.image.y) * 0.8;
    if (night) {
      p.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(1.5 + r() * 2)}" fill="#fff" opacity="${f(0.4 + r() * 0.5)}"/>`);
    } else {
      const rr = 22 + r() * 34;
      p.push(`<g opacity="0.55" fill="#fff"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}"/>`
        + `<circle cx="${f(cx + rr * 0.8)}" cy="${f(cy + rr * 0.15)}" r="${f(rr * 0.75)}"/>`
        + `<circle cx="${f(cx - rr * 0.75)}" cy="${f(cy + rr * 0.2)}" r="${f(rr * 0.65)}"/></g>`);
    }
  }

  // Huegel hinter dem Horizont
  for (let i = 0; i < 3; i++) {
    const cx = reg.image.x + reg.image.w * (r() * 1.1 - 0.05);
    const rw = reg.image.w * (0.22 + r() * 0.3);
    const rh = reg.image.h * (0.1 + r() * 0.14);
    p.push(`<ellipse cx="${f(cx)}" cy="${f(horizon)}" rx="${f(rw)}" ry="${f(rh)}" fill="${
      hsl(baseHue - 6 - i * 7, 34 + shift.sat, 70 + shift.light - i * 7)}" opacity="0.88"/>`);
  }

  // Boden
  p.push(`<rect x="${reg.image.x}" y="${f(horizon)}" width="${reg.image.w}" height="${
    f(reg.image.y + reg.image.h - horizon)}" fill="url(#ground-${uid})"/>`);

  // Vordergrund-Formen
  const shapes = 2 + Math.floor(r() * 4);
  for (let i = 0; i < shapes; i++) {
    const cx = reg.image.x + r() * reg.image.w;
    const h = reg.image.h * (0.08 + r() * 0.18);
    const w = h * (0.5 + r() * 0.7);
    const y = horizon + r() * (reg.image.y + reg.image.h - horizon) * 0.55;
    p.push(`<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(w)}" ry="${f(h * 0.35)}" fill="${
      hsl(baseHue - 40, 40, 38 + shift.light)}" opacity="0.45"/>`);
  }

  // ── Figuren ──────────────────────────────────────────────────────────────
  const byslug = new Map(plan.characters.map((c) => [c.slug, c]));
  const present = spread.charactersPresent
    .map((s) => byslug.get(s)).filter((c): c is CharacterSheet => Boolean(c));

  const scale = FIGURE_SCALE[spread.imageBrief.cameraDistance] ?? 0.38;
  const figH = reg.image.h * scale;
  const slots = present.length;
  present.forEach((c, i) => {
    const t = slots === 1 ? 0.5 : 0.22 + (i / Math.max(1, slots - 1)) * 0.56;
    const cx = reg.image.x + reg.image.w * t;
    const baseY = horizon + reg.image.h * 0.12;
    p.push(figure(cx, baseY, figH * (c.scaleRelative ?? 1), c.paletteSeed, night));
  });

  p.push(`</g>`);

  // Rahmen bei nicht-randlosen Layouts
  if (spread.layout !== 'full_bleed') {
    p.push(`<rect x="${reg.image.x}" y="${reg.image.y}" width="${reg.image.w}" height="${
      reg.image.h}" rx="14" fill="none" stroke="${night ? '#2a3240' : '#e2ded6'}" stroke-width="2"/>`);
  }

  // Bundsteg
  p.push(`<line x1="${SPREAD_WIDTH / 2}" y1="0" x2="${SPREAD_WIDTH / 2}" y2="${SPREAD_HEIGHT}" stroke="${
    night ? '#ffffff14' : '#00000012'}" stroke-width="3"/>`);

  // ── Text ─────────────────────────────────────────────────────────────────
  const fontSize = reg.textOnImage ? 30 : 34;
  const lineH = fontSize * 1.42;
  const maxChars = Math.floor(reg.text.w / (fontSize * 0.5));
  const maxLines = Math.max(1, Math.floor(reg.text.h / lineH));
  const lines = wrapText(spread.text, maxChars, maxLines);
  const overflow = wrapText(spread.text, maxChars, 99).length > maxLines;

  if (reg.textOnImage) {
    const boxH = lines.length * lineH + 36;
    p.push(`<rect x="${f(reg.text.x - 20)}" y="${f(reg.text.y - 12)}" width="${
      f(reg.text.w + 40)}" height="${f(boxH)}" rx="16" fill="${
      night ? '#0b0f16cc' : '#ffffffcc'}"/>`);
  }
  const textColor = reg.textOnImage ? (night ? '#f2f5fa' : '#1b1f27') : ink;
  lines.forEach((ln, i) => {
    p.push(`<text x="${f(reg.text.x)}" y="${f(reg.text.y + 24 + i * lineH)}" font-family="Georgia, 'Iowan Old Style', serif" font-size="${fontSize}" fill="${textColor}">${esc(ln)}</text>`);
  });

  if (overflow) {
    p.push(`<rect x="${f(reg.text.x - 10)}" y="${f(reg.text.y - 14)}" width="${
      f(reg.text.w + 20)}" height="${f(Math.min(reg.text.h, maxLines * lineH + 26))}" rx="10" fill="none" stroke="#d1453b" stroke-width="2" stroke-dasharray="7 5"/>`);
    p.push(`<text x="${f(reg.text.x)}" y="${f(reg.text.y + maxLines * lineH + 40)}" font-family="system-ui, sans-serif" font-size="19" fill="#d1453b">Text passt nicht in den Satzspiegel</text>`);
  }

  // ── Hinweise ─────────────────────────────────────────────────────────────
  if (showPageNumbers) {
    p.push(`<text x="40" y="${SPREAD_HEIGHT - 26}" font-family="system-ui, sans-serif" font-size="18" fill="${night ? '#8d97a8' : '#9a958c'}">${spread.pages[0]}</text>`);
    p.push(`<text x="${SPREAD_WIDTH - 40}" y="${SPREAD_HEIGHT - 26}" text-anchor="end" font-family="system-ui, sans-serif" font-size="18" fill="${night ? '#8d97a8' : '#9a958c'}">${spread.pages[1]}</text>`);
  }
  if (showWatermark) {
    p.push(`<g opacity="0.92"><rect x="${SPREAD_WIDTH - 268}" y="18" width="250" height="30" rx="15" fill="#00000055"/>`
      + `<text x="${SPREAD_WIDTH - 143}" y="38" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" fill="#fff" letter-spacing="0.4">PLATZHALTER · kein KI-Bild</text></g>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPREAD_WIDTH} ${SPREAD_HEIGHT}" width="${SPREAD_WIDTH}" height="${SPREAD_HEIGHT}" role="img" aria-label="${esc(spread.beat)}">${p.join('')}</svg>`;
}

/** Stilisierte Figur in der Farbidentitaet ihres Character Sheets. */
function figure(cx: number, baseY: number, h: number, paletteSeed: number, night: boolean): string {
  const bodyH = h * 0.62;
  const headR = h * 0.19;
  const bodyW = h * 0.34;
  const top = baseY - h;
  const body = hsl(paletteSeed, 62, night ? 52 : 58);
  const head = hsl(paletteSeed + 12, 48, night ? 68 : 80);
  const accent = hsl(paletteSeed + 180, 55, night ? 58 : 62);
  return `<g>
    <ellipse cx="${f(cx)}" cy="${f(baseY + h * 0.04)}" rx="${f(bodyW * 0.8)}" ry="${f(h * 0.05)}" fill="#00000022"/>
    <rect x="${f(cx - bodyW / 2)}" y="${f(top + headR * 1.7)}" width="${f(bodyW)}" height="${f(bodyH)}" rx="${f(bodyW * 0.42)}" fill="${body}"/>
    <rect x="${f(cx - bodyW / 2)}" y="${f(top + headR * 1.7 + bodyH * 0.55)}" width="${f(bodyW)}" height="${f(bodyH * 0.16)}" fill="${accent}" opacity="0.85"/>
    <circle cx="${f(cx)}" cy="${f(top + headR)}" r="${f(headR)}" fill="${head}"/>
    <circle cx="${f(cx - headR * 0.33)}" cy="${f(top + headR * 0.95)}" r="${f(headR * 0.12)}" fill="#2a2320"/>
    <circle cx="${f(cx + headR * 0.33)}" cy="${f(top + headR * 0.95)}" r="${f(headR * 0.12)}" fill="#2a2320"/>
  </g>`;
}

const f = (n: number): string => (Math.round(n * 10) / 10).toString();

/** SVG als data-URI, direkt in <img src> verwendbar. */
export function spreadDataUri(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
