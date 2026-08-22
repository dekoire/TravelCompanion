/**
 * Ausdrucksgrammatik fuer Pre-/Postconditions (04 §9.1).
 * Eigener Parser mit geschlossener Grammatik — niemals eval() (13 §8).
 */

export const PREDICATES = [
  'location', 'possession', 'owner', 'knows', 'believes', 'alive', 'injured',
  'present', 'trust', 'closeness', 'address_mode', 'state', 'flag', 'usage',
] as const;
export type Predicate = (typeof PREDICATES)[number];

export const OPERATORS = ['=', '!=', '>=', '<=', '>', '<', 'in', 'notin'] as const;
export type Operator = (typeof OPERATORS)[number];

export interface Condition {
  predicate: Predicate;
  args: string[];
  op: Operator;
  value: string | number | boolean;
  raw: string;
}

export class ConditionParseError extends Error {
  constructor(readonly expr: string, message: string) {
    super(`Ungültiger Ausdruck "${expr}": ${message}`);
    this.name = 'ConditionParseError';
  }
}

const EXPR = /^([a-z_]+)\(([^)]*)\)\s*(!=|>=|<=|=|>|<|\bnotin\b|\bin\b)\s*(.+)$/;

export function parseCondition(expr: string): Condition {
  const trimmed = expr.trim();
  const m = EXPR.exec(trimmed);
  if (!m) throw new ConditionParseError(trimmed, 'erwartet: prädikat(args) op wert');

  const [, predRaw, argsRaw, opRaw, valueRaw] = m;
  const predicate = predRaw as Predicate;
  if (!(PREDICATES as readonly string[]).includes(predicate)) {
    throw new ConditionParseError(trimmed, `unbekanntes Prädikat "${predRaw}"`);
  }
  const op = opRaw as Operator;
  const args = (argsRaw ?? '').split(',').map((a) => a.trim()).filter((a) => a.length > 0);
  if (args.length === 0) throw new ConditionParseError(trimmed, 'mindestens ein Argument nötig');
  if (args.length > 3) throw new ConditionParseError(trimmed, 'höchstens drei Argumente erlaubt');

  return { predicate, args, op, value: parseValue(valueRaw ?? ''), raw: trimmed };
}

export function tryParseCondition(expr: string): Condition | null {
  try { return parseCondition(expr); } catch { return null; }
}

function parseValue(raw: string): string | number | boolean {
  const v = raw.trim().replace(/^["']|["']$/g, '');
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

// ─── Auswertung ──────────────────────────────────────────────────────────────

/** Minimale Sicht auf den Story-State, die zur Auswertung reicht (07 §9). */
export interface EvaluableState {
  location: Record<string, string | undefined>;
  possession: Record<string, string | undefined>;
  alive: Record<string, boolean | undefined>;
  injured: Record<string, boolean | undefined>;
  present: Record<string, readonly string[] | undefined>;
  knows: Record<string, Record<string, boolean | undefined> | undefined>;
  believes: Record<string, Record<string, string | undefined> | undefined>;
  relationship: Record<string, Record<string, number | undefined> | undefined>;
  addressMode: Record<string, string | undefined>;
  state: Record<string, string | undefined>;
  flags: Record<string, boolean | undefined>;
  usage: Record<string, number | undefined>;
}

export function emptyState(): EvaluableState {
  return {
    location: {}, possession: {}, alive: {}, injured: {}, present: {},
    knows: {}, believes: {}, relationship: {}, addressMode: {}, state: {},
    flags: {}, usage: {},
  };
}

export type EvalOutcome = 'satisfied' | 'violated' | 'unknown';

export interface EvalResult {
  condition: Condition;
  outcome: EvalOutcome;
  actual: string | number | boolean | undefined;
  message: string;
}

/** Kanonischer Schlüssel für ein Figurenpaar — Reihenfolge egal. */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('__');
}

export function evaluateCondition(cond: Condition, state: EvaluableState): EvalResult {
  const actual = resolve(cond, state);
  if (actual === undefined) {
    return { condition: cond, outcome: 'unknown', actual: undefined,
      message: `Zustand für ${cond.raw} ist unbekannt.` };
  }
  const ok = compare(actual, cond.op, cond.value);
  return {
    condition: cond,
    outcome: ok ? 'satisfied' : 'violated',
    actual,
    message: ok
      ? `${cond.raw} erfüllt.`
      : `${cond.raw} verletzt — tatsächlich: ${String(actual)}.`,
  };
}

function resolve(cond: Condition, s: EvaluableState): string | number | boolean | undefined {
  const [a, b] = cond.args as [string, string | undefined];
  switch (cond.predicate) {
    case 'location':     return s.location[a];
    case 'possession':
    case 'owner':        return s.possession[a];
    case 'alive':        return s.alive[a];
    case 'injured':      return s.injured[a];
    case 'present':      return b ? (s.present[a] ?? []).includes(b) : undefined;
    case 'knows':        return b ? s.knows[a]?.[b] : undefined;
    case 'believes':     return b ? s.believes[a]?.[b] : undefined;
    case 'trust':        return b ? s.relationship[pairKey(a, b)]?.['trust'] : undefined;
    case 'closeness':    return b ? s.relationship[pairKey(a, b)]?.['closeness'] : undefined;
    case 'address_mode': return b ? s.addressMode[`${a}->${b}`] : undefined;
    case 'state':        return s.state[a];
    case 'flag':         return s.flags[a];
    case 'usage':        return s.usage[b ? `${a}:${b}` : a];
    default:             return undefined;
  }
}

function compare(actual: string | number | boolean, op: Operator,
                 expected: string | number | boolean): boolean {
  switch (op) {
    case '=':  return looseEq(actual, expected);
    case '!=': return !looseEq(actual, expected);
    case '>=': return num(actual) >= num(expected);
    case '<=': return num(actual) <= num(expected);
    case '>':  return num(actual) > num(expected);
    case '<':  return num(actual) < num(expected);
    case 'in': return String(expected).split('|').map((x) => x.trim()).includes(String(actual));
    case 'notin':
      return !String(expected).split('|').map((x) => x.trim()).includes(String(actual));
    default: return false;
  }
}

function looseEq(a: string | number | boolean, b: string | number | boolean): boolean {
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a) === toBool(b);
  return String(a) === String(b);
}
function toBool(v: string | number | boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return v === 'true' || v === 'yes' || v === '1';
}
function num(v: string | number | boolean): number {
  return typeof v === 'number' ? v : Number(v);
}

export interface ConditionCheckResult {
  satisfied: EvalResult[];
  violated: EvalResult[];
  unknown: EvalResult[];
  parseErrors: Array<{ expr: string; message: string }>;
}

/** Prueft eine Liste von Ausdruecken gegen den State. Parse-Fehler sind Planungsfehler. */
export function checkConditions(
  exprs: readonly string[], state: EvaluableState,
): ConditionCheckResult {
  const out: ConditionCheckResult = { satisfied: [], violated: [], unknown: [], parseErrors: [] };
  for (const e of exprs) {
    let cond: Condition;
    try {
      cond = parseCondition(e);
    } catch (err) {
      out.parseErrors.push({ expr: e, message: (err as Error).message });
      continue;
    }
    const r = evaluateCondition(cond, state);
    if (r.outcome === 'satisfied') out.satisfied.push(r);
    else if (r.outcome === 'violated') out.violated.push(r);
    else out.unknown.push(r);
  }
  return out;
}
