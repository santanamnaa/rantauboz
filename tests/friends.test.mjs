import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFriendAction,serializeFriendReport} from '../lib/friends-validation.mjs';
const id='42a88b4a-ea31-4790-a47c-2b421b207bdb';
const settings={mode:'progress',fromMonth:'2026-11',categoryIds:[]};
test('sharing requires an explicit supported mode, valid month and selected categories',()=>{
 for(const mode of ['public','all-transactions','edit'])assert.throws(()=>parseFriendAction({action:'invite.create',data:{settings:{...settings,mode}}}));
 assert.throws(()=>parseFriendAction({action:'invite.create',data:{settings:{...settings,fromMonth:'2026-13'}}}));
 assert.throws(()=>parseFriendAction({action:'share.update',data:{id,version:1,settings:{...settings,mode:'selected'}}}));
 assert.throws(()=>parseFriendAction({action:'invite.create',data:{settings:{...settings,mode:'selected',categoryIds:[id,id]}}}));
 assert.equal(parseFriendAction({action:'invite.create',data:{settings:{...settings,mode:'selected',categoryIds:[id]}}}).data.settings.categoryIds.length,1);
});
test('invite codes normalize pasted separators and reject arbitrary links or query text',()=>{
 assert.equal(parseFriendAction({action:'invite.preview',data:{code:'abcd-1234-efab-5678'}}).data.code,'ABCD1234EFAB5678');
 for(const code of ['123','javascript:alert(1)',"' OR 1=1",'https://other.example'])assert.throws(()=>parseFriendAction({action:'invite.accept',data:{code,settings}}));
});
test('progress-only serialization contains no amounts or sensitive transaction fields',()=>{
 const month={month:'2026-11',hasData:true,budget:100000,spent:65000,remaining:35000,expenseCount:7,budgetCount:2,percentUsed:65,overBudget:false,accountName:'Secret Bank',note:'Private note'};
 const row={mode:'progress',fromMonth:'2026-11',months:[month],budgets:[{...month,name:'Makan',photo:'food'}]};
 const result=serializeFriendReport(row),encoded=JSON.stringify(result);
 for(const key of ['budget','spent','remaining','expenseCount','budgetCount','accountName','note']){assert(!Object.hasOwn(result.months[0],key));assert(!Object.hasOwn(result.budgets[0],key))}
 assert(!encoded.includes('100000'));assert(!encoded.includes('Secret'));assert.equal(result.months[0].percentUsed,65);
});
test('summary and selected views expose allowed totals without account or transaction details',()=>{
 const result=serializeFriendReport({mode:'summary',fromMonth:'2026-11',months:[{month:'2026-11',hasData:true,budget:100,spent:150,remaining:-50,budgetCount:1,expenseCount:2,note:'Secret'}],budgets:[]});
 assert.equal(result.months[0].remaining,-50);assert(!JSON.stringify(result).includes('Secret'));
 assert.throws(()=>parseFriendAction({action:'expense.save',data:{id}}));
 assert.throws(()=>parseFriendAction({action:'share.update',data:{id,settings}}));
});
