# Bilderbuch-Service — API

Eigenständiger Dienst. Ein Prompt rein, ein geprüftes Bilderbuch raus.

```bash
ABG_ALLOW_ANONYMOUS=lokal npm run serve
curl -X POST localhost:8787/v1/books -H 'content-type: application/json' \
  -d '{"prompt":"Ein kleiner Fuchs namens Nuri, der das Meer sucht"}'
```

## Modell: Vercel AI Gateway

Ein Endpunkt, ein Schlüssel, viele Modelle — abgerechnet wird bei Vercel, nicht hier.

```bash
AI_GATEWAY_API_KEY=...                 # oder VERCEL_OIDC_TOKEN
ABG_MODEL=anthropic/claude-opus-5      # "anbieter/modell"
ABG_FALLBACK_MODELS=openai/gpt-5.6-sol,google/gemini-3.6-flash
npm run serve
```

**Ohne Schlüssel läuft der Demo-Generator** — dann füllt der Dienst Vorlagen, statt eine
Geschichte zu schreiben. Er sagt das auch: `generator.synthetic` ist dann `true` und die
Antwort trägt ein `notice`-Feld.

Der Dienst kennt **keine** Abrechnung, keine Kontingente und keine Kostenrechnung. Die
gesamte Schnittstelle zu einem Sprachmodell ist eine Funktion:

```ts
interface TextGenerator {
  readonly name: string;
  readonly synthetic: boolean;        // true = kein Modell beteiligt
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
```

Der Wert liegt in dem, was davor und danach passiert: Druckbogen, Lesestufe,
Figurenkonsistenz, Bildprompt-Komposition und 18 Prüfungen — alles ohne Modell.

## Authentifizierung

```
Authorization: Bearer <api-key>
```

Ein Schlüssel gehört zu einem Mandanten, der Mandant trennt die Daten. Konfiguration
über `ABG_API_KEYS=key1:kunde_a,key2:kunde_b`. Lokal lässt sich das mit
`ABG_ALLOW_ANONYMOUS=lokal` abschalten.

`/v1/health` ist ohne Schlüssel erreichbar, alles andere nicht.

---

## `POST /v1/books`

Erzeugt ein Buch. Einzige Pflichtangabe ist `prompt`.

```jsonc
{
  "prompt": "Ein kleiner Fuchs namens Nuri, der zusammen mit einer Elster das Meer sucht",

  "pageCount": 32,          // 24 | 32 | 40 | 48 — nur diese sind druckbar
  "targetAge": "6+",        // all | 6+ | 9+ | 12+
  "readingLevel": "pre_reader",   // alternativ direkt: pre_reader | early_reader | independent
  "medium": "watercolor",   // watercolor | cut_paper | gouache | crayon | digital_soft | ink_wash | collage
  "paletteHue": 120,        // 0–359

  "overrides": {            // überschreibt, was aus dem Prompt gelesen wurde
    "heroName": "Nuri", "heroKind": "ein kleiner Fuchs",
    "companionName": null, "companionKind": null,
    "place": "am Meer", "goal": "das Meer zu finden"
  }
}
```

**201 Created**

```jsonc
{
  "id": "pb_mug0dwra368uko",
  "createdAt": "2026-09-24T20:54:00.000Z",
  "prompt": "Ein kleiner Fuchs namens Nuri, …",

  // Was der Dienst aus dem Prompt gelesen hat — und was Vorgabe blieb.
  "understood": {
    "heroName": "Nuri", "heroKind": "ein kleiner Fuchs",
    "companionName": "Elster", "companionKind": "einer Elster",
    "place": "am Rand des Dorfes", "goal": "das Meer zu suchen",
    "derived": { "heroName": "prompt", "place": "default", … }
  },

  "pageCount": 24,
  "readingLevel": "early_reader",

  // Welches Modell geschrieben hat. Bei einer Fallback-Kette ist modelId nicht
  // zwingend das angefragte Modell — deshalb steht hier, was geantwortet hat.
  "generator": {
    "name": "vercel-ai-gateway",
    "synthetic": false,
    "modelId": "anthropic/claude-opus-5"
  },
  "usage": { "inputTokens": 900, "outputTokens": 4200 },
  "repairs": 0,              // wie oft das Modell nachbessern musste

  "book": {
    "title": "…", "premise": "…", "refrain": "Vielleicht heute.",
    "characters": [{ "slug": "hero", "name": "Nuri", "visualDescriptor": "…",
                     "paletteSeed": 137, "scaleRelative": 1 }],
    "style": { "medium": "watercolor", "paletteHue": 120, "styleAnchor": "…" },
    "spreads": [{
      "index": 1, "pages": [4, 5], "beat": "Die Welt vor dem Aufbruch",
      "text": "Morgens roch es nach nassem Gras. …",
      "imageBrief": { "subject": "…", "action": "…", "setting": "…",
                      "mood": "…", "cameraDistance": "wide", "timeOfDay": "morning" },
      "charactersPresent": ["hero"], "layout": "text_bottom", "textAnchor": "below_image"
    }]
  },

  "validation": { "ok": true, "issues": [], "stats": { … } },
  "imagePrompts": ["…"]
}
```

`understood.derived` ist der ehrliche Teil: Er sagt pro Feld, ob es wirklich aus dem
Prompt kam oder eine Vorgabe ist.

**Fehler**

| Status | Wann |
|---|---|
| `400 invalid_request` | Prompt fehlt, nicht druckbare Seitenzahl, unbekanntes Feld |
| `401 unauthorized` | Schlüssel fehlt oder ist falsch |
| `413 payload_too_large` | Anfrage über 64 KB |
| `415 unsupported_media_type` | kein `application/json` |
| `422 generator_failed` | Anbieter hat die Erzeugung verweigert |
| `502 generator_failed` | Anbieter lieferte kein gültiges Buch |
| `503 generator_failed` | Anbieter nicht erreichbar |
| `504 generator_failed` | Zeitüberschreitung |
| `500 internal_error` | alles andere — ohne Details nach außen |

