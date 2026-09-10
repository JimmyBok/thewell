-- ---------------------------------------------------------------------------
-- The Well schema
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Folders -------------------------------------------------------------------
-- parent_id = null means the folder lives at the root.
create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 120),
  parent_id   uuid references public.folders (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Sibling folders can't share a name (case-insensitive).
-- NULLS NOT DISTINCT makes the rule apply at the root too (Postgres 15+).
create unique index if not exists folders_unique_sibling_name
  on public.folders (parent_id, lower(name)) nulls not distinct;

create index if not exists folders_parent_idx on public.folders (parent_id);

-- Files ---------------------------------------------------------------------
-- folder_id = null means the file sits at the root.
-- uploaded_by is optional: null means the uploader did not give a name.
create table if not exists public.files (
  id            uuid primary key default gen_random_uuid(),
  folder_id     uuid references public.folders (id) on delete cascade,
  name          text not null,
  storage_path  text not null unique,
  mime_type     text not null default 'application/octet-stream',
  size_bytes    bigint not null default 0,
  kind          text not null check (kind in ('text', 'audio')),
  uploaded_by   text,
  created_at    timestamptz not null default now()
);

-- Added after the first release. Re-running this file upgrades a database that
-- was created before uploaded_by existed; rows already there keep a null.
alter table public.files add column if not exists uploaded_by text;

-- Applied separately so the create-table and the alter paths end up identical.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.files'::regclass
      and conname = 'files_uploaded_by_length'
  ) then
    alter table public.files
      add constraint files_uploaded_by_length
      check (uploaded_by is null or char_length(uploaded_by) between 1 and 80);
  end if;
end;
$$;

create index if not exists files_folder_idx on public.files (folder_id);
create index if not exists files_name_idx on public.files (lower(name));

-- Guard against a folder becoming its own ancestor ---------------------------
create or replace function public.folders_prevent_cycle()
returns trigger
language plpgsql
as $$
declare
  cursor_id uuid := new.parent_id;
  hops int := 0;
begin
  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'A folder cannot be moved inside itself';
    end if;
    hops := hops + 1;
    if hops > 64 then
      raise exception 'Folder nesting is too deep';
    end if;
    select parent_id into cursor_id from public.folders where id = cursor_id;
  end loop;
  return new;
end;
$$;

drop trigger if exists folders_prevent_cycle_trg on public.folders;
create trigger folders_prevent_cycle_trg
  before insert or update of parent_id on public.folders
  for each row execute function public.folders_prevent_cycle();

-- Row level security ---------------------------------------------------------
-- RLS is ON with no permissive policies, so the anon/browser key can read
-- nothing. Every query in this app runs server-side with the service_role key,
-- which bypasses RLS. When you add per-user auth, add an owner_id column and
-- policies here, and switch the server client over to the user's session.
alter table public.folders enable row level security;
alter table public.files   enable row level security;

-- Storage bucket -------------------------------------------------------------
-- Private bucket: the app hands out short-lived signed URLs instead of
-- public links.
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 52428800)
on conflict (id) do nothing;
