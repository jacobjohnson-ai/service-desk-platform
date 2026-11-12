-- Tidy the demo queue: resolve leftover test tickets so the queue shows a realistic set.
-- Nothing is deleted. Each change is written to the audit log by the existing trigger.
-- Keeps the 12 newest open tickets with different problems, plus every ticket that has replies.
with keep as (
  select id from (
    select distinct on (lower(left(split_part(summary, ' Tried:', 1), 22))) id, created_at
    from public.tickets
    where status <> 'resolved'
    order by lower(left(split_part(summary, ' Tried:', 1), 22)), created_at desc
  ) d
  order by created_at desc
  limit 12
)
update public.tickets t
set status = 'resolved'
where t.status <> 'resolved'
  and t.id not in (select id from keep)
  and not exists (select 1 from public.ticket_notes n where n.ticket_id = t.id);

-- What's left in the queue
select id, status, urgency, left(summary, 60) as summary from public.tickets where status <> 'resolved' order by id desc;
