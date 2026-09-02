export type ID = string;
export type SyncState = 'synced'|'pending'|'error';
export type HabitType = 'counter'|'quantity'|'time'|'boolean'|'scale'|'target';
export type ItemType = 'subobjective'|'stage'|'task';
export type RecordKind = 'note'|'custom';

export interface Profile { id:ID; name:string; email:string; photo?:string; createdAt:string; updatedAt:string; }
export interface Area { id:ID; name:string; icon:string; description?:string; active:boolean; order:number; isCustom:boolean; createdAt:string; updatedAt:string; }
export interface Habit { id:ID; areaId:ID; name:string; type:HabitType; unit?:string; target?:number; frequency:string; positive:boolean; active:boolean; createdAt:string; updatedAt:string; }
export interface HabitLog { id:ID; habitId:ID; date:string; value:number; note?:string; origin:'manual'|'ai'|'voice'; createdAt:string; updatedAt:string; syncState:SyncState; }
export interface Objective { id:ID; areaId?:ID; title:string; description?:string; targetDate?:string; status:'active'|'completed'|'paused'|'archived'; progress:number; createdAt:string; updatedAt:string; }
export interface ObjectiveItem { id:ID; objectiveId:ID; type:ItemType; parentId?:ID; title:string; status:'pending'|'done'; order:number; createdAt:string; updatedAt:string; }
export interface Consumption { id:ID; name:string; unit:string; target?:number; limit?:number; costUnit?:number; active:boolean; createdAt:string; updatedAt:string; }
export interface ConsumptionLog { id:ID; consumptionId:ID; quantity:number; date:string; note?:string; expenseId?:ID; createdAt:string; updatedAt:string; syncState:SyncState; }
export interface Meal { id:ID; name:string; date:string; quantity?:string; note?:string; createdAt:string; updatedAt:string; syncState:SyncState; }
export interface WaterLog { id:ID; amountMl:number; date:string; createdAt:string; updatedAt:string; syncState:SyncState; }
export interface Workout { id:ID; activity:string; durationMin:number; intensity?:number; date:string; note?:string; createdAt:string; updatedAt:string; syncState:SyncState; }
export interface Income { id:ID; source:string; amount:number; currency:string; date:string; recurring:boolean; createdAt:string; updatedAt:string; syncState:SyncState; }
export interface Expense { id:ID; description:string; amount:number; currency:string; category:string; date:string; recurring:boolean; fixed:boolean; frequentId?:ID; createdAt:string; updatedAt:string; syncState:SyncState; }
export interface Budget { id:ID; category?:string; amount:number; currency:string; period:'month'|'week'; createdAt:string; updatedAt:string; }
export interface FinancialGoal { id:ID; title:string; targetAmount:number; currency:string; targetDate?:string; savedAmount:number; createdAt:string; updatedAt:string; }
export interface FrequentAction { id:ID; domain:string; label:string; payload:string; uses:number; createdAt:string; updatedAt:string; }
export interface Reminder { id:ID; title:string; type:'manual'|'habit'|'conditional'|'smart'; dueAt:string; repeat?:string; condition?:string; priority:'low'|'normal'|'high'; status:'active'|'completed'|'cancelled'; createdAt:string; updatedAt:string; }
export interface ScoreSnapshot { id:ID; date:string; score:number; breakdown:Record<string,number>; factors:string[]; createdAt:string; }
export interface HomeLayout { modules:string[]; }
export interface NavLayout { tabs:string[]; menu:string[]; }

export interface AppState {
 profile:Profile|null; areas:Area[]; habits:Habit[]; habitLogs:HabitLog[]; objectives:Objective[]; objectiveItems:ObjectiveItem[];
 consumptions:Consumption[]; consumptionLogs:ConsumptionLog[]; meals:Meal[]; waterLogs:WaterLog[]; workouts:Workout[]; incomes:Income[]; expenses:Expense[]; budgets:Budget[]; financialGoals:FinancialGoal[]; frequentActions:FrequentAction[]; reminders:Reminder[]; scoreSnapshots:ScoreSnapshot[]; home:HomeLayout; nav:NavLayout;
}
export const uid=()=>crypto.randomUUID();
export const now=()=>new Date().toISOString();
export const dateKey=(d=new Date())=>d.toISOString().slice(0,10);
export const initialState=():AppState=>({profile:null,areas:[],habits:[],habitLogs:[],objectives:[],objectiveItems:[],consumptions:[],consumptionLogs:[],meals:[],waterLogs:[],workouts:[],incomes:[],expenses:[],budgets:[],financialGoals:[],frequentActions:[],reminders:[],scoreSnapshots:[],home:{modules:['score','today','habits','objectives','recent']},nav:{tabs:['home','objectives','habits','consumptions','progress'],menu:['finance','food','exercise','reminders','account']}});
