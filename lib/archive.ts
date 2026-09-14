import legacy from '@/data/archive.json';
import { blobConfigured, listDaily, readDaily } from '@/lib/daily';
import { deletedDates, markDeleted } from '@/lib/archive-deletions';
import type { ArchiveSource, ArchiveRecord } from '@/lib/archive-model';
export async function archiveIndex(source:ArchiveSource){
 const [removed,records]=await Promise.all([deletedDates(source),source==='legacy'?Promise.resolve(legacy.map(r=>({date:r.date}))):listDaily()]);
 return {records:records.filter(r=>!removed.has(r.date)).sort((a,b)=>b.date.localeCompare(a.date)),canDelete:blobConfigured(),warning:blobConfigured()?'':'삭제 기록을 저장하려면 Vercel Blob 연결이 필요합니다. 현재는 조회만 가능합니다.'};
}
export async function rawRecord(source:ArchiveSource,date:string):Promise<ArchiveRecord|null>{
 if(source==='legacy'){const record=legacy.find(r=>r.date===date);return record?{date,rows:record.rows.map(r=>({...r,unit:'원본 단위'}))}:null;}
 const record=await readDaily(date);return record?{date,capturedAt:record.capturedAt,rows:record.products.map(p=>({id:p.id,name:p.name,category:p.category,quantity:p.quantity,unit:p.unit}))}:null;
}
export async function deleteRecord(source:ArchiveSource,date:string){
 if(!await rawRecord(source,date))return false;await markDeleted(source,date);return true;
}
