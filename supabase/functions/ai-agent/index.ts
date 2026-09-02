import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Json = Record<string, unknown>;
type ToolCall = { id: string; name: string; arguments: Json };

type AISettings = {
  autonomy: 'assistant'|'copilot'|'autonomous';
  allow_auto_register: boolean;
  allow_create_objectives: boolean;
  allow_create_reminders: boolean;
  allow_change_home: boolean;
  allow_change_navigation: boolean;
  allow_external_actions: boolean;
  allow_history: boolean;
  allow_memory: boolean;
  voice_enabled: boolean;
};

const MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-5.6-luna';
const OPENAI_URL = 'https://api.openai.com/v1/responses';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};

const TOOLS = [
  fn('get_user_profile','Get the authenticated user profile.',{}),
  fn('get_habits','List habits, optionally active only.',{active:{type:'boolean'}}),
  fn('log_habit','Register a habit value for a date.',{habit_id:{type:'string'},value:{type:'number'},date:{type:'string'},note:{type:'string'}}),
  fn('create_habit','Create a habit.',{area_id:{type:'string'},name:{type:'string'},type:{type:'string',enum:['counter','quantity','time','boolean','scale','target']},unit:{type:'string'},target:{type:'number'},frequency:{type:'string'},positive:{type:'boolean'}}),
  fn('update_habit','Update selected habit fields.',{habit_id:{type:'string'},name:{type:'string'},target:{type:'number'},frequency:{type:'string'},positive:{type:'boolean'},active:{type:'boolean'}}),
  fn('get_objectives','List objectives and progress.',{status:{type:'string'}}),
  fn('create_objective','Create an objective.',{title:{type:'string'},description:{type:'string'},area_id:{type:'string'},target_date:{type:'string'}}),
  fn('create_objective_item','Create a subobjective, stage or task inside an objective.',{objective_id:{type:'string'},type:{type:'string',enum:['subobjective','stage','task']},title:{type:'string'},parent_id:{type:'string'}}),
  fn('complete_task','Complete or reopen an objective item.',{item_id:{type:'string'},done:{type:'boolean'}}),
  fn('log_consumption','Register consumption for tobacco/cannabis/alcohol or a custom consumption.',{consumption_id:{type:'string'},quantity:{type:'number'},date:{type:'string'},note:{type:'string'}}),
  fn('log_food','Register a simple meal/food record.',{name:{type:'string'},date:{type:'string'},quantity:{type:'string'},note:{type:'string'}}),
  fn('log_water','Register water in ml.',{amount_ml:{type:'number'},date:{type:'string'}}),
  fn('log_workout','Register exercise.',{activity:{type:'string'},duration_min:{type:'number'},date:{type:'string'},intensity:{type:'number'},note:{type:'string'}}),
  fn('log_expense','Register an expense.',{description:{type:'string'},amount:{type:'number'},currency:{type:'string'},date:{type:'string'},category:{type:'string'}}),
  fn('log_income','Register income.',{source:{type:'string'},amount:{type:'number'},currency:{type:'string'},date:{type:'string'},recurring:{type:'boolean'}}),
  fn('create_reminder','Create a reminder.',{title:{type:'string'},due_at:{type:'string'},type:{type:'string',enum:['manual','habit','conditional','smart']},repeat:{type:'string'},condition:{type:'string'},priority:{type:'string',enum:['low','normal','high']}}),
  fn('get_statistics','Get calculated statistics for a period.',{from:{type:'string'},to:{type:'string'},area:{type:'string'}}),
  fn('compare_periods','Compare two periods using stored records.',{from_a:{type:'string'},to_a:{type:'string'},from_b:{type:'string'},to_b:{type:'string'}}),
  fn('calculate_score','Calculate the current Score and explain its factors.',{}),
  fn('get_score_breakdown','Get Score breakdown and recent snapshots.',{}),
  fn('update_home_layout','Change Home modules/order.',{modules:{type:'array',items:{type:'string'}}}),
  fn('update_navigation','Change the primary navigation and menu.',{tabs:{type:'array',items:{type:'string'}},menu:{type:'array',items:{type:'string'}}}),
  fn('remember_fact','Save a useful explicit fact to persistent AI memory.',{fact:{type:'string'},confidence:{type:'number'}}),
  fn('forget_fact','Delete a persistent AI memory by id.',{memory_id:{type:'string'}}),
  fn('get_memory','List persistent AI memories.',{}),
];

