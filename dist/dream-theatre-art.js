// The theatre's physical stage remains authored by dream-levels and the engine.
// These world-space painters own no clock, collision, input, progress or assets.
const TAU=Math.PI*2;
const REQUIRED=['save','restore','beginPath','rect','clip','fill','stroke','fillRect','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','closePath','ellipse','roundRect','createLinearGradient'];
const contextReady=c=>!!c&&REQUIRED.every(name=>typeof c[name]==='function');
const finiteRect=p=>!!p&&[p.x,p.y,p.w,p.h,p.x+p.w,p.y+p.h].every(Number.isFinite)&&p.w>0&&p.h>0;
const supported=p=>finiteRect(p)&&(p.kind==null||p.kind==='ground'||p.kind==='stage');
const validView=(camera,width)=>Number.isFinite(camera)&&width>0&&(Number.isFinite(width)||width===Infinity);
const noise=(column,row=0)=>{const v=Math.sin(column*12.9898+row*78.233)*43758.5453;return v-Math.floor(v);};
function gradient(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);for(const [at,color]of stops)g.addColorStop(at,color);return g;}
function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function curve(c,points,color,width=1){c.beginPath();c.moveTo(points[0],points[1]);c.bezierCurveTo(...points.slice(2));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function oval(c,x,y,rx,ry,fill,edge=null,width=.8){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}}
function box(c,x,y,w,h,r,fill,edge=null,width=.8){if(w<=0||h<=0)return;c.beginPath();c.roundRect(x,y,w,h,Math.min(Math.max(r,0),w/2,h/2));if(fill){c.fillStyle=fill;c.fill();}if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}}

/** The exact positive intersection of the stage and same-height fixed banks.
 * Touching endpoints do not count; a gap or a different landing height cannot
 * make a docking light. Results are copied geometry, never platform references.
 */
export function getTheatreDockingOverlaps(stage,platforms=[]){
  if(!finiteRect(stage)||stage.kind!=='stage'||!Array.isArray(platforms))return [];
  const result=[];
  for(let i=0;i<platforms.length&&i<256;i++){
    const bank=platforms[i];
    if(!finiteRect(bank)||bank===stage||bank.kind==='stage'||(stage.id!=null&&bank.id===stage.id)||Math.abs(bank.y-stage.y)>1e-6)continue;
    const left=Math.max(stage.x,bank.x),right=Math.min(stage.x+stage.w,bank.x+bank.w);
    if(right>left)result.push({x:left,y:stage.y,w:right-left,platformIndex:i});
  }
  return result;
}

function woodTop(c,p,left,right,moving){
  const depth=Math.min(moving?6:8,p.h);
  c.fillStyle=gradient(c,0,p.y,0,p.y+depth,[[0,moving?'#e0c69d':'#c8ad88'],[.22,moving?'#c5a17b':'#b28e72'],[.75,moving?'#98755f':'#8d6b5a'],[1,'#624b47']]);
  c.fillRect(p.x,p.y,p.w,depth);
  // Seams use platform-local coordinates: the boards travel with the stage.
  const plank=moving?37:74,origin=p.x,start=Math.floor((left-origin)/plank)*plank+origin;
  for(let x=start,i=0;x<right&&i<100;x+=plank,i++){
    const n=noise(Math.floor((x-origin)/plank)),end=Math.min(x+plank-2,p.x+p.w);
    if(end>x+5){
      curve(c,[x+3,p.y+depth*.48,x+plank*.32,p.y+depth*.22,x+plank*.64,p.y+depth*.65,end,p.y+depth*.44],'#f0d6ae4d',.65);
      curve(c,[x+6,p.y+depth*.76,x+plank*.26,p.y+depth*.60,x+plank*.58,p.y+depth*.92,end-3,p.y+depth*.70],'#60463e45',.65);
    }
    line(c,[[x+plank-1,p.y+1],[x+plank-1,p.y+depth]],'#5d47457c',.8);
    if(n>.55&&depth>4&&end>x+22)oval(c,x+17,p.y+depth*.51,3.5,.65,'#6e514844');
  }
  // No rounded lip above y, nor side overhang: this is the collision top.
  c.fillStyle=moving?'#efd6b0':'#d9c29f';c.fillRect(p.x,p.y,p.w,Math.min(1,p.h));
}

