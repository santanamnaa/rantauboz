'use client';
import {useEffect,useState,type ReactNode,type FormEvent} from 'react';
import BozImage from './boz-image';
import {deviceRequest,useDeviceSharing} from './device-sharing';

type Own={shareLocation:boolean;shareBattery:boolean;expiresAt:string|null;sessionId:string|null};
type Peer={sharingLocation:boolean;sharingBattery:boolean;expiresAt:string|null;location:{latitude:number;longitude:number;accuracy:number;observedAt:string}|null;battery:{percent:number;charging:boolean;observedAt:string}|null};
type Status={own:Own;peer:Peer};
const time=(value:string)=>new Date(value).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
function sampleLabel(at:string,now:number){const age=Math.max(0,Math.floor((now-Date.parse(at))/60000));return age<1?'Diperbarui barusan':age+' menit lalu · '+time(at)}
export default function FriendDeviceCard({id,name,sheet}:{id:string;name:string;sheet:(title:string,body:ReactNode,onClose:()=>void)=>ReactNode}){
 const sharing=useDeviceSharing();
 const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(''),[editing,setEditing]=useState(false),[shareLocation,setShareLocation]=useState(false),[shareBattery,setShareBattery]=useState(false),[formError,setFormError]=useState(''),[refresh,setRefresh]=useState(0),[now,setNow]=useState(Date.now());
 useEffect(()=>{
  let active=true;const controller=new AbortController();
  async function load(){if(document.visibilityState!=='visible')return;try{const value=await deviceRequest(id,undefined,undefined,controller.signal);if(active){setStatus(value);setError('');setNow(Date.now())}}catch(e){if(active&&!controller.signal.aborted){setStatus(null);setError(e instanceof Error?e.message:'Data perangkat belum tersedia.')}}}
  const onVisible=()=>{setStatus(null);void load()};
  void load();const timer=setInterval(()=>{setNow(Date.now());void load()},60000);document.addEventListener('visibilitychange',onVisible);window.addEventListener('online',onVisible);
  return()=>{active=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('online',onVisible)};
 },[id,sharing.revision,refresh]);
 const live=!!status?.peer.expiresAt&&Date.parse(status.peer.expiresAt)>now;
 const loc=live?status?.peer.location:null,battery=live?status?.peer.battery:null;
 const own=!!status?.own.expiresAt&&Date.parse(status.own.expiresAt)>now&&(status.own.shareLocation||status.own.shareBattery);
 function open(){if(!status)return;setShareLocation(own&&status.own.shareLocation);setShareBattery(own&&status.own.shareBattery&&sharing.batterySupported);setFormError('');setEditing(true)}
 async function submit(e:FormEvent){e.preventDefault();setFormError('');try{if(!shareLocation&&!shareBattery)throw new Error('Pilih lokasi atau baterai yang ingin kamu bagikan.');await sharing.start(id,shareLocation,shareBattery);setEditing(false);setRefresh(n=>n+1)}catch(e){setFormError(e instanceof Error?e.message:'Belum tersimpan.')}}
 async function stop(){setFormError('');try{await sharing.stop(id);setEditing(false);setRefresh(n=>n+1)}catch(e){setFormError(e instanceof Error?e.message:'Belum tersimpan.')}}
 const locationFresh=!!loc&&now-Date.parse(loc.observedAt)<=15*60000;
 const mapLatitude=loc?Math.max(-85,Math.min(85,loc.latitude)):0;
 const mapUrl=locationFresh?'https://www.openstreetmap.org/export/embed.html?'+new URLSearchParams({bbox:[Math.max(-180,loc!.longitude-.008),Math.max(-85.0511,mapLatitude-.005),Math.min(180,loc!.longitude+.008),Math.min(85.0511,mapLatitude+.005)].join(','),layer:'mapnik',marker:loc!.latitude+','+loc!.longitude}).toString():null;
 const batteryFresh=!!battery&&now-Date.parse(battery.observedAt)<=15*60000;
 const dialog=<form className="device-sharing-form" onSubmit={submit} aria-busy={sharing.busy}>
  <p>Bagikan ke <strong>{name}</strong> selama <strong>1 jam</strong>. Pilih yang boleh dia lihat.</p>
  <label className={'device-option '+(shareLocation?'selected':'')}><input type="checkbox" checked={shareLocation} onChange={e=>setShareLocation(e.target.checked)} disabled={sharing.busy}/><span><strong>Bagikan lokasiku</strong><small>Perlu izin lokasi dari browser.</small></span></label>
  <label className={'device-option '+(shareBattery?'selected ':'')+(!sharing.batterySupported?'unavailable':'')}><input type="checkbox" checked={shareBattery} onChange={e=>setShareBattery(e.target.checked)} disabled={sharing.busy||!sharing.batterySupported}/><span><strong>Bagikan baterai HP</strong><small>{sharing.batterySupported?'Persentase dan status pengisian.':'Browser ini tidak menyediakan informasi baterai. Biasanya tidak tersedia di iPhone.'}</small></span></label>
  <p className="device-privacy">Diperbarui saat aplikasi terbuka. Bisa kamu hentikan kapan saja.</p>
  <details className="device-info"><summary>Cara data dibagikan</summary><p>Izin ini terpisah dari budget. Hanya satu lokasi terakhir yang disimpan, bukan riwayat perjalanan. Data dikirim dari browser tempat kamu mengaktifkan berbagi; pembaruan berhenti saat aplikasi ditutup atau masuk latar belakang.</p></details>
  {formError&&<p className="error" role="alert">{formError}</p>}
  <button className="primary full" disabled={sharing.busy}>{sharing.busy?'Menyimpan…':own?'Perbarui berbagi 1 jam':'Mulai berbagi 1 jam'}</button>
  {own&&<button className="subtle danger full" type="button" disabled={sharing.busy} onClick={()=>void stop()}>Hentikan berbagi ke {name}</button>}
 </form>;
 return <>
  <section className="panel friend-device-card" aria-label={'Lokasi dan baterai '+name}>
   <div className="device-heading"><BozImage pose="travel"/><div><h2>Lokasi & baterai</h2><p>Dari perangkat {name}</p></div><button className="subtle" onClick={()=>setRefresh(n=>n+1)}>Perbarui</button></div>
   {error?<div className="device-empty" role="status"><p>{error}</p><button className="subtle" onClick={()=>setRefresh(n=>n+1)}>Coba lagi</button></div>:!status?<p className="device-caption" role="status">Memuat data perangkat…</p>:<div className="device-status-grid">
    <div className="device-location"><span>Lokasi terakhir</span>{locationFresh?<>
     <strong className="device-unavailable">Lokasi dibagikan</strong>
     <small>{sampleLabel(loc!.observedAt,now)}</small>
     {now-Date.parse(loc!.observedAt)>120000&&<small className="device-stale">Data lama, bukan lokasi langsung.</small>}
     <details className="device-location-detail"><summary>Detail lokasi</summary><small>{loc!.latitude.toFixed(5)}, {loc!.longitude.toFixed(5)}<br/>Akurasi sekitar {Math.round(loc!.accuracy)} meter</small></details>
    </>:<><strong className="device-unavailable">{live&&status.peer.sharingLocation?'Menunggu lokasi':'Tidak dibagikan'}</strong><small>{live&&status.peer.sharingLocation?'Menunggu aplikasi teman aktif.':name+' belum berbagi lokasi.'}</small></>}</div>
    <div className="device-battery"><span>Baterai HP</span>{batteryFresh?<>
     <strong className="device-battery-value">{battery!.percent}<span>%</span></strong>
     <div className="device-battery-meter" role="meter" aria-label="Persentase baterai teman" aria-valuenow={battery!.percent} aria-valuemin={0} aria-valuemax={100}><i style={{width:battery!.percent+'%'}}/></div>
     <small>{battery!.charging?'Sedang diisi':'Tidak sedang diisi'}</small><small>{sampleLabel(battery!.observedAt,now)}</small>
     {now-Date.parse(battery!.observedAt)>120000&&<small className="device-stale">Data lama.</small>}
    </>:<><strong className="device-unavailable">{live&&status.peer.sharingBattery?'Belum tersedia':'Tidak dibagikan'}</strong><small>{live&&status.peer.sharingBattery?'Menunggu data browser teman.':name+' belum berbagi baterai.'}</small></>}</div>
   </div>}
   {mapUrl&&<div className="device-map"><iframe title={'Peta lokasi terakhir '+name} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin"/><span>Peta lokasi terakhir · OpenStreetMap</span></div>}
   <div className="device-own-sharing"><span>{own?<><strong>Kamu sedang berbagi</strong><small>Sampai {time(status!.own.expiresAt!)}</small></>:<><strong>Data HP kamu</strong><small>Belum dibagikan ke {name}</small></>}</span><button className="secondary" aria-label="Atur yang kubagikan" onClick={open} disabled={!status||sharing.busy}>Atur berbagi</button></div>
   <details className="device-info device-data-note"><summary>Tentang pembaruan data</summary><p>Lokasi dan baterai diperbarui saat aplikasi teman terbuka. Data lebih dari 15 menit disembunyikan. Berbagi budget tidak otomatis membuka data perangkat.</p></details>
  </section>
  {editing&&sheet('Bagikan lokasi & baterai',dialog,()=>{if(!sharing.busy)setEditing(false)})}
 </>;
}
