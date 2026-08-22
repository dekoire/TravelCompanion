# 04 — Planung: Fiction-Track

Die Planung ist der Teil, der über die Qualität des Buches entscheidet. Sie kostet ~3–6 % des
Gesamtbudgets und verhindert 80 % der teuren Fehler.

## 1. Planungs-Pipeline (Reihenfolge ist verbindlich)

```
 1  premise            LLM   Prämisse, Konflikt, Kernfrage, Zielemotion   (3 Varianten intern, 1 gewählt)
 2  world_seed         LLM   Weltkern + harte Weltregeln
 3  characters         LLM   Figuren-Stammdaten + Bögen + Voice Profiles
 4  ending_contract    LLM   verbindliches Ende, VOR der Outline
 5  thread_plan        LLM   Hauptplot + Subplots als Thread-Objekte
 6  arc_skeleton       CODE  Act-Grenzen, Wortbudgets, Positionsanker      ← kein LLM
 7  outline_v1 / v2    LLM   zwei vollständige Kapitel-Outlines (parallel)
 8  outline_lint       CODE  strukturelle Prüfung beider Varianten         ← kein LLM
 9  user_choice        USER  Variante wählen (oder Mischung anfordern)
10  structure_expand   CODE  Acts/Chapters/Scenes als Zeilen anlegen       ← kein LLM
11  chapter_cards      LLM   Chapter Cards in Batches von 6–8 Kapiteln
12  card_lint          CODE  Vollständigkeit, Threads, Verteilung          ← kein LLM
13  scene_cards        LLM   Scene Cards je Kapitel (lazy: Act-weise)
14  clue_plan          LLM   Hinweis/Payoff-Ledger (nur Mystery/Thriller/Fantasy)
15  plan_audit         LLM   Gesamtprüfung des Plans gegen Ending Contract
```

**Warum Ende vor Outline (Schritt 4 vor 7):** Ein LLM, das die Outline zuerst schreibt,
konstruiert das Ende aus dem, was es gerade erfunden hat. Umgekehrt wird jedes Kapitel
zielgerichtet. Das ist die wirksamste Einzelmaßnahme gegen "Ende beantwortet Hauptfrage nicht".

**Warum Schritte 6, 8, 10, 12 ohne LLM:** Wortbudgets, Positionsanker und
Strukturvollständigkeit sind Arithmetik. Ein LLM, das rechnet, produziert 28 Kapitel, die
zusammen 61.000 statt 82.000 Wörter ergeben.

## 2. Premise-Objekt

```jsonc
{
  "logline": "Eine Archivarin muss beweisen, dass ihr toter Vater kein Verräter war — und findet heraus, dass er es war.",
  "centralQuestion": "Wer hat den Brief von 1894 geschrieben?",
  "dramaticQuestion": "Kann June die Wahrheit ertragen, die sie sucht?",
  "coreConflict": { "type": "person_vs_self", "external": "…", "internal": "…" },
  "stakes": { "personal": "…", "public": "…", "escalation": ["…", "…"] },
  "targetEmotion": ["Melancholie", "Erleichterung"],
  "promiseToReader": "Ein Rätsel mit fairen Hinweisen, gelöst durch Beobachtung, nicht durch Zufall",
  "toneReference": "atmosphärisch, ruhig, mit kalter Spannung"
}
```

`promiseToReader` ist der Anker für den Schluss-Audit: Wenn das Buch dieses Versprechen bricht
(z. B. Rätsel wird durch Zufall gelöst), ist das ein Issue der Kategorie `promise_broken`.

## 3. Ending Contract

Wird **vor** der Outline erzeugt und ist danach nur mit expliziter Nutzerfreigabe änderbar.

