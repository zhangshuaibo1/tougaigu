import { drawCapMiniature } from './dream-cap-art.js';

// World-space presentation only. Activity state, travel and routing belong to
// the activity controller; this renderer never starts timers or changes view.
const TAU = Math.PI * 2;
const INK = '#293e48';
const IVORY = '#f8eacb';
const GOLD = '#edcd96';
const FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const hex = (color, fallback) => /^#[\da-f]{6}$/i.test(color || '') ? color : /^#[\da-f]{3}$/i.test(color || '') ? '#' + color.slice(1).split('').map(v => v + v).join('') : fallback;
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);

function ellipse(c, x, y, rx, ry, fill, rotation = 0) {
  c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rotation, 0, TAU);
  c.fillStyle = fill; c.fill();
}
function path(c, points, color, width = 1.5, close = false) {
  if (!points.length) return;
  c.beginPath(); c.moveTo(...points[0]);
  for (const p of points.slice(1)) c.lineTo(...p);
  if (close) c.closePath();
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function curve(c, points, color, width = 1.5) {
  c.beginPath(); c.moveTo(points[0], points[1]); c.bezierCurveTo(...points.slice(2));
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function box(c, x, y, w, h, fill, r = 3, edge = null, width = 1) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, w), Math.max(0, h), r);
  c.fillStyle = fill; c.fill();
  if (edge) { c.strokeStyle = edge; c.lineWidth = width; c.stroke(); }
}
function circle(c, x, y, r, edge, width = 1.5) {
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.strokeStyle = edge; c.lineWidth = width; c.stroke();
}
function star(c, x, y, r, fill) {
  c.beginPath(); c.moveTo(x, y-r);
  for (const p of [[x+r*.3,y-r*.3],[x+r,y],[x+r*.3,y+r*.3],[x,y+r],[x-r*.3,y+r*.3],[x-r,y],[x-r*.3,y-r*.3]]) c.lineTo(...p);
  c.closePath(); c.fillStyle = fill; c.fill();
}
function heart(c, x, y, r, fill) {
  c.beginPath(); c.moveTo(x, y+r);
  c.bezierCurveTo(x-r*1.8,y-r*.2,x-r*.7,y-r*1.6,x,y-r*.5);
  c.bezierCurveTo(x+r*.7,y-r*1.6,x+r*1.8,y-r*.2,x,y+r);
  c.fillStyle = fill; c.fill();
}
function leaf(c, x, y, w, h, color, angle = 0) {
  ellipse(c, x, y, w, h, color, angle);
  path(c, [[x-Math.cos(angle)*w*.65,y-Math.sin(angle)*w*.65],[x+Math.cos(angle)*w*.65,y+Math.sin(angle)*w*.65]], IVORY+'55', .8);
}
function face(c, x = 0, y = 0, size = 1, happy = false) {
  if (happy) {
    curve(c,[x-5*size,y,x-4*size,y-3*size,x-2*size,y-3*size,x-size,y],INK,1.2*size);
    curve(c,[x+size,y,x+2*size,y-3*size,x+4*size,y-3*size,x+5*size,y],INK,1.2*size);
  } else {
    ellipse(c,x-3.5*size,y,1.25*size,1.7*size,INK);
    ellipse(c,x+3.5*size,y,1.25*size,1.7*size,INK);
    ellipse(c,x-3.2*size,y-.7*size,.4*size,.6*size,IVORY);
    ellipse(c,x+3.8*size,y-.7*size,.4*size,.6*size,IVORY);
  }
  curve(c,[x-2*size,y+4*size,x-size,y+6*size,x+size,y+6*size,x+2*size,y+4*size],INK+'b8',.9*size);
  ellipse(c,x-7*size,y+3*size,2*size,.9*size,'#eba99b99');
  ellipse(c,x+7*size,y+3*size,2*size,.9*size,'#eba99b99');
}
function envelope(c,x,y,w,color=IVORY,seal=GOLD) {
  box(c,x-w/2,y-w*.3,w,w*.6,color,2,INK+'99',.8);
  path(c,[[x-w/2+2,y-w*.25],[x,y+1],[x+w/2-2,y-w*.25]],INK+'77',.9);
  star(c,x,y+1,2,seal);
}
function bell(c,x,y,r,color) {
  c.beginPath(); c.moveTo(x-r,y+r*.45); c.quadraticCurveTo(x-r*.6,y,x-r*.6,y-r*.45);
  c.bezierCurveTo(x-r*.6,y-r*1.2,x+r*.6,y-r*1.2,x+r*.6,y-r*.45);
  c.quadraticCurveTo(x+r*.6,y,x+r,y+r*.45); c.closePath(); c.fillStyle=color;c.fill();
  ellipse(c,x,y+r*.45,r,r*.22,'#b68e62'); ellipse(c,x,y+r*.65,r*.2,r*.25,IVORY);
  path(c,[[x-r*.32,y-r*.5],[x-r*.4,y-r*.12]],IVORY+'bb',Math.max(.7,r*.12));
}
function moon(c,x,y,r,color) {
  c.beginPath(); c.moveTo(x+r*.3,y-r*.94);
  c.bezierCurveTo(x-r*1.25,y-r*1.05,x-r*1.36,y+r*.82,x+r*.2,y+r*.97);
  c.bezierCurveTo(x+r*.92,y+r*.8,x+r*1.05,y+r*.4,x+r*.93,y+r*.2);
  c.bezierCurveTo(x-r*.06,y+r*.7,x-r*.5,y-r*.44,x+r*.3,y-r*.94);
  c.closePath();c.fillStyle=color;c.fill();
}
function arch(c, x, y, w, h, color, fill = null) {
  c.beginPath(); c.moveTo(x-w/2,y); c.lineTo(x-w/2,y-h+w/2);
  c.bezierCurveTo(x-w/2,y-h-w*.15,x+w/2,y-h-w*.15,x+w/2,y-h+w/2);
  c.lineTo(x+w/2,y); if(fill){c.closePath();c.fillStyle=fill;c.fill();}
  c.strokeStyle=color;c.lineWidth=2;c.stroke();
}
function littleTable(c,color,round=false) {
  if(round) ellipse(c,0,-17,28,10,color); else box(c,-28,-22,56,8,color,3);
  path(c,[[-20,-16],[-22,1]],color,3);path(c,[[20,-16],[22,1]],color,3);
  path(c,[[-24,-20],[24,-20]],IVORY+'88',1);
}
function littleChair(c,x,y,color) {
  box(c,x-8,y-25,16,15,color,3,IVORY+'66',.8);
  box(c,x-10,y-9,20,5,color,2);path(c,[[x-7,y-4],[x-8,y+5]],color,2);path(c,[[x+7,y-4],[x+8,y+5]],color,2);
}
function wave(c,y,color) {
  for(let i=0;i<3;i++)curve(c,[-29+i*19,y,-23+i*19,y-5,-17+i*19,y+5,-10+i*19,y],color,1.4);
}

