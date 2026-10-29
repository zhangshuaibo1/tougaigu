// A little theatre in a hinged skull. These drawings are shared with the album.
// Every miniature lives in x [-60, 60], y [-60, 30], without game state or assets.
import { drawFirstTicket } from './dream-first-ticket-art.js';
import { drawGreenhouseSeed } from './dream-greenhouse-art.js';
import { drawLetterMiniature } from './dream-letter-echo.js';
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const STORY_MOTIFS=['station','sprout','moon','whale','clock','dawn'];
const FESTIVAL_MOTIFS={halloween:'pumpkin',thanksgiving:'table',christmas:'bell',newyear:'firework',spring:'nian',lantern:'rabbit',valentine:'heart',dragonboat:'boat',qixi:'bridge',midautumn:'mooncake'};
export const CAP_MOTIFS=Object.freeze([...STORY_MOTIFS,...Object.values(FESTIVAL_MOTIFS)]);
export const CAP_HINGE=Object.freeze({x:-22,y:-13});
export const CAP_GRIP=Object.freeze({x:-13,y:-13});
export const CAP_HEAD_OFFSET=Object.freeze({x:0,y:-49});

// Canvas affine matrices are the source of truth for the lid and both hands.
export function multiplyCapMatrices(a,b){
  return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
}
export function transformCapPoint(matrix,p){return {x:matrix[0]*p.x+matrix[2]*p.y+matrix[4],y:matrix[1]*p.x+matrix[3]*p.y+matrix[5]};}
export function createCapRig({x=0,y=0,face=1,scaleY=1,hop=0,tilt=0,open=0}={}){
  const theta=-1.16*clamp(open,0,1),cos=Math.cos(theta),sin=Math.sin(theta),ct=Math.cos(tilt),st=Math.sin(tilt);
  const bodyMatrix=[face,0,0,scaleY,x,y-scaleY*hop],headLocalMatrix=[ct,st,-st,ct,0,-49];
  const capLocalMatrix=[cos,sin,-sin,cos,CAP_HINGE.x-cos*CAP_HINGE.x+sin*CAP_HINGE.y,CAP_HINGE.y-sin*CAP_HINGE.x-cos*CAP_HINGE.y];
  const headMatrix=multiplyCapMatrices(bodyMatrix,headLocalMatrix),capMatrix=multiplyCapMatrices(headMatrix,capLocalMatrix);
  const gripHead=transformCapPoint(capLocalMatrix,CAP_GRIP),gripBody=transformCapPoint(headLocalMatrix,gripHead);
  return {theta,bodyMatrix,headLocalMatrix,headMatrix,capLocalMatrix,capMatrix,gripHead,gripBody,gripWorld:transformCapPoint(capMatrix,CAP_GRIP),claspBody:transformCapPoint(headLocalMatrix,{x:22.5,y:-10}),catchBody:transformCapPoint(headLocalMatrix,{x:0,y:-17}),openingWorld:transformCapPoint(headMatrix,{x:0,y:-16})};
}

export function solveCapArm(shoulder,target,bend=1,length=20){
  const dx=target.x-shoulder.x,dy=target.y-shoulder.y,raw=Math.hypot(dx,dy),distance=clamp(raw,.0001,length*2-.0001),ux=raw>.00001?dx/raw:0,uy=raw>.00001?dy/raw:-1;
  const wrist={x:shoulder.x+ux*distance,y:shoulder.y+uy*distance},half=distance*.5,height=Math.sqrt(Math.max(0,length*length-half*half));
  return {shoulder:{...shoulder},elbow:{x:shoulder.x+ux*half-uy*height*bend,y:shoulder.y+uy*half+ux*height*bend},wrist,requested:{...target},length};
}
const hex=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:/^#[0-9a-f]{3}$/i.test(value||'')?'#'+value.slice(1).split('').map(c=>c+c).join(''):fallback;

