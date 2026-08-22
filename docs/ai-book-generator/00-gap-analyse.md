# 00 — Gap-Analyse des Ausgangskonzepts

Das eingereichte Konzept ist inhaltlich stark: die Kernthese (LLM schreibt, DB besitzt die
Wahrheit), die hierarchische Planung, das Event-Ledger, die Delta-Extraktion und die
Repair-Ladder sind richtig und decken sich mit dem Forschungsstand. Es ist als **narratives
Qualitätskonzept** weitgehend vollständig.

Es ist aber **kein umsetzbares technisches Konzept**, weil folgende Ebenen fehlen. Sortiert
nach Kritikalität.

---

## A. Blocker — ohne diese Punkte lässt sich das System nicht bauen

### A1. Ausführungsmodell und Laufzeitlimits fehlen vollständig
Das Konzept nennt "Next.js/Vercel" und "Inngest oder Trigger.dev", aber nirgends steht,
**wo der eigentliche LLM-Call läuft und wie lange er dauern darf**. Das ist der Punkt, an dem
solche Projekte real scheitern:

- Vercel Serverless: 60 s (Hobby), 300 s (Pro Standard), bis 800 s mit Fluid Compute.
- Ein Kapitel mit 3.500 Wörtern + Thinking: 90–400 s. Ein Audit über 100k Wörter: bis 600 s.
- Ein komplettes 100k-Buch: 6–40 Stunden Wall-Clock inklusive Retries und Reviews.

→ Gelöst in [01-systemarchitektur.md](01-systemarchitektur.md) §2 (Laufzeit-Mathematik,
Step-Zuschnitt, Container-Fallback) und [16-workflows-jobs.md](16-workflows-jobs.md).

### A2. Auth, Mandantentrennung und RLS fehlen
Supabase wird als Datenbank genannt, aber ohne ein Wort zu Row Level Security, Service-Role-Key,
Ownership, Storage-Policies. Bei einem Multi-User-Produkt mit privaten Manuskripten ist das
kein Detail, sondern das Sicherheitsfundament.

→ [14-datenmodell.md](14-datenmodell.md) §8 und [schema.sql](schema.sql).

### A3. Die "deterministischen Checks" sind nicht deterministisch
Kapitel 34 des Ausgangskonzepts listet Checks wie "Gegenstand gleichzeitig bei mehreren
Personen" oder "tote Figur handelt" als deterministisch. Sie operieren aber auf Daten, die ein
**LLM extrahiert hat**. Wenn die Extraktion halluziniert, prüft deterministischer Code
zuverlässig eine erfundene Welt.

Es fehlt die **Vertrauensgrenze**: Ein extrahierter Fakt wird erst Canon, wenn er durch ein
wörtliches Zitat mit Zeichen-Offset im Kapiteltext belegt ist und dieser Substring-Vergleich
im Backend besteht.

→ [10-extraktion.md](10-extraktion.md) §3 (Quote-Grounding).

### A4. Abhängigkeitsverfolgung bei Nutzeränderungen ist nur benannt, nicht gelöst
Kapitel 46 sagt "Abhängigkeiten bestimmen" — ohne Mechanismus. Ohne Mechanismus bleibt nur
"alles nach Kapitel 8 neu generieren", was Kosten und Qualität zerstört.

Lösung: Der Context Builder kennt exakt die Fakt-IDs, die er in ein Kapitel injiziert hat.
Diese werden als **Read-Set** persistiert, die extrahierten Deltas als **Write-Set**. Die
Invalidierung ist dann ein Graph-Traversal, kein Rätselraten.

→ [11-validierung-reparatur.md](11-validierung-reparatur.md) §7.

### A5. Kein Sachbuch-/Themen-Track
Das Konzept ist zu 100 % belletristisch. Der Anwendungsfall "ich habe ein Thema und will ein
großes Buch" braucht eine völlig andere Planungsebene: Thesenbaum statt Plot, Lernziele statt
Figurenbögen, Quellen- und Claim-Ledger statt Story-State, Definitions-Reihenfolge statt
Timeline. Auch die Fehlerklassen sind andere (Halluzination von Zahlen, Quellen, Zitaten;
Redundanz zwischen Kapiteln; Begriff vor Definition benutzt).

→ [05-planung-nonfiction.md](05-planung-nonfiction.md).

### A6. Prompt-Sicherheit ist nur als Wunsch formuliert
"Structured Output + Zod" ist Schema-Validierung, keine Sicherheit. Es fehlen:
Prompt-Injection über Nutzerfreitext (die Buchidee ist Freitext und geht in *jeden* Prompt!),
Eingangs-Moderation, Ausgangs-Moderation, IP-/Realpersonen-Schutz, Rating als harter
Commit-Gate, Meta-Text-Erkennung, Rate Limits, Missbrauchserkennung.

