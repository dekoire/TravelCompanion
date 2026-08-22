# 06 — Story-Bible, Figuren, Stil, Kalibrierung

## 1. Aufbau des Canon

```
Canon
├─ Story-Bible        weitgehend stabil, aber erweiterbar (§7)
│   ├─ World          Zeit, Ort, Ordnung, Technologie, Regeln
│   ├─ Rules          harte, prüfbare Constraints (Magie, Technik, Gesellschaft)
│   ├─ Locations      + Reisematrix
│   ├─ Factions       Organisationen, Familien, Gruppen
│   ├─ Characters     Stammdaten + Bogen + Voice Profile
│   ├─ Relationships  Startwerte je Paar
│   └─ Glossary       Eigennamen, Begriffe, Schreibweisen
├─ Style Profile      messbare Stilparameter + Kalibrierungsprobe
└─ Dynamischer State  → 07-state-memory.md
```

## 2. World und Regeln

```jsonc
{
  "era": { "label": "spätviktorianisch", "yearStart": 1893, "yearEnd": 1895, "calendar": "gregorian" },
  "setting": { "region": "englische Nordseeküste", "primaryLocation": "Hafenstadt Ardmoor",
               "climate": "rau, nebelig", "season": "Herbst" },
  "society": {
    "order": "Klassengesellschaft, Industrialisierung",
    "genderNorms": "Frauen selten in Archivberufen — June ist Ausnahme, das wird bemerkt",
    "formsOfAddress": "Sie/Herr/Miss als Standard zwischen Nicht-Verwandten",
    "law": "lokale Polizei, Inspektor-System",
    "religion": "anglikanisch, formal"
  },
  "technology": {
    "available": ["Telegraf", "Gaslicht", "Dampfschiff", "Fotografie"],
    "unavailable": ["Telefon im Privathaushalt", "Auto", "Antibiotika", "Fingerabdruck-Datenbank"]
  },
  "rules": [
    { "ruleId": "r_light", "rule": "Der Leuchtturm wird manuell befeuert, jede Nacht ab Dämmerung",
      "implications": ["Ein dunkler Leuchtturm ist immer ein Ereignis"],
      "exceptions": [], "checkable": true },
    { "ruleId": "r_post", "rule": "Post zwischen Ardmoor und London braucht mindestens 2 Tage",
      "implications": ["Kein Brief kann am selben Tag Antwort erhalten"],
      "exceptions": ["Telegramm: 4 Stunden"], "checkable": true }
  ]
}
```

### 2.1 Regeln für Fantasy/SciFi

Eine Regel ist nur brauchbar, wenn sie **falsifizierbar** ist:

```jsonc
{
  "ruleId": "r_teleport",
  "rule": "Teleportation erfordert direkten Sichtkontakt zum Ziel",
  "cost": { "type": "memory", "amount": "eine jüngere Erinnerung", "recovery": "nie" },
  "limits": { "maxDistanceMeters": 800, "cooldownMinutes": 60, "maxPerDay": 3 },
  "requires": ["line_of_sight"],
  "forbidden": ["Teleportation in unbekannte Räume", "Mitnahme lebender Personen"],
  "exceptions": [{ "when": "Blutsverwandte", "effect": "Mitnahme möglich, doppelter Preis" }],
  "checkable": true,
  "checkExpressions": [
    "usage(teleport, character) ≤ 3 per storyDay",
    "requires(line_of_sight) = true"
  ]
}
```

`checkExpressions` nutzt dieselbe Grammatik wie Scene-Preconditions
([04](04-planung-fiction.md) §9.1) → Magie-Missbrauch wird **deterministisch** erkannt
("Magie ohne Kosten" aus der Fehlerliste des Ausgangskonzepts).

**Regel-Lint bei der Erstellung:** Jede Regel braucht `cost` **oder** `limits`, sonst
Rückfrage an das Planungsmodell. Regeln ohne Preis erzeugen Deus-ex-machina-Enden.

## 3. Figur

```jsonc
{
  "characterId": "june",
  "canonicalName": "June Weber",
  "nameVariants": { "formal": "Miss Weber", "informal": "June", "nickname": ["Junie"],
                    "byCharacter": { "tomas": "Miss Weber", "brother": "Junie" },
                    "forbidden": ["Frau Weber", "Jane"] },
  "role": "protagonist",
  "age": 34, "birthYear": 1860,
  "appearance": {
    "immutable": { "eyeColor": "graugrün", "height": "1,64 m", "scars": ["rechtes Knie"],
                   "hairColor": "dunkelblond" },
    "mutable": { "hairLength": "schulterlang", "clothingStyle": "praktisch, dunkel" }
  },
  "origin": "Tochter eines Hafenmeisters, Ardmoor",
  "occupation": "Archivarin",
  "personality": { "traits": ["misstrauisch", "genau", "stur"],
                   "values": ["Wahrheit vor Bequemlichkeit"],
                   "flaws": ["kann nicht loslassen", "verletzt Menschen mit Genauigkeit"],
                   "fears": ["dass ihre Erinnerung an den Vater falsch ist"] },
  "goals": { "external": "beweisen, dass der Vater unschuldig war",
             "internal": "sich selbst verzeihen, ihn verlassen zu haben" },
  "abilities": [{ "what": "Handschriften datieren", "level": "expert", "establishedInChapter": 6 }],
  "limitations": ["hinkt bei Nässe", "kein Zugang zu Polizeiakten"],
  "backstory": "…",
  "secrets": [{ "what": "Sie hat einen Brief vernichtet", "knownBy": [], "revealChapter": 24 }],
  "arc": { "from": "loyal und blind", "via": "Zweifel, Verrat, Isolation",
           "to": "klarsichtig und einsam",
           "milestones": [{ "chapter": 14, "shift": "erster echter Zweifel" }] },
  "canonStatus": "accepted",
  "firstAppearanceChapter": 1
}
```

