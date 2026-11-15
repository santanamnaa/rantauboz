import {auth} from '../../../lib/auth';
import {listFriends,friendReport,friendAction} from '../../../lib/friends-service';
import {parseFriendAction} from '../../../lib/friends-validation.mjs';
import {month,uuid} from '../../../lib/validation.mjs';
import {AppError} from '../../../lib/service';
import {ZodError} from 'zod';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, private','Vary':'Cookie'};
function failure(e:unknown){if(e instanceof AppError)return Response.json({error:e.message},{status:e.status,headers});if(e instanceof ZodError)return Response.json({error:e.issues[0]?.message||'Periksa isianmu.'},{status:400,headers});if(e instanceof SyntaxError)return Response.json({error:'Permintaan tidak valid.'},{status:400,headers});console.error('Friends request failed',e instanceof Error?e.name:'UnknownError');return Response.json({error:'Belum bisa terhubung. Coba lagi.'},{status:503,headers})}
export async function GET(req:Request){try{const {data:session}=await auth.getSession();if(!session?.user)return Response.json({error:'Silakan masuk terlebih dahulu.'},{status:401,headers});const params=new URL(req.url).searchParams,id=params.get('connection');if(id)return Response.json(await friendReport(session.user.id,uuid.parse(id),month.parse(params.get('month'))),{headers});return Response.json(await listFriends(session.user.id),{headers})}catch(e){return failure(e)}}
export async function POST(req:Request){try{const allowed=[new URL(req.url).origin,process.env.APP_URL],origin=req.headers.get('origin');if(!origin||!allowed.includes(origin))return Response.json({error:'Asal permintaan tidak diizinkan.'},{status:403,headers});if(!req.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Format permintaan tidak valid.'},{status:415,headers});const {data:session}=await auth.getSession();if(!session?.user)return Response.json({error:'Silakan masuk terlebih dahulu.'},{status:401,headers});const {action,data}=parseFriendAction(await req.json());return Response.json({ok:true,...await friendAction(session.user.id,session.user.name,action,data)},{headers})}catch(e){return failure(e)}}
