# 20 — Qualitätsmessung, Tests, Monitoring

## 1. Kennzahlen pro Buch

Werden beim Abschluss berechnet und in `book_metadata.quality` gespeichert.

| Kennzahl | Berechnung | Zielwert |
|---|---|---|
| `consistencyErrorsPer10k` | Block+High-Issues (final, nicht behoben) / Wörter × 10.000 | < 0,3 |
| `issuesDetectedPer10k` | alle je gefundenen Issues / Wörter × 10.000 | 4–15 (zu niedrig = Checks greifen nicht) |
| `outlineAdherence` | erfüllte `requiredEvents` / geplante | > 0,95 |
| `forbiddenViolations` | eingetretene `forbiddenEvents` | 0 |
| `threadClosureRate` | geschlossene / mandatory Threads | 1,0 |
| `dormantThreadRatio` | Threads > 5 Kapitel still / offene Threads | < 0,15 |
| `clueResolutionRate` | eingelöste / auffällige Clues | 1,0 |
| `wordDeviationPct` | \|Ist − Ziel\| / Ziel | < 0,05 |
| `chapterLengthCv` | Variationskoeffizient der Kapitellängen | 0,10–0,25 |
| `dialogueRatioMean` / `Sd` | über alle Kapitel | Sd > 0,05 (Monotonie-Indikator) |
| `openingSimilarityMax` | max. paarweise Ähnlichkeit der Kapitelanfänge | < 0,32 |
| `openingTypeEntropy` | Shannon-Entropie der Eröffnungsarten | > 1,8 |
| `repetitionIndex` | Σ (count−3) über n-Gramme mit count > 3, / 10k Wörter | < 2,0 |
| `styleDrift` | mittlere Abweichung der Stilmetriken von der Kalibrierungsprobe | < 0,20 |
| `voiceDriftMax` | max. Abweichung einer Figurenstimme | < 0,30 |
| `repairRate` | Kapitel mit ≥ 1 Reparatur / Kapitel | < 0,40 |
| `regenerationRate` | komplett neu generierte Kapitel / Kapitel | < 0,08 |
| `extractionGroundingRate` | gegroundete / gemeldete Deltas | > 0,92 |
| `falsePositiveRate` | verworfene semantische Befunde / alle | < 0,35 |
| `cachedInputRatio` | cached / gesamt Input-Tokens | > 0,50 |
| `costPer10kWords` | Kosten / Wörter × 10.000 | Budget-abhängig |
| `failedJobRate` | fehlgeschlagene / alle Jobs | < 0,02 |
| `wallClockHours` | | Größen-abhängig |

`extractionGroundingRate` ist die wichtigste **technische** Kennzahl: Fällt sie unter 0,9,
halluziniert die Extraktion, und alle nachgelagerten Checks werden unzuverlässig.

`issuesDetectedPer10k` gegen Null ist ein **Alarm**, kein Erfolg — dann greifen die Detektoren
nicht mehr (typisch nach einem Refactoring der Extraktion).

## 2. Testbücher (Golden Set)

Vor jedem Release werden 8 Testbücher mit **bewusst schwierigen Zuständen** generiert. Jedes
enthält gepflanzte Fallen, deren Erkennung geprüft wird.

| # | Testbuch | Eingebaute Fallen |
|---|---|---|
| T1 | Küstenkrimi, 30k, DE | Verlorener Schlüssel taucht wieder auf · unmögliche Reisezeit · Augenfarbe wechselt |
| T2 | Kammerspiel-Thriller, 25k, DE | Geheimes Wissen leakt · falsche Überzeugung einer Figur · verfrühte Enthüllung |
| T3 | Fantasy, 60k, DE | Magie ohne Kosten · Regel-Ausnahme missbraucht · Fähigkeit erscheint ohne Etablierung |
| T4 | Romance, 45k, DE | Du/Sie-Wechsel ohne Anlass · Beziehungssprung ohne Event · HEA-Konvention |
| T5 | Mystery, 70k, DE | Payoff ohne Setup · auffälliger Clue ohne Auflösung · Nebenhandlung verschwindet im Mittelteil |
| T6 | Kinderbuch, 6k, DE | Rating-Grenzen · Wortschatz · Kapitellänge unter Erwachsenengrenze |
| T7 | Sachbuch, 40k, DE | Begriff vor Definition · Zahl ohne Quelle · Redundanz zwischen Kapitel 4 und 9 |
| T8 | Roman, 90k, EN | Sprach-/Locale-Pfad, Wortzählung, Quote-Style, keine Formalitätsachse |

