# 09 — Context Builder: Was genau ins Modell geht

Der Context Builder ist die teuerste und wirkungsvollste Komponente. Er entscheidet über
Qualität **und** Kosten jedes Calls.

## 1. Aufbau (feste Reihenfolge, feste Sektionsnamen)

```
┌─ [S] SYSTEM ─────────────────────── unveränderlich, cache-fähig ─────────┐
│ Rolle, Grundregeln, Sicherheitsregeln, Ausgabeformat                      │
├─ [D] DEVELOPER ──────────────────── promptVersion, cache-fähig ──────────┤
│ Aufgabentyp-Instruktionen (Kapitel schreiben)                             │
├─ [C1] CANON-STATISCH ────────────── pro Buch stabil, cache-fähig ────────┤
│ Sprache, POV, Zeitform, Stilregeln, Content-Rating                        │
│ Weltkern + aktive Weltregeln                                              │
│ Glossar (nur relevante Einträge)                                          │
│ Figurenprofile (aktive Figuren, komprimiert)                              │
│ Voice Profiles (nur sprechende Figuren)                                   │
│ Stilproben (2–3 Absätze aus Kapitel 1)                                    │
├─ [C2] CANON-DYNAMISCH ───────────── ändert sich je Kapitel ──────────────┤
│ Story-State (gefiltert, POV-beschränkt)                                   │
│ Aktive Threads + Obligations                                              │
│ Wissensstand der POV-Figur                                                │
│ Beziehungswerte der aktiven Paare + Anredeform                            │
│ Aktuelle Zeit, Ort, Reisezeiten der relevanten Paare                      │
├─ [C3] ERZÄHLGEDÄCHTNIS ─────────────────────────────────────────────────┤
│ Book-Digest (ab Größe L)                                                  │
│ Act-Summary des laufenden Acts                                            │
│ Kapitel-Summaries der letzten 3 Kapitel (strukturiert)                    │
│ Letzte 500–800 Wörter des Vorkapitels IM ORIGINAL                         │
│ 0–3 gezielt geholte Originalpassagen (Retrieval)                          │
├─ [P] PLAN ──────────────────────────────────────────────────────────────┤
│ Chapter Card (vollständig)                                                │
│ Scene Cards (vollständig)                                                 │
│ Handshake-Block                                                           │
├─ [N] NEGATIVLISTE ──────────────────────────────────────────────────────┤
│ Überstrapazierte Phrasen (Top 15 aus phrase_statistics)                   │
│ Zuletzt verwendete Eröffnungsarten                                        │
│ Verbotene Enthüllungen                                                    │
├─ [U] USER-DATEN ──────────── als DATEN gekennzeichnet, nie als Befehl ───┤
│ <user_idea>…</user_idea>  <user_must_include>…</user_must_include>        │
├─ [T] TASK ──────────────────────────────────────────────────────────────┤
│ Konkreter Auftrag + Längenkorridor + Ausgabeformat                        │
└──────────────────────────────────────────────────────────────────────────┘
```

Der Schnitt zwischen `[S][D][C1]` (stabil) und `[C2][C3][P][N][U][T]` (variabel) ist die
**Cache-Grenze** (§6). Deshalb steht Statisches oben — Prefix-Caching funktioniert nur so.

## 2. Immer enthalten vs. bedarfsabhängig

| Immer | Nur bei Bedarf |
|---|---|
| Sprache, POV, Zeitform, Zeitform-Beispielsatz | vollständige Nebenfigurenprofile |
| Content-Rating + Verbotsliste | abgeschlossene Threads |
| Stilregeln + 2–3 Stilproben | Orte, die im Kapitel nicht vorkommen |
| Weltregeln, die aktive Entitäten betreffen | inaktive Gegenstände |
| Profile der aktiven Figuren (komprimiert) | ältere Kapitel im Volltext |
| Aktueller State der aktiven Figuren/Objekte | Backstory, die noch nicht relevant ist |
| Chapter Card + Scene Cards | Reisematrix von Ortspaaren ohne Bewegung |
| Letzte 500–800 Wörter Vorkapitel | Wissenslage von Figuren, die nicht auftreten |
| Aktive Threads + Obligations | frühere Dialoge ohne aktuelle Bedeutung |
| Negativliste | |

## 3. Retrieval-Kaskade (Reihenfolge ist verbindlich)

