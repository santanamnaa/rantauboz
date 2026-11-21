import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {pool} from './db';
import {AppError} from './service';
import {ownDeviceSettings,peerDeviceStatus} from './friend-device-validation.mjs';

type SensorLocation={latitude:number;longitude:number;accuracy:number;observedAt:string};
type SensorBattery={percent:number;charging:boolean;observedAt:string};
type DeviceReading={connectionId:string;sessionId:string;location?:SensorLocation|null;battery?:SensorBattery|null};
type DeviceActionData={connectionId?:string;shareLocation?:boolean;shareBattery?:boolean;readings?:DeviceReading[]};

const fieldsToClear=`latitude=NULL,longitude=NULL,accuracy=NULL,location_at=NULL,battery_percent=NULL,battery_charging=NULL,battery_at=NULL,last_upload_at=NULL`;
async function connection(c:PoolClient,user:string,id:string){
 const r=await c.query('SELECT id,low_user,high_user FROM friend_connections WHERE id=$1 AND active AND (low_user=$2 OR high_user=$2) FOR UPDATE',[id,user]);
 if(!r.rowCount)throw new AppError('Koneksi teman sudah tidak tersedia.',404);
 return r.rows[0];
}
export async function ownDeviceShares(user:string){
 // Expired samples are also cleared on the owner's next request; never keep a trail of positions.
 await pool.query(`UPDATE friend_device_shares SET ${fieldsToClear} WHERE owner_id=$1 AND expires_at<=now() AND (location_at IS NOT NULL OR battery_at IS NOT NULL)`,[user]);
 const r=await pool.query(`SELECT d.connection_id AS id,d.session_id AS "sessionId",d.share_location AS "shareLocation",d.share_battery AS "shareBattery",d.expires_at AS "expiresAt",CASE WHEN f.low_user=$1 THEN f.high_name ELSE f.low_name END AS name FROM friend_device_shares d JOIN friend_connections f ON f.id=d.connection_id WHERE d.owner_id=$1 AND f.active AND (f.low_user=$1 OR f.high_user=$1) AND d.expires_at>now() AND (d.share_location OR d.share_battery) ORDER BY d.connection_id`,[user]);
 return{shares:r.rows,serverTime:new Date().toISOString()};
}
export async function friendDeviceStatus(user:string,id:string){
 // One statement checks connection + membership and reads both directions. Never expose the peer's session key.
 const r=await pool.query(`SELECT row_to_json(own) AS own,row_to_json(peer) AS peer FROM friend_connections f LEFT JOIN friend_device_shares own ON own.connection_id=f.id AND own.owner_id=$2 LEFT JOIN friend_device_shares peer ON peer.connection_id=f.id AND peer.owner_id=CASE WHEN f.low_user=$2 THEN f.high_user ELSE f.low_user END WHERE f.id=$1 AND f.active AND (f.low_user=$2 OR f.high_user=$2)`,[id,user]);
 if(!r.rowCount)throw new AppError('Koneksi teman sudah tidak tersedia.',404);
 return{own:ownDeviceSettings(r.rows[0].own),peer:peerDeviceStatus(r.rows[0].peer),serverTime:new Date().toISOString()};
}
export async function deviceAction(user:string,action:string,data:DeviceActionData){
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['device:'+user]);
  if(action==='start'){
   await connection(c,user,data.connectionId);
   const limit=await c.query('SELECT count(*)::int AS count FROM friend_device_shares WHERE owner_id=$1 AND expires_at>now() AND (share_location OR share_battery) AND connection_id<>$2',[user,data.connectionId]);
   if(limit.rows[0].count>=50)throw new AppError('Maksimal berbagi ke 50 teman sekaligus. Hentikan sesi lain terlebih dahulu.');
   const r=await c.query(`INSERT INTO friend_device_shares(connection_id,owner_id,session_id,share_location,share_battery,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '1 hour') ON CONFLICT(connection_id,owner_id) DO UPDATE SET session_id=excluded.session_id,share_location=excluded.share_location,share_battery=excluded.share_battery,expires_at=excluded.expires_at,${fieldsToClear},updated_at=now() RETURNING *`,[data.connectionId,user,randomUUID(),data.shareLocation,data.shareBattery]);
   await c.query('COMMIT');return{own:ownDeviceSettings(r.rows[0])};
  }
  if(action==='stopAll'){
   // Lock connections in the same order as publish/disconnect before changing grants.
   await c.query('SELECT id FROM friend_connections WHERE low_user=$1 OR high_user=$1 ORDER BY id FOR UPDATE',[user]);
   await c.query(`UPDATE friend_device_shares SET share_location=false,share_battery=false,expires_at=now(),session_id=$2,${fieldsToClear},updated_at=now() WHERE owner_id=$1`,[user,randomUUID()]);
  }
  if(action==='stop'){
   await connection(c,user,data.connectionId);
   await c.query(`UPDATE friend_device_shares SET share_location=false,share_battery=false,expires_at=now(),session_id=$3,${fieldsToClear},updated_at=now() WHERE connection_id=$1 AND owner_id=$2`,[data.connectionId,user,randomUUID()]);
  }
  const accepted:string[]=[];
  if(action==='publish'){
   for(const sample of [...data.readings].sort((a,b)=>a.connectionId.toLowerCase().localeCompare(b.connectionId.toLowerCase()))){
    const known=await c.query('SELECT id FROM friend_connections WHERE id=$1 AND active AND (low_user=$2 OR high_user=$2) FOR UPDATE',[sample.connectionId,user]);
    if(!known.rowCount)continue;
    const r=await c.query('SELECT * FROM friend_device_shares WHERE connection_id=$1 AND owner_id=$2 AND session_id=$3 AND expires_at>now() AND (share_location OR share_battery) FOR UPDATE',[sample.connectionId,user,sample.sessionId]);
    const row=r.rows[0];if(!row)continue;
    if(row.last_upload_at&&Date.now()-new Date(row.last_upload_at).getTime()<10000){accepted.push(sample.connectionId);continue}
    const loc=row.share_location&&sample.location!==undefined?sample.location:undefined;
    const battery=row.share_battery&&sample.battery!==undefined?sample.battery:undefined;
    // A failed sensor read explicitly clears the old sample instead of looking current.
    const updateLocation=loc!==undefined&&(!loc||!row.location_at||Date.parse(loc.observedAt)>=new Date(row.location_at).getTime());
    const updateBattery=battery!==undefined&&(!battery||!row.battery_at||Date.parse(battery.observedAt)>=new Date(row.battery_at).getTime());
    await c.query(`UPDATE friend_device_shares SET latitude=CASE WHEN $4 THEN $5 ELSE latitude END,longitude=CASE WHEN $4 THEN $6 ELSE longitude END,accuracy=CASE WHEN $4 THEN $7 ELSE accuracy END,location_at=CASE WHEN $4 THEN $8::timestamptz ELSE location_at END,battery_percent=CASE WHEN $9 THEN $10 ELSE battery_percent END,battery_charging=CASE WHEN $9 THEN $11 ELSE battery_charging END,battery_at=CASE WHEN $9 THEN $12::timestamptz ELSE battery_at END,last_upload_at=now(),updated_at=now() WHERE connection_id=$1 AND owner_id=$2 AND session_id=$3`,[sample.connectionId,user,sample.sessionId,updateLocation,loc?.latitude??null,loc?.longitude??null,loc?.accuracy??null,loc?.observedAt??null,updateBattery,battery?.percent??null,battery?.charging??null,battery?.observedAt??null]);
    accepted.push(sample.connectionId);
   }
  }
  await c.query('COMMIT');return{accepted};
 }catch(error){await c.query('ROLLBACK');throw error}finally{c.release()}
}
