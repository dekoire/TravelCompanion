# 05 — Planung: Non-Fiction-Track (Sachbuch, Ratgeber, Lehrbuch)

Dieser Track fehlte im Ausgangskonzept vollständig. Er ist der Fall "Ich habe ein **Thema**
und will daraus ein großes Buch".

## 1. Warum ein eigener Track

| | Fiction | Non-Fiction |
|---|---|---|
| Wahrheitsbegriff | intern konsistent (die Welt ist erfunden) | **extern korrekt** (die Welt existiert) |
| Hauptfehler | Timeline, Besitz, Wissen, Stimme | **Halluzination**, Redundanz, Begriffsdrift, falsche Progression |
| Planungsobjekt | Plot, Figurenbogen | Thesenbaum, Lernzielkette |
| Gedächtnis | Story-State | Claim-Ledger + Terminologie-Kanon |
| Ende | Ending Contract | Zielkompetenz des Lesers |
| Größte Gefahr | langweilig | **falsch** |

Deshalb: eigene Planungsobjekte, eigene Checks, eine zusätzliche harte Regel —
**keine überprüfbare Tatsachenbehauptung ohne Herkunftskennzeichnung.**

## 2. Planungs-Pipeline

```
 1  topic_frame        LLM   Thema, Zielgruppe, Vorwissen, Nutzenversprechen, Abgrenzung
 2  learning_outcomes  LLM   3–8 Lernziele, messbar formuliert
 3  thesis_tree        LLM   Kernthese → Teilthesen → Argumente → Belege
 4  knowledge_audit    LLM   Welche Claims brauchen externe Quellen? Wo ist Wissen unsicher?
 5  source_plan       CODE+  Quellenstrategie je Claim (siehe §5)
 6  terminology        LLM   Begriffskanon mit Definitionen + Einführungsreihenfolge
 7  structure          CODE  Teile/Kapitel/Abschnitte + Wortbudgets
 8  outline_v1 / v2    LLM   zwei Gliederungsvarianten (didaktisch vs. thematisch)
 9  outline_lint       CODE  Progression, Redundanz, Abdeckung der Lernziele
10  user_choice        USER
11  chapter_cards      LLM   Kapitelkarten mit Lernziel, Vorwissen, Beispielen, Übungen
12  redundancy_matrix  CODE  Wer erklärt was zuerst? (§6)
13  card_lint          CODE
14  plan_audit         LLM
```

## 3. Topic Frame

```jsonc
{
  "topic": "Cashflow-Steuerung in kleinen Handwerksbetrieben",
  "audience": { "who": "Inhaber 5–30 Mitarbeiter", "priorKnowledge": "kaufmännisch angelernt",
                "painPoints": ["Liquiditätslücken", "Angst vor Steuerberater-Gesprächen"] },
  "promise": "Nach dem Buch kann der Leser eine 13-Wochen-Liquiditätsplanung selbst führen.",
  "scopeIn":  ["Liquiditätsplanung", "Forderungsmanagement", "Preiskalkulation"],
  "scopeOut": ["Steuerrecht im Detail", "Unternehmensbewertung", "Auslandsgeschäft"],
  "stance": "praktisch, ohne Finanzjargon, ohne Motivationsfloskeln",
  "jurisdiction": "DE",            // wichtig: Recht/Steuern sind länderabhängig
  "recencyRequirement": "2024+",   // Claims älter als das brauchen Kennzeichnung
  "authorPersona": { "role": "erfahrener Berater", "usesFirstPerson": true }
}
```

`jurisdiction` und `recencyRequirement` sind Pflicht bei Recht, Steuern, Medizin, Finanzen.
Sie steuern später harte Gates (§7).

## 4. Thesenbaum

```jsonc
{
  "coreThesis": "Liquidität ist eine Prozessfrage, keine Rechenfrage.",
  "branches": [
    {
      "id": "t1",
      "claim": "Die meisten Liquiditätslücken entstehen durch Zahlungsziele, nicht durch Umsatzmangel.",
      "claimType": "empirical",       // empirical | definitional | normative | procedural | anecdotal
      "evidenceNeeded": "external",   // none | internal | external | expert_consensus
      "supports": ["core"],
      "children": ["t1.1", "t1.2"],
      "targetChapters": [3, 4],
      "counterArguments": ["Saisonbetriebe: hier ist es doch der Umsatz"],
      "rebuttal": "…"
    }
  ]
}
```

**Regel:** Jede Teilthese braucht mindestens einen `counterArgument` mit `rebuttal`. Ohne das
entstehen die typischen KI-Ratgeber, die nur behaupten. Deterministisch prüfbar.

## 5. Claim- und Quellen-Ledger (Kern gegen Halluzination)

Jede überprüfbare Behauptung im Buch wird als Datensatz geführt — analog zu `entity_facts`
in Fiction.

