export type DailyProduct={id:string;name:string;category:string;quantity:number;minimum:number|null;unit:string;note:string};
export type DailyReport={version:1;date:string;capturedAt:string;source:'scheduled'|'manual';products:DailyProduct[]};
export const koreanDate=(now=new Date())=>new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
export const previousKoreanDate=(now=new Date())=>koreanDate(new Date(now.getTime()-86400000));
export function validDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;}
export function reportCsv(report:DailyReport){
  const cell=(v:unknown)=>{let s=String(v??'');if(typeof v!=='number'&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
  const rows:unknown[][]=[['기준일','실제 저장 시각(KST)','품목','분류','재고','단위','최소 재고','부족 수량','메모'],...report.products.map(p=>[report.date,new Date(report.capturedAt).toLocaleString('sv-SE',{timeZone:'Asia/Seoul'}),p.name,p.category,p.quantity,p.unit,p.minimum,p.minimum===null?'':Math.max(0,Math.round((p.minimum-p.quantity)*10000)/10000),p.note])];
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
