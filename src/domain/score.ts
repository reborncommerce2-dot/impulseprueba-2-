import {AppState,dateKey} from './types';
export function calculateScore(s:AppState){
 const today=dateKey(); const active=s.habits.filter(h=>h.active); let positive=0, negative=0, posMax=0, negMax=0;
 for(const h of active){ const logs=s.habitLogs.filter(l=>l.habitId===h.id && l.date.slice(0,10)===today); const value=logs.reduce((a,l)=>a+l.value,0); const done=h.type==='boolean'?value>0:(h.target?Math.min(value/h.target,1):value>0); if(h.positive){posMax++; if(done)positive++;}else{negMax++; if(done)negative++;}}
 const exercise=s.workouts.filter(x=>x.date.slice(0,10)===today).length?85:50;
 const food=s.meals.filter(x=>x.date.slice(0,10)===today).length?80:50;
 const finance=s.expenses.filter(x=>x.date.slice(0,10)===today).length||s.incomes.filter(x=>x.date.slice(0,10)===today).length?75:60;
 const viceCount=s.consumptionLogs.filter(x=>x.date.slice(0,10)===today).reduce((a,x)=>a+x.quantity,0); const vices=Math.max(30,Math.min(90,80-viceCount*3));
 const habits=posMax+negMax?Math.round((positive/Math.max(posMax,1))*100 - (negative/Math.max(negMax,1))*20):65;
 const score=Math.round(Math.max(0,Math.min(100,(exercise+food+finance+vices+habits)/5)));
 return {score,breakdown:{Ejercicio:exercise,Alimentación:food,Finanzas:finance,Vicios:vices,Hábito:habits},factors:[`${positive} hábitos positivos cumplidos`,`${negative} hábitos negativos registrados`,`${s.workouts.filter(x=>x.date.slice(0,10)===today).length} entrenamientos hoy`,`${s.waterLogs.filter(x=>x.date.slice(0,10)===today).reduce((a,x)=>a+x.amountMl,0)} ml de agua registrados`]};
}
