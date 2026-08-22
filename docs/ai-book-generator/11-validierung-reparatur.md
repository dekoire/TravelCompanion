# 11 — Validierung, Reparatur, Audits

## 1. Issue-Objekt (einheitlich für alle Prüfungen)

```jsonc
{
  "issueId": "iss_0912",
  "bookId": "b_…", "chapterNo": 14, "sceneIndex": 41,
  "category": "timeline",              // §1.1
  "code": "impossible_travel",
  "severity": "high",                  // block | high | medium | low | info
  "detector": "deterministic",         // deterministic | semantic | audit | user
  "confidence": 1.0,                   // deterministisch = 1.0
  "message": "June ist in 20 Minuten vom Leuchtturm zum Hafen gelangt (min. 45 Minuten zu Fuß).",
  "evidence": [
    { "chapterNo": 14, "quote": "Zwanzig Minuten später stand sie am Kai.",
      "start": 6120, "end": 6162, "role": "violation" },
    { "chapterNo": 3,  "quote": "Der Weg zum Hafen dauerte gut eine Stunde.",
      "start": 1810, "end": 1855, "role": "contradicts" }
  ],
  "canonRef": { "kind": "travel_time", "id": "lighthouse__harbor" },
  "suggestedFix": {
    "strategy": "paragraph_rewrite",
    "target": { "sceneIndex": 41, "charStart": 6050, "charEnd": 6300 },
    "instruction": "Setze den Zeitsprung auf mindestens eine Stunde ODER lasse sie reiten."
  },
  "downstreamRisk": { "chapters": [15, 16], "reason": "Ankunftszeit beeinflusst Nachtszene" },
  "status": "open",                    // open | repairing | fixed | accepted | wont_fix | escalated
  "repairAttempts": 0,
  "detectedInRun": "run_…"
}
```

`evidence` mit **zwei** Rollen (`violation` + `contradicts`) ist entscheidend gegen
Falschmeldungen: Ein semantischer Prüfer, der keine widersprechende Stelle nennen kann, hat
meistens nichts gefunden.

### 1.1 Kategorien

`facts` · `timeline` · `location` · `possession` · `knowledge` · `character_voice` ·
`character_consistency` · `relationship` · `world_rule` · `plot` · `thread` · `clue` ·
`structure` · `style` · `repetition` · `pacing` · `length` · `dialogue` · `pov` · `tense` ·
`rating` · `meta_text` · `nonfiction_claim` · `terminology` · `redundancy` · `technical`

## 2. Deterministische Checks (kein LLM, laufen immer, kosten nichts)

### 2.1 Struktur und Technik
| Code | Regel |
|---|---|
| `scene_marker_missing` | Nicht alle `sceneIds` der Card im Text |
| `scene_order_wrong` | Marker-Reihenfolge ≠ Card |
| `meta_text_detected` | Muster aus [08](08-generierung.md) §8 |
| `placeholder_detected` | `[Name]`, `TODO`, `XXX`, `Lorem` |
| `truncated_output` | `finishReason = length` und kein `<<<END>>>` |
| `empty_scene` | Szene < 40 % ihres Budgets |
| `external_url` | URL/E-Mail im Prosatext (Injection-/Leak-Signal) |

### 2.2 Länge
| Code | Regel |
|---|---|
| `chapter_too_short` / `chapter_too_long` | außerhalb `wordCorridor` (±10 % warn, ±20 % block-repair) |
| `scene_length_skew` | eine Szene > 55 % des Kapitels bei ≥ 3 Szenen |
| `book_length_drift` | Hochrechnung > 12 % vom Ziel (nur Warnung an Nutzer) |

### 2.3 Namen, Glossar, Terminologie
| Code | Regel |
|---|---|
| `forbidden_name_variant` | Treffer in `glossary.forbiddenVariants` |
| `unknown_proper_noun` | Großgeschriebenes Wort (nicht satzinitial, nicht im Wörterbuch, nicht im Glossar), ≥ 2 Vorkommen → Kandidat für Canon-Aufnahme oder Tippfehler |
| `name_near_miss` | Trigramm-Ähnlichkeit 0,72–0,95 zu einem Glossarnamen ("Ardmore" vs. "Ardmoor") |
| `term_used_before_defined` | Non-Fiction, siehe [05](05-planung-nonfiction.md) §6.1 |

