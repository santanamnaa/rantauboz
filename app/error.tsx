'use client';
import BozImage from './boz-image';
export default function ErrorPage({retry}:{retry:()=>void}){return <main className="app-status-page"><BozImage pose="glass"/><h1>Halaman belum bisa dibuka</h1><p>Coba muat ulang halaman ini. Catatan yang sudah tersimpan tetap ada.</p><button onClick={()=>retry()}>Coba lagi</button><a href="/">Ke halaman utama</a></main>}
