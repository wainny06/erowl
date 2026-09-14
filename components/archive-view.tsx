"use client";
import { useEffect, useState } from 'react';
import type { ArchiveSource, ArchiveRecord, ChangeRow } from '@/lib/archive-model';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
type Detail={record:ArchiveRecord;baseline:string|null;rows:ChangeRow[]};
export default function ArchiveView({embedded=false,initialSource='legacy'}:{embedded?:boolean;initialSource?:ArchiveSource}){
 const [source,setSource]=useState<ArchiveSource>(initialSource),[dates,setDates]=useState<{date:string}[]>([]),[date,setDate]=useState(''),[baseline,setBaseline]=useState(''),[detail,setDetail]=useState<Detail|null>(null),[revision,setRevision]=useState(0);
 const [search,setSearch]=useState(''),[onlyChanges,setOnlyChanges]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[warning,setWarning]=useState(''),[canDelete,setCanDelete]=useState(false);
 const [confirmOpen,setConfirmOpen]=useState(false),[confirmation,setConfirmation]=useState(''),[deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState('');
 useEffect(()=>{const c=new AbortController();setLoading(true);setError('');setDetail(null);
 fetch(`/api/archive?source=${source}`,{signal:c.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setDates(d.records);setCanDelete(d.canDelete);setWarning(d.warning);setDate(current=>d.records.some((x:{date:string})=>x.date===current)?current:d.records[0]?.date||'');}).catch(e=>{if(e.name!=='AbortError'){setDates([]);setDate('');setCanDelete(false);setError(e.message);}}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[source,revision]);
 useEffect(()=>{if(!date)return;const c=new AbortController();setDetail(null);setError('');
 const q=new URLSearchParams({source,date});if(baseline)q.set('baseline',baseline);
 fetch(`/api/archive?${q}`,{signal:c.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setDetail(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[source,date,baseline,revision]);
 function changeSource(value:ArchiveSource){setSource(value);setDate('');setDates([]);setBaseline('');setDetail(null);setLoading(true);}
 async function remove(){setDeleting(true);setDeleteError('');try{const r=await fetch('/api/archive',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,date,confirm:confirmation})});const d=await r.json();if(!r.ok)throw Error(d.error);setConfirmOpen(false);setDate('');setBaseline('');setDetail(null);setRevision(v=>v+1);}catch(e){setDeleteError(e instanceof Error?e.message:'삭제하지 못했습니다.');}finally{setDeleting(false);}}
 const shown=detail?.rows.filter(r=>(!search||`${r.name} ${r.category}`.toLowerCase().includes(search.toLowerCase()))&&(!onlyChanges||r.status!=='변동 없음'))||[];
 const csv=new URLSearchParams({source,date,format:'csv'});if(baseline)csv.set('baseline',baseline);
 const fmt=(n:number|null)=>n===null?'—':n.toLocaleString('ko-KR');
 return <div className={embedded?'archive-embedded':'daily-shell'}>{!embedded&&<header className="daily-heading"><div><a href="/">← 현재 재고로</a><h1>과거 장부 · 일별 재고</h1></div></header>}
 <section className={embedded?'archive-content':'daily-card'}><div className="daily-toolbar">
 <label>장부 종류 <select aria-label="장부 종류" value={source} onChange={e=>changeSource(e.target.value as ArchiveSource)}><option value="legacy">원본 과거 장부</option><option value="daily">자동 저장 재고</option></select></label>
 <label>조회일 <select aria-label="조회일" value={date} disabled={loading||!dates.length} onChange={e=>{setDate(e.target.value);setBaseline('');}}><option value="" disabled>날짜 선택</option>{dates.map(d=><option key={d.date}>{d.date}</option>)}</select></label>
 <label>비교일 <select aria-label="비교일" value={baseline} disabled={!date||loading} onChange={e=>setBaseline(e.target.value)}><option value="">바로 앞의 저장 기록</option>{dates.filter(d=>d.date<date).map(d=><option key={d.date}>{d.date}</option>)}</select></label>
 <button className="daily-button" onClick={()=>{setBaseline('');setRevision(v=>v+1);}} disabled={loading}>새로고침</button>
 {detail&&<a className="daily-button" href={`/api/archive?${csv}`}>전체 비교 CSV</a>}
 <button className="daily-button archive-delete" disabled={!detail||!canDelete||loading} onClick={()=>{setConfirmation('');setDeleteError('');setConfirmOpen(true);}}>선택 날짜 장부 삭제</button>
 </div><div className="archive-search"><label>제품 검색 <input aria-label="장부 제품 검색" value={search} onChange={e=>setSearch(e.target.value)} placeholder="제품명 또는 분류"/></label><label><input type="checkbox" checked={onlyChanges} onChange={e=>setOnlyChanges(e.target.checked)}/> 변동·확인 필요 제품만</label></div>
 <p className="daily-note">증감은 두 저장 기록의 수량 차이입니다. 입고·출고량을 각각 뜻하지 않습니다. 미기재 수량·단위 변경·제품명이 중복된 기록은 비교하지 않습니다.</p>
 {warning&&<p className="daily-note">{warning}</p>}{error&&<p className="daily-error" role="alert">{error}</p>}
 {loading?<p role="status">장부 목록을 불러오는 중…</p>:!dates.length&&!error?<div className="daily-empty">{source==='legacy'?'조회할 과거 장부가 없습니다.':'아직 자동 저장된 기록이 없습니다.'}</div>:null}
 {!loading&&date&&!detail&&!error&&<p role="status">제품별 재고를 불러오는 중…</p>}
 {detail&&<><div className="daily-summary"><strong>{detail.baseline?`${detail.baseline} → ${detail.record.date}`:`${detail.record.date} · 이전 비교 기록 없음`}</strong><span>{shown.length}개 표시 / 전체 {detail.rows.length}개</span></div>{detail.record.capturedAt&&<p className="daily-note">실제 저장 시각: {new Date(detail.record.capturedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국 시간)</p>}
 <div className="daily-table-wrap"><table><thead><tr>{['제품','분류','단위',detail.baseline?`${detail.baseline} 재고`:'이전 재고',`${detail.record.date} 재고`,'증감','상태'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{shown.map(r=><tr key={r.key}><td>{r.name}</td><td>{r.category}</td><td>{r.unit}</td><td>{fmt(r.previous)}</td><td>{fmt(r.quantity)}</td><td className={r.change!==null&&r.change>0?'positive':r.change!==null&&r.change<0?'short':''}><strong>{r.change===null?'—':r.change>0?'+'+fmt(r.change):fmt(r.change)}</strong></td><td>{r.status}</td></tr>)}</tbody></table></div>{!shown.length&&<p className="daily-empty">조건에 맞는 제품이 없습니다.</p>}</>}
 </section><AlertDialog open={confirmOpen} onOpenChange={v=>{if(!deleting)setConfirmOpen(v);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{date} 장부를 삭제할까요?</AlertDialogTitle><AlertDialogDescription>선택 날짜의 전체 제품 기록이 조회·비교 목록에서 제외됩니다. 현재 재고와 입출고 이력은 바뀌지 않습니다. 확인을 위해 아래에 {date}를 입력해 주세요.</AlertDialogDescription></AlertDialogHeader><label>삭제할 날짜<input className="archive-confirm" aria-label="삭제 확인 날짜" value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder={date} disabled={deleting}/></label>{deleteError&&<p role="alert" className="daily-error">{deleteError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel><Button variant="destructive" disabled={deleting||confirmation!==date} onClick={()=>void remove()}>{deleting?'삭제 중…':'장부 삭제'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