### 2.4 State-Transitionen (Kern des Systems)
Auswertung der Scene-Card-Ausdrücke gegen den gefoldeten State:
| Code | Regel |
|---|---|
| `precondition_violated` | Preconditions bei Szenenbeginn nicht erfüllt |
| `required_change_missing` | `requiredChanges` nach der Szene nicht erfüllt |
| `forbidden_change_occurred` | `forbiddenChanges` eingetreten → **block** |
| `required_event_missing` | siehe [10](10-extraktion.md) §4 |
| `forbidden_event_occurred` | → **block** |
| `immutable_attribute_changed` | Änderung an `appearance.immutable` (Augenfarbe!) → **block** |
| `lost_object_used` | Gegenstand mit `status = lost/destroyed` wird benutzt → **block** |
| `object_bilocation` | Objekt gleichzeitig bei zwei Besitzern → **block** |
| `dead_character_acts` | → **block** |
| `character_bilocation` | → **block** |
| `injury_ignored` | schwere Verletzung, aber volle körperliche Aktion |
| `ability_appeared` | Fähigkeit genutzt, die nie etabliert wurde |
| `world_rule_violated` | `checkExpressions` einer Regel verletzt (Magie ohne Kosten) |

### 2.5 Zeit
`time_reversal` · `impossible_travel` · `age_inconsistency` · `time_of_day_mismatch` ·
`duration_implausible` (Szenendauer vs. Wortzahl/Ereignisdichte) · `gap_mismatch`
(Textangabe vs. `timeGapFromPrevMinutes`). Algorithmen: [07](07-state-memory.md) §8.2.

### 2.6 Wissen und Beziehung
`knowledge_leak` · `premature_reveal` · `unmotivated_relationship_shift` ·
`relationship_yo_yo` · `illegal_address_shift` · `address_name_wrong`
(Figur nennt eine andere anders als in `addressNames` festgelegt).

### 2.7 Threads
`thread_silent_too_long` · `obligation_unmet` · `thread_resolved_without_setup` ·
`clue_dangling` (auffälliger Clue ohne Payoff) · `payoff_without_setup` → **block im Audit**.

### 2.8 Stil und Wiederholung
| Code | Messung |
|---|---|
| `pov_drift_candidate` | Innensicht-Marker mit fremdem Subjekt (§Erstfilter) |
| `tense_drift` | Anteil Präsens-Finitverben im Erzähltext > 15 % bei `tense = past` (Dialog/Zitate ausgenommen) |
| `sentence_length_drift` | Ø-Satzlänge weicht > 35 % von der Kalibrierungsprobe ab |
| `paragraph_length_drift` | analog |
| `phrase_overuse` | n-Gramm (3–6) mit > 4 Vorkommen im Buch **und** > 2 im Kapitel |
| `gesture_overuse` | kuratierte Gestenliste (nickte, atmete tief durch, Schauer über den Rücken …) über Schwelle |
| `dialogue_tag_monotony` | > 85 % identischer Tag ODER > 2 exotische Tags/Kapitel |
| `adverb_density` | Adverbien auf `-lich/-weise/-lig` > X pro 1.000 Wörter |
| `opening_similarity` | Trigramm-Jaccard der ersten 200 Wörter > 0,32 zu einem der letzten 5 Kapitel → dann Embedding-Cosinus > 0,88 → Issue |
| `name_near_miss` | **Editierdistanz** ≤ Budget (längenabhängig, max. 2) oder Trigramm-Jaccard 0,72–0,99. Bei kurzen Eigennamen entscheidet die Editierdistanz: „Ardmore"/„Ardmoor" kommt auf nur 0,4 Jaccard, weil zwei abweichende Trigramme bei sieben Zeichen zu stark wiegen. |
| `opening_type_repeat` | `openingType` = einer der letzten 3 |
| `metaphor_domain_overuse` | > 40 % der Bilder aus einer Domäne |
| `sensory_imbalance` | Abweichung > 20 Punkte vom `sensoryBalance` |
| `summary_instead_of_scene` | Anteil Erzählbericht (Vergangenheits-Iterativ, "immer wieder", "in den nächsten Tagen") > 25 % |

