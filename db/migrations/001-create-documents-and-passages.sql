-- Spec 002: docs and their passages, searched by meaning with pgvector.
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table passages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  section_number integer not null,
  heading text not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create index passages_document_id_idx on passages (document_id);

create index passages_embedding_idx on passages using hnsw (embedding vector_cosine_ops);
