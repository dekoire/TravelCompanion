-- =====================================================================================
-- AI Book Generator — Datenmodell (PostgreSQL / Supabase)
-- Referenz-DDL. In der Umsetzung als nummerierte Migrationen unter supabase/migrations/.
-- Konventionen:
--   * snake_case, Tabellen im Plural
--   * PK: uuid DEFAULT gen_random_uuid()
--   * Zeitstempel: timestamptz, immer UTC
--   * Textinhalte > 64 KB liegen in Storage, hier nur der Pfad
--   * append-only Tabellen haben KEINE UPDATE-Policy
-- =====================================================================================

create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- =====================================================================================
-- 1. IDENTITÄT, ABRECHNUNG
-- =====================================================================================

create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  locale            text not null default 'de-DE',
  age_verified      boolean not null default false,
  plan              text not null default 'free',      -- free | starter | pro
  status            text not null default 'active',    -- active | suspended | deleted
  created_at        timestamptz not null default now()
);

create table credit_ledger (
  id                bigserial primary key,
  user_id           uuid not null references profiles(id) on delete cascade,
  delta_credits     numeric(12,4) not null,            -- + Kauf, - Verbrauch
  reason            text not null,                     -- purchase | reservation | settle | refund | grant
  book_id           uuid,
  job_id            uuid,
  external_ref      text,                              -- Stripe-ID
  created_at        timestamptz not null default now()
);
create index on credit_ledger (user_id, created_at desc);

create table model_profiles (
  id                text primary key,                  -- 'mp_2026_08_a'
  bindings          jsonb not null,                    -- Capability -> ModelBinding
  data_policy       jsonb not null,                    -- Region, Retention, Training
  price_table       jsonb not null,                    -- Preis pro 1M Tokens je Modell
  status            text not null default 'active',    -- active | canary | deprecated
  created_at        timestamptz not null default now()
);

create table prompt_versions (
  id                text primary key,                  -- 'chapter_draft@1.4.2'
  prompt_id         text not null,
  version           text not null,
  capability        text not null,
  template          text not null,
  required_vars     text[] not null default '{}',
  output_format     text not null,
  schema_id         text,
  hash              text not null,
  changelog         text,
  eval_score        jsonb,
  status            text not null default 'draft',     -- draft | canary | active | deprecated
  created_at        timestamptz not null default now(),
  unique (prompt_id, version)
);

-- =====================================================================================
-- 2. BUCH, VERSION, SPEC
-- =====================================================================================

create table series (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  title             text not null,
  series_bible      jsonb,
  created_at        timestamptz not null default now()
);

create table books (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  series_id         uuid references series(id) on delete set null,
  series_index      int,
  title             text not null,
  track             text not null,                     -- fiction | non_fiction
  book_type         text not null,
  size_class        text not null,                     -- XS | S | M | L | XL
  language          text not null,
  status            text not null default 'draft_spec',
  status_reason     text,
  current_version_id uuid,
  model_profile_snapshot jsonb not null,
  prompt_registry_version text not null,
  cover_asset_id    uuid,
  word_count_actual int not null default 0,
  progress_pct      numeric(5,2) not null default 0,
  cost_cents        numeric(12,4) not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz,
  deleted_at        timestamptz
);
create index on books (user_id, created_at desc);
create index on books (status) where deleted_at is null;

create table book_versions (
  id                uuid primary key default gen_random_uuid(),
  book_id           uuid not null references books(id) on delete cascade,
  version_no        int not null,
  reason            text not null,                     -- initial | replan | style_change
  is_current        boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (book_id, version_no)
);
create unique index on book_versions (book_id) where is_current;

alter table books add constraint books_current_version_fk
  foreign key (current_version_id) references book_versions(id) deferrable initially deferred;

create table book_specs (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null unique references book_versions(id) on delete cascade,
  spec              jsonb not null,                    -- vollständige BookSpec (siehe 03)
  spec_hash         text not null,
  validation        jsonb not null default '{}',       -- Warnungen, die der Nutzer akzeptiert hat
  frozen_at         timestamptz not null default now()
);

