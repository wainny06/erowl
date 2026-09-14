import { archiveIndex, rawRecord, deleteRecord } from '@/lib/archive';
import { compareRecords, comparisonCsv, validGroup, type ArchiveSource } from '@/lib/archive-model';
import { json, sameOrigin } from '@/lib/http';
import { validDate } from '@/lib/daily-model';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(req:Request){
 const u=new URL(req.url),source=u.searchParams.get('source')||'legacy',group=u.searchParams.get('group')||'all';
 if(!validGroup(group))return json({error:'관리 구분을 확인해 주세요.'},400);
 if(!['legacy','daily'].includes(source))return json({error:'장부 종류를 확인해 주세요.'},400);
 try{
  const kind=source as ArchiveSource,index=await archiveIndex(kind,group),date=u.searchParams.get('date');
  if(!date)return json(index);
  if(!validDate(date))return json({error:'날짜를 확인해 주세요.'},400);
  if(!index.records.some(r=>r.date===date))return json({error:'삭제되었거나 없는 장부입니다. 목록을 새로고침해 주세요.'},404);
  const requested=u.searchParams.get('baseline');
  if(requested&&(!validDate(requested)||requested>=date||!index.records.some(r=>r.date===requested)))return json({error:'선택일보다 앞선 비교 날짜를 선택해 주세요.'},400);
  const baseline=requested||index.records.find(r=>r.date<date)?.date||null;
  const [record,previous]=await Promise.all([rawRecord(kind,date,group),baseline?rawRecord(kind,baseline,group):Promise.resolve(null)]);
  if(!record||baseline&&!previous)return json({error:'장부를 읽지 못했습니다. 다시 불러와 주세요.'},503);
  const rows=compareRecords(record,previous,kind);
  if(u.searchParams.get('format')==='csv')return new Response(comparisonCsv(date,baseline,rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="kmed-${source}-${group}-${date}-changes.csv"`,'Cache-Control':'no-store'}});
  return json({record,baseline,rows});
 }catch{return json({error:'장부를 불러오지 못했습니다. 저장소 연결을 확인해 주세요.'},503);}
}
export async function DELETE(req:Request){
 if(!sameOrigin(req))return json({error:'허용되지 않은 요청입니다.'},403);
 try{const raw=await req.text();if(raw.length>1000)return json({error:'입력이 너무 깁니다.'},400);const b=JSON.parse(raw);
  if(!b||!validGroup(b.group??'all')||!['legacy','daily'].includes(b.source)||typeof b.date!=='string'||!validDate(b.date)||b.confirm!==b.date)return json({error:'삭제할 날짜를 정확히 입력해 주세요.'},400);
  if(!await deleteRecord(b.source,b.date,b.group??'all'))return json({error:'해당 장부가 없습니다.'},404);
  return json({ok:true});
 }catch{return json({error:'삭제 내용을 저장하지 못했습니다. 장부는 삭제 완료되지 않았습니다. 다시 시도해 주세요.'},503);}
}
