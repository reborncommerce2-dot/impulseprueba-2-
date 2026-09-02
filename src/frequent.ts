import type { AppState, FrequentAction } from './domain/types';
import { uid, now } from './domain/types';
export function rankFrequent(actions:FrequentAction[]){return [...actions].sort((a,b)=>b.uses-a.uses||b.updatedAt.localeCompare(a.updatedAt)).slice(0,8)}
export function parseFrequentPayload(a:FrequentAction){try{return JSON.parse(a.payload)}catch{return {}}}
export function makeFrequent(domain:string,label:string,payload:unknown):FrequentAction{return {id:uid(),domain,label,payload:JSON.stringify(payload),uses:1,createdAt:now(),updatedAt:now()}}
export function suggestFrequent(state:AppState){return rankFrequent(state.frequentActions)}
