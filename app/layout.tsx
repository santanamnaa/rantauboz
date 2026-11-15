import type {Metadata,Viewport} from 'next';
import {pageMetadata,siteUrl} from '../lib/site-metadata';
import './globals.css';
import './theme.css';
import ThemeControl from './theme-control';
import {themeBootstrap} from '../lib/theme-bootstrap';
export const metadata:Metadata={...pageMetadata('app','/'),metadataBase:new URL(siteUrl),applicationName:'Rantau Boz',category:'finance',referrer:'strict-origin-when-cross-origin',icons:{apple:[{url:'/assets/boz-face-180.png',sizes:'180x180',type:'image/png'}],icon:[{url:'/favicon.ico?v=boz-adaptive-1',sizes:'any'},{url:'/assets/boz-face-32.png',sizes:'32x32',type:'image/png'},{url:'/assets/boz-face-16.png',sizes:'16x16',type:'image/png'},{url:'/assets/boz-favicon-adaptive.svg?v=1',sizes:'any',type:'image/svg+xml'}]},appleWebApp:{capable:true,statusBarStyle:'default',title:'Rantau Boz'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#ffffff'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeBootstrap}}/><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/></head><body><ThemeControl/>{children}</body></html>}
