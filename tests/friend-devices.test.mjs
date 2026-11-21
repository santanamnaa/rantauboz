import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDeviceAction,peerDeviceStatus,ownDeviceSettings,deviceSampleLifetimeMs} from '../lib/friend-device-validation.mjs';
const id='11111111-1111-4111-8111-111111111111',session='22222222-2222-4222-8222-222222222222';
const observedAt=()=>new Date().toISOString();
test('device sharing requires explicit consent and never accepts a client owner identity',()=>{
 const data={connectionId:id,shareLocation:true,shareBattery:false,consent:true};
 assert.equal(parseDeviceAction({action:'start',data}).data.shareLocation,true);
 for(const changes of [{consent:false},{consent:undefined},{shareLocation:false},{ownerId:'someone-else'}])assert.throws(()=>parseDeviceAction({action:'start',data:{...data,...changes}}));
 assert.throws(()=>parseDeviceAction({action:'stopAll',data:{ownerId:'someone-else'}}));
});
test('sensor uploads reject invalid coordinates, battery values, stale timestamps, duplicate recipients and extra fields',()=>{
 const location={latitude:-6.2,longitude:106.8,accuracy:20,observedAt:observedAt()};
 const battery={percent:75,charging:false,observedAt:observedAt()};
 const reading={connectionId:id,sessionId:session,location,battery};
 const valid=r=>parseDeviceAction({action:'publish',data:{readings:[r]}});
 assert.equal(valid(reading).data.readings[0].battery.percent,75);
 for(const bad of [{...reading,sessionId:undefined},{...reading,location:{...location,latitude:91}},{...reading,location:{...location,longitude:Infinity}},{...reading,location:{...location,accuracy:-1}},{...reading,battery:{...battery,percent:100.5}},{...reading,battery:{...battery,percent:101}},{...reading,location:{...location,observedAt:new Date(Date.now()-180000).toISOString()}},{...reading,location:{...location,observedAt:new Date(Date.now()+60000).toISOString()}},{...reading,userId:'other'},{connectionId:id,sessionId:session}])assert.throws(()=>valid(bad));
 assert.throws(()=>parseDeviceAction({action:'publish',data:{readings:[reading,reading]}}));
 assert.equal(valid({connectionId:id,sessionId:session,location:null}).data.readings[0].location,null);
});
test('peer data is permission-projected, short lived, and does not expose session keys or the owner',()=>{
 const now=Date.now(),row={owner_id:'alice',session_id:session,share_location:true,share_battery:false,expires_at:new Date(now+60000).toISOString(),latitude:-6.2,longitude:106.8,accuracy:20,location_at:new Date(now).toISOString(),battery_percent:75,battery_charging:false,battery_at:new Date(now).toISOString()};
 const peer=peerDeviceStatus(row,now);assert.equal(peer.location.latitude,-6.2);assert.equal(peer.battery,null);assert.equal(peer.sharingBattery,false);assert(!JSON.stringify(peer).includes(session));assert(!JSON.stringify(peer).includes('owner_id'));
 assert.equal(ownDeviceSettings(row,now).sessionId,session);
 assert.equal(peerDeviceStatus({...row,location_at:new Date(now-deviceSampleLifetimeMs-1).toISOString()},now).location,null);
 const expired=peerDeviceStatus({...row,expires_at:new Date(now-1).toISOString()},now);assert.equal(expired.location,null);assert.equal(expired.battery,null);assert.equal(expired.sharingLocation,false);assert.equal(ownDeviceSettings({...row,expires_at:new Date(now-1).toISOString()},now).sessionId,null);
 assert.equal(peerDeviceStatus({...row,share_location:false},now).location,null);
 assert.deepEqual(peerDeviceStatus(null,now),{sharingLocation:false,sharingBattery:false,expiresAt:null,location:null,battery:null});
});