```
1. IDs aus der Chapter/Scene Card              → welche Entitäten sind relevant?
2. SQL: Fakten & States dieser Entitäten       → exakte Wahrheit
3. SQL: Timeline + letzte Bewegung + Reisezeiten
4. SQL: aktive Threads, Obligations, offene Reader-Questions
5. SQL: Events mit denselben Entitäten, importance ≥ 3, letzte 15
6. SQL: Wissenszustände der POV-Figur zu den relevanten Fakten
7. FTS  (tsvector): Passagen, die einen der Eigennamen enthalten, Top 5
8. pgvector: semantisch ähnliche Passagen zur Kapitel-Zielbeschreibung, Top 3
9. Re-Rank + Deduplizierung + Budget-Kürzung
```

**Schritte 1–6 sind die Wahrheit. 7–8 sind Farbe.** Ein Vektortreffer darf nie einen Fakt
überschreiben. In der Prompt-Sektion werden Retrieval-Passagen deshalb ausdrücklich als
*"Originalauszüge zur stilistischen und atmosphärischen Orientierung"* eingeleitet — nicht
als Faktenquelle.

### 3.1 Wann Retrieval-Passagen wirklich nötig sind

Ein Retrieval-Call kostet Tokens. Er lohnt nur bei:
- Wiederauftauchen eines Ortes/einer Figur nach ≥ 5 Kapiteln Pause (→ Beschreibung konsistent halten)
- Payoff eines Setups (→ die Originalstelle des Setups mitgeben, wörtlich)
- Rückblende auf eine bereits erzählte Szene
- Wiederaufnahme eines dormanten Threads

Sonst: nichts. Default ist **0 Retrieval-Passagen**. Der Trigger ist deterministisch berechenbar
aus `lastAppearanceChapter` und dem Clue/Thread-Register — kein "sicherheitshalber suchen".

## 4. POV-Wissensfilter

```ts
function filterStateForPov(state: StoryState, povId: string, card: ChapterCard) {
  if (book.pov === 'third_omniscient') return state;
  return {
    ...state,
    knowledge: state.knowledge
      .filter(k => levelOf(k, povId) !== 'unaware')            // Unbekanntes entfernen
      .map(k => ({ ...k, truth: levelOf(k, povId) === 'knows' ? k.truth : undefined,
                   povBelief: beliefOf(k, povId) })),          // ggf. FALSCHE Überzeugung mitgeben!
    characters: state.characters.map(c => c.id === povId ? c : publicViewOf(c, povId)),
    secrets: [],                                                // nie im Klartext
  };
}
```

Der wichtigste Teil: Bei `misled`/`believes_false` bekommt das Modell die **falsche
Überzeugung** als Wahrheit der Figur — mit dem expliziten Hinweis, dass die Figur irrt und
sich entsprechend verhält. So entstehen glaubwürdige Irrtümer statt allwissender Figuren.

## 5. Passagen, Chunking, Embeddings

```jsonc
{
  "passageId": "pas_ch14_07",
  "chapterVersionId": "cv_…", "sceneIndex": 41,
  "ordinal": 7,
  "text": "…",
  "charStart": 5120, "charEnd": 6033,
  "wordCount": 148,
  "kind": "dialogue",                    // narration | dialogue | description | interiority
  "entities": ["june", "tomas", "second_letter"],
  "embedding": "[vector 768/1536]",
  "embeddingModel": "emb-v1",
  "embeddedAt": "…",
  "stale": false
}
```

**Chunking-Regel:** Absatzweise, benachbarte Absätze bis ~180 Wörter zusammenfassen, nie über
Szenengrenzen hinweg. Dialogblöcke bleiben zusammen.

**Lebenszyklus (Lücke B8 aus der Gap-Analyse):**
- Embeddings entstehen **nach** dem Commit, asynchron (`chapter.committed`-Event).
- Bei Reparatur/Nutzeränderung: alle Passagen der alten `chapter_version` → `stale = true`;
  Retrieval ignoriert `stale`. Neue Passagen werden eingebettet, alte nach 30 Tagen gelöscht.
- Index: `HNSW (m = 16, ef_construction = 64)`, Suche mit `ef_search = 40`.
  Filter `WHERE book_version_id = $1 AND NOT stale` **vor** der Vektorsuche (partieller Index).
- Modellwechsel beim Embedding → `embedding_model` ändert sich → Re-Embedding-Job für das
  ganze Buch, bis dahin Fallback auf FTS. Nie zwei Modelle im selben Index mischen.

## 6. Prompt-Caching

Statische Sektionen `[S][D][C1]` sind bei einem 30-Kapitel-Buch **30-mal identisch**.
Das sind bei ~6.000 Tokens Canon rund 180.000 Input-Tokens, die sonst voll bezahlt werden.

