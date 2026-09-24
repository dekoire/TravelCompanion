# Bilderbuch-Vorschau

Interaktive Seite, die aus den Paketen gebaut wird — kein zweiter Satz Logik.

```bash
node apps/preview/build.mjs     # -> apps/preview/dist/{index.html,app.js}
```

`index.html` enthaelt nur Markup und Styles. Die gesamte Fachlogik kommt per esbuild
aus `@abg/schemas`, `@abg/domain`, `@abg/llm` und `@abg/render`; esbuild loest die
Paketnamen ueber `alias` direkt auf die TypeScript-Quellen auf.

Damit der Bundle im Browser laeuft, ist `@abg/domain` plattformfrei: `node:crypto`
wurde durch eine eigene SHA-256-Implementierung ersetzt (`packages/domain/src/hash.ts`),
geprueft gegen die offiziellen Testvektoren und gegen `node:crypto`.

## Was die Seite zeigt

* Wizard: Idee, Figuren, Ort, Ziel, Lesestufe, Umfang, Technik, Farbwelt
* Andruckbogen: alle Doppelseiten mit echten Seitenzahlen
* Editor je Doppelseite: Text, Bild-Brief, Layout, Bildausschnitt, Figurenbesetzung
* Live-Pruefung: Druckbogen, Lesestufe, Figurenkonsistenz, Rhythmus, Text-Bild-Redundanz
* Der zusammengesetzte Bildprompt, wie ihn ein Bildmodell bekaeme

## Was die Seite NICHT ist

Die Bilder sind deterministische SVG-Platzhalter, keine KI-Illustrationen. Die Texte
stammen aus einem regelbasierten Demo-Generator (`DemoPictureBookProvider`), nicht aus
einem Sprachmodell. Beides laeuft aber durch dieselbe Pipeline wie ein echter Anbieter:
`LlmGateway` mit Budgetpruefung, Idempotenz und Schema-Validierung.

Ein echter Anbieter ersetzt genau zwei Stellen:
* Text: eine weitere `Provider`-Implementierung statt `DemoPictureBookProvider`
* Bild: ein Aufruf des Bildmodells statt `renderSpreadPlaceholder`
