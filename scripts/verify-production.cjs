
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const base=process.env.APP_TEST_URL||'https://rantauboz.vercel.app',share=process.env.QA_SHARE;if(!share)throw Error('Set QA_SHARE to a temporary authorized Vercel share token for this deployment.');
function client(){let jar=new Map();return async(path,{method='GET',body,status=200}={})=>{const r=await fetch(base+path+(path.includes('?')?'&':'?')+'_vercel_share='+share,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:body?JSON.stringify(body):undefined,redirect:'manual'});for(const s of r.headers.getSetCookie()){let first=s.split(';')[0],i=first.indexOf('=');jar.set(first.slice(0,i),first.slice(i+1))}let data;try{data=await r.json()}catch{data={error:'Non-JSON response'}}if(r.status!==status)throw Error(path+' expected '+status+' got '+r.status+': '+(typeof data.error==='string'?data.error:data.error?.message||data.message||'request failed'));return data}}
(async()=>{let a=client(),b=client(),email='rantau.qa.'+randomUUID().slice(0,10)+'@example.com',password='QAtest-'+randomUUID(),month='2026-11';
await a('/api/data?month='+month,{status:401});console.log('PASS unauthenticated endpoint rejects');
await a('/api/auth/sign-up/email',{method:'POST',body:{email,password,name:'Release QA'}});console.log('PASS production signup');
let d=await a('/api/data?month='+month);assert.equal(d.accounts.length,0);assert.equal(d.budgets.length,0);console.log('PASS real session and empty new account');
const mutate=(action,data,status=200)=>a('/api/mutate',{method:'POST',body:{action,data},status});
await mutate('account.save',{name:'QA ShopeePay',kind:'ewallet',initialBudget:{name:'QA Makan',amount:100000,month,photo:'food'}});
d=await a('/api/data?month='+month);let account=d.accounts[0],budget=d.budgets[0];assert.equal(budget.amount,100000);console.log('PASS account plus budget stored in Neon');
const id=randomUUID(),expense={id,budgetId:budget.id,amount:20000,date:month+'-14',note:'QA lunch'};
await mutate('expense.save',expense);await mutate('expense.save',expense);
d=await a('/api/data?month='+month);assert.equal(d.expenses.length,1);assert.equal(d.budgets[0].amount-d.expenses[0].amount,80000);console.log('PASS expense idempotency and remaining amount');
let e=d.expenses[0];await mutate('expense.save',{...expense,version:e.version,amount:150000});await mutate('expense.save',{...expense,version:e.version,amount:1000},409);
d=await a('/api/data?month='+month);assert.equal(d.expenses[0].amount,150000);assert.equal(d.budgets[0].amount-d.expenses[0].amount,-50000);console.log('PASS stale update rejection and over-budget recording');
await mutate('expense.save',{id:randomUUID(),budgetId:budget.id,amount:100,date:'2026-12-01',note:''},400);
await mutate('budget.copy',{month:'2026-12'});let dec=await a('/api/data?month=2026-12');assert.equal(dec.budgets.length,1);assert.equal(dec.expenses.length,0);assert.equal(dec.budgets[0].amount,100000);console.log('PASS month isolation and copy without carryover');
await b('/api/auth/sign-up/email',{method:'POST',body:{email:'rantau.qa.'+randomUUID().slice(0,10)+'@example.com',password:'QAtest-'+randomUUID(),name:'Isolation QA'}});
let other=await b('/api/data?month='+month);assert.equal(other.accounts.length,0);await b('/api/mutate',{method:'POST',body:{action:'expense.save',data:{id:randomUUID(),budgetId:budget.id,amount:100,date:month+'-14',note:''}},status:404});console.log('PASS cross-user access denied');
await a('/api/auth/sign-out',{method:'POST',body:{}});await a('/api/data?month='+month,{status:401});
await a('/api/auth/sign-in/email',{method:'POST',body:{email,password:'wrong-password-123'},status:401});
await a('/api/auth/sign-in/email',{method:'POST',body:{email,password}});d=await a('/api/data?month='+month);assert.equal(d.expenses.length,1);console.log('PASS signout, wrong password, signin and persistence');
await mutate('expense.delete',{id,version:d.expenses[0].version});d=await a('/api/data?month='+month);assert.equal(d.expenses.length,0);console.log('PASS deletion restores remaining budget');
await mutate('budget.delete',{id:budget.id,version:budget.version});await mutate('budget.delete',{id:dec.budgets[0].id,version:dec.budgets[0].version});await mutate('account.archive',{id:account.id,version:account.version,archived:true});
console.log('PASS release integration checks. Test transactions cleaned up.');
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});

