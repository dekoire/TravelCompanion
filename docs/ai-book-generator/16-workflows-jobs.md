# 16 — Workflows, Jobs, Idempotenz, Fehlerbehandlung

## 1. Operationskatalog

Jeder Schritt der Pipeline ist eine benannte **Operation** mit festem Vertrag.

| Operation | Capability | Zustandsändernd | Parallelisierbar | Typ. Dauer |
|---|---|:--:|:--:|---|
| `spec.validate` | — | ja | – | < 1 s |
| `spec.moderate` | CRITIC | nein | – | 3–8 s |
| `plan.premise` | PLANNER | ja | – | 30–90 s |
| `plan.bible` | PLANNER | ja | – | 60–180 s |
| `plan.characters` | PLANNER | ja | – | 40–120 s |
| `plan.ending` | PLANNER | ja | – | 40–100 s |
| `plan.threads` | PLANNER | ja | – | 30–80 s |
| `plan.travel_matrix` | PLANNER | ja | ✓ | 20–50 s |
| `plan.arc` | — (Code) | ja | – | < 1 s |
| `plan.outline` | PLANNER | ja | ✓ (A/B) | 60–180 s |
| `plan.outline_lint` | — (Code) | nein | ✓ | < 1 s |
| `plan.structure_expand` | — (Code) | ja | – | < 1 s |
| `plan.chapter_cards` | PLANNER | ja | ✓ (je Act) | 40–120 s |
| `plan.scene_cards` | PLANNER | ja | ✓ (je Kapitel innerhalb eines Acts) | 30–80 s |
| `plan.clues` | PLANNER | ja | – | 30–70 s |
| `plan.audit` | AUDITOR | nein | – | 60–200 s |
| `style.calibrate` | DRAFTER | ja | ✓ (Varianten) | 60–200 s |
| `chapter.write` | DRAFTER | nein* | ✗ | 90–400 s |
| `chapter.extract` | EXTRACTOR | nein* | ✗ | 20–60 s |
| `chapter.verify` | VERIFIER | nein | ✓ | 3–10 s |
| `chapter.check_semantic` | CRITIC | nein | – | 20–70 s |
| `chapter.repair` | DRAFTER | nein* | ✗ | 20–120 s |
| `chapter.commit` | — (SQL) | **ja** | ✗ | < 2 s |
| `chapter.embed` | EMBED | ja | ✓ | 5–20 s |
| `audit.act` | AUDITOR | nein | ✓ (nachträglich) | 90–400 s |
| `audit.midpoint` | AUDITOR | nein | – | 120–500 s |
| `audit.threads` | — (Code) + AUDITOR | nein | – | 30–90 s |
| `audit.final_a1..a4` | AUDITOR | nein | teilweise | 100–600 s |
| `canon.rebuild` | EXTRACTOR | ja | ✓ | 5–20 min |
| `meta.generate` | PLANNER | ja | – | 20–60 s |
| `cover.generate` | IMAGE | ja | – | 20–90 s |
| `image.chapter` | IMAGE | ja | ✓ | 20–60 s |
| `render.*` | — (Code) | ja | ✓ | 30–300 s |
| `audio.*` | TTS | ja | ✓ | Minuten–Stunden |

\* Zustandsändernd erst durch `chapter.commit`. Alles davor schreibt nur in
`chapter_versions.partial_text` bzw. `draft_json`.

## 2. Buch-Zustandsautomat

```ts
const TRANSITIONS: Record<BookStatus, BookStatus[]> = {
  draft_spec:         ['spec_ready', 'cancelled'],
  spec_ready:         ['planning_bible', 'draft_spec', 'cancelled'],
  planning_bible:     ['planning_arc', 'failed', 'paused'],
  planning_arc:       ['outline_review', 'failed', 'paused'],
  outline_review:     ['style_calibration', 'planning_arc', 'cancelled'],   // Nutzer kann neu planen
  style_calibration:  ['ready', 'style_calibration', 'cancelled'],
  ready:              ['generating', 'cancelled'],
  generating:         ['act_review', 'needs_review', 'final_audit', 'paused', 'failed'],
  act_review:         ['generating', 'paused', 'cancelled'],
  needs_review:       ['generating', 'paused', 'cancelled'],
  final_audit:        ['final_repair', 'canon_rebuild', 'needs_review', 'failed'],
  final_repair:       ['final_audit', 'canon_rebuild', 'needs_review'],
  canon_rebuild:      ['rendering', 'needs_review'],
  rendering:          ['completed', 'failed'],
  completed:          ['rendering'],                    // Neu-Export erlaubt
  paused:             ['generating', 'planning_arc', 'cancelled'],
  failed:             ['generating', 'cancelled'],      // Wiederaufnahme nach Fix
  cancelled:          [],
};
```

