import { deletedDates } from '@/lib/archive-deletions';
import { listDaily, readDaily } from '@/lib/daily';
import { reportCsv, validDate } from '@/lib/daily-model';
import { json } from '@/lib/http';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(req:Request){
  
  try{const u=new URL(req.url),date=u.searchParams.get('date');
    const removed=await deletedDates('daily');
    if(!date)return json({reports:(await listDaily()).filter(r=>!removed.has(r.date))});
    if(!validDate(date))return json({error:'날짜를 확인해 주세요.'},400);
    if(removed.has(date))return json({error:'삭제된 장부입니다.'},404);
    const report=await readDaily(date);if(!report)return json({error:'해당 날짜에는 저장된 목록이 없습니다.'},404);
    if(u.searchParams.get('format')==='csv')return new Response(reportCsv(report),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="kmed-${date}.csv"`,'Cache-Control':'private, no-store'}});
    return json({report});
  }catch(e){console.error('Daily report read failed',e instanceof Error?e.name:'Unknown');return json({error:'일별 재고를 불러오지 못했습니다. Vercel 비공개 Blob 연결을 확인해 주세요.'},503);}
}
