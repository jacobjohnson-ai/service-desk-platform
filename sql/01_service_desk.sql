-- Service Desk Platform: users, roles, ticket workflow, notes, audit log, and row-level security.
-- Run once in the Supabase SQL Editor.

-- 1. Profiles: one row per login, with a role
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  department  text,
  role        text not null default 'employee' check (role in ('employee','technician','admin')),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Helper: the current user's role (security definer so policies can call it without recursion)
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('technician','admin') from public.profiles where id = auth.uid()), false)
$$;

-- 2. Ticket workflow columns on the existing tickets table
alter table public.tickets
  add column status       text not null default 'open' check (status in ('open','in_progress','resolved')),
  add column requester_id uuid references public.profiles(id),
  add column assigned_to  uuid references public.profiles(id),
  add column updated_at   timestamptz not null default now(),
  add column resolved_at  timestamptz;

-- 3. Replies and internal notes
create table public.ticket_notes (
  id         bigint generated always as identity primary key,
  ticket_id  bigint not null references public.tickets(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) default auth.uid(),
  body       text not null check (length(body) between 1 and 2000),
  internal   boolean not null default false,   -- internal notes are staff-only
  created_at timestamptz not null default now()
);
alter table public.ticket_notes enable row level security;

-- 4. Audit log: written only by triggers, never edited
create table public.audit_log (
  id         bigint generated always as identity primary key,
  ticket_id  bigint references public.tickets(id) on delete cascade,
  actor_id   uuid,
  action     text not null,
  detail     text,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

create or replace function public.log_ticket_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into audit_log(ticket_id, actor_id, action, detail) values (new.id, auth.uid(), 'created', new.summary);
  else
    if new.status is distinct from old.status then
      insert into audit_log(ticket_id, actor_id, action, detail) values (new.id, auth.uid(), 'status', old.status || ' → ' || new.status);
      if new.status = 'resolved' then new.resolved_at := now(); else new.resolved_at := null; end if;
    end if;
    if new.assigned_to is distinct from old.assigned_to then
      insert into audit_log(ticket_id, actor_id, action, detail)
      values (new.id, auth.uid(), 'assigned', coalesce((select full_name from profiles where id = new.assigned_to), 'unassigned'));
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;

create trigger tickets_audit_insert after insert on public.tickets for each row execute function public.log_ticket_change();
create trigger tickets_audit_update before update on public.tickets for each row execute function public.log_ticket_change();

create or replace function public.log_note() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(ticket_id, actor_id, action, detail)
  values (new.ticket_id, new.author_id, case when new.internal then 'internal note' else 'reply' end, left(new.body, 120));
  return new;
end $$;
create trigger notes_audit after insert on public.ticket_notes for each row execute function public.log_note();

-- 5. Row-level security policies

-- Profiles: everyone signed in can see names (for "assigned to"); you can't change your own role
create policy "profiles readable by signed-in users" on public.profiles for select to authenticated using (true);

-- Tickets
create policy "employees see their own tickets" on public.tickets for select to authenticated
  using (requester_id = auth.uid() or public.is_staff());
create policy "employees create tickets for themselves" on public.tickets for insert to authenticated
  with check (requester_id = auth.uid() and status = 'open' and assigned_to is null);
create policy "staff update tickets" on public.tickets for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Only staff may change workflow fields; this blocks employees even if a policy were loosened
revoke update on public.tickets from authenticated;
grant update (status, assigned_to, urgency, priority_score) on public.tickets to authenticated;
grant select, insert on public.tickets to authenticated;

-- Notes: employees see public replies on their own tickets; staff see everything
create policy "read notes" on public.ticket_notes for select to authenticated using (
  public.is_staff()
  or (not internal and exists (select 1 from public.tickets t where t.id = ticket_id and t.requester_id = auth.uid()))
);
create policy "write notes" on public.ticket_notes for insert to authenticated with check (
  author_id = auth.uid() and (
    public.is_staff()
    or (not internal and exists (select 1 from public.tickets t where t.id = ticket_id and t.requester_id = auth.uid()))
  )
);
grant select, insert on public.ticket_notes to authenticated;

-- Audit log: staff can read; nobody can write directly (only the triggers above)
create policy "staff read audit log" on public.audit_log for select to authenticated using (public.is_staff());
grant select on public.audit_log to authenticated;

grant select on public.profiles to authenticated;
grant usage on sequence public.ticket_notes_id_seq to authenticated;

-- 6. Admin overview numbers
create or replace view public.desk_stats with (security_invoker = true) as
select
  count(*) filter (where status = 'open')                                   as open_tickets,
  count(*) filter (where status = 'in_progress')                            as in_progress,
  count(*) filter (where status = 'resolved')                               as resolved,
  round(avg(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1) as avg_hours_to_resolve
from public.tickets;
grant select on public.desk_stats to authenticated;
