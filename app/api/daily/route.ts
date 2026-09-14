import { archiveIndex, rawRecord } from '@/lib/archive';
import { readDaily } from '@/lib/daily';
import { reportCsv, validDate } from '@/lib/daily-model';
import { json } from '@/lib/http';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(req:Request){
  
  try{const u=new URL(req.url),date=u.searchParams.get('date');
    const index=await archiveIndex('daily');
    if(!date)return json({reports:index.records});
    if(!validDate(date))return json({error:'날짜를 확인해 주세요.'},400);
    if(!index.records.some(r=>r.date===date))return json({error:'삭제된 장부입니다.'},404);
    const saved=await readDaily(date);const visible=await rawRecord('daily',date);if(!saved||!visible)return json({error:'해당 날짜에는 저장된 목록이 없습니다.'},404);
    const ids=new Set(visible.rows.map(p=>p.id));const report={...saved,products:saved.products.filter(p=>ids.has(p.id))};
    if(u.searchParams.get('format')==='csv')return new Response(reportCsv(report),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="kmed-${date}.csv"`,'Cache-Control':'private, no-store'}});
    return json({report});
  }catch(e){console.error('Daily report read failed',e instanceof Error?e.name:'Unknown');return json({error:'일별 재고를 불러오지 못했습니다. Vercel 비공개 Blob 연결을 확인해 주세요.'},503);}
}
