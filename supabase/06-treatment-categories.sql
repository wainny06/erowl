begin;
update public.kmed_products
set category=case
 when regexp_replace(name,'\s','','g') ~ '^(침[0-9]|장침|도침|짧은도침|란셋)' then '침'
 when regexp_replace(name,'\s','','g') ~ '^(인슐린주사기|필터니들|시린지|니들)' then '주사기 품목'
 else '치료실 품목' end,
 version=version+1
where inventory_group='treatment' and deleted=0 and category is distinct from case
 when regexp_replace(name,'\s','','g') ~ '^(침[0-9]|장침|도침|짧은도침|란셋)' then '침'
 when regexp_replace(name,'\s','','g') ~ '^(인슐린주사기|필터니들|시린지|니들)' then '주사기 품목'
 else '치료실 품목' end;
commit;