`appearance.immutable` vs `mutable` ist die Basis des deterministischen Checks
"Augenfarbe verändert": nur `immutable`-Felder werden hart geprüft, `mutable` darf sich ändern
(braucht dann aber ein Event).

## 4. Voice Profile

```jsonc
{
  "characterId": "tomas",
  "register": "gehoben, kontrolliert",
  "avgSentenceLength": 18,
  "sentenceLengthVariance": "low",
  "vocabulary": { "level": "akademisch", "preferred": ["gewiss", "im Übrigen", "man könnte sagen"],
                  "avoided": ["okay", "krass", "ehrlich gesagt"], "neverUses": ["Slang", "Kraftausdrücke"] },
  "dialect": null,
  "verbalTics": ["beginnt Widerspruch mit „Nun –“"],
  "humor": "trocken, selten",
  "directness": "indirekt, spricht in Andeutungen",
  "metaphorDomain": ["Handel", "Wetter"],
  "speechPatterns": { "usesQuestions": "rhetorisch", "interrupts": false,
                      "fillerWords": [], "avgTurnLength": "mittel bis lang" },
  "underStress": "wird kürzer und präziser statt lauter",
  "addressStyle": { "default": "formal", "toSubordinates": "formal_cold" },
  "sampleLines": [
    "„Nun – das ist eine bemerkenswerte Vermutung, Miss Weber.“",
    "„Ich habe den Brief nie gesehen. Das ist die ganze Auskunft, die ich geben kann.“"
  ]
}
```

`sampleLines` werden nicht erfunden, sondern nach dem kalibrierten Kapitel 1 **aus dem echten
Text extrahiert** und danach bei jeder Figur, die in einem Kapitel spricht, in den Kontext
gegeben. Das stabilisiert Figurenstimmen deutlich besser als Adjektive.

### 4.1 Voice-Drift-Check (deterministisch)

Pro Kapitel, je Figur mit ≥ 3 Redebeiträgen:

```ts
metrics = {
  avgSentenceLength: …,          // Abweichung > 40 % → Issue
  typeTokenRatio: …,             // Wortschatzbreite
  forbiddenWordHits: …,          // vocabulary.neverUses / avoided  → Issue (hart)
  ticPresence: …,                // verbalTics zu häufig (> 1 pro 400 Wörter Rede) → Manierismus
  questionRatio: …,
  avgTurnLength: …
}
```
`forbiddenWordHits` ist ein direkter, kostenloser Treffer auf das Problem "Stimme verändert sich".

## 5. Style Profile

```jsonc
{
  "pov": "third_limited", "tense": "past",
  "narrativeDistance": "close",         // close | medium | distant
  "avgSentenceWords": 16, "sentenceWordsRange": [4, 34],
  "sentenceLengthVariancTarget": "high",
  "avgParagraphSentences": 4, "paragraphRange": [1, 8],
  "dialogueRatioTarget": [0.30, 0.50],
  "descriptionRatioTarget": [0.20, 0.35],
  "interiorityRatioTarget": [0.15, 0.30],
  "imagery": { "density": "medium", "domains": ["Meer", "Papier", "Licht"],
               "forbidden": ["Sport", "Krieg", "moderne Technik"] },
  "sensoryBalance": { "sight": 0.4, "sound": 0.25, "smell": 0.15, "touch": 0.15, "taste": 0.05 },
  "devices": { "allowed": ["Ellipse", "freie indirekte Rede", "Wiederholung als Motiv"],
               "discouraged": ["rhetorische Fragen an den Leser", "Adverb nach Dialogtag"],
               "forbidden": ["Cliffhanger-Ankündigung", "auktoriale Vorausdeutung"] },
  "dialogueTags": { "preferred": ["sagte", "fragte"], "maxExoticPerChapter": 2,
                    "adverbPolicy": "rare" },
  "chapterOpeningPolicy": "varied",
  "quoteStyle": "de_low_high",
  "sceneBreakMarker": "***",
  "profanity": "mild",
  "calibrationSampleIds": ["pas_ch1_03", "pas_ch1_07", "pas_ch1_12"]
}
```

Alle Ratio-Felder sind **messbar** — deshalb sind sie hier und nicht als Adjektive im Prompt.

