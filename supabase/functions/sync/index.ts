import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TABLES = new Set([
 'profiles','areas','habits','habit_logs','objectives','objective_items','consumptions','consumption_logs','meals','water_logs','workouts',
 'incomes','expenses','budgets','financial_goals','frequent_actions','reminders','score_snapshots','home_layout','navigation_layout'
]);
const CONFIG = new Set(['profiles','home_layout','navigation_layout']);
const LOGS = new Set(['habit_logs','consumption_logs','meals','water_logs','workouts','incomes','expenses','score_snapshots']);
const FIELD = new Set(['id','user_id','name','email','photo','ai_autonomy','allow_ai_history','allow_ai_memory','ai_permissions','plan','icon','description','color','active','order','is_custom','area_id','type','unit','target','frequency','positive','date','value','hour','note','origin','client_generated_id','title','target_date','status','progress','metrics','notes','objective_id','parent_id','quantity','consumption_id','expense_id','cost_unit','limit','amount_ml','activity','duration_min','intensity','source','amount','currency','recurring','recurrence_rule','fixed','category','saved_amount','uses','domain','label','payload','due_at','repeat','condition','priority','modules','tabs','menu','breakdown','factors','created_at','updated_at','deleted_at']);

Deno.serve(async (req) => {
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  try {
    const authHeader=req.headers.get('Authorization');
    if(!authHeader) throw new Error('Missing authorization');
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authHeader}}});
    const {data:{user},error:ue}=await supabase.auth.getUser(); if(ue||!user) throw new Error('Unauthorized');
    const body=await req.json(); const operations=Array.isArray(body.operations)?body.operations:[]; const since=body.since as string|null;
    const acknowledged:any[]=[];
    for(const op of operations){
      const table=String(op.table); if(!TABLES.has(table)) continue;
      const row=op.row&&typeof op.row==='object'?{...op.row}:{}; row.user_id=user.id;
      if(table==='profiles') row.id=user.id;
      if(CONFIG.has(table)&&table!=='profiles') row.user_id=user.id;
      for(const k of Object.keys(row)) if(!FIELD.has(k)) delete row[k];
      if(op.action==='delete') { row.deleted_at=new Date().toISOString(); row.updated_at=new Date().toISOString(); }
      if(!row.id && !CONFIG.has(table)) continue;
      let error:any=null;
      if(CONFIG.has(table)) {
        const q=supabase.from(table).upsert(row,{onConflict:table==='profiles'?'id':'user_id'}); ({error}=await q);
      } else {
        // Historical records are append-friendly: same UUID is idempotent, distinct UUIDs are never overwritten by another device.
        ({error}=await supabase.from(table).upsert(row,{onConflict:'id'}));
      }
      if(error) throw error;
      acknowledged.push({id:op.id});
    }
    const changes:any={};
    for(const table of TABLES){
      let q=supabase.from(table).select('*');
      if(since) q=q.gt('updated_at',since);
      const {data,error}=await q.limit(5000); if(error) throw error; if(data?.length) changes[table]=data;
    }
    return new Response(JSON.stringify({ok:true,acknowledged,changes,serverTime:new Date().toISOString()}),{headers:{...cors,'Content-Type':'application/json'}});
  } catch(e) {
    return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:'Sync failed'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
  }
});
