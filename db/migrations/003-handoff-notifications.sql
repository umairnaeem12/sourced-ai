-- Spec 003 amendment: a handoff is saved first; each notification channel records its own result.
create table handoff_notifications (
  id uuid primary key default gen_random_uuid(),
  handoff_id uuid not null references handoffs (id) on delete cascade,
  channel text not null check (channel in ('slack', 'email', 'webhook')),
  status text not null check (status in ('sent', 'failed', 'logged')),
  error text,
  created_at timestamptz not null default now(),
  unique (handoff_id, channel)
);

-- Every handoff so far was a Slack attempt; keep its result.
insert into handoff_notifications (handoff_id, channel, status, error, created_at)
select id, 'slack', status, error, coalesce(sent_at, created_at) from handoffs;

alter table handoffs drop column status;

alter table handoffs drop column error;

alter table handoffs drop column sent_at;

alter table handoffs add column handled_at timestamptz;

create index handoffs_created_at_idx on handoffs (created_at);