function cubic(points,q) {
  const u=1-q;return {x:u*u*u*points[0].x+3*u*u*q*points[1].x+3*u*q*q*points[2].x+q*q*q*points[3].x,y:u*u*u*points[0].y+3*u*u*q*points[1].y+3*u*q*q*points[2].y+q*q*q*points[3].y};
}
function arrow(c,x,y,angle,color,size=4) {
  c.save();c.translate(x,y);c.rotate(angle);
  path(c,[[-size,-size*.65],[0,0],[-size,size*.65]],color,1.65);
  c.restore();
}
function drawRoutes(c,view,color,accent) {
  for(const route of view.routes||[]) {
    if(!Array.isArray(route.points)||route.points.length!==4||!route.points.every(point))continue;
    if(route.kind==='return')continue;
    const p=route.points,chosen=route.kind==='trunk'||route.selected,bright=chosen&&route.active!==false;
    c.save();c.beginPath();c.moveTo(p[0].x,p[0].y);c.bezierCurveTo(p[1].x,p[1].y,p[2].x,p[2].y,p[3].x,p[3].y);
    c.strokeStyle=INK+'b0';c.lineWidth=chosen?4:2.3;c.stroke();
    c.setLineDash(chosen?[]:[3,6]);c.strokeStyle=bright?accent+'c9':chosen?color+'8c':color+'48';c.lineWidth=chosen?1.7:1.1;c.stroke();c.setLineDash([]);
    // Solid and dashed geometry, plus chevrons, make switch positions readable
    // without depending on the two route colors.
    if(chosen)for(const q of [.38,.7]){const a=cubic(p,q),b=cubic(p,q+.018);arrow(c,a.x,a.y,Math.atan2(b.y-a.y,b.x-a.x),bright?IVORY+'e6':color+'b8',3.4);}
    c.restore();
  }
}

