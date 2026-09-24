# 22 — Bilderbuch-Track

Nachtrag zur Gap-Analyse. Das Ausgangskonzept und die Dokumente 01–21 behandeln Bilder
durchgehend als **Dekoration für Romane**: Kapitel 19 heißt „Kapitelbilder", Bilder entstehen
*nach* dem finalen Kapiteltext, und im Schema stand `deliverables.chapterImages: boolean`.

Für ein Bilderbuch ist das die falsche Richtung.

## 1. Der Unterschied

| | Roman mit Bildern | Bilderbuch |
|---|---|---|
| Einheit | Kapitel | **Doppelseite** (Spread) |
| Primärer Inhalt | Text | **Bild** |
| Rolle des Textes | die Geschichte | **Bildunterschrift** |
| Reihenfolge | Text → Bild | **Bild und Text gemeinsam geplant** |
| Umfang | frei wählbar | **Druckbogen: 24 / 32 / 40 / 48 Seiten** |
| Häufigster Fehler | Faktendrift | **Text erzählt nach, was das Bild zeigt** |

Ein `boolean` kann das nicht ausdrücken, und ein Pipeline-Schritt „Bilder nach dem Text" auch
nicht. Der Bilderbuch-Track hat deshalb ein eigenes Datenmodell.

## 2. Druckbogen-Mathematik

Bilderbücher werden in Bogen gedruckt. Nur Seitenzahlen, die durch 8 teilbar sind, sind
herstellbar — 32 Seiten ist der Standard. Eine 30-seitige Datei ist keine „fast fertige"
Datei, sie ist nicht druckbar.

In einem gebundenen Buch ist **Seite 1 eine rechte Seite**. Eine Doppelseite ist deshalb
immer ein Paar aus gerader linker und ungerader rechter Seite:

```
S. 1        Schmutztitel        (allein, rechts)
S. 2–3      Titeldoppelseite
S. 4–5      Doppelseite  1   ←  erste Story-Doppelseite
S. 6–7      Doppelseite  2
…
S. 30–31    Doppelseite 14
S. 32       Impressum           (allein, links)
```

```
storySpreads = (pageCount − 3 − 1) / 2
```

| Seiten | Story-Doppelseiten |
|---:|---:|
| 24 | 10 |
| 32 | **14** |
| 40 | 18 |
| 48 | 22 |

14 ist die Zahl, mit der Bilderbuch-Verlage tatsächlich arbeiten. Sie ist keine Einstellung,
sondern eine Folge der Bogenbindung.

Implementierung: [`planPages`](../../book-generator/packages/domain/src/picturebook.ts).

## 3. Lesestufen

Die Textmenge pro Doppelseite hängt am Lesealter — und die Stufen sind **nicht ineinander
geschachtelt**: Eine höhere Stufe verschiebt Ober- *und* Untergrenze. Ein 8-Wort-Text ist für
ein dreijähriges Kind richtig und für ein sechsjähriges zu dünn.

| Stufe | Alter | Wörter/Doppelseite | max. Sätze | max. Wörter/Satz |
|---|---|---|---|---|
| `pre_reader` | 3–5 | 6–32 | 2 | 12 |
| `early_reader` | 5–7 | 12–55 | 3 | 15 |
| `independent` | 7–9 | 25–90 | 5 | 20 |

Zusätzlich je Stufe eine Liste schwieriger Anschlüsse (`obwohl`, `nachdem`, `sodass` …), die
für die kleinste Stufe gemeldet werden.

## 4. Figurenkonsistenz im Bild

Das Kernproblem generierter Bilderbücher: dieselbe Figur sieht auf jeder Seite anders aus.

Das Gegenmittel ist nicht ein besserer Prompt, sondern **ein eingefrorener Textbaustein**:

```ts
CharacterSheet {
  visualDescriptor: string   // einmal erzeugt, danach unveränderlich
  paletteSeed: number        // deterministische Farbidentität
  scaleRelative: number      // Größenverhältnis zur Hauptfigur
}
```

Der `visualDescriptor` wird **wörtlich** in jeden Bildprompt eingesetzt, auf dem die Figur
vorkommt. Das Modell formuliert ihn nie neu — dann driftet er.

## 5. Bildprompt: was das Modell liefert und was Code setzt

Genau die Trennung aus [12-ai-vs-deterministisch.md](12-ai-vs-deterministisch.md):

| Teil | Wer |
|---|---|
| Was auf dem Bild passiert (`ImageBrief`: subject, action, setting, mood, camera, time) | **LLM** |
| Figurenbeschreibungen | **Code** — wörtlich aus dem Character Sheet |
| Stilanker (Technik, Farbwelt, Licht, Linie) | **Code** — für alle Seiten identisch |
| Layout-Hinweis und freizuhaltende Textfläche | **Code** — folgt aus `layout` und `textAnchor` |
| Negativliste | **Code** |

```
[Stilanker]
Technik: Aquarell.

Szene: Mika am Ufer — steht vor einem breiten Bach
Ort: Waldbach mit glatten Steinen, Mittagslicht
Stimmung: zögernd
Bildausschnitt: Halbtotale

Figuren — exakt so darstellen, unverändert auf allen Seiten:
  • Mika: ein Kind, runde Wangen, kurze dunkle Haare, gelbe Regenjacke …
  Größenverhältnis: Mika 1×, Nuri 0.55×

Farbwelt: Moosgrün und Salbei. Licht: warm_daylight. Linien: soft.
Format: Doppelseite, Querformat 2:1. Layout: Motiv rechts, linke Seite ruhig.
Ruhige Fläche unter dem Bild freilassen — dort steht der Text.

Kein Text, keine Buchstaben, keine Schrift, keine Zahlen im Bild.
Vermeiden: Text, Buchstaben, Wasserzeichen, verzerrte Hände …
```