### 2.9 Dialog (exakte Definition)
```ts
function dialogueRatio(text: string, locale: LocaleProfile): number {
  const stripped = removeThoughtMarkup(text);       // *kursiv* = Gedanke, zählt nicht
  const total = stripped.replace(/\s/g, '').length;
  let inside = 0;
  for (const [open, close] of locale.quotePairs) {   // erster passender Stil gewinnt
    const hit = charsBetween(stripped, open, close);
    if (hit > 0) { inside = hit; break; }
  }
  return inside / total;
}
```

**Gemischte Anführungszeichen müssen toleriert werden.** Modelle liefern regelmäßig `„Text"`
statt `„Text“`. Wer nur das exakte Paar sucht, misst den Dialoganteil als 0 und repariert
danach das falsche Problem. Der Matcher akzeptiert deshalb je Öffnungszeichen mehrere
zulässige Schlusszeichen; die Typografie wird separat geprüft und im Renderer vereinheitlicht.
Implementierung: [`packages/domain/src/text.ts`](../../book-generator/packages/domain/src/text.ts).
Issue `dialogue_ratio_out_of_corridor`, wenn außerhalb `card.dialogueCorridor`
(Toleranz ±0,05). Zusätzlich `dialogue_monotony`, wenn die Standardabweichung des
Dialoganteils über die letzten 8 Kapitel < 0,05 ist — dann klingt jedes Kapitel gleich.

### 2.10 Rating
`rating_violation` je Achse, siehe [03](03-bookspec.md) §5.1. Bei `hardBlocks`: **kein Commit**.

## 3. Phrasenstatistik (Implementierung)

```sql
-- phrase_statistics: (book_id, ngram, n, count, chapters int[], last_seen_chapter)
-- Nach jedem Commit inkrementell:
--   Text normalisieren (lowercase, unaccent, Satzzeichen entfernen)
--   Stoppwort-Sequenzen ausschließen
--   n-Gramme 3..6 zählen, nur solche mit >= 2 Inhaltswörtern
```

Für den nächsten Kontext:
```sql
SELECT ngram FROM phrase_statistics
WHERE book_id = $1 AND count >= 4 AND n >= 3
ORDER BY count DESC, n DESC LIMIT 15;
```
Diese 15 Phrasen gehen als Negativliste in `[N]`. Zusätzlich fließen sie in die
Qualitätsmetrik `repetition_index`.

**Wichtig:** Eigennamen, feststehende Wendungen der Erzählwelt und bewusste Motive
(`style.imagery.domains`, `leitmotifs`) werden ausgeschlossen — sonst verbietet das System
dem Buch sein eigenes Motiv.

## 4. Semantische Checks (LLM, ein Call pro Kapitel)

Läuft **nur**, wenn keine `block`-Issues offen sind (sonst repariert man auf falscher Basis).

Input: Kapiteltext + Chapter Card + relevanter State + Voice Profiles der sprechenden Figuren
+ letzte Kapitel-Summary. **Nicht** der ganze Canon.

Prüfliste (im Prompt als nummerierte Fragen, Antwort als Array von Issues):
1. Erfüllt das Kapitel seine `primaryFunction` erkennbar?
2. Handelt jede Figur ihrer Motivation und ihrem Wissensstand entsprechend?
3. Gibt es Wirkung ohne Ursache?
4. Verhält sich jemand unlogisch, ohne dass der Text es motiviert?
5. Erscheinen Fähigkeiten, Gegenstände oder Wissen ohne Herkunft?
6. Werden Weltregeln oder soziale Normen verletzt?
7. Klingt eine Figurenstimme unpassend? (Voice Profile beigefügt)
8. Driftet Ton oder Erzähldistanz?
9. Ist die emotionale Entwicklung motiviert?
10. Passt der Kapitelanfang zum Ende des Vorkapitels?
11. Ist das Kapitel dramaturgisch notwendig oder Füllmaterial?
12. Wird etwas erzählt, was gezeigt werden müsste (oder umgekehrt)?

