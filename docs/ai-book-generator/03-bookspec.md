# 03 — BookSpec: Eingabe, Ableitung, Validierung

## 1. Prinzip

Der Wizard sammelt Rohdaten. Ein **deterministischer** Schritt (`deriveSpec`) macht daraus die
vollständige BookSpec — **ohne LLM**. Erst danach darf ein LLM überhaupt etwas sehen.

```
WizardInput (roh, teils Freitext)
   │
   ├─ sanitizeUserText()        ← Neutralisierung, Längen-Cap        [13 §3]
   ├─ moderateInput()           ← einziger LLM/Classifier-Call vorab [13 §4]
   ├─ deriveSpec()              ← Ableitungen, Defaults, Budgets     (deterministisch)
   ├─ validateSpec()            ← harte Regeln, Blocker vs. Warnung  (deterministisch)
   └─ freezeSpec()              ← Persistenz + Hash
        └─► BookSpec (unveränderlich)
```

**Warum deterministisch:** Wenn ein LLM die Kapitelanzahl "schätzt", kann man Kosten und
Umfang nicht garantieren. Der Nutzer kauft aber genau das.

## 2. Vollständige BookSpec

```jsonc
{
  "specVersion": "1.0.0",
  "bookId": "b_01J9…",
  "specHash": "sha256:…",            // über alle Felder außer technical.*, gesetzt in freezeSpec

  "track": "fiction",                 // fiction | non_fiction
  "bookType": "novel",
  "sizeClass": "M",                   // ABGELEITET

  "content": {
    "workingTitle": "Der letzte Brief",
    "userIdea": "Eine Archivarin findet einen Brief, der beweist…",   // FREITEXT, max 4000 Zeichen
    "userMustInclude": ["Leuchtturm", "ein Zwillingspaar"],           // FREITEXT-Liste, max 20 × 120 Zeichen
    "userMustAvoid": ["Tierquälerei", "Zeitreise"],
    "genre": "mystery",
    "subgenres": ["historical", "literary"],
    "themes": ["Schuld", "Erinnerung", "Klassenunterschiede"],
    "settingHint": "englische Küstenstadt, 1894",
    "desiredEnding": "bittersüß, Hauptfigur bleibt allein, Wahrheit kommt ans Licht",
    "characters": [
      { "role": "protagonist", "name": "June Weber", "age": 34,
        "traits": ["misstrauisch", "genau"], "goal": "Wahrheit über den Vater",
        "notes": "hinkt seit einem Unfall" },
      { "role": "antagonist", "name": "Tomas Hale", "age": 51, "traits": ["charmant"] }
    ],
    "authorName": "M. Kessler",
    "dedication": null,
    "series": { "seriesId": null, "index": null }
  },

  "form": {
    "language": "de-DE",
    "pov": "third_limited",
    "povMode": { "kind": "single", "characterName": "June Weber" },
    "tense": "past",
    "style": {
      "preset": "literary_warm",       // Preset-ID aus der Stil-Bibliothek
      "toneWords": ["melancholisch", "präzise", "atmosphärisch"],
      "humorLevel": "low",             // none | low | medium | high
      "descriptionDensity": "medium",  // sparse | medium | rich
      "sentenceRhythm": "varied",      // short | varied | flowing
      "quoteStyle": "de_low_high",     // „…“
      "genderStyle": "none",
      "numeralStyle": "spell_under_13"
    },
    "chapterTitles": "titled",         // numbered | titled | numbered_titled | none
    "chapterHeadingImages": false
  },

  "scope": {
    "targetWords": 82000,
    "targetChapters": 28,              // ABGELEITET falls nicht gesetzt
    "wordsPerChapter": 2930,           // ABGELEITET
    "scenesPerChapter": [2, 5],        // ABGELEITET (Korridor)
    "actCount": 4,                     // ABGELEITET
    "partCount": null,                 // nur XL
    "toleranceChapterPct": 10,         // Warnkorridor
    "toleranceHardPct": 20,            // Reparaturpflicht
    "toleranceBookPct": 5              // Gesamtabweichung
  },

  "rating": {
    "targetAge": "16+",                // all | 6+ | 9+ | 12+ | 16+ | 18+
    "violence": "moderate",            // none | mild | moderate | graphic
    "sexualContent": "none",           // none | implied | moderate | explicit
    "language": "mild",                // none | mild | strong
    "darkThemes": "moderate",          // none | mild | moderate | heavy
    "substanceUse": "mild",
    "selfHarm": "none",                // none | referenced | depicted   → Sonderregeln
    "contentWarnings": ["Trauer", "Tod eines Elternteils"],
    "hardBlocks": ["sexual_content_minors", "real_person_sexual",
                   "hate_speech", "actionable_wrongdoing"]   // immer gesetzt, nicht abwählbar
  },

  "deliverables": {
    "cover": true,
    "coverStyle": "photographic_moody",
    "chapterImages": false,
    "audiobook": false,
    "formats": ["epub", "pdf", "docx"],
    "kdpReady": true
  },

  "budget": {
    "maxInputTokens": 9000000,
    "maxOutputTokens": 380000,
    "maxThinkingTokens": 120000,
    "maxRepairsPerIssue": 2,
    "maxRepairsPerScene": 3,
    "maxRepairsPerChapter": 5,
    "maxChapterRegenerations": 1,
    "reserveFinalAuditPct": 12,
    "reserveUserEditsPct": 8,
    "hardStopPct": 130
  },

  "technical": {
    "modelProfileId": "mp_2026_08_a",
    "modelProfileSnapshot": { "...": "eingefroren, siehe 01 §6" },
    "promptRegistryVersion": "pr_2026_08_03",
    "schemaVersion": "1.0.0",
    "localeProfile": { "...": "siehe 02 §5" },
    "createdAt": "2026-08-22T10:12:00Z",
    "pipelineProfile": "M"
  }
}
```

