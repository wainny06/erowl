"use client";
import { useCallback, useEffect, useState } from 'react';
import type { DailyReport } from '@/lib/daily-model';
import { previousKoreanDate } from '@/lib/daily-model';
export default function DailyView(){
 const [dates,setDates]=useState<{date:string}[]>([]),[date,setDate]=useState(''),[report,setReport]=useState<DailyReport|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{const r=await fetch('/api/daily',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);setDates(d.reports);setRevision(v=>v+1);setDate(current=>current||d.reports[0]?.date||'');}catch(e){setError(e instanceof Error?e.message:'목록을 불러오지 못했습니다.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{if(!date)return;const controller=new AbortController();setReport(null);setError('');fetch(`/api/daily?date=${date}`,{signal:controller.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setReport(d.report);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[date,revision]);
 return <main className="daily-shell"><header className="daily-heading"><div><a href="/">← 현재 재고로</a><h1>일별 재고</h1><p>날짜별로 보관한 품목과 수량을 확인합니다.</p></div></header>
 <section className="daily-card"><div className="daily-toolbar"><label>기준일 <select value={date} onChange={e=>setDate(e.target.value)} disabled={!dates.length}><option value="" disabled>날짜 선택</option>{dates.map(d=><option key={d.date}>{d.date}</option>)}</select></label><button className="daily-button" onClick={()=>void refresh()} disabled={loading}>새로고침</button>{report&&<a className="daily-button" href={`/api/daily?date=${date}&format=csv`}>CSV 다운로드</a>}</div>
 <p className="daily-note">매일 자정 이후 자동 생성됩니다. 실제 저장 시각의 재고이며, 저장 후 수량을 수정해도 이 목록은 바뀌지 않습니다.</p>
 {error&&<p role="alert" className="daily-error">{error}</p>}
 {!loading&&!error&&!dates.some(d=>d.date===previousKoreanDate())&&<p className="daily-note">전일 목록이 아직 없습니다. 첫 자동 저장 전이거나 예약 작업이 실행되지 않았을 수 있습니다.</p>}
 {loading?<p role="status">목록을 불러오는 중…</p>:!dates.length&&!error?<div className="daily-empty"><h2>아직 저장된 목록이 없습니다.</h2><p>첫 자동 저장 후 여기에 날짜가 표시됩니다.</p></div>:null}
 {report&&<><div className="daily-summary"><strong>{report.date} · {report.products.length}개 품목</strong><span>실제 저장: {new Date(report.capturedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국 시간) · {report.source==='scheduled'?'자동':'수동'}</span></div><div className="daily-table-wrap"><table><thead><tr>{['품목','분류','재고','단위','최소 재고','부족 수량'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{report.products.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.category}</td><td><strong>{p.quantity.toLocaleString('ko-KR')}</strong></td><td>{p.unit}</td><td>{p.minimum??'미설정'}</td><td>{p.minimum===null?'—':Math.max(0,Math.round((p.minimum-p.quantity)*10000)/10000)}</td></tr>)}</tbody></table></div></>}
 </section></main>;
}