export function resolveCapScene(scene,chapterIndex=0,festivalId=null,theme={}){
  const fallback=FESTIVAL_MOTIFS[festivalId]||STORY_MOTIFS[clamp(Math.trunc(Number(chapterIndex)||0),0,5)];
  return {...(scene&&typeof scene==='object'?scene:{}),id:typeof scene?.id==='string'?scene.id:(festivalId||'chapter-'+chapterIndex),motif:CAP_MOTIFS.includes(scene?.motif)?scene.motif:fallback,color:hex(scene?.color,hex(theme.spirit,'#a2ead9')),accent:hex(scene?.accent,hex(theme.light,'#e9bf78'))};
}

function oval(c,x,y,rx,ry,color,rotation=0){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),rotation,0,TAU);c.fillStyle=color;c.fill();}
function stroke(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function curve(c,points,color,width=2){c.beginPath();c.moveTo(points[0],points[1]);c.bezierCurveTo(...points.slice(2));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function rect(c,x,y,w,h,color,r=3){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();}
function star(c,x,y,r,color){c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.16,y-r*.16,x+r,y);c.quadraticCurveTo(x+r*.16,y+r*.16,x,y+r);c.quadraticCurveTo(x-r*.16,y+r*.16,x-r,y);c.quadraticCurveTo(x-r*.16,y-r*.16,x,y-r);c.fillStyle=color;c.fill();}
function heart(c,x,y,r,color){c.beginPath();c.moveTo(x,y+r*.85);c.bezierCurveTo(x-r*1.7,y-r*.25,x-r*.65,y-r*1.5,x,y-r*.55);c.bezierCurveTo(x+r*.65,y-r*1.5,x+r*1.7,y-r*.25,x,y+r*.85);c.fillStyle=color;c.fill();}
function envelope(c,x,y,w,color,seal){rect(c,x-w/2,y-w*.32,w,w*.64,color,2);stroke(c,[[x-w/2+2,y-w*.28],[x,y+2],[x+w/2-2,y-w*.28]],'#746d6977',1.2);oval(c,x,y+2,2.2,2.2,seal);}
function book(c,x,y,w,h,color){rect(c,x,y,w,h,color,2);rect(c,x+2,y+2,w-4,h-4,'#e9e1c7',1);stroke(c,[[x+3,y+h*.5],[x+w-3,y+h*.5]],color+'88',1);}
function leaf(c,x,y,rx,ry,color,rotation=0){oval(c,x,y,rx,ry,color,rotation);}
function littleBird(c,x,y,color){curve(c,[x-7,y,x-4,y-5,x-1,y-4,x,y],color,2);curve(c,[x,y,x+1,y-4,x+4,y-5,x+7,y],color,2);}
function face(c,x,y,color,smile=true){oval(c,x-5,y,1.8,2.3,color);oval(c,x+5,y,1.8,2.3,color);if(smile)curve(c,[x-3,y+5,x-1,y+8,x+1,y+8,x+3,y+5],color,1.1);}
function moon(c,x,y,r,color){oval(c,x,y,r,r,color);oval(c,x+r*.45,y-r*.25,r*.78,r*.78,'#274548');}
function flame(c,x,y,color){c.beginPath();c.moveTo(x,y-7);c.bezierCurveTo(x-8,y+1,x-3,y+7,x,y+6);c.bezierCurveTo(x+7,y+6,x+5,y,x,y-7);c.fillStyle=color;c.fill();}

function greenhouseMiniature(c,scene,t=0){
  const state=scene.greenhouse,color=scene.color,accent=scene.accent;
  drawLetterMiniature(c,scene.letterEcho,t);
  const stage=Number.isInteger(state.stage)?clamp(state.stage,0,3):0;
  const from=Number.isInteger(state.fromStage)?clamp(state.fromStage,0,stage):stage;
  const progress=Number.isFinite(state.progress)?clamp(state.progress,0,1):1;
  const eased=progress*progress*(3-2*progress);
  // Stage visibility comes solely from the supplied progression. Time cannot
  // grow an unearned plant, and a saved final stage needs no replayed flourish.
  const reveal=threshold=>from>=threshold?1:stage>=threshold?eased:0;
  const soilSeed=reveal(1),leaves=reveal(2),flower=reveal(3);
  const paper=state.pot==='ticket';
  oval(c,0,21,28,3,'#203d3c33');
  if(paper){
    // Keep the conductor's notches, perforation and train from the original
    // ticket; the folded corners and dark top turn it into a tiny paper pot.
    c.save();c.translate(0,3);drawFirstTicket(c,{scale:.92});c.restore();
    c.beginPath();c.moveTo(-20,-9);c.lineTo(-14,-15);c.lineTo(14,-15);c.lineTo(20,-9);c.closePath();c.fillStyle='#e1bf85';c.fill();
    stroke(c,[[-20,-9],[-14,15],[14,15],[20,-9]],'#b58b58',.9);
    stroke(c,[[-17,12],[17,12]],'#fff1c288',.7);
    oval(c,0,-10,18,5,'#715c48');oval(c,0,-11,16,3.1,'#493f37');
    curve(c,[-18,-10,-7,-3,7,-3,18,-10],'#f6dba1',1.8);
  }else{
    c.beginPath();c.moveTo(-18,-10);c.lineTo(18,-10);c.lineTo(13,14);c.quadraticCurveTo(0,20,-13,14);c.closePath();c.fillStyle='#ba876c';c.fill();
    stroke(c,[[-13,-5],[-10,12]],'#e7b292',1.7);rect(c,-21,-13,42,7,'#ddb08d',3);
    oval(c,0,-12,18,3.5,'#614c3e');star(c,0,4,4.3,'#eac99a');
  }
  // Soil granules are stable landmarks; the seed settles between them.
  for(const [x,y,r] of [[-9,-11,1.3],[11,-10,1],[-2,-8,1],[6,-12,.8]])oval(c,x,y,r,r,'#a48964');
  if(soilSeed>0&&leaves<1){
    c.save();c.globalAlpha*=soilSeed*(1-leaves);
    // Keep enough of the kernel above the soil to read as a newly planted
    // seed even in the phone's small projection; bury its lower tip.
    c.beginPath();c.rect(-20,-60,40,52);c.clip();
    drawGreenhouseSeed(c,{x:0,y:-13-(1-soilSeed)*19,scale:.6});c.restore();
  }
  if(leaves>0){
    const top=-10-24*leaves-11*flower;
    curve(c,[0,-10,-4,-18*leaves-8,5,-24*leaves-8,2,top],color,2.3);
    c.save();c.translate(0,-12-10*leaves);c.scale(leaves,leaves);
    leaf(c,-8,-5,11,4.2,color,.5);stroke(c,[[-15,-8],[-1,-1]],'#e7ecc777',.65);
    leaf(c,10,-11,12,4.7,'#97c89d',-.55);stroke(c,[[2,-7],[18,-15]],'#e7ecc788',.65);c.restore();
    if(flower>0){
      c.save();c.translate(2,top);c.scale(.22+.78*flower,.22+.78*flower);
      for(let i=0;i<6;i++){const a=-Math.PI/2+i*TAU/6;leaf(c,Math.cos(a)*6.2,Math.sin(a)*6.2,5.3,3.1,i%2?'#f2c3b3':'#f2d6b2',a);}
      oval(c,0,0,4.6,4.6,accent);oval(c,0,0,2.1,2.1,'#ba9862');
      for(const [x,y] of [[-1,-1],[1.5,-.5],[.3,1.7]])oval(c,x,y,.55,.55,'#fff0c2');c.restore();
    }else oval(c,2,top,2.4,3,color);
  }
}

export function drawCapMiniature(c,input,t=0){
  const scene=resolveCapScene(input),color=scene.color,accent=scene.accent,ivory='#f6e8c8',ink='#324c52';
  t=Number.isFinite(t)?clamp(t,-1000000,1000000):0;
  const sway=Math.sin(t*1.5),small=Math.sin(t*2)*1.5;
  c.save();c.lineCap='round';c.lineJoin='round';
  oval(c,0,18,48,8,color+'22');oval(c,0,18,34,3,accent+'44');
  switch(scene.motif){
    case 'station': {
      // A brass clock, waiting bench and a toy train; the forgotten station wakes.
      stroke(c,[[-40,14],[40,14]],accent,2);stroke(c,[[-38,18],[38,18]],color+'99',1);
      for(let x=-32;x<=32;x+=12)stroke(c,[[x,12],[x+3,20]],color+'99',1.3);
      stroke(c,[[-29,11],[-29,-34]],accent,3);rect(c,-37,-32,17,6,accent);
      oval(c,-29,-43,10,10,ivory);oval(c,-29,-43,7.5,7.5,ink);stroke(c,[[-29,-48],[-29,-43],[-25,-41]],accent,1.4);
      rect(c,-11,-24,34,29,color,5);rect(c,18,-13,16,18,color,4);rect(c,-8,-21,12,10,ink,2);rect(c,8,-21,11,10,ink,2);rect(c,23,-25,5,12,accent,1);rect(c,-13,3,49,5,accent,2);
      for(const x of [-4,17,29]){oval(c,x,9,5,5,ink);oval(c,x,9,2,2,accent);}
      if(scene.firstTicket===true)drawFirstTicket(c,{x:5,y:-7,scale:.47,rotation:-.06});
      oval(c,27+sway,-34,5,3,ivory+'66');oval(c,33+sway*2,-43,4,2.5,ivory+'44');star(c,42,-31,3,accent);
      break;
    }
    case 'sprout': {
      if(scene.greenhouse&&typeof scene.greenhouse==='object'&&!Array.isArray(scene.greenhouse)){greenhouseMiniature(c,scene,t);break;}
      book(c,-35,8,52,8,accent);book(c,-29,0,49,8,color);
      c.beginPath();c.moveTo(-13,-8);c.lineTo(13,-8);c.lineTo(9,8);c.quadraticCurveTo(0,13,-9,8);c.closePath();c.fillStyle='#d79c80';c.fill();rect(c,-16,-11,32,6,'#f0ba94');
      curve(c,[0,-8,-6,-24,6+sway,-34,2+sway,-49],color,2.5);
      leaf(c,-10,-31,12,5,color,-.55);leaf(c,13,-39,12,5,color,.55);leaf(c,-5,-46,8,4,accent,.5);
      oval(c,31,-13,11,5,'#e9bbcc');rect(c,29,-13,4,15,ivory,1);oval(c,27,-15,2,1.5,ivory);oval(c,35,-14,2,1.5,ivory);
      for(let i=0;i<3;i++)star(c,-31+i*27,-38+(i%2)*16+small,2.5,accent);break;
    }
    case 'moon': {
      stroke(c,[[-43,18],[-43,-49],[43,-49],[43,18]],accent,2);
      for(const side of [-1,1]){c.beginPath();c.moveTo(side*43,-48);c.lineTo(side*23,-48);c.quadraticCurveTo(side*21,-18,side*39,-5);c.lineTo(side*43,17);c.closePath();c.fillStyle='#b17b9baa';c.fill();stroke(c,[[side*40,-8],[side*31,-10]],accent,2);}
      stroke(c,[[8,-49],[8,-31]],ivory+'77',1);moon(c,8,-21,18,ivory);star(c,-18,-26+small,4,accent);star(c,28,-38-small,3,color);rect(c,-39,15,78,6,accent);stroke(c,[[-22,20],[22,20]],ivory+'77',1);break;
    }
    case 'whale': {
      book(c,-34,10,58,8,accent);book(c,-28,2,58,8,color);book(c,-20,-6,43,8,'#bcb1df');
      c.save();c.translate(0,small-27);c.beginPath();c.moveTo(-28,1);c.bezierCurveTo(-28,-24,16,-26,21,-6);c.quadraticCurveTo(29,-12,39,-14);c.quadraticCurveTo(35,2,24,6);c.bezierCurveTo(11,22,-19,19,-28,1);c.fillStyle=color;c.fill();
      c.beginPath();c.moveTo(-23,4);c.bezierCurveTo(-8,15,10,13,21,4);c.bezierCurveTo(11,22,-17,20,-23,4);c.fillStyle=ivory+'bb';c.fill();oval(c,-14,-5,2.5,3,ink);oval(c,-12,-7,1,1,ivory);leaf(c,0,8,10,4,accent,-.5);stroke(c,[[-4,-20],[-4,-28]],color,1.5);curve(c,[-4,-25,-10,-30,-14,-29,-13,-27],color,1.5);curve(c,[-4,-25,2,-30,5,-29,6,-27],color,1.5);c.restore();star(c,38,-39,3,accent);break;
    }
    case 'clock': {
      oval(c,0,-44,7,7,accent);oval(c,0,-44,4,4,ink);oval(c,0,-16,27,29,accent);oval(c,0,-16,23,25,ink);oval(c,0,-16,19,21,color+'33');
      for(let i=0;i<12;i++){const a=i*TAU/12;stroke(c,[[Math.sin(a)*17,-16+Math.cos(a)*19],[Math.sin(a)*20,-16+Math.cos(a)*22]],ivory,1.2);}
      const a=t*.16;stroke(c,[[Math.sin(a)*12,-16-Math.cos(a)*14],[0,-16],[10,-11]],ivory,2);oval(c,0,-16,2.5,2.5,accent);
      curve(c,[25,-23,45,-27,50,4,34,9],accent,2);star(c,-38,-29,3,color);stroke(c,[[-30,20],[-19,17],[-8,20],[4,17],[18,20],[31,17]],color,1.5);break;
    }
    case 'dawn': {
      const rise=small*.5;oval(c,0,-15+rise,24,24,accent+'44');oval(c,0,-15+rise,18,18,accent);
      for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6;stroke(c,[[Math.cos(a)*29,-15+Math.sin(a)*29],[Math.cos(a)*35,-15+Math.sin(a)*35]],accent,1.5);}
      rect(c,-45,10,90,4,color);envelope(c,0,8,50,ivory,accent);littleBird(c,-33,-31,color);littleBird(c,32,-25,color);star(c,28,0,3,ivory);break;
    }
    case 'pumpkin': {
      stroke(c,[[-31,14],[-31,-37]],accent,2);curve(c,[-31,-37,-31,-49,-17,-49,-17,-39],accent,2);stroke(c,[[-17,-40],[-17,-31]],accent,1);
      oval(c,4,-6,25,24,'#db925d');oval(c,-5,-7,11,23,'#e7aa6e');oval(c,10,-7,11,23,'#f0bb77');curve(c,[4,-29,0,-36,7,-40,12,-36],color,4);leaf(c,16,-31,10,4,color,-.2);
      c.beginPath();c.moveTo(-12,-10);c.lineTo(-7,-17);c.lineTo(-3,-10);c.closePath();c.fillStyle=ink;c.fill();c.beginPath();c.moveTo(7,-10);c.lineTo(12,-17);c.lineTo(16,-10);c.closePath();c.fill();curve(c,[-7,0,-2,9,7,9,13,0],ink,2.5);
      oval(c,-17,-26,7,9,color);face(c,-17,-27,ink,false);littleBird(c,35,-40,color);star(c,39,-19+small,3,accent);break;
    }
    case 'table': {
      // Two places, one small empty chair, and steam with room for a late friend.
      for(const x of [-30,30]){stroke(c,[[x-6,17],[x-6,-16],[x+6,-16],[x+6,17]],accent,2);stroke(c,[[x-7,4],[x+7,4]],accent,3);}
      rect(c,-29,-5,58,8,'#c58e70');stroke(c,[[-22,2],[-25,20]],accent,3);stroke(c,[[22,2],[25,20]],accent,3);c.beginPath();c.moveTo(-23,-5);c.lineTo(-17,9);c.lineTo(17,9);c.lineTo(23,-5);c.fillStyle=color;c.fill();
      oval(c,0,-8,11,5,ivory);oval(c,0,-10,8,3,'#d9a968');curve(c,[-4,-15,-10,-26,5,-27,-2,-36],ivory+'aa',1.5);curve(c,[6,-15,13,-25,1,-31,7,-39],ivory+'88',1.2);
      stroke(c,[[-38,-11],[-35,-40]],accent,1.5);for(let i=0;i<4;i++){leaf(c,-38,-17-i*5,4,2,accent,.6);leaf(c,-32,-20-i*5,4,2,accent,-.6);}heart(c,29,-35+small,6,accent);break;
    }
    case 'bell': {
      stroke(c,[[0,-54],[0,-44]],color,2);c.beginPath();c.moveTo(-18,-12);c.quadraticCurveTo(-12,-18,-12,-29);c.bezierCurveTo(-12,-48,12,-48,12,-29);c.quadraticCurveTo(12,-18,18,-12);c.closePath();c.fillStyle=accent;c.fill();oval(c,0,-12,18,5,'#b58f62');oval(c,0,-10,5,5,ivory);stroke(c,[[-7,-34],[-9,-24]],ivory+'aa',2);
      rect(c,-29,0,22,18,color);rect(c,-20,0,4,18,ivory);stroke(c,[[-29,7],[-7,7]],ivory,3);rect(c,8,5,22,13,'#c68b94');rect(c,17,5,4,13,ivory);
      for(const [x,y] of [[-35,-38],[35,-30],[-9,-54],[42,2]]){star(c,x,y+small,3,color);stroke(c,[[x-3,y-3+small],[x+3,y+3+small]],color,1);}break;
    }
    case 'firework': {
      oval(c,0,0,20,20,color);oval(c,0,0,16,16,ink);stroke(c,[[0,-11],[0,0],[7,-5]],ivory,2);oval(c,0,0,2,2,accent);
      for(const [x,y,r] of [[-29,-35,14],[28,-40,15]])for(let i=0;i<7;i++){const a=i*TAU/7;stroke(c,[[x+Math.cos(a)*r*.48,y+Math.sin(a)*r*.48],[x+Math.cos(a)*r,y+Math.sin(a)*r]],i%2?color:accent,1.7);}star(c,-29,-35,3,ivory);star(c,28,-40,3,ivory);
      curve(c,[-29,-19,-36,-7,-32,2,-34,9],accent+'88',1);curve(c,[28,-22,36,-10,27,2,33,8],color+'88',1);break;
    }
    case 'nian': {
      oval(c,0,-21,27,22,'#c98378');leaf(c,-26,-36,11,6,accent,-.55);leaf(c,26,-36,11,6,accent,.55);oval(c,-13,-26,10,11,ivory);oval(c,13,-26,10,11,ivory);oval(c,-12,-25,4,5,ink);oval(c,12,-25,4,5,ink);oval(c,0,-10,17,10,accent);oval(c,-6,-12,2,2,ink);oval(c,6,-12,2,2,ink);curve(c,[-7,-5,-3,0,3,0,7,-5],ink,1.5);star(c,0,-42,6,accent);
      rect(c,-16,5,32,13,color);oval(c,0,5,16,5,ivory);stroke(c,[[-27,2],[-8,-4]],accent,3);stroke(c,[[27,2],[8,-4]],accent,3);for(const x of [-10,0,10])oval(c,x,12,1.5,1.5,accent);break;
    }
    case 'rabbit': {
      stroke(c,[[0,-54],[0,-34]],accent,1.5);leaf(c,-10,-35,5,15,ivory,-.18);leaf(c,10,-35,5,15,ivory,.18);leaf(c,-10,-36,2,10,'#e4b0b1',-.18);leaf(c,10,-36,2,10,'#e4b0b1',.18);oval(c,0,-10,24,24,ivory);oval(c,0,-6,20,17,accent+'55');face(c,0,-12,ink);oval(c,-14,-5,4,2,'#e3a9a399');oval(c,14,-5,4,2,'#e3a9a399');stroke(c,[[0,14],[0,24]],accent,2);stroke(c,[[-4,23],[4,23]],accent,2);star(c,-36,-30+small,4,color);star(c,35,-18-small,3,accent);break;
    }
    case 'heart': {
      c.save();c.translate(-18,2);c.rotate(-.15);envelope(c,0,0,43,ivory,'#d89aa9');c.restore();c.save();c.translate(18,4);c.rotate(.15);envelope(c,0,0,43,color,'#d89aa9');c.restore();
      curve(c,[-17,-8,-39,-32,-6,-40,0,-23],accent,1.5);curve(c,[17,-6,39,-27,9,-43,0,-23],accent,1.5);heart(c,0,-35+small,12,'#e4a4b7');heart(c,-32,-40-small*.5,4,accent);star(c,33,-32,4,accent);break;
    }
    case 'boat': {
      c.beginPath();c.moveTo(-38,-1);c.quadraticCurveTo(0,10,34,-4);c.quadraticCurveTo(26,20,-24,13);c.closePath();c.fillStyle=color;c.fill();stroke(c,[[-31,2],[23,6]],accent,2);
      curve(c,[27,3,43,-2,38,-14,40,-20],color,7);oval(c,36,-23,11,7,color);oval(c,39,-25,2,2,ink);stroke(c,[[29,-28],[27,-35]],accent,2);stroke(c,[[42,-29],[46,-33]],accent,2);stroke(c,[[0,5],[0,-47]],accent,2);c.beginPath();c.moveTo(2,-45);c.lineTo(25,-35);c.lineTo(2,-28);c.fillStyle='#d39a9e';c.fill();
      for(const x of [-19,0,18])stroke(c,[[x,-3],[x-13,18]],accent,2);stroke(c,[[-44,22],[-33,20],[-22,23],[-10,21],[1,24],[14,21],[27,23],[40,20]],color+'99',1.3);break;
    }
    case 'bridge': {
      curve(c,[-42,16,-22,-17,22,-17,42,16],color,5);curve(c,[-42,5,-22,-29,22,-29,42,5],accent,2);
      for(let i=0;i<7;i++){const x=-36+i*12,y=-6+Math.pow(x/36,2)*15;stroke(c,[[x,y],[x,y+10]],accent,1.4);star(c,x,y+15,2.5,accent);}
      littleBird(c,-17,-36+small,ivory);littleBird(c,19,-41-small,ivory);heart(c,0,-31,5,'#dfaec5');star(c,-40,-36,3,color);star(c,39,-25,3,color);break;
    }
    case 'mooncake': {
      oval(c,25,-35,16,16,ivory+'bb');oval(c,19,-40,3,2,accent+'66');oval(c,31,-31,4,3,accent+'55');
      for(let i=0;i<12;i++){const a=i*TAU/12;oval(c,-5+Math.cos(a)*22,Math.sin(a)*18,6,6,'#d79c66');}oval(c,-5,0,23,19,accent);oval(c,-5,0,18,14,'#d9a36b');c.strokeStyle=ivory+'aa';c.lineWidth=1.2;c.beginPath();c.ellipse(-5,0,15,11,0,0,TAU);c.stroke();
      curve(c,[-16,3,-16,-11,2,9,8,-4],ivory,1.4);star(c,9,-5,3,ivory);oval(c,-16,3,2,2,ivory);stroke(c,[[-39,-6],[-34,-29]],color,1.5);leaf(c,-40,-23,7,3,color,.45);leaf(c,-30,-29,7,3,color,-.45);break;
    }
  }
  c.restore();
}