function fixedTimber(c,p,left,right){
  c.fillStyle=gradient(c,0,p.y,0,p.y+p.h,[[0,'#b19377'],[.3,'#856655'],[.58,'#694b48'],[1,'#422f3c']]);c.fillRect(p.x,p.y,p.w,p.h);
  const y=p.y+Math.min(9,p.h*.52),start=Math.floor((left-p.x)/79)*79+p.x;
  for(let x=start,i=0;x<right&&i<100;x+=79,i++){
    curve(c,[x+4,y,x+26,y-1.5,x+49,y+1.6,x+73,y],'#d8b18b52',.75);
    curve(c,[x+9,y+3,x+31,y+1.6,x+48,y+4,x+69,y+2.7],'#4c323d6b',.8);
    if(p.h>9){oval(c,x+40,y,5,1.25,'#51383e4d');oval(c,x+40,y-.1,2.5,.45,'#c9a08366');}
  }
  woodTop(c,p,left,right,false);
  // Brass reinforcement is on the vertical face and cannot offer another step.
  if(p.w>26&&p.h>8)for(const x of [p.x+5,p.x+p.w-9]){
    box(c,x,p.y+5,4,p.h-6,1,gradient(c,x,0,x+4,0,[[0,'#83735c'],[.45,'#d7bd8d'],[1,'#77634f']]),'#4f4143',.6);
    oval(c,x+2,p.y+7.2,.75,.75,'#e8d1a3');
    if(p.h>14)oval(c,x+2,p.y+p.h-4,.75,.75,'#c2a77c');
  }
  c.fillStyle='#30243277';c.fillRect(p.x,p.y+p.h-Math.min(2,p.h),p.w,Math.min(2,p.h));
}

function theatreApron(c,p,left,right){
  c.fillStyle=gradient(c,0,p.y,0,p.y+p.h,[[0,'#765845'],[.12,'#4a303d'],[.55,'#372738'],[1,'#241e30']]);c.fillRect(p.x,p.y,p.w,p.h);
  const margin=Math.min(15,p.h*.16),y=p.y+margin,height=Math.max(0,p.h-margin-9),panel=106,start=Math.floor((left-p.x)/panel)*panel+p.x;
  for(let x=start,i=0;x<right&&i<100;x+=panel,i++){
    // Recessed walnut panels make the apron substantial without bright shapes
    // competing with collectibles or pretending to be accessible ledges.
    if(height>8){
      box(c,x+8,y,panel-16,height,4,gradient(c,x+8,y,x+panel-8,y+height,[[0,'#69455346'],[.45,'#34283b55'],[1,'#1e1c2a80']]),'#92726636',.9);
      box(c,x+13,y+5,panel-26,height-10,2,null,'#a4837029',.7);
      line(c,[[x+11,y+2],[x+panel-11,y+2]],'#d0a57c28',.7);
      for(let j=0;j<2;j++)curve(c,[x+25+j*27,y+8,x+19+j*27,y+height*.3,x+30+j*27,y+height*.7,x+24+j*27,y+height-8],'#a4807130',.65);
    }
    line(c,[[x+2,p.y+10],[x+2,p.y+p.h]],'#1a1b294d',2);
  }
  woodTop(c,p,left,right,false);
  // A shadow just under the deck separates walkable wood from the apron face.
  c.fillStyle='#201d2b99';c.fillRect(p.x,p.y+Math.min(8,p.h),p.w,Math.min(2,Math.max(0,p.h-8)));
}

function movingStage(c,p,left,right){
  c.fillStyle=gradient(c,0,p.y,0,p.y+p.h,[[0,'#d3b28a'],[.22,'#9a785f'],[.5,'#7b5553'],[.8,'#5d3c4d'],[1,'#302737']]);c.fillRect(p.x,p.y,p.w,p.h);
  const faceY=p.y+Math.min(6,p.h*.3),faceH=Math.max(0,p.y+p.h-faceY);
  if(faceH>5){
    box(c,p.x+8,faceY+2,p.w-16,Math.max(1,faceH-5),2,gradient(c,0,faceY,0,p.y+p.h,[[0,'#8e605c'],[.48,'#6a454f'],[1,'#402e3d']]),'#d3b38a80',.7);
    // One continuous routed arch and two large grain marks remain legible at
    // play size. Tiny repetitive decorations would turn into flickering noise.
    if(p.w>75){
      const mid=p.x+p.w/2;
      curve(c,[p.x+16,faceY+5,mid-20,faceY+2,mid+20,faceY+2,p.x+p.w-16,faceY+5],'#e0ba903d',.7);
      line(c,[[p.x+20,p.y+p.h-5],[mid-12,p.y+p.h-5]],'#39293877',.7);
      line(c,[[mid+12,p.y+p.h-5],[p.x+p.w-20,p.y+p.h-5]],'#c293733f',.7);
    }
  }
  woodTop(c,p,left,right,true);
  const brass=gradient(c,0,p.y+4,0,p.y+p.h,[[0,'#e0c899'],[.36,'#b29b6f'],[.7,'#d1b78a'],[1,'#76604e']]);
  if(p.w>30&&p.h>9)for(const x of [p.x+5,p.x+p.w-11]){
    box(c,x,p.y+4,6,p.h-5,1.1,brass,'#58483f',.7);
    for(const y of [p.y+7,p.y+p.h-4]){oval(c,x+3,y,1.25,1.25,'#6d5c49');oval(c,x+2.7,y-.3,.75,.7,'#e5d1a2');}
  }
  c.fillStyle='#332637';c.fillRect(p.x,p.y+p.h-Math.min(1.5,p.h),p.w,Math.min(1.5,p.h));
}

