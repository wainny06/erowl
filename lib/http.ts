import { createHash, timingSafeEqual } from 'node:crypto';
export function safeEqual(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}
export function json(data: unknown, status = 200) { return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}}); }
export function sameOrigin(req: Request) {
  const origin=req.headers.get('origin');if(!origin)return false;
  try{const parsed=new URL(origin);return ['http:','https:'].includes(parsed.protocol) && parsed.origin===origin && parsed.host===(req.headers.get('host') || new URL(req.url).host);}catch{return false;}
}
