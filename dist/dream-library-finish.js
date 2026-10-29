// Physical supports remain the engine's original rectangles: no raised rim,
// rotated landing surface, extra collision or independent animation clock.
const finite=Number.isFinite;
const valid=p=>p&&['ground','book','shelf'].includes(p.kind||'shelf')&&
  [p.x,p.y,p.w,p.h].every(finite)&&p.w>0&&p.h>0&&p.x+p.w<Number.MAX_VALUE;
const grad=(c,x0,y0,x1,y1,stops)=>{const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach(([at,color])=>g.addColorStop(at,color));return g;};
function cover(c,p,moving,left,right) {
  const y=p.y,w=p.w,h=p.h;
  c.fillStyle=grad(c,0,y,0,y+h,[[0,moving?'#9584a9':'#946d67'],[.22,moving?'#564d79':'#674e54'],[.85,moving?'#293c5a':'#302e43'],[1,'#1e2a3e']]);
  c.fillRect(p.x,y,w,h);
  if(moving) {
    // Woven spine, layered cream paper: all detail BELOW collision top.
    c.fillStyle=grad(c,0,y+5,0,y+h,[[0,'#f7e5c0'],[.55,'#d9c8b1'],[1,'#857d89']]);
    c.fillRect(p.x+5,y+5,w-10,Math.max(0,h-8));
    for(let row=0;row<3;row++){
      c.fillStyle=row===0?'#fff8dfba':'#776b8478';
      c.fillRect(p.x+8,y+7+row*3,w-16,.8);
    }
    c.fillStyle='#353851';c.fillRect(p.x+4,y+5,5,Math.max(0,h-5));
    c.fillStyle='#ccae78';
    for(const x of [p.x+4,p.x+w-9]){
      c.fillRect(x,y+3,5,3);
      c.fillRect(x,y+h-5,5,3);
    }
  }else{
    const start=Math.floor((left-p.x)/77)*77+p.x;
    for(let x=start,i=0;x<right&&i<90;x+=77,i++){
      c.fillStyle=i%2?'#d4b6a51a':'#3e38491e';c.fillRect(x+2,y+4,Math.min(70,right-x),Math.min(h-4,18));
      c.fillStyle='#e4ba9150';c.fillRect(x+6,y+Math.min(h-2,11),Math.min(51,right-x-8),.8);
    }
    if(h>13){c.fillStyle='#b79c7e';for(const x of [p.x+6,p.x+w-10])c.fillRect(x,y+6,4,Math.min(7,h-6));}
  }
  // A 1px truthful landing line, strictly y = physical surface.
  c.fillStyle=moving?'#f5e2be':'#d6bb9e';c.fillRect(p.x,y,p.w,Math.min(1,h));
}
export function drawLibraryPlatform(c,p,{camera=0,viewWidth=Infinity}={}) {
  if(!c||typeof c.save!=='function'||typeof c.restore!=='function'||typeof c.rect!=='function'||
     !valid(p)||!finite(camera)||(!finite(viewWidth)&&viewWidth!==Infinity)||viewWidth<=0)return false;
  if(p.x+p.w<camera-80||p.x>camera+viewWidth+80)return true;
  let saved=false,success=false;
  try{
    c.save();saved=true;c.beginPath();c.rect(p.x,p.y,p.w,p.h);c.clip();
    cover(c,p,p.kind==='book',Math.max(p.x,camera-80),Math.min(p.x+p.w,camera+viewWidth+80));success=true;
  }catch{success=false;}finally{if(saved)try{c.restore();}catch{success=false;}}
  return success;
}
