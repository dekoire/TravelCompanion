# 07 — Dynamisches Gedächtnis: State, Fakten, Events, Zeit

## 1. Grundarchitektur

```
  Kapiteltext (unveränderlich, versioniert)
        │  Extraktion + Grounding  [10]
        ▼
  events  (append-only)  ──────────┐
  entity_facts (append-only,       │  deterministischer Fold
     bitemporal)                   │
  knowledge_deltas ────────────────┤
  relationship_deltas ─────────────┤
        │                          ▼
        └────────────────►  state_snapshots (materialisiert je Szenenindex)
                                   │
                                   ▼
                            Context Builder [09]
```

**Regel:** `events` und `entity_facts` sind **die** Wahrheit. `state_snapshots` sind ein Cache
und jederzeit aus den Ledgern neu berechenbar. Ein Bug im Fold darf niemals Daten zerstören.

## 2. Szenen-Index als universelle Zeitachse

Jede Szene erhält einen global monoton steigenden `scene_index` (1..n über das ganze Buch).
Alle Gültigkeiten werden über diesen Index ausgedrückt — **nicht** über Kapitelnummern
(die sich bei Einfügungen verschieben) und **nicht** über Story-Zeit (die bei Rückblenden
nicht-monoton ist).

```
scene_index  : erzählte Reihenfolge (Diskurs)   → für Gültigkeit von Fakten
story_time   : Fabel-Zeit (kann springen)       → für Timeline-Checks
```

Rückblenden: `scene.is_flashback = true`, `story_time` in der Vergangenheit, aber
`scene_index` normal fortlaufend. Fakten aus Rückblenden werden mit
`applies_to_story_time` markiert und ändern **nicht** den Gegenwartszustand — außer über
das Wissens-Ledger (jemand *erfährt* jetzt etwas über früher).

## 3. Atomare Fakten

```jsonc
{
  "factId": "f_00412",
  "bookVersionId": "bv_1",
  "subject": "archive_key",          // entity_id
  "predicate": "owner",
  "value": "tomas",                  // entity_id oder Literal
  "valueType": "entity",             // entity | string | number | bool | enum | date
  "validFromScene": 1,
  "validUntilScene": 12,             // null = weiterhin gültig
  "sourceSceneIndex": 1,
  "sourceChapterVersionId": "cv_…",
  "evidenceQuote": "Tomas ließ den Archivschlüssel in seine Manteltasche gleiten.",
  "evidenceStart": 4213, "evidenceEnd": 4278,
  "confidence": 0.97,
  "recordedInRun": "run_a",
  "supersededBy": null,
  "canonStatus": "accepted"
}
```

Prädikat-Katalog (geschlossen, erweiterbar über Migration — **kein** Freitext):

| Prädikat | Subjekt | Wert | Beispiel |
|---|---|---|---|
| `location` | character/object | location-id | wo ist jemand/etwas |
| `owner` / `possession` | object | character-id | Besitz |
| `status` | object/character | enum | `lost`, `destroyed`, `hidden`, `broken` |
| `alive` | character | bool | |
| `injury` | character | struct | `{part, severity, healsAfterScenes}` |
| `condition` | character | enum | `exhausted`, `drunk`, `ill`, `pregnant` |
| `emotion` | character | enum + Intensität | flüchtig, kurze Gültigkeit |
| `motivation` | character | string | |
| `ability` | character | struct | `{name, level}` |
| `appearance_*` | character | string | nur `mutable`-Felder |
| `age` | character | number | abgeleitet aus `birthYear` + story_time |
| `role` | character | string | |
| `member_of` | character | faction-id | |
| `flag` | beliebig | bool | freie, aber deklarierte Marker |

**Anti-Muster:** Ein Prädikat `note` mit Freitext. Das wäre ein Textfeld mit Extraschritten und
macht jeden Check unmöglich.

### 3.1 Änderung = Schließen + Anlegen

```sql
UPDATE entity_facts SET valid_until_scene = 12
 WHERE subject='archive_key' AND predicate='owner' AND valid_until_scene IS NULL;

INSERT INTO entity_facts (subject, predicate, value, valid_from_scene, …)
VALUES ('archive_key','status','lost', 12, …);
```
Nie `UPDATE … SET value = …`. Historie bleibt vollständig — Voraussetzung für Rückblenden,
Audits und Rollback.

