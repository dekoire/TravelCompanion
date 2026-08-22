# 19 — Metadaten, Cover, Bilder, Export, Hörbuch

Alles in diesem Dokument passiert **nach** dem Canon-Rebuild — auf Basis des tatsächlichen
Endtextes, nicht des Plans.

## 1. Metadaten

```jsonc
{
  "finalTitle": "Der letzte Brief",
  "subtitle": "Ein Kriminalroman aus Ardmoor",
  "seriesInfo": { "name": null, "index": null },
  "blurb": "…150–220 Wörter, Klappentext…",
  "shortDescription": "…max 300 Zeichen für Shops…",
  "logline": "…1 Satz…",
  "categories": [
    { "scheme": "BISAC", "code": "FIC022000", "label": "Fiction / Mystery & Detective" },
    { "scheme": "THEMA", "code": "FFC", "label": "Krimi" }
  ],
  "keywords": ["historischer Krimi", "viktorianisch", "Küstenstadt", "Familiengeheimnis",
               "Archivarin", "Brief", "1894"],
  "contentWarnings": ["Trauer", "Tod eines Elternteils"],
  "ageRating": "16+",
  "readingTimeMinutes": 348,
  "estimatedPages": 312,
  "language": "de-DE",
  "aiDisclosure": "Dieses Buch wurde mit Unterstützung generativer KI erstellt."
}
```

- **Titel und Klappentext** kommen aus einem LLM-Call über die finalen Kapitel-Summaries +
  Ending Contract. Der Klappentext darf **das Ende nicht verraten** — das ist eine explizite
  Prompt-Regel und wird mit einem Verifikations-Call geprüft (`Verrät dieser Text die
  Auflösung? Ja/Nein + Zitat`).
- **Kategorien**: Das LLM schlägt Labels vor, deterministischer Code mappt auf gültige
  BISAC-/THEMA-Codes aus einer lokalen Tabelle. Ein halluzinierter BISAC-Code ist beim
  Upload ein Fehler.
- **Seitenprognose**: `wordCount / locale.wordsPerPage` × Formatfaktor (6×9": ×1,0; 5×8": ×1,22).
- **Lesedauer**: `wordCount / 220` Wörter pro Minute (deutsch, Belletristik).

## 2. Cover

### 2.1 Zwei getrennte Schritte

```
1. BILD   Bildmodell erzeugt ein textfreies Motiv
2. TEXT   Titel, Untertitel, Autorname werden typografisch überlagert (satori + resvg / sharp)
```

**Das Bildmodell erzeugt niemals Covertext.** Auch gute Bildmodelle setzen Buchstaben falsch,
und der Titel ist das Element, bei dem ein Fehler das Produkt wertlos macht.

### 2.2 Cover-Prompt

Zusammengesetzt aus (deterministisch) + (LLM für die Bildidee):

```
Genre:        historischer Krimi
Stimmung:     kalt, neblig, melancholisch
Motiv:        ein dunkler Leuchtturm über einer Klippe, Papier im Wind   ← LLM
Zeit/Ort:     englische Nordseeküste, 1894
Farbwelt:     Graublau, Sepia, ein warmer Lichtpunkt
Komposition:  vertikal, unteres Drittel frei für Titeltypografie          ← deterministisch
Stil:         fotografisch, körnig, kein Text, keine Menschen im Gesicht erkennbar
Rating:       keine Gewaltdarstellung
Negativ:      Text, Buchstaben, Wasserzeichen, Logos, verzerrte Hände
```

Die Regel "unteres/oberes Drittel frei lassen" ist entscheidend, sonst kollidiert das
Textoverlay mit dem Motiv.

### 2.3 Maße

```ts
// KDP Taschenbuch, 6×9", weißes Papier
const spineWidth_in = pageCount * 0.002252;          // creme: 0.0025
const bleed_in = 0.125;
const fullCoverWidth_in  = 2 * 6 + spineWidth_in + 2 * bleed_in;
const fullCoverHeight_in = 9 + 2 * bleed_in;
const px = (inch: number) => Math.round(inch * 300);  // 300 dpi
```

Der Rücken braucht ab ~100 Seiten eigenen Text (Titel + Autor, rotiert). Unter 100 Seiten:
kein Rückentext (KDP-Vorgabe).

