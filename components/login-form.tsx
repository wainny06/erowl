"use client";
import { useState, type FormEvent } from 'react';
export default function LoginForm({configured}:{configured:boolean}) {
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setError('');
    const password=new FormData(e.currentTarget).get('password');
    try { const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const d=await r.json();if(!r.ok)throw Error(d.error);window.location.assign('/'); }
    catch(e){setError(e instanceof Error?e.message:'접속하지 못했습니다. 다시 시도해 주세요.');setBusy(false);}
  }
  if(!configured)return <p role="alert" className="daily-error">접속 비밀번호 설정을 기다리고 있습니다. 관리자에게 문의해 주세요.</p>;
  return <form onSubmit={submit}><label htmlFor="password">비밀번호</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} autoFocus disabled={busy}/>{error&&<p role="alert" className="daily-error">{error}</p>}<button disabled={busy} type="submit">{busy?'확인 중…':'입장하기'}</button><small>로그인은 12시간 유지됩니다. 공용 기기에서는 사용 후 로그아웃해 주세요.</small></form>;
}
