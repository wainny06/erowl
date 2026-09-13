-- Apply in the intended Supabase project before importing data.
-- Public read/write RPCs preserve the requested anyone-with-link workflow.
begin;
create table public.kmed_products (
 id text primary key, name text not null, category text not null,
 opening numeric not null default 0 check(opening>=0), unit text not null,
 minimum numeric check(minimum>=0), note text not null default '',
 needs_check integer not null default 0, source text not null default '직접 등록',
 version integer not null default 0, board_column integer check(board_column between 1 and 4),
 deleted integer not null default 0 check(deleted in (0,1))
);
create table public.kmed_movements (
 id text primary key, product_id text not null references public.kmed_products(id),
 kind text not null check(kind in ('입고','출고','폐기','실사 조정')),
 delta numeric not null, after_qty numeric not null check(after_qty>=0),
 date date not null, memo text not null default '',actor text not null,created_at timestamptz not null default now()
);
create index kmed_movements_product on public.kmed_movements(product_id);
create index kmed_movements_date on public.kmed_movements(date desc,created_at desc);
alter table public.kmed_products enable row level security;
alter table public.kmed_movements enable row level security;
revoke all on public.kmed_products,public.kmed_movements from anon,authenticated;

create function public.kmed_inventory() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'products',coalesce((select jsonb_agg(to_jsonb(q) order by q.id) from (
 select p.*,round(p.opening+coalesce(sum(m.delta),0),4) quantity,
 case when count(*) filter(where m.kind='실사 조정')>0 then 0 else p.needs_check end check_required
 from public.kmed_products p left join public.kmed_movements m on m.product_id=p.id
 where p.deleted=0 group by p.id) q),'[]'::jsonb),
 'movements',coalesce((select jsonb_agg(to_jsonb(q) order by q.date desc,q.created_at desc) from (
 select m.*,p.name,p.unit from public.kmed_movements m join public.kmed_products p on p.id=m.product_id
 ) q),'[]'::jsonb));
$$;

create function public.kmed_valid_number(v jsonb) returns boolean
language sql immutable set search_path='' as $$
 select case when jsonb_typeof(v)='number' then (v::text)::numeric between 0 and 10000000 and round((v::text)::numeric,4)=(v::text)::numeric else false end;
$$;
create function public.kmed_valid_text(v jsonb,n integer) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(v)='string' and length(btrim(v#>>'{}')) between 1 and n,false);
$$;
create function public.kmed_mutate(b jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 p public.kmed_products%rowtype; prior public.kmed_movements%rowtype;
 qty numeric; current_qty numeric; change_qty numeric; process_date date; col integer;
 product_name text; product_category text; product_unit text; product_note text;
 min_qty numeric; pid text;
begin
 if jsonb_typeof(b) is distinct from 'object' then raise exception '입력 형식을 확인해 주세요.';end if;
 if b->>'action'='product' then
  if not public.kmed_valid_text(b->'name',200) or not public.kmed_valid_text(b->'category',60)
   or not public.kmed_valid_text(b->'unit',30) or jsonb_typeof(b->'note') is distinct from 'string'
   or length(b->>'note')>1000 or not (b->'minimum'='null'::jsonb or public.kmed_valid_number(b->'minimum'))
   or not public.kmed_valid_number(b->'board_column') then raise exception '품목명, 분류, 위치, 수량을 확인해 주세요.';end if;
  if (b->>'board_column')::numeric not in (1,2,3,4) then raise exception '1~4열 중 선택해 주세요.';end if;
  col:=(b->>'board_column')::integer;product_name:=btrim(b->>'name');product_category:=btrim(b->>'category');
  product_unit:=btrim(b->>'unit');product_note:=b->>'note';min_qty:=(b->>'minimum')::numeric;
  pid:=nullif(b->>'id','');
  if pid is null then
   insert into public.kmed_products(id,name,category,unit,minimum,note,board_column)
   values(gen_random_uuid()::text,product_name,product_category,product_unit,min_qty,product_note,col);
  else
   update public.kmed_products set name=product_name,category=product_category,unit=product_unit,
    minimum=min_qty,note=product_note,board_column=col,needs_check=case when b->>'needs_check'='1' then 1 else 0 end,version=version+1
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
revoke all on function public.kmed_valid_number(jsonb),public.kmed_valid_text(jsonb,integer) from public,anon,authenticated;
revoke all on function public.kmed_inventory(),public.kmed_mutate(jsonb) from public;
grant execute on function public.kmed_inventory(),public.kmed_mutate(jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