## 3. Ableitungen (`deriveSpec`) — exakte Formeln

Eingabe: `targetWords`, `bookType`, optional `targetChapters`, `wordsPerChapter`.

```ts
// 1) Größenklasse
sizeClass = classify(targetWords, bookType)        // Tabelle 02 §3

// 2) Kapitelanzahl
if (!targetChapters && !wordsPerChapter) {
  const ideal = IDEAL_CHAPTER_WORDS[sizeClass];     // XS 1600 · S 2400 · M 2900 · L 3100 · XL 3100
  targetChapters = clamp(Math.round(targetWords / ideal),
                         LIMITS[sizeClass].minChapters, LIMITS[sizeClass].maxChapters);
}
if (targetChapters && !wordsPerChapter)  wordsPerChapter  = Math.round(targetWords / targetChapters);
if (!targetChapters && wordsPerChapter)  targetChapters   = Math.round(targetWords / wordsPerChapter);

// 3) Acts
actCount = sizeClass === 'XS' ? 0 : (targetChapters <= 20 ? 3 : 4);
if (sizeClass === 'XL') { partCount = clamp(Math.ceil(targetWords / 70000), 2, 6); actCount = 4; }

// 4) Act-Wortbudgets (Anteile am Gesamt)
ACT_SHARE = {
  3: [0.25, 0.50, 0.25],
  4: [0.22, 0.28, 0.28, 0.22],
  5: [0.18, 0.24, 0.22, 0.22, 0.14]
}[actCount];
actWordBudget[i] = Math.round(targetWords * ACT_SHARE[i]);

// 5) Kapitelzuordnung zu Acts: proportional, mit Mindestens-1-Kapitel-Garantie,
//    Rundungsrest an den längsten Act.

// 6) Szenenkorridor
scenesPerChapter = [ Math.max(1, Math.floor(wordsPerChapter / 1400)),
                     Math.max(2, Math.ceil (wordsPerChapter /  650)) ];

// 7) Token-Budgets (siehe 18 §2)
const tpw = locale.tokensPerWord;
maxOutputTokens = Math.round(targetWords * tpw * 1.05      // sichtbarer Text + Overhead
                  + targetWords * tpw * 0.28               // Planung/Extraktion/Summaries
                  + targetWords * tpw * 0.22);             // Reparaturreserve
```