---

## `GET /v1/books/:id`

Liefert das Buch samt aktueller Prüfung. `?include=prompts` hängt die Bildprompts an.

## `GET /v1/books`

Listet die Bücher des Mandanten, neueste zuerst. `?limit=20&cursor=<id>`.

## `DELETE /v1/books/:id`

**204**, danach ist das Buch weg.

---

## `GET /v1/books/:id/spreads/:n`

Eine Doppelseite plus ihren fertigen Bildprompt.

## `PATCH /v1/books/:id/spreads/:n`

Ändert eine Doppelseite und prüft das Buch neu. Seitenzahlen, Index und Seed bleiben
unangetastet — die gehören zum Seitenplan, nicht zum Inhalt.

```jsonc
{
  "text": "Der Wind drehte sich, ganz langsam.",
  "beat": "Der Umschwung",
  "layout": "full_bleed",
  "textAnchor": "bottom_left",
  "charactersPresent": ["hero", "companion"],
  "imageBrief": { "setting": "auf einem Leuchtturm", "timeOfDay": "evening" }
}
```

**200** mit `{ spread, imagePrompt, validation }`.

Eine Figur, für die es kein Figurenblatt gibt, wird mit **400** abgelehnt — ohne
Bildbeschreiber sähe sie auf jeder Seite anders aus.

Ein zu langer Text wird **nicht** abgelehnt, sondern als Befund gemeldet. Die Prüfung
berät, sie zensiert nicht.

## `GET /v1/books/:id/spreads/:n/image.svg`

Platzhalterbild der Doppelseite als SVG. `?watermark=false`, `?pageNumbers=false`.

> Das ist **kein** KI-Bild. Es zeigt Layout, Bildausschnitt, Textfluss im Satzspiegel
> und die Farbidentität jeder Figur. Für echte Illustrationen den `imagePrompt` an ein
> Bildmodell geben.

## `GET /v1/books/:id/prompts`

Alle Bildprompts mit Doppelseiten- und Seitenzahl.

## `GET|POST /v1/books/:id/validate`

Prüft erneut, ohne etwas zu ändern.

## `GET /v1/health`

Ohne Schlüssel. Nennt Generator und erlaubte Werte.

---

## Gateway einrichten

```ts
import { VercelGatewayGenerator, createService } from '@abg/picturebook';

const generator = new VercelGatewayGenerator({
  apiKey: process.env.AI_GATEWAY_API_KEY!,
  model: 'anthropic/claude-opus-5',
  fallbackModels: ['openai/gpt-5.6-sol', 'google/gemini-3.6-flash'],
  responseFormat: 'json_object',   // oder 'json_schema'
  provider: { sort: 'cost' },      // Routing-Vorgabe des Gateways
});
```

Oder kürzer aus der Umgebung: `gatewayFromEnv(process.env)` — gibt `null` zurück, wenn
kein Schlüssel gesetzt ist.

### Antwortformat

| Wert | Wirkung |
|---|---|
| `json_object` (Vorgabe) | Nur „gib JSON zurück". Breiteste Modellunterstützung. |
| `json_schema` | Das Schema wird mitgeschickt. Bessere Treue, aber nicht jedes Modell kann es. |
| `none` | Gar nichts. |

Die Vorgabe ist bewusst `json_object`: Die verbindliche Prüfung macht ohnehin Zod nach der
Antwort, und ein Schema, das ein Modell nicht versteht, kostet den ganzen Aufruf. Bei
ungültigem JSON bekommt das Modell **genau einen** Nachbesserungsversuch mit der konkreten
Fehlermeldung; danach ist es ein Fehler, kein Ratespiel. Das Feld `repairs` sagt, ob es
nötig war.

Das Schema wird aus dem Zod-Vertrag erzeugt (`pictureBookJsonSchema()`), nicht daneben
gepflegt — ein Test hält beide in Deckung.

## Einen anderen Anbieter einsetzen

`HttpJsonGenerator` nimmt `buildBody` und `readResult` als Funktionen; damit lässt sich jede
Chat-API in wenigen Zeilen anbinden, ohne dass das Paket den Anbieter kennt.
`VercelGatewayGenerator` ist selbst nur eine dünne Schicht darüber.

Prüfungen, Seitenplan und Bildprompts bleiben gleich — sie hängen nicht am Anbieter.

## Eine eigene Datenbank einsetzen

`BookStore` hat fünf Methoden: `create`, `get`, `put`, `remove`, `list`. Die
mitgelieferte `MemoryBookStore` ist für Entwicklung gedacht und wirft ab 5.000 Büchern
das älteste weg.

## Grenzen, die bewusst so sind

| | |
|---|---|
| Keine Warteschlange | `POST /v1/books` erzeugt synchron. Mit einem echten Modell dauert das 30–180 s — wer das über einen Proxy anbietet, braucht davor eine Job-Warteschlange. |
| Keine Abrechnung | Der Tokenverbrauch wird durchgereicht, aber nicht verrechnet. Kontingente und Limits gehören in die Schicht davor. |
| Keine Bilder | Der Dienst liefert Bildprompts und Platzhalter, keine Illustrationen. |
| Deutsch | Die Prompt-Heuristik und die Lesestufen sind auf Deutsch ausgelegt. |
| In-Memory | Ohne eigenen `BookStore` sind die Bücher nach einem Neustart weg. |
