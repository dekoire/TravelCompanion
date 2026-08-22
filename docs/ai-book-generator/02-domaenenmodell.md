# 02 — Domänenmodell: Buchtypen, Größen, Pipeline-Profile

## 1. Begriffslexikon (verbindlich für Code und Doku)

| Begriff | Bedeutung |
|---|---|
| **Book** | Produkt-Entität, gehört einem User. Enthält n `BookVersion`. |
| **BookVersion** | Eingefrorener Generierungs-Kontext (Spec + Outline + Modellprofil). Nutzeränderungen erzeugen keine neue BookVersion; ein Neustart der Planung schon. |
| **BookSpec** | Validierte Nutzereingabe + abgeleitete Zielgrößen. Unveränderlich pro Version. |
| **Canon** | Die Menge aller als wahr akzeptierten Daten: Story-Bible, Fakten, Events, Wissen, Beziehungen, Threads. |
| **Story-State** | Der aus dem Canon zu einem Szenenindex *berechnete* Zustand. Abgeleitet, nie primär. |
| **Part / Act / Chapter / Scene** | Strukturhierarchie. `Part` nur bei Größe XL. |
| **Card** | Planungsobjekt (`ChapterCard`, `SceneCard`) — Vertrag für die Generierung. |
| **Beat** | Kleinste Planungseinheit innerhalb einer Scene Card (2–5 pro Szene). |
| **Thread** | Handlungsstrang mit Einführung, Beats, Payoff, Status. |
| **Obligation** | Vom Scheduler erzeugte Pflicht für ein bestimmtes Kapitel ("Thread X muss berührt werden"). |
| **Delta** | Vorgeschlagene Zustandsänderung aus der Extraktion — noch kein Canon. |
| **Commit** | Transaktionale Aufnahme von Text + Deltas + State in den Canon. |
| **Issue** | Gefundener Konsistenz-/Qualitätsfehler mit Evidenz. |
| **Repair** | Lokal begrenzte Neugenerierung zur Behebung eines Issues. |
| **Read-Set / Write-Set** | Vom Context Builder injizierte bzw. von der Extraktion geänderte Canon-IDs pro Szene. Basis der Invalidierungslogik. |

## 2. Buchtypen (Tracks)

Es gibt **zwei Pipelines**, die sich Infrastruktur, Datenmodell-Kern und Reparaturlogik teilen,
aber unterschiedliche Planungs- und Prüfebenen haben.

### 2.1 Track FICTION

```
book_type ∈ {
  short_story, novella, novel, epic,
  childrens_book, middle_grade, young_adult,
  romance, mystery, thriller, fantasy, scifi, historical, horror, literary
}
```
Planungskern: Plot, Figurenbögen, Timeline, Ending Contract.
Wahrheitskern: `events`, `entity_facts`, `knowledge_states`, `relationships`.

### 2.2 Track NON_FICTION

```
book_type ∈ {
  guidebook, how_to, textbook, business, self_help,
  biography, memoir, essay_collection, reference, cookbook, travel_guide
}
```
Planungskern: Thesenbaum, Lernziele, Argumentkette, Quellenlage.
Wahrheitskern: `knowledge_claims`, `sources`, `term_definitions`, `learning_objectives`.
→ [05-planung-nonfiction.md](05-planung-nonfiction.md)

### 2.3 Hybride

`memoir` und `biography` laufen im NON_FICTION-Track, aktivieren aber zusätzlich die
Fiction-Module `timeline`, `characters` und `relationships` (echte Personen → besondere
rechtliche Prüfung, siehe [13](13-prompting-sicherheit.md) §6).

## 3. Größenklassen

Die Größenklasse wird **abgeleitet**, nicht vom Nutzer gewählt. Der Nutzer wählt Zielwortzahl;
das System bestimmt daraus Klasse und Pipeline-Profil.

| Klasse | Wörter | Struktur | Kapitel | Wörter/Kapitel | Szenen/Kapitel |
|---|---|---|---|---|---|
| **XS** Kurzgeschichte | 3.000 – 12.000 | keine Acts (nur 3 Phasen) | 1 – 6 | 800 – 3.000 | 1 – 3 |
| **S** Novelle | 15.000 – 45.000 | 3 Acts | 8 – 18 | 1.500 – 3.500 | 2 – 4 |
| **M** Roman | 50.000 – 95.000 | 4 Acts | 18 – 35 | 2.000 – 4.500 | 2 – 5 |
| **L** Großer Roman | 95.000 – 150.000 | 4–5 Acts | 30 – 55 | 2.000 – 4.500 | 3 – 6 |
| **XL** Epos | 150.000 – 300.000 | **Parts** → Acts | 50 – 110 | 2.000 – 4.500 | 3 – 6 |

### 3.1 Sondergrenzen Kinderbuch

