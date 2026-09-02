import {supabase} from '../lib/supabase';
export const ENTITLEMENT_ID=import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID||'impulse_premium';
export async function initializeRevenueCat(userId:string){
 try { const mod:any=await import('@revenuecat/purchases-capacitor'); const Purchases=mod.Purchases||mod.default; if(Purchases?.configure){await Purchases.configure({apiKey:import.meta.env.VITE_REVENUECAT_API_KEY||'',appUserID:userId});} } catch(e){console.warn('RevenueCat no configurado',e)}
}
export async function getRevenueCatCustomer(){try{const mod:any=await import('@revenuecat/purchases-capacitor');const P=mod.Purchases||mod.default;return P?.getCustomerInfo?await P.getCustomerInfo():null}catch{return null}}
export async function refreshSubscriptionFromStore(){const info:any=await getRevenueCatCustomer();const active=!!info?.customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];if(supabase&&active){await supabase.from('subscriptions').upsert({plan:'premium',status:'active',source:'revenuecat',provider:'revenuecat'})}return active}
export async function presentPaywall(){throw new Error('Configurá RevenueCat + offerings antes de habilitar compras reales.')}
