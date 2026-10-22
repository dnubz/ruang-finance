import 'fake-indexeddb/auto';
import { describe,it,expect,vi } from 'vitest';
import { emptyState, demoState, balances, wealth, monthly, parseAmount, parseQuick, payoff, stateSchema, monthNow } from './model';
import { loadState,saveState,backupText,restoreText } from './db';
import { importCsv,exportCsv } from './csv';
describe('durable local storage',()=>{
it('keeps all records when a fresh app session loads the same database',async()=>{const s=demoState();s.settings.theme='dark';await saveState(s);vi.resetModules();const reopened=await import('./db');expect(await reopened.loadState()).toEqual(s);});
it('rejects invalid data before replacing a successful save',async()=>{const s=demoState();await saveState(s);await expect(saveState({...s,transactions:[{...s.transactions[0],account:'missing'}]})).rejects.toThrow();expect(await loadState()).toEqual(s);});
it('saves empty data deliberately and does not reload demo data',async()=>{const s=emptyState();await saveState(s);expect(await loadState()).toEqual(s);});
it('round trips a full backup and rejects malformed or incompatible backups',()=>{const s=demoState();expect(restoreText(backupText(s))).toEqual(s);expect(()=>restoreText('{"app":"other","data":{}}')).toThrow();expect(()=>restoreText('{"app":"ruang-finance","data":{"version":2}}')).toThrow();});
});
describe('financial calculations',()=>{
it('moves money between accounts without counting it as income or spending',()=>{const s=emptyState();s.accounts=[{id:'a',name:'Bank',type:'Cash',opening:1000},{id:'b',name:'Savings',type:'Savings',opening:0}];s.transactions=[{id:'t',type:'transfer',amount:200,merchant:'Save',category:'Savings',date:monthNow()+'-01',account:'a',to:'b',notes:'',tags:'',subcategory:''}];expect(balances(s)).toEqual({a:800,b:200});expect(wealth(s).net).toBe(1000);expect(monthly(s,monthNow())).toMatchObject({income:0,expenses:0,saved:200});});
it('recomputes balances after edits and deletions',()=>{const s=demoState();const id=s.transactions[0].account,before=balances(s)[id],amount=s.transactions[0].amount;s.transactions.shift();expect(balances(s)[id]).toBe(before-amount);});
it('counts assets and debts exactly once',()=>{const s=emptyState();s.accounts[0].opening=100;s.assets=[{id:'a',name:'Gold',type:'Gold',value:50,cost:40}];s.debts=[{id:'d',name:'Loan',balance:20,rate:0,payment:5,due:'2027-01-01'}];s.goals=[{id:'g',name:'Goal',saved:50,target:100,due:'2027-01-01'}];expect(wealth(s)).toMatchObject({assets:150,debt:20,net:130});});
it('rejects duplicate IDs, missing transfer destinations and invalid dates',()=>{const s=demoState();s.transactions[0].date='2026-02-30';expect(stateSchema.safeParse(s).success).toBe(false);s.transactions[0].date='2026-02-28';s.accounts.push({...s.accounts[0]});expect(stateSchema.safeParse(s).success).toBe(false);});
it('handles zero-interest and unpayable debt',()=>{expect(payoff(1200,0,100)).toBe(12);expect(payoff(1200,12,1)).toBe(Infinity);expect(payoff(0,12,0)).toBe(0);});
});
describe('fast entry and backups',()=>{
it.each([['10k',10000],['50rb',50000],['1jt',1000000],['2.5jt',2500000],['5m',5000000],['Rp1.000.000',1000000],['0.00006',.00006]])('parses %s', (text,n)=>expect(parseAmount(text)).toBe(n));
it('remembers merchant categories and payment accounts',()=>{const s=demoState();expect(parseQuick('35k Grab',s)).toMatchObject({amount:35000,merchant:'Grab',category:'Transportation',account:'bca'});expect(parseQuick('income 5m freelance',s)).toMatchObject({amount:5000000,type:'income'});expect(()=>parseQuick('-1 Grab',s)).toThrow();});
it('round trips CSV with quotes, commas, and newlines; skips duplicates',()=>{const s=demoState();s.transactions[0].merchant='A "shop", Jakarta';s.transactions[0].notes='line 1\nline 2';const text=exportCsv(s.transactions);const empty={...s,transactions:[]};expect(importCsv(text,empty)).toEqual(s.transactions);expect(importCsv(text,s)).toEqual([]);expect(()=>importCsv('broken,csv',s)).toThrow();});
});