**Anti-Falschmeldungs-Regeln im Prompt:**
- *"Melde ein Problem nur, wenn du eine konkrete Textstelle zitieren kannst."*
- *"Melde nichts, was nur Geschmacksfrage ist."*
- *"Wenn der Kontext eine Erklärung enthält, ist es kein Fehler."*
- *"Maximal 6 Befunde. Priorisiere nach Schwere."*
- `confidence` ist Pflichtfeld; < 0,6 wird verworfen.

Alle Zitate werden gegroundet (§10-Verfahren). Ein Zitat, das nicht im Text steht, disqualifiziert
den Befund automatisch — das eliminiert erfahrungsgemäß den größten Teil der Falschmeldungen.

## 5. Reparatur-Ladder

```
Stufe 0  KEIN LLM        Deterministisch fixbar? (Namensvariante, Anführungszeichen,
                          Zahlwortstil, doppelte Leerzeile, Marker) → Textersetzung
Stufe 1  SATZ            1–2 Sätze neu, ±150 Wörter Kontext
Stufe 2  ABSATZ          betroffener Absatz neu, ±400 Wörter Kontext
Stufe 3  SZENE           ganze Szene neu, mit Pre/Postconditions als harte Vorgabe
Stufe 4  KAPITEL         komplette Neugenerierung (max. 1× pro Kapitel)
Stufe 5  PLAN            Chapter Card ändern und neu schreiben (nur im Audit)
Stufe 6  NEEDS_REVIEW    Nutzer entscheidet
```

Auswahl der Stufe (deterministisch nach `suggestedFix.strategy` + Anzahl Issues):
```ts
if (issues.every(i => i.autoFixable))                 return 0;
if (issues.length <= 2 && allWithinOneParagraph)      return 2;
if (issuesTouchMultipleScenes)                        return 3; // pro betroffener Szene
if (blockIssues >= 3 || cardComplianceFailed)         return 4;
```

### 5.1 Repair-Prompt (Aufbau)

```
## AUFGABE
Überarbeite AUSSCHLIESSLICH den markierten Bereich.

## ZU BEHEBENDE PROBLEME
1. [timeline/impossible_travel] June kann den Weg nicht in 20 Minuten schaffen (min. 45).
   Belegstelle: "Zwanzig Minuten später stand sie am Kai."
   Vorgabe: Zeitangabe auf mindestens eine Stunde ändern.

## UNVERÄNDERLICH
- Alle Ereignisse dieser Szene bleiben erhalten: [Liste]
- Alle Fakten bleiben: [Liste]
- Stil, Perspektive, Zeitform bleiben.
- Länge: 240–280 Wörter (aktuell 260).

## KONTEXT VOR
…400 Wörter…
## ZU ERSETZEN
…markierter Bereich…
## KONTEXT NACH
…400 Wörter…

## AUSGABE
Nur der ersetzte Bereich. Kein Kommentar.
```

### 5.2 Nach jeder Reparatur (Pflichtsequenz)

```
1. Text zusammensetzen, Wortzahl prüfen
2. Deltas für die betroffene(n) Szene(n) NEU extrahieren
3. Grounding
4. Diff gegen vorherige Deltas:
     - verschwundene Pflicht-Events    → Reparatur verworfen, Stufe erhöhen
     - neue, ungeplante Fakten          → prüfen, ggf. verwerfen
5. Deterministische Checks erneut (alle, nicht nur den reparierten)
6. Nur wenn das ursprüngliche Issue weg ist UND kein neues block-Issue entstand: übernehmen
7. Sonst: Rollback auf den vorherigen Draft, Stufe erhöhen
```

Schritt 6 verhindert "Reparatur erzeugt neue Fehler" — die häufigste Ursache für
Endlosschleifen in solchen Systemen.