```jsonc
{
  "claimId": "cl_0042",
  "chapterNo": 4,
  "text": "Die durchschnittliche Zahlungsdauer im deutschen Handwerk lag 2024 bei 27 Tagen.",
  "claimType": "empirical",
  "containsNumbers": true,
  "containsDate": true,
  "containsQuote": false,
  "namedEntities": ["Deutschland", "Handwerk"],
  "verification": {
    "status": "unverified",     // verified | unverified | user_supplied | general_knowledge
                                //  | model_estimate | removed
    "sourceIds": [],
    "confidence": 0.4,
    "method": null              // web_grounding | user_upload | curated_corpus
  },
  "renderPolicy": "must_soften"  // as_is | must_soften | must_cite | must_remove
}
```

### 5.1 Der Halluzinations-Gate (deterministisch + LLM)

Nach jedem Kapitel:

```ts
// 1) DETERMINISTISCH: Kandidaten finden — hier ist Regex korrekt und billig
const risky = [
  ...matchAll(text, /\b\d{1,3}(?:[.,]\d+)?\s?(%|Prozent)\b/g),      // Prozentzahlen
  ...matchAll(text, /\b(19|20)\d{2}\b/g),                            // Jahreszahlen
  ...matchAll(text, /\b\d[\d.,]*\s?(Euro|€|Mio|Mrd|Millionen)\b/g),   // Geldbeträge
  ...matchAll(text, /(?:laut|gemäß|nach Angaben von|einer Studie)\s+[A-ZÄÖÜ][\wäöüß-]+/g),
  ...matchAll(text, /[„"][^"“]{25,}[""]/g),                          // wörtliche Zitate
  ...matchAll(text, /§\s?\d+|Art\.\s?\d+/g),                         // Rechtsnormen
];

// 2) LLM: Claims extrahieren und klassifizieren (nur wenn risky.length > 0)
// 3) POLICY anwenden:
for (const c of claims) {
  if (c.verification.status === 'verified') continue;                       // ok
  if (c.claimType === 'definitional' || c.claimType === 'procedural') continue;
  if (spec.sourcePolicy === 'strict')       c.renderPolicy = 'must_cite';   // Lehrbuch/Medizin/Recht
  else if (c.containsNumbers || c.containsQuote) c.renderPolicy = 'must_soften';
}
// 4) REPAIR: Kapitel wird gezielt überarbeitet — Zahl entfernen, weichmachen ODER Quelle setzen
```

Drei Betriebsmodi (`spec.sourcePolicy`):

| Modus | Verhalten | Einsatz |
|---|---|---|
| `none` | Zahlen erlaubt, aber generisch ("häufig", "in vielen Betrieben") | Memoir, Essay, Selbsthilfe |
| `soften` (Default) | Konkrete unbelegte Zahlen werden automatisch weichgezeichnet | Ratgeber, Business |
| `strict` | Unbelegte überprüfbare Claims werden **entfernt oder mit Quelle versehen**; ohne Grounding-Tool ist das Kapitel nicht committfähig | Lehrbuch, Recht, Medizin, Finanzen |

`strict` erfordert ein Recherche-Werkzeug (Web-Grounding oder ein kuratiertes, hochgeladenes
Korpus). Ohne eines von beiden ist `strict` in der UI nicht wählbar. Das ist der ehrliche
Umgang mit der Grenze des Systems.

### 5.2 Nutzerquellen

Der Nutzer kann Dokumente hochladen (PDF/DOCX/TXT/URL). Diese werden:
1. extrahiert → `sources` + `source_chunks` (mit Embedding),
2. beim Schreiben **als Retrieval-Kontext** injiziert,
3. bei Claims als `sourceIds` referenziert (mit Seitenzahl/Chunk-Anker),
4. im Buch als Fußnote/Endnote gerendert.

Damit wird der Sachbuch-Track de facto ein RAG-Autor — der einzige Weg zu belastbaren Fakten.

## 6. Terminologie und Redundanzmatrix

### 6.1 Begriffskanon

```jsonc
{
  "termId": "term_liquiditaet",
  "term": "Liquidität",
  "aliases": ["Zahlungsfähigkeit"],
  "definition": "Die Fähigkeit, fällige Zahlungen fristgerecht zu leisten.",
  "definedInChapter": 2,
  "definitionLevel": "basic",       // basic | advanced
  "forbiddenBefore": 2,
  "relatedTerms": ["term_cashflow"],
  "commonConfusion": "Verwechslung mit Rentabilität"
}
```

**Deterministischer Check "Begriff vor Definition":**
```ts
for (const term of glossary) {
  const firstUse = findFirstOccurrence(allChapters, [term.term, ...term.aliases]);
  if (firstUse.chapterNo < term.definedInChapter)
    issue('term_used_before_defined', { term, firstUse });
}
```
Das ist einer der wertvollsten Checks des ganzen Non-Fiction-Tracks und kostet null LLM-Tokens.

