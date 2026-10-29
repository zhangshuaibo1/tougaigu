// v21: a tiny earned curtain-call at the right bank. The physical journey,
// chapter rewards and input remain entirely owned by the original engine.
const finite=Number.isFinite;
const valid=p=>p&&[p.x,p.y,p.w,p.h].every(finite)&&p.w>0;
const at=(body,surface)=>valid(body)&&valid(surface)&&body.grounded===true
  &&Math.abs(body.y-surface.y)<3&&body.x+body.w/2>surface.x+1
  &&body.x-body.w/2<surface.x+surface.w-1;
const dock=(stage,bank)=>Math.abs(stage.y-bank.y)<.1
  &&Math.min(stage.x+stage.w,bank.x+bank.w)-Math.max(stage.x,bank.x)>1;
const duration=2.1;
export function createTheatreEncore(){return {phase:'waiting',age:0,rideDistance:0,lastStageX:null,deaths:null};}
export function getTheatreEncoreView(s){
  if(!s||!['active','done'].includes(s.phase))return null;
  return Object.freeze({phase:s.phase,age:Math.max(0,Math.min(duration,s.age)),duration});
}
export function advanceTheatreEncore(s,context={},dt=0){
  if(!s||context.state!=='playing'||context.mode!=='story'||context.chapterIndex!==2
     ||context.form!=='body'||!finite(dt)||dt<=0)return s;
  const deaths=finite(context.deaths)?context.deaths:0;
  if(s.deaths===null)s.deaths=deaths;
  if(s.deaths!==deaths){Object.assign(s,createTheatreEncore(),{deaths});return s;}
  if(s.phase==='done')return s;
  if(s.phase==='active'){
    s.age=Math.min(duration,s.age+Math.min(dt,.05));
    if(s.age>=duration)s.phase='done';return s;
  }
  const b=context.body,stage=context.movers?.find(p=>p.id==='stage'&&valid(p));
  const banks=context.level?.platforms?.filter(p=>valid(p)&&Math.abs(p.y-stage?.y)<12)||[];
  const left=banks.find(p=>p.x===565),right=banks.find(p=>p.x===1130);
  if(!valid(b)||!stage||!left||!right){s.phase='waiting';return s;}
  const riding=b.platform===stage.id&&at(b,stage);
  if(s.phase==='waiting'){
    // A mere right-bank spawn, a soul, a jump over the gap or a stationary
    // overlap cannot arm the curtain-call: actually board at the left dock.
    if(riding&&stage.dx>0&&dock(stage,left)&&stage.x<785
       &&b.x<left.x+left.w+90){s.phase='riding';s.lastStageX=stage.x;}
    return s;
  }
  if(s.phase==='riding'){
    if(riding){
      if(finite(s.lastStageX)&&stage.x>=s.lastStageX){s.rideDistance+=stage.x-s.lastStageX;}
      s.lastStageX=stage.x;
      return s;
    }
    const landed=at(b,right)&&b.platform==null&&b.x>right.x+70
      &&dock(stage,right)&&stage.x>=1000&&s.rideDistance>145;
    if(landed){s.phase='active';s.age=0;}
    else {s.phase='waiting';s.rideDistance=0;s.lastStageX=null;}
  }
  return s;
}
// Paint a short, unobtrusive moon-and-ribbon bow in world space, outside the
// player's feet and collision envelope. Reduced motion uses a still medallion.
export function drawTheatreEncore(c,s,{reducedMotion=false}={}){
  const v=getTheatreEncoreView(s);
  if(!v||v.phase!=='active'||!c||typeof c.save!=='function')return false;
  const progress=reducedMotion?1:Math.min(1,v.age/.42);
  const fade=reducedMotion?1:Math.min(1,(duration-v.age)/.45);
  if(fade<=0)return false;
  c.save();
  try{
    c.translate(1240,377);c.globalAlpha*=progress*fade;
    const lift=reducedMotion?0:14*(1-progress);
    c.translate(0,lift);
    const gold=c.createLinearGradient(-50,-30,52,22);
    gold.addColorStop(0,'#b98855');gold.addColorStop(.5,'#ffe4ab');gold.addColorStop(1,'#a16d6e');
    // Ribbon arc opening like a little theatre curtain, never opaque above the player.
    for(const side of [-1,1]){
      c.save();c.scale(side,1);
      c.beginPath();c.moveTo(0,0);c.bezierCurveTo(14,-14,40,-16,55,-8);
      c.bezierCurveTo(48,6,38,10,24,8);c.quadraticCurveTo(9,6,0,0);
      c.closePath();c.fillStyle=side===-1?'#94698dcc':'#a87b9dcc';c.fill();
      c.strokeStyle='#e6c39b';c.lineWidth=1.8;c.stroke();
      c.beginPath();c.moveTo(10,-3);c.quadraticCurveTo(35,-10,49,-5);
      c.strokeStyle='#ffddabac';c.lineWidth=1.2;c.stroke();c.restore();
    }
    c.beginPath();c.arc(0,-2,12,0,Math.PI*2);c.fillStyle=gold;c.fill();
    c.beginPath();c.arc(0,-4,6.5,0,Math.PI*2);c.fillStyle='#fff0bd';c.fill();
    c.beginPath();c.arc(3,-6,5.8,0,Math.PI*2);c.fillStyle='#bd9b9d';c.fill();
    for(let i=0;i<7;i++){
      const x=(i-3)*18,y=-30-Math.abs(i-3)*2-(reducedMotion?0:Math.sin(v.age*6+i)*4);
      c.save();c.translate(x,y);c.rotate(i*.31);
      c.beginPath();c.moveTo(0,-3);c.lineTo(2,0);c.lineTo(0,3);c.lineTo(-2,0);c.closePath();
      c.fillStyle=i%2?'#f8d393':'#e9c9eb';c.fill();c.restore();
    }
    return true;
  }finally{c.restore();}
}
