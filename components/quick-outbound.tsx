'use client';
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Outbound = {action:string;id:string;product_id:string;kind:string;quantity:number;date:string;actor:string;memo:string};
export function QuickMovement({product,kind,actor,onSaved,compact=false}:{compact?:boolean;kind:'입고'|'출고';product:{id:string;name:string;quantity:number;unit:string};actor:string;onSaved:()=>Promise<boolean>}) {
 const [quantity,setQuantity]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(false);
 const pending=useRef<Outbound|null>(null),locked=useRef(false);
 async function save(e:React.FormEvent){
  e.preventDefault();if(locked.current)return;
  const n=Number(quantity);
  if(!pending.current&&(!actor.trim()||!Number.isFinite(n)||n<=0||(kind==='출고'&&n>product.quantity)||n>10000000||Math.abs(n*10000-Math.round(n*10000))>=0.00001)) {setError(!actor.trim()?'위의 입출고 담당자를 입력해 주세요.':kind==='출고'?'현재 재고 이내의 수량을 소수점 4자리까지 입력해 주세요.':'0보다 큰 수량을 소수점 4자리까지 입력해 주세요.');return;}
  pending.current??={action:'movement',id:crypto.randomUUID(),product_id:product.id,kind,quantity:n,date:new Date(Date.now()+9*3600000).toISOString().slice(0,10),actor:actor.trim(),memo:''};
  locked.current=true;setBusy(true);setError('');
  try {
   const r=await fetch('/api/inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending.current)});
   const d=await r.json() as {error?:string};
   if(!r.ok){if(r.status<500){pending.current=null;setRetry(false);}throw Error(d.error||`${kind}를 저장하지 못했습니다.`);}
   pending.current=null;setRetry(false);setQuantity('');toast.success(`${product.name} ${kind}가 저장되었습니다.`);await onSaved();
  } catch(e){if(pending.current)setRetry(true);setError(e instanceof Error?e.message:'연결을 확인하고 다시 저장해 주세요.');}
  finally{locked.current=false;setBusy(false);}
 }
 return <form className={`quick-outbound ${compact?'compact-movement':''}`} onSubmit={save}>
  <div className="quick-outbound-controls"><Input aria-label={`${product.name} ${kind} 수량`} type="number" inputMode="decimal" min="0.0001" max={retry?undefined:kind==='출고'?Math.min(product.quantity,10000000):10000000} step="0.0001" placeholder="수량" required value={quantity} disabled={busy||retry} onChange={e=>{setQuantity(e.target.value);setError('')}}/><Button type="submit" variant="outline" size="sm" disabled={busy||(!retry&&!quantity)} aria-label={`${product.name} ${kind} 저장`}>{compact?(busy?'…':retry?'↻':'✓'):(busy?'저장 중':retry?'재시도':'저장')}</Button></div>
  {error&&<p className="quick-outbound-error" role="alert">{error}{retry?' 재시도하면 중복 처리 없이 저장 여부를 확인합니다.':''}</p>}
 </form>
}