```jsonc
{
  "endingId": "end_01",
  "finalRevelation": "Der Brief stammt von Junes Vater; er hat den Hafenbrand gedeckt.",
  "protagonistFinalChoice": "June veröffentlicht die Wahrheit, obwohl sie ihre Familie zerstört.",
  "characterEndStates": [
    { "characterId": "june",  "external": "verlässt die Stadt", "internal": "hat Frieden mit der Ambivalenz",
      "relationshipChanges": [{ "with": "tomas", "trust": -60, "closeness": -40 }] },
    { "characterId": "tomas", "external": "verhaftet", "internal": "unreuig" }
  ],
  "mainQuestionAnswer": "Der Vater war schuldig — aber aus Loyalität, nicht aus Gier.",
  "mandatoryThreadResolutions": [
    { "threadId": "missing_letter", "resolution": "Brief wird öffentlich verlesen" },
    { "threadId": "june_and_brother", "resolution": "Bruch, keine Versöhnung" }
  ],
  "intentionalAmbiguities": ["Ob der Bruder von der Deckung wusste, bleibt offen"],
  "requiredSetups": [
    { "what": "Junes Fähigkeit, Handschriften zu datieren", "byChapter": 6 },
    { "what": "Die Existenz des zweiten Briefs",             "byChapter": 14 }
  ],
  "emotionalTarget": "bittersüß, nicht tröstlich",
  "finalSceneSketch": "600–900 Wörter Prosaskizze — Ziel, nicht Endtext",
  "finalImage": "Der leere Leuchtturm, das Licht bleibt aus",
  "forbiddenEndings": ["Deus ex machina", "Es war ein Traum", "Tomas gesteht freiwillig"]
}
```

`requiredSetups` wird in Schritt 11 automatisch in die Chapter Cards der genannten Kapitel als
`requiredEvents` eingetragen — **deterministisch**, nicht als Bitte an das Modell.

## 4. Act-Skelett (deterministisch)

```ts
const ANCHORS_4ACT = [
  { at: 0.00, beat: 'opening_image',    actIndex: 0 },
  { at: 0.10, beat: 'inciting_incident',actIndex: 0 },
  { at: 0.22, beat: 'first_threshold',  actIndex: 1 },
  { at: 0.37, beat: 'first_pinch',      actIndex: 1 },
  { at: 0.50, beat: 'midpoint',         actIndex: 1 },
  { at: 0.62, beat: 'second_pinch',     actIndex: 2 },
  { at: 0.75, beat: 'all_is_lost',      actIndex: 2 },
  { at: 0.80, beat: 'dark_night',       actIndex: 2 },
  { at: 0.88, beat: 'climax',           actIndex: 3 },
  { at: 0.96, beat: 'resolution',       actIndex: 3 },
];

// Anker → Kapitelnummer
anchorChapter(at) = clamp(Math.round(at * targetChapters), 1, targetChapters)
```

Genre-Overrides (`ANCHORS_ROMANCE`, `ANCHORS_MYSTERY`, `ANCHORS_THREE_ACT`) liegen als
Konstanten im Code, nicht im Prompt. Das Modell bekommt die berechneten Anker als *Vorgabe*.

Jeder Act erhält:

```jsonc
{
  "actIndex": 1, "title": "Die Spur",
  "goal": "June findet heraus, dass der Brief nicht allein steht",
  "centralConflict": "…",
  "startState": "June glaubt an die Unschuld des Vaters",
  "endState": "June zweifelt zum ersten Mal ernsthaft",
  "chapterRange": [7, 15],
  "wordBudget": 22960,
  "tensionCorridor": [40, 70],
  "revelations": ["Existenz des zweiten Briefs"],
  "characterDevelopment": [{ "characterId": "june", "from": "loyal", "to": "misstrauisch" }],
  "activeThreads": ["missing_letter", "june_and_brother"],
  "turningPoint": { "chapter": 15, "beat": "midpoint", "what": "…" }
}
```

## 5. Thread-Register

```jsonc
{
  "threadId": "missing_letter",
  "type": "main",                     // main | subplot | character_arc | relationship | mystery | thematic
  "title": "Der verschollene Brief",
  "premise": "…",
  "owner": "june",
  "introduceInChapter": 2,
  "plannedBeats": [
    { "chapter": 2,  "kind": "introduce",  "what": "June findet den Brief" },
    { "chapter": 6,  "kind": "complicate", "what": "Die Handschrift passt nicht" },
    { "chapter": 15, "kind": "reversal",   "what": "Der zweite Brief taucht auf" },
    { "chapter": 22, "kind": "crisis",     "what": "Der Brief wird gestohlen" },
    { "chapter": 27, "kind": "payoff",     "what": "Öffentliche Verlesung" }
  ],
  "plannedPayoffChapter": 27,
  "mandatory": true,
  "maxSilenceChapters": 5,
  "status": "planned",                // planned | open | dormant | resolved | abandoned
  "lastTouchedChapter": null
}
```

