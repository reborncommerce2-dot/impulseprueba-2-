import { supabase } from '../lib/supabase';
export type Plan='free'|'premium';
export type Entitlements={plan:Plan;trial:boolean;features:string[]};
const free=['core','habits','objectives','history','basic_progress','basic_reminders'];
const premium=[...free,'advanced_analytics','ai_memory','voice','smart_recommendations','advanced_reminders','exports'];
export async function getEntitlements():Promise<Entitlements>{
  if(!supabase) return {plan:'premium',trial:true,features:premium};
  const {data:{user}}=await supabase.auth.getUser(); if(!user)return {plan:'free',trial:false,features:free};
  const {data}=await supabase.from('profiles').select('plan').eq('id',user.id).maybeSingle();
  const plan=(data?.plan==='premium'?'premium':'free') as Plan; return {plan,trial:false,features:plan==='premium'?premium:free};
}
export const hasFeature=(e:Entitlements,f:string)=>e.features.includes(f);
