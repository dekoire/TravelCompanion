# 18 — Kosten, Budgets, Preismodell

## 1. Grundsatz

Ein Buch darf **nie** unbegrenzt Kosten erzeugen. Das Budget wird vor dem Start berechnet,
als Credits reserviert und während des Laufs deterministisch überwacht.

```
Schätzung → Reservierung → laufende Verbrauchsmessung → Hard Stop → Abrechnung
```

## 2. Token-Modell

### 2.1 Wörter zu Tokens

| Sprache | Tokens/Wort (Richtwert) |
|---|---:|
| Englisch | 1,35 |
| Spanisch | 1,60 |
| Französisch | 1,70 |
| **Deutsch** | **2,00** |

Der Wert steht in `LocaleProfile.tokensPerWord` und wird **empirisch nachgeführt**: Nach jedem
Buch wird `outputTokens / sichtbareWörter` gemessen und der Mittelwert je Sprache aktualisiert.
Die Schätzung darf nicht auf einer Konstante von 2023 stehenbleiben.

> Korrektur zum Ausgangskonzept: Dort wurden für 100.000 Wörter 145.000–160.000 sichtbare
> Output-Tokens angesetzt. Das ist ein englischer Wert. Auf Deutsch sind es
> **190.000–230.000**.

### 2.2 Vollständige Kalkulation (Roman, 100.000 Wörter, Deutsch)

| Posten | Output-Tokens | Input-Tokens | Anmerkung |
|---|---:|---:|---|
| Planung (Prämisse, Bible, Figuren, Ending, Threads, Reisematrix) | 18.000 | 90.000 | einmalig, hohes Reasoning |
| Outline A + B | 14.000 | 60.000 | zwei Varianten |
| Chapter Cards (30) | 22.000 | 180.000 | in Batches |
| Scene Cards (~90) | 20.000 | 220.000 | act-weise |
| Stil-Kalibrierung (3 Varianten Kap. 1) | 21.000 | 40.000 | |
| **Kapiteltext (30 × ~6.700)** | **200.000** | **360.000** | Kern; Input dank Caching reduziert |
| Extraktion + Summaries (30) | 45.000 | 190.000 | |
| Verifikationen (~90) | 14.000 | 380.000 | viele kleine Calls |
| Semantische Checks (30) | 24.000 | 300.000 | |
| Reparaturen (Erfahrungswert 35 % der Kapitel) | 40.000 | 150.000 | |
| Act-Audits (4) + Midpoint + Pre-Climax | 22.000 | 260.000 | langer Input |
| Finale Audits A1–A4 | 26.000 | 420.000 | |
| Canon-Rebuild | 40.000 | 200.000 | Extraktion über alles |
| Metadaten, Klappentext, Cover-Prompt | 4.000 | 30.000 | |
| **Summe** | **~510.000** | **~2.880.000** | |
| davon cache-fähiger Input | | ~1.550.000 | ≈ 54 % |

**Einordnung:** Das Ausgangskonzept nannte 210.000–300.000 Output-Tokens als typisch und
400.000–800.000 als revisionsintensives Szenario. Auf **Deutsch** und mit **allen** Prüf- und
Audit-Stufen liegt der realistische Normalfall bei **450.000–600.000 Output-Tokens**.
Die niedrigere Zahl gilt nur, wenn man Verifikationen, semantische Checks und Canon-Rebuild
weglässt — also genau die Teile, die die Qualität erzeugen.

Bei Kurzgeschichten und Novellen skaliert es unterproportional (die Planung ist ein fast
fixer Sockel), bei XL-Büchern überproportional (mehr Audits, mehr Kontext).

### 2.3 Kostenformel

```ts
cost = Σ_calls (
    inputTokens_uncached  × price.input
  + inputTokens_cached    × price.cachedInput      // typ. 10–25 % des Normalpreises
  + outputTokens          × price.output
  + thinkingTokens        × price.thinking          // oft = output-Preis
)
+ images   × price.image
+ ttsChars × price.tts
```

Preise stehen in `model_profiles.price_table` und werden **pro Buch eingefroren**, damit eine
Preisänderung des Providers ein laufendes Buch nicht verteuert.

### 2.4 Warum Prompt-Caching wirtschaftlich entscheidend ist

Ohne Caching: ~2,88 Mio. Input-Tokens zum Normalpreis.
Mit 54 % Trefferquote und 20 %-Cache-Preis: Ersparnis von ~43 % der Input-Kosten.
Bei Modellen, bei denen Input ein Drittel der Gesamtkosten ausmacht, sind das ~14 % Gesamtkosten
— für eine reine Reihenfolge-Disziplin im Context Builder ([09](09-context-builder.md) §6).

## 3. Budgethierarchie

