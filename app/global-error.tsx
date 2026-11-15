'use client';
import ThemeControl from './theme-control';
import {themeBootstrap} from '../lib/theme-bootstrap';
import './globals.css';
import './theme.css';
export default function GlobalError({retry}:{retry:()=>void}){return <html lang="id" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeBootstrap}}/></head><body><ThemeControl/><main className="app-status-page"><img src="/assets/boz-face-180.png" alt="Boz"/><h1>Aplikasi belum bisa dibuka</h1><p>Coba muat ulang untuk melanjutkan.</p><button onClick={()=>retry()}>Coba lagi</button><a href="/">Ke halaman utama</a></main></body></html>}
