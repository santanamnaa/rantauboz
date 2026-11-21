import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {pool} from './db';
import {AppError} from './service';
import {friendReportSql} from './friends-report.mjs';
import {serializeFriendReport} from './friends-validation.mjs';
import type {PoolClient} from 'pg';
type Settings={mode:string;fromMonth:string;categoryIds:string[]};
const tokenHash=(code:string)=>createHash('sha256').update(code).digest('hex');
const safeName=(name:string)=>name.trim().slice(0,60)||'Teman rantau';
async function validSettings(c:PoolClient,user:string,s:Settings){if(s.mode==='selected'){const q=await c.query('SELECT id FROM categories WHERE user_id=$1 AND id=ANY($2::uuid[])',[user,s.categoryIds]);if(q.rowCount!==s.categoryIds.length)throw new AppError('Ada budget yang bukan milikmu. Pilih ulang budgetnya.')}return s.mode==='selected'?s.categoryIds:[]}
async function limit(user:string,action:string,max:number,minutes:number){const q=await pool.query(`INSERT INTO friend_rate_limits(user_id,action) VALUES($1,$2) ON CONFLICT(user_id,action) DO UPDATE SET attempts=CASE WHEN friend_rate_limits.started_at<now()-$3::int*interval '1 minute' THEN 1 ELSE friend_rate_limits.attempts+1 END,started_at=CASE WHEN friend_rate_limits.started_at<now()-$3::int*interval '1 minute' THEN now() ELSE friend_rate_limits.started_at END RETURNING attempts`,[user,action,minutes]);if(q.rows[0].attempts>max)throw new AppError('Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',429)}
async function connection(c:PoolClient,user:string,id:string){const q=await c.query('SELECT * FROM friend_connections WHERE id=$1 AND active AND (low_user=$2 OR high_user=$2) FOR UPDATE',[id,user]);if(!q.rowCount)throw new AppError('Koneksi teman sudah tidak tersedia.',404);return q.rows[0]}
async function saveShare(c:PoolClient,id:string,user:string,s:Settings,ids:string[]){await c.query(`INSERT INTO friend_shares(connection_id,owner_id,mode,from_month,category_ids) VALUES($1,$2,$3,$4::date,$5::uuid[]) ON CONFLICT(connection_id,owner_id) DO UPDATE SET mode=excluded.mode,from_month=excluded.from_month,category_ids=excluded.category_ids,version=friend_shares.version+1,updated_at=now()`,[id,user,s.mode,s.fromMonth+'-01',ids])}
export async function listFriends(user:string){const [friends,invites,categories]=await Promise.all([
 pool.query(`SELECT f.id,CASE WHEN f.low_user=$1 THEN f.high_name ELSE f.low_name END AS name,
 jsonb_build_object('mode',s.mode,'fromMonth',to_char(s.from_month,'YYYY-MM'),'categoryIds',s.category_ids,'version',s.version) AS sharing,
 coalesce(p.mode,'off') AS "peerMode", avatar.updated_at AS "avatarVersion",
 to_char(f.created_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM') AS "connectedMonth"
 FROM friend_connections f JOIN friend_shares s ON s.connection_id=f.id AND s.owner_id=$1
 LEFT JOIN friend_shares p ON p.connection_id=f.id AND p.owner_id=CASE WHEN f.low_user=$1 THEN f.high_user ELSE f.low_user END
 LEFT JOIN profile_photos avatar ON avatar.user_id=CASE WHEN f.low_user=$1 THEN f.high_user ELSE f.low_user END
 WHERE f.active AND (f.low_user=$1 OR f.high_user=$1) ORDER BY f.created_at DESC`,[user]),
 pool.query(`SELECT id,mode,to_char(from_month,'YYYY-MM') AS "fromMonth",expires_at AS "expiresAt" FROM friend_invites WHERE inviter_id=$1 AND status='pending' AND expires_at>now() ORDER BY created_at DESC`,[user]),
 pool.query('SELECT DISTINCT ON (category_id) category_id AS id,name,photo FROM budgets WHERE user_id=$1 ORDER BY category_id,month DESC,created_at DESC',[user])
]);return{friends:friends.rows,invites:invites.rows,categories:categories.rows}}
export async function friendReport(user:string,id:string,month:string){const q=await pool.query(friendReportSql,[id,user,month+'-01']);if(q.rowCount)return serializeFriendReport(q.rows[0]);const known=await pool.query('SELECT 1 FROM friend_connections WHERE id=$1 AND active AND (low_user=$2 OR high_user=$2)',[id,user]);if(!known.rowCount)throw new AppError('Koneksi teman sudah tidak tersedia.',404);return{mode:'off',months:[],budgets:[]}}
export async function friendAction(user:string,name:string,action:string,d:any){
 if(action==='invite.preview'||action==='invite.accept')await limit(user,'join',30,15);
 if(action==='invite.create')await limit(user,'invite',12,60);
 const c=await pool.connect();try{await c.query('BEGIN');let result:any={};
 if(action==='invite.create'){
  const ids=await validSettings(c,user,d.settings),code=randomBytes(8).toString('hex').toUpperCase(),id=randomUUID();const q=await c.query(`INSERT INTO friend_invites(id,inviter_id,inviter_name,token_hash,mode,from_month,category_ids) VALUES($1,$2,$3,$4,$5,$6::date,$7::uuid[]) RETURNING expires_at AS "expiresAt"`,[id,user,safeName(name),tokenHash(code),d.settings.mode,d.settings.fromMonth+'-01',ids]);result={id,code,expiresAt:q.rows[0].expiresAt};
 }
 if(action==='invite.preview'||action==='invite.accept'){
  const q=await c.query(`SELECT *,to_char(from_month,'YYYY-MM') AS month_key FROM friend_invites WHERE token_hash=$1 AND status='pending' AND expires_at>now() FOR UPDATE`,[tokenHash(d.code)]);if(!q.rowCount)throw new AppError('Undangan sudah dipakai, dibatalkan, atau kedaluwarsa. Minta kode baru.',404);const invite=q.rows[0];if(invite.inviter_id===user)throw new AppError('Ini undanganmu sendiri. Kirim kodenya ke temanmu.');
  const [lo,hi]=[user,invite.inviter_id].sort(),duplicate=await c.query('SELECT 1 FROM friend_connections WHERE low_user=$1 AND high_user=$2 AND active',[lo,hi]);if(duplicate.rowCount)throw new AppError('Kalian sudah berteman. Atur berbagi lewat daftar teman.',409);
  if(action==='invite.preview')result={name:invite.inviter_name,mode:invite.mode,fromMonth:invite.month_key,expiresAt:invite.expires_at};
  else{const ids=await validSettings(c,user,d.settings),ownLow=lo===user;const connected=await c.query(`INSERT INTO friend_connections(id,low_user,high_user,low_name,high_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT(low_user,high_user) DO UPDATE SET active=true,low_name=excluded.low_name,high_name=excluded.high_name,created_at=now() WHERE friend_connections.active=false RETURNING id`,[randomUUID(),lo,hi,ownLow?safeName(name):invite.inviter_name,ownLow?invite.inviter_name:safeName(name)]);if(!connected.rowCount)throw new AppError('Kalian sudah berteman.',409);const id=connected.rows[0].id;
   // Revalidate the inviter's choices at acceptance, too.
   const inviterSettings={mode:invite.mode,fromMonth:invite.month_key,categoryIds:invite.category_ids};
   const inviterIds=await validSettings(c,invite.inviter_id,inviterSettings);await saveShare(c,id,invite.inviter_id,inviterSettings,inviterIds);await saveShare(c,id,user,d.settings,ids);await c.query("UPDATE friend_invites SET status='accepted',accepted_by=$1 WHERE id=$2",[user,invite.id]);result={id};
  }
 }
 if(action==='invite.revoke'){const q=await c.query("UPDATE friend_invites SET status='revoked' WHERE id=$1 AND inviter_id=$2 AND status='pending' RETURNING id",[d.id,user]);if(!q.rowCount)throw new AppError('Undangan sudah tidak tersedia.',404)}
 if(action==='share.update'){
  await connection(c,user,d.id);const ids=await validSettings(c,user,d.settings);const q=await c.query(`UPDATE friend_shares SET mode=$1,from_month=$2::date,category_ids=$3::uuid[],version=version+1,updated_at=now() WHERE connection_id=$4 AND owner_id=$5 AND version=$6 RETURNING version`,[d.settings.mode,d.settings.fromMonth+'-01',ids,d.id,user,d.version]);if(!q.rowCount)throw new AppError('Pengaturan sudah berubah. Muat ulang lalu coba lagi.',409);
 }
 if(action==='friend.disconnect'){await connection(c,user,d.id);await c.query('UPDATE friend_connections SET active=false WHERE id=$1',[d.id]);await c.query("UPDATE friend_shares SET mode='off',version=version+1,updated_at=now() WHERE connection_id=$1",[d.id]);await c.query('DELETE FROM friend_device_shares WHERE connection_id=$1',[d.id])}
 await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
