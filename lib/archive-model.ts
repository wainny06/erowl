export type ArchiveSource='legacy'|'daily';
export type ArchiveRow={id?:string;name:string;category:string;quantity:number|null;unit:string};
export type ArchiveRecord={date:string;rows:ArchiveRow[];capturedAt?:string};
export type ChangeRow=ArchiveRow & {key:string;previous:number|null;change:number|null;status:string};
export function compareRecords(current:ArchiveRecord,previous:ArchiveRecord|null,source:ArchiveSource):ChangeRow[]{
 const key=(r:ArchiveRow)=>source==='daily'?r.id??r.name:r.name.trim().normalize('NFC');
 const group=(rows:ArchiveRow[])=>{const map=new Map<string,ArchiveRow[]>();for(const r of rows){const k=key(r);map.set(k,[...(map.get(k)||[]),r]);}return map;};
 const before=group(previous?.rows||[]),after=group(current.rows);
 const keys=[...new Set([...after.keys(),...before.keys()])];
 return keys.flatMap<ChangeRow>(k=>{
  const aa=after.get(k)||[],bb=before.get(k)||[];
  if(aa.length>1||bb.length>1)return [...aa,...bb.filter(()=>!aa.length)].map((r,i)=>({...r,key:`${k}:${i}`,previous:null,change:null,status:'동일명 중복 · 비교 불가'}));
  const a=aa[0],b=bb[0],row=a||b;
  const base={...row,key:k,quantity:a?.quantity??null,previous:b?.quantity??null,change:null};
  if(!previous)return [{...base,status:'비교 기록 없음'}];
  if(!b)return [{...base,status:'새로 기록됨'}];
  if(!a)return [{...base,status:'이번 기록에 없음'}];
  if(a.unit!==b.unit)return [{...base,status:'단위 변경 · 비교 불가'}];
  if(a.quantity===null||b.quantity===null)return [{...base,status:'미기재 · 비교 불가'}];
  const change=Math.round((a.quantity-b.quantity)*10000)/10000;
  return [{...base,change,status:change>0?'증가':change<0?'감소':'변동 없음'}];
 });
}
export function comparisonCsv(date:string,baseline:string|null,rows:ChangeRow[]){
 const cell=(v:unknown)=>{let s=String(v??'');if(typeof v!=='number'&&/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const data:unknown[][]=[['기준일','비교일','품목','분류','단위','이전 재고','선택일 재고','증감','상태'],...rows.map(r=>[date,baseline??'',r.name,r.category,r.unit,r.previous??'미기재',r.quantity??'미기재',r.change??'',r.status])];
 return '\uFEFF'+data.map(row=>row.map(cell).join(',')).join('\r\n');
}