Die letzte Zeile ist nicht Kosmetik: Bildmodelle setzen Buchstaben unzuverlässig. Schrift wird
typografisch darübergelegt — genauso wie beim Cover ([19](19-export-medien.md) §2.1).

## 6. Prüfungen (alle deterministisch)

| Code | Schwere | Prüft |
|---|---|---|
| `pb_spread_count_mismatch` | block | Doppelseitenzahl gegen Druckbogen |
| `pb_wrong_page_numbers` | block | Seitenzahlen gegen den Seitenplan |
| `pb_spread_not_aligned` | block | linke Seite ist gerade |
| `pb_character_without_sheet` | block | Figur im Bild ohne Bildbeschreiber |
| `pb_text_too_long` | block | Textmenge gegen Lesestufe |
| `pb_text_too_short` | warn | dito, Untergrenze |
| `pb_too_many_sentences` · `pb_sentence_too_long` | warn | Satzbau gegen Lesestufe |
| `pb_text_image_redundancy` | warn | **Text erzählt nach, was das Bild zeigt** |
| `pb_text_in_image_risk` | warn | Bild-Brief verlangt Schrift im Bild |
| `pb_protagonist_absent` | warn | Hauptfigur zu selten sichtbar |
| `pb_unused_character` | warn | Figurenblatt ohne Auftritt |
| `pb_refrain_underused` | warn | Refrain unter drei Vorkommen |
| `pb_duplicate_beat` | warn | zwei Doppelseiten mit demselben Beat |
| `pb_layout_monotony` · `pb_layout_repeat` | warn/info | Layout-Rhythmus |
| `pb_camera_monotony` | info | vier gleiche Bildausschnitte in Folge |
| `pb_no_full_bleed` | info | kein randloser Höhepunkt |
| `pb_discouraged_connective` | info | schwieriger Anschluss für die Lesestufe |
| `pb_empty_spread` | info | Doppelseite ohne Blickanker |

### 6.1 Die Redundanzprüfung

Der häufigste Fehler in generierten Bilderbüchern: *„Der Hund rennt über die Wiese."* unter
einem Bild von einem Hund, der über eine Wiese rennt. Der Text verdoppelt das Bild und trägt
nichts bei.

Gemessen wird die Überschneidung der Inhaltswörter zwischen `text` und
`imageBrief.subject + action`:

```
redundanz = |Inhaltswörter(text) ∩ Inhaltswörter(brief)| / min(|text|, |brief|)
```

Ab 0,6 wird gemeldet — mit dem konkreten Hinweis, was stattdessen im Text stehen sollte:
was die Figur denkt, hört oder fürchtet. Also das, was das Bild **nicht** zeigen kann.

Das ist eine Annäherung, kein Beweis. Sie ist aber deterministisch, kostenlos und trifft den
Fehler zuverlässig genug, um ihn sichtbar zu machen.

## 7. Refrain

Für `pre_reader` und `early_reader` ist ein wiederkehrender Satz das stärkste Einzelmittel —
Kinder warten darauf und sprechen ihn mit. Er trägt erst ab **drei** Vorkommen; darunter wirkt
er wie ein Versehen. Deshalb eine eigene Prüfung statt einer Stilempfehlung im Prompt.

## 8. Was noch fehlt

| Lücke | Nötig für |
|---|---|
| Echter Bildprovider | ersetzt `renderSpreadPlaceholder`, plus Storage und Asset-Verwaltung |
| Referenzbild je Figur (Character Sheet als Bild) | Bildkonsistenz über den Textbeschreiber hinaus ([19](19-export-medien.md) §4) |
| Satzspiegel-Prüfung am echten Bild | ob die freigehaltene Fläche wirklich ruhig ist |
| PDF/Print mit Beschnitt und Bundsteg | Druckdatei ([19](19-export-medien.md) §5.2) |
| Vorlesbarkeit | Silbenzahl, Betonung, Reim — messbar, aber noch nicht gebaut |
| Persistenz | Der Entwurf liegt derzeit nur im Browser-Speicher der Vorschau |

## 9. Implementierung

| Datei | Inhalt |
|---|---|
| [`schemas/picturebook.ts`](../../book-generator/packages/schemas/src/picturebook.ts) | `Spread`, `CharacterSheet`, `StyleGuide`, `ImageBrief`, `PictureBookPlan` |
| [`domain/picturebook.ts`](../../book-generator/packages/domain/src/picturebook.ts) | Seitenplan, Lesestufen, Prompt-Komposition, Seeds |
| [`domain/picturebook-validate.ts`](../../book-generator/packages/domain/src/picturebook-validate.ts) | alle Prüfungen aus §6 |
| [`llm/picturebook-pipeline.ts`](../../book-generator/packages/llm/src/picturebook-pipeline.ts) | Ablauf Code → LLM → Code |
| [`render/placeholder.ts`](../../book-generator/packages/render/src/placeholder.ts) | deterministischer SVG-Platzhalter |
| [`apps/preview`](../../book-generator/apps/preview/) | interaktive Vorschau mit Editor |