## 4. Validierung (`validateSpec`)

Zwei Klassen: **BLOCK** (Speichern/Start verweigert) und **WARN** (Hinweis, Nutzer kann fortfahren).

### 4.1 BLOCK-Regeln

| ID | Regel |
|---|---|
| `V001` | `targetWords` außerhalb `[LIMITS[bookType].min, LIMITS[bookType].max]` |
| `V002` | `targetChapters × wordsPerChapter` weicht > 15 % von `targetWords` ab |
| `V003` | `wordsPerChapter < LIMITS[bookType].minChapterWords` (Erwachsenen-/YA-Fiktion: 800) |
| `V004` | `wordsPerChapter > 8000` (kein Modell hält Qualität über ~8k Wörter in einem Zug) |
| `V005` | `targetChapters > LIMITS[sizeClass].maxChapters` |
| `V006` | `targetAge ≤ 12` **und** (`sexualContent ≠ none` **oder** `violence = graphic` **oder** `language = strong`) |
| `V007` | `targetAge ≤ 16` **und** `sexualContent ∈ {moderate, explicit}` |
| `V008` | `selfHarm = depicted` **und** `targetAge < 16` |
| `V009` | Freitext enthält nach Moderation ein `hardBlock`-Signal (siehe [13](13-prompting-sicherheit.md) §4) |
| `V010` | Figur ohne `role` `protagonist` bei Fiction mit `targetWords > 15000` |
| `V011` | `povMode.kind = 'single'` und `characterName` existiert nicht in `content.characters` |
| `V012` | `povMode.kind = 'rotating'` mit < 2 oder > 5 POV-Figuren |
| `V013` | Budget-Schätzung überschreitet das verfügbare Credit-Guthaben des Nutzers |
| `V014` | Nicht unterstützte Sprache (kein `LocaleProfile`) |
| `V015` | `track = non_fiction` und kein `topic`/keine `learningGoals` gesetzt |
| `V016` | Stilvorgabe imitiert namentlich einen lebenden Autor (siehe [13](13-prompting-sicherheit.md) §6) |

**Beispiel V002/V003 aus dem Ausgangskonzept:** `30 Kapitel × 350 Wörter` → `V003` (350 < 800)
**und** bei `targetWords = 80000` zusätzlich `V002` (10.500 ≠ 80.000). Es wird nicht gewarnt,
sondern blockiert, mit konkretem Gegenvorschlag:

```json
{
  "code": "V003",
  "severity": "block",
  "message": "350 Wörter pro Kapitel sind zu kurz für einen Roman.",
  "suggestions": [
    { "label": "28 Kapitel × 2.860 Wörter", "patch": { "targetChapters": 28 } },
    { "label": "Als Szenen behandeln: 10 Kapitel × 3 Szenen", "patch": { "targetChapters": 10 } },
    { "label": "Kürzeres Buch: 12.000 Wörter", "patch": { "targetWords": 12000, "targetChapters": 8 } }
  ]
}
```

Jeder Blocker liefert **maschinenlesbare Patch-Vorschläge** — die UI bietet sie als Ein-Klick-Fix an.

### 4.2 WARN-Regeln

| ID | Regel |
|---|---|
| `W001` | Abweichung Kapitel×Wörter vs. Ziel zwischen 5 % und 15 % |
| `W002` | > 8 benannte Hauptfiguren (Kohärenzrisiko) |
| `W003` | > 4 Themen (Verwässerung) |
| `W004` | `humorLevel = high` bei `genre ∈ {horror, thriller}` |
| `W005` | `pov = second` (experimentell, einige Checks eingeschränkt) |
| `W006` | `targetWords > 150000` (Laufzeit > 20 h, Kosten) |
| `W007` | `userMustAvoid` widerspricht `genre` (z. B. "keine Gewalt" bei Thriller) |
| `W008` | `desiredEnding` widerspricht `genre`-Konvention (Romance ohne HEA/HFN) |
| `W009` | Audiobook + `povMode.rotating` (Stimmenzuordnung wird komplex) |