function fn(name:string, description:string, properties:Json){
  return {type:'function',name,description,parameters:{type:'object',properties,additionalProperties:false}};
}

function isoNow(){return new Date().toISOString()}
function id(){return crypto.randomUUID()}
function dateFallback(){return new Date().toISOString().slice(0,10)}

function isSafe(name:string){
  return new Set(['remember_fact','log_habit','log_consumption','log_food','log_water','log_workout','log_expense','log_income','create_reminder','complete_task']).has(name);
}
function permissionFor(name:string, s:AISettings){
  if(isSafe(name)) return s.allow_auto_register;
  if(['create_habit'].includes(name)) return s.allow_auto_register;
  if(['create_objective','create_objective_item'].includes(name)) return s.allow_create_objectives;
  if(name==='create_reminder') return s.allow_create_reminders;
  if(name==='update_home_layout') return s.allow_change_home;
  if(name==='update_navigation') return s.allow_change_navigation;
  if(['remember_fact','forget_fact'].includes(name)) return s.allow_memory;
  return true;
}
function shouldExecute(name:string,s:AISettings,forced=false){
  if(forced) return permissionFor(name,s);
  if(s.autonomy==='autonomous') return permissionFor(name,s);
  if(s.autonomy==='copilot') return isSafe(name) ? permissionFor(name,s) : false;
  return false;
}

async function getSettings(db:any,userId:string):Promise<AISettings>{
  const {data}=await db.from('ai_settings').select('*').eq('user_id',userId).maybeSingle();
  return data || {autonomy:'assistant',allow_auto_register:false,allow_create_objectives:false,allow_create_reminders:true,allow_change_home:false,allow_change_navigation:false,allow_external_actions:false,allow_history:true,allow_memory:true,voice_enabled:true};
}

async function row(db:any, table:string, userId:string, values:Json){
  const record:any={...values,user_id:userId,id:(values.id as string)||id(),created_at:(values.created_at as string)||isoNow(),updated_at:isoNow()};
  const {data,error}=await db.from(table).insert(record).select('*').single();
  if(error) throw new Error(error.message);
  return data;
}
async function one(db:any, table:string,userId:string, idValue:string){
  const {data,error}=await db.from(table).select('*').eq('user_id',userId).eq('id',idValue).maybeSingle();
  if(error) throw new Error(error.message); if(!data) throw new Error(`No se encontró ${table} ${idValue}`); return data;
}
async function all(db:any,table:string,userId:string){const {data,error}=await db.from(table).select('*').eq('user_id',userId).is('deleted_at',null).order('updated_at',{ascending:false}).limit(500);if(error)throw new Error(error.message);return data||[]}

