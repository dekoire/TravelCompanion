import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { sha256Hex, utf8Bytes } from './hash';

describe('sha256Hex — offizielle Testvektoren', () => {
  it('leerer String', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('"abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('448-Bit-Nachricht', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });

  it('896-Bit-Nachricht (mehrere Bloecke)', () => {
    expect(sha256Hex(
      'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu'))
      .toBe('cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1');
  });

  it('eine Million "a"', () => {
    expect(sha256Hex('a'.repeat(1_000_000))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  });
});

describe('sha256Hex — Deckungsgleichheit mit node:crypto', () => {
  const cases = [
    '', 'a', 'Hallo Welt',
    'Grüße aus Ardmoor — mit Umlauten, „Anführungszeichen" und einem Em-Dash',
    '🦊 Emoji als Surrogatpaar',
    'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(57),  // Block-Grenzfaelle
    'x'.repeat(63), 'x'.repeat(64), 'x'.repeat(65),
    JSON.stringify({ a: 1, b: [1, 2, 3], c: 'ü' }),
  ];

  for (const c of cases) {
    it(`stimmt überein: ${JSON.stringify(c.slice(0, 40))}${c.length > 40 ? '…' : ''}`, () => {
      const expected = createHash('sha256').update(c, 'utf8').digest('hex');
      expect(sha256Hex(c)).toBe(expected);
    });
  }
});

describe('utf8Bytes', () => {
  it('kodiert ASCII', () => {
    expect([...utf8Bytes('abc')]).toEqual([97, 98, 99]);
  });

  it('kodiert Umlaute als zwei Bytes', () => {
    expect([...utf8Bytes('ü')]).toEqual([0xc3, 0xbc]);
  });

  it('kodiert Emoji als Surrogatpaar in vier Bytes', () => {
    expect([...utf8Bytes('🦊')]).toEqual([0xf0, 0x9f, 0xa6, 0x8a]);
  });

  it('stimmt mit Buffer überein', () => {
    for (const s of ['abc', 'äöü', '🦊 Fuchs', 'a🦊b']) {
      expect([...utf8Bytes(s)]).toEqual([...Buffer.from(s, 'utf8')]);
    }
  });
});
