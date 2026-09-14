import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
export const COOKIE = 'kmed_session';
export const SESSION_SECONDS = 12 * 60 * 60;
export function authConfigured() { const length=process.env.STOCK_PASSWORD?.length ?? 0;return length>=12 && length<=256; }
export function safeEqual(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}
function sign(payload: string) {
  return createHmac('sha256', process.env.STOCK_PASSWORD!).update('kmed-session-v1:' + payload).digest('base64url');
}
export function createSession(now = Date.now()) {
  if (!authConfigured()) throw Error('Password not configured');
  const payload = `${Math.floor(now / 1000) + SESSION_SECONDS}.${randomBytes(24).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}
export function verifySession(token: string | undefined, now = Date.now()) {
  if (!authConfigured() || !token || token.length > 256) return false;
  const parts = token.split('.');
  if(parts.length !== 3 || !/^\d+$/.test(parts[0])) return false;
  const expiry = Number(parts[0]);
  const current = Math.floor(now / 1000);
  return expiry > current && expiry <= current + SESSION_SECONDS && safeEqual(parts[2], sign(parts.slice(0,2).join('.')));
}
export async function hasSession() { return verifySession((await cookies()).get(COOKIE)?.value); }
export async function requirePageSession() { if(!await hasSession()) redirect('/login'); }
export function json(data: unknown, status = 200) { return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}}); }
export async function sessionError() {
  if (!authConfigured()) return json({error:'관리자가 접속 비밀번호를 설정해야 합니다.'},503);
  return await hasSession() ? null : json({error:'로그인이 필요합니다.'},401);
}
export function sameOrigin(req: Request) {
  const origin=req.headers.get('origin');if(!origin)return false;
  try{const parsed=new URL(origin);return ['http:','https:'].includes(parsed.protocol) && parsed.origin===origin && parsed.host===(req.headers.get('host') || new URL(req.url).host);}catch{return false;}
}
