'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import './device-sharing.css';

export type DeviceGrant={id:string;name:string;sessionId:string;shareLocation:boolean;shareBattery:boolean;expiresAt:string};
type BatteryNavigator=Navigator&{getBattery?:()=>Promise<{level:number;charging:boolean}>};
type SharingContext={shares:DeviceGrant[];busy:boolean;error:string;sensorIssue:string;batterySupported:boolean;revision:number;refresh:()=>void;start:(id:string,location:boolean,battery:boolean)=>Promise<void>;stop:(id?:string)=>Promise<void>};
const Context=createContext<SharingContext|null>(null);
const pauseKey='rantauboz-device-sharing-paused',changeKey='rantauboz-device-sharing-change',sessionsKey='rantauboz-device-sharing-sessions';
function readSessions():Record<string,string>{
 try{
  const value=JSON.parse(localStorage.getItem(sessionsKey)||'{}');
  if(!value||typeof value!=='object')return{};
  const sessions:Record<string,string>={};
  for(const [id,session] of Object.entries(value)){
   if(/^[a-f0-9-]{36}$/i.test(id)&&typeof session==='string'&&/^[a-f0-9-]{36}$/i.test(session))sessions[id]=session;
  }
  return sessions;
 }catch{return{}}
}
function writeSessions(value:Record<string,string>){try{localStorage.setItem(sessionsKey,JSON.stringify(value))}catch{/* This tab can still share; it will not auto-resume after a reload. */}}
export async function deviceRequest(connection?:string,action?:string,data?:unknown,signal?:AbortSignal){
 const res=await fetch('/api/friends/device'+(connection?'?connection='+encodeURIComponent(connection):''),action?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data}),cache:'no-store',signal}:{cache:'no-store',signal});
 const value=await res.json();if(!res.ok)throw new Error(value.error||'Data perangkat belum bisa dimuat.');return value;
}
const pausedLocally=()=>{try{return localStorage.getItem(pauseKey)==='true'}catch{return false}};
function setPause(paused:boolean){try{if(paused)localStorage.setItem(pauseKey,'true');else localStorage.removeItem(pauseKey)}catch{/* The in-memory pause still prevents capture in this tab. */}}
function notifyTabs(){try{localStorage.setItem(changeKey,Date.now()+'-'+Math.random())}catch{}}
function locationSample():Promise<{value:unknown;issue:string}>{
 if(!navigator.geolocation)return Promise.resolve({value:null,issue:'Browser ini tidak menyediakan lokasi.'});
 return new Promise(resolve=>navigator.geolocation.getCurrentPosition(pos=>resolve({value:{latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy,observedAt:new Date(pos.timestamp).toISOString()},issue:''}),error=>resolve({value:null,issue:error.code===1?'Izin lokasi belum diberikan. Aktifkan izin lokasi di pengaturan browser.':error.code===3?'Lokasi belum terbaca. Coba di tempat dengan sinyal lebih baik.':'Lokasi belum tersedia dari perangkat ini.'}),{enableHighAccuracy:false,maximumAge:0,timeout:12000}));
}
async function batterySample():Promise<{value:unknown;issue:string}>{
 const nav=navigator as BatteryNavigator;if(!nav.getBattery)return{value:null,issue:'Browser ini tidak menyediakan informasi baterai.'};
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{
  const battery=await Promise.race([nav.getBattery(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error()),5000)})]);
  if(!Number.isFinite(battery.level)||battery.level<0||battery.level>1)throw new Error();
  return{value:{percent:Math.round(battery.level*100),charging:battery.charging,observedAt:new Date().toISOString()},issue:''};
 }catch{return{value:null,issue:'Informasi baterai belum tersedia dari browser.'}}finally{clearTimeout(timeout)}
}
export function DeviceSharingProvider({accountKey,children}:{accountKey:string;children:ReactNode}){
 const [shares,setShares]=useState<DeviceGrant[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sensorIssue,setSensorIssue]=useState(''),[batterySupported,setBatterySupported]=useState(false),[revision,setRevision]=useState(0);
 const epoch=useRef(0),paused=useRef(false),mutating=useRef(false),localSessions=useRef<Record<string,string>>({});
 useEffect(()=>{setBatterySupported(typeof (navigator as BatteryNavigator).getBattery==='function')},[]);
 useEffect(()=>{
  setShares([]);setError('');setSensorIssue('');paused.current=pausedLocally();localSessions.current=readSessions();
 },[accountKey]);
 useEffect(()=>{
  if(!accountKey)return;
  let disposed=false,running=false;const controller=new AbortController();
  const valid=(seq:number)=>!disposed&&epoch.current===seq&&!mutating.current&&document.visibilityState==='visible';
  async function update(){
   if(disposed||running||mutating.current||document.visibilityState!=='visible')return;
   running=true;const seq=epoch.current;
   try{
    if(paused.current||pausedLocally()){
     await deviceRequest(undefined,'stopAll',{},controller.signal);
     if(!valid(seq))return;paused.current=false;setPause(false);localSessions.current={};writeSessions({});setShares([]);setError('');setSensorIssue('');notifyTabs();return;
    }
    if(!Object.keys(localSessions.current).length){setShares([]);setError('');setSensorIssue('');return}
    const result=await deviceRequest(undefined,undefined,undefined,controller.signal);
    if(!valid(seq))return;
    const active:DeviceGrant[]=result.shares.filter((g:DeviceGrant)=>Date.parse(g.expiresAt)>Date.now()&&localSessions.current[g.id]===g.sessionId);
    const validSessions=Object.fromEntries(active.map(g=>[g.id,g.sessionId]));
    if(Object.keys(validSessions).length!==Object.keys(localSessions.current).length){localSessions.current=validSessions;writeSessions(validSessions)}
    setShares(active);setError('');if(!active.length){setSensorIssue('');return}
    const needLocation=active.some(g=>g.shareLocation),needBattery=active.some(g=>g.shareBattery);
    const [location,battery]=await Promise.all([needLocation?locationSample():Promise.resolve({value:null,issue:''}),needBattery?batterySample():Promise.resolve({value:null,issue:''})]);
    if(!valid(seq)||paused.current||pausedLocally())return;
    setSensorIssue([location.issue,battery.issue].filter(Boolean).join(' '));
    const readings=active.map(g=>({connectionId:g.id,sessionId:g.sessionId,...(g.shareLocation?{location:location.value}:{}),...(g.shareBattery?{battery:battery.value}:{})}));
    await deviceRequest(undefined,'publish',{readings},controller.signal);
   }catch(e){if(!disposed&&!controller.signal.aborted&&epoch.current===seq)setError(paused.current?'Penghentian belum tersimpan. Pengiriman dari HP ini sudah dijeda. Coba Hentikan semua lagi.':e instanceof Error?e.message:'Data perangkat belum diperbarui.')}finally{running=false}
  }
  const onVisible=()=>{epoch.current++;if(document.visibilityState==='visible')void update()};
  const onStorage=(event:StorageEvent)=>{if(event.key===pauseKey||event.key===changeKey||event.key===sessionsKey){epoch.current++;paused.current=pausedLocally();localSessions.current=readSessions();setRevision(n=>n+1)}};
  void update();const timer=setInterval(()=>void update(),60000);
  document.addEventListener('visibilitychange',onVisible);window.addEventListener('online',onVisible);window.addEventListener('storage',onStorage);
  return()=>{disposed=true;epoch.current++;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('online',onVisible);window.removeEventListener('storage',onStorage)};
 },[accountKey,revision]);
 async function start(id:string,location:boolean,battery:boolean){
  if(mutating.current)throw new Error('Tunggu penyimpanan sebelumnya selesai.');
  mutating.current=true;epoch.current++;setBusy(true);setError('');
  try{
   if(paused.current||pausedLocally())await deviceRequest(undefined,'stopAll',{});
   const result=await deviceRequest(undefined,'start',{connectionId:id,shareLocation:location,shareBattery:battery,consent:true});
   localSessions.current={...localSessions.current,[id]:result.own.sessionId};writeSessions(localSessions.current);
   paused.current=false;setPause(false);notifyTabs();setRevision(n=>n+1);
  }catch(e){throw e}finally{mutating.current=false;setBusy(false)}
 }
 async function stop(id?:string){
  if(mutating.current)throw new Error('Tunggu penyimpanan sebelumnya selesai.');
  mutating.current=true;epoch.current++;paused.current=true;setPause(true);setBusy(true);setError('');
  try{
   await deviceRequest(undefined,id?'stop':'stopAll',id?{connectionId:id}:{});
   if(id){delete localSessions.current[id]}else{localSessions.current={}}writeSessions(localSessions.current);
   setShares(current=>id?current.filter(g=>g.id!==id):[]);paused.current=false;setPause(false);setSensorIssue('');notifyTabs();setRevision(n=>n+1);
  }catch(e){const message='Penghentian belum tersimpan. Pengiriman dari HP ini sudah dijeda. Coba Hentikan semua lagi.';setError(message);throw new Error(message)}finally{mutating.current=false;setBusy(false)}
 }
 return <Context.Provider value={{shares,busy,error,sensorIssue,batterySupported,revision,refresh:()=>{epoch.current++;setRevision(n=>n+1)},start,stop}}>{children}</Context.Provider>;
}
export function useDeviceSharing(){const context=useContext(Context);if(!context)throw new Error('Device sharing requires its provider');return context}
export function DeviceSharingBanner(){
 const {shares,busy,error,sensorIssue,stop}=useDeviceSharing();
 if(!shares.length&&!error)return null;
 return <aside className="device-sharing-banner" aria-label="Status berbagi perangkat"><div><strong>{shares.length?'Berbagi '+[shares.some(g=>g.shareLocation)?'lokasi':'',shares.some(g=>g.shareBattery)?'baterai':''].filter(Boolean).join(' & ')+' · '+shares.length+' teman':'Berbagi perangkat dijeda'}</strong><small>{error||sensorIssue||'Aktif saat aplikasi terbuka. Sesi berakhir otomatis setelah 1 jam.'}</small></div><button type="button" disabled={busy} onClick={()=>void stop().catch(()=>{})}>{busy?'Menyimpan…':'Hentikan semua'}</button></aside>;
}
