import { supabase } from '../lib/supabase';

function appRedirectUrl(){ return new URL('./', window.location.href).href; }

export async function signUpEmail(email:string,password:string,name:string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const {data,error}=await supabase.auth.signUp({email,password,options:{data:{name}}});
  if(error) throw error; return data;
}
export async function signInEmail(email:string,password:string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error) throw error; return data;
}
export async function sendPhoneOtp(phone:string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const {error}=await supabase.auth.signInWithOtp({phone}); if(error) throw error;
}
export async function verifyPhoneOtp(phone:string,token:string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const {data,error}=await supabase.auth.verifyOtp({phone,token,type:'sms'}); if(error) throw error; return data;
}
export async function signInOAuth(provider:'google'|'apple') {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const {data,error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:appRedirectUrl()}});
  if(error) throw error; return data;
}
export async function signOut() { if (supabase) await supabase.auth.signOut(); }
export async function resetPassword(email:string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:appRedirectUrl()}); if(error) throw error;
}