## 4. Bitemporalität

Zwei unabhängige Zeitachsen:

| Achse | Felder | Zweck |
|---|---|---|
| **Story-Zeit** | `valid_from_scene`, `valid_until_scene` | "Wann gilt das in der Geschichte?" |
| **System-Zeit** | `recorded_in_run`, `superseded_by`, `created_at` | "Wann hat unser System das gelernt / verworfen?" |

Der Ausgangsentwurf hatte nur Achse 1. Achse 2 ist nötig, weil Nutzeränderungen und
Reparaturen Fakten **rückwirkend falsch** machen:

- Nutzer ändert Kapitel 8 → alle Fakten mit `source_chapter_version_id = <alte Version>`
  werden `superseded_by = <neue Extraktion>` gesetzt, **nicht gelöscht**.
- Der Fold ignoriert superseded Fakten.
- Ein Rollback stellt die alte Version wieder her, indem `superseded_by` zurückgesetzt wird.
- Audits können "was wussten wir wann" rekonstruieren — wichtig für Fehleranalyse.

## 5. Event-Ledger

```jsonc
{
  "eventId": "ev_00043",
  "sceneIndex": 27,
  "chapterNo": 4,
  "storyTime": "1894-10-12T21:30",
  "durationMinutes": 5,
  "type": "object_lost",             // geschlossener Typkatalog
  "summary": "Tomas verliert den Archivschlüssel auf dem Klippenweg.",
  "participants": [{ "characterId": "tomas", "role": "agent" }],
  "witnesses": [],
  "objects": ["archive_key"],
  "location": "cliff_path",
  "causedBy": ["ev_00041"],
  "causes": ["ev_00051"],
  "visibility": "private",           // public | semi_public | private | secret
  "threadIds": ["missing_letter"],
  "evidenceQuote": "…", "evidenceStart": 8123, "evidenceEnd": 8190,
  "importance": 4                    // 1–5, steuert Retrieval-Priorität
}
```

Event-Typkatalog (Auszug): `movement`, `arrival`, `departure`, `object_transfer`,
`object_lost`, `object_found`, `object_destroyed`, `injury`, `healing`, `death`, `birth`,
`revelation`, `deception`, `promise`, `betrayal`, `agreement`, `conflict`, `reconciliation`,
`discovery`, `decision`, `travel`, `time_skip`, `relationship_shift`, `ability_gained`,
`ability_lost`, `rule_invoked`.

Der geschlossene Katalog ist entscheidend: Nur so kann deterministischer Code Regeln wie
"nach `death` kein `agent`-Event mehr für diese Figur" anwenden.

## 6. Wissens-Ledger

Der bei Mystery/Thriller wichtigste Teil — und der, den LLMs ohne Hilfe am zuverlässigsten
falsch machen.

```jsonc
{
  "factRefId": "letter_author_identity",
  "description": "Wer den Brief von 1894 geschrieben hat",
  "truth": "june_father",
  "states": [
    { "characterId": "tomas",    "level": "knows",     "sinceScene": 3,  "source": "witnessed" },
    { "characterId": "june",     "level": "suspects",  "sinceScene": 27, "source": "inferred" },
    { "characterId": "mills",    "level": "misled",    "sinceScene": 19, "believes": "tomas",
      "misledBy": "tomas" },
    { "characterId": "brother",  "level": "unaware",   "sinceScene": 1 }
  ],
  "concealedBy": ["tomas"],
  "revealPlan": { "toReader": 27, "toJune": 31, "toPublic": 34 },
  "forbiddenBefore": { "june": 27 }
}
```

Level-Skala: `unaware < suspects < believes_false < misled < knows < confirmed`.

### 6.1 Zwei harte Checks (deterministisch)

```ts
// A) Wissens-Leak: Figur handelt/spricht auf Basis von Wissen, das sie nicht hat
for (const utterance of extractedUtterances) {          // aus der Extraktion, mit Zitat
  for (const ref of utterance.impliedKnowledge) {
    const level = knowledgeLevel(ref, utterance.speakerId, sceneIndex);
    if (level === 'unaware' || level === 'misled')
      issue('knowledge_leak', { severity: 'high', quote: utterance.quote });
  }
}

// B) Verfrühte Enthüllung gegen Plan
if (knowledgeBecameKnown(ref, char, sceneIndex) && sceneIndex < forbiddenBefore[char])
  issue('premature_reveal', { severity: 'block' });
```