// Called in the lower skull's coordinate system; the cap and its hat hinge above it.
export function drawCapInterior(c,scene,t,openness){
  if(openness<=.02)return;
  c.save();c.globalAlpha*=clamp(openness,0,1);
  const glow=c.createRadialGradient(0,-17,1,0,-17,35);glow.addColorStop(0,scene.color+'70');glow.addColorStop(1,scene.color+'00');c.fillStyle=glow;c.fillRect(-36,-53,72,72);
  oval(c,0,-13,20,5,'#283e48');oval(c,0,-14,17,3,scene.color+'66');
  c.save();c.translate(0,-20);c.scale(.35,.35);drawCapMiniature(c,scene,t);c.restore();
  c.restore();
}

// This rim belongs in front of a peeking/returning soul, after the lower skull.
export function drawCapFrontRim(c,scene,openness){
  if(openness<=.02)return;
  c.save();c.globalAlpha*=clamp(openness,0,1);
  c.beginPath();c.ellipse(0,-13,21,5,0,0,Math.PI);c.strokeStyle='#c8b58e';c.lineWidth=3.4;c.stroke();
  c.beginPath();c.ellipse(0,-14,20,4.2,0,.06,Math.PI-.06);c.strokeStyle='#f4e5bc';c.lineWidth=1.4;c.stroke();c.restore();
}

