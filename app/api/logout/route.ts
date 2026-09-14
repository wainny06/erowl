import { NextResponse } from 'next/server';
import { COOKIE, json, sameOrigin } from '@/lib/auth';
export async function POST(req: Request) {
  if(!sameOrigin(req)) return json({error:'허용되지 않은 요청입니다.'},403);
  const response=NextResponse.redirect(new URL('/login',req.headers.get('origin')!),303);
  response.cookies.set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production' || new URL(req.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:0});
  response.headers.set('Cache-Control','no-store');
  return response;
}
