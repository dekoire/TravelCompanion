# AI Book Generator — Implementierung

Umsetzung des Konzepts aus [`docs/ai-book-generator/`](../docs/ai-book-generator/).
Stand: **M0 + M1** aus der [Roadmap](../docs/ai-book-generator/21-roadmap.md),
plus der vollständige **Bilderbuch-Track** ([22](../docs/ai-book-generator/22-bilderbuch.md)).

```bash
npm install
npm run check                          # Typecheck (inkl. Tests) + 492 Tests
ABG_ALLOW_ANONYMOUS=lokal npm run serve   # Bilderbuch-Service auf :8787
npm run build:preview                  # klickbare Vorschau -> apps/preview/dist/
```

Keine API-Schlüssel nötig: alles läuft gegen Mock- und Demo-Generatoren.

```bash
curl -X POST localhost:8787/v1/books -H 'content-type: application/json' \
  -d '{"prompt":"Ein kleiner Fuchs namens Nuri, der das Meer sucht"}'
```

Vollständige Schnittstelle: [API.md](API.md).

## Was fertig ist

| Paket | Inhalt | Doku |
|---|---|---|
| **`@abg/schemas`** | Zod-Verträge: `BookSpec`, `WizardInput`, `ChapterCard`, `SceneCard`, `ChapterExtraction`, `Issue`, Moderations- und Verifikationsergebnisse. Alles `.strict()`. | [15](../docs/ai-book-generator/15-json-schemas.md) |
| **`@abg/domain`** | I/O-freie Fachlogik: Wortzählung, Dialogmessung, Größenklassen, `deriveSpec`, `validateSpec`, Act-Skelett, Budget- und Kostenmodell, **Quote-Grounding**, Bedingungs-Parser, Phrasenstatistik, Ähnlichkeitsmaße, Idempotenz-Schlüssel. | [02](../docs/ai-book-generator/02-domaenenmodell.md), [03](../docs/ai-book-generator/03-bookspec.md), [10](../docs/ai-book-generator/10-extraktion.md), [18](../docs/ai-book-generator/18-kosten-budget.md) |
| **`@abg/picturebook`** | Der eigenständige Kern des Dienstes: Generator-Schnittstelle, Prompt-Verarbeitung, Pipeline, Ablage. Hängt an keinem Anbieter und an keiner Datenbank. | [API.md](API.md) |
| **`@abg/api`** | HTTP-Schicht auf Web-Standards (Request/Response). Läuft unter node:http, Vercel, Cloudflare Workers, Deno oder Bun. | [API.md](API.md) |
| **`@abg/render`** | Deterministischer SVG-Platzhalter für Bilderbuch-Doppelseiten: Layout, Textfluss im Satzspiegel, Farbidentität je Figur. Ersetzt später ein echtes Bildmodell an genau einer Stelle. | [22](../docs/ai-book-generator/22-bilderbuch.md) |
| **`@abg/llm`** | Provider-Gateway: Capability-Routing, Prompt-Assemblierung mit Cache-Grenze, Nutzertext-Neutralisierung, Retry-Politik, Truncation-Fortsetzung, Structured Output mit genau einem Repair-Call, Budgetwächter, Idempotenz-Speicher, Mock-Provider mit Fehlerinjektion. | [01](../docs/ai-book-generator/01-systemarchitektur.md), [09](../docs/ai-book-generator/09-context-builder.md), [13](../docs/ai-book-generator/13-prompting-sicherheit.md) |

## Die drei Kernstücke

### 1. Quote-Grounding — die Vertrauensgrenze

`groundItems()` in [`packages/domain/src/grounding.ts`](packages/domain/src/grounding.ts).
Ein extrahierter Fakt wird nur Canon, wenn sein Beleg wörtlich im Kapiteltext gefunden wird:
exakt am angegebenen Offset, exakt irgendwo, oder per bandbegrenztem Levenshtein ab 94 %
Ähnlichkeit. Alles andere wird verworfen und gezählt.

```ts
const r = groundItems(deltas, chapterText);
r.accepted          // wird Canon
r.rejected          // halluziniert — mit Grund und Wichtigkeitsmarkierung
r.groundingRate     // < 0,88 ist ein Alarm (20 §5.3)
r.extractionFailed  // < 0,80 -> Extraktion wiederholen, nicht den Text reparieren
```

Ohne diesen Schritt prüfen alle nachgelagerten „deterministischen" Checks eine erfundene Welt.

### 2. `deriveSpec` / `validateSpec` — ohne LLM

[`derive.ts`](packages/domain/src/derive.ts) und [`validate.ts`](packages/domain/src/validate.ts).
Kapitelanzahl, Wortverteilung, Akte, Szenenkorridore und Budgets sind Arithmetik. Ein Modell,
das hier schätzt, macht Preis und Umfang unverkaufbar.