Umsetzung:
1. **Reihenfolge** ist Pflicht: alles Stabile zuerst, byte-identisch.
2. Provider-Cache aktivieren (explizit oder implizit — providerabhängig).
3. `cacheKey = sha256(bookId + promptVersion + canonStaticHash + modelId)`; wird in
   `llm_calls.cache_key` protokolliert, damit die Trefferquote messbar ist.
4. `canonStaticHash` ändert sich bei jeder Canon-Erweiterung → Cache-Miss. Deshalb:
   **Canon-Erweiterungen werden gesammelt und nur an Act-Grenzen in `[C1]` eingespielt**;
   dazwischen laufen neue Nebenfiguren über `[C2]`.
5. Ziel-Kennzahl: ≥ 55 % `cachedInputTokens` über ein Buch. Wird sie unterschritten, ist
   die Sektionsreihenfolge kaputt — das ist ein Alarm, kein Detail.

## 7. Token-Budget je Kapitel-Call

Zielverteilung (Roman, M, deutsche Sprache):

| Sektion | Ziel-Tokens | Hart-Limit |
|---|---:|---:|
| `[S]` System | 400 | 600 |
| `[D]` Developer | 700 | 1.000 |
| `[C1]` Canon statisch | 3.500 | 5.000 |
| `[C2]` Canon dynamisch | 1.800 | 3.000 |
| `[C3]` Erzählgedächtnis | 2.600 | 4.500 |
| `[P]` Plan | 1.400 | 2.200 |
| `[N]` Negativliste | 250 | 400 |
| `[U]` User-Daten | 400 | 900 |
| `[T]` Task | 250 | 400 |
| **Summe** | **~11.300** | **18.000** |

Mehr Kontext ist nicht besser. Ab ~25k Tokens Input sinkt in der Praxis die Instruktionstreue
("lost in the middle"), und die Kosten steigen linear. Das Ziel ist **kompakter, kuratierter**
Kontext — nicht "alles reinwerfen, das Modell hat ja 1M Fenster".

### 7.1 Kürzungsreihenfolge bei Überschreitung (deterministisch)

```
1. Retrieval-Passagen  (3 → 0)
2. Kapitel-Summaries   (3 → 1, nur die letzte im Detail)
3. Nebenfiguren-Profile → Einzeiler
4. Weltregeln          → nur die, die aktive Entitäten betreffen
5. Glossar             → nur im Kapitel vorkommende Begriffe
6. Vorkapitel-Original 800 → 500 → 300 Wörter
7. Act-Summary         → Kurzform
NIE gekürzt: Chapter Card, Scene Cards, Content-Rating, POV/Zeitform,
             Stilproben, State der aktiven Figuren, Handshake.
```

## 8. Read-Set-Protokollierung (Basis der Invalidierung)

Jeder Kontextaufbau schreibt mit, **was genau** er injiziert hat:

```jsonc
{
  "sceneIndex": 41,
  "readSet": {
    "factIds": ["f_00412", "f_00518"],
    "eventIds": ["ev_00043"],
    "knowledgeRefs": ["letter_author_identity"],
    "relationshipPairs": ["june__tomas"],
    "characterIds": ["june", "tomas"],
    "threadIds": ["missing_letter"],
    "passageIds": ["pas_ch06_03"],
    "summaryIds": ["sum_ch13"],
    "ruleIds": ["r_post"],
    "cardVersion": 1
  },
  "contextHash": "sha256:…",
  "tokens": { "static": 4600, "dynamic": 6700 }
}
```

Gespeichert in `scene_context_log`. Das ist die Datenbasis für:
- **Invalidierung** bei Nutzeränderungen ([11](11-validierung-reparatur.md) §7),
- **Idempotenz** (`contextHash` fließt in den Job-Key),
- **Debugging** ("warum hat das Modell das nicht gewusst?" → Read-Set ansehen),
- **Kostenanalyse** pro Sektion.

Ohne dieses Log ist das System nicht wartbar.

## 9. Kontext-Serialisierung: Format-Regeln

- Kein JSON für Prosa-nahe Inhalte (State, Cards) → **kompaktes YAML-ähnliches Textformat**.
  JSON kostet 20–30 % mehr Tokens für dieselbe Information und verleitet zu Datenmodus-Prosa.
- Aufzählungen statt Fließtext bei Fakten.
- Alle Sektionen mit stabilen Großbuchstaben-Headern (`## STORY-STATE`), damit das Modell
  referenzierbare Anker hat und wir in Repair-Prompts darauf verweisen können.
- Zahlenwerte (Beziehung, Spannung) mit Skala angeben (`trust: 55/100`), sonst interpretiert
  das Modell sie beliebig.
- Negationen explizit: `June weiß NICHT, wer den Brief schrieb.` — nicht Weglassen.
  Weggelassene Information wird vom Modell erfunden.