### 6.2 POV-Wissensfilter

Bei `first` / `third_limited`: Der Context Builder liefert dem Schreibmodell **nur** die
Wissenslage der POV-Figur, plus explizit als "der Leser weiß bereits" markierte Informationen.
Alles andere (`truth`-Felder anderer Figuren, geheime Pläne) wird **entfernt**.
Ohne diesen Filter erzählt das Modell konsequent Dinge, die die POV-Figur nicht wissen kann.

Ausnahme: `forbiddenReveals` der Chapter Card werden als *Negativliste* mitgegeben
("erwähne unter keinen Umständen X"), ohne X inhaltlich aufzulösen.

## 7. Beziehungen

```jsonc
{
  "pairId": "june__tomas",
  "a": "june", "b": "tomas",
  "dimensions": { "trust": 55, "closeness": 30, "conflict": 20,
                  "power": -30, "loyalty": 40, "romantic": 10, "respect": 60 },
  "addressMode": { "aToB": "formal", "bToA": "formal" },
  "addressNames": { "aCallsB": "Herr Hale", "bCallsA": "Miss Weber" },
  "history": [
    { "sceneIndex": 27, "eventId": "ev_00051", "delta": { "trust": -35, "conflict": +30 },
      "quote": "…" }
  ],
  "lastChangedScene": 27
}
```

Alle Dimensionen: −100..+100 (`romantic` 0..100).

**Regel gegen Beziehungssprünge (deterministisch):**
```
|Δ| > 25 in einer Szene            → erfordert ein referenziertes Event mit Zitat
|Δ| > 40 in einer Szene            → erfordert Event mit importance ≥ 4
Δ ohne eventId                     → Issue 'unmotivated_relationship_shift'
Δ-Vorzeichen kehrt zweimal in ≤ 3 Szenen → Issue 'relationship_yo_yo'
```

**Anredewechsel:** `addressMode` darf sich nur ändern, wenn ein Event vom Typ
`relationship_shift` mit `addressChange: true` im selben oder vorherigen Scene-Index existiert.
Sonst: `illegal_address_shift` (hart). Nur aktiv, wenn `locale.formalityAxis = true`.

## 8. Zeit als First-Class-Objekt

```jsonc
// pro Szene
{
  "sceneIndex": 27,
  "storyTimeStart": "1894-10-12T20:40",
  "storyTimeEnd":   "1894-10-12T21:05",
  "durationMinutes": 25,
  "isFlashback": false,
  "isParallel": false,
  "parallelGroupId": null,
  "timeGapFromPrevMinutes": 15,
  "timeGapLabel": "kurz darauf",       // muss zum Text passen
  "dayOfStory": 4,
  "timeOfDay": "night"                 // dawn|morning|noon|afternoon|evening|night|late_night
}
```

### 8.1 Reisematrix

```jsonc
{ "from": "lighthouse", "to": "harbor",
  "distanceKm": 4.2,
  "modes": { "foot": { "minMinutes": 45, "normalMinutes": 70 },
             "horse": { "minMinutes": 15, "normalMinutes": 22 },
             "boat":  { "minMinutes": 30, "normalMinutes": 45, "condition": "nicht bei Sturm" } },
  "blockedWhen": ["Flut", "Sturm"],
  "notes": "Der Klippenweg ist nachts gefährlich" }
```

Die Matrix wird bei der Story-Bible-Erstellung **für alle Ortspaare** erzeugt, die im Plan
gemeinsam vorkommen (n² begrenzt auf die Orte des Plans, typisch 8–20 Orte → 30–190 Paare;
ein einziger LLM-Call mit Structured Output).

### 8.2 Timeline-Checks (rein deterministisch)