async function statistics(db:any,userId:string,args:Json){
  const from=String(args.from||dateFallback()), to=String(args.to||dateFallback());
  const [habits,habitLogs,consLogs,meals,water,workouts,incomes,expenses,objectives]=await Promise.all([
    all(db,'habits',userId), db.from('habit_logs').select('*').eq('user_id',userId).gte('date',from).lte('date',to), db.from('consumption_logs').select('*').eq('user_id',userId).gte('date',from).lte('date',to), db.from('meals').select('*').eq('user_id',userId).gte('date',from).lte('date',to), db.from('water_logs').select('*').eq('user_id',userId).gte('date',from).lte('date',to), db.from('workouts').select('*').eq('user_id',userId).gte('date',from).lte('date',to), db.from('incomes').select('*').eq('user_id',userId).gte('date',from).lte('date',to), db.from('expenses').select('*').eq('user_id',userId).gte('date',from).lte('date',to), all(db,'objectives',userId)
  ]);
  const pick=(x:any)=>x.data||[];
  const hs=pick(habitLogs), cs=pick(consLogs), ms=pick(meals), ws=pick(water), wos=pick(workouts), ins=pick(incomes), ex=pick(expenses);
  const by=(arr:any[],key:string)=>arr.reduce((m,x)=>{m[x[key]]=(m[x[key]]||0)+1;return m},{} as Json);
  return {period:{from,to},habit_logs:hs.length,active_habits:habits.filter((h:any)=>h.active).length,habit_values:hs.reduce((a:number,x:any)=>a+Number(x.value||0),0),consumption_events:cs.length,consumption_quantity:cs.reduce((a:number,x:any)=>a+Number(x.quantity||0),0),meals:ms.length,water_ml:ws.reduce((a:number,x:any)=>a+Number(x.amount_ml||0),0),workouts:wos.length,exercise_minutes:wos.reduce((a:number,x:any)=>a+Number(x.duration_min||0),0),income_total:ins.reduce((a:number,x:any)=>a+Number(x.amount||0),0),expense_total:ex.reduce((a:number,x:any)=>a+Number(x.amount||0),0),expense_by_category:by(ex,'category'),active_objectives:objectives.filter((o:any)=>o.status==='active').length};
}

