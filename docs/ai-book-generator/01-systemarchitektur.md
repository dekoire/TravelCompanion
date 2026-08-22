# 01 — Systemarchitektur

## 1. Gesamtbild

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CLIENT                                                                        │
│  Next.js 15 App Router (RSC) · Wizard · Review-UI · Editor (Tiptap) · Reader  │
│  Realtime-Abo auf generation_jobs + chapters (Supabase Realtime, WebSocket)   │
└───────────┬──────────────────────────────────────────────────────────────────┘
            │ HTTPS (Server Actions / Route Handlers)
┌───────────▼──────────────────────────────────────────────────────────────────┐
│ EDGE / API — Vercel                                                           │
│  • Auth-Prüfung (Supabase Auth, JWT)                                          │
│  • Validierung (Zod) · Rate Limit (Upstash) · Quota/Credits                   │
│  • Schreibt Intent in DB, sendet Event an Inngest — RECHNET NIE SELBST        │
│  • /api/inngest  ← Orchestrator-Endpunkt (Inngest ruft hier zurück)           │
└───────────┬───────────────────────────────────┬──────────────────────────────┘
            │ event                              │ SQL (RLS, User-JWT)
┌───────────▼───────────────────────┐  ┌─────────▼──────────────────────────────┐
│ ORCHESTRATOR — Inngest             │  │ SUPABASE                                │
│  book.generate (durable)           │  │  Postgres 15+ (pgvector, pg_trgm,       │
│   ├ step.run(plan.*)               │◄─┤   unaccent, pgcrypto)                   │
│   ├ step.waitForEvent(outline.pick)│  │  Auth · Storage · Realtime              │
│   ├ step.run(chapter.write)        │  │  Service-Role-Zugriff nur vom Worker    │
│   ├ step.run(chapter.extract)      │  └─────────▲──────────────────────────────┘
│   ├ step.run(chapter.validate)     │            │
│   ├ step.run(chapter.commit)  ─────┼────────────┘ (eine Transaktion)
│   └ step.waitForEvent(act.approve) │
└───────────┬────────────────────────┘
            │ HTTP (getrennter Egress, Timeout, Retry, Circuit Breaker)
┌───────────▼──────────────────────────────────────────────────────────────────┐
│ LLM-GATEWAY (packages/llm)                                                    │
│  Capability-Routing · Structured Output · Prompt-Cache · Token-Accounting     │
│  Provider-Adapter: Gemini · OpenAI · Anthropic · TTS · Image                  │
└───────────────────────────────────────────────────────────────────────────────┘
            │