```
Buchbudget (aus BookSpec)
├── Planungsbudget            10 %
├── Kapitelbudget             62 %   → je Kapitel: Budget / Kapitelanzahl
│     └── Kapitel-Hardlimit: 3,5 × Erstgenerierungskosten (inkl. Reparaturen)
├── Auditbudget               12 %
├── Reserve Nutzeränderungen   8 %
└── Reserve Rendering/Medien   8 %
```

Nach jedem Kapitel:
```ts
const spent = sumCost(bookId);
const projected = spent / committedChapters * totalChapters;
if (projected > budget * 1.15) warnUser();          // Hinweis, kein Stopp
if (spent   > budget * 1.30) hardStop();            // Buch → paused, Nutzer entscheidet
```

**Hard Stop heißt pausieren, nicht abbrechen.** Der Nutzer kann aufstocken; das Buch läuft
weiter, wo es stand.

## 4. Credits und Abrechnung

```
1 Credit = 1.000 sichtbare Zielwörter
```

Vorteil gegenüber Token-Abrechnung: Der Nutzer versteht die Einheit, und sie ist stabil
gegenüber Modellwechseln. Interne Kostenschwankungen fängt die Marge auf.

| Vorgang | Credit-Bewegung |
|---|---|
| Start eines Buches | Reservierung = `targetWords / 1000 × faktor(sizeClass)` |
| Kapitel committet | anteilige Verbuchung |
| Reparaturen im Budget | keine Zusatzkosten für den Nutzer |
| Nutzer-Regenerierung eines Kapitels | 0,5 Credits pro 1.000 Wörter |
| Nutzer-Edit mit Kaskade | Kosten der Anpassung, vorab angezeigt |
| Abbruch | nicht verbrauchte Reservierung wird freigegeben |
| Systemfehler (`FATAL`, `DEPENDENCY`) | vollständige Gutschrift |

`faktor(sizeClass)`: XS 1,4 · S 1,2 · M 1,0 · L 1,05 · XL 1,15 — kleine Bücher tragen den
Planungssockel anteilig stärker.

### 4.1 Reservierungslogik

```sql
-- atomar, verhindert Überziehung bei parallelen Starts
WITH balance AS (
  SELECT coalesce(sum(delta_credits), 0) AS c FROM credit_ledger WHERE user_id = $1
)
INSERT INTO credit_ledger (user_id, delta_credits, reason, book_id)
SELECT $1, -$2, 'reservation', $3 FROM balance WHERE c >= $2
RETURNING id;
-- 0 Zeilen zurück = zu wenig Guthaben
```

## 5. Kostenkontrolle im Betrieb

| Maßnahme | Wirkung |
|---|---|
| Capability-Routing (VERIFIER = billigstes Modell) | Verifikationen kosten fast nichts |
| Prompt-Caching mit stabiler Sektionsreihenfolge | −14 % Gesamtkosten |
| Deterministische Checks statt LLM-Checks | −78 % der Prüfvorgänge kostenlos |
| Retrieval-Passagen nur bei Trigger (Default 0) | −8 % Input |
| Kontext-Hartlimit 18k Tokens | verhindert Kontext-Wildwuchs |
| Reparaturbudget pro Kapitel | verhindert Kostenexplosion bei Problemkapiteln |
| Idempotenz-Cache | keine Doppelbezahlung bei Retry |
| Memory-Kompaktierung ab L | hält Input bei XL-Büchern konstant statt linear wachsend |
| Kein Volltext im Kontext | Summaries statt Kapitel |

## 6. Kostentransparenz für den Nutzer

Auf der Buchseite:
```
Verbraucht      42 von 100 Credits        (14 von 28 Kapiteln)
Hochrechnung    84 Credits                (im Budget)
Reparaturen     3 Kapitel                 (im Kapitelbudget enthalten)
```
Keine Token-Zahlen im Nutzer-Interface. Tokens sind ein internes Maß.

## 7. Zeitbudget

| Größe | Wall-Clock (ohne Nutzerwartezeiten) |
|---|---|
| XS (8.000 Wörter) | 15–35 min |
| S (30.000) | 1–2,5 h |
| M (80.000) | 4–9 h |
| L (120.000) | 7–14 h |
| XL (200.000) | 14–30 h |

Dazu kommen Wartezeiten auf Nutzerentscheidungen (Outline, Stil, Act 1) — die dominieren in
der Praxis. Deshalb ist die asynchrone Benachrichtigung ([17](17-api-frontend.md) §5) kein
Komfort, sondern Voraussetzung.

## 8. Was bei Budgetüberschreitung passiert

```
80 %  → Hinweis im UI + E-Mail
100 % → Hinweis: "Das Buch braucht voraussichtlich mehr als geplant"
115 % → Warnung mit Optionen: aufstocken | kürzere Restkapitel | ohne Feinaudits beenden
130 % → HARD STOP, Buch pausiert, keine weiteren Calls
```

Die Option "ohne Feinaudits beenden" ist ehrlich: Sie senkt die Kosten um ~18 %, kostet aber
Qualität — und wird genau so beschrieben.