-- =====================================================================================
-- 3. CANON: BIBLE, STIL, ENTITÄTEN
-- =====================================================================================

create table story_bibles (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null unique references book_versions(id) on delete cascade,
  world             jsonb not null default '{}',
  rules             jsonb not null default '[]',
  premise           jsonb not null default '{}',
  ending_contract   jsonb not null default '{}',
  static_hash       text not null,                     -- steuert Prompt-Caching
  updated_at        timestamptz not null default now()
);

create table style_profiles (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  version_no        int not null default 1,
  profile           jsonb not null,
  calibration_chapter_version_id uuid,
  calibration_sample_ids uuid[] not null default '{}',
  is_current        boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (book_version_id, version_no)
);

-- Generische Entität: Figur, Ort, Objekt, Organisation, Konzept
create table entities (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  slug              text not null,                     -- 'june', 'archive_key'
  kind              text not null,                     -- character | location | object | faction | concept
  name              text not null,
  canon_status      text not null default 'accepted',  -- proposed | accepted | rejected | merged
  merged_into       uuid references entities(id),
  significance      int not null default 3,            -- 1..5
  first_chapter_no  int,
  last_chapter_no   int,
  data              jsonb not null default '{}',       -- kindspezifisches Profil (06)
  created_at        timestamptz not null default now(),
  unique (book_version_id, slug)
);
create index on entities (book_version_id, kind);
create index on entities using gin (name gin_trgm_ops);

create table character_voices (
  entity_id         uuid primary key references entities(id) on delete cascade,
  profile           jsonb not null,
  sample_lines      text[] not null default '{}',
  updated_at        timestamptz not null default now()
);

create table glossary_entries (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  entity_id         uuid references entities(id) on delete cascade,
  term              text not null,
  type              text not null,
  canonical_spelling text not null,
  allowed_variants  text[] not null default '{}',
  forbidden_variants text[] not null default '{}',
  pronunciation     text,
  definition        text,
  defined_in_chapter int,                              -- Non-Fiction: Reihenfolge-Check
  forbidden_before  int,
  first_chapter_no  int,
  unique (book_version_id, term)
);
create index on glossary_entries using gin (term gin_trgm_ops);

create table travel_times (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  from_entity       uuid not null references entities(id) on delete cascade,
  to_entity         uuid not null references entities(id) on delete cascade,
  distance_km       numeric(8,2),
  modes             jsonb not null,                    -- {foot:{minMinutes,normalMinutes}, ...}
  blocked_when      text[] not null default '{}',
  unique (book_version_id, from_entity, to_entity)
);

-- =====================================================================================
-- 4. STRUKTUR: PARTS, ACTS, CHAPTERS, SCENES
-- =====================================================================================

create table parts (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  idx               int not null,
  title             text,
  word_budget       int not null,
  unique (book_version_id, idx)
);

create table acts (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  part_id           uuid references parts(id) on delete cascade,
  idx               int not null,
  title             text,
  plan              jsonb not null,                    -- Act-Objekt (04 §4)
  word_budget       int not null,
  chapter_from      int not null,
  chapter_to        int not null,
  status            text not null default 'planned',   -- planned | writing | done | audited
  unique (book_version_id, idx)
);

create table chapters (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  act_id            uuid references acts(id) on delete set null,
  chapter_no        int not null,
  title             text,
  pov_entity_id     uuid references entities(id),
  status            text not null default 'planned',
    -- planned | carded | writing | drafted | validating | repairing
    -- | committed | needs_review | stale
  current_version_id uuid,
  target_words      int not null,
  actual_words      int not null default 0,
  tension_target    int,
  tension_measured  int,
  dialogue_ratio    numeric(4,3),
  repair_count      int not null default 0,
  cost_cents        numeric(12,4) not null default 0,
  committed_at      timestamptz,
  unique (book_version_id, chapter_no)
);
create index on chapters (book_version_id, status);