### 6.2 Redundanzmatrix

Sachbücher, die kapitelweise generiert werden, erklären dasselbe drei Mal. Gegenmittel:

```jsonc
{
  "conceptId": "concept_13_wochen_plan",
  "explainedFullyIn": 5,
  "mayBeReferencedIn": [7, 9, 12],
  "mayBeSummarizedIn": [14],
  "forbiddenToReexplainIn": [7, 9, 12, 14]
}
```

Beim Schreiben von Kapitel 9 enthält der Kontext: *"Das Konzept 13-Wochen-Plan wurde in
Kapitel 5 vollständig erklärt. Hier nur als bekannt voraussetzen und verweisen — nicht neu
erklären."* Zusätzlicher deterministischer Nachcheck: Ähnlichkeit von Absätzen über Kapitel
hinweg via SimHash; > 0,82 = Redundanz-Issue.

## 7. Non-Fiction Chapter Card

```jsonc
{
  "chapterNo": 4,
  "title": "Warum Zahlungsziele Ihr Geld kosten",
  "partIndex": 1,
  "learningObjectiveIds": ["lo_2"],
  "assumesKnown": ["term_liquiditaet", "concept_cashflow"],
  "introduces": ["term_zahlungsziel", "concept_forderungslaufzeit"],
  "thesisIds": ["t1", "t1.2"],
  "targetWords": 3400,
  "structure": [
    { "kind": "hook",        "words": 250, "what": "Fallbeispiel Tischlerei Berger" },
    { "kind": "problem",     "words": 500 },
    { "kind": "explanation", "words": 1200 },
    { "kind": "example",     "words": 600, "what": "Rechenbeispiel mit konkreten Zahlen" },
    { "kind": "objection",   "words": 400, "what": "„Meine Kunden zahlen doch immer"" },
    { "kind": "action",      "words": 350, "what": "3 Schritte für diese Woche" },
    { "kind": "summary",     "words": 100 }
  ],
  "requiredElements": ["checklist", "worked_example"],
  "forbiddenElements": ["legal_advice"],
  "sourcePolicy": "soften",
  "toneReminders": ["kein Finanzjargon", "Du-Ansprache", "keine Motivationsfloskeln"],
  "crossReferences": [{ "toChapter": 5, "kind": "forward", "text": "…detailliert in Kapitel 5" }],
  "redundancyGuard": ["concept_cashflow wurde in Kapitel 2 erklärt — nur referenzieren"]
}
```

Die `structure`-Liste mit Wortbudgets pro Abschnitt ist der Ersatz für Scene Cards. Sie
verhindert das typische Sachbuch-Problem "80 % Einleitung, 20 % Inhalt".

## 8. Zusätzliche Non-Fiction-Checks

| Check | Art | Regel |
|---|---|---|
| Begriff vor Definition | CODE | siehe §6.1 |
| Lernziel-Abdeckung | CODE | jedes `learningObjective` in ≥ 1 Kapitel adressiert und in ≥ 1 Kapitel geübt |
| Redundanz | CODE | SimHash-Ähnlichkeit Absätze > 0,82 kapitelübergreifend |
| Struktur-Compliance | CODE | jede `structure`-Sektion vorhanden, Wortanteil ±40 % |
| Pflichtelemente | CODE | `checklist`, `worked_example` etc. per Markup-Marker vorhanden |
| Zahlen-/Quellen-Gate | CODE+LLM | §5.1 |
| Rechtsberatungs-Gate | CODE+LLM | Bei `jurisdiction`-Themen: keine individuelle Rechts-/Medizin-/Anlageberatung; Disclaimer-Pflicht |
| Progression | LLM | Setzt das Kapitel nur Wissen voraus, das vorher eingeführt wurde? |
| Beispielvielfalt | CODE | keine Wiederverwendung derselben Beispielfirma/Person in > 3 Kapiteln |
| Anrede-Konsistenz | CODE | Du/Sie/Wir über das ganze Buch konstant |
| Übungslösbarkeit | LLM | Ist jede Übung mit dem bis dahin vermittelten Wissen lösbar? |

## 9. Was aus dem Fiction-Track wiederverwendet wird

Unverändert: Größenklassen, Budgethierarchie, Context Builder, Repair-Ladder,
Phrasenstatistik, Stil-Drift, Idempotenz, Versionierung, Export, Kosten, Audits (mit anderer
Prüfliste), Nutzeränderungs-Kaskade.

Nicht verwendet: Story-State, Timeline, Reisematrix, Knowledge-Ledger, Clue-Ledger,
Figuren-Voice-Profile (außer bei Memoir/Biografie).
