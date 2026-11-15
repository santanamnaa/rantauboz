'use client';

import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';

type ThemePreference='light'|'dark'|'system';
const storageKey='rantauboz-theme';
const valid=(value:unknown):ThemePreference=>value==='light'||value==='dark'?value:'system';


function applyTheme(preference:ThemePreference){
  const dark=preference==='dark'||(preference==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  const root=document.documentElement;
  root.dataset.theme=dark?'dark':'light';
  root.dataset.themePreference=preference;
  root.style.colorScheme=dark?'dark':'light';
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta=>{
    const color=dark?'#0b1425':'#ffffff';
    if(meta.content!==color)meta.content=color;
    if(meta.hasAttribute('media'))meta.removeAttribute('media');
  });
}

export default function ThemeControl(){
  const [preference,setPreference]=useState<ThemePreference>('system');
  const pathname=usePathname();
  useEffect(()=>{
    let current=valid(document.documentElement.dataset.themePreference);
    setPreference(current);
    applyTheme(current);
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange=()=>{if(current==='system')applyTheme(current)};
    const onStorage=(event:StorageEvent)=>{if(event.key===storageKey||event.key===null){current=valid(event.newValue);setPreference(current);applyTheme(current)}};
    const onPreference=()=>{current=valid(document.documentElement.dataset.themePreference)};
    const observer=new MutationObserver(()=>applyTheme(current));
    observer.observe(document.head,{childList:true,subtree:true,attributes:true,attributeFilter:['content','name']});
    media.addEventListener('change',onSystemChange);
    window.addEventListener('storage',onStorage);
    window.addEventListener('rantauboz-theme-change',onPreference);
    return()=>{observer.disconnect();media.removeEventListener('change',onSystemChange);window.removeEventListener('storage',onStorage);window.removeEventListener('rantauboz-theme-change',onPreference)};
  },[]);
  useEffect(()=>{applyTheme(valid(document.documentElement.dataset.themePreference))},[pathname]);
  function change(value:string){
    const next=valid(value);
    setPreference(next);
    try{localStorage.setItem(storageKey,next)}catch{/* The selection remains usable for this page when storage is blocked. */}
    applyTheme(next);
    window.dispatchEvent(new Event('rantauboz-theme-change'));
  }
  return <div className="theme-toolbar"><div className="theme-toolbar-inner"><label htmlFor="app-theme">Tampilan</label><select id="app-theme" value={preference} onChange={event=>change(event.target.value)} aria-label="Tema tampilan"><option value="light">Terang</option><option value="dark">Gelap</option><option value="system">Ikuti perangkat</option></select></div></div>;
}
