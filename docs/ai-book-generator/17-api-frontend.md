# 17 — API, Frontend, Nutzerführung

## 1. API-Verträge

Alle Endpunkte unter `/api/v1`, Auth über Supabase-JWT im `Authorization`-Header
(bzw. Cookie bei Server Actions). **Kein Endpunkt löst synchron einen LLM-Call aus.**

### 1.1 Buch-Lebenszyklus

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/books` | Buch anlegen (`status = draft_spec`), Rückgabe `bookId` |
| `PATCH` | `/books/:id/spec` | Wizard-Zwischenstand speichern (nur in `draft_spec`) |
| `POST` | `/books/:id/spec/validate` | Validierung ohne Speichern → Blocker/Warnungen + Patch-Vorschläge |
| `POST` | `/books/:id/estimate` | Kosten-/Zeit-/Credit-Schätzung |
| `POST` | `/books/:id/start` | Credits reservieren, `book.generate.requested` senden |
| `POST` | `/books/:id/pause` · `/resume` · `/cancel` | Steuerung |
| `GET` | `/books/:id` | Buch inkl. Fortschritt, Status, Kosten |
| `GET` | `/books/:id/chapters` | Kapitelliste mit Status, Wortzahl, Issue-Zähler |
| `GET` | `/books/:id/chapters/:no` | Kapiteltext (aktuelle Version) + Issues |
| `DELETE` | `/books/:id` | Soft-Delete, Hard-Delete nach 30 Tagen |

### 1.2 Review und Eingriff

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/books/:id/checkpoints` | offene Checkpoints |
| `POST` | `/books/:id/checkpoints/:cid/decide` | Entscheidung (Outline A/B, Stil, Act-Freigabe, Kapitel-Entscheidung) |
| `PUT` | `/books/:id/chapters/:no/text` | Nutzer-Edit → erzeugt `chapter_version(source='user_edit')` |
| `POST` | `/books/:id/chapters/:no/impact` | **Vorab**-Impact-Analyse eines Edits, ohne zu speichern |
| `POST` | `/books/:id/chapters/:no/regenerate` | Neugenerierung mit optional geänderter Card |
| `PATCH` | `/books/:id/chapters/:no/card` | Chapter Card editieren |
| `POST` | `/books/:id/issues/:iid/accept` | Issue als akzeptiert markieren |
| `GET` | `/books/:id/canon` | Story-Bible, Figuren, Threads, Timeline (Leseansicht) |
| `PATCH` | `/books/:id/canon/entities/:eid` | Figur/Ort/Objekt korrigieren → Kaskadenprüfung |

### 1.3 Ausgabe

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/books/:id/render` | Formatliste anfordern |
| `GET` | `/books/:id/renders` | Status + Signed URLs |
| `POST` | `/books/:id/cover/regenerate` | Cover neu, mit optional geändertem Prompt |
| `GET` | `/books/:id/export/archive` | Vollarchiv (JSON + Manuskript) |

### 1.4 Fehlerformat (einheitlich)

```jsonc
{
  "error": {
    "code": "SPEC_VALIDATION_FAILED",
    "message": "Die Kapitelkonfiguration ist nicht umsetzbar.",
    "details": [ { "code": "V003", "field": "scope.wordsPerChapter",
                   "message": "…", "suggestions": [ { "label": "…", "patch": { } } ] } ],
    "requestId": "req_…"
  }
}
```

Jeder Fehler, den der Nutzer beheben kann, liefert `suggestions[].patch` — die UI kann daraus
einen Ein-Klick-Fix bauen.

## 2. Realtime-Fortschritt

```ts
supabase.channel(`book:${bookId}`)
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'books', filter: `id=eq.${bookId}` },
      onBookUpdate)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'chapters', filter: `book_version_id=eq.${bvId}` },
      onChapterUpdate)
  .subscribe();
