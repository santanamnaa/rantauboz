import {createHmac} from 'node:crypto';
import {pool} from './db';
import {AppError} from './service';
import {normalizeSupportUrl} from './community-validation.mjs';
export async function isContributionManager(user?:string){if(!user)return false;return (await pool.query('SELECT 1 FROM contribution_managers WHERE user_id=$1',[user])).rowCount>0}
export async function requireContributionManager(user?:string){if(!user)throw new AppError('Silakan masuk terlebih dahulu.',401);if(!await isContributionManager(user))throw new AppError('Halaman ini hanya untuk pengelola Rantau Boz.',403)}
export async function getCommunitySettings(){const q=await pool.query('SELECT support_url AS url,version FROM community_settings WHERE id=true');return q.rows[0]||{url:null,version:1}}
export async function submitContribution(req:Request,data:any){
 if(data.website)return;
 const secret=process.env.NEON_AUTH_COOKIE_SECRET;if(!secret)throw new AppError('Formulir belum siap. Coba lagi nanti.',503);
 const ip=(req.headers.get('x-vercel-forwarded-for')||req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,100),key=createHmac('sha256',secret).update('contribution:'+ip).digest('hex');
 const limit=await pool.query(`INSERT INTO contribution_limits(key_hash) VALUES($1) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN contribution_limits.started_at<now()-interval '1 hour' THEN 1 ELSE contribution_limits.attempts+1 END,started_at=CASE WHEN contribution_limits.started_at<now()-interval '1 hour' THEN now() ELSE contribution_limits.started_at END RETURNING attempts`,[key]);
 if(limit.rows[0].attempts>5)throw new AppError('Terlalu banyak percobaan kirim. Coba lagi nanti, ya.',429);
 const inserted=await pool.query(`INSERT INTO contribution_requests(id,name,email,kind,topic,portfolio,message) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING RETURNING id`,[data.id,data.name,data.email,data.kind,data.topic,data.portfolio,data.message]);
 if(!inserted.rowCount){const old=await pool.query('SELECT name,email,kind,topic,portfolio,message FROM contribution_requests WHERE id=$1',[data.id]);if(!old.rowCount||['name','email','kind','topic','portfolio','message'].some(key=>old.rows[0][key]!==data[key]))throw new AppError('Pesan sebelumnya sudah masuk. Isian yang kamu ubah belum dikirim; tekan Kirim lagi untuk mengirimnya sebagai pesan baru.',409)}
}
export async function listContributions(user:string,status:string,cursor?:string){await requireContributionManager(user);const q=await pool.query(`SELECT id,name,email,kind,topic,portfolio,message,status,created_at AS "createdAt",version FROM contribution_requests WHERE ($1='all' OR status=$1) AND ($2::uuid IS NULL OR (created_at,id)<(SELECT created_at,id FROM contribution_requests WHERE id=$2::uuid)) ORDER BY created_at DESC,id DESC LIMIT 51`,[status,cursor||null]);return{requests:q.rows.slice(0,50),nextCursor:q.rows.length>50?q.rows[49].id:null}}
export async function updateContribution(user:string,data:any){await requireContributionManager(user);const q=await pool.query('UPDATE contribution_requests SET status=$1,updated_at=now(),version=version+1 WHERE id=$2 AND version=$3 RETURNING id',[data.status,data.id,data.version]);if(!q.rowCount)throw new AppError('Permintaan ini sudah berubah. Muat ulang sebelum menyimpan.',409)}
export async function updateCommunitySettings(user:string,data:any){await requireContributionManager(user);const q=await pool.query('UPDATE community_settings SET support_url=$1,updated_at=now(),version=version+1 WHERE id=true AND version=$2 RETURNING version',[normalizeSupportUrl(data.url),data.version]);if(!q.rowCount)throw new AppError('Tautan sudah berubah. Muat ulang sebelum menyimpan.',409)}
