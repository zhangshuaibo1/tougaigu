// The existing moss-colored cat, painted at its original following position.
// Read-only presentation: no following simulation, event queue or extra clock.
const TAU=Math.PI*2;
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hex=(s,fallback)=>/^#[\da-f]{6}$/i.test(s||'')?s:fallback;
const required=['save','restore','translate','rotate','beginPath','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','closePath','ellipse','fill','stroke','createLinearGradient'];

export function isCompanionScene(game){
  if(!game||game.destroyed||game.mode!=='story'||!Number.isInteger(game.chapterIndex)||game.chapterIndex<0||game.chapterIndex>5)return false;
  if(!game.level||!game.options||!game.cap||!game.body||!['playing','paused','complete'].includes(game.state)||!['body','soul'].includes(game.form))return false;
  return Number.isFinite(game.capOpen)&&['x','y','vx','vy','face','walk','land'].every(key=>Number.isFinite(game.body[key]))
    &&['age','progress','entry','openness','fromOpen','handGrip','handClasp','handCatch'].every(key=>Number.isFinite(game.cap[key]))
    &&['closed','opening','open','returning'].includes(game.cap.phase);
}
const validReturnFrom=from=>from&&['x','y','vx','vy','scale','alpha'].every(key=>Number.isFinite(from[key]))&&from.scale>0&&from.alpha>.02;