→ [13-prompting-sicherheit.md](13-prompting-sicherheit.md).

---

## B. Wesentliche Lücken — führen sonst zu Nacharbeit im laufenden Betrieb

| # | Lücke | Warum kritisch | Gelöst in |
|---|---|---|---|
| B1 | **Multi-POV wird nicht behandelt** | Bei personaler Erzählperspektive mit mehreren POV-Figuren muss der Kontext auf das **Wissen der POV-Figur gefiltert** werden. Sonst leakt das Modell Informationen, die die Figur nicht haben kann — der häufigste Plot-Killer in Thrillern. | [08](08-generierung.md) §5 |
| B2 | **Sprach-/Locale-Spezifika fehlen** | Wortzählung, Anführungszeichen („…" vs "…" vs «…»), Du/Sie-Systeme (existiert im Englischen nicht), Gendering, Silbentrennung, Datumsformate. Ein Wortzähler mit `split(" ")` ist bei deutschen Komposita falsch. | [02](02-domaenenmodell.md) §5 |
| B3 | **Bildkonsistenz über Kapitelbilder hinweg** | Das Konzept erzeugt Kapitelbilder, aber ohne Character Sheets / Referenzbilder / Seeds sieht dieselbe Figur in jedem Bild anders aus. | [19](19-export-medien.md) §4 |
| B4 | **Export-/Satzschicht fehlt** | "eBook, PDF und Audiobook werden bereitgestellt" ist ein Satz für ~3 Wochen Arbeit: EPUB3-Struktur, Front-/Backmatter, Kolumnentitel, Kapitelumbrüche, KDP-Vorgaben, Cover-Maße inkl. Rücken. | [19](19-export-medien.md) |
| B5 | **Hörbuch-Pipeline fehlt** | Chunking an Satzgrenzen, SSML, Stimmen pro Figur, Aussprache-Lexikon für Fantasy-Namen, Kapitelmarker, M4B-Assemblierung, Kostenmodell. | [19](19-export-medien.md) §6 |
| B6 | **Nebenläufigkeit und Locking** | Zwei Tabs, ein Retry, ein Cron: ohne Advisory Lock pro Buch entstehen doppelte Kapitel. Idempotenz-Keys allein reichen nicht, wenn zwei Läufe gleichzeitig starten. | [16](16-workflows-jobs.md) §6 |
| B7 | **Truncation und Teilausgaben** | `finishReason` prüfen ist genannt, aber nicht, was dann passiert (Fortsetzungs-Call mit Overlap-Anker statt Neugenerierung). | [08](08-generierung.md) §7 |
| B8 | **Embedding-Lebenszyklus** | Wer re-embeddet nach einer Reparatur? Welches Chunking? Welcher Index (HNSW-Parameter)? Wie verhindert man veraltete Treffer? | [09](09-context-builder.md) §5 |
| B9 | **Kosten- und Preismodell** | Budgets sind genannt, aber ohne Credit-System, Vorab-Reservierung und Abrechnung bei Abbruch ist das Produkt nicht verkaufbar. | [18](18-kosten-budget.md) |
| B10 | **Observability** | "Workflow- und LLM-Tracing" als Tabellenzeile reicht nicht: Trace-Modell, Redaction, Kosten pro Buch, Alerting-Schwellen. | [20](20-qualitaet-tests.md) §5 |
| B11 | **Recht/Compliance** | KI-Kennzeichnungspflichten (EU AI Act Art. 50), KDP-Offenlegung, DSGVO-Auftragsverarbeitung, Provider-Datenspeicherung, Urheberrecht bei Stil-Imitation lebender Autoren. | [13](13-prompting-sicherheit.md) §9 |
| B12 | **Kapitelübergangs-Handshake** | Das Konzept prüft "Ende passt nicht zum nächsten Anfang" erst im Audit. Besser: der letzte Satz des Vorkapitels wird als expliziter Handshake-Input mitgegeben, plus Cliffhanger-Policy pro Kapitel. | [08](08-generierung.md) §6 |
| B13 | **Serien-/Mehrbändigkeit** | Bei "sehr großen Büchern" landet man schnell bei Bänden. Series Bible und bandübergreifender Canon müssen von Anfang an im Datenmodell vorgesehen sein (sonst Migration). | [02](02-domaenenmodell.md) §4 |
| B14 | **Kapitel-1-Kalibrierung ist unterspezifiziert** | Welche Varianten? Wie werden Few-Shot-Absätze *ausgewählt* (nicht: "man nimmt zwei")? Was, wenn der Nutzer später den Stil wechseln will? | [06](06-canon-storybible.md) §6 |
| B15 | **Kein Abbruch-/Wiederaufnahme-Vertrag für den Nutzer** | Was sieht der Nutzer bei Stunden Laufzeit? Was passiert bei Tab-Schließen, Zahlungsabbruch, Modell-Ausfall? | [17](17-api-frontend.md) §4 |

---

## C. Sachliche Korrekturen am Ausgangskonzept

1. **Modellnamen.** Im Ausgangstext stehen "Gemini 3.7 Flash" und "MiMo-V2.5-Pro" als gesetzt.
   Modell-IDs müssen zum Implementierungszeitpunkt gegen die Provider-Dokumentation verifiziert
   werden. Die Architektur wird deshalb über **Capability-Profile** (`DRAFTER`, `PLANNER`,
   `EXTRACTOR`, `VERIFIER`, `AUDITOR`) statt über hartkodierte Namen definiert; die konkrete
   Modell-ID ist Konfiguration und wird pro Buch eingefroren.
   → [01](01-systemarchitektur.md) §6.

2. **Token-Schätzung.** Die Rechnung "100k Wörter ≈ 145–160k Output-Tokens" gilt für Englisch.
   **Deutsch liegt bei ca. 1,8–2,3 Tokens pro Wort** (Komposita, Umlaute) — also eher
   190–230k sichtbare Output-Tokens. Das ändert die Kalkulation um bis zu 45 %.
   → [18](18-kosten-budget.md) §2.

3. **Seed.** "Seed, sofern unterstützt" suggeriert Reproduzierbarkeit. Auch mit Seed und
   Temperature 0 ist Output bei den meisten Providern **nicht bitgenau reproduzierbar**
   (Batching, Hardware, Modell-Patches). Reproduzierbarkeit muss über **Persistenz des Outputs**
   hergestellt werden, nicht über Wiederholbarkeit des Calls. Das ist auch der Grund, warum
   Idempotenz-Keys auf gespeicherte Ergebnisse zeigen müssen.

4. **"Kapitelanfang per Embedding vergleichen"** ist unnötig teuer als Erstfilter.
   Reihenfolge: (1) normalisierter Trigramm-Jaccard/SimHash → (2) nur bei Grenzwerttreffer
   Embedding-Cosinus. → [11](11-validierung-reparatur.md) §3.

5. **Dialoganteil "deterministisch messen"** braucht eine Definition. Vorschlag:
   `Zeichen innerhalb von Anführungszeichen / Gesamtzeichen ohne Whitespace`, sprachabhängige
   Quote-Paare, Gedankenrede ausgenommen. → [11](11-validierung-reparatur.md) §2.9.

6. **"Maximal zwei Reparaturschleifen"** braucht eine Achse: zwei pro *Issue*, pro *Szene*
   oder pro *Kapitel*? Vorschlag: 2 pro Issue, 3 pro Szene, 5 pro Kapitel, dann `NEEDS_REVIEW`.
   → [11](11-validierung-reparatur.md) §6.

7. **Story-Bible als "statisch"** ist zu streng. Neue Nebenfiguren, Orte und Begriffe entstehen
   beim Schreiben zwangsläufig. Sie brauchen einen **Canon-Aufnahmepfad** (`canon_status:
   proposed → accepted`), sonst driftet die Welt an der Bible vorbei. → [06](06-canon-storybible.md) §7.

8. **Content-Rating als reiner Prompt-Hinweis reicht nicht.** Es braucht eine
   Ausgangsprüfung mit Blockade vor dem Commit — insbesondere bei `targetAge < 18`.
   → [13](13-prompting-sicherheit.md) §5.

---

## D. Was das Ausgangskonzept richtig macht (und deshalb übernommen wird)

- Hierarchische Planung vor dem Schreiben (Outline → Act → Chapter Card → Scene Card)
- Ending Contract vor Generierungsbeginn
- Externes, strukturiertes Gedächtnis statt Chat-Historie
- Zeitlich gültige, atomare Fakten statt überschriebener Zustände
- Delta-Extraktion statt State-Neuerzeugung
- Lokale Reparatur vor Neugenerierung
- Midpoint-Audit als Pflicht (Fehlerhäufung im Mittelteil ist empirisch belegt)
- Menschlicher Checkpoint nach Act 1
- Thread-Register mit "zu lange nicht berührt"-Regel
- Phrasen-/Wiederholungsstatistik als Negativliste im nächsten Kontext
- Idempotenz über deterministische Job-Keys
- Einfrieren von Modell- und Promptversion pro Buch

Diese Punkte werden in den Folgedokumenten **nicht neu erfunden**, sondern präzisiert,
mit Datenmodell, Algorithmen und Schwellwerten hinterlegt.
