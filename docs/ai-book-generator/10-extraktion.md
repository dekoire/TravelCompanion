# 10 — Extraktion: Vom Text zu geprüften Daten

Dies ist die **Vertrauensgrenze** des Systems. Alles davor ist Prosa, alles danach ist Wahrheit.

## 1. Prinzip: Delta statt Neuberechnung

Nach einem Kapitel wird **nicht** der komplette Story-State neu erzeugt, sondern nur die
Änderungen. Gründe:
- Ein LLM, das 300 Fakten neu ausgibt, ändert versehentlich 5 davon (Drift).
- Deltas sind billig (~1.500 statt ~8.000 Output-Tokens).
- Deltas sind prüfbar: Jede Änderung braucht einen Beleg.

## 2. Extraktions-Output (vollständiges Schema)

Ein Call pro Kapitel, das Ergebnis ist **pro Szene** gruppiert.

```jsonc
{
  "chapterNo": 14,
  "scenes": [
    {
      "sceneId": "sc_14_2",
      "sceneIndex": 41,
      "storyTime": { "start": "1894-10-12T20:40", "end": "1894-10-12T21:05",
                     "durationMinutes": 25, "gapFromPrevMinutes": 15,
                     "timeOfDay": "night", "isFlashback": false },
      "location": "coat_room",
      "presentCharacters": ["june"],

      "events": [
        { "tempId": "e1", "type": "discovery",
          "summary": "June findet den zweiten Brief in Tomas' Mantel",
          "participants": [{ "characterId": "june", "role": "agent" }],
          "objects": ["second_letter"], "location": "coat_room",
          "visibility": "private", "importance": 5,
          "threadIds": ["missing_letter"],
          "evidence": { "quote": "Der Umschlag rutschte aus der Innentasche und fiel zu Boden.",
                        "start": 5310, "end": 5382 } }
      ],

      "factDeltas": [
        { "op": "set", "subject": "second_letter", "predicate": "possession", "value": "june",
          "validFromScene": 41, "causedBy": "e1",
          "evidence": { "quote": "June schob den Brief unter ihre Bluse.", "start": 5510, "end": 5556 } },
        { "op": "close", "subject": "second_letter", "predicate": "location", "value": "coat_room",
          "validUntilScene": 41, "causedBy": "e1" }
      ],

      "knowledgeDeltas": [
        { "factRef": "second_letter_exists", "characterId": "june",
          "from": "unaware", "to": "knows", "source": "witnessed", "causedBy": "e1",
          "evidence": { "quote": "…", "start": 5310, "end": 5382 } }
      ],

      "relationshipDeltas": [
        { "pair": ["june", "tomas"], "delta": { "trust": -35, "conflict": 30 },
          "causedBy": "e1", "reason": "Tomas hat den Brief verschwiegen",
          "addressChange": null,
          "evidence": { "quote": "…", "start": 5600, "end": 5670 } }
      ],

      "threadDeltas": [
        { "threadId": "missing_letter", "action": "advance", "beatKind": "reversal",
          "note": "Der zweite Brief ist aufgetaucht", "status": "open" }
      ],

      "newEntities": [
        { "kind": "object", "proposedId": "second_letter", "name": "der zweite Brief",
          "firstMentionQuote": "…", "significance": 5 }
      ],

      "readerQuestions": {
        "raised": [{ "question": "Warum hatte Tomas den Brief?", "salience": "high" }],
        "answered": ["q_007"]
      },

      "cardCompliance": {
        "requiredEventsCovered": ["re_1"],
        "requiredEventsMissing": ["re_2"],
        "forbiddenEventsOccurred": [],
        "requiredChangesMet": ["knows(june, second_letter_exists) = true"],
        "requiredChangesUnmet": []
      },

      "utterances": [
        { "speakerId": "june", "impliedKnowledge": ["second_letter_exists"],
          "quote": "„Sie haben ihn die ganze Zeit gehabt.“", "start": 5701, "end": 5744 }
      ],

      "summary": "June entdeckt im Mantelraum den zweiten Brief …"
    }
  ],
  "chapterSummary": { "...": "siehe §6" }
}
```