/** The caller supplies the same original character/presented-soul calculation. */
export function getCompanionView(game,x,y,t,shown=null){
  if(!isCompanionScene(game)||!Number.isFinite(x)||!Number.isFinite(y))return null;
  const reduced=game.options?.reducedMotion===true,time=reduced?0:finite(t);
  const returning=!reduced&&game.form==='body'&&game.cap.phase==='returning'&&validReturnFrom(game.cap.returnFrom);
  const presented=shown&&['x','y','alpha','scale'].every(key=>Number.isFinite(shown[key]))&&shown.alpha>.05&&shown.scale>0;
  const visible=presented&&(returning&&shown.pose==='return'&&shown.layer==='inside'
    ||game.form==='soul'&&(shown.pose==='peek'&&shown.layer==='inside'||shown.pose==='free'&&shown.layer==='world'));
  const target=Object.freeze(visible?{x:shown.x,y:shown.y}:{x:game.body.x,y:game.body.y-58});
  const dx=target.x-x,dy=target.y-(y-32),attention=visible?clamp(-dy/190,0,1):0;
  const happy=finite(game.emoteTime)>0;
  const naturalBlink=!reduced&&Math.sin(time*1.6+.8)>.985?.18:happy?.6:1;
  // Base recall reaches the cap at .48s, then finishes closing at .72s.
  // Those are the last third of the ORIGINAL cap.progress, not a new timer.
  // An invisible immediate double-E has no returnFrom and cannot create this
  // settling blink. Reopening/respawn/reduced motion clear the original phase.
  const closing=returning&&!visible&&game.cap.progress>=2/3&&game.cap.progress<1;
  const returnBlink=closing?Math.sin(Math.PI*clamp((game.cap.progress-2/3)*3,0,1)):0;
  return Object.freeze({
    x,y,time,reduced,happy,focus:visible?shown.pose:'body',target,
    lookX:clamp(dx/145,-1.3,1.3),lookY:clamp(dy/120,-1.3,1.3),
    attention,earLift:attention*1.6,
    headTilt:reduced?0:clamp(dx/180,-1,1)*attention*.085,
    blink:Math.max(.12,Math.min(naturalBlink,1-returnBlink*.88)),returnBlink,
    bob:reduced?0:Math.sin(time*(happy?5:2))*(happy?4:2),
    tailBend:reduced?0:Math.sin(time*2.5)*4,
    light:hex(game.level?.theme?.light,'#edcf99'),
  });
}
function oval(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();}
function gradient(c,x,y,x2,y2,stops){const g=c.createLinearGradient(x,y,x2,y2);for(const [n,col] of stops)g.addColorStop(n,col);return g;}
function line(c,points,color,width=1){c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function curve(c,points,color,width=1){c.beginPath();c.moveTo(...points.slice(0,2));c.bezierCurveTo(...points.slice(2));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function star(c,x,y,r,paint){c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.2,y-r*.2,x+r,y);c.quadraticCurveTo(x+r*.2,y+r*.2,x,y+r);c.quadraticCurveTo(x-r*.2,y+r*.2,x-r,y);c.quadraticCurveTo(x-r*.2,y-r*.2,x,y-r);c.closePath();c.fillStyle=paint;c.fill();}
function headPath(c,lift){
  c.beginPath();c.moveTo(-12,-38);
  c.lineTo(-15.3,-51.7-lift*.45);c.quadraticCurveTo(-10,-48,-4,-43.5);
  c.quadraticCurveTo(0,-45,4,-43.5);c.quadraticCurveTo(10,-48,15.1,-51.7-lift*.45);
  c.lineTo(12.8,-37.5);c.quadraticCurveTo(16,-32,13,-27);
  c.quadraticCurveTo(7,-20.5,0,-21.7);c.quadraticCurveTo(-9,-21,-13,-27);
  c.quadraticCurveTo(-16,-33,-12,-38);c.closePath();
}

export function drawRefinedCompanion(c,view){
  // Reject before drawing, so the caller can safely use the old painter. An
  // unexpected mid-paint exception is never relabeled as an undrawn fallback.
  if(!view||!c||!required.every(name=>typeof c[name]==='function')
    ||!['x','y','time','lookX','lookY','attention','earLift','headTilt','blink','bob','tailBend'].every(key=>Number.isFinite(view[key]))
    ||view.blink<0||view.blink>1)return false;
  const v=view;c.save();
  try{
    c.translate(v.x,v.y);c.lineCap='round';c.lineJoin='round';
    // Keep the old shadow and floating origin. This painter adds no collision,
    // landing claim, projected surface or new following simulation.
    oval(c,0,-3,18,4,'#0d1c264d');c.translate(0,v.bob);
    curve(c,[-8,-12,-27,-10,-28,-28,-20,-32+v.tailBend],'#618b7e',6.7);
    curve(c,[-8,-12,-26,-11,-27,-28,-20,-32+v.tailBend],'#a4c5ac',4.7);
    curve(c,[-11,-13,-25,-12,-26,-27,-20,-31+v.tailBend],'#d4dfbbbd',1.25);
    const body=gradient(c,-13,-37,13,-7,[[0,'#d2dfbf'],[.43,'#a9c3a7'],[1,'#688f7b']]);
    oval(c,0,-22,12.8,18,body);
    c.beginPath();c.moveTo(-5,-33);c.quadraticCurveTo(-10,-24,-7,-13);c.quadraticCurveTo(-5,-5,1,-6);c.quadraticCurveTo(9,-9,7,-21);c.quadraticCurveTo(6,-29,3,-33);c.closePath();
    c.fillStyle=gradient(c,-7,-30,7,-7,[[0,'#edf0cf'],[.55,'#d5dfb8'],[1,'#acbc99']]);c.fill();
    curve(c,[-9,-24,-12,-19,-10,-12,-7,-10],'#e5ebc28c',1.2);
    // Separate soft paws replace the old zigzag without moving the foot area.
    for(const side of [-1,1]){
      const x=side*5.3;
      oval(c,x,-4.1,4.5,2.9,'#6e927b');oval(c,x-.5,-4.9,3.7,2.4,'#dce5be');
      line(c,[[x+.3,-5.8],[x+.3,-3.7]],'#a5b797',.65);
    }
    c.save();
    try{
      c.translate(0,-27);c.rotate(v.headTilt);c.translate(0,27);
      headPath(c,v.earLift);c.fillStyle=gradient(c,-14,-48,14,-23,[[0,'#e4e9c7'],[.38,'#c0d2b4'],[1,'#7ea38d']]);c.fill();
      c.strokeStyle='#648a786e';c.lineWidth=.85;c.stroke();
      // Ear folds stay inside the original silhouette. There are no new props.
      for(const side of [-1,1]){
        c.beginPath();c.moveTo(side*12.2,-47.7-v.earLift*.25);c.lineTo(side*10.1,-38.5);c.lineTo(side*5.2,-42.9);c.closePath();c.fillStyle='#c3988d';c.fill();
        line(c,[[side*11.8,-45.7],[side*10.2,-39.7]],'#e8c5aa',.9);
      }
      c.beginPath();c.moveTo(-11,-37);c.quadraticCurveTo(0,-43,11,-37);c.quadraticCurveTo(12,-27,0,-24);c.quadraticCurveTo(-12,-27,-11,-37);c.closePath();
      c.fillStyle=gradient(c,0,-40,0,-24,[[0,'#e4e9c48c'],[1,'#d0dcb36b']]);c.fill();
      for(const x of [-5.1,5.1]){
        oval(c,x,-32.1,3.0,3.9*v.blink,gradient(c,x-2,-36,x+2,-28,[[0,'#263f40'],[1,'#49716a']]));
        if(v.blink>.3){oval(c,x+v.lookX*.7,-33+v.lookY*.65,.9,1.25,'#fff5d9');oval(c,x-.6,-30.1,.45,.55,'#a3cfb389');}
      }
      // A short nose and paired muzzle read as the existing cat, not a beak.
      oval(c,-3.4,-25.8,4.0,2.8,'#e7e9c9b8');oval(c,3.4,-25.8,4.0,2.8,'#e7e9c9b8');
      c.beginPath();c.moveTo(-2.1,-27.7);c.quadraticCurveTo(0,-29,2.1,-27.7);c.quadraticCurveTo(.9,-25.5,0,-25.9);c.quadraticCurveTo(-.9,-25.5,-2.1,-27.7);c.closePath();c.fillStyle='#997e75';c.fill();
      curve(c,[0,-25.6,-.5,-23.4,-2,-23.7,-3,-24.4],'#6d8875',.8);
      curve(c,[0,-25.6,.5,-23.4,2,-23.7,3,-24.4],'#6d8875',.8);
      for(const side of [-1,1]){
        oval(c,side*10,-27,2.8,1.2,'#cd9e8b55');
        line(c,[[side*10,-28.2],[side*16.5,-29.1]],'#dfe5bd8a',.75);
      }
      curve(c,[-10,-38,-8,-40,-5,-40.5,-3,-40],'#f6f4d698',1.1);
    }finally{c.restore();}
    if(v.happy)star(c,20,-46,4,v.light);
    return true;
  }finally{c.restore();}
}
