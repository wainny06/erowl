import { json as reply } from '@/lib/http';
export async function rpc(name:string,body:unknown){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return reply({error:'관리자의 재고 저장소 연결 설정이 필요합니다.'},503);
 try{
  const r=await fetch(`${url.replace(/\/$/,'')}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`} : {}),'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await r.json();
  if(!r.ok){
   if(data.code==='P0001')return reply({error:data.message},409);
   console.error('Supabase RPC failed',r.status,data.code);
   return reply({error:'재고 저장소에 연결하지 못했습니다. 설정 또는 연결 상태를 확인해 주세요.'},503);
  }
  return reply(data);
 }catch{return reply({error:'연결이 지연되었습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.'},503)}
}