async function execute(db:any,userId:string,name:string,args:Json){
  switch(name){
    case 'get_user_profile': {const {data,error}=await db.from('profiles').select('*').eq('id',userId).single();if(error)throw new Error(error.message);return data;}
    case 'get_habits': {let q=db.from('habits').select('*').eq('user_id',userId).is('deleted_at',null);if(typeof args.active==='boolean')q=q.eq('active',args.active);const {data,error}=await q.order('created_at',{ascending:true});if(error)throw new Error(error.message);return data||[];}
    case 'log_habit': {const h=await one(db,'habits',userId,String(args.habit_id));return row(db,'habit_logs',userId,{habit_id:h.id,value:Number(args.value||0),date:String(args.date||dateFallback()),note:args.note||null,origin:'ai'});}
    case 'create_habit': return row(db,'habits',userId,{area_id:args.area_id||null,name:String(args.name),type:String(args.type||'boolean'),unit:args.unit||null,target:args.target??null,frequency:String(args.frequency||'diario'),positive:args.positive!==false,active:true});
    case 'update_habit': {const allowed=['name','target','frequency','positive','active'];const patch:any={updated_at:isoNow()};for(const k of allowed)if(args[k]!==undefined)patch[k]=args[k];const {data,error}=await db.from('habits').update(patch).eq('user_id',userId).eq('id',String(args.habit_id)).select('*').single();if(error)throw new Error(error.message);return data;}
    case 'get_objectives': {let q=db.from('objectives').select('*').eq('user_id',userId).is('deleted_at',null);if(args.status)q=q.eq('status',String(args.status));const {data,error}=await q.order('updated_at',{ascending:false});if(error)throw new Error(error.message);return data||[];}
    case 'create_objective': return row(db,'objectives',userId,{area_id:args.area_id||null,title:String(args.title),description:args.description||null,target_date:args.target_date||null,status:'active',progress:0,metrics:{},notes:null});
    case 'create_objective_item': return row(db,'objective_items',userId,{objective_id:String(args.objective_id),parent_id:args.parent_id||null,type:String(args.type||'task'),title:String(args.title),status:'pending',order:0});
    case 'complete_task': {const item=await one(db,'objective_items',userId,String(args.item_id));const {data,error}=await db.from('objective_items').update({status:args.done===false?'pending':'done',updated_at:isoNow()}).eq('user_id',userId).eq('id',item.id).select('*').single();if(error)throw new Error(error.message);return data;}
    case 'log_consumption': {const c=await one(db,'consumptions',userId,String(args.consumption_id));return row(db,'consumption_logs',userId,{consumption_id:c.id,quantity:Number(args.quantity||0),date:String(args.date||dateFallback()),note:args.note||null});}
    case 'log_food': return row(db,'meals',userId,{name:String(args.name),date:String(args.date||dateFallback()),quantity:args.quantity||null,note:args.note||null});
    case 'log_water': return row(db,'water_logs',userId,{amount_ml:Number(args.amount_ml||0),date:String(args.date||dateFallback())});
    case 'log_workout': return row(db,'workouts',userId,{activity:String(args.activity),duration_min:Number(args.duration_min||0),date:String(args.date||dateFallback()),intensity:args.intensity??null,note:args.note||null});
    case 'log_expense': return row(db,'expenses',userId,{description:String(args.description),amount:Number(args.amount||0),currency:String(args.currency||'ARS'),date:String(args.date||dateFallback()),category:args.category||null,fixed:false});
    case 'log_income': return row(db,'incomes',userId,{source:String(args.source),amount:Number(args.amount||0),currency:String(args.currency||'ARS'),date:String(args.date||dateFallback()),recurring:Boolean(args.recurring)});
    case 'create_reminder': return row(db,'reminders',userId,{title:String(args.title),due_at:String(args.due_at),type:String(args.type||'manual'),repeat:args.repeat||null,condition:args.condition||null,priority:String(args.priority||'normal'),status:'active'});
    case 'get_statistics': return statistics(db,userId,args);
    case 'compare_periods': return {period_a:await statistics(db,userId,{from:args.from_a,to:args.to_a}),period_b:await statistics(db,userId,{from:args.from_b,to:args.to_b})};
    case 'calculate_score': {const today=dateFallback();const st=await statistics(db,userId,{from:today,to:today});const positives=Math.min(1,(Number(st.workouts||0)+Number(st.meals||0)+Number(st.water_ml||0)/2000)/5);const negatives=Math.min(1,Number(st.expense_total||0)>0?0.05:0);const score=Math.max(0,Math.min(100,Math.round(50+positives*50-negatives*20)));return {score,factors:[`Entrenamientos hoy: ${st.workouts}`,`Agua hoy: ${st.water_ml} ml`,`Comidas registradas: ${st.meals}`]};}
    case 'get_score_breakdown': {const {data,error}=await db.from('score_snapshots').select('*').eq('user_id',userId).is('deleted_at',null).order('date',{ascending:false}).limit(30);if(error)throw new Error(error.message);return data||[];}
    case 'update_home_layout': {const allowed=['score','today','habits','objectives','recent','recommendations','water','exercise'];const modules=Array.isArray(args.modules)?args.modules.filter((x:any)=>allowed.includes(String(x))).slice(0,12):[];const {data,error}=await db.from('home_layout').upsert({user_id:userId,modules,updated_at:isoNow()},{onConflict:'user_id'}).select('*').single();if(error)throw new Error(error.message);return data;}
    case 'update_navigation': {const allowed=['home','objectives','habits','consumptions','progress'];const tabs=Array.isArray(args.tabs)?args.tabs.map(String).filter((x:string)=>allowed.includes(x)).slice(0,5):[];const menu=Array.isArray(args.menu)?args.menu.map(String):[];const {data,error}=await db.from('navigation_layout').upsert({user_id:userId,tabs,menu,updated_at:isoNow()},{onConflict:'user_id'}).select('*').single();if(error)throw new Error(error.message);return data;}
    case 'remember_fact': return row(db,'ai_memory',userId,{fact:String(args.fact),source:'explicit',confidence:args.confidence??1});
    case 'forget_fact': {const {data,error}=await db.from('ai_memory').update({deleted_at:isoNow(),updated_at:isoNow()}).eq('user_id',userId).eq('id',String(args.memory_id)).select('*').single();if(error)throw new Error(error.message);return data;}
    case 'get_memory': return all(db,'ai_memory',userId);
    default: throw new Error(`Tool no permitida: ${name}`);
  }
}

