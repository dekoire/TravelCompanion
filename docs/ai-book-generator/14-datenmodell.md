# 14 — Datenmodell

Vollständiges DDL: [schema.sql](schema.sql). Dieses Dokument erklärt die Entscheidungen.

## 1. Tabellenübersicht (53 Tabellen)

| Gruppe | Tabellen |
|---|---|
| Identität/Abrechnung | `profiles`, `credit_ledger`, `model_profiles`, `prompt_versions` |
| Buch | `series`, `books`, `book_versions`, `book_specs` |
| Canon-Stammdaten | `story_bibles`, `style_profiles`, `entities`, `character_voices`, `glossary_entries`, `travel_times` |
| Struktur | `parts`, `acts`, `chapters`, `chapter_cards`, `chapter_versions`, `scenes`, `scene_cards` |
| Canon-Ledger | `canon_generations`, `events`, `entity_facts`, `knowledge_states`, `knowledge_plans`, `relationships`, `state_snapshots` |
| Plot | `plot_threads`, `thread_obligations`, `clues`, `reader_questions` |
| Non-Fiction | `learning_objectives`, `sources`, `source_chunks`, `knowledge_claims`, `term_definitions`, `redundancy_map` |
| Text/Retrieval | `passages`, `summaries`, `phrase_statistics`, `chapter_openings` |
| Kontext | `scene_context_log` |
| Qualität | `consistency_issues`, `repairs` |
| Betrieb | `generation_runs`, `generation_jobs`, `llm_calls`, `moderation_events` |
| Ausgabe | `review_checkpoints`, `assets`, `renders`, `book_metadata` |

## 2. Die vier wichtigsten Designentscheidungen

### 2.1 `entities` als generische Tabelle statt `characters`/`locations`/`objects`

Fakten, Events und Beziehungen referenzieren Entitäten. Mit drei getrennten Tabellen bräuchte
`entity_facts.subject` eine polymorphe Referenz — kein Fremdschlüssel, keine referentielle
Integrität, kein sauberer Join. Mit `entities(kind)` gibt es echte FKs und einen einzigen
Index-Pfad. Kindspezifische Attribute liegen in `data jsonb`, weil sie sich strukturell
unterscheiden und nie einzeln gefiltert werden.

**Ausnahme:** `character_voices` ist eine eigene Tabelle, weil sie bei jedem Kapitel-Call
gelesen wird und nicht durch ein großes `data`-JSONB geschleppt werden soll.

### 2.2 `scene_index` als globale Zeitachse

Alle Gültigkeiten (`valid_from_scene`, `since_scene`) referenzieren einen **buchglobalen,
monoton steigenden** Szenenindex — nicht Kapitelnummern. Grund: Kapitelnummern verschieben
sich, wenn ein Kapitel eingefügt oder geteilt wird. Ein Fakt mit `valid_from_scene = 41`
bleibt stabil; die Zuordnung Kapitel↔Szene liegt in `scenes`.

Bei Einfügungen wird neu nummeriert (Lücken von 10 lassen sich vorsehen: `scene_index`
in Schritten von 10 vergeben, dann sind Einfügungen ohne Renumbering möglich — empfohlen ab
Version 2).

### 2.3 Append-only mit Triggern abgesichert

`events`, `entity_facts`, `knowledge_states`, `relationships`, `llm_calls` haben einen
`BEFORE UPDATE OR DELETE`-Trigger, der jede Mutation ablehnt. Das Schließen einer Gültigkeit
(`valid_until_scene` setzen) läuft ausschließlich über `commit_chapter` bzw. die
`apply_*`-Funktionen, die eine Session-Variable setzen. So kann kein Anwendungsfehler den
Canon zerstören — auch nicht mit Service-Role-Key.

### 2.4 `scene_context_log.read_set_ids` mit GIN-Index

Das ist die technische Grundlage der Invalidierungslogik
([11](11-validierung-reparatur.md) §7). Ein Array aller injizierten Canon-IDs, flach,
mit GIN-Index:

```sql
SELECT DISTINCT chapter_no FROM scene_context_log
WHERE book_version_id = $1 AND chapter_no > $2 AND read_set_ids && $3;
```

Ohne diese Tabelle ist "welche Kapitel sind von dieser Änderung betroffen?" nicht beantwortbar,
und jede Nutzeränderung führt zu Vollneugenerierung.

## 3. JSONB vs. Spalten — die Regel

| In Spalten, wenn … | In JSONB, wenn … |
|---|---|
| gefiltert oder sortiert wird | nur als Ganzes gelesen wird |
| ein Fremdschlüssel nötig ist | die Struktur je Zeile variiert |
| ein Constraint gelten soll | es ein versioniertes Dokument ist (Card, Spec, Profile) |
| es in Kennzahlen eingeht | es ein Prompt-Fragment ist |

Beispiele: `chapters.actual_words` ist eine Spalte (wird aggregiert), `chapter_cards.card` ist
JSONB (wird als Ganzes in den Prompt gegeben). `entity_facts.predicate` ist eine Spalte
(wird gefiltert), `entities.data` ist JSONB.

**GIN-Indizes auf JSONB** nur dort, wo wirklich in das Dokument hinein gefiltert wird —
sonst kosten sie Schreibperformance ohne Nutzen.

## 4. Wichtige Indizes