| Untertyp | Wörter gesamt | Wörter/Kapitel | Lesealter |
|---|---|---|---|
| `picture_book` | 300 – 1.200 | 100 – 300 (Doppelseite) | 3–6 |
| `early_reader` | 1.500 – 6.000 | 200 – 600 | 5–8 |
| `chapter_book` | 6.000 – 18.000 | 500 – 1.500 | 7–10 |
| `middle_grade` | 25.000 – 60.000 | 1.000 – 2.500 | 8–12 |
| `young_adult` | 55.000 – 90.000 | 1.800 – 4.000 | 12–18 |

Die Regel "mindestens 800 Wörter pro Kapitel" aus dem Ausgangskonzept gilt **nur** für
Erwachsenen-/YA-Fiktion und wird für Kinderbücher durch obige Tabelle ersetzt.

### 3.2 Pipeline-Profile

Welche Stufen laufen, hängt von der Klasse ab. Das verhindert, dass eine Kurzgeschichte
30 € Audit-Kosten produziert.

| Stufe | XS | S | M | L | XL |
|---|:--:|:--:|:--:|:--:|:--:|
| Story-Bible (voll) | reduziert | ✓ | ✓ | ✓ | ✓ + Series Bible |
| Zwei Outline-Varianten | ✓ | ✓ | ✓ | ✓ | ✓ (Part-Ebene zuerst) |
| Ending Contract | ✓ | ✓ | ✓ | ✓ | ✓ |
| Stil-Kalibrierung (Kap. 1 Varianten) | 2 | 2 | 3 | 3 | 3 |
| Scene Cards | optional | ✓ | ✓ | ✓ | ✓ |
| Deterministische Checks | ✓ | ✓ | ✓ | ✓ | ✓ |
| Semantischer Kapitel-Check | ✓ | ✓ | ✓ | ✓ | ✓ |
| Act-Audit | – | ✓ | ✓ | ✓ | ✓ |
| Part-Audit | – | – | – | – | ✓ |
| Midpoint-Audit (groß) | – | – | ✓ | ✓ | ✓ (je Part) |
| Pre-Climax Thread-Audit | – | ✓ | ✓ | ✓ | ✓ |
| Globaler Volltext-Audit | 1 Call | 1 Call | Act-weise | Act-weise | Part-weise + Synthese |
| Human Checkpoint | nach Outline | nach Act 1 | nach Act 1 | nach Act 1 + Midpoint | nach jedem Part |
| Memory-Kompaktierung | – | – | – | ✓ | ✓ (Pflicht) |
| Serien-Canon | – | – | optional | optional | ✓ |

### 3.3 Memory-Kompaktierung (ab L)

Ab ~90k Wörtern wird die Menge an Summaries selbst zum Kontextproblem.
Verfahren (deterministisch getriggert, LLM-ausgeführt):

- Alle Kapitel eines abgeschlossenen Acts → **eine** Act-Summary (strukturiert, 400–700 Wörter).
- Die Einzel-Kapitel-Summaries bleiben in der DB, wandern aber aus dem Standardkontext.
- Ab 3 abgeschlossenen Acts: **Book-Digest** (600–900 Wörter) über alle Acts.
- Regel: Standardkontext enthält nie mehr als
  `Book-Digest + Summaries des aktuellen Acts + letzte 3 Kapitel-Summaries im Detail`.
- Ältere Details kommen nur noch über gezieltes Retrieval (Fakt-IDs, Passagen).

## 4. Serien und Bände

Auch wenn zunächst Einzelbücher gebaut werden, muss das Datenmodell Serien vorsehen — eine
nachträgliche Migration des Canon ist teuer.

- `series` (id, owner, title, bible_id)
- `books.series_id`, `books.series_index`
- **Series Bible**: die Teilmenge des Canon, die bandübergreifend gilt (Welt, Regeln, Glossar,
  Hauptfiguren-Stammdaten, abgeschlossene Ereignisse).
- Beim Start von Band n+1:
  - Series Bible wird **kopiert** (nicht referenziert) in die neue Story-Bible → Band bleibt
    reproduzierbar, auch wenn die Serie später weiterentwickelt wird.
  - Der Endzustand von Band n (`state_snapshots` am letzten Szenenindex) wird als
    Anfangszustand importiert.
  - Ein `series_canon_diff`-Job meldet Widersprüche zwischen Bänden.

## 5. Sprache und Locale

Sprache ist kein Prompt-Adjektiv, sondern konfiguriert Algorithmen.

```ts
interface LocaleProfile {
  bcp47: string;                 // 'de-DE', 'en-US', 'fr-FR', 'es-ES'
  quotePairs: [string, string][];// de: [['„','“'],['»','«'],['«','»']]  en: [['“','”'],["‘","’"]]
  thoughtMarkers: string[];      // de: Kursiv-Konvention → im Markup, nicht als Quote zählen
  tokensPerWord: number;         // de 2.0 · en 1.35 · fr 1.7 · es 1.6  (Kalkulationsbasis)
  wordsPerPage: number;          // Seitenprognose: de 280 · en 300
  formalityAxis: boolean;        // de/fr: true (Du/Sie) · en: false
  hasGenderedForms: boolean;     // de: true → Anrede/Adjektiv-Konsistenz prüfbar
  sentenceSegmenter: 'intl' | 'custom';
  dialogueStyle: 'quotes' | 'dashes'; // fr/es teilweise Gedankenstrich
}
```

