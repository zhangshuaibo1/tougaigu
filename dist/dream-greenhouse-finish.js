// World-space greenhouse materials. These painters read authored geometry and
// the existing spring's boing value; they never own collision or animation time.
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const REQUIRED=['save','restore','beginPath','rect','clip','fill','stroke','fillRect','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','closePath','ellipse','roundRect','createLinearGradient','translate','scale'];
const contextReady=c=>!!c&&REQUIRED.every(name=>typeof c[name]==='function');
const validRect=p=>!!p&&[p.x,p.y,p.w,p.h,p.x+p.w,p.y+p.h].every(Number.isFinite)&&p.w>0&&p.h>0;
function gradient(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);for(const [at,color]of stops)g.addColorStop(at,color);return g;}
function path(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function curve(c,points,color,width=1){c.beginPath();c.moveTo(points[0],points[1]);c.bezierCurveTo(...points.slice(2));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,TAU);c.fillStyle=color;c.fill();}
function box(c,x,y,w,h,r,fill,edge=null,width=1){if(w<=0||h<=0)return;c.beginPath();c.roundRect(x,y,w,h,Math.min(Math.max(0,r),w/2,h/2));c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}}
const noise=(column,row=0)=>{const v=Math.sin(column*12.9898+row*78.233)*43758.5453;return v-Math.floor(v);};

function mossEdge(c,p,left,right){
  const depth=Math.min(10,p.h);
  c.fillStyle=gradient(c,0,p.y,0,p.y+depth,[[0,'#d1d6a4'],[.16,'#acc18d'],[.48,'#779e74'],[1,'#3b6454']]);c.fillRect(p.x,p.y,p.w,depth);
  const start=Math.floor(left/31)*31;
  for(let x=start,i=0;x<right&&i<280;x+=31,i++){
    const n=noise(Math.floor(x/31)),length=10+n*13,y=p.y+depth*.52;
    c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+length*.36,y+depth*.32,x+length,y+.3);c.strokeStyle=n>.5?'#bfce955c':'#315b4c62';c.lineWidth=1.1;c.stroke();
    if(depth>4){oval(c,x+length*.35,p.y+2.2,1.3,.65,'#eef0c454');path(c,[[x+22,p.y+.8],[x+21,p.y+depth*.55]],'#496f546c',.8);}
  }
  // A narrow unbroken edge, precisely on the authored top, distinguishes a
  // walkable surface from soft scenery. Nothing grows above the clip boundary.
  c.fillStyle='#e0e3b6';c.fillRect(p.x,p.y,p.w,Math.min(1,p.h));
}

function stone(c,p,left,right){
  c.fillStyle=gradient(c,0,p.y,0,p.y+p.h,[[0,'#667b68'],[.22,'#435d50'],[1,'#203f3b']]);c.fillRect(p.x,p.y,p.w,p.h);
  const rows=Math.min(12,Math.ceil(p.h/31)),tile=72;
  for(let row=0;row<rows;row++){
    const y=p.y+12+row*31,offset=(row%2)*36,start=Math.floor((left-offset)/tile)*tile+offset;
    for(let x=start,i=0;x<right&&i<140;x+=tile,i++){
      const n=noise(Math.floor((x-offset)/tile),row),w=tile-4;
      box(c,x+2,y,w,27,4+n*2,n>.48?'#76887535':'#203f3c54','#18393073',.8);
      path(c,[[x+8,y+2],[x+w-5,y+2]],'#b5c09b29',1);
      if(n>.28)curve(c,[x+13,y+10,x+25,y+8,x+28,y+16,x+37,y+18],'#203d3459',.85);
      oval(c,x+48,y+18,7,2,'#9faf8220');
    }
  }
  mossEdge(c,p,left,right);
}

