// One seed, first sheltered by an old boot, then held by Shiguang. All motion
// and collection state belongs to DreamGame; this painter has no clock.
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
// Includes the boot, loose lace and seed. Held-only bounds are smaller.
export const GREENHOUSE_SEED_BOUNDS=Object.freeze({left:-29,right:30,top:-29,bottom:23});

function path(c,draw,fill,stroke=null,width=1){
  c.beginPath();draw(c);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function oval(c,x,y,rx,ry,color,stroke=null,width=1){
  path(c,p=>p.ellipse(x,y,rx,ry,0,0,TAU),color,stroke,width);
}
function line(c,points,color,width=1){path(c,p=>points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y)),null,color,width);}

function boot(c){
  // The worn heel, patched toe and slack laces distinguish this from a pot.
  path(c,p=>{p.moveTo(-23,9);p.lineTo(-22,-13);p.quadraticCurveTo(-15,-18,-4,-12);p.lineTo(-3,3);p.quadraticCurveTo(2,8,17,8);p.quadraticCurveTo(28,9,28,17);p.lineTo(24,20);p.lineTo(-22,20);p.closePath();},'#897a69','#536f65',1.15);
  path(c,p=>{p.moveTo(-20,-12);p.lineTo(-18,8);p.quadraticCurveTo(-10,11,-4,6);p.lineTo(-5,-12);},'#9a8d75');
  path(c,p=>{p.moveTo(-24,17);p.quadraticCurveTo(-3,21,27,16);p.lineTo(27,20);p.quadraticCurveTo(1,24,-24,21);p.closePath();},'#4f635d','#b7b18d',.8);
  for(const x of [-18,-10,-2,6,14,22])line(c,[[x,20],[x,22]],'#829181',.7);
  oval(c,-13,-12,10.5,4,'#42564c','#c3b58c',1.2);
  oval(c,-13,-11.8,8,2.2,'#6a5746');
  path(c,p=>{p.moveTo(7,10);p.lineTo(17,8);p.lineTo(22,14);p.lineTo(12,17);p.closePath();},'#ad9978','#d5c29b',.8);
  for(const [x,y] of [[8,11],[11,10],[17,10],[20,13],[15,16],[12,15]])line(c,[[x-1,y],[x+1,y+1]],'#6c7868',.65);
  for(const y of [-5,0,5]){
    oval(c,-9,y,1.2,1.2,'#c5b68e');oval(c,-2,y+2,1.2,1.2,'#c5b68e');
    line(c,[[-9,y],[-2,y+2]],'#ddd1aa',1);
  }
  path(c,p=>{p.moveTo(-4,7);p.bezierCurveTo(0,6,6,14,2,16);p.bezierCurveTo(-2,17,-3,10,1,10);p.quadraticCurveTo(6,10,7,18);},null,'#ded3b0',1);
  line(c,[[-19,1],[-19,10],[-14,12]],'#c2b591',.7);
}

function seed(c,x,y,size=1){
  c.save();c.translate(x,y);c.scale(size,size);
  // A warm almond-shaped kernel; a seam and star-like hilum stay readable at
  // the small carried size without inventing a leaf before it is planted.
  path(c,p=>{p.moveTo(0,-12);p.bezierCurveTo(-4,-8,-10,-2,-9,5);p.bezierCurveTo(-8,14,8,15,9,5);p.bezierCurveTo(10,-2,4,-8,0,-12);p.closePath();},'#d9af69','#8b7958',1);
  path(c,p=>{p.moveTo(0,-10);p.bezierCurveTo(-5,-5,-7,6,-1,10);p.bezierCurveTo(3,12,6,9,7,6);p.bezierCurveTo(5,3,1,-4,0,-10);},'#f0cf8a');
  path(c,p=>{p.moveTo(0,-10);p.quadraticCurveTo(-3,1,0,10);},null,'#a18551',.85);
  line(c,[[3,-2],[3,3]],'#fff1bf',.95);line(c,[[1,1],[5,1]],'#fff1bf',.9);
  oval(c,-3,6,1.5,2.3,'#ebc481');
  c.restore();
}

export function drawGreenhouseSeed(c,options={},t=0,reducedMotion=false){
  if(!c||!options||typeof options!=='object')return;
  const x=finite(options.x),y=finite(options.y),scale=clamp(finite(options.scale,1),0,20);
  if(!scale)return;
  c.save();c.translate(x,y);c.scale(scale,scale);c.lineCap='round';c.lineJoin='round';
  if(options.boot===true){
    boot(c);
    // Rest in the boot's mouth. It is the same seed with the same seam.
    seed(c,-13,-19,.63);
    path(c,p=>{p.moveTo(-24,-12);p.quadraticCurveTo(-13,-5,-2,-12);},null,'#c4b68d',1.5);
  }else{
    if(options.held===true)for(const side of [-1,1]){
      path(c,p=>{p.moveTo(side*10,-7);p.quadraticCurveTo(side*19,-2,side*12,8);},null,'#b6e6d0',3.6);
    }
    seed(c,0,-1,.85);
    if(options.held===true)for(const side of [-1,1]){
      oval(c,side*10,6,3.8,2.7,'#e8ffea','#aad5bd',.6);
      line(c,[[side*9,4.6],[side*8,6.7]],'#a4d3bd',.65);
    }
  }
  c.restore();
}