### 5.1 Thread-Scheduler (deterministisch, läuft vor jedem Kapitel)

```ts
function scheduleObligations(chapterNo: number, threads: Thread[]): Obligation[] {
  const obs: Obligation[] = [];
  for (const t of threads) {
    if (t.status === 'resolved' || t.status === 'abandoned') continue;

    // a) geplanter Beat für dieses Kapitel
    const beat = t.plannedBeats.find(b => b.chapter === chapterNo);
    if (beat) obs.push({ threadId: t.threadId, kind: 'beat', priority: 100, what: beat.what });

    // b) Verstummungsregel
    const silence = chapterNo - (t.lastTouchedChapter ?? t.introduceInChapter);
    if (silence >= t.maxSilenceChapters)
      obs.push({ threadId: t.threadId, kind: 'touch', priority: 60 + silence,
                 what: `${t.title} muss mindestens angedeutet werden` });

    // c) Payoff-Vorlauf: Setup-Fenster schließt sich
    if (t.plannedPayoffChapter - chapterNo === 2 && !t.setupComplete)
      obs.push({ threadId: t.threadId, kind: 'setup_urgent', priority: 95, what: '…' });
  }
  return obs.sort((a, b) => b.priority - a.priority).slice(0, 4);   // max 4 pro Kapitel
}
```

Die Kappung auf 4 ist wichtig: Sonst wird ein Kapitel im Mittelteil zur Checkliste und liest
sich mechanisch. Nicht erfüllte Obligations wandern mit erhöhter Priorität ins nächste Kapitel.

## 6. Clue- und Payoff-Ledger

Pflicht bei `mystery`, `thriller`, `crime`; optional sonst.

```jsonc
{
  "clueId": "clue_handwriting",
  "threadId": "missing_letter",
  "truth": "Die Handschrift ist die des Vaters, verstellt",
  "plantedInChapter": 6,
  "visibility": "hidden",             // obvious | noticeable | hidden | red_herring
  "perceivedBy": ["june"],
  "misreadingOffered": "June hält es für eine Fälschung",
  "payoffChapter": 27,
  "fairPlay": true,
  "status": "planned"                 // planned | planted | reinforced | paid_off | dangling
}
```

**Fair-Play-Regel (deterministisch prüfbar):** Für jede `finalRevelation` muss mindestens ein
Clue mit `plantedInChapter < climaxChapter - 2` und `fairPlay = true` existieren. Fehlt er,
ist das ein `BLOCK`-Issue im Pre-Climax-Audit — nicht erst im Endaudit, wo eine Reparatur
das halbe Buch berührt.

## 7. Outline-Varianten

Zwei Varianten werden **parallel** erzeugt (zustandsfrei — hier ist Parallelisierung erlaubt),
mit unterschiedlichen Steuerparametern:

| | Variante A | Variante B |
|---|---|---|
| Fokus | plotgetrieben | figurengetrieben |
| Struktur | konventionelle Genre-Beats | eine bewusste Abweichung |
| Tempo | schnellerer Einstieg | längerer Aufbau |
| Subplot-Gewicht | 20 % | 35 % |

Beide gegen denselben Ending Contract. Der Nutzer sieht einen **Vergleich**, keine Rohtexte:
Beat-Zeitleiste, Kapiteltitel, Unterschiedsmarkierung, Tension-Kurve, geschätzte Kapitellängen.
Zusätzlich Option "Variante A, aber Subplot-Gewicht von B" → erzeugt A' in einem gezielten
Merge-Call.

### 7.1 Outline-Lint (deterministisch, vor der Anzeige)