Ausgaben: `cover_ebook` (1600×2560, RGB, JPEG), `cover_print` (Full-Wrap, CMYK-fähiges PDF).

### 2.4 Cover-Varianten
Drei Varianten erzeugen, Nutzer wählt. Kosten sind gering im Verhältnis zur Wirkung.

## 3. Kapitelbilder

- Erst **nach** finaler Kapitelversion.
- Ein Bild pro Kapitel, Motiv aus der stärksten visuellen Szene (LLM wählt anhand der
  Scene Cards + Summary, Kriterium: konkret, statisch, spoilerfrei).
- Bei späterer Kapiteländerung: `assets.status = 'stale'` → Prüfung, ob das Motiv noch passt
  (Verifikations-Call), ggf. Neuerzeugung.

## 4. Bildkonsistenz (Lücke im Ausgangskonzept)

Ohne Maßnahmen sieht dieselbe Figur in jedem Kapitelbild anders aus.

```
1. CHARACTER SHEET   Für jede Figur, die in Bildern vorkommt, wird EIN Referenzbild erzeugt
                     (neutraler Hintergrund, definierte Ansicht) und als Asset gespeichert.
2. DESKRIPTOR        Ein deterministisch zusammengesetzter, IMMER identischer Textblock:
                     "June Weber: Frau, Mitte 30, graugrüne Augen, dunkelblondes schulterlanges
                      Haar, schmales Gesicht, dunkler praktischer Mantel, hinkt leicht rechts"
                     → dieser Block geht wörtlich in JEDEN Bildprompt mit ihr.
3. REFERENZ          Falls das Bildmodell Bildreferenzen unterstützt: Character Sheet als
                     Referenz mitgeben.
4. SEED              Pro Buch ein fixer Basis-Seed; Kapitelbilder verwenden Seed + Kapitelnummer.
5. STILANKER         Ein identischer Stilblock in jedem Prompt (Medium, Beleuchtung, Palette).
```

Der Deskriptor (Schritt 2) wird **einmal** aus `entities.data.appearance.immutable` generiert
und danach eingefroren. Er darf sich über das Buch nicht ändern — sonst ändert sich das Gesicht.

## 5. Export

### 5.1 EPUB 3

```
mimetype  (unkomprimiert, erste Datei im ZIP)
META-INF/container.xml
OEBPS/
  content.opf          Metadaten (dc:title, dc:creator, dc:language, dc:identifier=UUID,
                       dc:description inkl. KI-Hinweis), Manifest, Spine
  nav.xhtml            EPUB3-Navigation (Inhaltsverzeichnis)
  toc.ncx              EPUB2-Fallback für alte Reader
  cover.xhtml
  frontmatter/         Titelei, Impressum, Widmung, Content-Warnungen
  text/ch001.xhtml …   ein Dokument pro Kapitel
  backmatter/          Disclaimer, KI-Kennzeichnung, Über den Autor
  images/
  styles/main.css
```

Regeln:
- Semantisches HTML: `<section epub:type="chapter">`, `<h1>` je Kapitel, `<p>` für Absätze,
  `<hr class="scene-break"/>` für Szenentrenner.
- **Keine** absoluten Schriftgrößen, keine festen Zeilenhöhen — E-Reader dürfen umbrechen.
- Sprache `xml:lang` gesetzt (Silbentrennung).
- Validierung mit `epubcheck` als Pflicht-Gate im Render-Job. Ein EPUB, das nicht validiert,
  wird nicht ausgeliefert.

### 5.2 PDF

Zwei Profile:

| Profil | Zweck | Merkmale |
|---|---|---|
| `pdf` (Digital) | Lesen am Bildschirm | A5, einseitig, Links aktiv, RGB |
| `pdf_print` (KDP) | Druck | 6×9", Spiegelränder, Bundsteg, gerade/ungerade Kolumnentitel, Kapitel auf rechter Seite, keine Schusterjungen/Hurenkinder, eingebettete Schriften, Beschnitt |

Technik: HTML + CSS Paged Media, gerendert mit Paged.js in Headless-Chromium
(Container-Worker, nicht Vercel). Kolumnentitel, Seitenzahlen und Inhaltsverzeichnis über
`@page`-Regeln und `target-counter()`.