function roots(c,p,left,right){
  c.fillStyle=gradient(c,p.x,p.y,p.x+p.w,p.y+p.h,[[0,'#84916d'],[.28,'#627956'],[.64,'#3c5c46'],[1,'#223e36']]);c.fillRect(p.x,p.y,p.w,p.h);
  // Interlocking broad roots form an opaque solid face. Their bark follows the
  // original rectangle, including its flat cap and the ground at its base.
  const count=Math.max(2,Math.min(12,Math.ceil(p.w/32))),spacing=p.w/count;
  for(let index=0;index<count;index++){
    const x=p.x+(index+.45)*spacing,bend=(index%2?1:-1)*Math.min(21,spacing*.65),width=Math.min(22,spacing*.78);
    const points=[x,p.y+5,x+bend,p.y+p.h*.3,x-bend*.8,p.y+p.h*.68,x+bend*.25,p.y+p.h+5];
    curve(c,points,'#213e32ad',width+5);curve(c,points,gradient(c,x-width*.5,0,x+width*.55,0,[[0,'#a1a77a'],[.28,'#788b60'],[.65,'#526f4e'],[1,'#38553f']]),width);
    curve(c,[x-width*.21,p.y+12,x+bend-width*.22,p.y+p.h*.31,x-bend*.8-width*.18,p.y+p.h*.67,x+bend*.25-width*.2,p.y+p.h],'#c0bd8a45',1.2);
    for(let j=0;j<3;j++){
      const y=p.y+p.h*(.22+j*.25),xx=x+Math.sin(j+index)*spacing*.15;
      curve(c,[xx-3,y,xx+4,y+4,xx-5,y+10,xx-1,y+16],'#314b3780',.85);
    }
  }
  // Two smaller roots weave across the trunks. Their curved, descending paths
  // read as living wood rather than extra horizontal footholds.
  if(p.w>=45&&p.h>=60)for(const [a,b,start,end]of [[.12,.68,.18,.71],[.91,.36,.42,.91]]){
    const x0=p.x+p.w*a,x1=p.x+p.w*b,y0=p.y+p.h*start,y1=p.y+p.h*end;
    const points=[x0,y0,x0+p.w*(b-a)*.12,y0+p.h*.25,x1-p.w*(b-a)*.12,y1-p.h*.2,x1,y1];
    curve(c,points,'#203e328f',9);curve(c,points,'#71835b',6.5);
    curve(c,points.map((value,i)=>i%2?value-1.1:value-1.3),'#c1b98766',1);
  }
  // Cool soil at the foot ties the roots to the floor without extending it.
  const foot=Math.min(22,p.h*.22);c.fillStyle=gradient(c,0,p.y+p.h-foot,0,p.y+p.h,[[0,'#183d3100'],[1,'#14362d9c']]);c.fillRect(p.x,p.y+p.h-foot,p.w,foot);
  mossEdge(c,p,left,right);
}

function timber(c,p,left,right){
  c.fillStyle=gradient(c,0,p.y,0,p.y+p.h,[[0,'#dbd0a0'],[.22,'#a6ad7a'],[.48,'#7b9169'],[.82,'#456950'],[1,'#284d42']]);c.fillRect(p.x,p.y,p.w,p.h);
  const top=Math.min(4,p.h*.25);c.fillStyle='#d3d6a1';c.fillRect(p.x,p.y,p.w,top);
  const center=p.y+p.h*.57,start=Math.floor(left/76)*76;
  for(let x=start,i=0;x<right&&i<140;x+=76,i++){
    curve(c,[x+3,center,x+25,center-p.h*.11,x+45,center+p.h*.1,x+71,center],'#d3d1a344',.85);
    curve(c,[x+8,center+3,x+31,center+1,x+50,center+4,x+68,center+2],'#2b50465f',.8);
    if(p.h>=10){oval(c,x+40,center,5.5,1.6,'#425f4f65');oval(c,x+40,center-.3,3.2,.6,'#bac3965c');}
    path(c,[[x+74,p.y+top],[x+73,p.y+p.h]],'#284d4290',1);
  }
  if(p.w>=24&&p.h>=8)for(const x of [p.x+7,p.x+p.w-10]){
    box(c,x,p.y+top+1,3,Math.max(1,p.h-top-2),1,'#657a58');oval(c,x+1.5,p.y+top+3,1,1,'#e1d7a1');
  }
  // Moss stays on the front edge, so floating greenery never offers a fake step.
  const mossY=p.y+Math.min(4.5,p.h*.4);
  for(let x=Math.floor(left/49)*49,i=0;x<right&&i<200;x+=49,i++){
    const length=8+noise(Math.floor(x/49))*12;
    curve(c,[x,mossY,x+5,mossY+3,x+length-4,mossY+4,x+length,mossY+1],'#65875a87',Math.min(2,p.h*.15));
  }
  c.fillStyle='#e0e3b6';c.fillRect(p.x,p.y,p.w,Math.min(1,p.h));
}

/** Returns true when handled, including deliberate offscreen culling. */
export function drawGreenhousePlatform(c,p,camera=0,viewWidth=Infinity){
  if(!contextReady(c)||!validRect(p)||!Number.isFinite(camera)||!(viewWidth>0)||!(Number.isFinite(viewWidth)||viewWidth===Infinity))return false;
  const right=p.x+p.w,bottom=p.y+p.h;
  if(right<camera-90||p.x>camera+viewWidth+90)return true;
  // Cull detail rather than deriving a new pattern origin from the camera.
  const left=Math.max(p.x,camera-90),visibleRight=Math.min(right,camera+viewWidth+90);
  let saved=false;
  try{
    c.save();saved=true;c.lineCap='round';c.lineJoin='round';
    c.beginPath();c.rect(p.x,p.y,p.w,bottom-p.y);c.clip();
    if(p.kind==='root')roots(c,p,left,visibleRight);
    else if(p.kind==='ground'||p.h>35)stone(c,p,left,visibleRight);
    else timber(c,p,left,visibleRight);
    return true;
  }catch{return false;}finally{if(saved)c.restore();}
}