┌───────────▼───────────────┐   ┌──────────────────────────────────────────────┐
│ HEAVY WORKER (optional)    │   │ RENDER-WORKER                                 │
│ Fly.io / Cloud Run         │   │ EPUB · PDF (Paged.js) · DOCX · Cover · M4B    │
│ nur für Steps > 800 s      │   │ Container, da Headless-Chromium + ffmpeg      │
└────────────────────────────┘   └──────────────────────────────────────────────┘
```

## 2. Warum die Generierung nicht in Vercel-Funktionen gehört

### 2.1 Die Laufzeit-Mathematik

| Operation | Output | Realistische Dauer |
|---|---|---|
| Story-Bible (High Thinking) | ~4.000 Tokens | 40–120 s |
| Outline-Variante (High Thinking) | ~6.000 Tokens | 60–180 s |
| Kapitel 3.500 Wörter DE (~7.500 Tokens) | 7.500 Tokens | 90–300 s |
| Kapitel-Extraktion | ~1.500 Tokens | 15–45 s |
| Semantischer Kapitel-Check | ~800 Tokens | 15–60 s |
| Act-Audit über 25.000 Wörter | ~3.000 Tokens | 90–400 s |
| Globaler Volltext-Audit 100k Wörter | ~5.000 Tokens | 200–900 s |
| **Gesamtbuch 100k Wörter, 30 Kapitel** | — | **6–20 h Wall-Clock** |

**Konsequenz:** Ein einzelner Vercel-Request kann *einen* Kapitel-Call gerade so tragen
(mit Fluid Compute, `maxDuration = 800`), aber nur, wenn nichts schiefgeht. Der globale
Audit sprengt das Limit.

### 2.2 Regeln

1. **Jeder `step.run` muss unter 600 s bleiben** (Sicherheitsmarge auf 800 s).
2. Operationen, die das reißen können, werden **zerlegt**:
   - Globaler Audit → pro Act ein Step, dann ein Synthese-Step über die Act-Ergebnisse.
   - Sehr lange Kapitel (> 4.000 Wörter) → Szene-für-Szene-Steps.
3. Für alles, was sich nicht zerlegen lässt (Rendering mit Headless-Chromium, ffmpeg,
   TTS-Assemblierung), gibt es den **Container-Worker**. Inngest triggert ihn über eine
   Queue-Zeile in `generation_jobs` + `step.waitForEvent('worker.done')`.
4. **Streaming ins Storage:** Lange Text-Calls werden gestreamt und alle ~20 s als Partial
   nach `chapter_versions.partial_text` geschrieben. Bricht die Funktion ab, setzt der Retry
   mit Overlap-Anker fort statt neu zu generieren (→ [08](08-generierung.md) §7).

### 2.3 Vercel-Konfiguration

```jsonc
// vercel.json
{
  "functions": {
    "app/api/inngest/route.ts": { "maxDuration": 800, "memory": 2048 },
    "app/api/**/*.ts":          { "maxDuration": 60,  "memory": 1024 }
  },
  "crons": [
    { "path": "/api/cron/reconcile", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/gc",        "schedule": "0 3 * * *"    }
  ]
}
```

- **Fluid Compute aktivieren** (Vercel Projekt-Setting). Ohne Fluid greift 300 s.
- `reconcile`-Cron: findet Jobs, die > 30 min in `RUNNING` hängen (Funktion gestorben, ohne
  dass Inngest es merkte), und re-emittiert das Event. Sicherheitsnetz gegen "Fortschritt
  bleibt hängen" (Problem 64 des Ausgangskonzepts).

## 3. Warum Inngest (und wann Trigger.dev)

| Kriterium | Inngest | Trigger.dev v3 |
|---|---|---|
| Deployment | Route Handler auf Vercel, kein eigener Host | Eigene Compute (längere Läufe möglich) |
| Durable Steps | `step.run` memoisiert Ergebnisse | `task` mit Checkpoints |
| Human-in-the-Loop | `step.waitForEvent` (Tage/Wochen) | `wait.forToken` |
| Concurrency-Keys | Ja (`concurrency: { key: bookId, limit: 1 }`) | Ja |
| Step-Laufzeit | Begrenzt durch Vercel-Limit | Bis 6 h+ auf eigener Compute |

**Empfehlung:** Inngest für MVP. Der Concurrency-Key `event.data.bookId` mit `limit: 1` löst
Problem B6 (Nebenläufigkeit) auf Orchestrator-Ebene fast vollständig. Wenn später viele
XL-Bücher (> 150k Wörter) kommen, wandert der Drafting-Step auf Trigger.dev oder den
Container-Worker — die Domänenlogik in `packages/domain` bleibt unverändert, weil sie I/O-frei ist.

## 4. Supabase-Nutzung

| Feature | Einsatz | Anmerkung |
|---|---|---|
| Postgres | Single Source of Truth | Alle Canon-Daten relational; JSONB nur für offene Strukturen |
| `pgvector` | Semantisches Retrieval von Originalpassagen | **Nie** als Faktenquelle. HNSW-Index. |
| `pg_trgm` | Namensvarianten, Glossar-Fuzzy-Match, Ähnlichkeit Kapitelanfänge | Erstfilter vor Embeddings |
| `unaccent` | Normalisierung für Namensvergleiche | |
| `pgcrypto` | `gen_random_uuid()`, Hashing von Idempotenz-Keys | |
| Auth | E-Mail/OAuth, JWT | `auth.uid()` in allen RLS-Policies |
| Storage | Cover, Kapitelbilder, EPUB/PDF/M4B, Audio-Segmente | Private Buckets + Signed URLs (TTL 15 min) |
| Realtime | Fortschrittsanzeige | Abo auf `generation_jobs` und `chapters` (nur Status-Spalten publizieren) |
| Edge Functions | Nur Kleinkram (Signed-URL-Ausgabe, Webhook-Verifikation) | Kein Generierungscode |

### 4.1 Schlüssel-Hygiene

- `SUPABASE_ANON_KEY`: Client, immer mit RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: **ausschließlich** in Inngest-Funktionen und im Worker.
  Nie in Client-Bundles, nie in Edge-Middleware, nie in `NEXT_PUBLIC_*`.
- Zugriff aus Server Actions auf Nutzerdaten: mit dem **User-JWT** (RLS aktiv), nicht mit
  Service Role. Service Role nur, wo systemseitig über Nutzergrenzen hinweg geschrieben wird.

### 4.2 Connection Pooling

Serverless + Postgres = Connection-Explosion. Verbindlich:
- Zugriff über **Supavisor Transaction Mode** (Port 6543) für alle Serverless-Pfade.
- Session-Mode (5432) nur im Container-Worker und für Migrationen.
- Prepared Statements im Transaction Mode deaktivieren (`prepare: false` bei postgres.js).

## 5. Umgebungen

| Umgebung | Supabase | LLM | Zweck |
|---|---|---|---|
| `local` | Supabase CLI (Docker) | **Mock-Provider** (deterministische Fixtures) | Entwicklung, schnelle Tests |
| `preview` | Branch-DB (Supabase Branching) pro PR | Echt, aber Budget-Cap 1 Buch/Tag | Review-Deploys |
| `staging` | eigenes Projekt | Echt | Evals, Testbücher |
| `production` | eigenes Projekt, EU-Region | Echt | |

Der **Mock-Provider** ist nicht optional: ohne ihn ist keine Testsuite bezahlbar. Er liefert
zu jedem `(promptHash, capability)` eine hinterlegte Fixture und erlaubt Fehlerinjektion
(Truncation, ungültiges JSON, Rate Limit, Refusal).

## 6. LLM-Gateway

### 6.1 Capability-Profile statt Modellnamen

```ts
export type Capability =
  | 'PLANNER'    // Story-Bible, Arc, Outline, Ending Spec — hohes Reasoning, teuer, selten
  | 'DRAFTER'    // Kapitel-/Szenentext — langer Output, Stiltreue, mittleres Reasoning
  | 'EXTRACTOR'  // Delta-Extraktion, Summaries — Structured Output, günstig, hoher Durchsatz
  | 'VERIFIER'   // Ja/Nein + Zitat — sehr günstig, sehr kurz
  | 'AUDITOR'    // Act-/Globalaudit — hohes Reasoning, langer Input
  | 'CRITIC'     // Semantische Kapitelprüfung — mittel
  | 'IMAGE'      // Cover, Kapitelbilder
  | 'TTS';       // Hörbuch

export interface ModelBinding {
  capability: Capability;
  provider: 'google' | 'openai' | 'anthropic' | 'mock';
  modelId: string;          // exakte ID, zur Implementierungszeit verifiziert
  temperature: number;
  topP?: number;
  maxOutputTokens: number;
  thinkingBudget?: number;
  fallback?: Omit<ModelBinding, 'fallback'>;
}
```

Die aktive Bindung liegt in der Tabelle `model_profiles`. **Beim Start eines Buches wird das
komplette Profil in `books.model_profile_snapshot` (JSONB) eingefroren.** Ein Modell-Update
darf ein laufendes Buch nie verändern (Problem 64: "Modellupdate verändert Stimme").

> **Hinweis zu Modell-IDs:** Konkrete IDs (z. B. Gemini-, GPT-, Claude-Varianten) sind bewusst
> nicht in dieser Doku fixiert. Sie gehören in `model_profiles` und müssen zum
> Implementierungszeitpunkt gegen die Provider-Doku geprüft werden — inklusive Verfügbarkeit
> von Structured Output, Context-Caching, Thinking-Budget und maximalem Output.

### 6.2 Anforderungen an den Adapter

Jeder Provider-Adapter muss liefern:

```ts
interface LlmResult<T> {
  data: T;                       // bei structured: validiert; sonst string
  raw: string;
  finishReason: 'stop' | 'length' | 'safety' | 'recitation' | 'other';
  usage: { inputTokens: number; outputTokens: number; thinkingTokens?: number;
           cachedInputTokens?: number };
  modelId: string;               // tatsächlich bedienendes Modell
  latencyMs: number;
  requestId?: string;
}
```

`finishReason` ist **Pflichtfeld** — ohne das ist Truncation nicht erkennbar.

### 6.3 Aufrufkette (jeder Call)

```
callLlm(spec)
 1. Budget-Check           → Buch-Budget & Job-Budget noch offen? Sonst BudgetExceededError
 2. Idempotenz-Lookup      → llm_calls WHERE idempotency_key = ? AND status='ok' → Cache-Hit
 3. Prompt-Assemblierung   → System | Developer | Canon | UserData | Task  (13-prompting)
 4. Input-Guard            → Neutralisierung, Längen-Caps, PII-Strip
 5. Provider-Call          → mit Timeout (capability-abhängig), Streaming falls Text
 6. Truncation-Check       → finishReason === 'length' → Continuation oder Fehler
 7. Parse + Validate       → Zod; bei Fehler 1× Repair-Call mit Fehlermeldung, dann hart
 8. Output-Guard           → Moderation, Meta-Text-Strip, Rating-Prefilter
 9. Persist                → llm_calls (+ token_usage), Volltext in Storage falls > 64 KB
10. Return
```

**Retry-Politik:** exponentiell 1 s/2 s/4 s/8 s, max 4 Versuche, nur bei
`429 / 500 / 502 / 503 / 504 / Timeout`. **Niemals** bei `400`, Schema-Fehler oder `safety`.
Circuit Breaker pro Provider: 5 Fehler in 60 s → 120 s offen → Fallback-Binding.

### 6.4 Idempotenz-Key eines LLM-Calls

```
sha256(
  bookId · operation · targetId(chapterId|sceneId|actId|'book')
  · promptVersion · modelId · temperature
  · contextHash            // Hash des final assemblierten Prompt-Bodys
  · repairAttempt          // 0 bei Erstgenerierung
)
```

Damit gilt: gleicher Zustand + gleicher Prompt + gleiches Modell = **gespeichertes Ergebnis
wiederverwenden**. Kein Doppelkapitel durch Retry, keine Doppelabbuchung, sicherer Reload.
(Wichtig: Reproduzierbarkeit entsteht durch *Persistenz*, nicht durch Seeds — siehe
[00-gap-analyse.md](00-gap-analyse.md) C3.)

## 7. Datenfluss eines Kapitels (Kurzform)

```
1. ORCHESTRATOR   holt ChapterCard + SceneCards
2. CONTEXT        baut Kontext, protokolliert READ-SET (Fakt-IDs, Passage-IDs)
3. DRAFTER        schreibt Kapiteltext (Streaming → partial_text)
4. SPLIT          Szenen-Segmentierung anhand der Marker, Marker werden entfernt
5. EXTRACTOR      liefert Deltas je Szene, jeweils mit wörtlichem Beleg-Zitat
6. GROUNDING      deterministisch: Zitat muss Substring des Textes sein → sonst Delta verworfen
7. VALIDATOR-D    deterministische Checks (Wortzahl, Dialog, Zustand, Zeit, Rating, Phrasen)
8. VALIDATOR-S    semantischer Check (nur wenn D bestanden oder nur Warnungen)
9. REPAIR         Ladder: Satz → Absatz → Szene → Kapitel (max. Budget)
10. COMMIT        EINE Transaktion: chapter_version + events + facts + states + summary
                  + write-set + phrase stats + Job-Status
11. ASYNC         Embeddings, Kapitelbild-Job, Fortschritts-Event
```

Nur Schritt 10 verändert den Canon. Alles davor ist ein Vorschlag.

## 8. Nicht-funktionale Anforderungen

| Aspekt | Ziel |
|---|---|
| Verfügbarkeit UI | 99,9 % |
| Wiederaufnahme nach Prozess-Tod | ≤ 1 verlorener Step, ≤ 60 s Verzögerung |
| Datenverlust | 0 — jeder committete Kapiteltext ist unveränderlich versioniert |
| Latenz UI-Aktionen | p95 < 400 ms (keine LLM-Calls im Request-Pfad) |
| Fortschritts-Update | ≤ 5 s nach Statuswechsel (Realtime) |
| Kosten-Overrun | Hard Stop bei 130 % des Buchbudgets |
| Region | EU (Supabase EU, LLM-Endpunkte EU wo verfügbar) |