async function audit(db:any,userId:string,conversationId:string|null,messageId:string|null,call:ToolCall,status:string,result:unknown){
  await db.from('ai_action_audit').insert({user_id:userId,conversation_id:conversationId,message_id:messageId,tool_name:call.name,arguments:call.arguments,result,status});
}

function toolCallsFromOutput(output:any[]):ToolCall[]{
  return (output||[]).filter(x=>x?.type==='function_call').map(x=>({id:x.call_id||x.id,name:x.name,arguments:typeof x.arguments==='string'?JSON.parse(x.arguments||'{}'):x.arguments||{}}));
}

function systemPrompt(profile:any,settings:AISettings,memory:any[],stats:any){
 return `Sos Impulse, un agente operativo personal de crecimiento y hábitos. No sos solamente un chatbot. Tenés acceso controlado a herramientas y nunca inventás datos. Diferenciá dato confirmado, inferencia, recomendación y acción ejecutada. Priorizá rapidez, móvil, pocos pasos y formularios cortos. No afirmes causalidad si solo hay correlación. El historial es permanente y debe analizarse sin sobrescribirlo. Nivel de autonomía actual: ${settings.autonomy}. Permisos: ${JSON.stringify(settings)}. Usuario: ${profile?.name||'sin nombre'}. Memoria relevante: ${JSON.stringify(memory.slice(0,20))}. Resumen estadístico disponible: ${JSON.stringify(stats)}. Si una petición puede resolverse con herramientas, usalas. Las frases compuestas pueden requerir múltiples tool calls. Para acciones no ejecutadas por falta de permiso/autonomía, explicá que quedaron propuestas y pedí confirmación. No ejecutes SQL ni inventes IDs. Para análisis, usá get_statistics/compare_periods y citá sus resultados. Para una petición amplia como “quiero mejorar durante 90 días”, construí un plan usando objetivos, hábitos, tareas, etapas y recordatorios cuando tengas permiso; si no, proponelo.`;
}

async function callOpenAI(input:any,system:string){
 const key=Deno.env.get('OPENAI_API_KEY'); if(!key) throw new Error('Falta configurar OPENAI_API_KEY en Supabase.');
 const res=await fetch(OPENAI_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:MODEL,instructions:system,input,tools:TOOLS,tool_choice:'auto',parallel_tool_calls:true,max_output_tokens:1600})});
 const json=await res.json(); if(!res.ok) throw new Error(json?.error?.message||'Error del proveedor de IA'); return json;
}
function textOf(response:any){return (response.output||[]).filter((x:any)=>x.type==='message').flatMap((x:any)=>x.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text).join('\n').trim()||''}

