# AI Book Generator — Vollständige technische Architektur

Stand: 2026-08 · Sprache der Doku: Deutsch · Sprache im Code/Datenmodell: Englisch

Diese Dokumentation beschreibt ein System, das aus einer Nutzereingabe (Idee oder Thema)
vollständige Bücher erzeugt — von der Kurzgeschichte (3.000 Wörter) bis zum Epos
(250.000+ Wörter), belletristisch **und** als Sachbuch, mit Cover, Metadaten, Export
(EPUB/PDF/DOCX) und optionalem Hörbuch.

## Leitsatz

> **Das LLM schreibt Text. Postgres besitzt die Wahrheit. Deterministischer Code entscheidet,
> was Wahrheit werden darf.**

Der wichtigste Zusatz gegenüber dem Ausgangskonzept steht im dritten Satzteil: Ein LLM
extrahiert zwar Fakten aus dem Text, aber **kein LLM-Output wird ungeprüft Canon**. Jeder
Fakt muss durch ein wörtliches Zitat mit Zeichen-Offset im committeten Text belegt sein
(→ [10-extraktion.md](10-extraktion.md)). Erst dadurch werden die "deterministischen Checks"
tatsächlich deterministisch, statt nur eine zweite LLM-Meinung zu prüfen.

## Kernentscheidungen (Executive Summary)