### 5.1 Wortzählung (verbindlicher Algorithmus)

```ts
export function countWords(text: string, locale: string): number {
  const seg = new Intl.Segmenter(locale, { granularity: 'word' });
  let n = 0;
  for (const s of seg.segment(joinHyphenatedWords(stripMarkup(text)))) if (s.isWordLike) n++;
  return n;
}
```
Kein `split(/\s+/)`. Diese Funktion ist die *einzige* Wortzählung im System (Budget,
Validierung, Seitenprognose, Preis) — sonst driften Kennzahlen auseinander.
Implementierung und Tests:
[`packages/domain/src/text.ts`](../../book-generator/packages/domain/src/text.ts).

**`joinHyphenatedWords` ist nicht optional.** `Intl.Segmenter` zerlegt „E-Mail" in zwei und
„Schwarz-Weiß-Fotografie" in drei wortartige Segmente. Die Publishing-Konvention (und Word)
zählt jeweils eins — und danach richten sich Preis und Seitenprognose. Verbunden wird nur der
einfache Bindestrich zwischen zwei Buchstaben; Gedankenstriche bleiben Satzzeichen.
Umlaute, Zahlen (`1.234`, `3,5`) und Apostrophformen (`geht's`) zählt der Segmenter bereits
korrekt als ein Wort.

### 5.2 Deutsche Besonderheiten (relevant für Checks)

| Thema | Auswirkung |
|---|---|
| Anführungszeichen | `„…"` als Standard, `»…«` als Stilvariante. Im Style Profile fixiert, im Renderer erzwungen, im Dialoganteil-Check beide erkannt. |
| Du/Sie | Eigene Zustandsachse `address_mode` pro Figurenpaar. Wechsel nur mit belegtem Event. Deterministisch prüfbar über Pronomen-/Verbformen-Suche im Dialog der beiden Figuren. |
| Gendern | BookSpec-Feld `gender_style ∈ {none, doppelnennung, gendersternchen, neutral}`; deterministischer Check auf Konsistenz. |
| Kursive Gedankenrede | Muss als Markup (`*…*`) erzeugt werden, damit der Dialog-Check sie ausschließen kann. |
| Zahlwörter | Style-Regel "Zahlen bis zwölf ausschreiben" ist deterministisch prüf- und korrigierbar. |

## 6. Erzählparameter (Fiction)

```ts
type Pov = 'first' | 'second' | 'third_limited' | 'third_omniscient' | 'epistolary' | 'mixed';
type Tense = 'past' | 'present';
type PovMode =
  | { kind: 'single'; characterId: string }
  | { kind: 'rotating'; order: string[]; switchLevel: 'chapter' }   // nie innerhalb einer Szene
  | { kind: 'omniscient' };
```

**Harte Regeln:**
- `third_limited` + `rotating` → POV-Wechsel nur an Kapitelgrenzen; jede Chapter Card trägt
  `povCharacterId`.
- Bei `first` oder `third_limited` filtert der Context Builder das Wissen auf die POV-Figur
  (→ [09](09-context-builder.md) §4). Ohne diesen Filter leakt das Modell zuverlässig.
- `second` (Du-Erzählung) und `epistolary` sind erlaubt, deaktivieren aber einige Stil-Checks
  (Perspektiv-Drift-Erkennung greift dort anders).

## 7. Zustandsmaschine eines Buches

```
DRAFT_SPEC ──validate──► SPEC_READY ──► PLANNING_BIBLE ──► PLANNING_ARC
   ▲                                                            │
   └────────────── user edit ────────────────┐                  ▼
                                             │          OUTLINE_REVIEW ◄─ (2 Varianten)
                                             │                  │ user picks
                                             │                  ▼
                                             │          STYLE_CALIBRATION ◄─ (2–3 Kap.-1-Varianten)
                                             │                  │ user picks
                                             │                  ▼
                                             │              READY ──► GENERATING ◄──┐
                                             │                          │           │
                                             │            ┌─────────────┼───────────┤
                                             │            ▼             ▼           │
                                             │        ACT_REVIEW   NEEDS_REVIEW ────┘
                                             │            │ approve      │ user decides
                                             │            └──────────────┘
                                             │                  ▼
                                             └──────────── FINAL_AUDIT ──► FINAL_REPAIR
                                                                              ▼
                                                             CANON_REBUILD ──► RENDERING
                                                                              ▼
                                                                          COMPLETED
   jederzeit: PAUSED · CANCELLED · FAILED (mit failure_reason)
```

Details, erlaubte Übergänge und Persistenz in [16-workflows-jobs.md](16-workflows-jobs.md) §2.
