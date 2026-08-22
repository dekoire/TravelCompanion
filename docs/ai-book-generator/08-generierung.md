# 08 — Generierung: Algorithmus, Modi, Übergänge

## 1. Hauptschleife (Pseudocode, verbindlich)

```ts
async function generateBook(bookId: string) {
  const book = await loadBook(bookId);

  for (const ch of book.chapters.sortedByNo()) {
    if (ch.status === 'committed') continue;                    // Idempotenz / Resume

    // ── 1. Planung nachziehen (lazy, act-weise) ─────────────────────────
    if (!ch.card)        await generateChapterCard(ch);
    if (!ch.sceneCards)  await generateSceneCards(ch);
    await applyObligations(ch, scheduleObligations(ch.no, book.threads));   // deterministisch

    // ── 2. Kontext ──────────────────────────────────────────────────────
    const ctx = await buildContext(ch);                          // liefert auch readSet
    const mode = chooseMode(ch, ctx);                            // §2

    // ── 3. Entwurf ──────────────────────────────────────────────────────
    let draft = mode === 'chapter_single_call'
      ? await draftChapter(ch, ctx)
      : await draftSceneBySceneAndStitch(ch, ctx);

    // ── 4. Nachbearbeitung ──────────────────────────────────────────────
    draft = stripMetaText(draft);                                // §8, deterministisch
    const scenes = splitScenes(draft, ch.sceneCards);            // §4
    if (mode !== 'chapter_single_call') draft = await smoothSeams(scenes, ctx);

    // ── 5. Extraktion + Grounding ───────────────────────────────────────
    const deltas = await extractDeltas(scenes, ctx);             // [10]
    const grounded = groundDeltas(deltas, draft);                // deterministisch, verwirft Unbelegtes

    // ── 6. Validierung ──────────────────────────────────────────────────
    let issues = [
      ...runDeterministicChecks(draft, scenes, grounded, ctx),   // [11 §2]
      ...(await runSemanticChecks(draft, ctx)),                  // [11 §4], nur wenn kein BLOCK
    ];

    // ── 7. Reparatur ────────────────────────────────────────────────────
    let attempt = 0;
    while (issues.some(needsRepair) && attempt < ch.card.repairBudget) {
      ({ draft, scenes, grounded, issues } = await repairCycle(draft, issues, ctx));
      attempt++;
    }
    if (issues.some(i => i.severity === 'block')) {
      await markNeedsReview(ch, issues); await pauseForUser(book); continue;
    }

    // ── 8. Commit (EINE Transaktion) ────────────────────────────────────
    await commitChapter({ chapter: ch, text: draft, scenes, deltas: grounded,
                          readSet: ctx.readSet, issues, usage: ctx.usage });

    // ── 9. Asynchron, zustandsfrei ──────────────────────────────────────
    emit('chapter.committed', { bookId, chapterNo: ch.no });     // → Embeddings, Bild, Realtime

    // ── 10. Audit-Trigger ───────────────────────────────────────────────
    if (isActEnd(ch))        await runActAudit(ch.actIndex);
    if (isMidpoint(ch))      await runMidpointAudit(book);
    if (isPreClimax(ch))     await runThreadSetupAudit(book);
    if (isActEnd(ch) && book.profile.humanCheckpointAfterAct(ch.actIndex))
      await waitForUserApproval(book, ch.actIndex);              // step.waitForEvent
  }

  await runFinalAudits(book);        // [11 §9]
  await rebuildCanonFromText(book);  // [11 §10]
  await renderDeliverables(book);    // [19]
}
```

## 2. Modus-Wahl (deterministisch)

```ts
function chooseMode(ch: Chapter, ctx: Context): 'chapter_single_call' | 'scene_by_scene' {
  if (ch.card.targetWords > 4000)                        return 'scene_by_scene';
  if (ch.card.beatAnchor === 'climax')                   return 'scene_by_scene';
  if (ch.sceneCards.length >= 5)                         return 'scene_by_scene';
  if (ch.sceneCards.some(s => s.transitionToNext === 'time_skip')
      && ch.sceneCards.length >= 3)                      return 'scene_by_scene';
  if (countDistinct(ch.card.activeCharacters) >= 5)      return 'scene_by_scene';
  if (ch.card.requiredEvents.filter(e => e.critical).length >= 3) return 'scene_by_scene';
  if (ch.sceneCards.some(s => s.objects.length >= 3))    return 'scene_by_scene';
  if (ctx.estimatedInputTokens > MODEL.softInputLimit)   return 'scene_by_scene';
  if (ch.retryCount > 0 && ch.lastFailure === 'length')  return 'scene_by_scene';
  return 'chapter_single_call';
}
```

