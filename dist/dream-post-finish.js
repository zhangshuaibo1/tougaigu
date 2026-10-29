// Physical support outlines remain aligned to the existing collision geometry.
import {drawCoastPendulum} from './dream-coast-finish.js';
const finite=Number.isFinite,PI=Math.PI;
export const drawPostPendulum=drawCoastPendulum;
export function drawPostPlatform(c,p,{camera=0,viewWidth=Infinity}={}){
 if(!c||typeof c.save!=='function'||!p||![p.x,p.y,p.w,p.h,camera].every(finite)||p.w<=0||p.h<=0||
  (!finite(viewWidth)&&viewWidth!==Infinity)||viewWidth<=0||!['ground','book','root','stone','shelf'].includes(p.kind||'ground'))return false;
 if(p.x+p.w<camera-80||p.x>camera+viewWidth+80)return true;
 let saved=false;
 try{
  c.save();saved=true;c.beginPath();c.rect(p.x,p.y,p.w,p.h);c.clip();
  const book=p.kind==='book',root=p.kind==='root';
  const g=c.createLinearGradient(0,p.y,0,p.y+Math.min(120,p.h));
  for(const [z,color]of book?[[0,'#f3e8d4'],[.27,'#c7af9d'],[.72,'#807886'],[1,'#5b5474']]:
    root?[[0,'#ac9f8e'],[.3,'#6c6e70'],[1,'#384452']]:
    [[0,'#c5ae9a'],[.1,'#967c78'],[.42,'#595b6d'],[1,'#3a3d51']])g.addColorStop(z,color);
  c.fillStyle=g;c.fillRect(p.x,p.y,p.w,p.h);
  if(book){
   c.fillStyle='#fdf1db';c.fillRect(p.x+6,p.y+2,p.w-12,Math.min(8,p.h-2));
   for(let i=0;i<4;i++){c.fillStyle=i%2?'#bba39f':'#ead6ba';c.fillRect(p.x+8,p.y+5+i*2,p.w-16,.8);}
   c.fillStyle='#5b4764';c.fillRect(p.x+3,p.y+6,5,Math.max(1,p.h-7));
   for(const x of [p.x+3,p.x+p.w-8])for(const y of [p.y+2,p.y+p.h-5]){c.fillStyle='#c9a978';c.fillRect(x,y,5,3);}
  }else{
   const step=root?36:78,left=Math.max(p.x,camera-80),right=Math.min(p.x+p.w,camera+viewWidth+80);
   for(let x=p.x+Math.floor((left-p.x)/step)*step,count=0;x<right&&count<100;x+=step,count++){
    c.fillStyle=count%2?'#ffdfbb15':'#1725381b';c.fillRect(x+1,p.y+5,Math.max(0,Math.min(step-2,p.x+p.w-x-1)),Math.max(0,Math.min(p.h-5,root?25:23)));
    c.beginPath();c.moveTo(x+2,p.y+6);c.lineTo(x+step*.55,p.y+6);c.strokeStyle='#f2d6ba4a';c.lineWidth=.75;c.stroke();
   }
   if(p.h<=25){c.fillStyle='#8c6866';c.fillRect(p.x,p.y+p.h-4,p.w,4);}
  }
  c.fillStyle=book?'#fff4dd':root?'#d2b9a5':'#e2cbb4';c.fillRect(p.x,p.y,p.w,Math.min(1,p.h));
  return true;
 }catch{return false;}finally{if(saved)try{c.restore();}catch{}}
}
export function drawPostMushroom(c,p,t,reduced=false){
 if(!c||!p||![p.x,p.y,p.w].every(finite)||p.w<25)return false;
 const y=p.y,x=p.x+p.w/2,b=Math.max(0,Math.min(1,finite(p.boing)?p.boing:0));let saved=false;
 try{
  c.save();saved=true;c.translate(x,y);
  c.fillStyle='#5a5968';c.fillRect(-7,-22+b*8,14,21-b*8);
  c.fillStyle='#efe2c7';c.beginPath();c.ellipse(0,-20+b*8,p.w*.42,17-b*4,0,PI,2*PI);c.fill();
  c.fillStyle='#c78f9a';c.beginPath();c.ellipse(0,-19+b*8,p.w*.46,18-b*4,0,PI,2*PI);c.fill();
  for(const [a,z]of [[-.53,-30],[.12,-32],[.57,-24]]){c.fillStyle='#f7ead6';c.beginPath();c.ellipse(a*p.w*.45,z+b*8,4.5,2.6,-.2,0,2*PI);c.fill();}
  return true;
 }catch{return false;}finally{if(saved)try{c.restore();}catch{}}
}
export function drawPostExit(c,exit,open,lit=[false,false]){
 if(!c||!exit||![exit.x,exit.y].every(finite))return false;
 const x=exit.x,y=exit.y;let saved=false;
 try{
  c.save();saved=true;
  const g=c.createLinearGradient(x-68,y-177,x+65,y);
  g.addColorStop(0,'#e0c8ac');g.addColorStop(.48,'#80696b');g.addColorStop(1,'#4b5663');
  c.fillStyle=g;c.fillRect(x-69,y-169,138,168);
  c.fillStyle='#4a3e53';c.fillRect(x-60,y-150,120,151);
  c.fillStyle=open?'#ffdab98c':'#1d2e40';c.beginPath();c.moveTo(x-43,y);c.lineTo(x-43,y-111);c.quadraticCurveTo(x,y-175,x+43,y-111);c.lineTo(x+43,y);c.fill();
  c.strokeStyle='#d2b38e';c.lineWidth=6;c.stroke();
  for(let i=0;i<2;i++){c.fillStyle=lit[i]?'#ffe0ad':'#534c60';c.fillRect(x-34+i*44,y-151,24,19);c.strokeStyle='#d1b18a';c.lineWidth=2;c.strokeRect(x-34+i*44,y-151,24,19);}
  c.fillStyle='#e8cda6';c.fillRect(x-35,y-79,70,12);c.fillStyle='#5e455a';c.fillRect(x-31,y-76,62,6);
  c.font='bold 15px "PingFang SC","Microsoft YaHei",sans-serif';c.fillStyle='#f4e3c5';c.textAlign='center';c.fillText('黎明邮局',x,y-190);
  c.font='12px "PingFang SC","Microsoft YaHei",sans-serif';c.fillStyle=open?'#fce5c0':'#c2b0a3';c.fillText(open?'把信和自己一起送到':'点亮两盏诗灯',x,y-208);
  if(open){const glow=c.createRadialGradient(x,y-85,4,x,y-85,145);glow.addColorStop(0,'#ffdab869');glow.addColorStop(1,'#ffdab800');c.fillStyle=glow;c.fillRect(x-150,y-230,300,270);}
  return true;
 }catch{return false;}finally{if(saved)try{c.restore();}catch{}}
}
