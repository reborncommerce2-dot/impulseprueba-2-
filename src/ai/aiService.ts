import { supabase } from '../lib/supabase';

export type Autonomy='assistant'|'copilot'|'autonomous';
export interface AISettings {autonomy:Autonomy;allow_auto_register:boolean;allow_create_objectives:boolean;allow_create_reminders:boolean;allow_change_home:boolean;allow_change_navigation:boolean;allow_external_actions:boolean;allow_history:boolean;allow_memory:boolean;voice_enabled:boolean;}
export interface AIProposal {id:string;toolName:string;arguments:Record<string,unknown>;}
export interface AIChatResult {conversationId:string;messageId:string;answer:string;proposals:AIProposal[];executed:any[];model:string;}

const defaults:AISettings={autonomy:'assistant',allow_auto_register:false,allow_create_objectives:false,allow_create_reminders:true,allow_change_home:false,allow_change_navigation:false,allow_external_actions:false,allow_history:true,allow_memory:true,voice_enabled:true};

export async function getAISettings():Promise<AISettings>{
 if(!supabase)return defaults;
 const {data,error}=await supabase.from('ai_settings').select('*').maybeSingle();
 if(error||!data)return defaults;
 return {...defaults,...data};
}
export async function saveAISettings(settings:Partial<AISettings>){
 if(!supabase)throw new Error('Supabase no está configurado.');
 const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Necesitás iniciar sesión.');
 const {data,error}=await supabase.from('ai_settings').upsert({user_id:user.id,...settings,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('*').single();
 if(error)throw new Error(error.message);return data as AISettings;
}
export async function chatWithAI(message:string,conversationId?:string):Promise<AIChatResult>{
 if(!supabase)throw new Error('La IA remota requiere Supabase configurado.');
 const {data,error}=await supabase.functions.invoke('ai-agent',{body:{message,conversationId}});
 if(error)throw error; if(!data?.ok)throw new Error(data?.error||'No se pudo contactar a Impulse IA.');return data as AIChatResult;
}
export async function confirmAIProposals(actions:AIProposal[],conversationId:string,messageId:string){
 if(!supabase)throw new Error('Supabase no está configurado.');
 const {data,error}=await supabase.functions.invoke('ai-agent',{body:{mode:'confirm',actions,conversationId,messageId}});
 if(error)throw error;if(!data?.ok)throw new Error(data?.error||'No se pudieron ejecutar las acciones.');return data.results||[];
}
export async function getMemory(){
 if(!supabase)return [];
 const {data,error}=await supabase.from('ai_memory').select('*').is('deleted_at',null).order('updated_at',{ascending:false});if(error)throw new Error(error.message);return data||[];
}
export async function deleteMemory(id:string){
 if(!supabase)throw new Error('Supabase no está configurado.');
 const {error}=await supabase.from('ai_memory').update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);if(error)throw new Error(error.message);
}
export async function getAIConversations(){
 if(!supabase)return [];
 const {data,error}=await supabase.from('ai_conversations').select('*').is('deleted_at',null).order('updated_at',{ascending:false}).limit(50);if(error)throw new Error(error.message);return data||[];
}
export async function getAIMessages(conversationId:string){
 if(!supabase)return [];
 const {data,error}=await supabase.from('ai_messages').select('*').eq('conversation_id',conversationId).is('deleted_at',null).order('created_at',{ascending:true});if(error)throw new Error(error.message);return data||[];
}
