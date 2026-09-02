import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!; const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,'Content-Type':'application/json'}});
function due(last:string|null,frequency:string){ if(frequency==='off')return false; const ms=Date.now()-(last?Date.parse(last):0); const hours=frequency==='high'?6:frequency==='daily'?24:72; return ms>=hours*3600_000; }
Deno.serve(async req=>{ if(req.method==='OPTIONS')return new Response('ok',{headers:cors}); try{
 const jwt=req.headers.get('Authorization')?.replace('Bearer ',''); if(!jwt)return json({error:'Unauthorized'},401);
 const client=createClient(SUPABASE_URL,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:`Bearer ${jwt}`}}});
 const {data:{user}}=await client.auth.getUser(); if(!user)return json({error:'Unauthorized'},401);
 const {data:settings}=await admin.from('ai_proactive_settings').select('*').eq('user_id',user.id).single(); if(!settings?.enabled||!due(settings.last_generated_at,settings.frequency))return json({events:[]});
 const since=new Date(Date.now()-8*86400000).toISOString();
 const [{data:habits},{data:logs},{data:objectives},{data:expenses},{data:consumptions}] = await Promise.all([
  admin.from('habits').select('id,name,target,frequency').eq('user_id',user.id).is('deleted_at',null),
  admin.from('habit_logs').select('habit_id,date,value').eq('user_id',user.id).gte('created_at',since).is('deleted_at',null),
  admin.from('objectives').select('id,title,target_date,status').eq('user_id',user.id).is('deleted_at',null),
  admin.from('expenses').select('amount,category,date').eq('user_id',user.id).gte('created_at',since).is('deleted_at',null),
  admin.from('consumption_logs').select('consumption_id,quantity,date').eq('user_id',user.id).gte('created_at',since).is('deleted_at',null)
 ]);
 const events:any[]=[]; const today=new Date().toISOString().slice(0,10);
 if(settings.habit_gaps) for(const h of habits||[]){ const recent=(logs||[]).filter((x:any)=>x.habit_id===h.id); const last=recent.sort((a:any,b:any)=>b.date.localeCompare(a.date))[0]?.date; if(last && (Date.parse(today)-Date.parse(last))/86400000>=5) events.push({kind:'habit_gap',title:`Hace ${Math.round((Date.parse(today)-Date.parse(last))/86400000)} días que no registrás ${h.name}`,body:`Podés retomar hoy con algo pequeño.`,priority:2,source:{habitId:h.id}}); }
 if(settings.goal_deadlines) for(const o of objectives||[]){ if(o.target_date&&o.status!=='completed'){const days=Math.ceil((Date.parse(o.target_date)-Date.parse(today))/86400000);if(days>=0&&days<=7)events.push({kind:'goal_deadline',title:`Tu objetivo “${o.title}” está cerca de vencer`,body:`Quedan ${days} día(s). ¿Querés que revisemos el plan?`,priority:3,source:{objectiveId:o.id}});}}
 if(settings.finance_changes && (expenses||[]).length>=2){const total=(expenses||[]).reduce((a:any,x:any)=>a+Number(x.amount||0),0);if(total>0)events.push({kind:'finance_check',title:'Hay movimiento reciente en tus gastos',body:`Registraste ${total.toFixed(2)} en gastos durante los últimos días. Puedo compararlo con otro período.`,priority:1,source:{total}});}
 if(settings.positive_trends && (logs||[]).length>=3)events.push({kind:'positive_trend',title:'Veo actividad sostenida en tus hábitos',body:'Hay señales positivas en tus registros recientes. Seguí construyendo consistencia.',priority:1,source:{logs:(logs||[]).length}});
 const unique=events.slice(0,3); if(unique.length) await admin.from('ai_proactive_events').insert(unique.map(e=>({...e,user_id:user.id,status:'pending'})));
 await admin.from('ai_proactive_settings').update({last_generated_at:new Date().toISOString()}).eq('user_id',user.id);
 return json({events:unique});
 }catch(e){return json({error:String(e)},500)} });