**Standard ist der Ein-Call-Modus.** Er liefert besseren Fluss und weniger Nahtstellen.
Szene-für-Szene ist die Ausnahme mit klaren Triggern — nicht die Regel.

## 3. Kapitel-Call: Ausgabeformat

Das Modell schreibt Fließtext, markiert Szenen aber maschinenlesbar:

```
<<<SCENE sc_14_1>>>
Der Regen hatte aufgehört, als June die Treppe hinabstieg. …
<<<SCENE sc_14_2>>>
Im Mantelraum roch es nach nassem Tuch. …
<<<SCENE sc_14_3>>>
…
<<<END>>>
```

**Warum Marker statt Struktur-JSON:** JSON mit langen Textfeldern kostet Escaping-Overhead,
provoziert Truncation-Fehler mitten im String und verschlechtert erfahrungsgemäß die Prosa
(das Modell "denkt" im Datenmodus). Marker sind billig, robust und leicht zu entfernen.

Deterministische Nachbereitung:
```ts
const scenes = splitScenes(raw);            // Regex auf <<<SCENE (\w+)>>>
assert(scenes.map(s => s.id) === card.sceneIds);   // Reihenfolge + Vollständigkeit
const clean = raw.replace(/<<<(SCENE \w+|END)>>>\n?/g, '');   // was der Nutzer sieht
```

Fehlt ein Marker oder stimmt die Reihenfolge nicht: **ein** Reparatur-Call
("gib denselben Text mit korrekten Markern zurück"), sonst Fallback auf Absatz-basierte
Heuristik + Warnung. Nie hart scheitern — der Text ist wertvoll.

## 4. Szenengrenzen im gerenderten Buch

`sceneBreakMarker` aus dem Style Profile (z. B. `***`) wird nur zwischen Szenen eingefügt,
deren `transitionToNext ∈ {hard_cut, time_skip, pov_shift}` ist. Bei `continuous` gibt es
keinen sichtbaren Bruch.

## 5. POV-Handhabung

| Modus | Regel |
|---|---|
| `first` / `third_limited` single | Kontext auf Wissen der POV-Figur gefiltert; Prompt enthält "Du hast nur Zugriff auf Wahrnehmung und Wissen von X." |
| `third_limited` rotating | POV-Wechsel nur an Kapitelgrenzen. `povCharacterId` in jeder Chapter Card. Kein Kapitel wechselt intern den Kopf. |
| `third_omniscient` | Kein Wissensfilter, aber `forbiddenReveals` bleiben aktiv. |
| `mixed` | Nur mit expliziter Nutzerentscheidung; jedes Kapitel deklariert seinen Modus. |

**POV-Drift-Check (deterministisch, Erstfilter):** Suche im Kapiteltext nach
Innensicht-Markern (`dachte`, `fühlte`, `wusste`, `erinnerte sich`, `ihm wurde klar`) mit
einem Subjekt ≠ POV-Figur im selben Satz. Treffer → Kandidat, dann LLM-Verifikation.
Bei `third_omniscient` deaktiviert.

## 6. Kapitelübergang: Handshake

Das Ausgangskonzept prüft Übergänge erst im Audit. Besser: sie werden **vorab erzwungen**.

Jeder Kapitel-Call erhält:
```
HANDSHAKE
  Letzte 2 Sätze des Vorkapitels (wörtlich):
    "…Sie hörte Schritte auf der Treppe. June löschte die Lampe."
  Zeitabstand: 15 Minuten
  Ortsbezug: gleiche Gebäude, anderes Stockwerk
  Zustand der Hauptfigur beim Einstieg: angespannt, in Deckung
  Eröffnungsart: in_medias_res (NICHT: dialogue, weather — zuletzt verwendet)
  Verbot: den letzten Satz des Vorkapitels paraphrasieren oder wiederholen
```

