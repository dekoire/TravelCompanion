# Demo-Bilderbuch

Erzeugt ein vollstaendiges Bilderbuch und schreibt es als eigenstaendige Seite.

```bash
npm run build:demo     # -> apps/demo-book/dist/index.html
```

Die Doppelseiten werden zur BAUZEIT gerendert und in die Seite eingebettet. Das
Ergebnis braucht weder Pipeline noch Zod noch irgendeine Laufzeit — nur HTML,
eingebettete SVGs und ein paar Zeilen fuer das Blaettern.

`src/generate.ts` ruft dieselbe `createPictureBook`-Funktion auf wie die API.
`template.html` enthaelt Markup und Styles mit Platzhaltern (`__TITLE_TEXT__`,
`__SPREADS__`, …), die der Generator ersetzt.

## Warum eigenstaendig

Die Vorschau (`apps/preview`) ist ein Werkzeug: Wizard, Andruckbogen, Editor,
Pruefbericht. Dieses hier ist das Ergebnis — ein Buch zum Durchblaettern, ohne
Werkzeugleisten. Zwei verschiedene Fragen, zwei verschiedene Seiten.