async function chat(db:any,userId:string,body:any){
 const settings=await getSettings(db,userId);
 const {data:profile}=await db.from('profiles').select('*').eq('id',userId).maybeSingle();
 const {data:memory}=settings.allow_memory?await db.from('ai_memory').select('*').eq('user_id',userId).is('deleted_at',null).order('updated_at',{ascending:false}).limit(20):{data:[]};
 const {data:conversation}=body.conversationId?await db.from('ai_conversations').select('*').eq('user_id',userId).eq('id',body.conversationId).maybeSingle():{data:null};
 const conversationId=conversation?.id||id();
 if(!conversation) await db.from('ai_conversations').insert({id:conversationId,user_id:userId,title:String(body.message||'Impulse').slice(0,80)});
 const {data:recent}=await db.from('ai_messages').select('role,content,tool_calls').eq('user_id',userId).eq('conversation_id',conversationId).is('deleted_at',null).order('created_at',{ascending:false}).limit(12);
 const history=(recent||[]).reverse().map((m:any)=>({role:m.role,content:m.content}));
 await db.from('ai_messages').insert({id:id(),user_id:userId,conversation_id:conversationId,role:'user',content:String(body.message||'')});
 let stats:any={}; if(settings.allow_history){try{stats=await statistics(db,userId,{from:new Date(Date.now()-7*86400000).toISOString().slice(0,10),to:dateFallback()})}catch{stats={}}}
 let input:any=[...history,{role:'user',content:String(body.message||'')}];
 let response=await callOpenAI(input,systemPrompt(profile,settings,memory||[],stats));
 const proposals:any[]=[]; const executed:any[]=[]; let rounds=0;
 while(rounds<5){
   const calls=toolCallsFromOutput(response.output||[]); if(!calls.length)break; rounds++;
   const outputs:any[]=[];
   for(const call of calls){
     const allowed=shouldExecute(call.name,settings,false);
     if(!allowed){proposals.push({id:call.id,toolName:call.name,arguments:call.arguments});outputs.push({type:'function_call_output',call_id:call.id,output:JSON.stringify({status:'proposed',message:'Acción propuesta; requiere confirmación o permisos adecuados.',tool:call.name})});await audit(db,userId,conversationId,null,call,'proposed',{message:'Pending confirmation'});continue;}
     try{const result=await execute(db,userId,call.name,call.arguments);executed.push({toolName:call.name,result});outputs.push({type:'function_call_output',call_id:call.id,output:JSON.stringify({status:'executed',result})});await audit(db,userId,conversationId,null,call,'executed',result);}catch(e){const err=e instanceof Error?e.message:'Error';outputs.push({type:'function_call_output',call_id:call.id,output:JSON.stringify({status:'failed',error:err})});await audit(db,userId,conversationId,null,call,'failed',{error:err});}
   }
   response=await callOpenAI([...(response.output||[]),...outputs],systemPrompt(profile,settings,memory||[],stats));
 }
 const answer=textOf(response)|| (proposals.length?'Tengo acciones propuestas para que confirmes.':'Listo.');
 const assistantId=id(); await db.from('ai_messages').insert({id:assistantId,user_id:userId,conversation_id:conversationId,role:'assistant',content:answer,tool_calls:[...executed.map(x=>({tool_name:x.toolName,status:'executed'})),...proposals.map(x=>({tool_name:x.toolName,status:'proposed',arguments:x.arguments,id:x.id}))]});
 return {conversationId,messageId:assistantId,answer,proposals,executed,model:MODEL};
}

async function confirm(db:any,userId:string,body:any){
 const settings=await getSettings(db,userId); const results:any[]=[];
 for(const action of Array.isArray(body.actions)?body.actions:[]){const call={id:String(action.id||crypto.randomUUID()),name:String(action.toolName),arguments:action.arguments||{}} as ToolCall;if(!permissionFor(call.name,settings)){results.push({toolName:call.name,status:'rejected',reason:'Permiso granular desactivado'});await audit(db,userId,body.conversationId||null,body.messageId||null,call,'rejected',{reason:'permission'});continue;}try{const result=await execute(db,userId,call.name,call.arguments);results.push({toolName:call.name,status:'executed',result});await audit(db,userId,body.conversationId||null,body.messageId||null,call,'executed',result);}catch(e){const err=e instanceof Error?e.message:'Error';results.push({toolName:call.name,status:'failed',error:err});await audit(db,userId,body.conversationId||null,body.messageId||null,call,'failed',{error:err});}}
 return {results};
}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const auth=req.headers.get('Authorization');if(!auth)throw new Error('Missing authorization');
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
  const {data:{user},error}=await db.auth.getUser();if(error||!user)throw new Error('Unauthorized');
  const body=await req.json(); const result=body.mode==='confirm'?await confirm(db,user.id,body):await chat(db,user.id,body);
  return new Response(JSON.stringify({ok:true,...result}),{headers:{...cors,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:'AI agent error'}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}
});
