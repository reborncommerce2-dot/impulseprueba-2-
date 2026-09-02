const KEY='impulse.notification.preferences';
export type NotificationPrefs={enabled:boolean;quietStart:string;quietEnd:string;habit:boolean;reminder:boolean;ai:boolean;system:boolean;maxPerDay:number};
export const defaultNotificationPrefs:NotificationPrefs={enabled:true,quietStart:'22:00',quietEnd:'08:00',habit:true,reminder:true,ai:true,system:true,maxPerDay:5};
export function getNotificationPrefs():NotificationPrefs{try{return {...defaultNotificationPrefs,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaultNotificationPrefs}}
export function saveNotificationPrefs(v:NotificationPrefs){localStorage.setItem(KEY,JSON.stringify(v));}