Nachprüfung (deterministisch):
- Trigramm-Überlappung der ersten 60 Wörter mit den letzten 60 Wörtern des Vorkapitels > 0,25
  → `transition_echo`-Issue.
- Zeitabstand im Text erkennbar? Extraktion liefert `timeGapFromPrevMinutes`; Abweichung zur
  Card > 100 % → Warnung.

### 6.1 Cliffhanger-Politik

`cliffhanger: true` in maximal 60 % der Kapitel und **nie** in drei aufeinanderfolgenden.
Deterministisch beim Card-Lint erzwungen. Grund: Dauerhafte Cliffhanger nutzen sich ab und
sind ein typisches KI-Buch-Merkmal.

## 7. Truncation und Fortsetzung

```ts
if (result.finishReason === 'length') {
  const tail = lastNWords(result.raw, 120);         // Overlap-Anker
  const cont = await callLlm({
    ...spec,
    system: spec.system,
    task: `Setze den Text exakt fort. Der bisherige Text endet mit:\n"""${tail}"""\n
           Wiederhole diesen Teil NICHT. Schreibe weiter bis <<<END>>>.
           Noch zu schreiben: ca. ${remaining} Wörter, Szenen: ${missingSceneIds}.`,
    idempotencySuffix: `cont${n}`,
  });
  draft = stitchWithOverlap(result.raw, cont.raw, tail);   // dedupliziert den Anker
}
```

- Maximal **2** Fortsetzungen pro Kapitel, dann Wechsel auf `scene_by_scene`.
- `stitchWithOverlap` sucht den längsten gemeinsamen Suffix/Präfix (Standard: mind. **16**
  Zeichen) und entfernt die Dopplung — deterministisch, kein LLM. Die Schwelle ist bewusst
  niedrig: eine stehengebliebene Dopplung ist ein sichtbarer Textfehler, ein fälschlich
  entfernter 16-Zeichen-Anschluss kaum wahrnehmbar. 16 Zeichen identischer Prosa sind
  praktisch nie Zufall.
- Der Partial wird **vor** dem Fortsetzungs-Call persistiert (`chapter_versions.partial_text`),
  damit ein Funktions-Timeout keinen Output vernichtet.

## 8. Meta-Text-Bereinigung (deterministisch)

Modelle liefern zuverlässig Rahmentext. Der wird **vor** allem anderen entfernt:

```ts
const META_PATTERNS = [
  /^(Hier ist|Natürlich|Gerne|Sicher)[^\n]{0,80}[:.]\s*\n+/i,
  /^(Kapitel|Chapter)\s+\d+\s*[:–-]?[^\n]*\n+/i,       // Überschrift kommt aus der DB, nicht aus dem Text
  /\n+(Ende des Kapitels|Fortsetzung folgt)\.?\s*$/i,
  /\n+---+\s*\n+(Anmerkung|Hinweis|Zusammenfassung)[\s\S]*$/i,
  /\n+\*?\(?Wortanzahl:?\s*\d+[^\n]*\)?\*?\s*$/i,
  /^\s*```(markdown|text)?\s*\n|\n```\s*$/g,
];
```
Zusätzlich harte Signale, die ein **Issue** erzeugen (nicht nur entfernt werden):
`Als KI`, `Als Sprachmodell`, `I cannot`, `[Name]`, `[Ort einfügen]`, `TODO`, `Lorem ipsum`,
sowie eckige Platzhalter `\[[A-ZÄÖÜ][^\]]{2,30}\]`.

## 9. Wortzahl-Steuerung

### 9.1 Budget-Rebalancing (nach jedem Kapitel, deterministisch)

```ts
remainingWords    = targetWords - committedWords;
remainingChapters = totalChapters - committedChapters;
baseline          = remainingWords / remainingChapters;

// Gedämpft, damit ein Ausreißer nicht das ganze Restbuch verzerrt:
nextTarget = clamp(
  0.7 * plannedWords(nextChapter) + 0.3 * baseline,
  0.75 * plannedWords(nextChapter),
  1.25 * plannedWords(nextChapter)
);
// Zusätzlich: Act-Budget respektieren, Kapitel im Climax nie kürzen
```

Wenn nach 60 % der Kapitel die Hochrechnung > 12 % vom Ziel abweicht, wird der Nutzer
informiert (nicht blockiert) mit Optionen: Kapitel anhängen / Kapitel kürzen / Ziel anpassen.

