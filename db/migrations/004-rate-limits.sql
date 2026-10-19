-- Spec 004: fixed-window rate limits shared across serverless instances.
-- bucket is "<rule>:<hashed visitor id>" or "<rule>:global"; raw IPs are never stored.
create table rate_limit_hits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

create index rate_limit_hits_window_start_idx on rate_limit_hits (window_start);