`validateSpec` liefert Blocker mit maschinenlesbaren Patch-Vorschlägen:

```ts
// 30 Kapitel × 350 Wörter als 80.000-Wörter-Roman
{ code: 'V003', severity: 'block',
  message: '350 Wörter pro Kapitel sind zu kurz für „novel" (mindestens 800). …',
  suggestions: [
    { label: '28 Kapitel × 2.857 Wörter', patch: { 'scope.targetChapters': 28, … } },
    { label: 'Als Szenen behandeln: 10 Kapitel mit je ~3 Szenen', patch: { … } },
    { label: 'Als Kinderbuch anlegen (kürzere Kapitel erlaubt)', patch: { bookType: 'chapter_book' } },
  ] }
```

Semantische Warnungen (Genre-Widersprüche, W007/W008) sind bewusst **nicht** hier —
sie brauchen ein Modell und dürfen nie blockieren.

### 3. Der Gateway

[`gateway.ts`](packages/llm/src/gateway.ts). Kein Feature-Code spricht direkt mit einem Provider.

```
Budget-Check -> Idempotenz-Lookup -> Prompt-Assemblierung -> Input-Guard
  -> Provider-Call (Retry nur bei TRANSIENT) -> Truncation-Fortsetzung
  -> Parse + Zod -> Output-Guard (Refusal, Prompt-Leak) -> Persistenz
```

Eigenschaften, die in Tests festgeschrieben sind:

- **Cache-Grenze:** stabile Sektionen zuerst; der Cache-Key ändert sich nicht, wenn sich nur
  der Story-State ändert.
- **Nutzertext ist Datum:** wird neutralisiert und in Delimiter mit Zufalls-ID gekapselt,
  die der Inhalt nicht schließen kann.
- **Idempotenz:** gleicher Kontext → gespeichertes Ergebnis, kein zweiter Call, keine Kosten.
  Eine Reparatur ist absichtlich ein anderer Schlüssel.
- **Retry-Politik:** nur `TRANSIENT` wird wiederholt; ein 400er nie.
- **Budget:** wirft, *bevor* der Call rausgeht.
- **Fallback:** nach erschöpften Versuchen auf das Fallback-Modell, protokolliert.

## Was der Mock-Provider kann

[`mock-provider.ts`](packages/llm/src/mock-provider.ts) — ohne ihn ist keine Testsuite bezahlbar.

```ts
new MockProvider({ scripts: {
  'chapter.write': { steps: [
    { kind: 'http_error', status: 503 },                       // transienter Fehler
    { kind: 'text', text: 'Teil eins', finishReason: 'length' }, // Truncation
    { kind: 'text', text: 'Teil zwei' },                        // Fortsetzung
    { kind: 'raw', text: '{ kaputt' },                          // ungültiges JSON
  ] },
}});
```

## Testabdeckung

| Datei | Tests | Schwerpunkt |
|---|---:|---|
| `schemas.test.ts` | 32 | Verträge, Belegpflicht, geschlossene Kataloge |
| `text.test.ts` | 40 | Wortzählung, Dialoganteil, Szenensplit, Meta-Text |
| `derive.test.ts` | 25 | Ableitungen, Determinismus, Spec-Hash |
| `validate.test.ts` | 33 | alle Blocker- und Warnregeln |
| `arc.test.ts` | 25 | Aktverteilung, Anker, Spannungskurve |
| `budget.test.ts` | 21 | Token-Modell, Rebalancing, Budgetampel |
| `grounding.test.ts` | 23 | Zitatsuche, Halluzinationsabwehr |
| `conditions.test.ts` | 23 | Grammatik, Auswertung, Injection-Resistenz |
| `phrases.test.ts` | 24 | Wiederholungen, Negativliste, Namens-Tippfehler |
| `sanitize.test.ts` | 19 | Neutralisierung, Injection-Signale, Delimiter |
| `gateway.test.ts` | 38 | Retry, Truncation, Idempotenz, Budget, Fallback |
| `pipeline.test.ts` | 3 | Integration: Idee → geprüftes Kapitel |
| `hash.test.ts` | 21 | SHA-256 gegen offizielle Vektoren und `node:crypto` |
| `picturebook.test.ts` | 44 | Druckbogen, Lesestufen, Prompt-Komposition, alle Prüfungen |
| `picturebook/pipeline.test.ts` | 28 | Integration Bilderbuch, Generatorfehler, Platzhalter |
| `picturebook/prompt.test.ts` | 41 | Prompt-Heuristik und Modell-Auftrag |
| `picturebook/store.test.ts` | 12 | Ablage, Mandantentrennung, Blättern |
| `api/service.test.ts` | 43 | alle Endpunkte, Fehlerübersetzung, Protokoll |
| `api/auth.test.ts` | 14 | Schlüssel, Mandanten, Zeitkonstanz |
| **Summe** | **492** | |

