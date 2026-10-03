create table if not exists public.records (
  id text primary key,
  owner uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('workout', 'checkin', 'settings', 'health', 'wellness', 'measurement', 'sleep')),
  day date not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists records_owner_day_idx on public.records (owner, day desc);
alter table public.records enable row level security;

drop policy if exists "Owners can read records" on public.records;
create policy "Owners can read records" on public.records
  for select to authenticated using ((select auth.uid()) = owner);

drop policy if exists "Owners can insert records" on public.records;
create policy "Owners can insert records" on public.records
  for insert to authenticated with check ((select auth.uid()) = owner);

drop policy if exists "Owners can update records" on public.records;
create policy "Owners can update records" on public.records
  for update to authenticated using ((select auth.uid()) = owner)
  with check ((select auth.uid()) = owner);

drop policy if exists "Owners can delete records" on public.records;
create policy "Owners can delete records" on public.records
  for delete to authenticated using ((select auth.uid()) = owner);

grant select, insert, update, delete on public.records to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners can read progress photos" on storage.objects;
create policy "Owners can read progress photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Owners can upload progress photos" on storage.objects;
create policy "Owners can upload progress photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Owners can delete progress photos" on storage.objects;
create policy "Owners can delete progress photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