`W007`/`W008` sind die einzigen Validierungen, die **einen LLM-Call nutzen dürfen** —
als Klassifikation mit Structured Output (`{conflict: boolean, reason: string}`), niemals als
Blocker. Alles andere ist reiner Code.

## 5. Content-Rating als Steuerungselement

Das Rating wirkt an **vier** Stellen — im Ausgangskonzept war nur Stelle 1 beschrieben:

| Stelle | Wirkung |
|---|---|
| 1. Planung | Outline-Prompt erhält Rating-Constraints; verbotene Beat-Typen werden ausgeschlossen |
| 2. Generierung | Rating steht im Developer-Prompt als harte Regel, in jedem Kapitel-Call |
| 3. **Commit-Gate** | Nach der Generierung: Lexikon-Prefilter (deterministisch) + Rating-Klassifikation (LLM) → Verstoß = **kein Commit** |
| 4. Export | Metadaten: Content Warnings, Altersfreigabe, KDP-Kategorien |

### 5.1 Rating-Gate-Algorithmus

```ts
function ratingGate(text: string, spec: BookSpec): GateResult {
  // Stufe 1 — deterministisch, kostenlos, hohe Trefferquote bei expliziter Sprache
  const lexHits = scanLexicon(text, spec.form.language, spec.rating);  // Wortlisten je Achse
  // Stufe 2 — LLM-Klassifikation IMMER, wenn targetAge < 18 ODER lexHits > 0
  const needsLlm = ageValue(spec.rating.targetAge) < 18 || lexHits.length > 0;
  const cls = needsLlm ? classifyRating(text) : null;   // Structured Output je Achse

  const violations = compare(cls ?? inferFromLexicon(lexHits), spec.rating);
  if (violations.some(v => v.hardBlock))  return { action: 'BLOCK_AND_FLAG' };  // nie committen
  if (violations.length)                  return { action: 'REPAIR', violations };
  return { action: 'PASS' };
}
```

- `BLOCK_AND_FLAG`: Text wird **nicht** committet, in `moderation_events` protokolliert, Buch
  geht auf `NEEDS_REVIEW`. Bei `hardBlocks` zusätzlich Account-Flag.
- `REPAIR`: normale Repair-Ladder mit expliziter Rating-Anweisung.
- Bei `targetAge ≤ 12` läuft der Gate **auf jedem Kapitel**, ohne Ausnahme.

## 6. Freeze und Änderbarkeit

Nach `freezeSpec` gilt:

| Feld | Nach Start änderbar? | Folge |
|---|---|---|
| `content.workingTitle`, `authorName`, `dedication` | ✓ frei | keine |
| `deliverables.*` | ✓ frei | nur Renderjobs |
| `form.style.toneWords` | ⚠ nur mit Warnung | Stil-Drift möglich; Kalibrierungsprobe bleibt maßgeblich |
| `rating.*` (strenger machen) | ⚠ | Re-Audit aller Kapitel nötig |
| `rating.*` (lockerer machen) | ✓ ab neuem Kapitel | Altkapitel bleiben |
| `scope.targetWords/Chapters` | ✗ | erfordert Re-Planung → neue `BookVersion` |
| `form.pov`, `form.tense`, `language` | ✗ | erfordert Neugenerierung des Buchs |
| `content.characters` (neue Nebenfigur) | ✓ | über Canon-Aufnahmepfad |
| `content.characters` (Kernattribut ändern) | ⚠ | Invalidations-Kaskade wie Nutzeränderung ([11](11-validierung-reparatur.md) §7) |
| `technical.*` | ✗ | eingefroren |

Die UI muss diese Tabelle 1:1 abbilden — sonst versprechen wir Änderbarkeit, die das System
nicht konsistent halten kann.
