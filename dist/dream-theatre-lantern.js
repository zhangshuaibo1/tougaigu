// Two real chapter-three poem lamps. Pure drawing: the engine owns physics,
// puzzle activation distance, light state, sound and chapter completion.
import { DREAM_PHYSICS } from './dream-engine-base.js';
const TAU=Math.PI*2;
const finite=Number.isFinite;
const FONT='"PingFang SC","Microsoft YaHei",sans-serif';
function path(c,draw,fill,stroke,width=1){
  c.beginPath();draw(c);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function line(c,x1,y1,x2,y2,color,width=1){
  path(c,q=>{q.moveTo(x1,y1);q.lineTo(x2,y2);},null,color,width);
}
function ellipse(c,x,y,rx,ry,color,stroke=null,width=1){
  path(c,q=>q.ellipse(x,y,rx,ry,0,0,TAU),color,stroke,width);
}
function gradient(c,x1,y1,x2,y2,colors){
  const g=c.createLinearGradient(x1,y1,x2,y2);
  for(const [p,color]of colors)g.addColorStop(p,color);
  return g;
}
function rounded(c,x,y,w,h,r,fill,stroke=null,width=1){
  path(c,q=>q.roundRect(x,y,w,h,r),fill,stroke,width);
}
function halo(c,r,color1,color2){
  const g=c.createRadialGradient(0,0,2,0,0,r);
  g.addColorStop(0,color1);g.addColorStop(1,color2);
  ellipse(c,0,0,r,r,g);
}
export function getTheatreLampVisual(lamp,index,{form='body',soul=null,reducedMotion=false}={}){
  if(!lamp||![lamp.x,lamp.y].every(finite)||![0,1].includes(index))return null;
  const lit=lamp.lit===true;
  const near=!lit&&form==='soul'&&soul&&finite(soul.x)&&finite(soul.y)
    &&Math.hypot(soul.x-lamp.x,soul.y-lamp.y)<=DREAM_PHYSICS.pulseRadius;
  return Object.freeze({lit,near:!!near,label:lit?'已点亮':near?'与诗灯共鸣':'诗灯 · '+(index+1),
    glow:lit?'warm':near?'violet':'low',settled:!!reducedMotion});
}
export function drawTheatreLantern(c,game,lamp,index,t=0){
  const state=getTheatreLampVisual(lamp,index,{form:game?.form,soul:game?.soul,reducedMotion:game?.options?.reducedMotion});
  if(!state||!c||typeof c.save!=='function'||!finite(t))return false;
  const y=lamp.y+(state.settled?0:Math.sin(t*1.12+index*.78)*3);
  const warm=state.lit,near=state.near;
  c.save();
  try{
    c.translate(lamp.x,y);
    halo(c,warm?106:near?87:63,
      warm?'#ffcf8860':near?'#c9b5ff3c':'#9aa9cb1a',
      warm?'#ffcf8800':near?'#c9b5ff00':'#9aa9cb00');
    line(c,0,-114,0,-37,'#24273b',4);
    line(c,-.8,-113,-.8,-39,'#c6ac8888',1.4);
    ellipse(c,0,-41,8,5,'#796250','#d7b28a',1.25);
    c.save();
    c.rotate(state.settled?0:Math.sin(t*.7+index*.4)*.024);
    // Strong silhouette: crown, glass body, copper cage and a distinct wick.
    path(c,q=>{
      q.moveTo(-23,-26);q.bezierCurveTo(-30,-14,-30,16,-20,29);
      q.quadraticCurveTo(0,38,20,29);q.bezierCurveTo(30,16,30,-14,23,-26);
      q.closePath();
    },gradient(c,-27,0,27,0,warm?
      [[0,'#97705b'],[.2,'#d7b084'],[.47,'#fff0c1'],[.78,'#e7bf8d'],[1,'#927058']]:
      [[0,'#28354c'],[.22,'#50617b'],[.48,'#8a93a2'],[.77,'#4a566f'],[1,'#27334a']]),
      '#f1d6ae',1.4);
    path(c,q=>{
      q.moveTo(-17,-19);q.bezierCurveTo(-23,-4,-23,15,-14,23);
      q.quadraticCurveTo(0,27,14,23);q.bezierCurveTo(23,15,23,-4,17,-19);q.closePath();
    },gradient(c,-23,0,23,0,warm?
      [[0,'#8d564fbe'],[.23,'#ffc97791'],[.55,'#fff3cba4'],[1,'#93676b8f']]:
      [[0,'#2a3548db'],[.27,'#98c2ce60'],[.55,'#c6dbe58b'],[1,'#29334bdc']]),
      warm?'#ffe0ac':'#a4c5cf',1.1);
    // Refracted pane edges keep glass thickness at real gameplay scale.
    path(c,q=>{q.moveTo(-17,-15);q.bezierCurveTo(-23,0,-17,15,-13,18);},null,'#f3f4e9ac',2.1);
    path(c,q=>{q.moveTo(17,-15);q.bezierCurveTo(23,-2,19,11,14,19);},null,'#ffffff50',1.35);
    line(c,-19,0,19,0,warm?'#ecd1a569':'#b9c8d04f',1);
    for(const sx of [-22,22]){
      line(c,sx,-18,sx,23,warm?'#a87452':'#5a6075',1.7);
      ellipse(c,sx,-17,2,2,'#e5c399');
      ellipse(c,sx,20,2,2,'#c8a37b');
    }
    // A flame in protected tulip glass, not another interactable.
    if(warm){
      halo(c,22,'#fffbcc88','#ffefb500');
      path(c,q=>{
        q.moveTo(0,-11);q.bezierCurveTo(9,-3,8,9,0,13);
        q.bezierCurveTo(-8,10,-8,1,0,-11);q.closePath();
      },gradient(c,0,-12,0,15,[[0,'#fffbd6'],[.53,'#ffda8d'],[1,'#ef9254']]));
      ellipse(c,0,7,2.9,5,'#fffde4');
    }else{
      ellipse(c,0,5,3.4,9,near?'#e9ddf4':'#8b98aa');
      ellipse(c,0,-5,3.2,3.2,near?'#e7d2f8':'#8799b3');
    }
    rounded(c,-27,-32,54,9,4,gradient(c,0,-33,0,-22,[[0,'#f5d9ac'],[.5,'#ba926b'],[1,'#74564d']]),'#4c3945',.85);
    rounded(c,-27,27,54,10,4,gradient(c,0,26,0,38,[[0,'#b08464'],[.33,'#e8be88'],[1,'#765b4e']]),'#4c3945',.85);
    for(let sx=-18;sx<=18;sx+=9){
      ellipse(c,sx,-28,1.15,1.15,'#72564a');
      ellipse(c,sx,32,1.15,1.15,'#614b49');
    }
    line(c,0,37,0,48,'#d5ae81',2);
    ellipse(c,0,51,4,5,warm?'#ffe0a3':'#b6b5bd','#735e59',1);
    c.restore();
    // Opaque backing prevents a painted auditorium swallowing instructions.
    rounded(c,-46,66,92,22,9,'#1b2136e8',warm?'#eac18790':near?'#dbc3edb0':'#9b91a17a',.8);
    c.textAlign='center';c.textBaseline='middle';
    c.fillStyle=warm?'#ffe5b6':near?'#ead9ff':'#d2c5c5';
    c.font='600 11px '+FONT;c.fillText(state.label,0,77);
    if(near){
      path(c,q=>q.ellipse(0,0,40,47,0,0,TAU),null,'#e5d2ffb9',1.6);
      for(const side of [-1,1]){
        line(c,side*43,-8,side*49,0,'#f0dbff',1.3);
        line(c,side*49,0,side*43,8,'#f0dbff',1.3);
      }
      rounded(c,28,-76,23,19,6,'#faf0dd','#ad9275',.8);
      c.fillStyle='#423b50';c.font='700 12px '+FONT;c.fillText('Q',39.5,-66);
    }
    return true;
  }finally{c.restore();}
}