Zusätzlich **T9 — Nutzeränderungs-Test**: Buch aus T1 nehmen, Kapitel 4 so ändern, dass der
Schlüsselbesitz wechselt, nachdem Kapitel 20 fertig ist. Erwartung: Genau die Kapitel mit
dem Fakt im Read-Set werden markiert, nicht alle.

### 2.1 Fallen-Injektion

Die Fallen werden nicht "gehofft", sondern **injiziert**: Ein Testmodus erlaubt es, nach der
Generierung eines Kapitels einen definierten Fehler in den Text zu patchen (z. B. Reisezeit
auf 20 Minuten setzen) und dann die Prüfkette laufen zu lassen.

```ts
// packages/eval/injectors.ts
export const INJECTORS = {
  impossible_travel: (text) => text.replace(/eine Stunde später/, 'zwanzig Minuten später'),
  eye_color_change:  (text) => text.replace(/graugrüne? Augen/, 'braune Augen'),
  dead_acts:         (text) => text + '\n\nTomas öffnete die Tür und trat ein.',
  // …
};
```

Erwartung: 100 % Erkennungsrate bei deterministischen Fallen, ≥ 80 % bei semantischen.
Eine Regression hier blockiert das Release.

## 3. Test-Ebenen

| Ebene | Umfang | Laufzeit | Wann |
|---|---|---|---|
| **Unit** | `packages/domain`: Wortzählung, Budget-Mathematik, Bedingungs-Parser, Fold, Grounding, Phrasenstatistik, Reisezeit-Check | < 20 s | jeder Commit |
| **Schema** | Alle Zod-Schemas gegen Fixture-Payloads (gültig + 30 ungültige Varianten) | < 10 s | jeder Commit |
| **Integration (Mock-LLM)** | Komplettes Buch (XS) mit deterministischen Fixtures — prüft Pipeline, Commits, Kaskaden, Idempotenz | 1–3 min | jeder Commit |
| **Golden-Fixture** | Extraktion gegen 20 manuell annotierte Kapitel: Precision/Recall je Delta-Typ | < 1 min | jeder Commit |
| **Eval (echte Modelle)** | Testbücher T1–T9 | 4–10 h | nächtlich + vor Release |
| **Last** | 50 parallele Bücher | 1 h | vor Release |
| **Chaos** | Prozesstod mitten im Kapitel, Provider-503, Truncation, ungültiges JSON, doppeltes Event | 15 min | wöchentlich |

### 3.1 Golden-Fixtures für die Extraktion

20 handannotierte Kapitel (mit korrekten Deltas) sind die einzige Möglichkeit, Änderungen am
Extraktions-Prompt zu bewerten. Metriken:

```
Precision = korrekt extrahierte Deltas / alle extrahierten
Recall    = korrekt extrahierte Deltas / alle vorhandenen
Grounding = Anteil mit auffindbarem Zitat
```
Ziel: Precision > 0,92 · Recall > 0,85 · Grounding > 0,95.
Ein Prompt-Update, das Recall um mehr als 3 Punkte senkt, geht nicht live.

### 3.2 Chaos-Tests im Detail

| Szenario | Erwartung |
|---|---|
| Prozess stirbt nach `chapter.write`, vor `extract` | Retry nutzt memoisierten Text, kein zweiter Schreib-Call |
| Provider liefert 503 dreimal | Fallback-Modell, Buch läuft weiter, Modellwechsel protokolliert |
| Truncation mitten in Szene 2 | Fortsetzungs-Call, nahtloser Text, keine Dopplung |
| Ungültiges JSON in der Extraktion | 1 Repair-Call, dann Job-Fehler, Text bleibt erhalten |
| Doppeltes `book.generate.requested` | Zweiter Lauf durch Concurrency-Key blockiert, kein Doppelkapitel |
| Nutzer-Edit während laufender Generierung | Advisory Lock, Edit wird nach dem Commit angewandt |
| Budget mitten im Kapitel erschöpft | Kapitel wird zu Ende geführt, dann Pause (kein halbes Kapitel) |