```ts
// 1) Monotonie (außer Flashback/Parallel)
if (!scene.isFlashback && !scene.isParallel && scene.storyTimeStart < prev.storyTimeEnd)
  issue('time_reversal');

// 2) Reisezeit
for (const move of movementEvents(scene)) {
  const need = travelMatrix[move.from][move.to][move.mode].minMinutes;
  const have = minutesBetween(move.departAt, move.arriveAt);
  if (have < need) issue('impossible_travel', { need, have, severity: 'high' });
}

// 3) Bilokation
const byChar = groupBy(activeCharactersWithLocation(sceneIndex), 'characterId');
for (const [char, entries] of byChar)
  if (new Set(entries.map(e => e.location)).size > 1 && !parallelAllowed)
    issue('character_bilocation', { severity: 'block' });

// 4) Alter
age = storyYear(scene) - character.birthYear;
if (Math.abs(age - statedAge) > 0) issue('age_inconsistency');

// 5) Tote handeln
if (!alive(charId, sceneIndex) && hasAgentRole(charId, scene))
  issue('dead_character_acts', { severity: 'block' });

// 6) Verletzungsheilung
if (injury.severity === 'severe' && scenesSince(injury) < injury.healsAfterScenes
    && performsPhysicalAction(char, scene))
  issue('injury_ignored');

// 7) Tageszeit vs. Text
if (scene.timeOfDay === 'night' && mentionsDaylight(text)) issue('time_of_day_mismatch');

// 8) Gegenstandsverfügbarkeit
if (usesObject(scene, obj) && factValue(obj,'status',sceneIndex) === 'lost')
  issue('lost_object_used', { severity: 'block' });
```

Diese acht Checks decken die komplette Kategorie "Fakten und Timeline" aus der Fehlerliste des
Ausgangskonzepts ab — **ohne einen einzigen LLM-Call**. Sie sind nur so gut wie die Extraktion;
deshalb ist das Grounding aus [10](10-extraktion.md) die Voraussetzung.

## 9. State-Fold (Materialisierung)

```ts
export function foldState(bookVersionId: string, uptoSceneIndex: number): StoryState {
  const facts = query(`
    SELECT DISTINCT ON (subject, predicate, COALESCE(value_key,'')) *
    FROM entity_facts
    WHERE book_version_id = $1
      AND superseded_by IS NULL
      AND canon_status = 'accepted'
      AND valid_from_scene <= $2
      AND (valid_until_scene IS NULL OR valid_until_scene > $2)
    ORDER BY subject, predicate, COALESCE(value_key,''), valid_from_scene DESC, created_at DESC
  `, [bookVersionId, uptoSceneIndex]);

  return {
    characters: byCharacter(facts),
    objects: byObject(facts),
    knowledge: foldKnowledge(bookVersionId, uptoSceneIndex),
    relationships: foldRelationships(bookVersionId, uptoSceneIndex),
    threads: foldThreads(bookVersionId, uptoSceneIndex),
    time: lastSceneTime(bookVersionId, uptoSceneIndex),
  };
}
```

- Nach jedem Commit wird `state_snapshots(scene_index)` geschrieben (JSONB, komprimiert).
- Der Context Builder liest den Snapshot, nicht das Ledger → ein Query statt sechs.
- Ein Nightly-Job (`verifyFold`) rechnet stichprobenartig Snapshots neu und vergleicht.
  Abweichung = Alarm (Fold-Bug oder Datenkorruption).

## 10. Emotionen und Kurzlebigkeit

Emotionen sind Fakten mit kurzer Halbwertszeit. Ohne Sonderregel füllen sie das Ledger.

```
emotion-Fakten: valid_until_scene wird beim Anlegen auf (from + 2) vorbelegt,
                sofern kein späteres Event sie verlängert.
Nur Emotionen mit importance ≥ 3 (z. B. Trauer nach Todesfall) bekommen offene Gültigkeit.
Der Kontext enthält immer nur den letzten Emotionszustand je aktiver Figur.
```

## 11. Offene Fragen des Lesers (Reader-Question-Ledger)

Ergänzung zum Ausgangskonzept: Was der **Leser** an offenen Fragen mit sich trägt, ist nicht
identisch mit den Threads.

```jsonc
{ "questionId": "q_012", "raisedInChapter": 4,
  "question": "Warum hat Tomas gelogen, wo er in der Brandnacht war?",
  "salience": "high",              // high | medium | low
  "answeredInChapter": null,
  "plannedAnswerChapter": 22,
  "type": "mystery" }              // mystery | motivation | outcome | relationship
```

Deterministische Regel: Eine Frage mit `salience = high`, die 8+ Kapitel offen ist und keinen
`plannedAnswerChapter` hat, erzeugt ein Issue. Am Ende dürfen nur Fragen offen sein, die in
`endingContract.intentionalAmbiguities` stehen.
