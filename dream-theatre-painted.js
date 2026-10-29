// v20 Borrowed Moon Theatre. The image is original locally hosted SVG art.
// No gameplay state, timers, remote fetches or new animation loop live here.
export const THEATRE_PAINT_URL = new URL('./assets/theatre-painted-v20.svg', import.meta.url).href;
export const THEATRE_PAINT_PARALLAX = 0.7;
const finite = Number.isFinite;
const positive = n => finite(n) && n > 0;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const eligible = context => context?.mode === 'story' && context?.chapterIndex === 2;

export function getTheatrePaintedLayout(view){
  const v=view?.viewport;
  if(!positive(v?.width)||!positive(view?.worldWidth)||!finite(view?.cameraX)||
    !finite(v.top)||!finite(v.bottom)||v.bottom<=v.top)return null;
  const travel=Math.max(0,view.worldWidth-v.width);
  const camera=clamp(view.cameraX,0,travel);
  // Reserve the parallax travel at both ends; no exposed side strips.
  const width=Math.max(2400,v.width+THEATRE_PAINT_PARALLAX*travel+30);
  const height=width*750/2400;
  const layout={x:-THEATRE_PAINT_PARALLAX*camera,y:-52,width,height,cameraX:camera,parallax:THEATRE_PAINT_PARALLAX};
  return Object.values(layout).every(finite)?Object.freeze(layout):null;
}
const ready = image => {
  if(!image||typeof image!=='object')return false;
  try {
    if(image.complete===false)return false;
    const native='naturalWidth'in image||'naturalHeight'in image;
    return positive(native?image.naturalWidth:image.width)&&positive(native?image.naturalHeight:image.height);
  }catch{return false;}
};

export function drawPaintedTheatre(c,view,image){
  const l=getTheatrePaintedLayout(view);
  if(!l||!ready(image)||typeof c?.drawImage!=='function'||typeof c?.save!=='function')return false;
  let saved=false;
  try{
    c.save();saved=true;
    c.beginPath();c.rect(0,view.viewport.top,view.viewport.width,view.viewport.bottom-view.viewport.top);c.clip();
    c.globalAlpha=1;c.globalCompositeOperation='source-over';c.imageSmoothingEnabled=true;
    c.imageSmoothingQuality='high';
    c.drawImage(image,l.x,l.y,l.width,l.height);
    return true;
  }catch{return false;}
  finally{if(saved)c.restore();}
}

// Both light pools are solely driven by this run's two real poem lamps.
// Amounts are supplied by the existing game's fixed-step update, never by
// render time, historical album unlocks or optional moonlight minigames.
export const THEATRE_LIGHT_ZONES=Object.freeze([
  Object.freeze({x:.284,y:.595,rx:.124,ry:.255}),
  Object.freeze({x:.729,y:.568,rx:.145,ry:.28})
]);
export function drawPaintedTheatreLights(c,view,amounts=[]){
  const l=getTheatrePaintedLayout(view);
  if(!l||typeof c?.createRadialGradient!=='function'||typeof c?.save!=='function')return false;
  c.save();
  try{
    c.beginPath();c.rect(0,view.viewport.top,view.viewport.width,view.viewport.bottom-view.viewport.top);c.clip();
    for(const [index,zone] of THEATRE_LIGHT_ZONES.entries()){
      const a=clamp(finite(amounts[index])?amounts[index]:0,0,1);
      if(a<=0)continue;
      const x=l.x+l.width*zone.x,y=l.y+l.height*zone.y,rx=l.width*zone.rx,ry=l.height*zone.ry;
      c.save();
      c.translate(x,y);c.scale(1,ry/rx);
      const g=c.createRadialGradient(0,0,4,0,0,rx);
      g.addColorStop(0,'rgba(255,221,160,'+(a*.29).toFixed(4)+')');
      g.addColorStop(.3,'rgba(240,169,112,'+(a*.18).toFixed(4)+')');
      g.addColorStop(.65,'rgba(219,128,123,'+(a*.1).toFixed(4)+')');
      g.addColorStop(1,'rgba(219,128,123,0)');
      c.fillStyle=g;c.beginPath();c.arc(0,0,rx,0,Math.PI*2);c.fill();c.restore();
      // A narrow seam of actual house-light responds individually to each lamp.
      const seam=c.createLinearGradient(x-2,y-ry*.66,x+rx*.35,y+ry*.4);
      seam.addColorStop(0,'rgba(255,227,168,0)');
      seam.addColorStop(.48,'rgba(255,216,158,'+(a*.2).toFixed(4)+')');
      seam.addColorStop(1,'rgba(255,207,146,0)');
      c.fillStyle=seam;c.fillRect(x-rx*.31,y-ry*.68,rx*.54,ry*1.15);
    }
    return true;
  }finally{c.restore();}
}

function browserImage(src){
  return new Promise((resolve,reject)=>{
    const Constructor=globalThis.Image;
    if(typeof Constructor!=='function'){reject(new Error('No browser Image'));return;}
    const image=new Constructor();
    image.decoding='async';
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('Theatre illustration unavailable'));
    image.src=src;
  });
}
// Lazy by chapter. Failed decoding leaves the existing playable procedural
// theatre intact, and never creates retries on every frame.
export function createTheatrePaintedAssets({loadImage=browserImage,src=THEATRE_PAINT_URL}={}){
  let image=null,phase='idle',pending=null,generation=0;
  return {
    request(context){
      if(!eligible(context))return Promise.resolve(false);
      if(phase==='ready')return Promise.resolve(true);
      if(phase==='failed')return Promise.resolve(false);
      if(pending)return pending;
      phase='loading';const gen=generation;
      pending=Promise.resolve().then(()=>loadImage(src)).then(candidate=>{
        if(gen!==generation)return false;
        if(!ready(candidate))throw new Error('Theatre image has no decoded pixels');
        image=candidate;phase='ready';pending=null;return true;
      }).catch(()=>{if(gen===generation){image=null;phase='failed';pending=null;}return false;});
      return pending;
    },
    getImage(context){return eligible(context)&&phase==='ready'?image:null;},
    getStatus(){return phase;},
    destroy(){generation++;image=null;phase='idle';pending=null;}
  };
}
