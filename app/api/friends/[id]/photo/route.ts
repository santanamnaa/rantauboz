import {auth} from '../../../../../lib/auth';
import {pool} from '../../../../../lib/db';
import {uuid} from '../../../../../lib/validation.mjs';
import {friendPhotoSql} from '../../../../../lib/friends-photo.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){try{const {data:session}=await auth.getSession();if(!session?.user)return new Response(null,{status:401,headers});const {id}=await params,parsed=uuid.safeParse(id);if(!parsed.success)return new Response(null,{status:400,headers});const photo=await pool.query(friendPhotoSql,[parsed.data,session.user.id]);if(!photo.rowCount)return new Response(null,{status:404,headers});return new Response(new Uint8Array(photo.rows[0].image),{headers:{...headers,'Content-Type':'image/jpeg'}})}catch{return new Response(null,{status:503,headers})}}