create table chapter_cards (
  id                uuid primary key default gen_random_uuid(),
  chapter_id        uuid not null references chapters(id) on delete cascade,
  version_no        int not null default 1,
  card              jsonb not null,                    -- vollständige Chapter Card (04 §8)
  is_current        boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (chapter_id, version_no)
);

create table chapter_versions (
  id                uuid primary key default gen_random_uuid(),
  chapter_id        uuid not null references chapters(id) on delete cascade,
  version_no        int not null,
  source            text not null,                     -- generated | repaired | user_edit | restyled
  text              text,                              -- < 64 KB inline
  storage_path      text,                              -- sonst Storage
  partial_text      text,                              -- Streaming-Zwischenstand
  word_count        int not null default 0,
  finish_reason     text,
  parent_version_id uuid references chapter_versions(id),
  generation_run_id uuid,
  is_current        boolean not null default false,
  created_at        timestamptz not null default now(),
  unique (chapter_id, version_no)
);
create unique index on chapter_versions (chapter_id) where is_current;

create table scenes (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  chapter_id        uuid not null references chapters(id) on delete cascade,
  idx               int not null,                      -- innerhalb des Kapitels
  scene_index       int not null,                      -- global, monoton, ZEITACHSE
  slug              text not null,                     -- 'sc_14_2'
  story_time_start  timestamptz,
  story_time_end    timestamptz,
  duration_minutes  int,
  is_flashback      boolean not null default false,
  parallel_group    text,
  location_entity_id uuid references entities(id),
  unique (book_version_id, scene_index),
  unique (chapter_id, idx)
);

create table scene_cards (
  id                uuid primary key default gen_random_uuid(),
  scene_id          uuid not null references scenes(id) on delete cascade,
  version_no        int not null default 1,
  card              jsonb not null,                    -- Scene Card (04 §9)
  is_current        boolean not null default true,
  unique (scene_id, version_no)
);

-- =====================================================================================
-- 5. CANON-LEDGER (append-only)
-- =====================================================================================

create table canon_generations (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  reason            text not null,                     -- initial | rebuild_after_audit | user_edit
  is_current        boolean not null default true,
  created_at        timestamptz not null default now()
);

create table events (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  canon_generation_id uuid not null references canon_generations(id) on delete cascade,
  scene_index       int not null,
  chapter_no        int not null,
  type              text not null,
  summary           text not null,
  story_time        timestamptz,
  duration_minutes  int,
  participants      jsonb not null default '[]',       -- [{entityId, role}]
  witnesses         uuid[] not null default '{}',
  objects           uuid[] not null default '{}',
  location_entity_id uuid references entities(id),
  visibility        text not null default 'public',
  importance        int not null default 3,
  thread_ids        uuid[] not null default '{}',
  caused_by         uuid[] not null default '{}',
  evidence_quote    text not null,
  evidence_start    int not null,
  evidence_end      int not null,
  source_chapter_version_id uuid references chapter_versions(id),
  superseded_by     uuid references events(id),
  created_at        timestamptz not null default now()
);
create index on events (book_version_id, scene_index) where superseded_by is null;
create index on events using gin (objects);
create index on events using gin (thread_ids);

create table entity_facts (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  canon_generation_id uuid not null references canon_generations(id) on delete cascade,
  subject_entity_id uuid not null references entities(id) on delete cascade,
  predicate         text not null,
  value_text        text,
  value_entity_id   uuid references entities(id),
  value_number      numeric,
  value_json        jsonb,
  value_key         text,                              -- Diskriminator bei Mehrfachwerten (z.B. ability)
  value_type        text not null,
  valid_from_scene  int not null,
  valid_until_scene int,                               -- null = offen
  source_scene_index int not null,
  source_chapter_version_id uuid references chapter_versions(id),
  caused_by_event_id uuid references events(id),
  evidence_quote    text,
  evidence_start    int,
  evidence_end      int,
  confidence        numeric(4,3) not null default 1.0,
  canon_status      text not null default 'accepted',  -- accepted | rejected | pending_verification
  superseded_by     uuid references entity_facts(id),
  created_at        timestamptz not null default now()
);
create index on entity_facts (book_version_id, subject_entity_id, predicate, valid_from_scene desc)
  where superseded_by is null and canon_status = 'accepted';