function drawSwitch(c,b,view,color,accent) {
  if(!point(b))return;
  const nearby=!!b.nearby,reachable=b.reachable!==false;
  const output=b.outputs?.[b.selected??b.routeIndex??0];
  const route=(view.routes||[]).find(r=>r.id===output?.routeId);
  const target=(view.nodes||[]).find(n=>n.id===output?.to);
  let direction=route?.points?.[1]||target;
  if(!point(direction)||Math.hypot(direction.x-b.x,direction.y-b.y)<2)direction=route?.points?.[2]||{x:b.x+30,y:b.y-20};
  const angle=Math.atan2(direction.y-b.y,direction.x-b.x);
  c.save();c.translate(b.x,b.y);c.globalAlpha*=reachable?1:.56;
  ellipse(c,0,2,21,21,INK+'ed');circle(c,0,0,19,nearby?IVORY:accent+'c2',nearby?2:1.2);
  if(nearby){circle(c,0,0,24,accent,1);for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])path(c,[[Math.cos(a)*27,Math.sin(a)*27],[Math.cos(a)*30,Math.sin(a)*30]],IVORY,1.7);}
  // A fork below the bell distinguishes a rotatable switch from a receiver.
  path(c,[[-9,10],[0,5],[9,10]],color+'a0',1.3);bell(c,0,-2,9,accent);
  circle(c,0,-12,2.2,accent,1);
  const ax=Math.cos(angle)*15,ay=Math.sin(angle)*15;
  path(c,[[ax-Math.cos(angle)*7,ay-Math.sin(angle)*7],[ax,ay]],IVORY,1.5);arrow(c,ax,ay,angle,IVORY,4);
  box(c,-25,-23,14,14,INK,4,nearby?IVORY:color+'a0',1);
  c.fillStyle=IVORY;c.font=`700 9px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(b.id||'').slice(-1).toUpperCase(),-18,-16);
  if(nearby){box(c,15,16,16,14,IVORY,4);c.fillStyle=INK;c.font=`700 9px ${FONT}`;c.fillText('Q',23,23);}
  c.restore();
}

function drawReceiver(c,d,targetIndex,color,accent) {
  if(!point(d))return;
  const wanted=d.index===targetIndex&&!d.complete;
  c.save();c.translate(d.x,d.y);
  ellipse(c,0,17,24,5,INK+'a6');ellipse(c,0,14,20,4,color+'77');path(c,[[-17,14],[-17,18],[17,18],[17,14]],color+'b8',1);
  box(c,-17,-20,34,32,INK+'ed',6,d.complete?color:wanted?IVORY:accent+'9c',wanted?1.8:1);
  if(wanted){path(c,[[-22,-10],[-22,-24],[-9,-24]],accent,1.8);path(c,[[9,-24],[22,-24],[22,-10]],accent,1.8);star(c,0,-31,3.5,accent);}
  if(d.complete){path(c,[[-7,-5],[-1,1],[9,-10]],color,2.4);ellipse(c,0,7,9,1.5,color+'30');}
  else {c.fillStyle=wanted?IVORY:accent;c.font=`700 16px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(String((d.index??0)+1),0,-4);}
  // Receiver labels name a place; switch labels A/B name controls.
  const label=String(d.label||'').slice(0,8),width=Math.max(42,Math.min(90,label.length*10+12));
  box(c,-width/2,24,width,18,INK+'df',5);
  c.fillStyle=d.complete?color:IVORY;c.font=`10px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(label,0,33);
  c.restore();
}

// Each destination contributes one tangible piece to the persistent vignette.
// Piece scale is deliberately larger than decorative stars and smaller than
// the original level's lanterns, letters and platforms.
function drawGrowthPiece(c,motif,index,color,accent) {
  const wood='#a87c64',rose='#d79cab';
  switch(motif){
    case 'station':
      if(index===0){path(c,[[0,1],[0,-47]],accent,3);box(c,-23,-49,46,15,color,4,accent,1.3);star(c,-14,-41,3,IVORY);path(c,[[-5,-43],[14,-43]],INK+'88',1);path(c,[[-5,-39],[8,-39]],INK+'77',1);ellipse(c,0,1,11,3,accent+'88');}
      if(index===1){box(c,-27,-26,54,15,wood,3,accent,.8);path(c,[[-24,-19],[24,-19]],IVORY+'77',1);box(c,-30,-10,60,6,accent,2);path(c,[[-23,-4],[-24,4]],wood,3);path(c,[[23,-4],[24,4]],wood,3);envelope(c,11,-28,12,IVORY,color);}
      if(index===2){for(let i=0;i<6;i++)path(c,[[-28+i*11,-9],[-25+i*11,5]],wood,3);path(c,[[-34,-8],[34,-8]],accent,2);path(c,[[-32,2],[36,2]],color,2);path(c,[[23,-9],[23,-24]],accent,1.5);box(c,13,-35,21,11,color,3);star(c,23,-29,3,IVORY);}
      break;
    case 'sprout':
      if(index===0){c.beginPath();c.moveTo(-20,-22);c.lineTo(20,-22);c.lineTo(14,3);c.quadraticCurveTo(0,9,-14,3);c.closePath();c.fillStyle='#c78b6c';c.fill();box(c,-23,-26,46,7,'#edb78d',3);ellipse(c,0,-23,17,3,'#6e5d4f');path(c,[[0,-25],[1,-45]],color,2);leaf(c,-8,-39,10,4,color,.45);leaf(c,10,-46,12,4,color,-.4);}
      if(index===1){for(const [x,y,a] of [[-22,-4,-.12],[0,-20,.13],[22,-36,-.13]]){path(c,[[x,y+2],[x-3,y+15]],color+'88',1.5);leaf(c,x,y,18,5,color,a);path(c,[[x-10,y],[x+10,y]],IVORY+'aa',1);}}
      if(index===2){arch(c,0,3,43,56,accent,'#5b897329');path(c,[[0,-48],[0,2]],accent,1.3);path(c,[[-20,-25],[20,-25]],accent,1.3);curve(c,[-25,3,-35,-12,-12,-24,-21,-43],color,2.2);leaf(c,-27,-18,10,4,color,-.65);leaf(c,25,-8,11,4,color,.6);path(c,[[7,-36],[14,-43]],IVORY+'88',1.2);}
      break;
    case 'moon':
      if(index===0){path(c,[[-27,3],[-27,-47],[27,-47],[27,3]],accent,2);for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*26,-46);c.lineTo(sign*9,-46);c.quadraticCurveTo(sign*12,-23,sign*25,-14);c.lineTo(sign*27,2);c.closePath();c.fillStyle=rose;c.fill();path(c,[[sign*24,-16],[sign*17,-18]],accent,1.3);}}
      if(index===1){ellipse(c,0,-2,28,7,accent);ellipse(c,0,-5,26,6,rose);path(c,[[0,-46],[0,-30]],accent,1.5);star(c,0,-28,8,IVORY);path(c,[[-18,-9],[0,-24],[18,-9]],color+'66',1);}
      if(index===2){for(const x of [-23,0,23])littleChair(c,x,x===0?-5:0,rose);star(c,0,-37,4,accent);}
      break;
    case 'whale':
      if(index===0){c.beginPath();c.moveTo(-31,-24);c.quadraticCurveTo(-15,-30,0,-23);c.quadraticCurveTo(16,-30,31,-24);c.lineTo(28,2);c.quadraticCurveTo(12,-4,0,3);c.quadraticCurveTo(-14,-4,-28,2);c.closePath();c.fillStyle=IVORY;c.fill();path(c,[[0,-22],[0,1]],accent,1.2);path(c,[[-22,-15],[-9,-16]],color,1);path(c,[[9,-15],[21,-16]],color,1);}
      if(index===1){arch(c,0,1,42,53,accent);for(const sign of [-1,1])for(let y=-34;y<3;y+=11)box(c,sign<0?-29:20,y,9,10,(y%2)?color:accent,1);c.save();c.translate(0,-48);c.rotate(-.07);box(c,-24,-4,48,9,color,2,IVORY+'77',.6);c.restore();}
      if(index===2){ellipse(c,0,-1,32,9,color+'66');wave(c,-8,color);wave(c,1,IVORY+'88');c.beginPath();c.moveTo(-3,-10);c.bezierCurveTo(-7,-26,-22,-28,-19,-36);c.quadraticCurveTo(-4,-39,2,-25);c.quadraticCurveTo(8,-39,23,-36);c.bezierCurveTo(23,-25,8,-25,6,-10);c.fillStyle=color;c.fill();}
      break;
    case 'clock':
      if(index===0){arch(c,0,3,44,51,accent);path(c,[[0,-47],[0,-19]],accent,2);ellipse(c,0,-13,10,11,color);circle(c,0,-13,7,IVORY+'88',.9);box(c,-27,1,54,5,wood,2);}
      if(index===1){curve(c,[-32,0,-13,-25,13,-25,32,0],accent,3);curve(c,[-32,-9,-13,-34,13,-34,32,-9],color,1.4);for(let x=-24;x<=24;x+=12)path(c,[[x,-19+Math.abs(x)*.4],[x,-11+Math.abs(x)*.4]],IVORY,1.2);}
      if(index===2){path(c,[[-27,-47],[27,-47]],accent,3);for(const [x,y]of[[-18,-12],[0,-5],[18,-18]]){path(c,[[x,-46],[x,y-6]],color,1.2);bell(c,x,y,5,accent);}path(c,[[0,-55],[0,-48]],accent,1.4);}
      break;
    case 'dawn':
      if(index===0){arch(c,0,1,46,53,accent,color+'22');ellipse(c,0,-27,12,12,accent+'88');path(c,[[-22,-25],[22,-25]],accent,1.7);path(c,[[0,-49],[0,1]],accent,1.4);box(c,-28,-1,56,5,wood,2);}
      if(index===1){littleTable(c,wood);envelope(c,-7,-27,22,IVORY,accent);path(c,[[17,-24],[21,-42]],color,2);leaf(c,22,-40,7,3,color,-.9);}
      if(index===2){ellipse(c,0,-27,20,20,accent+'66');ellipse(c,0,-27,14,14,accent);box(c,-29,-7,58,7,color,2);for(const x of [-23,-12,0,12,23])path(c,[[x,-7],[x,-20]],accent,1.6);path(c,[[-28,-20],[28,-20]],accent,2);}
      break;
    case 'pumpkin':
      if(index===0){arch(c,0,3,43,53,accent,'#543a604d');arch(c,0,3,31,43,wood,accent+'28');ellipse(c,10,-16,2,2,accent);curve(c,[-25,3,-34,-11,-18,-27,-28,-42],color,2);leaf(c,-28,-26,9,4,color,-.6);star(c,0,-44,4,IVORY);}
      if(index===1){box(c,-28,-39,56,42,'#634d70',5,accent+'bb',1);for(let y=-30;y<0;y+=12)path(c,[[-26,y],[26,y]],rose+'55',.7);ellipse(c,-10,-23,3,4,accent);ellipse(c,10,-23,3,4,accent);curve(c,[-12,-12,-5,-1,5,-1,12,-12],accent,2);star(c,-22,-35,2.5,color);}
      if(index===2){ellipse(c,0,-16,28,9,'#e3a16c');box(c,-22,-14,44,13,wood,3);for(const[x,y,co]of[[-15,-26,color],[3,-30,rose],[19,-23,accent]]){box(c,x-6,y-4,12,8,co,3,IVORY+'66',.7);path(c,[[x-7,y],[x-11,y-4],[x-11,y+4],[x-7,y]],co,1.6);path(c,[[x+7,y],[x+11,y-4],[x+11,y+4],[x+7,y]],co,1.6);}path(c,[[-8,-17],[-8,-39]],accent,1.6);ellipse(c,-8,-42,6,6,color);circle(c,-8,-42,3,IVORY,1);}
      break;
    case 'table':
      if(index===0){littleTable(c,wood);c.beginPath();c.moveTo(-18,-22);c.lineTo(18,-22);c.lineTo(13,-6);c.lineTo(-13,-6);c.closePath();c.fillStyle=color;c.fill();ellipse(c,0,-24,10,3,IVORY);}
      if(index===1){ellipse(c,0,-3,22,5,wood);box(c,-20,-25,40,21,color,8,IVORY+'99',1);ellipse(c,0,-25,20,5,accent);ellipse(c,0,-25,15,3,'#b9835d');path(c,[[-21,-18],[-27,-18],[-27,-11],[-21,-11]],accent,2);path(c,[[21,-18],[27,-18],[27,-11],[21,-11]],accent,2);curve(c,[-5,-31,-13,-39,5,-43,-1,-51],IVORY+'aa',1.3);curve(c,[7,-31,15,-40,3,-44,9,-51],IVORY+'77',1.1);}
      if(index===2){littleChair(c,0,-2,wood);heart(c,0,-22,5,accent);box(c,17,-10,5,12,IVORY,1);star(c,20,-13,3,accent);}
      break;
    case 'bell':
      if(index===0){path(c,[[0,2],[0,-40]],wood,3);box(c,-25,-43,49,13,color,3);path(c,[[-21,-44],[20,-44]],IVORY,3);star(c,13,-36,3,IVORY);ellipse(c,0,3,24,4,IVORY+'bb');}
      if(index===1){path(c,[[-27,2],[-27,-41],[27,-41],[27,2]],wood,3);path(c,[[-27,-14],[27,-14]],wood,3);for(const[x,y,co]of[[-13,-28,color],[13,-28,rose],[0,-1,accent]]){box(c,x-9,y-12,18,14,co,2);path(c,[[x,y-11],[x,y+1]],IVORY,2);path(c,[[x-8,y-5],[x+8,y-5]],IVORY,1.5);}}
      if(index===2){arch(c,0,2,45,51,wood,accent+'66');path(c,[[0,-48],[0,1]],IVORY,1.4);path(c,[[-22,-24],[22,-24]],IVORY,1.4);box(c,-29,0,58,5,IVORY,2);circle(c,0,-26,10,color,3);star(c,0,-37,3,rose);}
      break;
    case 'firework':
      if(index===0){box(c,-21,-11,42,15,wood,3);ellipse(c,0,-25,20,20,accent);ellipse(c,0,-25,15,15,INK);for(let i=0;i<8;i++){const a=i*TAU/8;path(c,[[Math.cos(a)*11,-25+Math.sin(a)*11],[Math.cos(a)*14,-25+Math.sin(a)*14]],IVORY,1);}path(c,[[0,-36],[0,-25],[8,-20]],color,1.5);}
      if(index===1){path(c,[[0,2],[0,-49]],wood,3);path(c,[[0,-16],[-22,-35]],wood,2);path(c,[[0,-29],[22,-46]],wood,2);for(const[x,y]of[[-22,-26],[0,-38],[22,-37]]){path(c,[[x,y-10],[x,y]],accent,1);box(c,x-5,y,10,13,color,2);star(c,x,y+5,2.5,accent);}}
      if(index===2){box(c,-26,-5,52,10,wood,3);for(const[x,y]of[[-16,-18],[0,-25],[16,-18]])box(c,x-4,y,8,-y-3,color,2);for(const[x,y,r]of[[-20,-41,8],[8,-48,10],[27,-32,6]]){star(c,x,y,r,accent);for(let i=0;i<4;i++){const a=i*TAU/4+.5;path(c,[[x+Math.cos(a)*r*1.25,y+Math.sin(a)*r*1.25],[x+Math.cos(a)*r*1.8,y+Math.sin(a)*r*1.8]],color,1);}}}
      break;
    case 'nian':
      if(index===0){path(c,[[-24,3],[-24,-46],[24,-46],[24,3]],accent,3);path(c,[[-25,-46],[-13,-37],[0,-44],[14,-37],[25,-46]],rose,6);for(const x of [-24,24])path(c,[[x,-36],[x,-14]],rose,5);star(c,0,-46,5,accent);}
      if(index===1){box(c,-22,-24,44,23,rose,5,accent,1);ellipse(c,0,-25,22,6,IVORY);ellipse(c,0,-23,18,3,accent+'55');path(c,[[-15,0],[-19,7]],wood,2.5);path(c,[[15,0],[19,7]],wood,2.5);path(c,[[-24,-31],[-5,-20]],wood,2.5);path(c,[[25,-32],[5,-20]],wood,2.5);}
      if(index===2){littleChair(c,-14,0,wood);littleChair(c,14,0,wood);box(c,-23,-9,46,5,rose,2);path(c,[[30,2],[30,-45]],wood,2);bell(c,30,-34,7,accent);}
      break;
    case 'rabbit':
      if(index===0){arch(c,0,1,40,49,accent);path(c,[[0,-47],[0,1]],accent,1);path(c,[[-19,-29],[19,-29]],accent,1);path(c,[[-20,-11],[20,-11]],accent,1);for(const x of [-10,10])leaf(c,x,-48,4,12,IVORY,x<0?-.2:.2);}
      if(index===1){curve(c,[-32,1,-16,-25,16,-25,32,1],IVORY,3);curve(c,[-32,-8,-16,-34,16,-34,32,-8],accent,1.3);for(const x of [-23,-11,0,11,23]){const y=-22+Math.abs(x)*.37;path(c,[[x,y],[x,y+9]],IVORY+'cc',1);star(c,x,y+12,2,color);}}
      if(index===2){littleTable(c,wood);ellipse(c,0,-27,24,7,color);c.beginPath();c.moveTo(-23,-27);c.quadraticCurveTo(0,-2,23,-27);c.fillStyle=color;c.fill();for(const[x,y]of[[-12,-29],[1,-32],[13,-27]]){ellipse(c,x,y,7,7,IVORY);ellipse(c,x-2,y,1,1,INK);ellipse(c,x+2,y,1,1,INK);}}
      break;
    case 'heart':
      if(index===0){arch(c,0,2,39,49,accent,color+'22');for(const sign of [-1,1]){box(c,sign<0?-31:20,-36,12,36,rose,2,accent,1);path(c,[[sign*26,-29],[sign*26,-11]],IVORY+'88',1);}heart(c,0,-23,8,rose);}
      if(index===1){path(c,[[-24,2],[-24,-34],[24,-34],[24,2]],wood,2.5);c.beginPath();c.moveTo(-32,-34);c.lineTo(0,-55);c.lineTo(32,-34);c.closePath();c.fillStyle=rose;c.fill();path(c,[[-32,-34],[32,-34]],accent,2);heart(c,0,-29,6,accent);littleChair(c,0,0,wood);}
      if(index===2){littleTable(c,wood);envelope(c,-9,-28,25,IVORY,rose);envelope(c,13,-26,20,color,rose);heart(c,3,-41,6,rose);}
      break;
    case 'boat':
      if(index===0){wave(c,3,color);path(c,[[0,0],[0,-47]],wood,4);c.beginPath();c.moveTo(2,-45);c.lineTo(26,-36);c.lineTo(2,-28);c.closePath();c.fillStyle=accent;c.fill();circle(c,0,-5,6,IVORY,1.5);}
      if(index===1){wave(c,4,color);box(c,-28,-8,56,7,wood,2);for(const x of [-22,22]){path(c,[[x,5],[x,-28]],wood,4);path(c,[[x-3,-18],[x+3,-18]],IVORY,2);}curve(c,[-22,-20,-8,-12,8,-12,22,-20],accent,1.4);}
      if(index===2){ellipse(c,0,-1,31,8,color+'66');wave(c,-6,color);wave(c,1,IVORY+'88');curve(c,[-29,-7,-35,-28,-15,-45,4,-42],accent,3);for(const[x,y]of[[-22,-31],[-7,-43]])leaf(c,x,y,10,4,color,-.55);path(c,[[18,-11],[18,-33]],wood,1.5);leaf(c,22,-29,9,3,color,-.65);}
      break;
    case 'bridge':
      if(index===0){box(c,-12,-28,24,31,color,4,accent,1);ellipse(c,0,2,24,5,color+'88');star(c,0,-17,7,IVORY);box(c,-21,-34,42,8,accent,3);}
      if(index===1){for(const[x,y,r]of[[-20,-20,10],[0,-27,14],[20,-20,10]])ellipse(c,x,y,r,r*.6,IVORY);path(c,[[-28,-10],[28,-10]],accent,2);for(const x of [-24,-8,8,24])path(c,[[x,-10],[x,3]],accent,1.5);}
      if(index===2){path(c,[[-25,2],[-25,-47],[25,-47],[25,2]],accent,2);curve(c,[-25,-45,-14,-30,14,-30,25,-45],color,1.4);for(const x of [-12,12]){path(c,[[x,-36],[x,-25]],accent,1);bell(c,x,-18,8,accent);}heart(c,0,-43,5,rose);}
      break;
    case 'mooncake':
      if(index===0){path(c,[[0,3],[0,-36]],wood,4);for(const[x,y,r]of[[-15,-33,15],[13,-37,16],[0,-50,15]])ellipse(c,x,y,r,r*.8,color);for(const[x,y]of[[-21,-35],[-9,-45],[6,-49],[20,-34],[0,-28]])star(c,x,y,3,accent);}
      if(index===1){littleTable(c,wood);box(c,-24,-31,48,15,IVORY,3,accent,.8);path(c,[[-17,-24],[-5,-29],[4,-22],[16,-27]],wood,1);for(const x of [-17,4,16])ellipse(c,x,x===4?-22:x===16?-27:-24,1.7,1.7,color);moon(c,18,-37,7,accent);}
      if(index===2){for(const[x,y]of[[-23,-8],[23,-8],[0,8]])littleChair(c,x,y,wood);littleTable(c,wood,true);ellipse(c,0,-23,13,4,IVORY);ellipse(c,0,-26,7,5,accent);star(c,0,-27,3,'#c78d5f');}
      break;
    default:
      star(c,0,-18,15,color);box(c,-24,0,48,5,accent,2);
  }
}

function deliveryFlags(view) {
  return [0,1,2].map(i => !!view.delivered?.[i] || !!view.destinations?.[i]?.complete || (view.completedSteps||[]).includes(i));
}
function drawGrownVignette(c,view,color,accent,t) {
  const flags=deliveryFlags(view),count=flags.filter(Boolean).length;
  if(!count)return;
  const origin=view.origin||view.anchor;
  if(!point(origin))return;
  c.save();c.translate(origin.x,origin.y-16);
  ellipse(c,0,-1,76,4,INK+'66');
  // Each independent delivered destination adds one recognizable object.
  for(let i=0;i<3;i++)if(flags[i]){
    c.save();c.translate((i-1)*51,0);c.scale(.62,.62);drawGrowthPiece(c,view.motif,i,color,accent);c.restore();
  }
  if(view.completed||count===3){
    // The complete borrowed scene keeps its original chapter/holiday motif.
    c.save();c.translate(0,-56);c.scale(.36,.36);drawCapMiniature(c,{motif:view.motif,color,accent},t);c.restore();
    path(c,[[-65,4],[-38,6],[0,7],[38,6],[65,4]],accent+'5e',.8);
  }
  c.restore();
}

function drawTraveler(c,traveler,motif,color,accent,t,reducedMotion) {
  if(!traveler||traveler.visible===false||!point(traveler))return;
  const angle=finite(traveler.angle),moving=traveler.state==='moving'||traveler.state==='returning';
  const bob=reducedMotion?0:Math.sin(t*3.4)*1.2,faceDir=Math.cos(angle)<-.2?-1:1;
  c.save();c.translate(traveler.x,traveler.y+bob);
  ellipse(c,0,19,14,3,color+'16');
  // A paper/brass outline keeps travelers distinct from the larger mint soul.
  c.save();c.rotate(reducedMotion?0:Math.sin(angle)*.09);c.scale(faceDir,1);
  switch(motif){
    case 'station':
      box(c,-17,-12,22,22,color,4,IVORY,1.1);box(c,2,-5,17,13,color,3,IVORY,1);
      box(c,-20,8,41,4,accent,2);box(c,11,-14,5,11,accent,1);box(c,-19,-15,26,4,accent,2);
      box(c,-13,-8,13,9,IVORY,2);face(c,-6,-5,.55);
      for(const x of [-11,5,15]){ellipse(c,x,13,4.8,4.8,INK);ellipse(c,x,13,2.3,2.3,accent);if(moving)path(c,[[x-1.8,13],[x+1.8,13]],IVORY,1);}
      for(let i=0;i<3;i++){const shift=reducedMotion?0:Math.sin(t*2+i)*1.2;ellipse(c,13+i*4+shift,-20-i*6,3.3-i*.6,2.3-i*.4,IVORY+(i===0?'99':i===1?'66':'33'));}
      star(c,13,1,3,accent);break;
    case 'sprout':
      ellipse(c,0,3,11,14,'#d7b892');ellipse(c,-3,-1,6,8,IVORY+'66');
      path(c,[[0,-9],[1,-23]],color,2);leaf(c,-7,-18,9,4,color,.45);leaf(c,10,-23,11,4,color,-.45);
      path(c,[[-6,15],[-10,20]],accent,2);path(c,[[5,15],[9,19]],accent,2);face(c,1,1,.9);break;
    case 'moon':
      moon(c,0,-1,20,IVORY);face(c,-6,2,.75);path(c,[[7,-15],[18,-22]],accent,1.2);star(c,19,-24,4,accent);
      path(c,[[-14,10],[-19,16]],color,1.4);path(c,[[-2,16],[2,21]],color,1.4);break;
    case 'whale':
      c.beginPath();c.moveTo(-19,0);c.bezierCurveTo(-20,-24,15,-24,17,-4);c.quadraticCurveTo(24,-12,30,-10);c.quadraticCurveTo(27,0,19,4);c.bezierCurveTo(9,20,-13,18,-19,0);c.fillStyle=color;c.fill();
      c.beginPath();c.moveTo(-17,4);c.quadraticCurveTo(0,14,16,4);c.quadraticCurveTo(1,20,-17,4);c.fillStyle=IVORY;c.fill();
      ellipse(c,-10,-3,2,2.5,INK);ellipse(c,-9,-4,0.7,1,IVORY);leaf(c,2,8,8,3,accent,-.5);
      path(c,[[-4,-18],[-4,-25]],color,1.2);curve(c,[-4,-23,-10,-28,-12,-25,-11,-24],color,1.2);break;
    case 'clock':
      circle(c,0,-19,4,accent,2);ellipse(c,0,0,16,18,accent);ellipse(c,0,0,12,14,IVORY);
      for(const[x,y]of[[0,-11],[-9,0],[9,0],[0,11]])ellipse(c,x,y,1,1,INK+'77');
      path(c,[[0,-8],[0,-2],[6,1]],INK+'99',1.2);face(c,0,3,.7);
      curve(c,[16,-5,25,-8,27,10,19,13],accent,1.3);break;
    case 'dawn':
      for(let i=0;i<8;i++){const a=i*TAU/8;path(c,[[Math.cos(a)*17,Math.sin(a)*17],[Math.cos(a)*22,Math.sin(a)*22]],accent,1.8);}
      ellipse(c,0,0,15,15,accent);ellipse(c,-4,-5,6,5,IVORY+'44');face(c,0,-1,1,true);break;
    case 'pumpkin':
      ellipse(c,-8,1,9,15,'#d38b54');ellipse(c,8,1,9,15,'#d38b54');ellipse(c,0,1,11,16,'#efb671');
      curve(c,[0,-13,-5,-22,4,-25,8,-21],color,3);leaf(c,10,-17,7,3,color,-.35);
      c.strokeStyle=accent;c.lineWidth=1.3;c.beginPath();c.arc(0,-7,19,Math.PI,TAU);c.stroke();
      face(c,0,-1,.9,true);star(c,0,9,3,IVORY);break;
    case 'table':
      path(c,[[0,17],[0,-9]],accent,6);path(c,[[-1,16],[-1,-4]],IVORY+'77',1);
      ellipse(c,0,-12,11,14,accent);ellipse(c,0,-12,8,10,'#b3805f');ellipse(c,0,-13,7,8,IVORY+'bb');face(c,0,-12,.7);
      curve(c,[-5,-28,-12,-35,2,-37,-3,-43],IVORY+'88',1);break;
    case 'bell':
      circle(c,0,-18,4,accent,1.5);bell(c,0,-1,17,accent);face(c,0,-4,.85);
      path(c,[[-13,-14],[-6,-19],[0,-16],[7,-20],[13,-14]],IVORY,3);star(c,-20,-10,3,color);break;
    case 'firework':
      c.beginPath();c.moveTo(-5,10);c.quadraticCurveTo(-22,20,-29,10);c.quadraticCurveTo(-19,8,-19,-2);c.quadraticCurveTo(-8,7,1,0);c.fillStyle=color+'99';c.fill();
      star(c,2,-3,19,accent);star(c,2,-3,12,'#ffe9ba');face(c,2,-3,.72,true);break;
    case 'nian':
      leaf(c,-15,-13,9,4,accent,-.6);leaf(c,15,-13,9,4,accent,.6);ellipse(c,0,0,18,16,'#d59384');
      ellipse(c,-8,-3,7,8,IVORY);ellipse(c,8,-3,7,8,IVORY);ellipse(c,-7,-2,2.4,3,INK);ellipse(c,7,-2,2.4,3,INK);
      ellipse(c,0,8,11,7,accent);ellipse(c,-4,6,1.2,1.2,INK);ellipse(c,4,6,1.2,1.2,INK);star(c,0,-14,4,accent);
      path(c,[[-9,14],[-12,20]],color,3);path(c,[[9,14],[12,20]],color,3);break;
    case 'rabbit':
      leaf(c,-7,-21,4,12,IVORY,-.18);leaf(c,7,-21,4,12,IVORY,.18);leaf(c,-7,-21,1.5,8,'#e2b1b6',-.18);leaf(c,7,-21,1.5,8,'#e2b1b6',.18);
      ellipse(c,0,1,17,18,IVORY);ellipse(c,0,5,13,11,accent+'44');face(c,0,-1,.95);path(c,[[0,19],[0,25]],accent,1.5);path(c,[[-3,24],[3,24]],accent,1.5);break;
    case 'heart':
      box(c,-7,-18,14,14,woodColor(accent),4,IVORY+'88',.8);box(c,-14,-6,28,8,accent,3);box(c,-17,2,34,14,IVORY,4,accent,1);
      heart(c,0,6,9,'#d999ad');path(c,[[0,-2],[0,15]],IVORY,1.3);face(c,-1,-10,.55);break;
    case 'boat':
      c.beginPath();c.moveTo(-23,2);c.quadraticCurveTo(0,11,23,2);c.quadraticCurveTo(13,22,-14,14);c.closePath();c.fillStyle=color;c.fill();path(c,[[-18,5],[18,5]],accent,1.5);
      path(c,[[0,4],[0,-24]],accent,1.3);c.beginPath();c.moveTo(2,-22);c.quadraticCurveTo(22,-18,17,-5);c.lineTo(2,-5);c.closePath();c.fillStyle=color;c.fill();path(c,[[4,-19],[13,-8]],IVORY+'88',1);face(c,0,8,.65);
      path(c,[[-12,6],[-23,17]],woodColor(accent),2);break;
    case 'bridge':
      c.beginPath();c.moveTo(-10,5);c.quadraticCurveTo(-25,13,-28,5);c.lineTo(-12,-4);c.closePath();c.fillStyle='#566c7e';c.fill();
      ellipse(c,0,1,14,11,'#5e7081');ellipse(c,4,3,10,8,IVORY);ellipse(c,10,-7,10,10,'#5e7081');
      ellipse(c,12,-9,2,2.5,IVORY);ellipse(c,12.5,-8.5,.9,1.3,INK);path(c,[[18,-7],[25,-4],[18,-2]],accent,2);
      leaf(c,-5,-1,11,4,color,-.45);path(c,[[1,10],[-1,17]],accent,1.5);path(c,[[8,9],[10,16]],accent,1.5);star(c,-9,-14,3,accent);break;
    case 'mooncake':
      for(let i=0;i<10;i++){const a=i*TAU/10;ellipse(c,Math.cos(a)*13,Math.sin(a)*12,5,5,'#c58c5c');}
      ellipse(c,0,0,15,14,accent);ellipse(c,0,0,11,10,'#dda975');circle(c,0,0,10,IVORY+'66',.8);face(c,0,-1,.82);
      star(c,0,-10,3,IVORY);path(c,[[-8,12],[-11,18]],color,2);path(c,[[8,12],[11,18]],color,2);break;
    default:
      star(c,0,0,17,color);face(c,0,-1,.8);
  }
  c.restore();
  if(traveler.carrying&&Number.isInteger(traveler.targetIndex)){
    box(c,12,8,12,13,IVORY,3,accent,1);c.fillStyle=INK;c.font=`700 8px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(traveler.targetIndex+1),18,15);
  }
  c.restore();
}

