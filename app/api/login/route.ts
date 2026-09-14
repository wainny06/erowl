import { NextResponse } from 'next/server';
import { authConfigured, COOKIE, createSession, json, safeEqual, sameOrigin, SESSION_SECONDS } from '@/lib/auth';
export const runtime = 'nodejs';
const attempts = new Map<string,{count:number;until:number}>();
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({error:'허용되지 않은 요청입니다.'},403);
  if (!authConfigured()) return json({error:'관리자가 Vercel에 STOCK_PASSWORD를 12자 이상으로 설정해야 합니다.'},503);
  const now=Date.now();
  for(const [key,v] of attempts) if(v.until<=now) attempts.delete(key);
  const ip=req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const entry=attempts.get(ip) ?? {count:0,until:now+10*60*1000};
  if(entry.count>=5 || attempts.size>=10000) return json({error:'로그인 시도가 많습니다. 10분 후 다시 시도해 주세요.'},429);
  entry.count++;attempts.set(ip,entry);
  let password: unknown;
  try {
    if(Number(req.headers.get('content-length')||0)>2048) return json({error:'입력이 너무 깁니다.'},400);
    const raw=await req.text();if(raw.length>2048) return json({error:'입력이 너무 깁니다.'},400);
    password=JSON.parse(raw).password;
  } catch { return json({error:'비밀번호를 입력해 주세요.'},400); }
  if(typeof password!=='string' || !safeEqual(password,process.env.STOCK_PASSWORD!)) return json({error:'비밀번호가 맞지 않습니다.'},401);
  attempts.delete(ip);
  const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  response.cookies.set(COOKIE,createSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production' || new URL(req.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:SESSION_SECONDS});
  return response;
}
