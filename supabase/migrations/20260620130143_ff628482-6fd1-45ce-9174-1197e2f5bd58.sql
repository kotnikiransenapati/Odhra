create table if not exists public.on_call_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.on_call_schedules to authenticated;
grant all on public.on_call_schedules to service_role;
alter table public.on_call_schedules enable row level security;
create policy "admins manage schedules" on public.on_call_schedules for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "auth read schedules" on public.on_call_schedules for select to authenticated using (true);

create table if not exists public.on_call_rotations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.on_call_schedules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text,
  contact_email text,
  contact_phone text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  level int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists idx_rotations_window on public.on_call_rotations(schedule_id, starts_at, ends_at);
grant select, insert, update, delete on public.on_call_rotations to authenticated;
grant all on public.on_call_rotations to service_role;
alter table public.on_call_rotations enable row level security;
create policy "admins manage rotations" on public.on_call_rotations for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "auth read rotations" on public.on_call_rotations for select to authenticated using (true);

create table if not exists public.notification_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  match_severity text[] not null default array['major','critical'],
  match_services text[] not null default '{}',
  match_event_types text[] not null default '{}',
  schedule_id uuid references public.on_call_schedules(id) on delete set null,
  channels jsonb not null default '[]'::jsonb,
  escalate_after_minutes int not null default 15,
  is_active boolean not null default true,
  priority int not null default 100,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notification_routes to authenticated;
grant all on public.notification_routes to service_role;
alter table public.notification_routes enable row level security;
create policy "admins manage routes" on public.notification_routes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "auth read routes" on public.notification_routes for select to authenticated using (true);

create or replace function public.current_on_call(_schedule uuid)
returns table(user_id uuid, user_name text, contact_email text, contact_phone text, level int)
language sql stable security definer set search_path = public as $$
  select user_id, user_name, contact_email, contact_phone, level
  from public.on_call_rotations
  where schedule_id = _schedule
    and now() between starts_at and ends_at
  order by level asc, starts_at asc;
$$;
revoke all on function public.current_on_call(uuid) from public;
grant execute on function public.current_on_call(uuid) to authenticated;