## Drei Stellen, an denen die Tests die Doku korrigiert haben

1. **Bindestrich-Komposita.** `Intl.Segmenter` zerlegt „E-Mail" in zwei Wörter. Die
   Publishing-Konvention (und Word) zählt eins — und danach richten sich Preis und
   Seitenprognose. `joinHyphenatedWords()` korrigiert das vor der Segmentierung.
2. **Namens-Tippfehler.** Trigramm-Jaccard von „Ardmore"/„Ardmoor" liegt bei 0,4, nicht über
   0,72 — bei kurzen Namen wirken zwei abweichende Trigramme zu stark. `findNameNearMisses`
   entscheidet deshalb primär über die Editierdistanz.
3. **Gemischte Anführungszeichen.** Modelle liefern regelmäßig `„Text"` statt `„Text"`.
   Wer nur das exakte Paar sucht, misst den Dialoganteil als 0 und repariert anschließend
   das falsche Problem.
4. **Lesestufen sind nicht geschachtelt.** Ein Test unterstellte, die strengere Stufe melde
   immer mehr Befunde. Falsch: `early_reader` hat eine *höhere* Mindestwortzahl als
   `pre_reader` — ein Text kann für Dreijährige richtig und für Sechsjährige zu dünn sein.
5. **`node:crypto` in einem als plattformfrei deklarierten Paket.** Fiel erst auf, als
   `@abg/domain` im Browser laufen sollte. Ersetzt durch eine eigene SHA-256-Implementierung,
   geprüft gegen die offiziellen Testvektoren und gegen `node:crypto`.

## Als Service

Der Bilderbuch-Teil ist von der Roman-Maschinerie gelöst: kein Gateway, keine Budgets,
keine Kostenrechnung. Die gesamte Schnittstelle zu einem Sprachmodell ist eine Funktion
mit einem String rein und einem String raus.

```ts
interface TextGenerator {
  readonly name: string;
  readonly synthetic: boolean;   // true = kein Modell beteiligt
  complete(req: CompletionRequest): Promise<string>;
}
```

Wer den Dienst betreibt, bringt seinen Anbieter mit und rechnet dort ab. Der Wert liegt
in dem, was davor und danach passiert — Druckbogen, Lesestufe, Figurenkonsistenz,
Bildprompt-Komposition und 18 Prüfungen, alles ohne Modell.

## Bilderbuch-Track

Eigenes Modell, weil ein Bilderbuch kein Roman mit Bildern ist: Einheit ist die Doppelseite,
das Bild ist der Inhalt, der Text die Bildunterschrift.

* **Druckbogen-Mathematik** — nur 24/32/40/48 Seiten sind herstellbar; Seite 1 ist rechts,
  also ist jede Doppelseite ein Paar (gerade, ungerade). 32 Seiten ergeben genau 14
  Story-Doppelseiten.
* **Lesestufen** — Wort- und Satzgrenzen je Alter, bewusst **nicht** ineinander geschachtelt:
  eine höhere Stufe verschiebt Ober- *und* Untergrenze.
* **Figurenkonsistenz** — der `visualDescriptor` wird einmal erzeugt, eingefroren und danach
  wörtlich in jeden Bildprompt eingesetzt.
* **Redundanzprüfung** — misst, ob der Text nur nacherzählt, was das Bild ohnehin zeigt.
  Der häufigste Fehler in generierten Bilderbüchern, und deterministisch messbar.

`node apps/preview/build.mjs` baut daraus eine klickbare Seite mit Andruckbogen,
Doppelseiten-Editor und Live-Prüfung. Details: [apps/preview/README.md](apps/preview/README.md).

## Nächste Schritte (M2)

Entities, `entity_facts`, Event-Ledger und State-Fold gegen echtes Postgres; Delta-Extraktion
mit den `@abg/schemas`-Verträgen; Scene-Card-Pre-/Postconditions gegen den gefoldeten State;
Repair-Ladder Stufen 0–3; Read-Set-Protokollierung. Details in
[21-roadmap.md](../docs/ai-book-generator/21-roadmap.md).

## Konventionen

- **Kein Provider-Call ausserhalb von `@abg/llm`.**
- **`@abg/domain` ist I/O-frei** — keine Netzwerk-, Datei- oder DB-Zugriffe. Das macht es
  vollständig und schnell testbar.
- **Kein `Math.random()` und kein `Date.now()` in der Fachlogik** — beides wird injiziert,
  sonst sind Ergebnisse nicht reproduzierbar.
- **Modell-IDs sind Konfiguration**, keine Konstanten im Code. `mockProfile()` für Tests,
  `buildProfile()` für echte Provider.