| Check | Regel |
|---|---|
| Kapitelanzahl | exakt `targetChapters` |
| Wortsumme | Summe der geplanten Kapitelwörter innerhalb ±3 % von `targetWords` |
| Act-Zuordnung | jedes Kapitel genau einem Act, keine Lücken |
| Anker | jeder Beat aus `ANCHORS` ist genau einem Kapitel zugeordnet, in korrekter Reihenfolge |
| Threads | jeder `mandatory` Thread hat Introduce + ≥ 2 mittlere Beats + Payoff |
| Silence | kein Thread länger als `maxSilenceChapters` ohne Beat |
| Ending | letztes Kapitel referenziert `endingId` |
| Setups | alle `requiredSetups` vor ihrem `byChapter` platziert |
| Figuren | jede Hauptfigur in ≥ 25 % der Kapitel aktiv |
| POV | bei `rotating`: keine Figur > 3 Kapitel am Stück |
| Duplikate | keine zwei Kapitel mit identischer `primaryFunction` |

Fällt ein Check, geht die Variante **automatisch in einen Fix-Call** (max. 2), erst dann zum
Nutzer. Der Nutzer soll nie eine strukturell kaputte Outline sehen.

## 8. Chapter Card

```jsonc
{
  "chapterId": "ch_14",
  "chapterNo": 14,
  "actIndex": 1,
  "partIndex": null,
  "title": "Der zweite Brief",
  "beatAnchor": "midpoint",
  "povCharacterId": "june",
  "primaryFunction": "Enthüllung: Tomas hat den zweiten Brief zurückgehalten",
  "secondaryFunction": "Junes Misstrauen gegenüber dem Bruder vertiefen",

  "targetWords": 3100,
  "wordCorridor": [2790, 3410],
  "sceneCount": 3,

  "startState": {
    "location": "archive_basement", "storyTime": "1894-10-12T18:00",
    "protagonistEmotion": "angespannt, hoffnungsvoll",
    "requiredFacts": ["archive_key.owner = june", "second_letter.known_by ∌ june"]
  },
  "endState": {
    "location": "cliff_path", "storyTime": "1894-10-12T22:15",
    "protagonistEmotion": "verraten, entschlossen",
    "requiredFacts": ["second_letter.known_by ∋ june", "trust(june,tomas) ≤ 20"]
  },

  "activeCharacters": ["june", "tomas"],
  "mentionedCharacters": ["father"],
  "activeThreads": ["missing_letter", "june_and_brother"],
  "obligations": [
    { "threadId": "june_and_brother", "kind": "touch", "what": "Andeutung des Streits" }
  ],
  "requiredEvents": [
    { "id": "re_1", "what": "June entdeckt den zweiten Brief in Tomas' Mantel", "critical": true },
    { "id": "re_2", "what": "Tomas leugnet, ihn gekannt zu haben", "critical": true }
  ],
  "forbiddenReveals": ["Identität des Briefschreibers", "Rolle des Bruders"],
  "forbiddenEvents": ["June konfrontiert den Bruder"],

  "tensionTarget": 72,
  "emotionalArc": { "from": "hope", "to": "betrayal" },
  "dialogueCorridor": [0.35, 0.55],
  "pacing": "medium_fast",
  "openingType": "in_medias_res",
  "closingType": "revelation_hook",
  "cliffhanger": true,
  "handshake": { "prevChapterLastLine": "…", "mustNotRepeatOpenings": ["dialogue", "weather"] },

  "sceneIds": ["sc_14_1", "sc_14_2", "sc_14_3"],
  "cardVersion": 1,
  "generatedBy": { "promptVersion": "pr_2026_08_03", "runId": "run_…" }
}
```

### 8.1 Opening- und Closing-Typen

```
openingType:  in_medias_res | dialogue | new_information | location_shift | action
              | memory | immediate_consequence | sensory_detail | reflection | time_jump
closingType:  revelation_hook | decision | cliffhanger | emotional_beat | question
              | quiet_close | reversal | arrival
```

**Anti-Monotonie-Regel (deterministisch):** `openingType` darf nicht mit einem der letzten
**drei** Kapitel übereinstimmen; `closingType` nicht mit den letzten **zwei**. Über 10 Kapitel
müssen mindestens 5 verschiedene `openingType` vorkommen. Verstoß in der Planung = Card-Lint-
Fehler; Verstoß im Text = Stil-Issue (→ [11](11-validierung-reparatur.md) §3).

### 8.2 Tension-Kurve

