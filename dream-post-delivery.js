// Nonpersistent display state driven by a successful in-game recall.
export const POST_RETURN_ARRIVAL=.48;
export const createPostDelivery=()=>({phase:'waiting',run:null,body:null});
export function beginPostReturn(s,{eligible=false,lamps=[],run,body,cap,reducedMotion=false}={}){
 if(!s||s.phase==='settled'||!eligible||lamps.length<2||!lamps.slice(0,2).every(l=>l?.lit)||!Number.isInteger(run)||!body||!cap||
 !(cap.phase==='returning'||reducedMotion&&cap.phase==='closed'))return false;
 s.phase=reducedMotion?'settled':'returning';s.run=run;s.body=body;return true;
}
export function advancePostDelivery(s,{eligible=false,lamps=[],run,body,cap,playing=true,reducedMotion=false}={}){
 if(!s)return;
 if(!eligible||!body||!cap||s.run!==null&&(s.run!==run||s.body!==body)){
  Object.assign(s,createPostDelivery());return;
 }
 if(!playing)return;
 if(s.phase==='waiting'&&lamps.length>=2&&lamps.slice(0,2).every(l=>l?.lit)){s.phase='ready';return;}
 if(s.phase!=='returning')return;
 if(reducedMotion||Number.isFinite(cap.age)&&cap.age>=.48&&['returning','closed'].includes(cap.phase)){s.phase='settled';return;}
 if(cap.phase!=='returning'){s.phase='ready';s.run=null;s.body=null;}
}
export function clearPostDelivery(s){if(s)Object.assign(s,createPostDelivery());}
export function settlePostDelivery(s){if(s?.phase==='returning')s.phase='settled';}
export function postDeliveryView(s){return s?Object.freeze({phase:s.phase}):null;}
export function drawPostReturnSpark(c,s,p){
 if(s?.phase!=='returning'||!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||typeof c?.save!=='function')return false;
 let saved=false;
 try{
  c.save();saved=true;
  const alpha=Math.max(0,Math.min(1,p.alpha??1));
  const g=c.createRadialGradient(p.x,p.y,1,p.x,p.y,24);
  g.addColorStop(0,'rgba(255,225,165,.55)');g.addColorStop(1,'rgba(255,225,165,0)');
  c.globalAlpha=alpha;c.fillStyle=g;c.fillRect(p.x-24,p.y-24,48,48);
  return true;
 }catch{return false;}finally{if(saved)try{c.restore();}catch{}}
}
