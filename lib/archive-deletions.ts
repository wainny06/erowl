import { get, list, put } from '@vercel/blob';
import { blobConfigured } from '@/lib/daily';
import { validDate } from '@/lib/daily-model';
import type { ArchiveSource } from '@/lib/archive-model';
const root='kmed-archive-deleted/';
function path(source:ArchiveSource,date:string){if(!['legacy','daily'].includes(source)||!validDate(date))throw Error('Invalid archive identifier');return `${root}${source}/${date}.json`;}
export async function deletedDates(source:ArchiveSource){
 const dates=new Set<string>();if(!blobConfigured())return dates;
 let cursor:string|undefined;const prefix=`${root}${source}/`;
 do{const page=await list({prefix,limit:1000,cursor});for(const b of page.blobs){const date=b.pathname.slice(prefix.length).replace(/\.json$/,'');if(validDate(date))dates.add(date);}cursor=page.hasMore?page.cursor:undefined;}while(cursor);
 return dates;
}
export async function markDeleted(source:ArchiveSource,date:string){
 if(!blobConfigured())throw Error('Blob not connected');const pathname=path(source,date);
 // A separate immutable marker per date avoids concurrent deletion lost updates.
 const options={access:'private' as const,useCache:false};
 if(await get(pathname,options))return;
 try{await put(pathname,JSON.stringify({source,date,deletedAt:new Date().toISOString()}),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});}
 catch(e){if(!await get(pathname,options))throw e;}
}