```

- Publiziert werden nur Status-/Fortschrittsspalten. Kapiteltext kommt per REST, wenn der
  Nutzer ihn öffnet — sonst schiebt man bei jedem Commit 25 KB über den Socket.
- Fallback: Polling `GET /books/:id` alle 20 s, wenn der Socket fehlschlägt.
- Der Fortschritt ist **nicht** linear: Anzeige als Phasen (Planung 8 %, Stil 4 %,
  Kapitel 70 %, Audits 12 %, Export 6 %) mit Kapitelzähler.

## 3. UI-Flows

### 3.1 Wizard (6 Schritte)

```
1  Was für ein Buch?      Track, Typ, Genre, Sprache
2  Worum geht es?         Idee (Freitext), Themen, Setting, Muss/Darf-nicht
3  Wer kommt vor?         Figuren (optional; leer = System erfindet)   [nur Fiction]
   Was soll der Leser können?  Lernziele, Zielgruppe                   [nur Non-Fiction]
4  Wie groß, wie geschrieben?  Umfang, Stil, POV, Zeitform, Rating
5  Was brauchst du?       Cover, Bilder, Hörbuch, Formate
6  Prüfen und starten     Validierung, Kosten, Dauer, Bestätigung
```

Prinzipien:
- **Jeder Schritt speichert sofort** (`PATCH /spec`), kein Datenverlust.
- Validierung läuft live, aber blockiert nur auf Schritt 6.
- Voreinstellungen sind gute Defaults, keine leeren Felder. Ein Nutzer, der nur eine Idee und
  "Roman" wählt, muss starten können.
- Die Kostenanzeige ist auf Schritt 6 verbindlich, nicht "ca.".

### 3.2 Outline-Auswahl

Nebeneinander zwei Spalten, plus:
- Beat-Zeitleiste mit Markierung der Unterschiede
- Spannungskurve beider Varianten
- Kapitelübersicht mit Ein-Satz-Zusammenfassung
- Aktionen: *Variante A* · *Variante B* · *A mit Subplot-Gewicht von B* · *Beide verwerfen,
  neu planen* (kostet erneut)

### 3.3 Generierungsansicht

```
┌──────────────────────────────────────────────────────────────┐
│  Der letzte Brief                        Kapitel 14 von 28   │
│  ████████████████░░░░░░░░░░░░  48 %      ~3 h 20 min übrig   │
│  Aktuell: Kapitel 14 wird geprüft                            │
├──────────────────────────────────────────────────────────────┤
│  ✓ 1–13 fertig     ● 14 in Arbeit      ○ 15–28 geplant       │
│  ⚠ Kapitel 9: 2 Hinweise (nicht blockierend)                 │
├──────────────────────────────────────────────────────────────┤
│  [ Fertige Kapitel lesen ]  [ Pausieren ]  [ Abbrechen ]     │
└──────────────────────────────────────────────────────────────┘
```

- Fertige Kapitel sind **sofort lesbar** — der Nutzer wartet nicht Stunden auf ein Ergebnis.
- Restzeit aus dem gleitenden Mittel der letzten 5 Kapitel, nicht aus einer festen Schätzung.
- Der Tab darf geschlossen werden; E-Mail/Push bei Checkpoints und Fertigstellung.

### 3.4 Kapitel-Review

Zweispaltig: links Text, rechts Issue-Liste. Jedes Issue markiert seine Textstelle
(Offsets aus `evidence`). Aktionen je Issue: *Vorschlag anwenden* · *Ignorieren* ·
*Selbst bearbeiten*. Beim Editieren zeigt ein Banner die Impact-Analyse:

> *Diese Änderung betrifft voraussichtlich Kapitel 17 und 22 (Besitz des Schlüssels).
> Anpassung kostet ca. 0,38 €. [Trotzdem speichern] [Verwerfen]*

### 3.5 Editor

- Tiptap/ProseMirror, Kapitel als Dokument, Szenen als Sektionen.
- Nur die Formatierung, die das Buch kennt: Absatz, Kursiv, Szenentrenner. Kein Rich-Text-Zoo.
- Kommentare des Systems (Issues) als Anmerkungen am Rand.
- Speichern erzeugt eine neue `chapter_version`; Versionshistorie mit Diff einsehbar.

## 4. Vertrag mit dem Nutzer bei langen Laufzeiten

Das muss vor dem Start klar kommuniziert und im Produkt eingelöst werden:

| Frage | Antwort im Produkt |
|---|---|
| Wie lange dauert es? | Verbindliche Spanne auf Schritt 6, danach laufende Restzeit |
| Muss ich warten? | Nein. Tab schließen ist sicher, Benachrichtigung per E-Mail/Push |
| Was, wenn etwas schiefgeht? | Buch pausiert, du wirst gefragt — es bricht nie stumm ab |
| Was, wenn ich abbreche? | Fertige Kapitel bleiben, nur verbrauchte Credits werden berechnet |
| Kann ich zwischendurch lesen? | Ja, jedes committete Kapitel sofort |
| Kann ich eingreifen? | Ja: nach Outline, nach Stilwahl, nach Act 1, bei jedem Problemfall |
| Was kostet es? | Vorab verbindlich; Nachforderung nur mit Zustimmung |
| Wem gehört der Text? | Dir; KI-Kennzeichnung ist enthalten |

## 5. Benachrichtigungen

| Ereignis | Kanal |
|---|---|
| Outline bereit | E-Mail + Push |
| Stilvarianten bereit | E-Mail + Push |
| Act-1-Freigabe nötig | E-Mail + Push |
| Kapitel braucht Entscheidung | E-Mail + Push |
| Budget zu 80 % / 100 % verbraucht | E-Mail |
| Buch fertig | E-Mail + Push |
| Fehler/Pausierung | E-Mail |

Keine Benachrichtigung pro Kapitel — das wären 30 Mails.

## 6. Frontend-Architektur

```
app/
  (app)/books/page.tsx                 Liste (RSC)
  (app)/books/new/[step]/page.tsx      Wizard (Client, Zustand in DB)
  (app)/books/[id]/page.tsx            Übersicht + Fortschritt (RSC + Realtime-Client)
  (app)/books/[id]/outline/page.tsx    Outline-Auswahl
  (app)/books/[id]/style/page.tsx      Stilkalibrierung
  (app)/books/[id]/read/[no]/page.tsx  Leser
  (app)/books/[id]/edit/[no]/page.tsx  Editor
  (app)/books/[id]/canon/page.tsx      Story-Bible-Ansicht (Figuren, Timeline, Threads)
  (app)/books/[id]/export/page.tsx     Downloads
```

- **RSC für alles Lesende**, Client-Komponenten nur für Editor, Realtime, Wizard.
- Server Actions für Mutationen; kein separater API-Client im Frontend außer für
  Long-Polling-Fallbacks.
- Optimistische Updates nur bei Nutzer-Edits, nie bei Generierungsstatus.

## 7. Canon-Ansicht (unterschätztes Feature)

Der Nutzer sollte sehen, was das System "weiß":

- **Figuren**: Profil, aktueller Zustand, Beziehungen als Graph, Auftritte je Kapitel
- **Timeline**: Szenen auf einer Zeitachse, Ortswechsel, Zeitsprünge
- **Threads**: Balkendiagramm je Kapitel — welcher Strang wird wann berührt (macht
  vernachlässigte Nebenhandlungen sofort sichtbar)
- **Hinweise/Payoffs**: Tabelle mit Status
- **Glossar**: Begriffe und Schreibweisen

Das ist nicht nur Transparenz, sondern die beste Fehlerprävention: Nutzer erkennen
Widersprüche schneller als jeder Audit, wenn man ihnen die Daten zeigt.
