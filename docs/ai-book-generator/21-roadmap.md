# 21 — Umsetzungsreihenfolge, Aufwand, Risiken

## 1. Grundprinzip der Reihenfolge

Nicht "Feature für Feature", sondern **die dünnste Kette zuerst, die ein echtes Buch erzeugt**,
danach Qualität, danach Umfang. Der häufigste Fehler bei solchen Systemen ist, ein perfektes
Datenmodell zu bauen, bevor ein einziges Kapitel existiert.

## 2. Meilensteine

### M0 — Fundament (1–2 Wochen)
- Monorepo, Next.js auf Vercel, Supabase-Projekt, Auth, RLS-Grundmuster
- `packages/domain` mit Wortzählung, Größenklassen, Budget-Mathematik + Unit-Tests
- `packages/llm` Gateway mit **Mock-Provider** und einem echten Provider
- Inngest angebunden, ein Dummy-Workflow läuft durch
- Migrationen: `profiles`, `books`, `book_versions`, `book_specs`, `generation_jobs`, `llm_calls`

**Definition of Done:** Ein Klick erzeugt ein Buch mit Status `spec_ready`, ein Inngest-Lauf
schreibt einen Testeintrag, RLS verhindert Fremdzugriff (Test vorhanden).

### M1 — Erstes echtes Buch, dünn (2–3 Wochen)
- Wizard (minimal: Idee, Genre, Umfang, Sprache)
- `deriveSpec` + `validateSpec` vollständig (das ist billig und verhindert später viel Ärger)
- Planung: Prämisse → Bible (reduziert) → **eine** Outline → Chapter Cards
- Kapitelgenerierung sequenziell, Ein-Call-Modus
- Kein Canon-Ledger, nur Kapitel-Summaries als Gedächtnis
- Deterministische Checks: Länge, Meta-Text, Marker, Truncation
- Export: nur TXT

**Definition of Done:** Eine 12.000-Wörter-Novelle läuft von der Idee bis zum lesbaren Text
durch, ohne manuellen Eingriff. Sie ist noch nicht konsistent — das ist okay.

**Warum jetzt schon ein ganzes Buch:** Alle Annahmen über Laufzeit, Kosten, Kontextgröße und
Modellverhalten werden hier zum ersten Mal falsifiziert. Je später das passiert, desto teurer.

### M2 — Canon und Konsistenz (3–4 Wochen) — der Kern
- Entities, `entity_facts`, `events`, `state_snapshots`, Fold
- Delta-Extraktion + **Quote-Grounding**
- Scene Cards mit Pre-/Postconditions + Bedingungs-Parser
- Deterministische Checks: State-Transitionen, Zeit, Bilokation, Besitz, unveränderliche Attribute
- Repair-Ladder Stufen 0–3
- Context Builder mit Read-Set-Protokollierung
- Golden-Fixtures für die Extraktion

**Definition of Done:** Testbuch T1 wird generiert; alle injizierten deterministischen Fallen
werden erkannt und lokal repariert. `extractionGroundingRate > 0,92`.

### M3 — Erzählqualität (2–3 Wochen)
- Ending Contract vor der Outline
- Zwei Outline-Varianten + Outline-Lint + Nutzerauswahl
- Stil-Kalibrierung über Kapitel 1
- Style Profile mit messbaren Zielwerten + Stil-Checks
- Phrasenstatistik + Negativliste
- Thread-Register + Obligation-Scheduler
- Wissens-Ledger + POV-Filter
- Beziehungen mit Event-Pflicht
- Handshake zwischen Kapiteln

**Definition of Done:** Testbücher T2, T4, T5 bestehen; `repetitionIndex < 2,0`;
`openingTypeEntropy > 1,8`.

### M4 — Audits und Human-in-the-Loop (2 Wochen)
- Semantische Kapitel-Checks mit Zitatpflicht
- Act-Audits, Midpoint-Audit, Pre-Climax-Audit
- Checkpoints (Outline, Stil, Act 1) mit `waitForEvent`
- `needs_review`-Flow inkl. UI
- Finale Audits A1–A4 + Canon-Rebuild

**Definition of Done:** Ein 80.000-Wörter-Roman läuft mit drei Nutzerentscheidungen durch;
`consistencyErrorsPer10k < 0,3`.

### M5 — Nutzeränderungen (1–2 Wochen)
- Editor, Kapitelversionen, Diff
- Delta-Diff + Impact-Klassifikation
- Invalidations-Kaskade über Read-Sets
- Vorab-Impact-Anzeige mit Kostenprognose

**Definition of Done:** Testfall T9 besteht — eine Änderung in Kapitel 4 markiert exakt die
abhängigen Kapitel, nicht alle.

### M6 — Produkt (2–3 Wochen)
- Metadaten, Klappentext, Kategorien-Mapping
- Cover (Bild + Typo-Overlay + Varianten)
- EPUB + PDF (digital) + DOCX, `epubcheck`-Gate
- Credits, Stripe, Reservierung, Abrechnung
- Benachrichtigungen
- Canon-Ansicht (Figuren, Timeline, Threads)

**Definition of Done:** Ein Nutzer kann ohne Support ein Buch kaufen, erzeugen, lesen,
herunterladen.

### M7 — Skalierung und Ausbau (fortlaufend)
- Non-Fiction-Track
- Größe XL (Parts, Memory-Kompaktierung, Serien)
- Kapitelbilder mit Konsistenzmechanik
- Hörbuch
- PDF-Print/KDP
- Weitere Sprachen
- Modell-Optimierung je Capability

