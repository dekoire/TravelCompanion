import { describe, expect, it } from 'vitest';
import { MemoryBookStore, makeBookId, type StoredBook } from './store';

function book(id: string, owner = 'a', createdAt = '2026-01-01T00:00:00.000Z'): StoredBook {
  return {
    id, owner, createdAt, updatedAt: createdAt,
    input: { prompt: 'x' },
    understood: {} as StoredBook['understood'],
    plan: { title: `Buch ${id}`, spreads: [] } as unknown as StoredBook['plan'],
    pageCount: 32, readingLevel: 'pre_reader',
    generator: { name: 'demo', synthetic: true },
  };
}

describe('MemoryBookStore', () => {
  it('speichert und liest', async () => {
    const s = new MemoryBookStore();
    await s.create(book('1'));
    expect((await s.get('a', '1'))?.id).toBe('1');
  });

  it('trennt Mandanten', async () => {
    const s = new MemoryBookStore();
    await s.create(book('1', 'a'));
    expect(await s.get('b', '1')).toBeUndefined();
  });

  it('listet nur die eigenen Bücher, neueste zuerst', async () => {
    const s = new MemoryBookStore();
    await s.create(book('1', 'a', '2026-01-01T00:00:00.000Z'));
    await s.create(book('2', 'a', '2026-01-02T00:00:00.000Z'));
    await s.create(book('3', 'b', '2026-01-03T00:00:00.000Z'));
    const r = await s.list({ owner: 'a' });
    expect(r.books.map((b) => b.id)).toEqual(['2', '1']);
  });

  it('blättert mit Cursor', async () => {
    const s = new MemoryBookStore();
    for (let i = 1; i <= 5; i++) {
      await s.create(book(String(i), 'a', `2026-01-0${i}T00:00:00.000Z`));
    }
    const first = await s.list({ owner: 'a', limit: 2 });
    expect(first.books.map((b) => b.id)).toEqual(['5', '4']);
    expect(first.nextCursor).toBe('4');
    const second = await s.list({ owner: 'a', limit: 2, cursor: first.nextCursor! });
    expect(second.books.map((b) => b.id)).toEqual(['3', '2']);
  });

  it('setzt am Ende keinen Cursor mehr', async () => {
    const s = new MemoryBookStore();
    await s.create(book('1'));
    expect((await s.list({ owner: 'a', limit: 10 })).nextCursor).toBeNull();
  });

  it('begrenzt die Seitengröße', async () => {
    const s = new MemoryBookStore();
    for (let i = 0; i < 5; i++) await s.create(book(String(i)));
    expect((await s.list({ owner: 'a', limit: 1000 })).books.length).toBeLessThanOrEqual(100);
  });

  it('löscht', async () => {
    const s = new MemoryBookStore();
    await s.create(book('1'));
    expect(await s.remove('a', '1')).toBe(true);
    expect(await s.remove('a', '1')).toBe(false);
  });

  it('wirft das älteste Buch raus, statt unbegrenzt zu wachsen', async () => {
    const s = new MemoryBookStore(3);
    for (let i = 1; i <= 5; i++) {
      await s.create(book(String(i), 'a', `2026-01-0${i}T00:00:00.000Z`));
    }
    expect(s.size).toBeLessThanOrEqual(3);
    expect(await s.get('a', '1')).toBeUndefined();
    expect(await s.get('a', '5')).toBeDefined();
  });
});

describe('makeBookId', () => {
  it('erzeugt sortierbare, eindeutige IDs', () => {
    const a = makeBookId(() => 1_700_000_000_000, () => 0.1);
    const b = makeBookId(() => 1_700_000_001_000, () => 0.1);
    expect(a).toMatch(/^pb_[0-9a-z]+$/);
    expect(a < b).toBe(true);
  });

  it('unterscheidet IDs derselben Millisekunde', () => {
    const a = makeBookId(() => 1, () => 0.1);
    const b = makeBookId(() => 1, () => 0.9);
    expect(a).not.toBe(b);
  });
});
