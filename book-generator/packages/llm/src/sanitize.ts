/**
 * Neutralisierung von Nutzertext (13 §3).
 *
 * Die Buchidee des Nutzers geht in JEDEN Planungs- und Kapitel-Prompt.
 * Ohne Neutralisierung darf ein Nutzer 30-mal versuchen, das System umzulenken.
 *
 * Alle Zeichenklassen bewusst als Unicode-Escapes — sonst sind sie im Diff
 * unsichtbar und im Review nicht pruefbar.
 */

const CTRL = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');
const INVISIBLE = new RegExp('[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u206F\\uFEFF]', 'g');
const PRIVATE_USE = new RegExp('[\\uE000-\\uF8FF]', 'g');
const TAG_SPOOF = /<\/?(?:system|assistant|user|instruction|prompt|task|developer)\b[^>]*>/gi;
const OUR_MARKERS = /<<<[^>]{0,40}>>>/g;
const CHAT_MARKERS = /^[ \t]*(?:###|\[INST\]|\[\/INST\]|<\|[^|]{0,20}\|>)/gm;

export interface SanitizeOptions {
  maxLength?: number;
}

export function sanitizeUserText(raw: string, opts: SanitizeOptions = {}): string {
  const maxLength = opts.maxLength ?? 4000;
  let t = raw
    .normalize('NFC')
    .replace(CTRL, '')
    .replace(INVISIBLE, '')
    .replace(PRIVATE_USE, '')
    .replace(TAG_SPOOF, '')
    .replace(OUR_MARKERS, '')
    .replace(CHAT_MARKERS, '')
    .replace(/```/g, "'''");

  t = t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return t.length > maxLength ? t.slice(0, maxLength).trimEnd() + ' [...]' : t;
}

/**
 * Injection-Signale (13 §3.1). SIGNAL, kein Blocker — ein Roman *ueber* KI
 * darf solche Saetze enthalten. Ab 3 Treffern in 24 h greift die Missbrauchslogik.
 */
export const INJECTION_SIGNALS: ReadonlyArray<{ code: string; re: RegExp }> = [
  { code: 'ignore_previous', re: /ignor(?:e|iere)\s+(?:all|alle|previous|vorherige|deine)/i },
  { code: 'system_prompt', re: /(?:system|developer)\s*-?\s*prompt/i },
  { code: 'reveal_instructions', re: /(?:gib|zeig|reveal|output|print)\b.{0,25}(?:anweisung|instruction|prompt)/i },
  { code: 'role_override', re: /\bdu bist (?:jetzt|ab sofort)\b/i },
  { code: 'role_override', re: /\byou are now\b/i },
  { code: 'jailbreak', re: /\bDAN\b|jailbreak|entwicklermodus|developer\s+mode/i },
  { code: 'tag_spoof', re: /<\/?(?:system|assistant)\b/i },
];

export interface InjectionScan {
  hits: Array<{ code: string; match: string; index: number }>;
  suspicious: boolean;
}

export function scanForInjection(text: string): InjectionScan {
  const hits: InjectionScan['hits'] = [];
  for (const { code, re } of INJECTION_SIGNALS) {
    const m = re.exec(text);
    if (m) hits.push({ code, match: m[0], index: m.index });
  }
  return { hits, suspicious: hits.length > 0 };
}

/**
 * Kapselt Nutzerdaten in Delimiter mit Zufalls-ID, damit der Inhalt
 * den Rahmen weder erraten noch schliessen kann.
 */
export function wrapUserData(
  tag: string,
  content: string,
  randomId: () => string,
): { block: string; id: string } {
  const id = randomId();
  const safeTag = tag.replace(/[^a-z0-9_]/gi, '_').replace(/_+/g, '_')
    .replace(/^_|_$/g, '').toLowerCase() || 'user_data';
  const sanitized = sanitizeUserText(content)
    .replace(new RegExp(`</?${safeTag}[^>]*>`, 'gi'), '');
  return {
    id,
    block: `<${safeTag} id="${id}">\n${sanitized}\n</${safeTag}>`,
  };
}

/** Standard-Zufallsgenerator; in Tests durch eine deterministische Variante ersetzbar. */
export function defaultRandomId(): string {
  return Math.floor(Math.random() * 0xfffff).toString(16).padStart(5, '0');
}
