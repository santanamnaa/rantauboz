import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'rantauboz — Budget bulanan',description:'Atur rekening, budget bulanan, dan pengeluaran harian.',manifest:'/manifest.webmanifest',icons:{apple:[{url:'/assets/boz-face-180.png',sizes:'180x180',type:'image/png'}],icon:[{url:'/favicon.ico?v=boz-face-1',sizes:'any'},{url:'/assets/boz-face-32.png',sizes:'32x32',type:'image/png'},{url:'/assets/boz-face-16.png',sizes:'16x16',type:'image/png'}]},appleWebApp:{capable:true,statusBarStyle:'default',title:'rantauboz'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#172e59'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