### 9.2 Prompt-Formulierung der Länge

Wortzahl im Prompt wird **als Korridor mit Szenenaufteilung** genannt, nie als exakte Zahl:
```
Gesamtlänge dieses Kapitels: 2.900–3.400 Wörter.
Szene 1 ≈ 900, Szene 2 ≈ 1.150, Szene 3 ≈ 1.100 Wörter.
```
`max_output_tokens` wird auf `ceil(maxWords × tokensPerWord × 1.35)` gesetzt — als
Sicherheitsgrenze, nicht als Steuerung.

### 9.3 Korrektur bei Abweichung

| Abweichung | Aktion |
|---|---|
| ≤ ±10 % | nichts |
| ±10–20 % | Warnung, Ausgleich über Budget-Rebalancing |
| > +20 % | gezielte Verdichtung: die zwei längsten Szenen werden gekürzt (Repair-Call mit "kürze auf X Wörter, ohne Ereignisse zu entfernen"), danach Delta-Vergleich: keine Fakten dürfen verschwinden |
| > −20 % | gezielte Erweiterung: die Szene mit dem größten Abstand zum Szenenbudget wird ausgebaut (mit konkreter Anweisung: mehr Sinnesdetail / mehr Dialog / ein zusätzlicher Beat aus der Scene Card) — **nie** "schreib mehr" |

**Wichtig:** Nach Kürzung/Erweiterung wird immer neu extrahiert und die
`requiredChanges` der Scene Cards erneut geprüft. Sonst löscht eine Kürzung ein Pflichtereignis.

## 10. Szene-für-Szene-Modus

```ts
for (const sc of ch.sceneCards) {
  const ctx = buildSceneContext(sc, {
    previousSceneTail: lastNWords(previousSceneText, 400),
    stateAt: sc.index === 1 ? ch.startState : foldState(sceneIndexBefore(sc)),
  });
  const text = await draftScene(sc, ctx);
  const deltas = await extractDeltas([text], ctx);
  const issues = runSceneChecks(text, deltas, sc);        // Pre/Postconditions sofort
  if (issues.blocking) text = await repairScene(text, issues, ctx);
  scenes.push(text);
  // Zwischenzustand wird NICHT committet — erst das ganze Kapitel
}
```

Der Zwischenzustand bleibt im Arbeitsspeicher des Steps (bzw. in `chapter_versions.draft_json`),
damit ein abgebrochenes Kapitel keinen halben Canon hinterlässt.

### 10.1 Naht-Glättung

Nur die Übergänge, nie der ganze Text:

```
Input:  letzte 400 Wörter von Szene n  +  erste 400 Wörter von Szene n+1
Aufgabe: Schreibe ausschließlich den Übergang neu (max. 120 Wörter), sodass er
         natürlich wirkt. Ändere KEINE Ereignisse, KEINE Fakten, KEINE Dialoge.
Ausgabe: nur der ersetzte Bereich, markiert.
```
Danach Delta-Vergleich: Wenn sich extrahierte Fakten geändert haben → verwerfen und
Original behalten. Glättung darf nie Canon verändern.

## 11. Was parallelisiert werden darf

| Parallel erlaubt | Grund |
|---|---|
| Outline-Variante A und B | zustandsfrei, gleicher Input |
| Kalibrierungs-Varianten von Kapitel 1 | zustandsfrei |
| Reisematrix, Glossar, Voice Profiles | reine Planungsdaten |
| Chapter Cards **innerhalb eines Acts** | hängen nur vom Act-Plan ab, nicht voneinander |
| Embeddings, Kapitelbilder, Metadaten, Rendering | nachgelagert |
| Deterministische Checks | reiner Code |
| Act-Audits verschiedener Acts (im Final Audit) | Text ist final |

| Parallel **verboten** | Grund |
|---|---|
| Kapiteltexte | Kapitel n+1 braucht State nach n |
| Szenen innerhalb eines Kapitels | dito auf Szenenebene |
| Extraktion vor Textabschluss | Grundlage fehlt |
| Reparaturen am selben Kapitel | Schreibkonflikt |

Inngest-Konfiguration: `concurrency: { key: "event.data.bookId", limit: 1 }` für die
Schreibpipeline; separate Funktionen mit höherem Limit für die zustandsfreien Jobs.
