import { supabase } from './lib/supabase';
export async function track(event:string,screen?:string,properties:Record<string,unknown>={}){try{if(supabase){await supabase.from('analytics_events').insert({event,screen,properties});}}catch{}}
