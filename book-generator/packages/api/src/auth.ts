import { ApiError } from './errors';

/**
 * Authentifizierung ueber einen API-Schluessel im Authorization-Header.
 *
 * Bewusst schlicht: ein Schluessel gehoert zu einem Mandanten, der Mandant
 * trennt die Daten. Wer Abrechnung, Kontingente oder OAuth braucht, setzt das
 * davor — dieser Service kennt so etwas nicht.
 */
export interface AuthConfig {
  /** Schluessel -> Mandant. */
  keys: Record<string, string>;
  /** Ohne Schluessel arbeiten, alles gehoert dem genannten Mandanten. Nur lokal. */
  allowAnonymousAs?: string;
}

export function authenticate(request: Request, config: AuthConfig): string {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const key = match?.[1]?.trim();

  if (!key) {
    if (config.allowAnonymousAs) return config.allowAnonymousAs;
    throw new ApiError(401, 'unauthorized',
      'API-Schlüssel fehlt. Erwartet: Authorization: Bearer <key>');
  }

  const owner = lookup(config.keys, key);
  if (!owner) throw new ApiError(401, 'unauthorized', 'Ungültiger API-Schlüssel');
  return owner;
}

/** Vergleicht in konstanter Zeit, damit der Schluessel nicht erratbar wird. */
function lookup(keys: Record<string, string>, provided: string): string | null {
  let found: string | null = null;
  for (const [key, owner] of Object.entries(keys)) {
    if (timingSafeEqual(key, provided)) found = owner;
  }
  return found;
}

export function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Liest Schluessel aus einer Umgebungsvariable: "key1:mandant1,key2:mandant2". */
export function parseKeys(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  const out: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const [key, owner] = pair.split(':').map((s) => s.trim());
    if (key && owner) out[key] = owner;
  }
  return out;
}
