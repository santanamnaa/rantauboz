import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {shareCards,type ShareKind} from '../../../lib/site-metadata';
export const runtime='nodejs';
export const revalidate=86400;
export async function GET(_req:Request,{params}:{params:Promise<{kind:string}>}){
 const {kind:part}=await params,kind=part.replace(/\.png$/,'') as ShareKind;
 if(!Object.hasOwn(shareCards,kind))return new Response('Not found',{status:404});
 const card=shareCards[kind];
 const [regular,bold,face]=await Promise.all([readFile(join(process.cwd(),'public/assets/sans.woff')),readFile(join(process.cwd(),'public/assets/semibold.woff')),readFile(join(process.cwd(),'public/assets/boz-face-512.png'))]);
 return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',background:'#193f9b',fontFamily:'Rantau',color:'#f5f1df',padding:'52px 64px',position:'relative',overflow:'hidden'}}>
  <div style={{display:'flex',flexDirection:'column',width:730,position:'relative'}}>
   <div style={{display:'flex',alignItems:'center',fontSize:27,letterSpacing:-1}}>rantau<span style={{fontWeight:600}}>boz.</span></div>
   <div style={{display:'flex',fontSize:14,letterSpacing:2.5,color:'#d5def5',marginTop:36}}>{card.label}</div>
   <div style={{display:'flex',flexDirection:'column',fontWeight:600,fontSize:kind==='story'?70:78,lineHeight:1.05,letterSpacing:-4,marginTop:19}}>{card.headline.split('\n').map(line=><div style={{display:'flex'}} key={line}>{line}</div>)}</div>
   <div style={{display:'flex',flexDirection:'column',fontSize:23,lineHeight:1.5,letterSpacing:-.3,color:'#e5eafa',marginTop:25}}>{card.caption.split('\n').map(line=><div style={{display:'flex'}} key={line}>{line}</div>)}</div>
   <div style={{display:'flex',fontSize:16,color:'#c0ceed',marginTop:'auto'}}>rantauboz.vercel.app</div>
  </div>
  <div style={{display:'flex',position:'absolute',width:347,height:347,right:-18,top:133,borderRadius:110,background:'#f5f1df',transform:'rotate(-8deg)',border:'10px solid #3156aa'}}><img src={'data:image/png;base64,'+face.toString('base64')} width={327} height={327} style={{width:327,height:327,borderRadius:100}} alt=""/></div>
  <div style={{display:'flex',position:'absolute',right:70,bottom:63,fontSize:17,color:'#d5def5'}}>Boz, teman di perantauan.</div>
 </div>,{width:1200,height:630,fonts:[{name:'Rantau',data:regular,weight:400},{name:'Rantau',data:bold,weight:600}],headers:{'Cache-Control':'public, max-age=86400, s-maxage=86400'}});
}
