import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'rantauboz — Budget bulanan',description:'Atur rekening, budget bulanan, dan pengeluaran harian.',manifest:'/manifest.webmanifest',icons:{apple:'/assets/app-180.png',icon:'/assets/app-192.png'},appleWebApp:{capable:true,statusBarStyle:'default',title:'rantauboz'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#172e59'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
