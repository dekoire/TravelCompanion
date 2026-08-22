# 15 — JSON-Verträge

Alle Schemas sind **implementiert und getestet** in
[`book-generator/packages/schemas/src/`](../../book-generator/packages/schemas/src/) — das ist
die einzige Quelle, diese Doku beschreibt nur die Regeln dahinter.

| Datei | Inhalt |
|---|---|
| [`common.ts`](../../book-generator/packages/schemas/src/common.ts) | Bausteine: `Evidence`, Prädikat- und Event-Katalog, Wissensstufen, Bedingungsgrammatik |
| [`bookspec.ts`](../../book-generator/packages/schemas/src/bookspec.ts) | `BookSpec`, `ContentRating`, `CharacterSeed`, `StyleSpec` |
| [`wizard.ts`](../../book-generator/packages/schemas/src/wizard.ts) | `WizardInput` — die Rohform vor `deriveSpec` |
| [`cards.ts`](../../book-generator/packages/schemas/src/cards.ts) | `ChapterCard`, `SceneCard`, Opening-/Closing-/Szenentypen |
| [`extraction.ts`](../../book-generator/packages/schemas/src/extraction.ts) | `ChapterExtraction` mit allen Delta-Typen und `ChapterSummary` |
| [`issues.ts`](../../book-generator/packages/schemas/src/issues.ts) | `Issue`, `SemanticCheckResult`, `VerificationResult`, `RatingClassification`, `ModerationResult` |
| [`schemas.test.ts`](../../book-generator/packages/schemas/src/schemas.test.ts) | 32 Tests: gültige Payloads und die Ablehnung ungültiger |

Nicht als eigene Datei ausgeführt, aber nach denselben Regeln zu bauen: `StoryBible`,
`StyleProfile`, `VoiceProfile`, `EndingContract`, `Thread`, `Clue`, `Outline`,
`NonFictionCard`, `KnowledgeClaim`, `CoverSpec`, `BookMetadata`, `JobPayload`.
Die Feldlisten dazu stehen jeweils im zugehörigen Fachdokument (04, 05, 06, 19).

## 1. Zehn Regeln für jedes LLM-Schema

1. **`.strict()` überall.** Unbekannte Keys sind ein Fehler. Sonst schleicht sich Halluzination
   als "Zusatzinformation" ein.
2. **Keine offenen `z.string()` für Kategorien.** Immer `z.enum`. Freitext ist nur dort erlaubt,
   wo Prosa gemeint ist (`summary`, `message`, `reason`).
3. **Obergrenzen auf allen Arrays und Strings.** Ohne `.max()` produziert ein Modell im
   Zweifel 40 Deltas und sprengt das Kontextbudget des nächsten Schritts.
4. **`Evidence` ist Pflicht bei allem, was Canon wird.** Kein Beleg, kein Fakt.
5. **Modell-IDs sind `TempId`, keine UUIDs.** Das Modell darf keine Datenbank-IDs erfinden;
   der Server mappt `tempId → uuid` beim Commit.
6. **Slugs statt Namen als Referenz.** `"june"`, nicht `"June Weber"` — Namen ändern sich,
   Slugs nicht, und Tippfehler fallen sofort auf.
7. **Zahlen mit Wertebereich.** `z.number().int().min(-100).max(100)` statt `z.number()`.
8. **Enums geschlossen halten.** Ein neuer Event-Typ ist eine bewusste Entscheidung mit
   Check-Anpassung, kein Nebeneffekt eines Prompts.
9. **Keine verschachtelten Optionals ohne Default.** `.default([])` statt `undefined` —
   sonst gibt es zwei Codepfade für "leer".
10. **Schema-Version im Payload.** Bei Änderungen müssen alte gespeicherte Extrakte weiter
    lesbar bleiben.

## 2. Vom Zod-Schema zum Provider-Schema

```ts
import { zodToJsonSchema } from 'zod-to-json-schema';

const jsonSchema = zodToJsonSchema(ChapterExtraction, {
  target: 'openApi3',
  $refStrategy: 'none',          // viele Provider unterstuetzen $ref nicht
});
```

Zusätzlich nötig, weil Provider-Schema-Dialekte eingeschränkt sind:
- `additionalProperties: false` überall setzen (macht `.strict()`, muss aber im JSON-Schema
  ankommen).
- Keine `oneOf`/`anyOf` auf oberster Ebene — discriminated Unions werden flach modelliert
  oder in getrennte Calls aufgeteilt.
- Keine Regex-Constraints erwarten; `pattern` wird oft ignoriert → **immer** serverseitig
  mit Zod nachvalidieren.
- Verschachtelungstiefe ≤ 5 halten.

## 3. Der Validierungspfad eines LLM-Outputs

```
Provider-Response
  → JSON.parse (mit Größenlimit)
  → Zod .safeParse (.strict())
      ├─ Erfolg → weiter
      └─ Fehler → EIN Repair-Call:
             "Dein JSON war ungültig: <zodError>. Hier ist es: <json>. Gib nur korrigiertes JSON zurück."
             → erneut parsen → bei erneutem Fehler: harter Job-Fehler
  → Referenz-Auflösung (Slugs existieren? tempIds eindeutig? causedBy auflösbar?)
  → Grounding (Zitate im Text?)
  → Domänen-Plausibilität (Wertebereiche, Zeitlogik)
  → Commit
```

Jede Stufe kann verwerfen. Nur was alle fünf besteht, wird Canon.

## 4. Beispiel: Fehlerbehandlung bei Referenzen

```ts
function resolveReferences(ex: ChapterExtraction, ctx: Context): ResolveResult {
  const errors: string[] = [];
  const slugMap = new Map(ctx.entities.map(e => [e.slug, e.id]));

  for (const scene of ex.scenes) {
    for (const d of scene.factDeltas) {
      if (!slugMap.has(d.subject)) {
        const proposed = scene.newEntities.find(n => n.proposedSlug === d.subject);
        if (proposed) continue;                       // wird als neue Entität angelegt
        errors.push(`Unbekannter Slug: ${d.subject}`);
      }
    }
    const tempIds = new Set(scene.events.map(e => e.tempId));
    for (const d of scene.factDeltas)
      if (d.causedBy && !tempIds.has(d.causedBy))
        errors.push(`causedBy zeigt auf unbekannte tempId: ${d.causedBy}`);
  }
  return { ok: errors.length === 0, errors };
}
```

Fehler hier bedeuten **nicht** automatisch Kapitel-Reparatur — meist ist die Extraktion schuld.
Deshalb: erst Extraktion wiederholen (1×), dann erst den Text in Frage stellen.

## 5. Versionierung der Schemas

```
schemas/
  v1/  common.ts  bookspec.ts  cards.ts  extraction.ts  issues.ts
  v2/  …
  index.ts   → exportiert die aktive Version + Migrationsfunktionen v1→v2
```

`book_specs.spec.technical.schemaVersion` entscheidet, welche Version für ein Buch gilt.
Gespeicherte Extrakte werden **nie** migriert, sondern beim Lesen durch eine
`migrateV1ToV2()`-Funktion geleitet. Migration im Bestand würde die Beweiskette (`evidence`)
mit den Offsets der alten Textversion brechen.