| # | Entscheidung | Begründung | Detail |
|---|---|---|---|
| 1 | **Next.js auf Vercel** nur für UI/API, **niemals** für Generierung | Vercel-Funktionen haben harte Laufzeitlimits (60 s Hobby / bis 800 s Fluid Pro). Ein Kapitel kann 2–8 min brauchen, ein Buch 4–40 h. | [01](01-systemarchitektur.md#2-warum-die-generierung-nicht-in-vercel-funktionen-gehört) |
| 2 | **Durable Workflow Engine (Inngest)** als Orchestrator | Memoisierte Steps, Retry, Concurrency-Limits, `waitForEvent` für Human-in-the-Loop, Cancel. Läuft als Route Handler auf Vercel. | [16](16-workflows-jobs.md) |
| 3 | **Supabase Postgres als Single Source of Truth**, JSONB nur für Randbereiche | Relationale Constraints erzwingen Konsistenz; JSONB wo Schema variabel ist. Kein separates NoSQL, kein Vektor-Store als Wahrheit. | [14](14-datenmodell.md) |
| 4 | **Event Sourcing + bitemporale Fakten** | Story-Zeit (`valid_from_scene`) *und* System-Zeit (`recorded_in_run`, `superseded_by`). Ermöglicht Rollback nach Nutzeränderungen. | [07](07-state-memory.md#4-bitemporalität) |
| 5 | **Read-Set/Write-Set-Tracking pro Szene** | Der Context Builder protokolliert, welche Fakt-IDs er injiziert hat. Bei einer Änderung in Kapitel 8 ist damit *exakt* berechenbar, welche späteren Kapitel betroffen sind — statt "alles danach neu". | [11](11-validierung-reparatur.md#7-invalidations-kaskade) |
| 6 | **Hybrid-Generierung**: Kapitel in einem Call, aber szenengeplant und szenenweise extrahiert | Bester Fluss bei maximaler Kontrolle. Szene-für-Szene nur bei definierten Triggern. | [08](08-generierung.md) |
| 7 | **Zwei getrennte Tracks**: Fiction und Non-Fiction | Ein Sachbuch braucht Thesenbaum, Quellen-Ledger und Definitions-Reihenfolge statt Story-Bible und Timeline. Im Ausgangskonzept fehlte das vollständig. | [05](05-planung-nonfiction.md) |
| 8 | **Größenprofile S/M/L/XL steuern die Pipeline**, nicht nur die Wortzahl | Eine Kurzgeschichte darf nicht 14 Audit-Stufen durchlaufen; ein 200k-Epos braucht Part-Ebene und Memory-Kompaktierung. | [02](02-domaenenmodell.md#3-größenklassen) |
| 9 | **Nutzerfreitext ist immer Daten, nie Instruktion** | Strikte Prompt-Schichtung, Delimiter, Neutralisierung, Pre-Moderation, Rating als Hard Gate. | [13](13-prompting-sicherheit.md) |
| 10 | **Provider-agnostischer LLM-Gateway** mit Capability-Profilen statt hartkodierter Modell-IDs | Modelle wechseln schneller als Architektur. Pro Buch wird die exakte Modell-ID eingefroren. | [01](01-systemarchitektur.md#6-llm-gateway) |

## Lesereihenfolge

**Für die Bewertung des Konzepts:**
1. [00-gap-analyse.md](00-gap-analyse.md) — was im Ausgangskonzept fehlt und warum es kritisch ist

**Für die Umsetzung, in dieser Reihenfolge:**

| Datei | Inhalt |
|---|---|
| [01-systemarchitektur.md](01-systemarchitektur.md) | Stack, Vercel/Supabase/Inngest, Deployment, Umgebungen, Laufzeit-Mathematik |
| [02-domaenenmodell.md](02-domaenenmodell.md) | Buchtypen, Größenklassen, Pipeline-Profile, Begriffslexikon |
| [03-bookspec.md](03-bookspec.md) | Nutzereingabe → BookSpec, vollständige Validierung, Content-Rating |
| [04-planung-fiction.md](04-planung-fiction.md) | Narrative Architektur, Acts, Ending Contract, Threads, Outline-Varianten |
| [05-planung-nonfiction.md](05-planung-nonfiction.md) | Sachbuch-Track: Thesenbaum, Lernziele, Quellen, Redundanzmatrix |
| [06-canon-storybible.md](06-canon-storybible.md) | Story-Bible, Figurenstimmen, Glossar, Style Profile, Stilkalibrierung |
| [07-state-memory.md](07-state-memory.md) | Fakten, Events, Wissen, Beziehungen, Zeit, Reisematrix, State-Fold |
| [08-generierung.md](08-generierung.md) | Generierungsalgorithmus, Kapitel-/Szenenloop, POV, Übergänge |
| [09-context-builder.md](09-context-builder.md) | Kontext-Assembly, Retrieval-Kaskade, Budgetierung, Prompt-Caching |
| [10-extraktion.md](10-extraktion.md) | Delta-Extraktion, Quote-Grounding, Zweitverifikation |
| [11-validierung-reparatur.md](11-validierung-reparatur.md) | Alle Checks, Repair-Ladder, Invalidations-Kaskade, Audits |
| [12-ai-vs-deterministisch.md](12-ai-vs-deterministisch.md) | Vollständige Entscheidungsmatrix: wann LLM, wann Code |
| [13-prompting-sicherheit.md](13-prompting-sicherheit.md) | Prompt-Architektur, Injection, Moderation, Recht/Compliance |
| [14-datenmodell.md](14-datenmodell.md) + [schema.sql](schema.sql) | Vollständiges Datenmodell inkl. RLS, Indizes, Constraints |
| [15-json-schemas.md](15-json-schemas.md) + [schemas/](schemas/) | Alle JSON-Verträge als Zod-Definitionen |
| [16-workflows-jobs.md](16-workflows-jobs.md) | State Machine, Inngest-Steps, Idempotenz, Fehlerbehandlung |
| [17-api-frontend.md](17-api-frontend.md) | API-Verträge, Realtime, UI-Flows, Editor, Review-Screens |
| [18-kosten-budget.md](18-kosten-budget.md) | Token-Modell, Budgets, Abbruchgrenzen, Preiskalkulation |
| [19-export-medien.md](19-export-medien.md) | EPUB/PDF/DOCX, Cover, Kapitelbilder, Hörbuch |
| [20-qualitaet-tests.md](20-qualitaet-tests.md) | Evals, Testbücher, KPIs, Monitoring, Regression |
| [21-roadmap.md](21-roadmap.md) | Umsetzungsreihenfolge, Meilensteine, Risiken, Aufwand |

## Ordnerstruktur des Zielprojekts

```
apps/
  web/                      Next.js 15 (App Router) — UI + API, Deployment: Vercel
    app/(marketing)         Landing
    app/(app)               Authentifizierter Bereich
    app/api/inngest/route   Inngest-Endpunkt (Orchestrator läuft hier)
    app/api/webhooks/*      Stripe, Provider-Callbacks
  worker/                   Optionaler Container-Worker (Fly.io/Cloud Run) für Läufe > 800 s
packages/
  domain/                   Reine Logik ohne I/O: Validierung, Budgets, Checks, Fold
  schemas/                  Zod-Schemas + generierte JSON-Schemas für Structured Output
  llm/                      Provider-Gateway, Caching, Retry, Token-Accounting
  prompts/                  Versionierte Prompt-Templates + Registry
  db/                       Supabase-Client, Migrations, typisierte Queries
  render/                   EPUB/PDF/DOCX/Cover-Rendering
  eval/                     Test-Bücher, Golden Files, LLM-as-Judge-Harness
supabase/
  migrations/               SQL-Migrationen (siehe schema.sql)
  functions/                Edge Functions (nur für latenzkritische Kleinigkeiten)
```

## Was dieses Konzept bewusst NICHT tut

- **Keine narrative Parallelisierung.** Kapitel *n+1* hängt vom Zustand nach Kapitel *n* ab.
  Parallelisiert werden nur zustandsfreie Arbeiten (Bilder, Metadaten, Rendering, Embeddings).
- **Kein Chat-Verlauf als Gedächtnis.** Provider-seitige Konversations-IDs oder Context-Caches
  sind Performance-Optimierung, niemals Speicher.
- **Keine Vektorsuche als Faktenquelle.** pgvector findet ähnliche *Stellen*; ob Tomas den
  Schlüssel besitzt, beantwortet ausschließlich `entity_facts`.
- **Keine unbegrenzte Reparatur.** Jedes Kapitel hat ein hartes Reparatur- und Kostenbudget.
  Danach: `NEEDS_REVIEW` und Nutzerentscheidung.