## 4. LLM-as-Judge (vorsichtig eingesetzt)

Für Qualitätsdimensionen, die sich nicht messen lassen (Prosa-Qualität, Spannung, Stimme):

- **Paarweiser Vergleich statt absoluter Note.** "Welches Kapitel ist besser?" ist deutlich
  zuverlässiger als "Bewerte von 1–10".
- **Reihenfolge randomisieren**, jedes Paar zweimal in beiden Richtungen (Positions-Bias).
- **Anderes Modell als das schreibende.** Ein Modell bevorzugt den eigenen Output.
- Verwendet nur für Prompt-A/B-Tests, **nie** als Gate im Produktivlauf.

## 5. Monitoring

### 5.1 Traces

Ein OTel-Span je Job, Kind-Spans je LLM-Call. Attribute:
`book_id`, `book_size_class`, `chapter_no`, `operation`, `capability`, `model_id`,
`prompt_version`, `input_tokens`, `output_tokens`, `cached_ratio`, `finish_reason`,
`repair_attempt`.

**Nicht** im Trace: Prompt-Volltext, Kapiteltext, Nutzerdaten. Nur Hashes und Längen.

### 5.2 Dashboards

| Board | Inhalt |
|---|---|
| Betrieb | Jobs nach Status, Fehlerrate, hängende Jobs, Queue-Tiefe, p50/p95-Dauer je Operation |
| Kosten | Kosten/Buch, Kosten/10k Wörter, Cache-Trefferquote, Kosten je Capability, Trend |
| Qualität | Reparaturrate, Issues/10k, Grounding-Rate, Falschmeldungsrate — segmentiert nach `prompt_version` |
| Nutzer | Wizard-Abbrüche je Schritt, Zeit bis Outline-Entscheidung, Anteil `needs_review`, Abbruchquote |

### 5.3 Alarme

| Alarm | Schwelle |
|---|---|
| Job-Fehlerrate | > 5 % in 15 min |
| Hängende Jobs | > 3 gleichzeitig |
| Grounding-Rate | < 0,88 (gleitendes Mittel 20 Kapitel) |
| Cache-Trefferquote | < 0,35 |
| Kosten/Buch | > 150 % des 7-Tage-Medians |
| Provider-Latenz p95 | > 3× Basiswert |
| Hard-Block-Moderation | jeder Fall (sofort) |
| `issuesDetectedPer10k` | < 1,0 über 5 Bücher (Detektoren tot) |
| Budget-Hard-Stops | > 2 pro Tag |

## 6. Release-Gate

Ein Deployment geht nur live, wenn:

- [ ] Unit + Schema + Integration grün
- [ ] Golden-Fixture-Metriken nicht schlechter als Baseline (Toleranz 3 Punkte)
- [ ] Testbücher T1–T9: alle deterministischen Fallen erkannt, ≥ 80 % der semantischen
- [ ] Keine neue Kategorie von Falschmeldungen
- [ ] Kosten pro Testbuch nicht > 110 % der Baseline
- [ ] Migration gegen Snapshot mit laufenden Büchern getestet
- [ ] Prompt-Änderungen laufen als `canary`, nicht direkt als `active`

## 7. Kontinuierliche Verbesserung

Jedes abgeschlossene Buch liefert Daten:
- Welche Issue-Codes traten auf? (Prompt-Verbesserung dort ansetzen)
- Welche Reparaturstufe war nötig? (Zu viele Stufe-4-Reparaturen = Planungsproblem)
- Wie oft griff der Nutzer ein und wo? (UX- und Qualitätssignal)
- Welche Kapitel wurden vom Nutzer editiert? (Die Stellen, wo das System schwach ist)

Diese Auswertung läuft monatlich und priorisiert die Prompt- und Check-Arbeit — statt nach
Bauchgefühl zu optimieren.