function dockHighlights(c,p,platforms,movers){
  const overlaps=p.kind==='stage'?getTheatreDockingOverlaps(p,platforms):[];
  if(p.kind!=='stage'&&Array.isArray(movers))for(const stage of movers.slice(0,64)){
    for(const overlap of getTheatreDockingOverlaps(stage,[p]))overlaps.push(overlap);
  }
  for(const overlap of overlaps){
    // Opaque, still edge only. It is never wider than the actual intersection.
    c.fillStyle='#f4dda4';c.fillRect(overlap.x,p.y,overlap.w,Math.min(1.5,p.h));
    if(p.h>3){c.fillStyle='#f0cb854f';c.fillRect(overlap.x,p.y+1.5,overlap.w,Math.min(1.5,p.h-1.5));}
  }
}

/** Returns false for an unsupported input/context so the caller may fall back.
 * All platform material, including docking lights, is clipped to the original
 * rectangle. Offscreen detail is culled without moving its texture origin.
 */
export function drawTheatrePlatform(c,p,{camera=0,viewWidth=Infinity,platforms=[],movers=[]}={}){
  if(!contextReady(c)||!supported(p)||!validView(camera,viewWidth))return false;
  if(p.x+p.w<camera-80||p.x>camera+viewWidth+80)return true;
  const left=Math.max(p.x,camera-80),right=Math.min(p.x+p.w,camera+viewWidth+80);
  let saved=false;
  try{
    c.save();saved=true;c.lineCap='round';c.lineJoin='round';
    c.beginPath();c.rect(p.x,p.y,p.w,p.h);c.clip();
    if(p.kind==='stage')movingStage(c,p,left,right);
    else if(p.kind==='ground'||p.h>35)theatreApron(c,p,left,right);
    else fixedTimber(c,p,left,right);
    dockHighlights(c,p,platforms,movers);
    return true;
  }catch{return false;}finally{if(saved)c.restore();}
}

function rigging(c,p){
  const railY=p.y-135,inset=Math.min(24,p.w*.2),range=Number.isFinite(p.range)?Math.max(0,p.range):0,base=Number.isFinite(p.baseX)?p.baseX:p.x;
  const start=base-range+inset,end=base+range+p.w-inset;
  // A thin paired cable is visibly rigging, not a plank that could be stood on.
  curve(c,[start,railY,start+(end-start)*.3,railY-3,end-(end-start)*.3,railY-3,end,railY],'#211e2fa6',3.4);
  curve(c,[start,railY-1,start+(end-start)*.3,railY-4,end-(end-start)*.3,railY-4,end,railY-1],'#a58b7d85',1.25);
  for(const x of [start,end]){
    line(c,[[x,railY-15],[x,railY+4]],'#655260',3.3);
    line(c,[[x-.5,railY-14],[x-.5,railY+3]],'#b19a8078',1);
    oval(c,x,railY-14,2.5,2.2,'#c3a981');
  }
  for(const x of [p.x+inset,p.x+p.w-inset]){
    // Pulley rotation follows travelled distance, so pause freezes it and
    // reduced-motion still accurately shows the real moving support.
    const radius=6.5,angle=(p.x-base)/radius;
    oval(c,x,railY,8.2,8.2,'#352d3d','#9e866c',1.1);
    oval(c,x,railY,5.8,5.8,gradient(c,x-6,railY-6,x+6,railY+6,[[0,'#d4bc91'],[.5,'#947e61'],[1,'#5f5350']]),'#ddc89c80',.6);
    for(let i=0;i<3;i++){
      const a=angle+i*TAU/3;
      line(c,[[x,railY],[x+Math.cos(a)*4.6,railY+Math.sin(a)*4.6]],'#e3cb9e9c',.8);
    }
    oval(c,x,railY,1.6,1.6,'#4f4750');oval(c,x-.3,railY-.3,.65,.65,'#f0d5a1');
    const bottom=p.y+Math.min(10,p.h*.5);
    line(c,[[x,railY+8],[x,bottom]],'#242032b8',3.5);
    line(c,[[x-.35,railY+8],[x-.35,bottom]],'#beaa8bb8',1.25);
    line(c,[[x+.9,railY+10],[x+.9,bottom]],'#846d73a8',.6);
    // The end loop is part of the vertical cable, behind the physical deck.
    oval(c,x,bottom-2,3,4,null,'#bba37b',1.1);
  }
}

/** Draw after existing background architecture and before physical platforms. */
export function drawTheatreRigging(c,{movers=[],camera=0,viewWidth=Infinity}={}){
  if(!contextReady(c)||!validView(camera,viewWidth)||!Array.isArray(movers))return false;
  const stages=movers.filter(p=>finiteRect(p)&&p.kind==='stage').slice(0,64);
  let saved=false;
  try{
    c.save();saved=true;c.lineCap='round';c.lineJoin='round';
    for(const p of stages){
      const base=Number.isFinite(p.baseX)?p.baseX:p.x,range=Number.isFinite(p.range)?Math.max(0,p.range):0;
      if(![base-range,base+range+p.w,p.y-150].every(Number.isFinite))continue;
      if(base+range+p.w<camera-20||base-range>camera+viewWidth+20)continue;
      rigging(c,p);
    }
    return true;
  }catch{return false;}finally{if(saved)c.restore();}
}