create index on entity_facts (book_version_id, valid_until_scene)
  where valid_until_scene is null;

create table knowledge_states (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  canon_generation_id uuid not null references canon_generations(id) on delete cascade,
  fact_ref          text not null,                     -- 'letter_author_identity'
  description       text,
  truth             text,
  entity_id         uuid not null references entities(id) on delete cascade,
  level             text not null,                     -- unaware|suspects|believes_false|misled|knows|confirmed
  believes          text,
  source            text,                              -- witnessed|told|inferred|deceived
  misled_by         uuid references entities(id),
  since_scene       int not null,
  until_scene       int,
  evidence_quote    text,
  superseded_by     uuid references knowledge_states(id),
  created_at        timestamptz not null default now()
);
create index on knowledge_states (book_version_id, fact_ref, entity_id, since_scene desc)
  where superseded_by is null;

create table knowledge_plans (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  fact_ref          text not null,
  reveal_to_reader_chapter int,
  reveal_map        jsonb not null default '{}',       -- {entitySlug: chapterNo}
  forbidden_before  jsonb not null default '{}',
  unique (book_version_id, fact_ref)
);

create table relationships (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  canon_generation_id uuid not null references canon_generations(id) on delete cascade,
  entity_a          uuid not null references entities(id) on delete cascade,
  entity_b          uuid not null references entities(id) on delete cascade,
  dimensions        jsonb not null,                    -- trust, closeness, conflict, power, ...
  address_mode      jsonb not null default '{}',       -- {aToB, bToA}
  address_names     jsonb not null default '{}',
  since_scene       int not null,
  until_scene       int,
  caused_by_event_id uuid references events(id),
  evidence_quote    text,
  superseded_by     uuid references relationships(id),
  created_at        timestamptz not null default now(),
  check (entity_a < entity_b)                          -- kanonische Paarordnung
);
create index on relationships (book_version_id, entity_a, entity_b, since_scene desc)
  where superseded_by is null;

create table state_snapshots (
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  canon_generation_id uuid not null references canon_generations(id) on delete cascade,
  scene_index       int not null,
  state             jsonb not null,
  computed_at       timestamptz not null default now(),
  primary key (book_version_id, canon_generation_id, scene_index)
);

-- =====================================================================================
-- 6. PLOT: THREADS, CLUES, FRAGEN
-- =====================================================================================

create table plot_threads (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  slug              text not null,
  type              text not null,
  title             text not null,
  premise           text,
  owner_entity_id   uuid references entities(id),
  introduce_chapter int,
  planned_beats     jsonb not null default '[]',
  planned_payoff_chapter int,
  mandatory         boolean not null default false,
  max_silence_chapters int not null default 5,
  status            text not null default 'planned',
  last_touched_chapter int,
  setup_complete    boolean not null default false,
  unique (book_version_id, slug)
);

create table thread_obligations (
  id                uuid primary key default gen_random_uuid(),
  thread_id         uuid not null references plot_threads(id) on delete cascade,
  chapter_id        uuid not null references chapters(id) on delete cascade,
  kind              text not null,                     -- beat | touch | setup_urgent
  priority          int not null,
  what              text not null,
  fulfilled         boolean not null default false,
  unique (thread_id, chapter_id, kind)
);

create table clues (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  thread_id         uuid references plot_threads(id) on delete set null,
  slug              text not null,
  truth             text not null,
  planted_chapter   int,
  visibility        text not null,
  perceived_by      uuid[] not null default '{}',
  misreading_offered text,
  payoff_chapter    int,
  fair_play         boolean not null default true,
  status            text not null default 'planned',
  unique (book_version_id, slug)
);

create table reader_questions (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  question          text not null,
  raised_chapter    int not null,
  salience          text not null default 'medium',
  type              text,
  planned_answer_chapter int,
  answered_chapter  int
);