Übergänge laufen ausschließlich über `setBookStatus(bookId, next, reason)`, das die Tabelle
prüft und den Wechsel protokolliert. Ein ungültiger Übergang ist ein Programmierfehler und
wirft — nie stillschweigend korrigieren.

## 3. Inngest-Funktionen

```ts
export const generateBook = inngest.createFunction(
  {
    id: 'book.generate',
    concurrency: [
      { key: 'event.data.bookId', limit: 1 },      // pro Buch strikt seriell
      { key: 'event.data.userId', limit: 2 },      // pro Nutzer max 2 Bücher
      { limit: 40 },                               // global
    ],
    retries: 3,
    cancelOn: [{ event: 'book.cancelled', match: 'data.bookId' }],
    onFailure: async ({ event, error }) => markBookFailed(event.data.bookId, error),
  },
  { event: 'book.generate.requested' },
  async ({ event, step }) => {
    const { bookId } = event.data;

    await step.run('spec.validate', () => validateAndFreezeSpec(bookId));
    await step.run('spec.moderate', () => moderateSpec(bookId));

    // ── Planung ───────────────────────────────────────────────
    await step.run('plan.premise',   () => planPremise(bookId));
    await step.run('plan.bible',     () => planBible(bookId));
    await step.run('plan.characters',() => planCharacters(bookId));
    await step.run('plan.ending',    () => planEnding(bookId));
    await step.run('plan.threads',   () => planThreads(bookId));
    await step.run('plan.arc',       () => computeArc(bookId));            // kein LLM

    const [a, b] = await Promise.all([                                     // parallel, zustandsfrei
      step.run('plan.outline.a', () => planOutline(bookId, 'A')),
      step.run('plan.outline.b', () => planOutline(bookId, 'B')),
    ]);
    await step.run('outline.publish', () => publishOutlineReview(bookId, [a, b]));

    // ── Human-in-the-Loop ─────────────────────────────────────
    const choice = await step.waitForEvent('outline.chosen', {
      event: 'book.outline.chosen', match: 'data.bookId', timeout: '14d',
    });
    if (!choice) return void await pauseBook(bookId, 'outline_review_timeout');
    await step.run('structure.expand', () => expandStructure(bookId, choice.data));

    // ── Stil-Kalibrierung ─────────────────────────────────────
    await step.run('style.variants', () => generateStyleVariants(bookId));
    const style = await step.waitForEvent('style.chosen', {
      event: 'book.style.chosen', match: 'data.bookId', timeout: '14d',
    });
    if (!style) return void await pauseBook(bookId, 'style_timeout');
    await step.run('style.freeze', () => freezeStyle(bookId, style.data));

    // ── Kapitel ───────────────────────────────────────────────
    const chapters = await step.run('chapters.list', () => listChapters(bookId));
    for (const ch of chapters) {
      // Ein eigener Step je Phase: memoisiert, wiederaufnehmbar, unter 600 s
      await step.run(`ch.${ch.no}.cards`,    () => ensureCards(bookId, ch.no));
      await step.run(`ch.${ch.no}.write`,    () => writeChapter(bookId, ch.no));
      await step.run(`ch.${ch.no}.extract`,  () => extractChapter(bookId, ch.no));
      await step.run(`ch.${ch.no}.validate`, () => validateChapter(bookId, ch.no));
      const rep = await step.run(`ch.${ch.no}.repair`, () => repairChapter(bookId, ch.no));
      if (rep.needsReview) {
        await step.run(`ch.${ch.no}.flag`, () => flagNeedsReview(bookId, ch.no, rep.issues));
        const dec = await step.waitForEvent(`ch.${ch.no}.decided`, {
          event: 'book.chapter.decided', match: 'data.bookId', timeout: '14d',
        });
        if (!dec) return void await pauseBook(bookId, 'needs_review_timeout');
        await step.run(`ch.${ch.no}.apply`, () => applyUserDecision(bookId, ch.no, dec.data));
      }
      await step.run(`ch.${ch.no}.commit`, () => commitChapter(bookId, ch.no));
      await step.sendEvent('embed', { name: 'chapter.committed', data: { bookId, no: ch.no } });

      if (isActEnd(ch)) {
        await step.run(`act.${ch.actIndex}.audit`, () => auditAct(bookId, ch.actIndex));
        if (needsHumanCheckpoint(bookId, ch.actIndex)) {
          const ok = await step.waitForEvent(`act.${ch.actIndex}.approved`, {
            event: 'book.act.approved', match: 'data.bookId', timeout: '14d',
          });
          if (!ok) return void await pauseBook(bookId, 'act_review_timeout');
        }
      }
      if (isMidpoint(ch)) await step.run('audit.midpoint', () => auditMidpoint(bookId));
      if (isPreClimax(ch)) await step.run('audit.threads', () => auditThreads(bookId));
    }

    // ── Abschluss ─────────────────────────────────────────────
    await step.run('audit.final', () => runFinalAudits(bookId));
    await step.run('final.repair', () => runFinalRepairs(bookId));
    await step.run('canon.rebuild', () => rebuildCanon(bookId));
    await step.run('meta.generate', () => generateMetadata(bookId));
    await step.sendEvent('render', { name: 'book.render.requested', data: { bookId } });
    await step.run('book.complete', () => setBookStatus(bookId, 'completed'));
  }
);
```