## 3. Aufwandsschätzung

| Meilenstein | Aufwand (1 erfahrene Person) | Mit 2 Personen |
|---|---|---|
| M0 | 1,5 Wochen | 1 Woche |
| M1 | 3 Wochen | 2 Wochen |
| M2 | 4 Wochen | 2,5 Wochen |
| M3 | 3 Wochen | 2 Wochen |
| M4 | 2 Wochen | 1,5 Wochen |
| M5 | 2 Wochen | 1,5 Wochen |
| M6 | 3 Wochen | 2 Wochen |
| **MVP (M0–M6)** | **~18,5 Wochen** | **~12,5 Wochen** |
| M7 (je Modul) | 1–3 Wochen | |

Hinzu kommen **Eval-Kosten**: Ab M2 laufen nächtlich Testbücher. Rechne mit 300–900 € pro
Monat an Modellkosten allein für Tests. Das ist kein Nebenposten, sondern Teil des Budgets.

## 4. Risiken

| # | Risiko | Wahrsch. | Wirkung | Gegenmaßnahme |
|---|---|:--:|:--:|---|
| R1 | **Extraktion ist unzuverlässig** → alle Checks wertlos | mittel | sehr hoch | Quote-Grounding ab M2, Golden-Fixtures, `groundingRate` als Alarm |
| R2 | Vercel-Laufzeitlimit reißt bei langen Kapiteln | hoch | mittel | Step-Zuschnitt < 600 s, Streaming-Partials, Container-Fallback |
| R3 | Kosten pro Buch höher als kalkuliert | hoch | hoch | Deutsche Token-Rate, Caching-Disziplin, Budget-Hard-Stop, Credit-Modell mit Marge |
| R4 | Modell-Update ändert Stimme mitten im Buch | mittel | hoch | Modell-Snapshot pro Buch, `canary`-Rollout, Pinning |
| R5 | Semantische Checks melden zu viel Falsches | hoch | mittel | Zitatpflicht + Grounding + `confidence`-Schwelle + max. 6 Befunde |
| R6 | Reparaturen erzeugen neue Fehler | mittel | hoch | Pflichtsequenz nach Reparatur ([11](11-validierung-reparatur.md) §5.2), Rollback bei Verschlechterung |
| R7 | Mittelteil wird langweilig (kein technischer Fehler) | hoch | mittel | Midpoint-Audit, Thread-Scheduler, Tension-Kurve, Opening-Rotation |
| R8 | Nutzer erwartet Ergebnis in Minuten | hoch | mittel | Ehrliche Zeitangabe vor dem Start, Kapitel sofort lesbar, Push-Benachrichtigung |
| R9 | Rechtliche Anforderungen (Kennzeichnung, Plattformregeln) ändern sich | mittel | mittel | Disclaimer und Metadaten zentral konfigurierbar, nicht hartkodiert |
| R10 | Prompt-Injection über Buchidee | mittel | mittel | Schichtung, Neutralisierung, Zufalls-Delimiter, Output-Leak-Check |
| R11 | Datenbank wächst unkontrolliert | mittel | niedrig | Retention-Cron ab M2 |
| R12 | Provider-Ausfall | mittel | mittel | Fallback-Bindings, Circuit Breaker, Wiederaufnahme |

## 5. Die drei Dinge, die den Erfolg entscheiden

1. **Quote-Grounding der Extraktion.** Ohne das ist der ganze Konsistenzapparat Theater.
   Es ist gleichzeitig der billigste Teil (reiner Code) — und wird deshalb gerne übersprungen.

2. **Read-Set-Protokollierung ab dem ersten Kapitel.** Nachträglich lässt sich das nicht
   rekonstruieren. Wer es weglässt, kann Nutzeränderungen später nur mit Vollneugenerierung
   beantworten, und das Produkt ist dann nicht mehr wirtschaftlich.

3. **Deterministisch, wo immer möglich.** Jede Entscheidung, die ein LLM trifft, obwohl Code
   sie treffen könnte, kostet dauerhaft Geld, Reproduzierbarkeit und Vertrauen.
   Die Matrix in [12](12-ai-vs-deterministisch.md) ist deshalb kein Stildokument, sondern
   die Grundlage der Wirtschaftlichkeit.

## 6. Was man bewusst weglassen sollte (MVP)

| Weglassen | Warum |
|---|---|
| Mehrsprachigkeit außer DE/EN | Jede Sprache braucht eigene Locale-Regeln und Tests |
| Hörbuch | Größter Kostenposten, kleinster Anteil der Nutzer am Anfang |
| XL-Bücher (> 150k) | Memory-Kompaktierung ist eigene Komplexitätsklasse |
| Serien | Erst sinnvoll, wenn Einzelbücher zuverlässig sind |
| Multi-POV rotierend | Wissensfilter pro POV ist fehleranfällig; erst mit stabilem Ledger |
| Kollaboration/Mehrbenutzer pro Buch | Locking und Konfliktauflösung verdoppeln die Komplexität |
| Eigene Modell-Feinabstimmung | Prompt- und Pipeline-Arbeit bringt zehnmal mehr pro Aufwand |

Alles davon ist im Datenmodell **vorgesehen** (Serien-Tabellen, `povMode`, `parts`), aber
nicht implementiert. Das ist der richtige Kompromiss: keine Migration später, kein Aufwand jetzt.
