import AuthScreen from '../../auth-screen';
import {inviteCode} from '../../../lib/friends-validation.mjs';
export default async function AuthPage({params,searchParams}:{params:Promise<{path:string}>;searchParams:Promise<{teman?:string}>}){const {path}=await params,query=await searchParams,code=inviteCode.safeParse(query.teman);return <AuthScreen mode={path} invite={code.success?code.data:undefined}/>}
