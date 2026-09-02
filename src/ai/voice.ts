export type VoiceStatus='idle'|'listening'|'speaking'|'unsupported';

type RecognitionCtor = new () => {
  lang:string; interimResults:boolean; continuous:boolean;
  start:()=>void; stop:()=>void; abort:()=>void;
  onresult:((event:any)=>void)|null; onerror:((event:any)=>void)|null; onend:(()=>void)|null;
};

function ctor():RecognitionCtor|undefined{return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;}
export function voiceSupported(){return Boolean(ctor()) && 'speechSynthesis' in window;}
export function startListening(onText:(text:string)=>void,onState?:(s:VoiceStatus)=>void,onError?:(message:string)=>void){
 const C=ctor();if(!C){onState?.('unsupported');return ()=>{}};
 const r=new C();r.lang='es-AR';r.interimResults=false;r.continuous=false;r.onresult=e=>{const text=Array.from(e.results||[]).map((x:any)=>x[0]?.transcript||'').join(' ').trim();if(text)onText(text)};r.onerror=e=>{onState?.('idle');onError?.(e?.error||'No se pudo reconocer la voz.')};r.onend=()=>onState?.('idle');r.start();onState?.('listening');return ()=>{try{r.stop()}catch{}};
}
export function speak(text:string,onState?:(s:VoiceStatus)=>void){if(!('speechSynthesis'in window)){onState?.('unsupported');return}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='es-AR';u.onstart=()=>onState?.('speaking');u.onend=()=>onState?.('idle');u.onerror=()=>onState?.('idle');window.speechSynthesis.speak(u)}
export function stopSpeaking(){if('speechSynthesis'in window)window.speechSynthesis.cancel()}
