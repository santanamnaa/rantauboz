import {auth} from '../../lib/auth';
import {isContributionManager} from '../../lib/community-service';
import {redirect} from 'next/navigation';
import CommunityAdmin from '../community-admin';
export const dynamic='force-dynamic';
export const metadata={title:'Kelola kontribusi — Rantau Boz',robots:{index:false,follow:false},openGraph:null,twitter:null};
export default async function Page(){const {data:session}=await auth.getSession();if(!session?.user)redirect('/auth/sign-in?tujuan=kontribusi');if(!await isContributionManager(session.user.id))return <main className="community-access"><h1>Halaman pengelola</h1><p>Akun ini belum punya akses untuk membaca perkenalan yang masuk.</p><a href="/ikut-rawat">Kembali ke Ikut rawat Rantau Boz</a></main>;return <CommunityAdmin/>}