// A warm shade for wooden props without inventing colors in the state layer.
function woodColor(){return '#bd9370';}

function drawAnchor(c,view,color,accent,t,reducedMotion) {
  const a=view.anchor||view.origin;if(!point(a))return;
  const r=clamp(finite(a.r,24),18,40),on=!!a.inRange,active=view.phase==='active'||view.active;
  c.save();c.translate(a.x,a.y);
  if(on||active){const g=c.createRadialGradient(0,-4,2,0,-4,55);g.addColorStop(0,color+'22');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(-56,-60,112,72);}
  ellipse(c,0,-1,r+5,7,INK+'77');
  c.strokeStyle=on||active?IVORY:accent+'a8';c.lineWidth=on||active?1.7:1.2;c.beginPath();c.ellipse(0,-1,r,6,0,0,TAU);c.stroke();
  c.strokeStyle=color+'88';c.lineWidth=.8;c.beginPath();c.ellipse(0,-1,r+5,9,0,0,TAU);c.stroke();
  for(const s of [-1,1]){path(c,[[s*(r+8),-4],[s*(r+12),-1],[s*(r+8),2]],accent,1.2);}
  if(active){
    // Three stable supply marks are finite decoration, not a particle system.
    for(let i=0;i<3;i++){const y=-12-i*14+(reducedMotion?0:Math.sin(t*1.8+i)*1.6);ellipse(c,-r*.68,y,1.4,1.4,color+'77');ellipse(c,r*.68,y-4,1.1,1.1,color+'55');}
  } else if(!view.completed) {
    const label=view.phase==='suspended'?'E · 继续借景':'E · 借景';
    c.font=`10px ${FONT}`;c.textAlign='center';c.textBaseline='middle';
    box(c,-42,16,84,19,INK+'d9',6,accent+'66',.7);c.fillStyle=on?IVORY:accent;c.fillText(label,0,25);
  } else {
    path(c,[[-5,15],[-1,19],[6,12]],color,1.5);
  }
  c.restore();
}

