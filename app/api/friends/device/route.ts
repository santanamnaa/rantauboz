import {auth} from '../../../../lib/auth';
import {AppError} from '../../../../lib/service';
import {uuid} from '../../../../lib/validation.mjs';
import {parseDeviceAction} from '../../../../lib/friend-device-validation.mjs';
import {ownDeviceShares,friendDeviceStatus,deviceAction} from '../../../../lib/friend-device-service';
import {ZodError} from 'zod';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
function failure(error:unknown){
 if(error instanceof AppError)return Response.json({error:error.message},{status:error.status,headers});
 if(error instanceof ZodError)return Response.json({error:error.issues[0]?.message||'Periksa pengaturan berbagi.'},{status:400,headers});
 if(error instanceof SyntaxError)return Response.json({error:'Format permintaan tidak valid.'},{status:400,headers});
 // Never log location, battery values, session keys, or private payloads.
 return Response.json({error:'Data perangkat belum bisa diperbarui. Coba lagi.'},{status:503,headers});
}
export async function GET(req:Request){try{const {data:session}=await auth.getSession();if(!session?.user)return Response.json({error:'Silakan masuk kembali.'},{status:401,headers});const id=new URL(req.url).searchParams.get('connection');return Response.json(id?await friendDeviceStatus(session.user.id,uuid.parse(id)):await ownDeviceShares(session.user.id),{headers})}catch(e){return failure(e)}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(!origin||![new URL(req.url).origin,process.env.APP_URL].includes(origin))return Response.json({error:'Permintaan tidak diizinkan.'},{status:403,headers});
 if(!req.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Gunakan format JSON.'},{status:415,headers});
 const {data:session}=await auth.getSession();if(!session?.user)return Response.json({error:'Silakan masuk kembali.'},{status:401,headers});
 const reader=req.body?.getReader();if(!reader)throw new SyntaxError();let size=0;const chunks:Uint8Array[]=[];
 for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32768){await reader.cancel();return Response.json({error:'Permintaan terlalu besar.'},{status:413,headers})}chunks.push(part.value)}
 const {action,data}=parseDeviceAction(JSON.parse(Buffer.concat(chunks).toString('utf8')));
 return Response.json({ok:true,...await deviceAction(session.user.id,action,data)},{headers});
 }catch(e){return failure(e)}}