## 6. Budgets und Abbruch

| Grenze | Wert |
|---|---|
| Reparaturversuche pro Issue | 2 |
| Reparaturversuche pro Szene | 3 |
| Reparaturversuche pro Kapitel (gesamt) | 5 |
| Komplette Kapitel-Neugenerierungen | 1 |
| Tokenbudget pro Kapitel inkl. Reparatur | 3,5 × Erstgenerierungskosten |
| Zeitbudget pro Kapitel | 25 Minuten |

Bei Erreichen: `chapter.status = 'needs_review'`, Issue-Liste an den Nutzer, Workflow pausiert
(oder läuft mit `continue_with_warnings` weiter, wenn der Nutzer das vorab erlaubt hat).

**Nicht-blockierende Issues** (`low`, `info`, Stil-Warnungen) werden gesammelt und nur im
Act-Audit gebündelt behandelt — sonst frisst Mikro-Optimierung das Budget.

## 7. Invalidations-Kaskade bei Nutzeränderungen

Der Nutzer editiert Kapitel 8, nachdem Kapitel 20 fertig ist.

```ts
async function handleUserEdit(chapterNo: number, newText: string) {
  // 1. Neue Version anlegen (alte bleibt)
  const cv = await createChapterVersion(chapterNo, newText, { source: 'user' });

  // 2. Neu extrahieren + grounden
  const newDeltas = ground(await extractDeltas(splitScenes(newText), ctx));

  // 3. Delta-Diff berechnen
  const diff = diffDeltas(oldDeltas, newDeltas);
  //    → added, removed, changed  je Fakt/Event/Wissen/Beziehung/Thread

  // 4. Klassifizieren
  if (diff.isEmpty()) return { impact: 'cosmetic' };        // reine Stiländerung → fertig

  // 5. Betroffene Kapitel bestimmen — EXAKT, über Read-Sets
  const changedIds = diff.affectedCanonIds();               // Fakt-IDs, Event-IDs, …
  const impacted = await sql`
    SELECT DISTINCT chapter_no FROM scene_context_log
    WHERE book_version_id = ${bvId}
      AND chapter_no > ${chapterNo}
      AND read_set_ids && ${changedIds}                     -- GIN-Index auf read_set_ids
    ORDER BY chapter_no`;

  // 6. Transitiv schließen: Kapitel, die von Fakten abhängen, die diese Kapitel geändert haben
  const closure = transitiveClosure(impacted, readWriteGraph);

  // 7. Status setzen
  for (const c of closure) await setStatus(c, 'stale');

  // 8. Prüfen statt neu schreiben
  for (const c of closure) {
    const conflicts = recheckAgainstNewState(c);            // deterministisch, billig
    if (conflicts.length === 0)   await setStatus(c, 'committed');   // nichts zu tun
    else                          await enqueueTargetedRepair(c, conflicts);
  }
}
```

**Der Gewinn:** Bei einer typischen Änderung ("Junes Mantel ist blau statt grau") sind
0–2 Kapitel betroffen statt 12. Ohne Read-Sets wäre das nicht berechenbar.

### 7.1 Impact-Klassen (für die UI)

| Klasse | Bedingung | Folge |
|---|---|---|
| `cosmetic` | keine Delta-Änderung | nichts |
| `local` | nur Fakten mit `valid_until_scene` innerhalb desselben Kapitels | nichts |
| `forward` | Fakten mit offener Gültigkeit geändert | Read-Set-Traversal |
| `structural` | Pflicht-Event entfernt / Thread-Status geändert | Plan-Prüfung + Audit |
| `blocking` | Ending-Contract-relevanter Fakt geändert | Nutzerbestätigung erforderlich |

Die UI zeigt **vor** dem Speichern: *"Diese Änderung betrifft voraussichtlich 3 spätere
Kapitel (14, 17, 22). Geschätzte Kosten der Anpassung: 0,42 €."*

## 8. Zwischen-Audits

