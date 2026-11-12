-- Live numbers for the portfolio homepage diagram.
-- Totals only: no names, emails, or ticket text. The public (anon) role can read this view and nothing else new.
create or replace view public.homepage_stats as
select
  (select count(*) from public.tickets)                                                     as total_tickets,
  (select count(*) from public.tickets where created_at > now() - interval '7 days')        as new_this_week,
  (select count(*) from public.tickets where status <> 'resolved')                          as open_now,
  (select count(*) from public.kb_articles)                                                 as fix_guides,
  (select round(avg(extract(epoch from (first_response_at - created_at)) / 3600)::numeric, 1)
     from public.tickets where first_response_at is not null)                               as avg_first_reply_hours;

grant select on public.homepage_stats to anon;

select * from public.homepage_stats;
