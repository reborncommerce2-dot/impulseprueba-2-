import { supabase } from '../lib/supabase';
import { AppState } from '../domain/types';
import { getOutbox, replaceOutbox, type OutboxItem, markSyncState } from '../db/localDb';

const TABLES: Record<string,string> = {
  profile:'profiles', areas:'areas', habits:'habits', habitLogs:'habit_logs', objectives:'objectives', objectiveItems:'objective_items',
  consumptions:'consumptions', consumptionLogs:'consumption_logs', meals:'meals', waterLogs:'water_logs', workouts:'workouts',
  incomes:'incomes', expenses:'expenses', budgets:'budgets', financialGoals:'financial_goals', frequentActions:'frequent_actions', reminders:'reminders',
  scoreSnapshots:'score_snapshots', home:'home_layout', nav:'navigation_layout'
};
const REVERSE = Object.fromEntries(Object.entries(TABLES).map(([k,v])=>[v,k]));
const LOG_KEYS = new Set(['habit_logs','consumption_logs','meals','water_logs','workouts','incomes','expenses','score_snapshots']);

export function entityToRow(entity:string,row:any,userId:string) {
  const table=TABLES[entity]; if(!table) return null;
  if(entity==='profile') return {id:userId,user_id:userId,name:row.name,email:row.email,photo:row.photo??null,created_at:row.createdAt,updated_at:row.updatedAt,deleted_at:null};
  if(entity==='home') return {user_id:userId,modules:row.modules,updated_at:new Date().toISOString()};
  if(entity==='nav') return {user_id:userId,tabs:row.tabs,menu:row.menu,updated_at:new Date().toISOString()};
  const out:any={...row,user_id:userId};
  for(const [k,v] of Object.entries(out)) {
    if(k==='createdAt') { out.created_at=v; delete out[k]; }
    else if(k==='updatedAt') { out.updated_at=v; delete out[k]; }
    else if(k==='deletedAt') { out.deleted_at=v; delete out[k]; }
    else if(k==='areaId') { out.area_id=v; delete out[k]; }
    else if(k==='habitId') { out.habit_id=v; delete out[k]; }
    else if(k==='objectiveId') { out.objective_id=v; delete out[k]; }
    else if(k==='parentId') { out.parent_id=v; delete out[k]; }
    else if(k==='consumptionId') { out.consumption_id=v; delete out[k]; }
    else if(k==='expenseId') { out.expense_id=v; delete out[k]; }
    else if(k==='targetDate') { out.target_date=v; delete out[k]; }
    else if(k==='targetAmount') { out.target_amount=v; delete out[k]; }
    else if(k==='savedAmount') { out.saved_amount=v; delete out[k]; }
    else if(k==='costUnit') { out.cost_unit=v; delete out[k]; }
    else if(k==='frequentId') { out.frequent_id=v; delete out[k]; }
    else if(k==='dueAt') { out.due_at=v; delete out[k]; }
    else if(k==='syncState') delete out[k];
  }
  return out;
}

function rowToEntity(table:string,row:any) {
  if(table==='home_layout') return {modules:row.modules};
  if(table==='navigation_layout') return {tabs:row.tabs,menu:row.menu};
  const out:any={...row};
  delete out.user_id; delete out.deleted_at;
  for(const [k,v] of Object.entries(out)) {
    if(k==='created_at') {out.createdAt=v;delete out[k]}
    else if(k==='updated_at') {out.updatedAt=v;delete out[k]}
    else if(k==='area_id') {out.areaId=v;delete out[k]}
    else if(k==='habit_id') {out.habitId=v;delete out[k]}
    else if(k==='objective_id') {out.objectiveId=v;delete out[k]}
    else if(k==='parent_id') {out.parentId=v;delete out[k]}
    else if(k==='consumption_id') {out.consumptionId=v;delete out[k]}
    else if(k==='expense_id') {out.expenseId=v;delete out[k]}
    else if(k==='target_date') {out.targetDate=v;delete out[k]}
    else if(k==='target_amount') {out.targetAmount=v;delete out[k]}
    else if(k==='saved_amount') {out.savedAmount=v;delete out[k]}
    else if(k==='cost_unit') {out.costUnit=v;delete out[k]}
    else if(k==='frequent_id') {out.frequentId=v;delete out[k]}
    else if(k==='due_at') {out.dueAt=v;delete out[k]}
  }
  return out;
}

export async function syncState(state:AppState,userId:string,lastSync?:string) {
  if(!supabase) return {ok:false,reason:'not-configured'} as const;
  const outbox=await getOutbox();
  const operations=outbox.map(op=>({id:op.id,table:op.table,action:op.action,row:entityToRow(op.entity,op.row,userId)})).filter(x=>x.row);
  const {data,error}=await supabase.functions.invoke('sync',{body:{operations,since:lastSync||null}});
  if(error) throw error;
  const incoming=data?.changes||{};
  const next={...state};
  for(const [table,rows] of Object.entries(incoming) as any) {
    const key=REVERSE[table]; if(!key) continue;
    if(key==='home'||key==='nav') (next as any)[key]=rows[0]?rowToEntity(table,rows[0]):(next as any)[key];
    else if(Array.isArray((next as any)[key])) {
      const current=(next as any)[key] as any[];
      const byId=new Map(current.map(x=>[x.id,x]));
      for(const raw of rows) { const ent=rowToEntity(table,raw); if(raw.deleted_at) byId.delete(raw.id); else byId.set(ent.id,ent); }
      (next as any)[key]=Array.from(byId.values());
    }
  }
  const acked=new Set((data?.acknowledged||[]).map((x:any)=>x.id));
  await replaceOutbox(outbox.filter(x=>!acked.has(x.id)));
  const synced=await markSyncState(next,'synced');
  return {ok:true,state:synced,serverTime:data?.serverTime||new Date().toISOString()} as const;
}