| Zeitpunkt | Umfang | Modell | Fokus |
|---|---|---|---|
| Nach jedem Kapitel | Kapitel | CRITIC | §4 |
| Nach jedem Act | Act-Volltext + strukturierte Daten | AUDITOR | Bogen, Motivation, Pacing, Wiederholung, Figurenentwicklung |
| Bei ~50 % (**Pflicht ab M**) | Bisheriges Buch, komprimiert + volle Struktur | AUDITOR | Richtungsverlust, Wiederholung von Konflikten, Thread-Vernachlässigung, Spannungsverlauf |
| Vor dem Climax | Threads + Clues + Ending Contract (nur Daten) | AUDITOR | Ist alles vorbereitet, was der Climax braucht? |
| Nach Act 1 | + Nutzerfreigabe | — | Kurskorrektur, bevor sie teuer wird |

**Midpoint-Audit ist Pflicht**, weil Fehler in der Buchmitte empirisch am häufigsten sind und
dort noch günstig zu beheben. Er darf Chapter Cards der zweiten Hälfte ändern (Stufe 5).

## 9. Finale Audits (vier getrennte Läufe)

| # | Basis | Prüft |
|---|---|---|
| **A1** | Volltext, **act-weise** | Handlung, Motivation, Figuren, Stil, Pacing innerhalb des Acts |
| **A2** | Nur strukturierte Daten (kein Prosatext!) | Timeline, Fakten, Besitz, Wissen, Beziehungen, Threads, Clues — überwiegend deterministisch, LLM nur für Plausibilität |
| **A3** | Volltext global (komprimiert: alle Kapitel-Summaries + Anfänge/Enden + Climax/Ende im Original) | Gesamtwirkung, Act-Übergänge, Aufbau zum Ende, Wiederholungen, Stimme |
| **A4** | Ending Contract vs. tatsächliches Ende | Hauptfrage beantwortet? Bögen geschlossen? Pflicht-Threads? Clues eingelöst? Emotion erreicht? `forbiddenEndings` vermieden? |

Ein einziger "prüfe alles"-Call wäre billiger und **nutzlos**: Er findet nichts Spezifisches,
weil der Kontext zu groß und die Aufgabe zu unscharf ist.

A2 ist zu ~80 % deterministisch (die Checks aus §2 über das ganze Buch statt pro Kapitel)
und deshalb der zuverlässigste Audit.

## 10. Canon-Rebuild nach den finalen Reparaturen

Nach allen Reparaturen wird der Canon **aus dem tatsächlichen Endtext neu aufgebaut**:

```
1. Alle chapter_versions mit is_current = true laden
2. Extraktion neu über alle Kapitel (EXTRACTOR, günstig, parallelisierbar — Text ist final)
3. Grounding
4. Neues Ledger in einer neuen canon_generation (alte bleibt für Audit-Trail)
5. Fold → finaler State
6. A2-Checks gegen den NEUEN Canon
7. Differenz zum alten Canon protokollieren: Abweichungen sind Hinweise auf
   Extraktions- oder Reparaturfehler → Qualitätsmetrik
```

Erst danach werden Klappentext, Metadaten und Cover erzeugt — die basieren dann garantiert
auf dem echten Buch, nicht auf dem Plan.

## 11. Was passiert bei unlösbaren Fällen

```
Kapitel bleibt nach allen Stufen fehlerhaft
  → status = 'needs_review'
  → Issue-Liste mit Zitaten und Vorschlägen an den Nutzer
  → Optionen in der UI:
      (a) Vorschlag X anwenden (ein weiterer gezielter Repair-Call)
      (b) selbst editieren (Editor mit markierten Stellen)
      (c) Kapitel akzeptieren wie es ist  → Issue auf 'accepted', Kaskade wird informiert
      (d) Kapitel neu generieren mit geänderter Chapter Card
      (e) Plan ändern (Chapter Card editieren) und neu schreiben
  → Workflow wartet (step.waitForEvent, Timeout 14 Tage → Buch pausiert)
```

Ein Buch darf nie stillschweigend mit einem `block`-Issue fertig werden. Wenn der Nutzer
(c) wählt, wird das Issue im Export-Bericht als bekannte Abweichung ausgewiesen.
