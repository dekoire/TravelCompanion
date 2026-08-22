# 12 — Wann AI, wann Code: vollständige Entscheidungsmatrix

## 1. Die Entscheidungsregel

```
Nutze KEIN LLM, wenn …
  … das Ergebnis aus vorhandenen Daten berechenbar ist          (Wortzahl, Budgets, Anker)
  … die Regel formalisierbar ist                                (Preconditions, Reisezeit)
  … Reproduzierbarkeit garantiert sein muss                     (Preis, Kapitelanzahl)
  … ein Fehler teuer und unbemerkt wäre                         (Idempotenz, Abrechnung)
  … es um Vergleich, Zählen, Sortieren, Suchen geht             (Phrasen, Ähnlichkeit)
  … Latenz oder Kosten je Aufruf relevant sind und der Fall häufig ist

Nutze ein LLM, wenn …
  … Sprache erzeugt oder verstanden werden muss
  … Bedeutung statt Form beurteilt wird                         ("ist die Motivation glaubhaft?")
  … die Regel nicht vollständig formalisierbar ist
  … es um Kreativität, Variation, Stil geht
  … unstrukturierter Text in Struktur überführt wird            (Extraktion)

Nutze BEIDES, wenn …
  … Code die Kandidaten findet und das LLM sie beurteilt        (Zwei-Stufen-Filter)
  … das LLM vorschlägt und Code validiert                       (Structured Output + Zod + Grounding)
```

**Faustregel für die Kostenseite:** Jeder LLM-Call, der pro Kapitel läuft, wird bei einem
30-Kapitel-Buch 30-mal bezahlt. Ein Check, der 200 Tokens kostet, kostet über ein Buch nichts —
ein Check, der 20.000 Tokens Kontext braucht, kostet mehr als das Kapitel selbst.

## 2. Vollständige Matrix

Legende: **C** = deterministischer Code · **L** = LLM · **C→L** = Code filtert, LLM entscheidet ·
**L→C** = LLM erzeugt, Code validiert

### 2.1 Eingabe und Spezifikation

| Operation | Wahl | Begründung |
|---|:--:|---|
| Wizard-Eingaben validieren (Typen, Ranges) | **C** | Zod-Schema |
| Größenklasse bestimmen | **C** | Tabellen-Lookup |
| Kapitelanzahl/Wortverteilung berechnen | **C** | Arithmetik — ein LLM würde hier raten |
| Act-Budgets, Szenenkorridore | **C** | Arithmetik |
| Token-/Kostenschätzung | **C** | Formel × Preisliste |
| Unmögliche Kombinationen blockieren | **C** | Regeltabelle mit Patch-Vorschlägen |
| Genre↔Ende-Widerspruch erkennen (`W008`) | **L** | Semantik, nur Warnung |
| Nutzerfreitext moderieren | **C→L** | Lexikon-Prefilter, dann Classifier |
| Sprache der Eingabe erkennen | **C** | Bibliothek (franc/CLD) |
| Titelvorschläge | **L** | Kreativ |

### 2.2 Planung

| Operation | Wahl | Begründung |
|---|:--:|---|
| Prämisse, Kernkonflikt | **L** | Kreativ |
| Story-Bible, Weltregeln | **L→C** | LLM erzeugt, Code prüft Vollständigkeit (jede Regel braucht `cost`/`limits`) |
| Figuren, Voice Profiles | **L→C** | Code prüft Pflichtfelder + Namenskollisionen |
| Ending Contract | **L** | Kreativ |
| Reisematrix zwischen Orten | **L→C** | LLM schätzt Distanzen, Code prüft Symmetrie/Plausibilität (min ≤ normal) |
| Act-Grenzen, Beat-Anker | **C** | Positionsformel |
| Kapitel→Act-Zuordnung | **C** | Arithmetik |
| Outline-Inhalt | **L** | Kreativ |
| Outline-Lint (Vollständigkeit, Summen, Thread-Abdeckung) | **C** | 11 Regeln, alle formalisierbar |
| Outline-Varianten vergleichen (UI-Diff) | **C** | Strukturvergleich |
| Chapter Cards inhaltlich | **L** | Kreativ |
| `requiredSetups` in Cards eintragen | **C** | Ableitung aus Ending Contract |
| Thread-Obligations planen | **C** | Scheduler-Algorithmus |
| Opening/Closing-Typ-Rotation | **C** | Zustandsautomat über die letzten n Kapitel |
| Tension-Zielkurve | **C** | Interpolation |
| Scene Cards inhaltlich | **L** | Kreativ |
| Pre-/Postconditions formulieren | **L→C** | LLM schreibt Ausdrücke, Parser validiert Grammatik |
| Szenen-Wortbudgets | **C** | Verteilung des Kapitelbudgets |
| Plan-Audit | **L** | Semantisch |

