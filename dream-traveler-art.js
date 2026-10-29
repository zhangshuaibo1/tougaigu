// Ashi's clothing and gait. Presentation only: no game clocks, assets, or state.
// The existing cap rig remains the authority for head, hands and carried objects.
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const ease=n=>n*n*(3-2*n);
const mod=(n,d)=>(n%d+d)%d;
const mix=(a,b,t)=>a+(b-a)*t;

function tint(value,target,amount){
  const color=/^#[0-9a-f]{6}$/i.test(value||'')?value:'#79689b';
  return '#'+[1,3,5].map(i=>Math.round(mix(parseInt(color.slice(i,i+2),16),parseInt(target.slice(i,i+2),16),amount)).toString(16).padStart(2,'0')).join('');
}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();}
function line(c,points,color,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function gradient(c,x0,y0,x1,y1,stops){const fill=c.createLinearGradient(x0,y0,x1,y1);for(const [offset,color] of stops)fill.addColorStop(offset,color);return fill;}

export function getTravelerMotion(body={}, {time=0,hop=0,reducedMotion=false,performance=null}={}){
  const speed=clamp(Math.abs(finite(body.vx))/240,0,1),grounded=body.grounded!==false;
  const amount=reducedMotion?0:ease(clamp((speed-.035)/.2,0,1));
  // `walk` already integrates travelled distance / 20. A 60px cycle gives
  // each planted foot 30px of travel, with a linear stance and curved swing.
  const travelledPhase=finite(body.walk)*TAU/3,phase=mod(travelledPhase,TAU);
  const rise=grounded||reducedMotion?0:clamp(-finite(body.vy)/600,0,1);
  const fall=grounded||reducedMotion?0:clamp(finite(body.vy)/650,0,1);
  const landing=reducedMotion?0:clamp(finite(body.land),0,.22)/.22;
  const settle=reducedMotion?0:clamp(finite(performance?.landing),0,1),riding=reducedMotion?0:clamp(finite(performance?.ride),0,1);
  const balance=reducedMotion?0:clamp(finite(performance?.balance),-1,1),airRise=reducedMotion?0:clamp(finite(performance?.rise),0,1);
  const clock=reducedMotion?0:finite(time),breathe=reducedMotion?0:Math.sin(clock*1.8);
  const legs=[-7,7].map((x,index)=>{
    const cycle=mod(phase+index*Math.PI,TAU),stance=cycle<=Math.PI;
    const u=stance?cycle/Math.PI:(cycle-Math.PI)/Math.PI;
    const travel=stance?15-30*u:-15+30*ease(u);
    const lift=stance?0:Math.sin(Math.PI*u)*8.5;
    const swingAngle=stance?0:-.24*Math.sin(Math.PI*u)*Math.cos(Math.PI*u);
    let soleX=x+(grounded?travel*amount:(index?1:-1)*(rise*4+fall*2));
    let soleY=grounded?finite(hop)-lift*amount:-3-rise*(index?9:6)+fall*2.2;
    if(!grounded)soleY-=airRise*(index?3:2);
    if(reducedMotion){soleX=x;soleY=finite(hop);}
    const hip={x,y:-21},ankle={x:soleX,y:soleY-4.8};
    const knee={x:mix(hip.x,ankle.x,.48)+(grounded?2+landing*2:3+rise*3)+(index?1:-1)*(settle*2.2+riding),y:mix(hip.y,ankle.y,.53)+settle*2.8};
    return {hip,knee,ankle,foot:{x:soleX,y:soleY,angle:reducedMotion?0:grounded?swingAngle*amount:(index?-.08:.12)*rise},planted:grounded&&(stance||amount===0),lift:grounded?lift*amount:rise*7};
  });
  return {legs,speed,phase,landing,rise,fall,
    hem:reducedMotion?0:(grounded?Math.sin(phase)*amount*1.3:rise*1.7-fall*.9)+settle*1.2,
    scarfLift:reducedMotion?0:speed*3.5+fall*4-rise*2-settle*3+riding*Math.abs(balance)*1.5,
    scarfWave:reducedMotion?0:Math.sin(clock*3+travelledPhase*.16)*(1+speed*1.3)+balance*1.4,
    satchelAngle:reducedMotion?-.14:-.14+Math.sin(phase-.45)*amount*.1+rise*.08-fall*.06-settle*.16-balance*.025,
    breathe};
}

export function drawTravelerBack(c,motion,dress){
  c.save();c.lineJoin='round';c.lineCap='round';
  // A padded leather delivery bag, tucked behind the coat, with a brass clasp.
  c.save();c.translate(-18,-27);c.rotate(motion.satchelAngle);
  c.beginPath();c.roundRect(-10,-4,19,23,4);c.fillStyle=gradient(c,-10,-4,10,19,[[0,'#d7ae7c'],[.35,'#bd895e'],[1,'#795b4e']]);c.fill();c.strokeStyle='#604d48';c.lineWidth=1.15;c.stroke();
  c.beginPath();c.moveTo(-10,-3);c.lineTo(9,-3);c.lineTo(8,4);c.quadraticCurveTo(-1,9,-9,4);c.closePath();c.fillStyle=gradient(c,-9,-3,7,8,[[0,'#e0b784'],[1,'#a67651']]);c.fill();
  line(c,[[-7,7],[-7,15],[5,15]],'#f1cfa16e',.8);line(c,[[-6,-1],[5,-1]],'#f6d8a39e',.8);
  c.beginPath();c.roundRect(-2,3,5,6,1.3);c.fillStyle='#e4c17f';c.fill();line(c,[[.5,4],[.5,7]],'#796752',.9);
  oval(c,-6,1,1,1,'#b28254');oval(c,6,1,1,1,'#b28254');c.restore();

  // One wide fold and its shaded underside read at play size; avoid tiny noise.
  const lift=motion.scarfLift,wave=motion.scarfWave;
  c.beginPath();c.moveTo(-10,-39);c.bezierCurveTo(-24,-39,-31,-47-lift,-47,-42-lift+wave);c.lineTo(-43,-32-lift+wave*.7);c.bezierCurveTo(-31,-35-lift,-21,-31,-10,-33);c.closePath();
  c.fillStyle=gradient(c,-24,-45-lift,-27,-32-lift,[[0,tint(dress.scarf,'#fff5cf',.25)],[.4,dress.scarf],[1,tint(dress.scarf,'#243248',.26)]]);c.fill();
  c.beginPath();c.moveTo(-43,-32-lift+wave*.7);c.quadraticCurveTo(-33,-36-lift,-25,-36-lift*.25);c.lineTo(-34,-39-lift);c.closePath();c.fillStyle=tint(dress.scarf,'#342f42',.25);c.fill();
  c.beginPath();c.moveTo(-15,-37);c.bezierCurveTo(-28,-38,-34,-44-lift,-43,-40-lift+wave);c.strokeStyle=tint(dress.scarf,'#fff8d5',.43);c.lineWidth=.85;c.stroke();
  line(c,[[-43,-40-lift+wave],[-40,-35-lift+wave*.7]],tint(dress.scarf,'#fff8dd',.34),1);
  c.restore();
}

export function drawTravelerLegs(c,motion){
  c.save();c.lineJoin='round';c.lineCap='round';
  for(const [index,leg] of motion.legs.entries()){
    const points=[[leg.hip.x,leg.hip.y],[leg.knee.x,leg.knee.y],[leg.ankle.x,leg.ankle.y]];
    line(c,points,index?'#a69f8c':'#979b8e',5.3);line(c,points,index?'#e7d9b6':'#c9cdb9',3.9);
    line(c,[[leg.hip.x-1,leg.hip.y+2],[leg.knee.x-1,leg.knee.y]],'#fff1cc99',1.05);
    oval(c,leg.knee.x,leg.knee.y,2.8,2.5,index?'#f5e9c6':'#d7dfc7');
    // The sole is y=0 in its own coordinates. A planted sole therefore stays
    // on the collision surface despite the existing rig's bob or compression.
    c.save();c.translate(leg.foot.x,leg.foot.y);c.rotate(leg.foot.angle);
    c.beginPath();c.moveTo(-5,-7);c.quadraticCurveTo(-1,-8,2,-6);c.lineTo(5,-5);c.quadraticCurveTo(10,-4,10,-1.5);c.lineTo(-6,-1.5);c.quadraticCurveTo(-7,-4,-5,-7);c.closePath();
    c.fillStyle=gradient(c,-5,-8,9,0,[[0,index?'#d2dcc3':'#b9caba'],[.5,index?'#9eb8a9':'#849f99'],[1,'#547771']]);c.fill();
    line(c,[[-6,-.9],[9,-.9]],'#364f53',1.8);line(c,[[-3,-6],[2,-5]],'#f0dfbb',1.1);line(c,[[4,-3.5],[7,-3]],'#c9e0c799',.9);c.restore();
  }
  c.restore();
}

export function drawTravelerCoat(c,motion,dress){
  c.save();c.lineJoin='round';c.lineCap='round';
  const hem=motion.hem;
  c.beginPath();c.moveTo(-13,-39);c.quadraticCurveTo(1,-47,14,-38);c.lineTo(17,-17+hem);c.quadraticCurveTo(2,-11,-16,-18-hem);c.closePath();
  c.fillStyle=gradient(c,-16,-37,18,-16,[[0,tint(dress.coat,'#e5e2ce',.38)],[.22,tint(dress.coat,'#f5dfc7',.13)],[.58,dress.coat],[1,tint(dress.coat,'#1b3040',.33)]]);c.fill();c.strokeStyle=tint(dress.coat,'#223446',.44);c.lineWidth=1.2;c.stroke();
  // Broad seams and a soft hem turn the coat into cloth, not a flat polygon.
  c.beginPath();c.moveTo(-12,-34);c.quadraticCurveTo(-13,-23,-12,-19);c.strokeStyle=tint(dress.trim,'#d9eee3',.15);c.lineWidth=1.05;c.stroke();
  c.beginPath();c.moveTo(9,-32);c.quadraticCurveTo(13,-23,13,-18+hem*.65);c.strokeStyle=tint(dress.coat,'#213447',.28);c.lineWidth=2.2;c.stroke();
  c.beginPath();c.moveTo(-13,-17-hem*.65);c.quadraticCurveTo(1,-13,14,-16+hem*.7);c.strokeStyle=tint(dress.trim,'#fff2d5',.14);c.lineWidth=1.1;c.stroke();
  line(c,[[0,-35],[0,-18]],tint(dress.coat,'#263447',.25),1.7);line(c,[[1,-34],[1,-19]],tint(dress.trim,'#f5e8c8',.15),.6);
  for(const y of [-31,-25,-19]){oval(c,3,y,1.7,1.7,'#847153');oval(c,2.5,y-.5,1.15,1.15,'#e8ce95');}
  c.beginPath();c.moveTo(-11,-28);c.lineTo(-4,-28);c.lineTo(-4,-23);c.quadraticCurveTo(-7,-20,-11,-23);c.closePath();c.fillStyle=tint(dress.coat,'#e1ead5',.12);c.fill();line(c,[[-11,-28],[-4,-28]],tint(dress.trim,'#f5e8c8',.1),.8);
  // The diagonal strap visually connects the bag to its traveler.
  c.beginPath();c.moveTo(9,-39);c.quadraticCurveTo(0,-30,-16,-19);c.strokeStyle='#2a344b55';c.lineWidth=4.8;c.stroke();c.strokeStyle='#987a60';c.lineWidth=3.2;c.stroke();
  c.beginPath();c.moveTo(8,-39);c.quadraticCurveTo(-1,-30,-16,-20);c.strokeStyle='#dbbb8d99';c.lineWidth=.8;c.stroke();
  // A soft scarf collar overlaps the strap and is shaded under the skull.
  c.beginPath();c.roundRect(-16,-41,32,8,4);c.fillStyle=gradient(c,-8,-41,4,-33,[[0,tint(dress.scarf,'#fff3d4',.22)],[.45,dress.scarf],[1,tint(dress.scarf,'#463544',.22)]]);c.fill();
  line(c,[[-11,-37],[9,-37]],'#fff0cf44',.9);oval(c,11,-37,3.4,3.1,tint(dress.scarf,'#fff0d1',.1));
  c.restore();
}
