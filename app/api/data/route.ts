import {auth} from '../../../lib/auth';
import {pool} from '../../../lib/db';
import {getData} from '../../../lib/service';
import {month} from '../../../lib/validation.mjs';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const {data:session}=await auth.getSession();if(!session?.user)return Response.json({error:'Silakan masuk terlebih dahulu.'},{status:401});const m=month.safeParse(new URL(req.url).searchParams.get('month'));if(!m.success)return Response.json({error:'Bulan tidak valid.'},{status:400});const [data,photo]=await Promise.all([getData(session.user.id,m.data),pool.query('SELECT updated_at FROM profile_photos WHERE user_id=$1',[session.user.id])]);return Response.json({...data,user:{name:session.user.name,email:session.user.email,avatarVersion:photo.rows[0]?.updated_at.toISOString()||null}},{headers:{'Cache-Control':'no-store'}})}catch(e){console.error('Data request failed',e instanceof Error?e.name:'UnknownError');return Response.json({error:'Data belum dapat dimuat. Coba lagi.'},{status:503})}}