### 2.3 Generierung

| Operation | Wahl | Begründung |
|---|:--:|---|
| Kapitel-/Szenentext | **L** | Kernaufgabe |
| Modus-Wahl (ein Call vs. szenenweise) | **C** | Regelbaum |
| Kontext-Zusammenstellung | **C** | Query + Budget-Logik |
| Auswahl der Retrieval-Passagen | **C→L** | SQL/Vektor findet, kein LLM re-rankt (zu teuer pro Kapitel); Re-Ranking per Heuristik |
| Auswahl der Stil-Few-Shots | **C** | Metrik-basiert (§06 6.2) |
| Negativliste erzeugen | **C** | SQL über `phrase_statistics` |
| Szenen-Splitting an Markern | **C** | Regex |
| Meta-Text entfernen | **C** | Musterliste |
| Truncation erkennen | **C** | `finishReason` |
| Fortsetzung nach Truncation | **L** | Text |
| Overlap-Deduplizierung beim Stitching | **C** | Longest-Common-Substring |
| Naht-Glättung | **L** | Text |
| Prüfen, ob Glättung Fakten geändert hat | **C** | Delta-Diff |
| Wortzahl messen | **C** | `Intl.Segmenter` |
| Kürzen/Erweitern bei Abweichung | **L** | Text, mit deterministischer Zielvorgabe |
| Budget-Rebalancing | **C** | Formel |

### 2.4 Extraktion und Canon

| Operation | Wahl | Begründung |
|---|:--:|---|
| Ereignisse/Fakten aus Text extrahieren | **L→C** | Kernaufgabe des Extractors, danach Grounding |
| Zitat-Grounding | **C** | Substring/Fuzzy-Match — **nie** LLM |
| Fakten-Deduplizierung | **C** | Schlüsselvergleich (subject, predicate, value) |
| Neue Entität vs. Alias entscheiden | **C→L** | Trigramm/Levenshtein filtert, LLM nur bei Unklarheit |
| Kapitel-Summary | **L** | Sprachlich |
| State-Fold | **C** | SQL |
| Bedeutungs-Score neuer Nebenfiguren | **C** | Zählung × Gewichte |
| Kritische Zweitverifikation | **L** | Ja/Nein am Text |
| Verifikations-Zitat prüfen | **C** | Substring |
| Widersprüche zum Ausgangszustand melden | **L→C** | LLM meldet, Code prüft gegen State |

### 2.5 Validierung

| Operation | Wahl | Begründung |
|---|:--:|---|
| Wortzahl, Dialoganteil, Satzlänge, Absatzlänge | **C** | Messung |
| Preconditions/Postconditions/Forbidden | **C** | Ausdrucks-Auswertung |
| Bilokation, tote Figuren, verlorene Gegenstände | **C** | Mengenlogik über den State |
| Reisezeit, Zeitumkehr, Alter, Tageszeit | **C** | Arithmetik + Matrix |
| Unveränderliche Attribute (Augenfarbe) | **C** | Feldvergleich |
| Wissens-Leak | **C** | Ledger-Vergleich (Grundlage: extrahierte `utterances`) |
| Anredewechsel Du/Sie | **C** | Ledger + Event-Bedingung |
| Beziehungssprünge | **C** | Schwellenwerte + Event-Pflicht |
| Namensvarianten, Glossarverstöße | **C** | Textscan + Trigramm |
| Phrasenwiederholung, Gesten, Dialog-Tags | **C** | n-Gramm-Statistik |
| Kapitelanfang-Ähnlichkeit | **C→L** | Trigramm, dann Embedding; LLM nur zur Formulierung des Vorschlags |
| Perspektivwechsel | **C→L** | Marker-Regex filtert, LLM bestätigt |
| Zeitformwechsel | **C** | Verbformen-Statistik (sprachabhängig) |
| Weltregelverletzung (formalisiert) | **C** | `checkExpressions` |
| Weltregelverletzung (unscharf) | **L** | Semantik |
| Motivation, Kausalität, Figurenlogik | **L** | Semantik |
| Stimme unpassend | **C→L** | Verbotene Wörter + Metriken deterministisch, Rest LLM |
| Dramaturgische Funktion erfüllt | **L** | Semantik |
| Content-Rating | **C→L** | Lexikon, dann Classifier |
| Non-Fiction: Zahlen/Quellen-Risiko | **C→L** | Regex findet, LLM klassifiziert |
| Non-Fiction: Begriff vor Definition | **C** | Reihenfolgevergleich |
| Non-Fiction: Redundanz | **C** | SimHash |
| Falschmeldungen des Prüfers filtern | **C** | Zitat-Grounding + `confidence`-Schwelle |