function drawHint(c,view,color,accent) {
  const destinations=view.destinations||view.targets||[],origin=view.origin||view.anchor;
  if(!point(origin))return;
  const top=destinations.filter(point).reduce((y,d)=>Math.min(y,d.y),origin.y-200);
  const nearby=(view.switches||view.bells||[]).find(b=>b.nearby);
  let text=String(view.hint||'');
  if(!text)text=nearby?'Q / 空格 · 转动导向铃':view.targetLabel||'把小旅客送到编号底座';
  text=Array.from(text).slice(0,27).join('');
  const width=Math.min(282,Math.max(122,Array.from(text).length*10.2+22)),y=top-57;
  box(c,origin.x-width/2,y-10,width,22,INK+'e6',7,color+'77',.7);
  star(c,origin.x-width/2+10,y+1,2.5,accent);
  c.fillStyle=IVORY;c.font=`10px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,origin.x+3,y+1);
}

/**
 * Draw a borrowed brain scene using controller-supplied world coordinates.
 * Reduced motion freezes decorative bob/sway but preserves the traveler's
 * supplied position so task movement always remains legible.
 */
export function drawCapActivity(c,view,t=0,reducedMotion=false) {
  if(!c||!view||!point(view.anchor||view.origin))return;
  t=reducedMotion?0:clamp(finite(t),-1e6,1e6);
  const color=hex(view.color,'#b8e3cd'),accent=hex(view.accent,GOLD);
  const active=view.phase==='active'||(view.phase==null&&!!view.active);
  c.save();c.lineCap='round';c.lineJoin='round';
  drawGrownVignette(c,view,color,accent,t);
  drawAnchor(c,view,color,accent,t,reducedMotion);
  if(active){
    drawRoutes(c,view,color,accent);
    for(const destination of view.destinations||view.targets||[])drawReceiver(c,destination,view.targetIndex??view.traveler?.targetIndex,color,accent);
    for(const sw of view.switches||view.bells||[])drawSwitch(c,sw,view,color,accent);
    const source=(view.nodes||[]).find(n=>n.kind==='source');
    if(point(source)){
      // A miniature held above the opening connects the new play surface to
      // the same scene already seen inside Ashi's skull and in the collection.
      c.save();c.translate(source.x,source.y-20);c.scale(.24,.24);c.globalAlpha*=.84;drawCapMiniature(c,{motif:view.motif,color,accent},t);c.restore();
    }
    drawTraveler(c,view.traveler,view.motif,color,accent,t,reducedMotion);
    drawHint(c,view,color,accent);
  }
  c.restore();
}
