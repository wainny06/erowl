-- Add inventory groups without changing existing stock or movements.
begin;
alter table public.kmed_products add column if not exists inventory_group text not null default 'medicine' check(inventory_group in ('medicine','treatment','pharmacopuncture'));
create or replace function public.kmed_mutate(b jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 p public.kmed_products%rowtype; prior public.kmed_movements%rowtype;
 qty numeric; current_qty numeric; change_qty numeric; process_date date; col integer;
 product_name text; product_category text; product_unit text; product_note text;
 min_qty numeric; pid text; product_group text;
begin
 if jsonb_typeof(b) is distinct from 'object' then raise exception '입력 형식을 확인해 주세요.';end if;
 if b->>'action'='product' then
  product_group:=b->>'inventory_group';
  if product_group is not null and product_group not in ('medicine','treatment','pharmacopuncture') then raise exception '관리 탭을 확인해 주세요.';end if;
  if not public.kmed_valid_text(b->'name',200) or not public.kmed_valid_text(b->'category',60)
   or not public.kmed_valid_text(b->'unit',30) or jsonb_typeof(b->'note') is distinct from 'string'
   or length(b->>'note')>1000 or not (b->'minimum'='null'::jsonb or public.kmed_valid_number(b->'minimum'))
   or not public.kmed_valid_number(b->'board_column') then raise exception '품목명, 분류, 위치, 수량을 확인해 주세요.';end if;
  if (b->>'board_column')::numeric not in (1,2,3,4) then raise exception '1~4열 중 선택해 주세요.';end if;
  col:=(b->>'board_column')::integer;product_name:=btrim(b->>'name');product_category:=btrim(b->>'category');
  product_unit:=btrim(b->>'unit');product_note:=b->>'note';min_qty:=(b->>'minimum')::numeric;
  pid:=nullif(b->>'id','');
  if pid is null then
   insert into public.kmed_products(id,name,category,unit,minimum,note,board_column,inventory_group)
   values(gen_random_uuid()::text,product_name,product_category,product_unit,min_qty,product_note,col,coalesce(product_group,'medicine'));
  else
   update public.kmed_products set name=product_name,category=product_category,unit=product_unit,
    minimum=min_qty,note=product_note,board_column=col,inventory_group=coalesce(product_group,inventory_group),needs_check=case when b->>'needs_check'='1' then 1 else 0 end,version=version+1
    where id=pid and version=(b->>'version')::integer and deleted=0;
   if not found then raise exception '품목이 변경되었습니다. 새로고침 후 다시 수정해 주세요.';end if;
  end if;
 elsif b->>'action'='delete_product' then
  if not public.kmed_valid_text(b->'id',100) or not public.kmed_valid_text(b->'confirm_name',200) then raise exception '삭제할 품목을 확인해 주세요.';end if;
  select * into p from public.kmed_products where id=b->>'id' for update;
  if not found then raise exception '품목이 없습니다.';end if;
  if p.deleted=1 then return '{"ok":true}'::jsonb;end if;
  if p.version is distinct from (b->>'version')::integer or p.name is distinct from b->>'confirm_name' then raise exception '품목이 변경되었습니다. 새로고침 후 다시 확인해 주세요.';end if;
  update public.kmed_products set deleted=1,version=version+1 where id=p.id;
 elsif b->>'action'='movement' then
  if not public.kmed_valid_text(b->'id',100) or not public.kmed_valid_text(b->'product_id',100)
    or not public.kmed_valid_text(b->'actor',80) or not public.kmed_valid_number(b->'quantity')
    or jsonb_typeof(b->'memo') is distinct from 'string' or length(b->>'memo')>1000
    or coalesce(b->>'kind','') not in ('입고','출고','폐기','실사 조정')
    or coalesce(b->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception '품목, 수량, 담당자, 처리일을 확인해 주세요.';end if;
  qty:=(b->>'quantity')::numeric;process_date:=(b->>'date')::date;
  if process_date>(now() at time zone 'Asia/Seoul')::date or to_char(process_date,'YYYY-MM-DD')<>b->>'date' then raise exception '처리일을 확인해 주세요. 미래 날짜는 입력할 수 없습니다.';end if;
  if b->>'kind'<>'실사 조정' and qty=0 then raise exception '0보다 큰 수량을 입력해 주세요.';end if;
  if b->>'kind'='실사 조정' and (not public.kmed_valid_number(b->'expected') or length(btrim(b->>'memo'))=0) then raise exception '실사 조정에는 확인한 재고와 사유가 필요합니다.';end if;
  -- The same key serializes retries, including concurrent retries from separate tabs.
  perform pg_advisory_xact_lock(hashtextextended(b->>'id',0));
  select * into prior from public.kmed_movements where id=b->>'id';
  if found then
   if prior.product_id is distinct from b->>'product_id' or prior.kind is distinct from b->>'kind' then raise exception '중복 요청 번호를 확인해 주세요.';end if;
   return '{"ok":true}'::jsonb;
  end if;
  select * into p from public.kmed_products where id=b->>'product_id' for update;
  if not found or p.deleted=1 then raise exception '삭제되었거나 없는 품목입니다.';end if;
  select round(p.opening+coalesce(sum(delta),0),4) into current_qty from public.kmed_movements where product_id=p.id;
  if b->>'kind'='실사 조정' then
   if abs(current_qty-(b->>'expected')::numeric)>=0.00001 then raise exception '재고가 변경되었습니다. 새로고침 후 다시 확인해 주세요.';end if;
   change_qty:=qty-current_qty;
  elsif b->>'kind'='입고' then change_qty:=qty;
  else change_qty:=-qty;end if;
  if current_qty+change_qty<0 then raise exception '재고가 부족합니다. 현재 재고를 확인해 주세요.';end if;
  insert into public.kmed_movements(id,product_id,kind,delta,after_qty,date,memo,actor)
   values(b->>'id',p.id,b->>'kind',change_qty,round(current_qty+change_qty,4),process_date,b->>'memo',btrim(b->>'actor'));
 else raise exception '지원하지 않는 요청입니다.';
 end if;
 return '{"ok":true}'::jsonb;
end;
$$;

notify pgrst,'reload schema';
commit;