-- =====================================================================================
-- 7. NON-FICTION
-- =====================================================================================

create table learning_objectives (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  slug              text not null,
  statement         text not null,
  addressed_in      int[] not null default '{}',
  practiced_in      int[] not null default '{}',
  unique (book_version_id, slug)
);

create table sources (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  kind              text not null,                     -- upload | url | user_note
  title             text,
  author            text,
  published_at      date,
  url               text,
  storage_path      text,
  checksum          text,
  created_at        timestamptz not null default now()
);

create table source_chunks (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid not null references sources(id) on delete cascade,
  ordinal           int not null,
  text              text not null,
  page              int,
  embedding         vector(1536),
  unique (source_id, ordinal)
);
create index on source_chunks using hnsw (embedding vector_cosine_ops);

create table knowledge_claims (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  chapter_no        int not null,
  text              text not null,
  claim_type        text not null,
  contains_numbers  boolean not null default false,
  contains_quote    boolean not null default false,
  verification_status text not null default 'unverified',
  source_ids        uuid[] not null default '{}',
  confidence        numeric(4,3),
  render_policy     text not null default 'as_is',
  evidence_quote    text,
  created_at        timestamptz not null default now()
);
create index on knowledge_claims (book_version_id, chapter_no);

create table term_definitions (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  term              text not null,
  aliases           text[] not null default '{}',
  definition        text not null,
  defined_in_chapter int not null,
  forbidden_before  int,
  unique (book_version_id, term)
);

create table redundancy_map (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  concept_slug      text not null,
  explained_fully_in int not null,
  may_reference_in  int[] not null default '{}',
  forbidden_to_reexplain_in int[] not null default '{}',
  unique (book_version_id, concept_slug)
);

-- =====================================================================================
-- 8. TEXT, PASSAGEN, SUMMARIES
-- =====================================================================================

create table passages (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  chapter_version_id uuid not null references chapter_versions(id) on delete cascade,
  scene_id          uuid references scenes(id) on delete cascade,
  ordinal           int not null,
  text              text not null,
  char_start        int not null,
  char_end          int not null,
  word_count        int not null,
  kind              text,                              -- narration|dialogue|description|interiority
  entity_ids        uuid[] not null default '{}',
  tsv               tsvector generated always as (to_tsvector('simple', text)) stored,
  embedding         vector(1536),
  embedding_model   text,
  stale             boolean not null default false,
  created_at        timestamptz not null default now()
);
create index on passages using gin (tsv);
create index on passages using gin (entity_ids);
create index on passages using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
create index on passages (book_version_id, chapter_version_id) where not stale;

create table summaries (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  level             text not null,                     -- scene | chapter | act | part | book
  ref_id            uuid,                              -- scene/chapter/act/part
  chapter_no        int,
  content           jsonb not null,                    -- strukturierte Summary (10 §6)
  compacted         boolean not null default false,
  created_at        timestamptz not null default now()
);
create index on summaries (book_version_id, level, chapter_no);

create table phrase_statistics (
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  ngram             text not null,
  n                 int not null,
  count             int not null default 0,
  chapters          int[] not null default '{}',
  last_seen_chapter int,
  is_allowed_motif  boolean not null default false,
  primary key (book_version_id, ngram)
);
create index on phrase_statistics (book_version_id, count desc);

create table chapter_openings (
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  chapter_no        int not null,
  opening_type      text not null,
  first_200_words   text not null,
  trigram_signature text not null,                     -- SimHash/Minhash-Signatur
  embedding         vector(1536),
  primary key (book_version_id, chapter_no)
);

-- =====================================================================================
-- 9. KONTEXT-LOG (READ-SET) — Basis der Invalidierung
-- =====================================================================================

