import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {pool} from './db';
import {previousMonth} from './validation.mjs';
export class AppError extends Error{constructor(message:string,public status=400){super(message)}}
function conflict(){throw new AppError('Data sudah berubah. Muat ulang lalu coba lagi.',409)}
export async function getData(user:string,month:string){
 const [accounts,budgets,expenses]=await Promise.all([
  pool.query('SELECT id,name,kind,archived,version FROM accounts WHERE user_id=$1 ORDER BY archived,name',[user]),
  pool.query("SELECT b.id,b.category_id AS \"categoryId\",to_char(b.month,'YYYY-MM') AS month,b.name,b.account_id AS \"accountId\",b.account_name AS \"accountName\",b.amount::float8,b.cadence,b.guide::float8,b.photo,b.archived,b.version,a.archived AS \"accountArchived\" FROM budgets b JOIN accounts a ON a.id=b.account_id AND a.user_id=b.user_id WHERE b.user_id=$1 AND b.month=$2::date ORDER BY b.created_at,b.id",[user,month+'-01']),
  pool.query('SELECT id,budget_id AS "budgetId",account_id AS "accountId",account_name AS "accountName",amount::float8,to_char(date,\'YYYY-MM-DD\') AS date,note,version FROM expenses WHERE user_id=$1 AND date >= $2::date AND date < ($2::date + interval \'1 month\') ORDER BY date DESC,created_at DESC',[user,month+'-01'])
 ]);return{accounts:accounts.rows,budgets:budgets.rows,expenses:expenses.rows,month};
}
async function account(c:PoolClient,user:string,id:string){const q=await c.query('SELECT id,name,archived,version FROM accounts WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,user]);if(!q.rowCount)throw new AppError('Rekening tidak ditemukan.',404);return q.rows[0]}
async function budget(c:PoolClient,user:string,id:string){const q=await c.query('SELECT id,category_id,account_id,account_name,amount,archived,version,to_char(month,\'YYYY-MM\') AS month FROM budgets WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,user]);if(!q.rowCount)throw new AppError('Pos budget tidak ditemukan.',404);return q.rows[0]}
export async function mutate(user:string,action:string,d:any){const c=await pool.connect();try{await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[user]);let result:any={};
 if(action==='account.save'){
  const id=d.id||randomUUID();if(d.id){const a=await account(c,user,id);if(a.version!==d.version)conflict();await c.query('UPDATE accounts SET name=$1,kind=$2,version=version+1 WHERE id=$3 AND user_id=$4',[d.name,d.kind,id,user])}else{await c.query('INSERT INTO accounts(id,user_id,name,kind) VALUES($1,$2,$3,$4)',[id,user,d.name,d.kind]);if(d.initialBudget){const b=d.initialBudget,cat=randomUUID();await c.query('INSERT INTO categories(id,user_id,name,photo) VALUES($1,$2,$3,$4)',[cat,user,b.name,b.photo]);await c.query("INSERT INTO budgets(id,user_id,category_id,account_id,month,name,account_name,amount,photo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[randomUUID(),user,cat,id,b.month+'-01',b.name,d.name,b.amount,b.photo])}}result={id};
 }
 if(action==='account.archive'){
  const a=await account(c,user,d.id);if(a.version!==d.version)conflict();if(d.archived){const q=await c.query('SELECT 1 FROM budgets WHERE account_id=$1 AND user_id=$2 AND archived=false AND month >= date_trunc(\'month\',current_date) LIMIT 1',[d.id,user]);if(q.rowCount)throw new AppError('Arsipkan atau pindahkan pos budget bulan ini dan bulan berikutnya terlebih dahulu.');}await c.query('UPDATE accounts SET archived=$1,version=version+1 WHERE id=$2 AND user_id=$3',[d.archived,d.id,user]);
 }
 if(action==='budget.save'){
  const a=await account(c,user,d.accountId);if(a.archived)throw new AppError('Pilih rekening yang masih aktif.');let old=d.id?await budget(c,user,d.id):null;if(old&&old.version!==d.version)conflict();if(old&&old.month!==d.month)throw new AppError('Bulan budget tidak dapat dipindahkan.');let cat=old?.category_id||randomUUID(),id=d.id||randomUUID();
  if(!old)await c.query('INSERT INTO categories(id,user_id,name,photo) VALUES($1,$2,$3,$4)',[cat,user,d.name,d.photo]);
  if(old)await c.query('UPDATE budgets SET name=$1,account_id=$2,account_name=$3,amount=$4,cadence=$5,guide=$6,photo=$7,version=version+1 WHERE id=$8 AND user_id=$9',[d.name,d.accountId,a.name,d.amount,d.cadence,d.cadence==='monthly'?0:d.guide,d.photo,id,user]);
  else await c.query('INSERT INTO budgets(id,user_id,category_id,account_id,month,name,account_name,amount,cadence,guide,photo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,user,cat,d.accountId,d.month+'-01',d.name,a.name,d.amount,d.cadence,d.cadence==='monthly'?0:d.guide,d.photo]);result={id};
 }
 if(action==='budget.archive'){
  const b=await budget(c,user,d.id);if(b.version!==d.version)conflict();if(!d.archived){const a=await account(c,user,b.account_id);if(a.archived)throw new AppError('Aktifkan rekening sumber terlebih dahulu.');}await c.query('UPDATE budgets SET archived=$1,version=version+1 WHERE id=$2 AND user_id=$3',[d.archived,d.id,user]);
 }
 if(action==='budget.delete'){
  const b=await budget(c,user,d.id);if(b.version!==d.version)conflict();const q=await c.query('SELECT 1 FROM expenses WHERE budget_id=$1 AND user_id=$2 LIMIT 1',[d.id,user]);if(q.rowCount)throw new AppError('Pos memiliki transaksi. Arsipkan untuk menjaga riwayat.');await c.query('DELETE FROM budgets WHERE id=$1 AND user_id=$2',[d.id,user]);
 }
 if(action==='budget.copy'){
  const existing=await c.query('SELECT 1 FROM budgets WHERE user_id=$1 AND month=$2 LIMIT 1',[user,d.month+'-01']);if(existing.rowCount)throw new AppError('Bulan tujuan sudah memiliki budget. Alokasi yang ada tidak ditimpa.');
  const from=await c.query('SELECT b.* FROM budgets b JOIN accounts a ON a.id=b.account_id AND a.user_id=b.user_id WHERE b.user_id=$1 AND b.month=$2 AND b.archived=false AND a.archived=false',[user,previousMonth(d.month)+'-01']);if(!from.rowCount)throw new AppError('Tidak ada budget aktif pada bulan sebelumnya.');for(const b of from.rows)await c.query('INSERT INTO budgets(id,user_id,category_id,account_id,month,name,account_name,amount,cadence,guide,photo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[randomUUID(),user,b.category_id,b.account_id,d.month+'-01',b.name,b.account_name,b.amount,b.cadence,b.guide,b.photo]);result={count:from.rowCount};
 }
 if(action==='expense.save'){
  const b=await budget(c,user,d.budgetId);if(b.month!==d.date.slice(0,7))throw new AppError('Tanggal transaksi harus sesuai bulan pos budget.');
  const q=await c.query('SELECT id,version,budget_id,account_id,account_name,amount,to_char(date,\'YYYY-MM-DD\') AS date,note FROM expenses WHERE id=$1 AND user_id=$2 FOR UPDATE',[d.id,user]),old=q.rows[0];
  if(old&&d.version===undefined){if(old.budget_id===d.budgetId&&Number(old.amount)===d.amount&&old.date===d.date&&old.note===d.note){await c.query('COMMIT');return{id:old.id,duplicate:true}}conflict()}
  if(old&&old.version!==d.version)conflict();if(!old&&d.version!==undefined)throw new AppError('Transaksi sudah dihapus.',409);
  if((!old||old.budget_id!==d.budgetId)&&b.archived)throw new AppError('Pos diarsipkan. Pilih pos aktif.');const a=await account(c,user,b.account_id);if((!old||old.budget_id!==d.budgetId)&&a.archived)throw new AppError('Rekening sumber diarsipkan.');
  const bankId=old&&old.budget_id===d.budgetId?old.account_id:b.account_id,bankName=old&&old.budget_id===d.budgetId?old.account_name:a.name;
  if(old)await c.query('UPDATE expenses SET budget_id=$1,account_id=$2,account_name=$3,amount=$4,date=$5,note=$6,version=version+1 WHERE id=$7 AND user_id=$8',[d.budgetId,bankId,bankName,d.amount,d.date,d.note,d.id,user]);else await c.query('INSERT INTO expenses(id,user_id,budget_id,account_id,account_name,amount,date,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[d.id,user,d.budgetId,bankId,bankName,d.amount,d.date,d.note]);result={id:d.id,month:b.month};
 }
 if(action==='expense.delete'){
  const q=await c.query('SELECT version FROM expenses WHERE id=$1 AND user_id=$2 FOR UPDATE',[d.id,user]);if(!q.rowCount)throw new AppError('Transaksi tidak ditemukan.',404);if(q.rows[0].version!==d.version)conflict();await c.query('DELETE FROM expenses WHERE id=$1 AND user_id=$2',[d.id,user]);
 }
 await c.query('COMMIT');return result;
 }catch(e:any){await c.query('ROLLBACK');if(e.code==='23505')throw new AppError('Nama atau data ini sudah digunakan. Periksa daftar terbaru.',409);if(e.code==='23503'||e.code==='23514')throw new AppError('Data terkait tidak valid. Muat ulang dan coba lagi.');throw e}finally{c.release()}}
