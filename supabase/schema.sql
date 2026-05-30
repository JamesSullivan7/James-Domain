-- The Vault — database schema for Supabase.
-- Run this once in your Supabase project:  SQL Editor → New query → paste → Run.

create table if not exists public.works (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null default 'site',          -- 'site' | 'repo'
  url        text not null,
  summary    text default '',
  category   text default 'Uncategorised',
  tech       text[] default '{}',
  status     text not null default 'live',           -- 'live' | 'experiment' | 'archived' | 'wip'
  reserve    boolean not null default false,         -- reserved for the Private Reserve (future)
  created_at timestamptz not null default now()
);

-- Lock the table down. With RLS on and no policies, anonymous/public clients
-- get NO direct access. All reads and writes go through the serverless API
-- (/api/works), which uses the service-role key and bypasses RLS — and which
-- additionally requires the curator password for any write.
alter table public.works enable row level security;
