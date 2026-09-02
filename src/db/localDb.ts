import {AppState, initialState} from '../domain/types';

const DB='impulse-db', STORE='state', KEY='app', OUTBOX='outbox';
let memory:AppState|null=null;
let dbPromise:Promise<IDBDatabase>|null=null;

function openDb(){
  if(dbPromise) return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB,2);
    r.onupgradeneeded=()=>{const db=r.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); if(!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX,{keyPath:'id'});};
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  }); return dbPromise;
}

export interface OutboxItem {id:string; entity:string; table:string; action:'upsert'|'delete'; row:any; createdAt:string; attempts:number;}

export async function loadState():Promise<AppState>{
  if(memory) return structuredClone(memory);
  if(!('indexedDB' in window)) return structuredClone(initialState());
  try { const db=await openDb(); const result=await new Promise<AppState|undefined>((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const g=tx.objectStore(STORE).get(KEY);g.onsuccess=()=>resolve(g.result);g.onerror=()=>reject(g.error)}); memory=result||initialState(); return structuredClone(memory); }
  catch { memory=initialState(); return structuredClone(memory); }
}
export async function saveState(state:AppState){
  memory=structuredClone(state); if(!('indexedDB' in window)) return;
  try {const db=await openDb(); await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(memory,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});} catch {}
}
export async function enqueueOutbox(items:OutboxItem[]){
  if(!items.length||!('indexedDB' in window)) return;
  try {const db=await openDb(); await new Promise<void>((resolve,reject)=>{const tx=db.transaction(OUTBOX,'readwrite');const s=tx.objectStore(OUTBOX);items.forEach(i=>s.put(i));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});}catch{}
}
export async function getOutbox():Promise<OutboxItem[]>{
  if(!('indexedDB' in window)) return [];
  try {const db=await openDb();return await new Promise<OutboxItem[]>((resolve,reject)=>{const tx=db.transaction(OUTBOX,'readonly');const g=tx.objectStore(OUTBOX).getAll();g.onsuccess=()=>resolve(g.result||[]);g.onerror=()=>reject(g.error)})}catch{return []}
}
export async function replaceOutbox(items:OutboxItem[]){
  if(!('indexedDB' in window)) return; const db=await openDb(); await new Promise<void>((resolve,reject)=>{const tx=db.transaction(OUTBOX,'readwrite');const s=tx.objectStore(OUTBOX);s.clear();items.forEach(i=>s.put(i));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
}
export async function markSyncState(state:AppState,_state:'synced'|'pending'|'error'){ const next=structuredClone(state); for(const key of ['habitLogs','consumptionLogs','meals','waterLogs','workouts','incomes','expenses']) (next as any)[key]=(next as any)[key].map((x:any)=>({...x,syncState:_state})); return next; }
export async function clearState(){memory=null; dbPromise=null; if('indexedDB' in window) indexedDB.deleteDatabase(DB);}
export async function exportState(state:AppState){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`impulse-export-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
export async function clearAuthCache(){ localStorage.removeItem('impulse.lastSync'); }
