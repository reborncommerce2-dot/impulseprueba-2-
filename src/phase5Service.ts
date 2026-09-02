import {supabase} from './lib/supabase';
export type Persona='balanced'|'friend'|'coach'|'mentor'|'direct'|'motivator'|'analytical'|'professional';
export async function getPersona(){if(!supabase)return {persona:'balanced' as Persona,intensity:3};const {data}=await supabase.from('ai_persona_settings').select('persona,intensity').maybeSingle();return data||{persona:'balanced',intensity:3}}
export async function savePersona(persona:Persona,intensity:number){if(!supabase)return;await supabase.from('ai_persona_settings').upsert({persona,intensity})}
export async function getProactiveSettings(){if(!supabase)return {enabled:false,frequency:'daily',interruption:'normal',habit_gaps:true,finance_changes:true,goal_deadlines:true,positive_trends:true};const {data}=await supabase.from('ai_proactive_settings').select('*').maybeSingle();return data}
export async function saveProactiveSettings(v:any){if(!supabase)return;await supabase.from('ai_proactive_settings').upsert(v)}
export async function generateProactive(){
  if(!supabase) return {events:[]};
  const {data:{session}}=await supabase.auth.getSession();
  if(!session) return {events:[]};
  const url=import.meta.env.VITE_SUPABASE_URL;
  const anonKey=import.meta.env.VITE_SUPABASE_ANON_KEY;
  if(!url) throw new Error('Falta VITE_SUPABASE_URL.');
  const headers:Record<string,string>={Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'};
  if(anonKey) headers.apikey=anonKey;
  const r=await fetch(`${url}/functions/v1/ai-proactive`,{method:'POST',headers});
  if(!r.ok) throw new Error(`No se pudo ejecutar la IA proactiva (${r.status}).`);
  return r.json();
}
export async function getProactiveEvents(){if(!supabase)return [];const {data}=await supabase.from('ai_proactive_events').select('*').eq('status','pending').order('priority',{ascending:false}).order('created_at',{ascending:false}).limit(10);return data||[]}
export async function dismissProactive(id:string){if(supabase)await supabase.from('ai_proactive_events').update({status:'dismissed'}).eq('id',id)}
export async function getMealPlans(){if(!supabase)return [];const {data}=await supabase.from('meal_plans').select('*,meal_plan_items(*)').eq('status','active').order('start_date');return data||[]}
export async function createMealPlan(plan:any,items:any[]){if(!supabase)return;const {data,error}=await supabase.from('meal_plans').insert(plan).select().single();if(error)throw error;if(items.length)await supabase.from('meal_plan_items').insert(items.map(x=>({...x,meal_plan_id:data.id})));return data}
export async function completeMealItem(id:string,completed:boolean){if(supabase)await supabase.from('meal_plan_items').update({completed}).eq('id',id)}
