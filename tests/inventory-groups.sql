-- Verification only: all test mutations roll back.
begin;
do $$
declare g text; pid text; result jsonb; p jsonb;
begin
 foreach g in array array['medicine','treatment','pharmacopuncture'] loop
  perform public.kmed_mutate(jsonb_build_object('action','product','name','__group_test__','category','테스트','unit','개','note','','minimum',null,'board_column',4,'inventory_group',g));
  select id into pid from public.kmed_products where name='__group_test__' and inventory_group=g;
  perform public.kmed_mutate(jsonb_build_object('action','movement','id',gen_random_uuid()::text,'product_id',pid,'kind','입고','quantity',3,'actor','검증','memo','','date',to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD')));
  select x into p from jsonb_array_elements(public.kmed_inventory()->'products') x where x->>'id'=pid;
  if p->>'inventory_group'<>g or (p->>'quantity')::numeric<>3 then raise exception 'Group stock test failed';end if;
  -- Older clients without the new field must preserve the group on edits.
  perform public.kmed_mutate(jsonb_build_object('action','product','id',pid,'version',0,'name','__group_test__','category','테스트','unit','개','note','','minimum',null,'board_column',4));
  if (select inventory_group from public.kmed_products where id=pid)<>g then raise exception 'Legacy edit changed group';end if;
 end loop;
 begin
  perform public.kmed_mutate('{"action":"product","inventory_group":"invalid"}'::jsonb);
  raise exception 'Invalid group accepted';
 exception when raise_exception then
  if sqlerrm<>'관리 탭을 확인해 주세요.' then raise;end if;
 end;
end $$;
rollback;
