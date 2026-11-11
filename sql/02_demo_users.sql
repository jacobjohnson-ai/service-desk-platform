-- Run AFTER creating the three demo logins in Authentication > Users.
insert into public.profiles (id, full_name, department, role)
select id,
  case email when 'employee@northwind.example' then 'Riley Carter'
             when 'tech@northwind.example'     then 'Morgan Diaz'
             when 'admin@northwind.example'    then 'Avery Brooks' end,
  case email when 'employee@northwind.example' then 'Sales' else 'IT' end,
  case email when 'employee@northwind.example' then 'employee'
             when 'tech@northwind.example'     then 'technician'
             when 'admin@northwind.example'    then 'admin' end
from auth.users
where email in ('employee@northwind.example','tech@northwind.example','admin@northwind.example')
on conflict (id) do update set full_name = excluded.full_name, department = excluded.department, role = excluded.role;

-- Give the demo employee a few tickets so every view has data
update public.tickets set requester_id = (select id from auth.users where email = 'employee@northwind.example')
where id in (select id from public.tickets order by id desc limit 4);

select p.full_name, p.role, u.email from public.profiles p join auth.users u on u.id = p.id;
