import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';
import type { Reminder } from '../domain/types';

export async function requestNotificationPermission(){
  try { const p=await LocalNotifications.requestPermissions(); return p.display==='granted'; } catch { return 'Notification' in window ? Notification.requestPermission().then(x=>x==='granted') : false; }
}

export async function scheduleReminder(reminder:Reminder){
  const date=new Date(reminder.dueAt); if(date.getTime()<=Date.now() || reminder.status!=='active') return;
  try {
    await LocalNotifications.schedule({notifications:[{id:hashId(reminder.id),title:'Impulse',body:reminder.title,schedule:{at:date},extra:{reminderId:reminder.id}}]});
  } catch {
    if('Notification' in window && Notification.permission==='granted') setTimeout(()=>new Notification('Impulse',{body:reminder.title}),Math.max(0,date.getTime()-Date.now()));
  }
}

export async function cancelReminder(reminderId:string){ try{ await LocalNotifications.cancel({notifications:[{id:hashId(reminderId)}]}); }catch{} }

export async function registerPushDevice(){
  if(!supabase) return {ok:false,reason:'supabase_not_configured'} as const;
  try {
    const permission=await PushNotifications.requestPermissions();
    if(permission.receive!=='granted') return {ok:false,reason:'permission_denied'} as const;
    await PushNotifications.register();
    const registration=await new Promise<any>((resolve,reject)=>{
      let done=false;
      const timeout=setTimeout(()=>{if(!done){done=true;reject(new Error('push registration timeout'))}},10000);
      PushNotifications.addListener('registration',token=>{if(!done){done=true;clearTimeout(timeout);resolve(token)}});
      PushNotifications.addListener('registrationError',e=>{if(!done){done=true;clearTimeout(timeout);reject(e)}});
    });
    const platform=registration?.value?'native':'unknown';
    await supabase.from('push_subscriptions').upsert({endpoint:registration.value,platform,enabled:true,last_seen_at:new Date().toISOString()},{onConflict:'user_id,endpoint'});
    return {ok:true,token:registration.value} as const;
  } catch(e:any){ return {ok:false,reason:e?.message||'push_unavailable'} as const; }
}

function hashId(s:string){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)||1;}
