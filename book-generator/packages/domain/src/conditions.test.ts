import { describe, expect, it } from 'vitest';
import {
  checkConditions, emptyState, evaluateCondition, pairKey, parseCondition, tryParseCondition,
  type EvaluableState,
} from './conditions';

function state(): EvaluableState {
  const s = emptyState();
  s.location['june'] = 'archive_hall';
  s.location['tomas'] = 'cliff_path';
  s.possession['archive_key'] = 'tomas';
  s.alive['father'] = false;
  s.alive['june'] = true;
  s.injured['june'] = false;
  s.present['coat_room'] = ['june'];
  s.knows['june'] = { second_letter_exists: false, letter_author_identity: false };
  s.knows['tomas'] = { letter_author_identity: true };
  s.relationship[pairKey('june', 'tomas')] = { trust: 55, closeness: 30 };
  s.addressMode['june->tomas'] = 'formal';
  s.state['archive_key'] = 'lost';
  s.flags['storm_active'] = true;
  s.usage['teleport:june'] = 2;
  return s;
}

describe('parseCondition', () => {
  it('parst einfache Gleichheit', () => {
    const c = parseCondition('location(june) = archive_hall');
    expect(c.predicate).toBe('location');
    expect(c.args).toEqual(['june']);
    expect(c.op).toBe('=');
    expect(c.value).toBe('archive_hall');
  });

  it('parst zwei Argumente', () => {
    const c = parseCondition('knows(june, second_letter_exists) = false');
    expect(c.args).toEqual(['june', 'second_letter_exists']);
    expect(c.value).toBe(false);
  });

  it('parst Zahlenvergleiche', () => {
    const c = parseCondition('trust(june, tomas) <= 20');
    expect(c.op).toBe('<=');
    expect(c.value).toBe(20);
  });

  it('parst Anführungszeichen weg', () => {
    expect(parseCondition('state(archive_key) = "lost"').value).toBe('lost');
  });

  it('lehnt unbekannte Prädikate ab', () => {
    expect(() => parseCondition('teleportiert(june) = true')).toThrow(/unbekanntes Prädikat/);
  });

  it('lehnt Unsinn ab', () => {
    expect(() => parseCondition('drop table books')).toThrow();
    expect(() => parseCondition('')).toThrow();
  });

  it('führt niemals Code aus — Injection bleibt ein Parse-Fehler', () => {
    expect(() => parseCondition('location(june); process.exit(1) = x')).toThrow();
    expect(tryParseCondition('__proto__(x) = y')).toBeNull();
  });

  it('lehnt zu viele Argumente ab', () => {
    expect(() => parseCondition('knows(a, b, c, d) = true')).toThrow(/höchstens drei/);
  });
});

describe('evaluateCondition', () => {
  const s = state();
  const ev = (expr: string) => evaluateCondition(parseCondition(expr), s);

  it('erkennt erfüllte Bedingungen', () => {
    expect(ev('location(june) = archive_hall').outcome).toBe('satisfied');
    expect(ev('possession(archive_key) = tomas').outcome).toBe('satisfied');
    expect(ev('alive(father) = false').outcome).toBe('satisfied');
  });

  it('erkennt verletzte Bedingungen', () => {
    const r = ev('location(june) = coat_room');
    expect(r.outcome).toBe('violated');
    expect(r.actual).toBe('archive_hall');
    expect(r.message).toContain('archive_hall');
  });

  it('meldet unbekannte Zustände als unknown, nicht als verletzt', () => {
    expect(ev('location(unbekannt) = irgendwo').outcome).toBe('unknown');
  });

  it('wertet Beziehungswerte richtungsunabhängig aus', () => {
    expect(ev('trust(june, tomas) >= 50').outcome).toBe('satisfied');
    expect(ev('trust(tomas, june) >= 50').outcome).toBe('satisfied');
    expect(ev('trust(june, tomas) <= 20').outcome).toBe('violated');
  });

  it('wertet Wissen figurenspezifisch aus', () => {
    expect(ev('knows(june, letter_author_identity) = false').outcome).toBe('satisfied');
    expect(ev('knows(tomas, letter_author_identity) = true').outcome).toBe('satisfied');
  });

  it('wertet Anwesenheit aus', () => {
    expect(ev('present(coat_room, june) = true').outcome).toBe('satisfied');
    expect(ev('present(coat_room, tomas) = true').outcome).toBe('violated');
  });

  it('wertet die Anredeform aus', () => {
    expect(ev('address_mode(june, tomas) = formal').outcome).toBe('satisfied');
  });

  it('wertet Nutzungszähler aus (Magie mit Limit)', () => {
    expect(ev('usage(teleport, june) <= 3').outcome).toBe('satisfied');
    expect(ev('usage(teleport, june) <= 1').outcome).toBe('violated');
  });

  it('unterstützt in / notin', () => {
    expect(ev('location(june) in archive_hall|coat_room').outcome).toBe('satisfied');
    expect(ev('location(june) notin cliff_path|harbor').outcome).toBe('satisfied');
  });

  it('behandelt Booleans robust', () => {
    expect(ev('flag(storm_active) = true').outcome).toBe('satisfied');
    expect(ev('flag(storm_active) != false').outcome).toBe('satisfied');
  });
});

describe('checkConditions', () => {
  it('teilt Ergebnisse in erfüllt / verletzt / unbekannt', () => {
    const r = checkConditions([
      'location(june) = archive_hall',
      'possession(archive_key) = june',
      'location(niemand) = nirgends',
    ], state());
    expect(r.satisfied).toHaveLength(1);
    expect(r.violated).toHaveLength(1);
    expect(r.unknown).toHaveLength(1);
    expect(r.parseErrors).toHaveLength(0);
  });

  it('sammelt Parse-Fehler getrennt — das sind Planungsfehler, keine Textfehler', () => {
    const r = checkConditions(['location(june) = archive_hall', 'kaputt!!'], state());
    expect(r.parseErrors).toHaveLength(1);
    expect(r.satisfied).toHaveLength(1);
  });

  it('ist bei leerer Liste leer', () => {
    const r = checkConditions([], state());
    expect(r.satisfied.length + r.violated.length + r.unknown.length).toBe(0);
  });
});

describe('Szenen-Postconditions — der ConWriter-Kern', () => {
  it('erkennt eine nicht erfüllte requiredChange', () => {
    // Szene sollte den Brief in Junes Besitz bringen; der State sagt: nicht passiert.
    const before = state();
    const r = checkConditions(['possession(second_letter) = june'], before);
    expect(r.violated.length + r.unknown.length).toBe(1);
  });

  it('erkennt eine eingetretene forbiddenChange', () => {
    const after = state();
    after.knows['june'] = { letter_author_identity: true };
    const r = checkConditions(['knows(june, letter_author_identity) = true'], after);
    // Die Bedingung ist erfüllt — und genau das ist hier der Fehler.
    expect(r.satisfied).toHaveLength(1);
  });
});
