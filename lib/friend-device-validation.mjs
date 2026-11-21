import {z} from 'zod';
import {uuid} from './validation.mjs';
export const deviceSampleLifetimeMs=15*60*1000;
export const deviceSessionLifetimeMs=60*60*1000;
const observedAt=z.string().datetime({offset:true}).refine(value=>{const delta=Date.now()-Date.parse(value);return delta>=-30000&&delta<=120000},'Dapatkan data perangkat yang baru, lalu coba lagi.');
const location=z.object({latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180),accuracy:z.number().finite().min(0).max(100000),observedAt}).strict();
const battery=z.object({percent:z.number().int().min(0).max(100),charging:z.boolean(),observedAt}).strict();
const reading=z.object({connectionId:uuid,sessionId:uuid,location:location.nullable().optional(),battery:battery.nullable().optional()}).strict().refine(r=>r.location!==undefined||r.battery!==undefined,'Tidak ada data perangkat untuk dikirim.');
export const deviceActions={
 start:z.object({connectionId:uuid,shareLocation:z.boolean(),shareBattery:z.boolean(),consent:z.literal(true)}).strict().refine(s=>s.shareLocation||s.shareBattery,'Pilih lokasi atau baterai yang ingin dibagikan.'),
 stop:z.object({connectionId:uuid}).strict(),
 stopAll:z.object({}).strict(),
 publish:z.object({readings:z.array(reading).min(1).max(50)}).strict().refine(s=>new Set(s.readings.map(r=>r.connectionId)).size===s.readings.length,'Data teman tidak boleh berulang.')
};
export function parseDeviceAction(input){const v=z.object({action:z.enum(Object.keys(deviceActions)),data:z.unknown()}).strict().parse(input);return{action:v.action,data:deviceActions[v.action].parse(v.data)}}
const fresh=(value,now)=>{const t=value?new Date(value).getTime():NaN;return Number.isFinite(t)&&now-t<=deviceSampleLifetimeMs&&t<=now+30000};
export function ownDeviceSettings(row,now=Date.now()){
 if(!row||new Date(row.expires_at).getTime()<=now)return{shareLocation:false,shareBattery:false,expiresAt:null,sessionId:null};
 return{shareLocation:row.share_location,shareBattery:row.share_battery,expiresAt:row.expires_at,sessionId:row.session_id};
}
export function peerDeviceStatus(row,now=Date.now()){
 const active=!!row&&new Date(row.expires_at).getTime()>now;
 return{sharingLocation:active&&row.share_location,sharingBattery:active&&row.share_battery,expiresAt:active?row.expires_at:null,
 location:active&&row.share_location&&row.latitude!==null&&fresh(row.location_at,now)?{latitude:row.latitude,longitude:row.longitude,accuracy:row.accuracy,observedAt:row.location_at}:null,
 battery:active&&row.share_battery&&row.battery_percent!==null&&fresh(row.battery_at,now)?{percent:row.battery_percent,charging:row.battery_charging,observedAt:row.battery_at}:null};
}
