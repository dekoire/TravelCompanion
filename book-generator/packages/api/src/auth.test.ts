import { describe, expect, it } from 'vitest';
import { authenticate, parseKeys, timingSafeEqual } from './auth';
import { ApiError } from './errors';

const request = (auth?: string): Request =>
  new Request('https://x/v1/books', { headers: auth ? { authorization: auth } : {} });

describe('authenticate', () => {
  const config = { keys: { abc: 'kunde_a', def: 'kunde_b' } };

  it('erkennt einen gültigen Schlüssel', () => {
    expect(authenticate(request('Bearer abc'), config)).toBe('kunde_a');
  });

  it('akzeptiert die Schreibweise unabhängig von Groß-/Kleinschreibung', () => {
    expect(authenticate(request('bearer abc'), config)).toBe('kunde_a');
  });

  it('lehnt einen fehlenden Schlüssel ab', () => {
    expect(() => authenticate(request(), config)).toThrow(ApiError);
  });

  it('lehnt einen falschen Schlüssel ab', () => {
    expect(() => authenticate(request('Bearer xyz'), config)).toThrow(/Ungültiger/);
  });

  it('lehnt ein anderes Schema ab', () => {
    expect(() => authenticate(request('Basic abc'), config)).toThrow(ApiError);
  });

  it('erlaubt anonym nur mit ausdrücklicher Konfiguration', () => {
    expect(authenticate(request(), { keys: {}, allowAnonymousAs: 'lokal' })).toBe('lokal');
  });
});

describe('timingSafeEqual', () => {
  it('vergleicht korrekt', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
  });
});

describe('parseKeys', () => {
  it('liest Schlüssel aus einer Umgebungsvariable', () => {
    expect(parseKeys('k1:kunde_a,k2:kunde_b')).toEqual({ k1: 'kunde_a', k2: 'kunde_b' });
  });

  it('toleriert Leerzeichen', () => {
    expect(parseKeys(' k1 : kunde_a ')).toEqual({ k1: 'kunde_a' });
  });

  it('ignoriert unvollständige Einträge', () => {
    expect(parseKeys('k1:kunde_a,kaputt')).toEqual({ k1: 'kunde_a' });
  });

  it('kommt mit leer und undefined zurecht', () => {
    expect(parseKeys(undefined)).toEqual({});
    expect(parseKeys('')).toEqual({});
  });
});
