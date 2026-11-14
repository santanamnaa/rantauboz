import {z} from 'zod';
export const uuid=z.string().uuid();
const rupiah=z.number().int().positive().max(999999999999);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{let d=new Date(s+'T12:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===s&&s>='2000-01-01'&&s<='2100-12-31'},'Tanggal tidak valid');
export const month=z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const name=z.string().trim().min(1,'Nama wajib diisi').max(60);
const version=z.number().int().positive().optional();
const photo=z.enum(['glass','food','transport','leisure','shopping','home']);
const budget=z.object({id:uuid.optional(),version,month,name,accountId:uuid,amount:rupiah,cadence:z.enum(['monthly','weekly','daily']),guide:z.number().int().min(0).max(999999999999),photo}).refine(b=>b.cadence==='monthly'||b.guide>0,'Isi nominal acuan harian atau mingguan');
export const schemas={
 'account.save':z.object({id:uuid.optional(),version,name,kind:z.enum(['bank','ewallet','cash']),initialBudget:z.object({name,amount:rupiah,month,photo}).optional()}),
 'account.archive':z.object({id:uuid,archived:z.boolean(),version:z.number().int().positive()}),
 'budget.save':budget,
 'budget.archive':z.object({id:uuid,archived:z.boolean(),version:z.number().int().positive()}),
 'budget.delete':z.object({id:uuid,version:z.number().int().positive()}),
 'budget.copy':z.object({month}),
 'expense.save':z.object({id:uuid,version,budgetId:uuid,amount:rupiah,date,note:z.string().trim().max(180)}),
 'expense.delete':z.object({id:uuid,version:z.number().int().positive()})
};
export function parseMutation(input){const outer=z.object({action:z.enum(Object.keys(schemas)),data:z.unknown()}).parse(input);return {action:outer.action,data:schemas[outer.action].parse(outer.data)}}
export function previousMonth(m){const [y,n]=m.split('-').map(Number);return n===1?`${y-1}-12`:`${y}-${String(n-1).padStart(2,'0')}`}
export function budgetTotals(budgets,expenses){const allocated=budgets.reduce((s,b)=>s+Number(b.amount),0),spent=expenses.reduce((s,e)=>s+Number(e.amount),0);return{allocated,spent,remaining:allocated-spent}}