```sql
-- Fakten-Lookup beim Fold (der häufigste Query überhaupt)
create index on entity_facts (book_version_id, subject_entity_id, predicate, valid_from_scene desc)
  where superseded_by is null and canon_status = 'accepted';

-- Offene Fakten (für "aktueller Zustand")
create index on entity_facts (book_version_id, valid_until_scene) where valid_until_scene is null;

-- Invalidierung
create index on scene_context_log using gin (read_set_ids);

-- Retrieval
create index on passages using gin (tsv);
create index on passages using hnsw (embedding vector_cosine_ops) with (m=16, ef_construction=64);
create index on passages (book_version_id, chapter_version_id) where not stale;

-- Namensprüfung
create index on glossary_entries using gin (term gin_trgm_ops);
create index on entities using gin (name gin_trgm_ops);

-- Job-Wiederaufnahme (hängende Jobs finden)
create index on generation_jobs (status, heartbeat_at) where status = 'running';
```

## 5. Constraints, die Fehler verhindern

| Constraint | Verhindert |
|---|---|
| `unique (book_version_id, chapter_no)` auf `chapters` | Doppelte Kapitel durch Retry |
| `unique index on chapter_versions (chapter_id) where is_current` | Zwei "aktuelle" Versionen |
| `unique index on book_versions (book_id) where is_current` | dito auf Buchebene |
| `unique (idempotency_key)` auf `generation_jobs` | Doppelte Jobausführung |
| `unique index on llm_calls (idempotency_key) where status='ok'` | Doppelabbuchung |
| `check (entity_a < entity_b)` auf `relationships` | Paar zweimal in beiden Richtungen |
| `unique (book_version_id, slug)` auf `entities` | Zwei Entitäten mit gleichem Slug |
| Append-only-Trigger | Canon-Zerstörung durch Anwendungsfehler |

## 6. Textspeicherung

```
chapter_versions.text          → inline, wenn < 64 KB (praktisch immer: 4.000 Wörter ≈ 26 KB)
chapter_versions.storage_path  → Supabase Storage, wenn größer
chapter_versions.partial_text  → Streaming-Zwischenstand, wird beim Commit geleert
```

Volltext des Buches wird **nie** als eine Spalte gespeichert. Er entsteht beim Rendern aus
`chapter_versions where is_current`.

## 7. Retention und Aufräumen

| Daten | Aufbewahrung |
|---|---|
| `chapter_versions` (nicht aktuell) | 90 Tage, dann alle außer je 3 letzten pro Kapitel löschen |
| `passages` mit `stale = true` | 30 Tage |
| `state_snapshots` alter `canon_generations` | 30 Tage nach Rebuild |
| `llm_calls.debug_storage_path` | 7 Tage |
| `generation_jobs` (succeeded) | 180 Tage, dann aggregieren |
| `moderation_events` | 24 Monate (Rechenschaftspflicht) |
| `credit_ledger` | unbefristet (Handelsrecht), nach Kontolöschung anonymisiert |

Ein täglicher `gc`-Cron erledigt das. Ohne ihn wächst die DB pro Buch um ein Vielfaches des
Endprodukts.

## 8. Row Level Security

**Grundmuster:** Der Client liest nur, was ihm über `books.user_id` gehört. Er schreibt fast
nichts direkt — alle Canon-Schreibvorgänge laufen über den Worker mit Service Role.

Client-Schreibrechte (die einzigen):
- `books` INSERT/UPDATE (Titel, Status-Aktionen wie Pause/Abbruch)
- `book_specs` UPDATE, solange `books.status = 'draft_spec'`
- `chapter_versions` INSERT mit `source = 'user_edit'`
- `review_checkpoints` UPDATE (Entscheidungen)
- `consistency_issues` UPDATE nur `status` → `accepted` / `wont_fix`

Alles andere: `SELECT`-only. Die Policies nutzen die `SECURITY DEFINER`-Hilfsfunktion
`owns_book_version(uuid)`, damit nicht jede Policy einen dreifach verschachtelten
`EXISTS` braucht (Performance).

**Storage-Policies:** Alle Buckets privat. Pfadkonvention
`{userId}/{bookId}/{kind}/{filename}`; die Policy prüft das erste Pfadsegment gegen
`auth.uid()`. Auslieferung ausschließlich über Signed URLs mit 15 Minuten TTL.

## 9. Migrationsstrategie

- Migrationen nur additiv im laufenden Betrieb (neue Spalten `NULL`-fähig, neue Tabellen).
- Umbenennungen laufen über Expand/Contract in zwei Deployments.
- Prädikat-Katalog (`entity_facts.predicate`) ist bewusst `text` mit
  Anwendungs-Enum statt DB-Enum: Erweiterung ohne Migration, Validierung in Zod.
- Bücher in `GENERATING` dürfen während einer Migration nicht brechen: Deshalb wird jede
  Migration gegen einen Snapshot mit laufenden Büchern getestet.

## 10. Größenordnungen (Roman, 100k Wörter)

| Tabelle | Zeilen | Größe |
|---|---:|---:|
| `chapter_versions` | 30–90 | ~15 MB |
| `passages` | ~700 | ~3 MB Text + ~4 MB Embeddings |
| `entity_facts` | 800–2.500 | ~2 MB |
| `events` | 400–900 | ~1,5 MB |
| `knowledge_states` | 150–600 | < 1 MB |
| `scene_context_log` | ~100 | ~2 MB |
| `llm_calls` | 250–600 | < 1 MB (ohne Debug) |
| `phrase_statistics` | 30k–80k | ~5 MB |
| **Gesamt pro Buch** | | **~35 MB** |

Bei 10.000 Büchern: ~350 GB. Das ist der Grund für §7 (Retention) — mit ungebremster
Versionshistorie wären es leicht 1,5 TB.
