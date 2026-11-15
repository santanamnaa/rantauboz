'use client';
import BozImage from './boz-image';
import {useEffect,useRef,useState} from 'react';

export type MonthlySummary={month:string;budget:number;spent:number;remaining:number;budgetCount:number;expenseCount:number};
const money=(value:number)=>'Rp'+Math.round(value).toLocaleString('id-ID');
const label=(month:string,short=false)=>new Date(month+'-01T12:00:00').toLocaleDateString('id-ID',{month:short?'short':'long',year:'numeric'});
const recorded=(point:MonthlySummary)=>point.budgetCount>0||point.expenseCount>0;
const series=[{key:'budget',label:'Budget'},{key:'spent',label:'Terpakai'},{key:'remaining',label:'Sisa'}] as const;
function axisLabel(value:number){const abs=Math.abs(value);return (value<0?'−':'')+(abs>=1000000?(abs/1000000).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt':abs>=1000?(abs/1000).toLocaleString('id-ID',{maximumFractionDigits:1})+' rb':abs.toLocaleString('id-ID'))}
function niceLimit(value:number){if(value<=0)return 1;const power=10**Math.floor(Math.log10(value)),n=value/power;return (n<=1?1:n<=2?2:n<=5?5:10)*power}

export default function MonthlyTracking({months,month,currentMonth,onOpenMonth}:{months:MonthlySummary[];month:string;currentMonth:string;onOpenMonth?:(month:string)=>void}){
 const [range,setRange]=useState(6),[selected,setSelected]=useState(month),[width,setWidth]=useState(300);
 const container=useRef<HTMLDivElement>(null);
 const points=months.slice(-range),chosen=points.find(p=>p.month===selected)||points.at(-1),hasData=points.some(recorded);
 useEffect(()=>{if(!container.current)return;const observer=new ResizeObserver(entries=>setWidth(Math.max(280,entries[0].contentRect.width)));observer.observe(container.current);return()=>observer.disconnect()},[hasData]);
 const chartWidth=Math.max(width,points.length*42+48),height=238,left=45,right=10,top=15,bottom=38;
 const maximum=niceLimit(Math.max(...points.flatMap(p=>[p.budget,p.spent,Math.max(p.remaining,0)]),1));
 const minimum=points.some(p=>p.remaining<0)?-niceLimit(Math.max(...points.map(p=>-p.remaining),0)):0;
 const y=(amount:number)=>top+(maximum-amount)/(maximum-minimum)*(height-top-bottom),zero=y(0),groupWidth=(chartWidth-left-right)/Math.max(points.length,1),barWidth=Math.min(14,(groupWidth-10)/3);
 const ticks=[maximum,maximum/2,0,...(minimum<0?[minimum]:[])];
 function changeRange(value:number){setRange(value);if(!months.slice(-value).some(p=>p.month===selected))setSelected(month)}
 return <div className="monthly-tracking">
  <section className="panel tracking-panel" aria-label="Grafik budget bulanan">
   <div className="tracking-heading"><div><h2>Budget dari bulan ke bulan</h2><p>{points.length?label(points[0].month,true)+' – '+label(points.at(-1)!.month,true):'Belum ada catatan bulanan'}</p></div><BozImage pose="glass" alt="Boz mencatat budget"/></div>
   <div className="tracking-range" role="group" aria-label="Rentang grafik">{[6,12].map(n=><button key={n} className={range===n?'selected':''} aria-pressed={range===n} onClick={()=>changeRange(n)}>{n} bulan</button>)}</div>
   <div className="tracking-legend">{series.map(s=><span key={s.key}><i className={'tracking-key '+s.key}/>{s.label}</span>)}</div>
   {hasData?<><div className="monthly-chart-scroll" ref={container}>
    <svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`} role="group" aria-label="Perbandingan budget, terpakai, dan sisa tiap bulan. Pilih bulan untuk melihat angkanya.">
     <defs><pattern id="tracking-over-pattern" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(35)"><line x1="0" x2="0" y1="0" y2="5" stroke="#b42332" strokeWidth="2"/></pattern></defs>
     {ticks.map(t=><g key={t}><line x1={left} x2={chartWidth-right} y1={y(t)} y2={y(t)} stroke={t===0?'#889bb7':'#dce3ef'} strokeDasharray={t===0?undefined:'3 4'}/><text x={left-7} y={y(t)+4} textAnchor="end" className="tracking-axis">{axisLabel(t)}</text></g>)}
     {points.map((p,i)=>{const x=left+i*groupWidth+groupWidth/2,active=p.month===chosen?.month;return <g key={p.month} role="button" tabIndex={0} aria-pressed={active} aria-label={label(p.month)+(recorded(p)?`, budget ${money(p.budget)}, terpakai ${money(p.spent)}, sisa ${money(p.remaining)}`:', belum ada catatan')} onClick={()=>setSelected(p.month)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.month)}}} className={'tracking-month'+(active?' selected':'')}>
      <rect x={left+i*groupWidth+2} y={top-7} width={groupWidth-4} height={height-bottom-top+14} rx="8" className="tracking-column-highlight"/>
      {recorded(p)?series.map((s,index)=>{const amount=p[s.key],negative=amount<0;return <rect key={s.key} x={x+(index-1.5)*barWidth+1} y={Math.min(y(amount),zero)} width={barWidth-2} height={amount===0?0:Math.max(1,Math.abs(y(amount)-zero))} rx="2" className={'tracking-bar '+s.key+(negative?' overspent':'')} fill={negative?'url(#tracking-over-pattern)':undefined}/> }):<text x={x} y={zero-10} textAnchor="middle" className="tracking-axis">—</text>}
      <rect x={x-19} y={height-bottom+9} width="38" height="24" rx="7" className="tracking-month-pill"/><text x={x} y={height-bottom+25} textAnchor="middle" className="tracking-month-label">{new Date(p.month+'-01T12:00:00').toLocaleDateString('id-ID',{month:'short'})}</text>
     </g>})}
    </svg>
   </div><p className="tracking-chart-hint">Ketuk bulan untuk lihat angkanya.{range===12?' Geser grafik untuk lihat bulan lainnya.':''}</p></>:<div className="tracking-empty"><BozImage pose="glass" alt=""/><h3>Belum ada budget atau pengeluaran</h3><p>{onOpenMonth?'Grafik akan muncul setelah kamu mulai mencatat pada rentang ini.':'Belum ada catatan yang dibagikan pada rentang ini.'}</p></div>}
   {chosen&&<div className="tracking-selection" aria-live="polite"><div className="tracking-selection-heading"><h3>{label(chosen.month)}</h3>{chosen.month>=currentMonth&&<span>{chosen.month===currentMonth?'Bulan berjalan':'Rencana'}</span>}</div>{recorded(chosen)?<><div className="tracking-numbers">{series.map(s=><div key={s.key}><span>{s.label}</span><strong className={s.key==='spent'?'expense-amount':s.key==='remaining'&&chosen.remaining<0?'negative':''}>{money(chosen[s.key])}</strong></div>)}</div><p className="tracking-status">{chosen.remaining<0?'Lewat budget '+money(-chosen.remaining):chosen.budget>0?Math.round(chosen.spent/chosen.budget*100)+'% budget sudah terpakai':'Pengeluaran tercatat tanpa alokasi budget.'} · {chosen.expenseCount} transaksi</p></>:<p>Belum ada catatan di bulan ini.</p>}{onOpenMonth&&<button className="secondary full" onClick={()=>onOpenMonth(chosen.month)}>Lihat rincian {new Date(chosen.month+'-01T12:00:00').toLocaleDateString('id-ID',{month:'long'})}</button>}</div>}
  </section>
  <section className="panel tracking-month-list" aria-label="Ringkasan setiap bulan"><h2>Ringkasan tiap bulan</h2><div className="tracking-table-head" aria-hidden="true"><span>Bulan</span><span>Budget</span><span>Terpakai</span><span>Sisa</span></div>{[...points].reverse().map(p=><button key={p.month} className={'tracking-table-row'+(p.month===chosen?.month?' selected':'')} onClick={()=>setSelected(p.month)} aria-label={'Lihat angka '+label(p.month)} aria-pressed={p.month===chosen?.month}><strong>{label(p.month,true)}{p.month===currentMonth&&<small>Berjalan</small>}{p.month>currentMonth&&<small>Rencana</small>}</strong>{recorded(p)?<><span>{money(p.budget)}</span><span className="expense-amount">{money(p.spent)}</span><span className={p.remaining<0?'negative':''}>{money(p.remaining)}</span></>:<span className="tracking-no-record">Belum ada catatan</span>}</button>)}<p className="tracking-footnote">Setiap bulan dihitung sendiri. Sisa tidak dibawa ke bulan berikutnya. Budget dan transaksi yang diarsipkan tetap masuk hitungan.</p></section>
 </div>
}