export function drawCapTheatre(game,c,t){
  const cap=game.cap,scene=game.capScene;if(!cap||!scene)return;
  const b=game.body;
  if(cap.projection>0&&game.capOpen>.1&&!game.options.reducedMotion){
    const enter=clamp((1.4-cap.projection)/.18,0,1),leave=clamp(cap.projection/.35,0,1),alpha=enter*leave*game.capOpen;
    const x=b.x+b.face*24,y=b.y-150;
    c.save();c.globalAlpha=.65*alpha;
    const ray=c.createLinearGradient(b.x,b.y-70,x,y-30);ray.addColorStop(0,scene.color+'22');ray.addColorStop(1,scene.color+'05');c.fillStyle=ray;
    c.beginPath();c.moveTo(b.x-8,b.y-68);c.lineTo(x-40,y-32);c.quadraticCurveTo(x,y-55,x+40,y-32);c.lineTo(b.x+8,b.y-68);c.closePath();c.fill();
    c.strokeStyle=scene.color+'66';c.lineWidth=1;c.beginPath();c.ellipse(x,y-9,46,43,0,-.1,Math.PI*1.25);c.stroke();
    c.translate(x,y);c.scale(.82,.82);drawCapMiniature(c,scene,t);c.restore();
  }
  for(const flight of game.thoughtFlights||[]){
    const q=clamp(flight.age/flight.duration,0,1),u=1-q,target={x:b.x,y:b.y-67};
    const cx=(flight.x+target.x)/2,cy=Math.min(flight.y,target.y)-65;
    const x=u*u*flight.x+2*u*q*cx+q*q*target.x,y=u*u*flight.y+2*u*q*cy+q*q*target.y;
    c.save();c.globalAlpha=(1-q)*.8;star(c,x,y,3.5,flight.color);c.globalAlpha=(1-q)*.24;c.strokeStyle=flight.color;c.lineWidth=1;c.beginPath();c.moveTo(flight.x,flight.y);c.quadraticCurveTo(cx,cy,x,y);c.stroke();c.restore();
  }
}