/** The spring's pose follows p.boing. No clock or state survives this call. */
export function drawGreenhouseMushroom(c,p,t=0,reducedMotion=false){
  if(!contextReady(c)||!p||![p.x,p.y,p.w,p.x+p.w].every(Number.isFinite)||p.w<=0)return false;
  const boing=clamp(finite(p.boing),0,.75),time=reducedMotion?0:finite(t),size=Math.min(p.w,200);
  const impact=reducedMotion?0:boing>0?-.14*Math.cos((.75-boing)*13)*Math.pow(boing/.75,1.4):0;
  const breath=reducedMotion||boing>0?0:Math.sin(time*1.1)*.012;
  const stretch=impact+breath,sx=1-stretch*.44,sy=1+stretch;
  const radius=size*.46,height=Math.min(70,size*.61),brim=-height*.46,stem=Math.min(25,size*.23);
  const mid=p.x+p.w/2;
  let saved=false;
  try{
    c.save();saved=true;c.lineCap='round';c.lineJoin='round';
    // The stem's foot and the shadow remain tied to the real pad, at p.y.
    oval(c,mid,p.y+1.5,Math.min(p.w*.46,88),Math.min(4,size*.035),'#14392f57');
    c.translate(mid,p.y);c.scale(sx,sy);
    c.beginPath();c.moveTo(-stem*.5,0);c.bezierCurveTo(-stem*.38,-height*.15,-stem*.23,-height*.38,-stem*.32,-height*.56);c.lineTo(stem*.35,-height*.56);c.bezierCurveTo(stem*.16,-height*.34,stem*.52,-height*.16,stem*.58,0);c.closePath();
    c.fillStyle=gradient(c,-stem*.55,0,stem*.6,0,[[0,'#dfddbd'],[.26,'#fff0ce'],[.58,'#d2cfac'],[1,'#8ea086']]);c.fill();
    curve(c,[-stem*.23,-height*.06,-stem*.25,-height*.2,-stem*.11,-height*.34,-stem*.16,-height*.48],'#fff6d990',Math.max(.45,size*.009));
    curve(c,[stem*.22,-height*.04,stem*.15,-height*.16,stem*.21,-height*.3,stem*.13,-height*.43],'#7d947153',Math.max(.4,size*.008));
    oval(c,0,brim+height*.09,stem*.58,height*.035,'#b2b795');oval(c,0,brim+height*.065,stem*.55,height*.025,'#f2e4b8');
    // The pale underside and its radial gills stay visible beneath the cap lip.
    oval(c,0,brim+height*.025,radius*.98,height*.12,gradient(c,0,brim-height*.08,0,brim+height*.14,[[0,'#9f7e79'],[.42,'#dabda0'],[1,'#b99c85']]));
    for(let i=-6;i<=6;i++){
      const u=i/6,x=u*radius*.9,y=brim+height*.1*(1-u*u);
      curve(c,[u*stem*.4,brim-height*.025,u*radius*.42,brim+height*.08,x*.9,y,x,y],'#916e6b80',Math.max(.4,size*.0075));
    }
    oval(c,0,brim+height*.04,stem*.42,height*.037,'#806f6875');
    c.beginPath();c.moveTo(-radius,brim);c.bezierCurveTo(-radius*.86,-height*1.18,radius*.86,-height*1.18,radius,brim);c.quadraticCurveTo(0,brim+height*.12,-radius,brim);c.closePath();
    c.fillStyle=gradient(c,-radius*.35,-height,radius*.55,brim+height*.05,[[0,'#e4baa8'],[.22,'#d6a69c'],[.6,'#ba8590'],[1,'#885f79']]);c.fill();
    c.strokeStyle='#664e6966';c.lineWidth=Math.max(.5,size*.012);c.stroke();
    curve(c,[-radius*.87,brim-height*.06,-radius*.58,-height*.94,-radius*.12,-height*.97,radius*.2,-height*.94],'#f7dac282',Math.max(.7,size*.014));
    // Three broad natural markings remain legible at phone scale.
    for(const [x,y,rx,ry]of [[-.46,-.65,.115,.061],[.03,-.89,.10,.065],[.46,-.62,.14,.074]]){
      oval(c,x*radius,y*height,rx*size,ry*height,'#94747737');oval(c,x*radius,y*height-1,rx*size*.91,ry*height*.84,'#f3d8b4');
      oval(c,x*radius-rx*size*.22,y*height-ry*height*.27,rx*size*.39,ry*height*.18,'#fff0cf6e');
    }
    c.beginPath();c.moveTo(-radius*.96,brim+.2);c.quadraticCurveTo(0,brim+height*.13,radius*.96,brim+.2);c.strokeStyle='#f0d2b0';c.lineWidth=Math.max(.7,size*.018);c.stroke();
    c.beginPath();c.moveTo(-radius*.91,brim+height*.04);c.quadraticCurveTo(0,brim+height*.2,radius*.91,brim+height*.04);c.strokeStyle='#7a616a54';c.lineWidth=Math.max(.5,size*.009);c.stroke();
    return true;
  }catch{return false;}finally{if(saved)c.restore();}
}
