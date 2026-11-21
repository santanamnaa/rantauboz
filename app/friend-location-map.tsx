'use client';
import {useEffect,useRef,useState} from 'react';
import {Map,Marker,type GeoJSONSource} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type Props={latitude:number;longitude:number;accuracy:number;name:string};
const style=()=> 'https://tiles.openfreemap.org/styles/'+(document.documentElement.dataset.theme==='dark'?'dark':'positron');
function accuracyArea(latitude:number,longitude:number,accuracy:number){
 const latitudeScale=111320,longitudeScale=latitudeScale*Math.max(.01,Math.cos(latitude*Math.PI/180));
 const radius=Math.min(accuracy,100000),coordinates=Array.from({length:65},(_,i)=>{const angle=i/64*2*Math.PI;return[longitude+Math.cos(angle)*radius/longitudeScale,Math.max(-85,Math.min(85,latitude+Math.sin(angle)*radius/latitudeScale))]});
 return {type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[coordinates]}};
}
export default function FriendLocationMap(props:Props){
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<Map|null>(null),markerRef=useRef<Marker|null>(null),latest=useRef(props),following=useRef(true);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[follow,setFollow]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{latest.current=props;const map=mapRef.current,marker=markerRef.current;if(!map||!marker)return;const position:[number,number]=[props.longitude,Math.max(-85,Math.min(85,props.latitude))];marker.setLngLat(position);(map.getSource('friend-accuracy') as GeoJSONSource|undefined)?.setData(accuracyArea(props.latitude,props.longitude,props.accuracy));if(following.current)map.easeTo({center:position,duration:800,essential:false})},[props.latitude,props.longitude,props.accuracy,props.name]);
 useEffect(()=>{
  if(!container.current)return;
  let disposed=false,map:Map|undefined,lastStyle=style();setReady(false);setFailed(false);
  const timeout=setTimeout(()=>{if(!disposed)setFailed(true)},20000);
  try{
   const first=latest.current;
   map=new Map({container:container.current,style:lastStyle,center:[first.longitude,Math.max(-85,Math.min(85,first.latitude))],zoom:15,attributionControl:{compact:true},maplibreLogo:false,dragRotate:false,pitchWithRotate:false,scrollZoom:false,renderWorldCopies:false,transformRequest:url=>({url,credentials:'same-origin',referrerPolicy:'no-referrer'})});
   mapRef.current=map;
   const pin=document.createElement('div');pin.className='friend-location-pin';pin.textContent=first.name.trim().slice(0,1).toUpperCase()||'B';pin.setAttribute('aria-label','Lokasi '+first.name);pin.setAttribute('role','img');
   markerRef.current=new Marker({element:pin}).setLngLat([first.longitude,Math.max(-85,Math.min(85,first.latitude))]).addTo(map);
   map.on('style.load',()=>{if(disposed||!map)return;const p=latest.current;map.addSource('friend-accuracy',{type:'geojson',data:accuracyArea(p.latitude,p.longitude,p.accuracy)});map.addLayer({id:'friend-accuracy-fill',type:'fill',source:'friend-accuracy',paint:{'fill-color':'#2454db','fill-opacity':.1}});map.addLayer({id:'friend-accuracy-line',type:'line',source:'friend-accuracy',paint:{'line-color':'#2454db','line-width':1,'line-opacity':.4}});setReady(true);setFailed(false);clearTimeout(timeout)});
   map.on('idle',()=>{if(!disposed){setReady(true);setFailed(false);clearTimeout(timeout)}});
   map.on('error',()=>{if(!disposed)setFailed(true)});
   map.on('dragstart',()=>{following.current=false;setFollow(false)});
   map.touchZoomRotate.disableRotation();
  }catch{setFailed(true);clearTimeout(timeout)}
  const observer=new MutationObserver(()=>{const nextStyle=style();if(map&&!disposed&&nextStyle!==lastStyle){lastStyle=nextStyle;setReady(false);setFailed(false);map.setStyle(nextStyle,{diff:false})}});observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const resize=new ResizeObserver(()=>map?.resize());resize.observe(container.current);
  return()=>{disposed=true;clearTimeout(timeout);observer.disconnect();resize.disconnect();markerRef.current?.remove();markerRef.current=null;map?.remove();mapRef.current=null};
 },[retry]);
 function center(){following.current=true;setFollow(true);mapRef.current?.easeTo({center:[latest.current.longitude,Math.max(-85,Math.min(85,latest.current.latitude))],zoom:15,duration:600,essential:false})}
 return <div className="device-map friend-live-map" aria-label={'Peta lokasi '+props.name}>
  <div className="friend-map-canvas" ref={container}/>
  <div className="friend-map-actions"><button type="button" onClick={center} aria-pressed={follow}>{follow?'Mengikuti lokasi':'Pusatkan lokasi'}</button><div><button type="button" aria-label="Perbesar peta" onClick={()=>mapRef.current?.zoomIn()}>+</button><button type="button" aria-label="Perkecil peta" onClick={()=>mapRef.current?.zoomOut()}>−</button></div></div>
  {!ready&&!failed&&<p className="friend-map-status" role="status">Memuat peta…</p>}
  {failed&&<div className="friend-map-status" role="status"><span>Peta belum termuat. Coba periksa koneksi.</span><button type="button" onClick={()=>setRetry(n=>n+1)}>Muat ulang peta</button></div>}
 </div>;
}
