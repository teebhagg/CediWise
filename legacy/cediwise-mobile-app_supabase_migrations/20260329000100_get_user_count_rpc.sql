create function public.get_user_count()
returns bigint
language sql stable security definer
as $$
  select count(*) from (select 1 from auth.users limit 100) as t;
$$;