create table scene_context_log (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  chapter_id        uuid not null references chapters(id) on delete cascade,
  chapter_no        int not null,
  scene_id          uuid references scenes(id) on delete cascade,
  generation_run_id uuid,
  read_set_ids      uuid[] not null default '{}',      -- ALLE injizierten Canon-IDs, flach
  read_set_detail   jsonb not null default '{}',       -- nach Typ gruppiert (09 §8)
  write_set_ids     uuid[] not null default '{}',      -- von der Extraktion erzeugte IDs
  context_hash      text not null,
  tokens_static     int, tokens_dynamic int,
  created_at        timestamptz not null default now()
);
create index on scene_context_log using gin (read_set_ids);
create index on scene_context_log (book_version_id, chapter_no);

-- =====================================================================================
-- 10. ISSUES UND REPARATUREN
-- =====================================================================================

create table consistency_issues (
  id                uuid primary key default gen_random_uuid(),
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  chapter_no        int,
  scene_index       int,
  category          text not null,
  code              text not null,
  severity          text not null,                     -- block|high|medium|low|info
  detector          text not null,                     -- deterministic|semantic|audit|user
  confidence        numeric(4,3) not null default 1.0,
  message           text not null,
  evidence          jsonb not null default '[]',
  canon_ref         jsonb,
  suggested_fix     jsonb,
  downstream_risk   jsonb,
  status            text not null default 'open',
  repair_attempts   int not null default 0,
  detected_in_run   uuid,
  resolved_in_run   uuid,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);
create index on consistency_issues (book_version_id, status, severity);
create index on consistency_issues (chapter_no);

create table repairs (
  id                uuid primary key default gen_random_uuid(),
  issue_id          uuid not null references consistency_issues(id) on delete cascade,
  chapter_version_before uuid references chapter_versions(id),
  chapter_version_after  uuid references chapter_versions(id),
  strategy          text not null,                     -- auto_fix|sentence|paragraph|scene|chapter|plan
  attempt           int not null,
  outcome           text not null,                     -- fixed|no_change|worsened|rolled_back
  delta_diff        jsonb,
  cost_cents        numeric(12,4),
  created_at        timestamptz not null default now()
);

-- =====================================================================================
-- 11. JOBS, LÄUFE, KOSTEN
-- =====================================================================================

create table generation_runs (
  id                uuid primary key default gen_random_uuid(),
  book_id           uuid not null references books(id) on delete cascade,
  book_version_id   uuid not null references book_versions(id) on delete cascade,
  kind              text not null,                     -- full_book | chapter | repair | audit | render
  inngest_run_id    text,
  status            text not null default 'running',
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  error             jsonb
);

create table generation_jobs (
  id                uuid primary key default gen_random_uuid(),
  run_id            uuid not null references generation_runs(id) on delete cascade,
  book_id           uuid not null references books(id) on delete cascade,
  operation         text not null,                     -- plan.bible | chapter.write | chapter.extract | ...
  target_kind       text,                              -- chapter | scene | act | book
  target_id         uuid,
  idempotency_key   text not null unique,
  status            text not null default 'queued',    -- queued|running|succeeded|failed|skipped|cancelled
  attempt           int not null default 0,
  result_ref        jsonb,
  error             jsonb,
  heartbeat_at      timestamptz,
  queued_at         timestamptz not null default now(),
  started_at        timestamptz,
  finished_at       timestamptz
);
create index on generation_jobs (book_id, status);
create index on generation_jobs (status, heartbeat_at) where status = 'running';

create table llm_calls (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid references generation_jobs(id) on delete set null,
  book_id           uuid not null references books(id) on delete cascade,
  capability        text not null,
  provider          text not null,
  model_id          text not null,
  prompt_id         text,
  prompt_version    text,
  prompt_hash       text not null,
  context_hash      text,
  cache_key         text,
  idempotency_key   text not null,
  input_tokens      int not null default 0,
  output_tokens     int not null default 0,
  thinking_tokens   int not null default 0,
  cached_input_tokens int not null default 0,
  cost_cents        numeric(12,6) not null default 0,
  latency_ms        int,
  finish_reason     text,
  status            text not null,                     -- ok | failed | refused | truncated
  error             jsonb,
  debug_storage_path text,                             -- nur im Debug-Modus, TTL 7 Tage
  created_at        timestamptz not null default now()
);
create unique index on llm_calls (idempotency_key) where status = 'ok';
create index on llm_calls (book_id, created_at desc);