**Jedes** Delta-Objekt hat ein `evidence`-Feld. Ohne Evidenz wird es verworfen — kein Ermessen.

## 3. Grounding (deterministisch, kein LLM)

```ts
export function groundDeltas(extraction: Extraction, text: string): GroundedResult {
  const norm = normalize(text);   // NFC, Whitespace-Kollaps, typografische Quotes vereinheitlicht
  const accepted: Delta[] = [], rejected: RejectedDelta[] = [];

  for (const d of allDeltas(extraction)) {
    const q = normalize(d.evidence?.quote ?? '');
    if (q.length < 15) { rejected.push({ d, reason: 'quote_too_short' }); continue; }

    // 1) Exakter Substring am angegebenen Offset (±40 Zeichen Toleranz)
    let idx = norm.indexOf(q, Math.max(0, d.evidence.start - 40));
    // 2) Fallback: irgendwo im Text
    if (idx === -1) idx = norm.indexOf(q);
    // 3) Fallback: Fuzzy (Levenshtein-Ratio ≥ 0.94) — fängt Normalisierungsreste
    if (idx === -1) idx = fuzzyFind(norm, q, 0.94);

    if (idx === -1) { rejected.push({ d, reason: 'quote_not_found' }); continue; }
    if (Math.abs(idx - d.evidence.start) > 400)
      rejected.push({ d, reason: 'offset_mismatch', severity: 'warn' });   // akzeptiert, aber geloggt

    accepted.push({ ...d, evidence: { ...d.evidence, start: idx, end: idx + q.length } });
  }
  return { accepted, rejected };
}
```

Konsequenzen:

| Fall | Aktion |
|---|---|
| Zitat nicht gefunden, `importance ≥ 4` oder `critical` | **Kapitel-Issue** `extraction_ungrounded`, Re-Extraktion mit Hinweis (1×), dann Verifikations-Call |
| Zitat nicht gefunden, unwichtig | Delta wird still verworfen, geloggt |
| Zitat gefunden, Offset stark abweichend | akzeptiert, Metrik `offset_drift` erhöht |
| > 20 % der Deltas ungegroundet | Extraktions-Call gilt als fehlgeschlagen → Wiederholung mit `scene_by_scene`-Extraktion |

**Das ist der Punkt, an dem das Ausgangskonzept eine Lücke hatte.** Ohne Grounding prüfen die
"deterministischen Checks" halluzinierte Daten.

## 4. Abgleich mit der Chapter Card

```ts
for (const re of card.requiredEvents) {
  if (!extraction.covers(re.id)) {
    if (re.critical) {
      // Zweitverifikation direkt am Text, billiges Modell
      const v = await verify(text, `Findet folgendes Ereignis im Text statt: "${re.what}"?`);
      if (v.answer === 'yes' && quoteFound(v.quote, text)) {
        addEvent(fromVerification(v));                      // Extraktion war unvollständig
        metric('extraction_miss');
      } else {
        issue('required_event_missing', { severity: 'block', requiredEventId: re.id });
      }
    } else {
      issue('required_event_missing', { severity: 'medium' });
    }
  }
}
for (const fe of card.forbiddenEvents)
  if (extraction.covers(fe)) issue('forbidden_event_occurred', { severity: 'block' });
```

Die Unterscheidung "Extraktion hat es übersehen" vs. "Text enthält es nicht" ist wichtig —
sonst repariert man einen Text, der korrekt war.

## 5. Kritische Zweitverifikation

Ausgelöst bei: `importance ≥ 4`, `death`, `injury`, `object_lost/transfer`, `revelation`,
`betrayal`, `addressChange`, `relationshipDelta |Δ| > 30`, sowie bei jedem Delta, das eine
`forbiddenChange` berührt.

```jsonc
// Prompt: Text + eine präzise Ja/Nein-Frage. Modell: VERIFIER (billigstes).
// Structured Output:
{
  "answer": "yes",                    // yes | no | unclear
  "quote": "Der Schlüssel schlug gegen die Felsen und war fort.",
  "charApprox": 8130,
  "confidence": 0.93,
  "reasoning": "Der Text beschreibt explizit den Verlust."
}
```