export function drawSoulVision(game,c,t){
  if(game.form!=='soul')return;
  const scene=game.capScene,reduce=game.options.reducedMotion,visible=x=>x>game.camera-80&&x<game.camera+game.viewWidth+80;
  c.save();
  // Readable relationships: a warm thread goes from the body's plate to its veil.
  for(const gate of game.level.barriers){
    const plate=game.level.plates.find(p=>p.id===gate.plateId);if(!plate||(!visible(plate.x)&&!visible(gate.x)))continue;
    const active=game.barrierOpen(gate),color=active?scene.color:scene.accent,x1=plate.x+plate.w/2,y1=plate.y-10,x2=gate.x+gate.w/2,y2=Math.min(plate.y-118,gate.y+gate.h*.65),cx=(x1+x2)/2,cy=Math.min(y1,y2)-33;
    c.globalAlpha=active?.5:.3;c.strokeStyle=color;c.lineWidth=active?2:1.4;c.setLineDash(active?[]:[3,7]);c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo(cx,cy,x2,y2);c.stroke();c.setLineDash([]);
    for(let i=0;i<3;i++){const q=reduce?(i+1)/4:(t*.2+i/3)%1,u=1-q;star(c,u*u*x1+2*u*q*cx+q*q*x2,u*u*y1+2*u*q*cy+q*q*y2,2.3,color);}
    oval(c,x1,y1,4,2,color);star(c,x2,y2,5,color);
  }
  // Only the five existing goals receive these delicate etched orbit marks.
  for(const item of [...game.memories.filter(m=>!m.collected),...game.lanterns.filter(l=>!l.lit)]){
    if(!visible(item.x))continue;
    c.globalAlpha=.33;c.strokeStyle=scene.color;c.lineWidth=1;c.beginPath();c.ellipse(item.x,item.y,29,29,0,0,TAU);c.stroke();
    const a=reduce?-.7:t*.35;star(c,item.x+Math.cos(a)*29,item.y+Math.sin(a)*29,3,scene.accent);
    stroke(c,[[item.x-4,item.y-36],[item.x,item.y-40],[item.x+4,item.y-36]],scene.color,1.2);
  }
  c.restore();
}