### 2.6 Reparatur

| Operation | Wahl | Begründung |
|---|:--:|---|
| Reparaturstufe wählen | **C** | Regelbaum |
| Betroffenen Textbereich bestimmen | **C** | Offsets aus der Evidenz |
| Text reparieren | **L** | Sprache |
| Trivialfixes (Namensvariante, Quotes, Zahlwörter) | **C** | Textersetzung, kein LLM |
| Erfolgskontrolle nach Reparatur | **C** | Checks erneut + Delta-Diff |
| Rollback bei Verschlechterung | **C** | Vergleich |

### 2.7 Nutzeränderungen

| Operation | Wahl | Begründung |
|---|:--:|---|
| Delta-Diff alt/neu | **C** | Mengenoperationen |
| Impact-Klasse bestimmen | **C** | Regeln über den Diff |
| Betroffene Kapitel ermitteln | **C** | Read-Set-Traversal (SQL, GIN-Index) |
| Kostenprognose der Anpassung | **C** | Formel |
| Konfliktprüfung in Folgekapiteln | **C** | Checks gegen neuen State |
| Anpassungstext | **L** | Sprache |

### 2.8 Metadaten, Medien, Export

| Operation | Wahl | Begründung |
|---|:--:|---|
| Titel, Untertitel, Klappentext | **L** | Kreativ, aus dem Endtext |
| Kategorien/Keywords (KDP/BISAC) | **C→L** | LLM schlägt vor, Code mappt auf gültige Codes |
| Content-Warnings | **C** | Ableitung aus Rating + Issues |
| Lesedauer, Seitenprognose | **C** | Wortzahl ÷ `wordsPerPage` |
| Cover-Bildprompt | **L** | Kreativ |
| Cover-Text (Titel/Autor) | **C** | Typografisches Overlay — **nie** vom Bildmodell |
| Cover-Maße, Rücken, Bleed | **C** | Formel aus Seitenzahl/Papier |
| Kapitelbild-Prompt | **L** | Kreativ, aber mit deterministisch injizierten Figurendeskriptoren |
| Bildkonsistenz (Seeds, Referenzen) | **C** | Verwaltung von Seed/Referenzbild |
| EPUB/PDF/DOCX-Erzeugung | **C** | Rendering |
| Inhaltsverzeichnis, Kolumnentitel | **C** | Aus der DB |
| TTS-Chunking, SSML | **C** | Satzsegmentierung + Regeln |
| Stimmenzuordnung je Figur | **C** | Mapping-Tabelle |
| Aussprache erfundener Namen | **L→C** | LLM schlägt IPA vor, Nutzer/Code bestätigt, dann Lexikon |

### 2.9 Betrieb

| Operation | Wahl | Begründung |
|---|:--:|---|
| Idempotenz-Keys, Job-Routing, Retries | **C** | Immer |
| Budget-Prüfung, Abbruch | **C** | Immer |
| Modell-Fallback, Circuit Breaker | **C** | Immer |
| Kosten-/Qualitätsmetriken | **C** | Aggregation |
| Alarme | **C** | Schwellenwerte |
| Priorisierung offener Issues für den Nutzer | **C** | Sortierung nach Severity/Confidence |

## 3. Die drei häufigsten Fehlgriffe

| Fehlgriff | Warum falsch | Richtig |
|---|---|---|
| „Das LLM soll die Kapitelanzahl vorschlagen“ | Nicht reproduzierbar, kollidiert mit Preis und Budget | Arithmetik; das LLM bekommt die Zahl als Vorgabe |
| „Ein großer Prüf-Call findet alles“ | Findet Vages, übersieht Konkretes, teuer, nicht reproduzierbar | Viele kleine deterministische Checks + ein enger semantischer Check mit Zitatpflicht |
| „Embeddings als Gedächtnis“ | Ähnlichkeit ≠ Wahrheit; veraltete Chunks bleiben plausibel | Fakten in SQL, Embeddings nur für Stil/Atmosphäre |

## 4. Kostenwirkung der Matrix (Roman, M, 28 Kapitel)

| Ebene | Anteil der Prüfungen | Anteil der Prüfkosten |
|---|---:|---:|
| Deterministisch (C) | ~78 % | **0 €** |
| Zwei-Stufen (C→L) | ~12 % | ~15 % |
| Rein semantisch (L) | ~10 % | ~85 % |

Genau deshalb ist die Matrix kein Stildokument, sondern die Grundlage der Wirtschaftlichkeit.
