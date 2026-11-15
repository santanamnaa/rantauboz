import {z} from 'zod';
import {month,uuid} from './validation.mjs';
export const shareSettings=z.object({mode:z.enum(['off','progress','summary','selected']),fromMonth:month,categoryIds:z.array(uuid).max(50).default([])}).superRefine((s,ctx)=>{if(s.mode==='selected'&&!s.categoryIds.length)ctx.addIssue({code:'custom',message:'Pilih minimal satu budget untuk dibagikan.'});if(new Set(s.categoryIds).size!==s.categoryIds.length)ctx.addIssue({code:'custom',message:'Pilihan budget tidak boleh berulang.'})});
export const inviteCode=z.string().trim().transform(s=>s.replace(/[\s-]/g,'').toUpperCase()).pipe(z.string().regex(/^[A-F0-9]{16}$/,'Kode undangan terdiri dari 16 huruf dan angka.'));
const schemas={
 'invite.create':z.object({settings:shareSettings}),
 'invite.preview':z.object({code:inviteCode}),
 'invite.accept':z.object({code:inviteCode,settings:shareSettings}),
 'invite.revoke':z.object({id:uuid}),
 'share.update':z.object({id:uuid,version:z.number().int().positive(),settings:shareSettings}),
 'friend.disconnect':z.object({id:uuid})
};
export function parseFriendAction(input){const v=z.object({action:z.enum(Object.keys(schemas)),data:z.unknown()}).parse(input);return{action:v.action,data:schemas[v.action].parse(v.data)}}
// Never send amounts (even null-valued keys) in a progress-only response.
export function serializeFriendReport(row){const progress=row.mode==='progress',periods=row.months||[],budgets=row.budgets||[];const project=p=>progress?{month:p.month,hasData:p.hasData,percentUsed:p.percentUsed,overBudget:p.overBudget}:{month:p.month,hasData:p.hasData,budget:p.budget,spent:p.spent,remaining:p.remaining,budgetCount:p.budgetCount,expenseCount:p.expenseCount};return{mode:row.mode,fromMonth:row.fromMonth,months:periods.map(project),budgets:budgets.map(b=>progress?{name:b.name,photo:b.photo,percentUsed:b.percentUsed,overBudget:b.overBudget}:{name:b.name,photo:b.photo,budget:b.budget,spent:b.spent,remaining:b.remaining})}}
