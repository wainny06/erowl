-- 기존 재고와 기록은 변경하지 않습니다. 백업 테이블도 만들지 않습니다.
-- Vercel Production에 SUPABASE_SECRET_KEY를 먼저 설정합니다.
-- 새 비밀번호 기능이 배포된 직후 실행하여 익명 DB 우회 접근을 차단합니다.
begin;
revoke all on function public.kmed_inventory(),public.kmed_mutate(jsonb) from public,anon,authenticated;
grant execute on function public.kmed_inventory(),public.kmed_mutate(jsonb) to service_role;
notify pgrst,'reload schema';
commit;
-- 모두 false, service_role 두 값은 true여야 합니다.
select has_function_privilege('anon','public.kmed_inventory()','execute') as anon_read,
       has_function_privilege('anon','public.kmed_mutate(jsonb)','execute') as anon_write,
       has_function_privilege('authenticated','public.kmed_inventory()','execute') as authenticated_read,
       has_function_privilege('authenticated','public.kmed_mutate(jsonb)','execute') as authenticated_write,
       has_function_privilege('service_role','public.kmed_inventory()','execute') as server_read,
       has_function_privilege('service_role','public.kmed_mutate(jsonb)','execute') as server_write;
