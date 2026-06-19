
-- Roles enum
create type public.app_role as enum ('manager', 'viewer');

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users can view their own roles"
on public.user_roles for select
to authenticated
using (user_id = auth.uid());

-- has_role security definer
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;

-- Auto-assign role on signup based on hardcoded manager emails
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  manager_emails text[] := array['potoracdaniel3@gmail.com', 'joshuaburketbusiness@gmail.com'];
begin
  if lower(new.email) = any(manager_emails) then
    insert into public.user_roles (user_id, role) values (new.id, 'manager')
    on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_assign_role
after insert on auth.users
for each row execute function public.handle_new_user_role();

-- Backfill any existing users
insert into public.user_roles (user_id, role)
select u.id,
  case when lower(u.email) in ('potoracdaniel3@gmail.com', 'joshuaburketbusiness@gmail.com')
    then 'manager'::public.app_role else 'viewer'::public.app_role end
from auth.users u
on conflict do nothing;

-- Replace permissive policies on salespeople
drop policy if exists "Authenticated users can delete salespeople" on public.salespeople;
drop policy if exists "Authenticated users can insert salespeople" on public.salespeople;
drop policy if exists "Authenticated users can update salespeople" on public.salespeople;
drop policy if exists "Authenticated users can view salespeople" on public.salespeople;

create policy "Anyone signed in can view salespeople"
on public.salespeople for select to authenticated using (true);

create policy "Managers can insert salespeople"
on public.salespeople for insert to authenticated
with check (public.has_role(auth.uid(), 'manager'));

create policy "Managers can update salespeople"
on public.salespeople for update to authenticated
using (public.has_role(auth.uid(), 'manager'))
with check (public.has_role(auth.uid(), 'manager'));

create policy "Managers can delete salespeople"
on public.salespeople for delete to authenticated
using (public.has_role(auth.uid(), 'manager'));

-- jobs: viewers can insert + view; managers can update/delete
drop policy if exists "Authenticated users can delete jobs" on public.jobs;
drop policy if exists "Authenticated users can insert jobs" on public.jobs;
drop policy if exists "Authenticated users can update jobs" on public.jobs;
drop policy if exists "Authenticated users can view jobs" on public.jobs;

create policy "Anyone signed in can view jobs"
on public.jobs for select to authenticated using (true);

create policy "Anyone signed in can insert jobs"
on public.jobs for insert to authenticated with check (true);

create policy "Managers can update jobs"
on public.jobs for update to authenticated
using (public.has_role(auth.uid(), 'manager'))
with check (public.has_role(auth.uid(), 'manager'));

create policy "Managers can delete jobs"
on public.jobs for delete to authenticated
using (public.has_role(auth.uid(), 'manager'));

-- activity_log: same as jobs
drop policy if exists "Authenticated users can delete activity" on public.activity_log;
drop policy if exists "Authenticated users can insert activity" on public.activity_log;
drop policy if exists "Authenticated users can update activity" on public.activity_log;
drop policy if exists "Authenticated users can view activity" on public.activity_log;

create policy "Anyone signed in can view activity"
on public.activity_log for select to authenticated using (true);

create policy "Anyone signed in can insert activity"
on public.activity_log for insert to authenticated with check (true);

create policy "Managers can update activity"
on public.activity_log for update to authenticated
using (public.has_role(auth.uid(), 'manager'))
with check (public.has_role(auth.uid(), 'manager'));

create policy "Managers can delete activity"
on public.activity_log for delete to authenticated
using (public.has_role(auth.uid(), 'manager'));
