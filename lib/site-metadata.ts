import type {Metadata} from 'next';
export const siteUrl='https://rantauboz.vercel.app';
export const brand='Rantau Boz';
export const shareCards={
 community:{title:'Ikut rawat Rantau Boz — Lewat ide, kode, atau traktiran.',description:'Lahir dari pengalaman anak rantau. Bantu merawat Rantau Boz lewat masukan, kontribusi pengembangan, atau dukungan untuk biaya aplikasi dan waktu pembuatnya.',headline:'Ikut rawat\nRantau Boz.',caption:'Lewat ide, kode, atau traktiran.\nPilih cara yang cocok buatmu.',label:'DARI ANAK RANTAU, DIRAWAT BARENG',alt:'Boz mengajakmu ikut merawat Rantau Boz lewat ide, kontribusi, atau dukungan sukarela.'},
 app:{title:'Rantau Boz — Atur uang, jalani rantau.',description:'Pisahkan rekening, atur budget bulanan, dan catat pengeluaran. Lihat budget, terpakai, dan sisa dari bulan ke bulan.',headline:'Uang bulanan,\njelas ke mana.',caption:'Atur budget. Catat pengeluaran.\nLihat sisanya dari bulan ke bulan.',label:'CATATAN UANG ANAK RANTAU',alt:'Boz mengajak anak rantau mengatur budget dan mencatat pengeluaran.'},
 story:{title:'Cerita Boz — Dari ribetnya merantau, jadi lebih teratur.',description:'Kenalan dengan Boz dan cerita di balik Rantau Boz. Dari makan, ongkos, sampai kost—catat satu-satu, biar uang bulanan lebih jelas.',headline:'Jauh dari rumah.\nTetap teratur.',caption:'Kenalan dengan Boz dan cerita\ndi balik Rantau Boz.',label:'CERITA BOZ',alt:'Cerita Boz, maskot Rantau Boz yang menemani anak rantau mengatur uang.'},
 invite:{title:'Kamu diundang jadi Teman Rantau — Rantau Boz',description:'Terima undangan untuk pantau budget bareng. Kamu pilih sendiri apa yang dibagikan. Rekening dan rincian transaksi tetap pribadi.',headline:'Jadi Teman\nRantau, yuk.',caption:'Pantau budget bareng.\nPilih sendiri apa yang dibagikan.',label:'UNDANGAN TEMAN RANTAU',alt:'Undangan Teman Rantau: pantau budget bareng, dengan pilihan berbagi masing-masing.'},
 login:{title:'Masuk ke catatanmu — Rantau Boz',description:'Masuk ke Rantau Boz untuk melanjutkan budget bulanan, mencatat pengeluaran, dan melihat perkembangan uangmu.',headline:'Lanjutkan\ncatatanmu.',caption:'Budget, pengeluaran, dan sisanya.\nSemuanya di catatanmu.',label:'MASUK KE RANTAU BOZ',alt:'Boz menyambutmu untuk masuk kembali ke catatan keuangan Rantau Boz.'},
 signup:{title:'Buat akun, mulai catat — Rantau Boz',description:'Buat akun Rantau Boz. Atur rekening dan budgetmu sendiri, lalu mulai catat pengeluaran sehari-hari.',headline:'Mulai catat,\nbareng Boz.',caption:'Buat akun. Tentukan budgetmu.\nCatat pengeluaran pertama.',label:'MULAI PAKAI RANTAU BOZ',alt:'Boz mengajakmu membuat akun dan mulai mengatur budget di Rantau Boz.'}
} as const;
export type ShareKind=keyof typeof shareCards;
export function pageMetadata(kind:ShareKind,path:string,privatePage=false):Metadata{
 const card=shareCards[kind],url=new URL(path,siteUrl).toString(),image=new URL('/share/'+kind+'.png?v=1',siteUrl).toString();
 return {title:{absolute:card.title},description:card.description,alternates:{canonical:url},
 openGraph:{type:'website',locale:'id_ID',siteName:brand,title:card.title,description:card.description,url,images:[{url:image,width:1200,height:630,type:'image/png',alt:card.alt}]},
 twitter:{card:'summary_large_image',title:card.title,description:card.description,images:[{url:image,alt:card.alt}]},
 ...(privatePage?{robots:{index:false,follow:false,noarchive:true}}:{})};
}