Regeln:
- `answer = unclear` **oder** `confidence < 0.7` → Delta wird nicht Canon, Issue mit
  `severity: medium` zur Nutzeranzeige.
- `quote` wird erneut gegroundet. Ein Verifizierer, der ein Zitat erfindet, wird ignoriert.
- Verifikationen laufen **parallel** (zustandsfrei) — typisch 2–6 pro Kapitel, je ~200 Tokens.

## 6. Kapitel-Summary (strukturiert)

Freitext-Summaries verlieren genau das, was später gebraucht wird. Deshalb:

```jsonc
{
  "chapterNo": 14,
  "oneLine": "June findet den zweiten Brief und bricht mit Tomas.",
  "keyEvents": [{ "eventId": "ev_…", "why": "wendet den Hauptplot" }],
  "causeEffect": [{ "cause": "Brieffund", "effect": "Junes Vertrauen bricht" }],
  "newFacts": ["second_letter.possession = june"],
  "locationChanges": [{ "characterId": "june", "from": "archive_hall", "to": "cliff_path" }],
  "objectChanges": [{ "objectId": "second_letter", "change": "von Tomas zu June" }],
  "knowledgeChanges": [{ "characterId": "june", "learned": "second_letter_exists" }],
  "relationshipChanges": [{ "pair": "june__tomas", "trust": "55 → 20" }],
  "threadsOpened": [], "threadsAdvanced": ["missing_letter"], "threadsClosed": [],
  "emotionalEndState": [{ "characterId": "june", "state": "verraten, entschlossen" }],
  "lastConcreteAction": "June verlässt das Archiv durch den Hinterausgang.",
  "lastLine": "Der Regen hatte wieder eingesetzt.",
  "openQuestions": ["Warum hatte Tomas den Brief?"],
  "transitionToNext": "June geht zum Leuchtturm; 15 Minuten später",
  "wordCount": 3180,
  "tensionEstimate": 74
}
```

`lastLine` und `lastConcreteAction` speisen direkt den Handshake des nächsten Kapitels
([08](08-generierung.md) §6) — deshalb sind sie Pflichtfelder.

## 7. Extraktions-Prompting: die entscheidenden Regeln

Im Developer-Prompt der Extraktion stehen genau diese Regeln:

1. *"Extrahiere nur, was im Text steht. Erfinde nichts. Ergänze nichts aus dem Kontext."*
2. *"Jedes Objekt braucht ein wörtliches Zitat aus dem Text (15–200 Zeichen), das die Aussage
   belegt. Kopiere es exakt, ohne Auslassungen."*
3. *"Wenn etwas nur angedeutet ist, setze `confidence` unter 0.7 statt es als Tatsache zu melden."*
4. *"Melde nur Änderungen gegenüber dem angegebenen Ausgangszustand, keine Wiederholungen."*
5. *"Emotionen nur, wenn sie im Text gezeigt oder benannt werden."*
6. *"Der Ausgangszustand ist gegeben. Wenn der Text ihm widerspricht, melde das als
   `contradiction`, statt still zu korrigieren."*

Regel 6 ist wichtig: Widersprüche sollen **auffallen**, nicht verschwinden.

```jsonc
"contradictions": [
  { "expected": "archive_key.owner = tomas", "textImplies": "june hat den Schlüssel",
    "quote": "…", "severity": "high" }
]
```

## 8. Kosten

| Operation | Modell | Tokens (in/out) je Kapitel |
|---|---|---:|
| Delta-Extraktion | EXTRACTOR | ~5.500 / ~1.400 |
| Kapitel-Summary | EXTRACTOR (im selben Call) | +400 |
| Zweitverifikation (Ø 3×) | VERIFIER | ~3 × (4.000 / 150) |
| Grounding | — | 0 (Code) |
| Deterministische Checks | — | 0 (Code) |

Der Extraktions-Call bekommt **nicht** den vollen Canon, sondern nur: Kapiteltext,
Ausgangszustand der aktiven Entitäten, Scene Cards, Entitätsliste mit IDs. Alles andere ist
für die Extraktion irrelevant und würde nur Halluzinationen einladen.
