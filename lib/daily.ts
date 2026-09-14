import { get, put, list } from '@vercel/blob';
import { rpc } from '@/lib/inventory';
import { type DailyReport, type DailyProduct, validDate } from '@/lib/daily-model';
const prefix='kmed-daily/';
export function blobConfigured(){return !!(process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID&&process.env.VERCEL_OIDC_TOKEN));}
function ensure(){if(!blobConfigured())throw Error('일별 재고 저장소가 아직 연결되지 않았습니다. 관리자에게 문의해 주세요.');}
export async function readDaily(date:string):Promise<DailyReport|null>{
  ensure();if(!validDate(date))throw Error('날짜를 확인해 주세요.');
  const result=await get(`${prefix}${date}.json`,{access:'private',useCache:false});
  if(!result)return null;if(result.statusCode!==200 || !result.stream)throw Error('일별 재고를 읽지 못했습니다.');
  return await new Response(result.stream).json() as DailyReport;
}
export async function listDaily(){
  ensure();const reports:{date:string}[]=[];let cursor:string|undefined;
  do{const page=await list({prefix,limit:1000,cursor});for(const b of page.blobs){const date=b.pathname.slice(prefix.length).replace(/\.json$/,'');if(validDate(date))reports.push({date});}cursor=page.hasMore?page.cursor:undefined;}while(cursor);
  return reports.sort((a,b)=>b.date.localeCompare(a.date));
}
export async function captureDaily(date:string,source:DailyReport['source']){
  ensure();if(!validDate(date))throw Error('날짜를 확인해 주세요.');
  const existing=await readDaily(date);if(existing)return {report:existing,created:false};
  const response=await rpc('kmed_inventory',{});
  if(!response.ok)throw Error('현재 재고를 읽지 못해 일별 목록을 저장하지 않았습니다.');
  const data=await response.json();
  if(!Array.isArray(data.products)||!data.products.every((p:DailyProduct)=>typeof p.id==='string'&&typeof p.name==='string'&&Number.isFinite(p.quantity)))throw Error('재고 응답을 확인하지 못했습니다.');
  const report:DailyReport={version:1,date,capturedAt:new Date().toISOString(),source,products:data.products.map((p:DailyProduct)=>({id:p.id,name:p.name,category:p.category,quantity:p.quantity,minimum:p.minimum,unit:p.unit,note:p.note}))};
  try{await put(`${prefix}${date}.json`,JSON.stringify(report),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});}
  catch(e){const saved=await readDaily(date);if(saved)return {report:saved,created:false};throw e;}
  return {report,created:true};
}
