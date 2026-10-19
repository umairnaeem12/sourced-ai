-- Spec 003: question log for the gap report, and handoffs to Slack.
create table questions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  question text not null,
  is_answered boolean not null,
  answer_text text not null,
  top_similarity real,
  provider text,
  created_at timestamptz not null default now()
);

create index questions_conversation_id_idx on questions (conversation_id);

create index questions_is_answered_created_at_idx on questions (is_answered, created_at);

create table handoffs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique,
  email text,
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