Zielspannung pro Kapitel wird deterministisch aus der Act-Struktur interpoliert:

```ts
tension(chapterNo) = baseCurve(position) + actModifier + beatBoost + noise(seedByChapter)
// baseCurve: monoton steigend mit lokalen Tiefs nach Wendepunkten
// beatBoost: +15 an Ankern, −20 im Kapitel nach 'all_is_lost'
// noise: ±5, deterministisch aus chapterNo abgeleitet → verhindert Sägezahn-Gleichförmigkeit
```

Gemessen wird die tatsächliche Spannung über Proxys (→ [11](11-validierung-reparatur.md) §3.6);
Abweichung > 25 Punkte = Warnung, nie Blocker.

## 9. Scene Card

```jsonc
{
  "sceneId": "sc_14_2",
  "chapterId": "ch_14",
  "index": 2,
  "goal": "June findet den Brief",
  "type": "discovery",                  // action | dialogue | discovery | conflict | transition | reflection | flashback
  "targetWords": 1150,
  "location": "coat_room",
  "storyTimeStart": "1894-10-12T20:40",
  "durationMinutes": 25,
  "presentCharacters": ["june"],
  "offscreenCharacters": ["tomas"],
  "objects": ["second_letter", "coat"],
  "threads": ["missing_letter"],

  "preconditions": [
    { "expr": "location(june) = archive_hall" },
    { "expr": "knows(june, second_letter_exists) = false" }
  ],
  "requiredChanges": [
    { "expr": "knows(june, second_letter_exists) = true" },
    { "expr": "possession(second_letter) = june" }
  ],
  "forbiddenChanges": [
    { "expr": "knows(june, letter_author_identity)" },
    { "expr": "location(tomas) = coat_room" }
  ],
  "emotionalArc": { "from": "anxious", "to": "shocked" },
  "beats": [
    "June sucht ihren Schal im Mantelraum",
    "Sie erkennt Tomas' Mantel am Geruch",
    "Der Umschlag fällt heraus",
    "Sie liest die erste Zeile und hört Schritte"
  ],
  "exitCondition": "Schritte auf der Treppe — Szenenschnitt",
  "transitionToNext": "hard_cut"        // hard_cut | continuous | time_skip | pov_shift
}
```

### 9.1 Ausdruckssprache für Pre-/Postconditions

Bedingungen sind **maschinell auswertbar**, nicht Prosa. Minimalgrammatik:

```
predicate  := location | possession | knows | believes | alive | injured | present
            | trust | closeness | address_mode | state | flag
expr       := predicate '(' args ')' op value
op         := '=' | '≠' | '≥' | '≤' | '∋' | '∌'
```

Beispiele:
```
location(june) = archive_hall
possession(archive_key) = tomas
knows(june, letter_author_identity) = false
trust(june, tomas) ≤ 20
alive(father) = false
address_mode(june, tomas) = formal
```

Der Parser liegt in `packages/domain/conditions.ts`. Jede Bedingung wird gegen den berechneten
Story-State ausgewertet → **deterministischer** Pre-/Postcondition-Check ohne LLM
(→ [11](11-validierung-reparatur.md) §2.4). Das ist der technische Kern des
"ConWriter"-Gedankens aus dem Ausgangskonzept.

## 10. Plan-Audit (letzter Planungsschritt)

Ein LLM-Call mit hohem Reasoning über: Premise + Ending Contract + Acts + alle Chapter Cards
(komprimiert) + Threads + Clues. Prüft:

- Erfüllt der Plan den Ending Contract vollständig?
- Gibt es Kapitel ohne dramaturgische Notwendigkeit? (Kandidaten für Streichung/Verschmelzung)
- Wiederholen sich Konflikte?
- Ist der Mittelteil (Kapitel 40–60 %) eigenständig motiviert oder nur Überbrückung?
- Hat jede Hauptfigur einen erkennbaren Bogen mit Wendepunkt?
- Sind alle Enthüllungen vorbereitet?

Ausgabe: Issue-Liste mit `chapterNo`, `severity`, `suggestedPatch`. Patches mit
`severity ≥ high` werden automatisch angewandt und die betroffenen Cards neu erzeugt;
der Rest geht in die Nutzeranzeige.
