import legacy from '@/data/archive.json';
import imported from '@/data/import-20260914.json';
import { blobConfigured, listDaily, readDaily } from '@/lib/daily';
import { deletedDates, markDeleted } from '@/lib/archive-deletions';
import type { ArchiveSource, ArchiveRecord, InventoryGroup } from '@/lib/archive-model';
const groups=['medicine','treatment','pharmacopuncture'] as const;
function groupOf(p:{inventory_group?:string;id?:string}){return p.inventory_group??(p.id?.startsWith('import-20260914-treatment-')?'treatment':p.id?.startsWith('import-20260914-pharmacopuncture-')?'pharmacopuncture':'medicine');}
export async function rawRecord(source:ArchiveSource,date:string,group:InventoryGroup='all',hidden?:Set<string>[]):Promise<ArchiveRecord|null>{
 let record:ArchiveRecord|null;
 if(source==='legacy'){
  const original=legacy.find(r=>r.date===date);
  const rows=[...(original?.rows||[]).map(r=>({...r,unit:'원본 단위',inventory_group:'medicine'})),...(date==='2026-09-14'?imported.map(p=>({id:p.id,name:p.name,category:p.category,quantity:p.opening,unit:p.unit,inventory_group:p.inventory_group})):[])];
  record=rows.length?{date,rows}:null;
 }else{
  const saved=await readDaily(date);record=saved?{date,capturedAt:saved.capturedAt,rows:saved.products.map(p=>({id:p.id,name:p.name,category:p.category,quantity:p.quantity,unit:p.unit,inventory_group:groupOf(p)}))}:null;
 }
 if(!record)return null;
 const removed=hidden??await Promise.all(groups.map(g=>deletedDates(source,g)));
 const rows=record.rows.filter(p=>(group==='all'||groupOf(p)===group)&&!removed[groups.indexOf(groupOf(p) as typeof groups[number])]?.has(date));
 return rows.length?{...record,rows}:null;
}
export async function archiveIndex(source:ArchiveSource,group:InventoryGroup='all'){
 const [removed,records]=await Promise.all([deletedDates(source),source==='legacy'?Promise.resolve([...new Set([...legacy.map(r=>r.date),'2026-09-14'])].map(date=>({date}))):listDaily()]);
 const visible:{date:string}[]=[];const hidden=await Promise.all(groups.map(g=>deletedDates(source,g)));
 // Bound storage reads while excluding dates with no records in this group.
 const candidates=records.filter(r=>!removed.has(r.date));
 for(let i=0;i<candidates.length;i+=5){const batch=candidates.slice(i,i+5);const found=await Promise.all(batch.map(r=>rawRecord(source,r.date,group,hidden)));batch.forEach((r,j)=>{if(found[j])visible.push(r);});}
 return {records:visible.sort((a,b)=>b.date.localeCompare(a.date)),canDelete:blobConfigured(),warning:blobConfigured()?'':'삭제 기록을 저장하려면 Vercel Blob 연결이 필요합니다. 현재는 조회만 가능합니다.'};
}
export async function deleteRecord(source:ArchiveSource,date:string,group:InventoryGroup='all'){
 if(!await rawRecord(source,date,group))return false;await markDeleted(source,date,group);return true;
}
