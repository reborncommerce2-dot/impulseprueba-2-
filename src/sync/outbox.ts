import { AppState, now } from '../domain/types';
import { enqueueOutbox, type OutboxItem } from '../db/localDb';

const COLLECTIONS=['areas','habits','habitLogs','objectives','objectiveItems','consumptions','consumptionLogs','meals','waterLogs','workouts','incomes','expenses','budgets','financialGoals','frequentActions','reminders','scoreSnapshots'];
const TABLE:Record<string,string>={habitLogs:'habit_logs',objectiveItems:'objective_items',consumptionLogs:'consumption_logs',waterLogs:'water_logs',financialGoals:'financial_goals',frequentActions:'frequent_actions',scoreSnapshots:'score_snapshots'};

export function diffOutbox(prev:AppState,next:AppState):OutboxItem[]{
 const items:OutboxItem[]=[];
 for(const entity of COLLECTIONS){const a=(prev as any)[entity]||[], b=(next as any)[entity]||[]; const mapA:Map<string,any>=new Map(a.map((x:any)=>[x.id,x])); const mapB:Map<string,any>=new Map(b.map((x:any)=>[x.id,x]));
  for(const [id,row] of mapB){const old=mapA.get(id); if(JSON.stringify(old)!==JSON.stringify(row)) items.push({id:`${entity}:${id}:${row.updatedAt||now()}`,entity,table:TABLE[entity]||entity,action:'upsert',row,createdAt:now(),attempts:0});}
  for(const [id,row] of mapA){if(!mapB.has(id)) items.push({id:`${entity}:delete:${id}:${now()}`,entity,table:TABLE[entity]||entity,action:'delete',row:{id,deletedAt:now()},createdAt:now(),attempts:0});}
 }
 if(JSON.stringify(prev.profile)!==JSON.stringify(next.profile)&&next.profile) items.push({id:`profile:${next.profile.id}:${next.profile.updatedAt}`,entity:'profile',table:'profiles',action:'upsert',row:next.profile,createdAt:now(),attempts:0});
 if(JSON.stringify(prev.home)!==JSON.stringify(next.home)) items.push({id:`home:${now()}`,entity:'home',table:'home_layout',action:'upsert',row:next.home,createdAt:now(),attempts:0});
 if(JSON.stringify(prev.nav)!==JSON.stringify(next.nav)) items.push({id:`nav:${now()}`,entity:'nav',table:'navigation_layout',action:'upsert',row:next.nav,createdAt:now(),attempts:0});
 return items;
}
export async function enqueueDiff(prev:AppState,next:AppState){ await enqueueOutbox(diffOutbox(prev,next)); }