**Wichtig an dieser Struktur:**
- Jede Phase eines Kapitels ist ein **eigener Step**. Stirbt die Funktion beim Validieren,
  wird der teure Schreib-Step beim Retry aus dem Memo geholt und nicht neu bezahlt.
- Step-IDs sind **stabil und deterministisch** (`ch.14.write`). Ändert man sie, verliert man
  die Memoisierung laufender Bücher — deshalb: Step-IDs sind Teil des Vertrags, nicht
  Kosmetik.
- `waitForEvent` mit 14 Tagen Timeout: danach pausiert das Buch sauber statt zu verwaisen.

## 4. Idempotenz

### 4.1 Job-Ebene

```
idempotency_key = sha256(
  bookVersionId · operation · targetKind · targetId ·
  inputHash · promptVersion · modelId · attemptClass
)
```
- `inputHash`: Hash der Eingaben (Card-Version, State-Hash, Read-Set-Hash).
- `attemptClass`: `'initial'` oder `'repair:<issueId>:<n>'` — eine Reparatur ist absichtlich
  ein anderer Job, sonst würde sie den Cache-Treffer der Erstgenerierung ziehen.
- `generation_jobs.idempotency_key` ist `UNIQUE`. Ein zweiter Insert kollidiert und liefert
  das vorhandene Ergebnis (`ON CONFLICT DO NOTHING` + `SELECT`).

### 4.2 LLM-Ebene
Siehe [01](01-systemarchitektur.md) §6.4. Zusätzlich: `llm_calls` hat einen partiellen
Unique-Index auf `idempotency_key WHERE status='ok'` — fehlgeschlagene Calls dürfen wiederholt
werden, erfolgreiche nie doppelt abgerechnet.

### 4.3 Commit-Ebene
`chapters` hat `UNIQUE (book_version_id, chapter_no)`, `chapter_versions` einen partiellen
Unique-Index auf `is_current`. Ein doppelter Commit desselben Kapitels ist damit auf
DB-Ebene unmöglich — nicht nur "unwahrscheinlich".

## 5. Fehlerklassen und Reaktion