create table moderation_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references profiles(id) on delete set null,
  book_id           uuid references books(id) on delete cascade,
  stage             text not null,                     -- input | output | rating_gate
  kind              text not null,                     -- injection_attempt | hard_block | restrict | refusal
  categories        jsonb not null default '{}',
  action            text not null,                     -- allow | restrict | block
  excerpt_hash      text,                              -- kein Klartext
  chapter_no        int,
  created_at        timestamptz not null default now()
);
create index on moderation_events (user_id, created_at desc);

-- =====================================================================================
-- 12. REVIEWS, MEDIEN, EXPORTE
-- =====================================================================================

create table review_checkpoints (
  id                uuid primary key default gen_random_uuid(),
  book_id           uuid not null references books(id) on delete cascade,
  kind              text not null,                     -- outline | style | act | midpoint | needs_review | final
  ref_id            uuid,
  payload           jsonb not null,                    -- was dem Nutzer gezeigt wird
  decision          text,                              -- approved | changes_requested | variant_a | variant_b
  decision_payload  jsonb,
  decided_at        timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

create table assets (
  id                uuid primary key default gen_random_uuid(),
  book_id           uuid not null references books(id) on delete cascade,
  kind              text not null,                     -- cover_raw|cover_final|chapter_image|audio_segment|char_sheet
  chapter_no        int,
  storage_path      text not null,
  mime_type         text not null,
  width int, height int, duration_ms int, bytes bigint,
  prompt            text,
  seed              text,
  reference_asset_id uuid references assets(id),
  model_id          text,
  status            text not null default 'ready',
  created_at        timestamptz not null default now()
);

create table renders (
  id                uuid primary key default gen_random_uuid(),
  book_id           uuid not null references books(id) on delete cascade,
  format            text not null,                     -- epub|pdf|pdf_print|docx|m4b|txt
  profile           text,                              -- kdp_6x9 | web | ...
  storage_path      text,
  checksum          text,
  page_count        int,
  bytes             bigint,
  source_snapshot   jsonb not null,                    -- welche chapter_versions enthalten sind
  status            text not null default 'queued',
  error             jsonb,
  created_at        timestamptz not null default now()
);

create table book_metadata (
  book_id           uuid primary key references books(id) on delete cascade,
  final_title       text, subtitle text,
  blurb             text, short_description text,
  categories        jsonb not null default '[]',
  keywords          text[] not null default '{}',
  content_warnings  text[] not null default '{}',
  reading_time_min  int, estimated_pages int,
  ai_disclosure     text,
  updated_at        timestamptz not null default now()
);

-- =====================================================================================
-- 13. ROW LEVEL SECURITY
-- =====================================================================================
-- Muster: Der Nutzer sieht ausschliesslich, was ueber books.user_id ihm gehoert.
-- Schreibrechte hat der Client fast nirgends — geschrieben wird vom Worker mit
-- service_role (RLS umgangen). Der Client darf nur: Buch anlegen, Spec editieren,
-- Kapiteltext editieren, Review-Entscheidungen treffen.

alter table profiles              enable row level security;
alter table books                 enable row level security;
alter table book_versions         enable row level security;
alter table book_specs            enable row level security;
alter table chapters              enable row level security;
alter table chapter_versions      enable row level security;
alter table consistency_issues    enable row level security;
alter table generation_jobs       enable row level security;
alter table review_checkpoints    enable row level security;
alter table renders               enable row level security;
alter table assets                enable row level security;
alter table book_metadata         enable row level security;
-- ... analog fuer alle uebrigen Canon-Tabellen

create policy p_profiles_self on profiles
  for select using (id = auth.uid());

create policy p_books_owner on books
  for select using (user_id = auth.uid() and deleted_at is null);
create policy p_books_insert on books
  for insert with check (user_id = auth.uid());
create policy p_books_update on books
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Hilfsfunktion: gehoert eine book_version dem aufrufenden Nutzer?
create or replace function owns_book_version(bv uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from book_versions v join books b on b.id = v.book_id
    where v.id = bv and b.user_id = auth.uid() and b.deleted_at is null);
$fn$;

create policy p_chapters_owner on chapters
  for select using (owns_book_version(book_version_id));

create policy p_chapter_versions_owner on chapter_versions
  for select using (exists (
    select 1 from chapters c where c.id = chapter_versions.chapter_id
      and owns_book_version(c.book_version_id)));

create policy p_issues_owner on consistency_issues
  for select using (owns_book_version(book_version_id));

create policy p_checkpoints_owner on review_checkpoints
  for select using (exists (
    select 1 from books b where b.id = review_checkpoints.book_id and b.user_id = auth.uid()));
create policy p_checkpoints_decide on review_checkpoints
  for update using (exists (
    select 1 from books b where b.id = review_checkpoints.book_id and b.user_id = auth.uid()));

-- Append-only durchsetzen: keine UPDATE/DELETE-Policy fuer events, entity_facts,
-- knowledge_states, relationships, llm_calls. Zusaetzlich Trigger als Sicherheitsnetz:
create or replace function forbid_mutation() returns trigger
language plpgsql as $fn$
begin
  raise exception 'append-only table: % erlaubt kein %', TG_TABLE_NAME, TG_OP;
end;
$fn$;

create trigger t_events_append_only before update or delete on events
  for each row execute function forbid_mutation();
-- Ausnahme: das Schliessen von Gueltigkeiten laeuft ueber eine SECURITY DEFINER-Funktion,
-- die den Trigger via session-Variable umgeht (siehe commit_chapter).

-- =====================================================================================
-- 14. COMMIT-TRANSAKTION
-- =====================================================================================
-- Ein Kapitel wird ausschliesslich hierueber committet. Entweder alles oder nichts.

create or replace function commit_chapter(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_chapter_id uuid := (p_payload->>'chapterId')::uuid;
  v_version_id uuid;
begin
  perform set_config('app.allow_canon_write', 'on', true);

  -- 1. Kapitelversion anlegen und als aktuell markieren
  update chapter_versions set is_current = false where chapter_id = v_chapter_id;
  insert into chapter_versions (chapter_id, version_no, source, text, word_count,
                                finish_reason, generation_run_id, is_current)
  values (v_chapter_id,
          coalesce((select max(version_no) from chapter_versions where chapter_id = v_chapter_id), 0) + 1,
          p_payload->>'source', p_payload->>'text', (p_payload->>'wordCount')::int,
          p_payload->>'finishReason', (p_payload->>'runId')::uuid, true)
  returning id into v_version_id;

  -- 2. Fakten schliessen, neue Fakten/Events/Wissen/Beziehungen einfuegen
  --    (Details in packages/db/commit.ts als parametrisierte Statements)
  perform apply_fact_deltas(v_version_id, p_payload->'factDeltas');
  perform apply_events(v_version_id, p_payload->'events');
  perform apply_knowledge(v_version_id, p_payload->'knowledgeDeltas');
  perform apply_relationships(v_version_id, p_payload->'relationshipDeltas');
  perform apply_threads(v_version_id, p_payload->'threadDeltas');

  -- 3. Snapshot, Summary, Read/Write-Set, Phrasenstatistik
  perform write_state_snapshot(v_version_id);
  perform upsert_summary(v_version_id, p_payload->'summary');
  perform record_context_log(v_version_id, p_payload->'readSet', p_payload->'writeSet');
  perform update_phrase_stats(v_version_id, p_payload->>'text');

  -- 4. Kapitel- und Buchstatus
  update chapters
     set status = 'committed', current_version_id = v_version_id,
         actual_words = (p_payload->>'wordCount')::int,
         dialogue_ratio = (p_payload->>'dialogueRatio')::numeric,
         committed_at = now()
   where id = v_chapter_id;

  perform recompute_book_progress((p_payload->>'bookId')::uuid);

  perform set_config('app.allow_canon_write', 'off', true);
  return v_version_id;
end;
$fn$;
