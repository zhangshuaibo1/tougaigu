// First-chapter art direction. Pure Canvas presentation: no input, RNG, saves,
// rewards, collision changes, timers, remote images, or second simulation loop.
import { DREAM_PHYSICS } from './dream-engine-base.js';
import { drawCapInterior } from './dream-cap-art.js';
import { getOutfitPalette, drawOutfitBack } from './dream-festival-art.js';
import { getTravelerMotion, drawTravelerBack, drawTravelerLegs, drawTravelerCoat } from './dream-traveler-art.js';
import { drawGroundShadow } from './dream-ground-shadow.js';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function path(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);c.fillStyle=color;c.fill();}
function box(c,x,y,w,h,r,fill,stroke=null){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function gradient(c,x,y,x2,y2,stops){const g=c.createLinearGradient(x,y,x2,y2);for(const [p,color]of stops)g.addColorStop(p,color);return g;}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#eed4a000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function curve(c,p,color,width=1){c.beginPath();c.moveTo(p[0],p[1]);c.bezierCurveTo(...p.slice(2));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function leaf(c,x,y,s,angle,color){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-s,-s*.3,-s,-s*1.1,0,-s*1.8);c.bezierCurveTo(s,-s*1.1,s,-s*.3,0,0);c.fillStyle=color;c.fill();path(c,[[0,-1],[0,-s*1.4]],'#b0cba447',.7);c.restore();}
function arch(c,x,y,w,h,fill,stroke){c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2,y-h+w/2);c.arc(x,y-h+w/2,w/2,Math.PI,TAU);c.lineTo(x+w/2,y);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function bays(view,spacing,parallax,paint){const scroll=view.cameraX*parallax,first=Math.floor((scroll-520)/spacing),last=Math.ceil((scroll+view.viewport.width+520)/spacing);for(let i=first;i<=last;i++)paint(i*spacing-scroll,i);}


const canopyCache=new WeakMap();
function canopy(c,x){
    const roof=230;
    c.beginPath();c.moveTo(x-8,roof+102);c.quadraticCurveTo(x+260,roof-83,x+528,roof+102);c.lineTo(x+528,roof+126);c.quadraticCurveTo(x+260,roof-38,x-8,roof+126);c.closePath();
    c.fillStyle=gradient(c,0,roof+7,0,roof+125,[[0,'#527c79'],[.42,'#386765'],[1,'#173b46']]);c.fill();
    curve(c,[x-8,roof+103,x+170,roof-19,x+350,roof-19,x+528,roof+103],'#a9c8af75',3);
    curve(c,[x-8,roof+122,x+170,roof+10,x+350,roof+10,x+528,roof+122],'#112e3977',6);
    for(let k=1;k<12;k++){
      const u=k/12,xx=x+520*u,yy=roof+103-162*u*(1-u);
      path(c,[[xx-8,yy-3],[xx+2,yy+13]],'#c4d6bc40',1.2);
    }
    box(c,x+8,roof+109,504,17,4,gradient(c,0,roof+109,0,roof+126,[[0,'#768d77'],[.22,'#506e63'],[1,'#254450']]),'#8b9f7844');
    for(let k=0;k<12;k++)oval(c,x+25+k*42,roof+117,1.6,1.6,'#b5c09a83');
    for(const xx of [x+20,x+500]){
      box(c,xx-8,roof+123,16,225,3,gradient(c,xx-8,0,xx+8,0,[[0,'#162e38'],[.45,'#56776c'],[.62,'#3f635f'],[1,'#203c46']]));
      box(c,xx-13,roof+123,26,12,3,'#657f6c');box(c,xx-13,539,26,17,3,'#455f5b');
      curve(c,[xx,roof+162,xx+36,roof+159,xx+42,roof+135,xx+49,roof+124],'#72917c55',3);
    }
    for(let k=0;k<4;k++){
      const wx=x+94+k*109;
      arch(c,wx,544,73,162,'#193c476b','#668c7b3d');
      arch(c,wx,536,61,143,gradient(c,0,393,0,537,[[0,'#d3b57d42'],[.48,'#9cb69d13'],[1,'#23434e00']]),'#819d8550');
      path(c,[[wx,401],[wx,537]],'#35585f',2);path(c,[[wx-28,454],[wx+28,454]],'#4b706d',2);
      path(c,[[wx-20,412],[wx-8,399]],'#dce4c247',2);box(c,wx-39,540,78,7,2,'#82927a55');
    }
    // Moss grows from the roof, never from thin air over a gameplay gap.
    for(let k=0;k<9;k++){
      const xx=x+44+k*48,drop=12+(k%3)*9;
      curve(c,[xx,roof+123,xx-5,roof+130,xx+8,roof+123+drop,xx+2,roof+123+drop+10],'#547b6399',1.8);
      leaf(c,xx+1,roof+123+drop,5,-.6,'#86a77b8c');leaf(c,xx+4,roof+123+drop+5,4,.7,'#668e708c');
    }
    const clockX=x+271,clockY=roof+96;
    path(c,[[clockX,roof+40],[clockX,clockY-23]],'#a3b19265',2);
    oval(c,clockX,clockY+3,27,27,'#132c3f70');oval(c,clockX,clockY,25,25,'#809382');oval(c,clockX,clockY,22,22,'#233c49');oval(c,clockX-1,clockY-1,19,19,'#b8bc9750');
    for(let k=0;k<12;k++){const a=k*TAU/12;path(c,[[clockX+Math.sin(a)*15,clockY+Math.cos(a)*15],[clockX+Math.sin(a)*17.5,clockY+Math.cos(a)*17.5]],'#d8d8ad80',1);}
    path(c,[[clockX,clockY-12],[clockX,clockY],[clockX+9,clockY+4]],'#e2d7acb3',1.7);
}
function cachedCanopy(c,x){
  const doc=c.canvas?.ownerDocument;
  if(!doc?.createElement){canopy(c,x);return;}
  let tile=canopyCache.get(c);
  if(!tile){
    tile=doc.createElement('canvas');tile.width=1104;tile.height=680;
    const tc=tile.getContext('2d');
    if(!tc){canopy(c,x);return;}
    tc.scale(2,2);tc.translate(16,-225);tc.lineCap='round';tc.lineJoin='round';canopy(tc,0);
    canopyCache.set(c,tile);
  }
  c.drawImage(tile,x-16,225,552,340);
}

/** Viewport/background layer; everything is behind the physical game world. */
export function drawStationBackdrop(c,view,t=0,reduced=false){
  const {width,top,bottom}=view.viewport,time=reduced?0:t;
  c.save();c.beginPath();c.rect(0,top,width,bottom-top);c.clip();
  c.fillStyle=gradient(c,0,top,0,600,[[0,'#102333'],[.45,'#244b59'],[1,'#426268']]);c.fillRect(0,top,width,bottom-top);
  const moonX=width*.76-view.cameraX*.07;
  glow(c,moonX,125,210,'#c8e6d51b');
  oval(c,moonX,125,39,39,'#dbdfbf');oval(c,moonX+16,111,33,33,'#1d3948');
  // Small broken clouds, well away from the playable platform silhouettes.
  for(let i=0;i<6;i++){
    const x=i*281-view.cameraX*.09+Math.sin(time*.035+i)*7;
    oval(c,x,173+(i%2)*31,111,15,'#9fc5c30b');oval(c,x+56,167+(i%2)*31,67,19,'#a2c5c30b');
  }
  // Distant, quiet railway town. Its details deliberately have less contrast.
  bays(view,370,.12,(x,i)=>{
    const y=321+Math.sin(i*2)*24;
    c.beginPath();c.moveTo(x-135,548);c.lineTo(x-135,y+69);c.lineTo(x-75,y+17);c.lineTo(x-8,y+69);c.lineTo(x+22,y+69);c.lineTo(x+22,y-31);c.lineTo(x+59,y-59);c.lineTo(x+96,y-31);c.lineTo(x+96,y+69);c.lineTo(x+170,y+69);c.lineTo(x+170,548);c.closePath();c.fillStyle='#152f3b66';c.fill();
    for(let j=0;j<6;j++)box(c,x-105+j*45,y+92,13,23,5,'#c4d9b518');
    path(c,[[x-138,y+70],[x-75,y+14],[x-6,y+69]],'#99b4ad22',2);
  });
  // Enamel roof panels and warm timber. These bays scroll slower than platforms.
  bays(view,520,.28,x=>cachedCanopy(c,x));
  // Ground-level atmosphere separates background glass from opaque walkable edges.
  c.fillStyle=gradient(c,0,460,0,560,[[0,'#19353f00'],[1,'#132b3f75']]);c.fillRect(0,460,width,100);
  if(view.seasonId==='halloween'){
    for(let i=0;i<4;i++){
      const x=(i+.5)*width/4-view.cameraX*.035,y=95+(i%2)*49,w=reduced?1:Math.sin(time*1.7+i)*3;
      c.beginPath();c.moveTo(x-11,y-w);c.quadraticCurveTo(x-5,y-4,x,y+3);c.quadraticCurveTo(x+5,y-4,x+11,y-w);c.lineTo(x+5,y+4);c.lineTo(x,y+2);c.lineTo(x-5,y+4);c.closePath();c.fillStyle='#a49fb94d';c.fill();
    }
  }
  c.restore();
}

/** World-space rear station facade; no collision is implied by its dark windows. */
export function drawStationArchitecture(c,game){
  const th=game.level.theme;
  c.save();
  const x=842;
  box(c,620,338,435,205,12,gradient(c,620,338,1055,543,[[0,'#26434ed9'],[1,'#172e3eeb']]),'#698c8055');
  box(c,608,330,459,14,4,'#50685f','#a0ad8055');
  for(const side of [-1,1]){
    const xx=x+side*151,lit=!!game.lanterns[side<0?0:1]?.lit;
    arch(c,xx,521,80,152,'#101f2e80','#547567');
    arch(c,xx,515,67,139,gradient(c,0,377,0,515,[[0,lit?'#edcd8eaf':'#bfa76d66'],[.5,lit?'#c9b57b60':'#5c7c6644'],[1,'#213b4300']]),'#b0b08a40');
    path(c,[[xx,382],[xx,513]],'#2d4b4e',3);path(c,[[xx-32,432],[xx+32,432]],'#3c5c58',3);
  }
  box(c,x-88,455,176,47,5,'#183440','#a5ae7c75');
  box(c,x-82,461,164,35,3,'#294550','#72907550');
  c.font='12px "PingFang SC","Microsoft YaHei",sans-serif';c.textAlign='center';c.fillStyle='#c7cfaa';c.fillText('明天方向 · 候车处',x,483);
  for(const xx of [x-92,x+92]){path(c,[[xx,509],[xx,545]],'#638376',3);box(c,xx-7,536,14,9,2,'#3f605c');}
  for(const xx of [445,1150,1750]){
    const lampX=xx+43;
    path(c,[[xx,560],[xx,356]],'#122a39',8);path(c,[[xx-2,556],[xx-2,358]],'#729580',2);
    curve(c,[xx,356,xx,320,lampX,319,lampX,350],'#779279',5);
    glow(c,lampX,374,86,th.light+'29');
    box(c,lampX-17,349,34,47,6,'#233c41','#cfb87f');
    box(c,lampX-12,354,24,35,4,gradient(c,0,354,0,389,[[0,'#d9b878b0'],[.55,'#e8ce8f99'],[1,'#a5ae7755']]));
    path(c,[[lampX,353],[lampX,390]],'#edd3967a',2);box(c,lampX-20,345,40,7,3,'#a1a67c');
  }
  c.restore();
}

/** Logical platform top is exactly p.y. Material never alters collider extents. */
export function drawStationPlatform(c,p,camera,width){
  if(p.x+p.w<camera-100||p.x>camera+width+100)return;
  c.save();
  if(p.kind==='ground'){
    box(c,p.x,p.y,p.w,p.h,4,gradient(c,0,p.y,0,p.y+p.h,[[0,'#53665e'],[.18,'#364d4b'],[1,'#1b3040']]));
    c.beginPath();c.rect(p.x,p.y,p.w,p.h);c.clip();
    const start=Math.max(p.x,Math.floor((camera-75)/74)*74);
    for(let row=0;row<3;row++)for(let x=start-40;x<Math.min(p.x+p.w,camera+width+75);x+=74){
      const xx=x+(row%2?37:0),y=p.y+15+row*32;
      box(c,xx+2,y,70,28,6,['#71807826','#405c5c50','#71847921'][(Math.abs(Math.floor(x/74))+row)%3],'#1129385c');
      path(c,[[xx+8,y+2],[xx+62,y+2]],'#aab49823',1);path(c,[[xx+10,y+24],[xx+20,y+25]],'#142c3677',1.2);
    }
    c.fillStyle=gradient(c,0,p.y,0,p.y+11,[[0,'#cad4a9'],[.2,'#92b08a'],[.5,'#6e9578'],[1,'#294a48']]);c.fillRect(p.x,p.y,p.w,11);
    for(let x=start;x<Math.min(p.x+p.w,camera+width+75);x+=37){path(c,[[x,p.y+1],[x+2,p.y+8]],'#344b3f80',1);}
    c.restore();return;
  }
  // Warm wood and brass corners distinguish a usable ledge from glass scenery.
  box(c,p.x+3,p.y+4,p.w,p.h+8,6,'#0a213b80');
  box(c,p.x,p.y,p.w,p.h+3,5,gradient(c,0,p.y,0,p.y+p.h+3,[[0,'#c3ad78'],[.3,'#a28d63'],[.5,'#75684c'],[1,'#394b47']]),'#bdc493');
  for(let x=p.x+13;x<p.x+p.w-10;x+=39){path(c,[[x,p.y+4],[x+1,p.y+p.h-2]],'#4b514070',1);path(c,[[x+5,p.y+8],[Math.min(x+29,p.x+p.w-8),p.y+8]],'#ecdbad40',.8);}
  for(const x of [p.x+8,p.x+p.w-13]){box(c,x,p.y+2,5,p.h-2,1,'#6e7764');oval(c,x+2.5,p.y+6,1.2,1.2,'#efdc9d');}
  path(c,[[p.x+3,p.y+.5],[p.x+p.w-3,p.y+.5]],'#e2deac',2);
  for(const x of [p.x+18,p.x+p.w-18]){path(c,[[x,p.y+p.h+1],[x+7,p.y+p.h+17],[x+23,p.y+p.h+1]],'#364d4d',4);path(c,[[x+1,p.y+p.h+1],[x+8,p.y+p.h+14]],'#8c9b784f',1.3);}
  c.restore();
}

export function drawStationSignal(c,game,p){
  const pressed=!!game.plateState.get(p.id),latched=!!game.lanterns[0]?.lit;
  const amount=game.stationSignal?.amount??(pressed||latched?1:0),color=latched?'#f1cf88':pressed?'#a4ead3':'#aa9980';
  const gate=game.level.barriers.find(g=>g.plateId===p.id),x=p.x+p.w/2;
  c.save();
  if(gate){
    path(c,[[p.x+p.w-2,p.y-2],[gate.x+11,p.y-2],[gate.x+11,p.y-54]],'#102937',6);
    path(c,[[p.x+p.w-2,p.y-2],[gate.x+11,p.y-2],[gate.x+11,p.y-54]],'#9ca78b80',2);
    if(pressed||latched){path(c,[[p.x+p.w-2,p.y-2],[gate.x+11,p.y-2],[gate.x+11,p.y-54]],color,1.8);}
    const sx=gate.x+11,sy=p.y-52;
    oval(c,sx,sy,13,13,'#1f3e46');oval(c,sx,sy,9,9,'#899477');oval(c,sx,sy,6,6,color);
    c.save();c.translate(sx,sy);c.rotate(-amount*Math.PI/2);box(c,-5,-5,33,10,4,gradient(c,0,-5,0,5,[[0,'#d8c394'],[1,'#87795c']]),'#e4d3a480');box(c,13,-3,11,6,2,color);c.restore();
    glow(c,sx,sy,33,(pressed||latched)?color+'30':'#e1cb9206');
  }
  box(c,p.x-3,p.y-8,p.w+6,14,5,'#15313d','#879778');
  box(c,p.x,p.y-10+(pressed?3:0),p.w,10,4,gradient(c,0,p.y-10,0,p.y,[[0,'#e2c58e'],[.32,'#bda576'],[1,'#6c725a']]),'#f0d6a3');
  for(let k=0;k<7;k++)path(c,[[p.x+22+k*11,p.y-7+(pressed?3:0)],[p.x+22+k*11,p.y-2+(pressed?3:0)]],'#384f464d',1);
  for(const xx of [p.x+8,p.x+p.w-8]){oval(c,xx,p.y-5+(pressed?3:0),2.7,2.7,'#4f5746');path(c,[[xx-1,p.y-6+(pressed?3:0)],[xx+1,p.y-4+(pressed?3:0)]],'#e2ce9d',.9);}
  oval(c,x,p.y-5+(pressed?3:0),8,2.7,color);glow(c,x,p.y-5,48,pressed?'#a4ead326':'#ecd5980d');
  c.font='11px "PingFang SC","Microsoft YaHei",sans-serif';c.textAlign='center';c.fillStyle=color;
  c.fillText(latched?'诗灯已留住门':pressed?'身体留住了门':'身体踏板',x,p.y+31);
  c.restore();
}

/** Same rig/occlusion contract as the base renderer, with richer small-scale materials. */
export function drawStationCharacter(game,c,b,t,shown,p,paint={}){
  const {rig,walking}=p,outfit=game.getOutfitId(),dress=getOutfitPalette(outfit);
  const motion=getTravelerMotion(b,{time:t,hop:p.hop,reducedMotion:game.options.reducedMotion,performance:p.performance});
  const opacity=b.invulnerable>0&&!game.options.reducedMotion&&Math.floor(t*13)%2===0?.48:1;
  if(paint.shadow===undefined){c.save();oval(c,b.x,b.y+2,b.grounded?24:18,4,'#0a223b68');c.restore();}
  else drawGroundShadow(c,paint.shadow);
  c.save();c.transform(...rig.bodyMatrix);c.globalAlpha*=opacity;
  drawOutfitBack(c,outfit,t,walking);
  if(game.featherCharges){for(let i=0;i<3;i++){const a=t*.55+i*TAU/3;oval(c,Math.cos(a)*30,-39+Math.sin(a)*22,2,2,'#d6e8ecaa');}}
  drawTravelerBack(c,motion,dress);drawTravelerLegs(c,motion);
  for(const arm of [p.arms.left,p.arms.right]){
    path(c,[[arm.shoulder.x,arm.shoulder.y],[arm.elbow.x,arm.elbow.y],[arm.wrist.x,arm.wrist.y]],'#a59c7d',5);
    path(c,[[arm.shoulder.x-1,arm.shoulder.y],[arm.elbow.x-1,arm.elbow.y],[arm.wrist.x-1,arm.wrist.y]],'#eadbb9',2.5);oval(c,arm.elbow.x,arm.elbow.y,2.8,2.8,'#f3e6c5');
  }
  drawTravelerCoat(c,motion,dress);
  c.save();c.transform(...rig.headLocalMatrix);drawCapInterior(c,game.capScene,t,game.capOpen);c.restore();c.restore();
  if(shown?.layer==='inside')game.drawSoul(c,shown,t);
  c.save();c.transform(...rig.bodyMatrix);c.globalAlpha*=shown?.layer==='inside'?1:opacity;
  c.save();c.transform(...rig.headLocalMatrix);game.drawSkullFront(c,b,t,shown);
  // Small reflected rim, placed outside the eyes, not a second face or sprite.
  curve(c,[-21,-8,-24,3,-19,10,-15,12],'#fff6dcad',1.4);curve(c,[21,-6,23,3,20,8,16,11],paint.reflection||'#75b9b761',1.5);
  game.drawStationRim(c);game.drawCapLid(c,t,rig,outfit);c.restore();game.drawCharacterHands(c,p);c.restore();
}

/** Brass and glass poem lamps keep their real puzzle range and lit state. */
export function drawStationLantern(c,game,l,index,t){
  const th=game.level.theme,y=l.y+(game.options.reducedMotion?0:Math.sin(t*1.2+index)*4);
  const nearby=!l.lit&&game.form==='soul'&&Math.hypot(l.x-game.soul.x,l.y-game.soul.y)<=DREAM_PHYSICS.pulseRadius;
  const color=l.lit?'#f6d692':'#b6efdf';
  c.save();glow(c,l.x,y,l.lit?123:77,l.lit?'#ffdc8c42':'#a2ead92c');
  path(c,[[l.x,y-94],[l.x,y-35]],'#809c9180',1.5);oval(c,l.x,y-34,7,5,'#b5ab7d');
  c.save();c.translate(l.x,y);c.rotate(game.options.reducedMotion?0:Math.sin(t*.9+index)*.035);
  c.beginPath();c.moveTo(-17,-27);c.bezierCurveTo(-28,-13,-28,13,-18,24);c.quadraticCurveTo(0,33,18,24);c.bezierCurveTo(28,13,28,-13,17,-27);c.closePath();
  c.fillStyle=gradient(c,-25,0,25,0,l.lit?[[0,'#a98c5f'],[.24,'#f5d396'],[.6,'#ffe7ad'],[1,'#b49665']]:[[0,'#244953'],[.24,'#4b7a79'],[.6,'#305b65'],[1,'#163e50']]);c.fill();c.strokeStyle=color;c.lineWidth=1.7;c.stroke();
  curve(c,[-16,-21,-23,-7,-21,10,-16,18],'#efffed70',2);curve(c,[16,-20,22,-7,22,9,17,19],'#a9ddc955',1);
  box(c,-20,-28,40,7,3,gradient(c,0,-28,0,-21,[[0,'#e2cd92'],[1,'#7e8264']]),'#e7d29b');
  box(c,-21,21,42,7,3,gradient(c,0,21,0,28,[[0,'#d3c28e'],[1,'#6f7c64']]),'#d5c590');
  oval(c,0,-1,12,17,l.lit?'#fff1be80':'#d9f9de14');
  c.fillStyle=l.lit?'#674f36':'#e6ffe8';c.font='bold 18px "PingFang SC","Microsoft YaHei",sans-serif';c.textAlign='center';c.fillText(l.lit?'光':'谜',0,6);
  path(c,[[0,29],[0,44]],'#c9c194',1.8);oval(c,0,46,3.5,5,color);c.restore();
  c.font='10px "PingFang SC","Microsoft YaHei",sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText(l.lit?'已点亮':'诗灯 · '+(index+1),l.x,y+69);
  if(nearby){
    c.strokeStyle='#eafaddb0';c.lineWidth=1.8;
    for(const side of [-1,1])path(c,[[l.x+side*42,y-12],[l.x+side*35,y],[l.x+side*42,y+12]],'#eafaddb0',1.8);
    c.font='11px "PingFang SC","Microsoft YaHei",sans-serif';c.fillStyle=th.light;c.fillText('与诗灯共鸣',l.x,y-110);
  }
  c.restore();
}