| Klasse | Beispiel | Reaktion |
|---|---|---|
| `TRANSIENT` | 429, 503, Netzwerk-Timeout | Retry mit Backoff (max 4), dann Fallback-Modell |
| `TRUNCATION` | `finishReason = length` | Fortsetzungs-Call (max 2), dann `scene_by_scene` |
| `SCHEMA` | Zod-Fehler | 1 Repair-Call, dann Job-Fehler |
| `REFUSAL` | Modell verweigert | Eskalation nach [13](13-prompting-sicherheit.md) §5 |
| `CONTENT_BLOCK` | Hard-Block im Output | Kein Commit, Buch → `needs_review`, Protokoll |
| `VALIDATION` | Block-Issues nach Reparaturbudget | Kapitel → `needs_review` |
| `BUDGET` | Buchbudget erschöpft | Buch → `paused`, Nutzer entscheidet über Aufstockung |
| `DEPENDENCY` | Card fehlt, State inkonsistent | Job-Fehler, Alarm — das ist ein Bug |
| `FATAL` | DB-Constraint verletzt, Datenkorruption | Buch → `failed`, Alarm, keine Retries |

Regel: **`TRANSIENT` wird wiederholt, alles andere nicht.** Blindes Retry auf `SCHEMA` oder
`REFUSAL` verbrennt Budget ohne Aussicht auf Erfolg.

## 6. Nebenläufigkeit und Locking

Drei Ebenen, alle nötig:

1. **Inngest Concurrency-Key** `bookId, limit 1` — verhindert zwei parallele Läufe desselben
   Buches im Normalfall.
2. **Postgres Advisory Lock** im Commit-Pfad:
   ```sql
   SELECT pg_advisory_xact_lock(hashtextextended(book_id::text, 0));
   ```
   Schützt gegen den Fall, dass ein Nutzer-Edit und ein Generierungs-Commit gleichzeitig
   laufen (unterschiedliche Funktionen, gleicher Datensatz).
3. **Optimistic Concurrency** auf `chapter_versions`: Der Commit gibt die erwartete
   `parent_version_id` an. Stimmt sie nicht mehr, wird abgebrochen und neu gelesen.

## 7. Wiederaufnahme und Reconcile

Inngest merkt nicht jeden Ausfall (z. B. wenn der Vercel-Container mitten im Step stirbt und
der HTTP-Callback verloren geht). Deshalb ein Cron alle 15 Minuten:

```sql
-- Hängende Jobs finden
SELECT * FROM generation_jobs
WHERE status = 'running'
  AND (heartbeat_at IS NULL OR heartbeat_at < now() - interval '20 minutes');
```

Für jeden Treffer:
1. Prüfen, ob das Ergebnis trotzdem existiert (Idempotenz-Lookup) → dann als `succeeded`
   markieren.
2. Sonst `attempt++`, Status `queued`, Event neu senden.
3. Ab `attempt >= 3`: Buch → `needs_review` mit technischem Fehlerbericht.

Jeder lang laufende Step schreibt alle 30 s `heartbeat_at`.

## 8. Abbruch und Rückerstattung

```
Nutzer klickt Abbrechen
  → Event 'book.cancelled'  → Inngest cancelOn greift
  → laufender LLM-Call wird per AbortController abgebrochen (Kosten bis dahin bleiben)
  → Buch → 'cancelled'
  → Credit-Abrechnung: reservierte, nicht verbrauchte Credits werden freigegeben
  → bereits committete Kapitel bleiben lesbar und exportierbar (Teilprodukt)
```

Ein abgebrochenes Buch ist **kein Datenverlust**: Der Nutzer bekommt ein Teilmanuskript
mit allen bis dahin committeten Kapiteln plus Hinweis, dass es unvollständig ist.

## 9. Beobachtbarkeit der Pipeline

Jeder Job schreibt:
- `generation_jobs` (Status, Attempt, Dauer, Fehler)
- `llm_calls` (Modell, Tokens, Kosten, Cache-Trefferquote, Latenz)
- OTel-Span mit `book_id`, `chapter_no`, `operation`, `prompt_version` als Attributen

Die drei Kennzahlen, die im Dashboard oben stehen:
1. **Kapitel pro Stunde** (Durchsatz)
2. **Reparaturrate** (Anteil Kapitel mit ≥ 1 Repair-Zyklus)
3. **Kosten pro 10.000 Wörter**

Steigt (2) oder (3) sprunghaft, ist meist eine Prompt- oder Modelländerung schuld — deshalb
sind beide immer nach `prompt_version` und `model_id` segmentiert.
