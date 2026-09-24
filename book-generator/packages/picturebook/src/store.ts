import type { PictureBookPlan } from '@abg/schemas';
import type { ReadingLevel } from '@abg/domain';
import type { CreateBookInput, PageCount } from './pipeline';
import type { ParsedPrompt } from './prompt';

/**
 * Ablage der erzeugten Buecher.
 *
 * Bewusst eine Schnittstelle mit einer In-Memory-Umsetzung: Wer den Service
 * betreibt, haengt seine eigene Datenbank dahinter. Der Service selbst kennt
 * keine Datenbank.
 */

export interface StoredBook {
  id: string;
  /** Mandant/Schluessel, dem das Buch gehoert. */
  owner: string;
  createdAt: string;
  updatedAt: string;
  input: CreateBookInput;
  understood: ParsedPrompt;
  plan: PictureBookPlan;
  pageCount: PageCount;
  readingLevel: ReadingLevel;
  generator: { name: string; synthetic: boolean };
}

export interface ListOptions {
  owner: string;
  limit?: number;
  cursor?: string;
}

export interface ListResult {
  books: StoredBook[];
  nextCursor: string | null;
}

export interface BookStore {
  create(book: StoredBook): Promise<StoredBook>;
  get(owner: string, id: string): Promise<StoredBook | undefined>;
  put(book: StoredBook): Promise<StoredBook>;
  remove(owner: string, id: string): Promise<boolean>;
  list(opts: ListOptions): Promise<ListResult>;
}

export class MemoryBookStore implements BookStore {
  private readonly byId = new Map<string, StoredBook>();
  constructor(private readonly maxBooks = 5_000) {}

  async create(book: StoredBook): Promise<StoredBook> {
    if (this.byId.size >= this.maxBooks) {
      // Aeltestes Buch weichen lassen — ohne das waechst der Prozess unbegrenzt.
      const oldest = [...this.byId.values()]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (oldest) this.byId.delete(key(oldest.owner, oldest.id));
    }
    this.byId.set(key(book.owner, book.id), book);
    return book;
  }

  async get(owner: string, id: string): Promise<StoredBook | undefined> {
    return this.byId.get(key(owner, id));
  }

  async put(book: StoredBook): Promise<StoredBook> {
    this.byId.set(key(book.owner, book.id), book);
    return book;
  }

  async remove(owner: string, id: string): Promise<boolean> {
    return this.byId.delete(key(owner, id));
  }

  async list(opts: ListOptions): Promise<ListResult> {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const all = [...this.byId.values()]
      .filter((b) => b.owner === opts.owner)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const start = opts.cursor ? all.findIndex((b) => b.id === opts.cursor) + 1 : 0;
    const page = all.slice(start, start + limit);
    const next = start + limit < all.length ? (page.at(-1)?.id ?? null) : null;
    return { books: page, nextCursor: next };
  }

  get size(): number { return this.byId.size; }
}

const key = (owner: string, id: string): string => `${owner}\u0000${id}`;

/** Sortierbare, kurze ID ohne externe Abhaengigkeit. */
export function makeBookId(now: () => number = Date.now, rnd: () => number = Math.random): string {
  const t = now().toString(36).padStart(8, '0');
  const r = Math.floor(rnd() * 0xfffffff).toString(36).padStart(6, '0');
  return `pb_${t}${r}`;
}