Typografische Pflichtregeln (deterministisch geprüft):
- Deutsche Anführungszeichen konsistent
- Geschützte Leerzeichen vor `%`, in Abkürzungen, bei Maßeinheiten
- Gedankenstrich (Halbgeviert) statt Bindestrich
- Keine Absatzeinzüge nach Szenentrennern und Kapitelanfängen
- Silbentrennung aktiv (`hyphens: auto` + `lang="de"`)

### 5.3 DOCX

Für Nutzer, die weiterarbeiten wollen. Formatvorlagen (`Heading 1`, `Body Text`) statt
direkter Formatierung, damit Import in Word/Scrivener/Vellum sauber ist.

### 5.4 Render-Snapshot

Jeder Render speichert in `renders.source_snapshot`, **welche** `chapter_version_id` enthalten
sind. So ist jederzeit nachvollziehbar, ob eine ausgelieferte Datei aktuell ist — und die UI
kann "neuere Version verfügbar" anzeigen.

## 6. Hörbuch

### 6.1 Pipeline

```
1  SEGMENTIERUNG   Kapitel → Sätze (Intl.Segmenter) → Blöcke à 800–2.500 Zeichen,
                   Schnitt NUR an Satzgrenzen, nie mitten im Dialog
2  ROLLENZUWEISUNG Erzähler + optional je Hauptfigur eine Stimme (aus utterances-Daten)
3  SSML            Pausen an Absätzen (400 ms) und Szenentrennern (1.200 ms),
                   Aussprache aus glossary_entries.pronunciation (IPA),
                   Betonung sparsam — Überformatierung klingt künstlich
4  SYNTHESE        Blockweise, parallel, mit Retry; Ergebnis als assets(kind='audio_segment')
5  QS              Dauer plausibel? (Zeichen/Sekunde im erwarteten Band)
                   Stille am Ende? Clipping? Fehlende Blöcke?
6  ASSEMBLIERUNG   ffmpeg: Konkatenation, Normalisierung auf -19 LUFS (Mono) /
                   -18 LUFS (Stereo), Kapitelmarker, Metadaten
7  AUSGABE         M4B mit Kapitelmarken; optional MP3 je Kapitel
```

### 6.2 Aussprache erfundener Namen

Bei `deliverables.audiobook = true` wird für jeden Glossareintrag vom Typ `invented`,
`person` oder `location` eine IPA-Aussprache erzeugt und dem Nutzer **zur Bestätigung**
angezeigt (kurze Liste, hörbare Vorschau). Ohne diesen Schritt spricht die TTS "Ardmoor"
in jedem Kapitel anders aus.

### 6.3 Kosten und Dauer

- ~100.000 Wörter ≈ 600.000 Zeichen ≈ 11–12 Stunden Audio.
- Synthese-Zeit bei 8-facher Parallelität: 40–90 Minuten.
- Kosten sind stark providerabhängig und oft der **größte Einzelposten** des ganzen Buches —
  deshalb ist Audiobook ein separates, kostenpflichtiges Add-on mit eigener Freigabe.

### 6.4 Änderungen nach der Synthese

Ändert sich ein Kapitel, werden nur dessen Audio-Segmente neu erzeugt (`assets` sind pro
Kapitel und Block granular) und das M4B neu assembliert. Nie das ganze Buch neu sprechen.

## 7. Render-Gates

Ein Export wird nur erzeugt, wenn:

| Gate | Bedingung |
|---|---|
| Vollständigkeit | Alle Kapitel `committed` |
| Qualität | Keine offenen `block`-Issues (akzeptierte zählen als geschlossen, werden aber im Bericht ausgewiesen) |
| Canon | Canon-Rebuild abgeschlossen |
| Metadaten | Titel, Klappentext, Kategorien vorhanden |
| Rating | Rating-Gate über alle Kapitel bestanden |
| Recht | KI-Kennzeichnung und Disclaimer im Backmatter |
| EPUB | `epubcheck` fehlerfrei |

Der Export enthält zusätzlich einen **Qualitätsbericht** (PDF/HTML): Kennzahlen aus
[20](20-qualitaet-tests.md), Liste akzeptierter Abweichungen, Modell- und Promptversionen,
KI-Offenlegungstext für Plattform-Uploads.
