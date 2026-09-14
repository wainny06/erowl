import { rpc } from '@/lib/inventory';
import { json as reply, sameOrigin } from '@/lib/http';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){return rpc('kmed_inventory',{})}
export async function POST(req:Request){
 
 if(!sameOrigin(req))return reply({error:'허용되지 않은 요청입니다.'},403);
 try{
  const raw=await req.text();if(raw.length>12000)return reply({error:'입력 내용이 너무 큽니다.'},400);
  const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))return reply({error:'입력 형식을 확인해 주세요.'},400);
  return rpc('kmed_mutate',{b});
 }catch{return reply({error:'입력 형식을 확인해 주세요.'},400)}
}
