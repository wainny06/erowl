import { captureDaily } from '@/lib/daily';
import { previousKoreanDate } from '@/lib/daily-model';
import { json, safeEqual } from '@/lib/auth';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(req:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret || secret.length<32 || !safeEqual(req.headers.get('authorization')||'',`Bearer ${secret}`))return json({error:'Unauthorized'},401);
  try{const result=await captureDaily(previousKoreanDate(),'scheduled');return json({ok:true,date:result.report.date,capturedAt:result.report.capturedAt,created:result.created});}
  catch(e){console.error('Daily capture failed',e instanceof Error?e.name:'Unknown');return json({error:'Daily capture failed'},503);}
}