## 6. Stil-Kalibrierung über Kapitel 1

### 6.1 Ablauf

1. Kapitel 1 wird in **3 Varianten** generiert (bei XS/S: 2), mit systematisch variierten
   Parametern — nicht mit "schreib es anders":

   | Variante | Distanz | Satzrhythmus | Dialoganteil | Bildsprache | Einstieg |
   |---|---|---|---|---|---|
   | A | close | varied | 0,40 | medium | in medias res |
   | B | medium | flowing (länger) | 0,25 | rich | sensorisches Detail |
   | C | close | short/punchy | 0,55 | sparse | Dialog |

2. Der Nutzer liest alle drei (UI: nebeneinander, gleiche Szene) und wählt eine — optional
   mit Feineinstellungen ("A, aber weniger Dialog").
3. **Extraktion der Kalibrierung** (deterministisch + 1 LLM-Call):
   - deterministisch: alle Ratio-Kennzahlen aus dem gewählten Text messen → sie **überschreiben**
     die Zielwerte im Style Profile. Der gewählte Text definiert den Stil, nicht die Vorgabe.
   - LLM: 3 repräsentative Absätze auswählen (Kriterien: einer mit Dialog, einer mit
     Beschreibung, einer mit Innensicht; je 80–150 Wörter) → `calibrationSampleIds`.
4. Voice-Sample-Extraktion je auftretender Figur (je 2 Zeilen).

### 6.2 Auswahl der Few-Shot-Absätze (deterministisch, kein "man nimmt zwei")

```ts
function pickCalibrationSamples(chapter: Passage[]): Passage[] {
  const candidates = chapter.filter(p => wordCount(p) >= 80 && wordCount(p) <= 160);
  return [
    bestBy(candidates, p => dialogueRatio(p)),                        // dialoglastigster
    bestBy(candidates, p => descriptionScore(p)),                     // beschreibendster
    bestBy(candidates, p => interiorityScore(p)),                     // innensichtigster
  ];
}
```

### 6.3 Späterer Stilwechsel

Wenn der Nutzer nach Kapitel 12 den Stil ändern will:
- Neue Kalibrierung wird als `style_profile_version = 2` gespeichert.
- Alle bisherigen Kapitel erhalten den Status `style_outdated`.
- Der Nutzer wählt: (a) nur ab hier neuer Stil (Warnung: Bruch), (b) Restyling-Pass über
  alle bisherigen Kapitel (Kostenanzeige!), (c) verwerfen.
- Restyling ist ein **eigener Job-Typ**, der Text umschreibt, ohne Fakten zu ändern — mit
  anschließendem Delta-Vergleich: Wenn sich Fakten geändert haben, ist das ein Fehler.

## 7. Canon-Erweiterung während der Generierung

Die Story-Bible ist nicht abgeschlossen. Beim Schreiben entstehen Nebenfiguren, Orte, Begriffe.
Ohne Aufnahmepfad driftet die Welt.

```
Extraktion meldet neue Entität
  → entity.canon_status = 'proposed'
  → deterministischer Dedup-Check:
       trigram-Ähnlichkeit zu bestehenden Namen > 0.72  ODER
       Levenshtein ≤ 2  ODER
       unaccent-normalisiert identisch
    → Treffer: als Alias vorschlagen statt neue Entität
  → Bedeutungs-Score = Erwähnungen × Gewicht(Rolle) × hatDialog
  → Score ≥ Schwelle (z. B. 3 Erwähnungen oder 1 Dialogzeile)
       → auto-accept: minimales Profil wird generiert (Name, Rolle, 3 Merkmale, Voice-Kurzprofil)
       → wird ab dem nächsten Kapitel Teil des Kontexts
  → sonst: bleibt 'proposed', erscheint im Act-Review zur Nutzerbestätigung
```

**Warum das wichtig ist:** Ohne diesen Pfad heißt der Wirt in Kapitel 4 "Bram", in Kapitel 19
"Bran", und niemand merkt es — weil "Bram" nie im Glossar stand.

## 8. Glossar

```jsonc
{
  "entryId": "gl_ardmoor",
  "term": "Ardmoor",
  "type": "location",              // person | location | object | organization | concept | title | invented
  "canonicalSpelling": "Ardmoor",
  "allowedVariants": ["Ardmoor-Hafen"],
  "forbiddenVariants": ["Ardmore", "Ardmoore"],
  "pronunciation": "ˈɑːdmɔː",      // für TTS
  "capitalization": "always",
  "italics": false,
  "firstAppearanceChapter": 1,
  "definition": "Hafenstadt an der Nordseeküste"
}
```

`forbiddenVariants` wird beim Anlegen automatisch mit typischen Verschreibungen gefüllt
(Buchstabendreher, doppelte Konsonanten, fehlendes -e). Der Kapitelcheck ist dann ein
simpler, deterministischer Textscan — und fängt "falsche Namensvariante" zuverlässig.

`pronunciation` ist Pflicht für erfundene Namen, sobald `deliverables.audiobook = true`
(→ [19](19-export-medien.md) §6).
