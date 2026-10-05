-- Run this once in your Supabase project's SQL Editor.
-- The Google account identity controls all reads and writes.
begin;

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('opportunity','contact','project','test','task','block')),
  data jsonb not null check (
    jsonb_typeof(data) = 'object'
    and data ? 'title'
    and jsonb_typeof(data -> 'title') = 'string'
    and length(btrim(data ->> 'title')) between 1 and 180
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_records_owner_kind on public.records(owner_id, kind);
create index if not exists idx_records_owner_created on public.records(owner_id, created_at desc, id);

alter table public.records enable row level security;
alter table public.records force row level security;
revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;

-- Re-running setup replaces only these four policies, not your saved records.
drop policy if exists "Read own records" on public.records;
drop policy if exists "Create own records" on public.records;
drop policy if exists "Update own records" on public.records;
drop policy if exists "Delete own records" on public.records;
create policy "Read own records" on public.records for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Create own records" on public.records for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Update own records" on public.records for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own records" on public.records for delete to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.touch_record_timestamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists touch_record_timestamp on public.records;
create trigger touch_record_timestamp before update on public.records
for each row execute function public.touch_record_timestamp();

commit;
