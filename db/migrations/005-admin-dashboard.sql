-- Spec 005: admin dashboard. Sources per answer, gap groups by meaning, notes,
-- managed documents, and sample/test activity kept apart from real visitors.

alter table questions add column citations jsonb not null default '[]'::jsonb;

alter table questions add column question_embedding vector(768);

alter table questions add column gap_id uuid;

alter table questions add column origin text not null default 'visitor' check (origin in ('visitor', 'sample', 'test'));

-- Old unanswered rows keep spec 003's grouping: same normalized wording, same gap.
update questions
set gap_id = md5(lower(regexp_replace(rtrim(trim(question), '?!. '), '\s+', ' ', 'g')))::uuid
where is_answered = false and gap_id is null;

create index questions_origin_created_at_idx on questions (origin, created_at);

create index questions_gap_id_idx on questions (gap_id);

create index questions_embedding_idx on questions using hnsw (question_embedding vector_cosine_ops);

alter table handoffs add column origin text not null default 'visitor' check (origin in ('visitor', 'sample', 'test'));

create index handoffs_origin_created_at_idx on handoffs (origin, created_at);

create table gap_resolutions (
  gap_id uuid primary key,
  resolved_at timestamptz not null default now()
);

create table handoff_notes (
  id uuid primary key default gen_random_uuid(),
  handoff_id uuid not null references handoffs (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index handoff_notes_handoff_id_created_at_idx on handoff_notes (handoff_id, created_at);

alter table documents add column origin text not null default 'sample' check (origin in ('sample', 'upload'));

alter table documents add column source_filename text;

alter table documents add column char_count integer not null default 0;

alter table documents add column deleted_at timestamptz;

-- Rollback: drop index documents_slug_active_idx, then add back unique (slug) as documents_slug_key.
alter table documents drop constraint documents_slug_key;

create unique index documents_slug_active_idx on documents (slug) where deleted_at is null;

update documents d
set char_count = coalesce((select sum(length(p.heading) + length(p.content))::int from passages p where p.document_id = d.id), 0)
where char_count = 0;
