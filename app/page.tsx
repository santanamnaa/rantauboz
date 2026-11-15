import Dashboard from './ui';
import Marketing from './marketing';
import {auth} from '../lib/auth';
import {redirect} from 'next/navigation';
import {inviteCode} from '../lib/friends-validation.mjs';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{teman?:string}>}){const query=await searchParams,code=inviteCode.safeParse(query.teman),{data:session}=await auth.getSession();if(code.success&&!session?.user)redirect('/auth/sign-in?teman='+code.data);return session?.user?<Dashboard initialFriendCode={code.success?code.data:undefined}/>:<Marketing/>}
