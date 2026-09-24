# Bilderbuch-Service — API

Eigenständiger Dienst. Ein Prompt rein, ein geprüftes Bilderbuch raus.

```bash
ABG_ALLOW_ANONYMOUS=lokal npm run serve
curl -X POST localhost:8787/v1/books -H 'content-type: application/json' \
  -d '{"prompt":"Ein kleiner Fuchs namens Nuri, der das Meer sucht"}'
```

## Was der Dienst ist und was nicht

Er kennt **keine** Abrechnung, keine Kontingente, kein Modell-Routing und keine
Kostenrechnung. Die gesamte Schnittstelle zu einem Sprachmodell ist eine Funktion:

```ts
interface TextGenerator {
  readonly name: string;
  readonly synthetic: boolean;        // true = kein Modell beteiligt
  complete(req: CompletionRequest): Promise<string>;
}
```

Wer den Dienst betreibt, bringt seinen Anbieter mit und rechnet dort ab. Der Wert liegt
in dem, was davor und danach passiert: Druckbogen, Lesestufe, Figurenkonsistenz,
Bildprompt-Komposition und 18 Prüfungen — alles ohne Modell.

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
  "generator": { "name": "demo", "synthetic": true },
  "notice": "Dieser Entwurf stammt aus einem regelbasierten Demo-Generator, …",

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

## Einen echten Anbieter einsetzen

```ts
import { HttpJsonGenerator, createPictureBook } from '@abg/picturebook';

const generator = new HttpJsonGenerator({
  name: 'mein-anbieter',
  endpoint: 'https://api.example.com/v1/chat',
  headers: { authorization: `Bearer ${process.env.PROVIDER_KEY}` },
  buildBody: (req) => ({
    model: 'mein-modell',
    messages: [
      { role: 'system', content: req.system },
      { role: 'user', content: req.prompt },
    ],
    max_tokens: req.maxOutputTokens,
    temperature: req.temperature,
  }),
  readText: (res: any) => res.choices[0].message.content,
});

const service = createService({ generator, auth: { keys: { … } } });
```

Mehr ist nicht nötig. Prüfungen, Seitenplan und Bildprompts bleiben gleich — sie hängen
nicht am Anbieter.

## Eine eigene Datenbank einsetzen

`BookStore` hat fünf Methoden: `create`, `get`, `put`, `remove`, `list`. Die
mitgelieferte `MemoryBookStore` ist für Entwicklung gedacht und wirft ab 5.000 Büchern
das älteste weg.

## Grenzen, die bewusst so sind

| | |
|---|---|
| Keine Warteschlange | `POST /v1/books` erzeugt synchron. Mit einem echten Modell dauert das 30–180 s — wer das über einen Proxy anbietet, braucht davor eine Job-Warteschlange. |
| Keine Abrechnung | Kein Token-Zählen, keine Kontingente, keine Limits. Gehört in die Schicht davor. |
| Keine Bilder | Der Dienst liefert Bildprompts und Platzhalter, keine Illustrationen. |
| Deutsch | Die Prompt-Heuristik und die Lesestufen sind auf Deutsch ausgelegt. |
| In-Memory | Ohne eigenen `BookStore` sind die Bücher nach einem Neustart weg. |
