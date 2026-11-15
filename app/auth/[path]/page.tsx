import AuthScreen from '../../auth-screen';
import {inviteCode} from '../../../lib/friends-validation.mjs';
import {pageMetadata} from '../../../lib/site-metadata';
import type {Metadata} from 'next';
export async function generateMetadata({params,searchParams}:{params:Promise<{path:string}>;searchParams:Promise<{teman?:string}>}):Promise<Metadata>{const {path}=await params,query=await searchParams,code=inviteCode.safeParse(query.teman);if(code.success)return pageMetadata('invite','/?teman='+code.data,true);if(path==='forgot-password'||path==='reset-password')return{...pageMetadata('login','/auth/'+path,true),title:path==='forgot-password'?'Lupa password — Rantau Boz':'Ganti password — Rantau Boz',description:'Pulihkan akses ke akun Rantau Boz milikmu.',openGraph:null,twitter:null};return pageMetadata(path==='sign-up'?'signup':'login','/auth/'+path,true)}
export default async function AuthPage({params,searchParams}:{params:Promise<{path:string}>;searchParams:Promise<{teman?:string}>}){const {path}=await params,query=await searchParams,code=inviteCode.safeParse(query.teman);return <AuthScreen mode={path} invite={code.success?code.data:undefined}/>}
