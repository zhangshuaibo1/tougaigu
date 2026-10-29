// A decorative, screen-space painting. This module owns no gameplay state and
// does not read the DOM until an eligible scene explicitly requests its image.
export const PAINTED_STATION_URL=new URL('./assets/station-painted-v16.webp',import.meta.url).href;
export const PAINTED_STATION_CONFIG=Object.freeze({
  aspect:3,
  baseWidth:1920,
  parallax:.28,
  clockFraction:.613,
  initialClockFraction:.62,
  groundFraction:.78,
  groundY:500,
});

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const positive=value=>Number.isFinite(value)&&value>0;

/**
 * Read getSceneBackdropView() without modifying it. Coordinates are logical
 * screen coordinates, before the engine's world/camera translation.
 * Returns frozen {x,y,width,height,parallax,cameraX,scrollRange}, or null.
 * Extra portrait space above/below the painting remains the sky layer's job.
 */
export function getPaintedStationLayout(view){
  const viewport=view?.viewport;
  if(!positive(viewport?.width)||!positive(view?.worldWidth)||
    !Number.isFinite(view?.cameraX)||!Number.isFinite(viewport.top)||
    !Number.isFinite(viewport.bottom)||!positive(viewport.bottom-viewport.top))return null;
  const cfg=PAINTED_STATION_CONFIG,w=viewport.width;
  const scrollRange=Math.max(0,view.worldWidth-w),cameraX=clamp(view.cameraX,0,scrollRange);
  // Reserve the whole parallax travel so neither camera endpoint exposes a side.
  const width=Math.max(cfg.baseWidth,w+cfg.parallax*scrollRange),height=width/cfg.aspect;
  const minInitialX=Math.min(0,-(width-w)+cfg.parallax*scrollRange);
  const initialX=clamp(cfg.initialClockFraction*w-cfg.clockFraction*width,minInitialX,0);
  const layout={
    x:initialX-cfg.parallax*cameraX,
    y:Math.min(0,cfg.groundY-cfg.groundFraction*height),
    width,height,parallax:cfg.parallax,cameraX,scrollRange,
  };
  return Object.values(layout).every(Number.isFinite)?Object.freeze(layout):null;
}

function readyImage(image){
  if(!image||typeof image!=='object')return false;
  try{
    if(image.complete===false)return false;
    // A failed HTMLImageElement can still have a CSS width; use natural pixels.
    const natural='naturalWidth'in image||'naturalHeight'in image;
    return positive(natural?image.naturalWidth:image.width)&&positive(natural?image.naturalHeight:image.height);
  }catch{return false;}
}

/**
 * Draw an already loaded image once, preserving the caller's Canvas state.
 * False asks the engine to use its existing procedural fallback. No clipping
 * holes, following fog, clocks or animation are added to the painted asset.
 */
export function drawPaintedStation(context,view,image){
  const layout=getPaintedStationLayout(view);
  if(!layout||!readyImage(image)||typeof context?.save!=='function'||
    typeof context?.restore!=='function'||typeof context?.drawImage!=='function')return false;
  let saved=false,drawn=false;
  try{
    context.save();saved=true;
    context.globalAlpha=1;
    context.globalCompositeOperation='source-over';
    context.imageSmoothingEnabled=true;
    context.imageSmoothingQuality='high';
    context.drawImage(image,layout.x,layout.y,layout.width,layout.height);
    drawn=true;
  }catch{drawn=false;}
  finally{
    if(saved)try{context.restore();}catch{drawn=false;}
  }
  return drawn;
}

// The two real poem lamps retain their corresponding window response. The
// small masks live in painting coordinates, so they travel with its parallax
// instead of drifting across the building with the world-space platforms.
export const PAINTED_STATION_WINDOWS=Object.freeze([
  Object.freeze({x:.614,y:.746,w:.043,h:.142}),
  Object.freeze({x:.690,y:.746,w:.043,h:.142}),
]);
export function drawPaintedStationLights(c,view,lit=[]){
  const layout=getPaintedStationLayout(view);if(!layout)return;
  c.save();
  for(const [index,window] of PAINTED_STATION_WINDOWS.entries()){
    const x=layout.x+window.x*layout.width,y=layout.y+window.y*layout.height;
    const w=window.w*layout.width,h=window.h*layout.height,r=w/2;
    c.save();c.beginPath();c.moveTo(x-r,y);c.lineTo(x-r,y-h+r);
    c.arc(x,y-h+r,r,Math.PI,Math.PI*2);c.lineTo(x+r,y);c.closePath();c.clip();
    const glass=c.createLinearGradient(x-r,y-h,x+r,y);
    glass.addColorStop(0,lit[index]?'#ffe3a546':'#122a4894');
    glass.addColorStop(.55,lit[index]?'#ffd89062':'#1530477d');
    glass.addColorStop(1,lit[index]?'#efba6438':'#18354e59');
    c.fillStyle=glass;c.fillRect(x-r,y-h,w,h);c.restore();
    if(lit[index]){
      const glow=c.createRadialGradient(x,y-h*.45,2,x,y-h*.45,w*.9);
      glow.addColorStop(0,'#ffdc8b25');glow.addColorStop(1,'#ffdc8b00');
      c.fillStyle=glow;c.fillRect(x-w,y-h,w*2,h+w*.5);
    }
  }
  c.restore();
}

function loadBrowserImage(src){
  return new Promise((resolve,reject)=>{
    const ImageConstructor=globalThis.Image;
    if(typeof ImageConstructor!=='function'){
      reject(new Error('A browser Image constructor is unavailable.'));return;
    }
    const image=new ImageConstructor();
    const clear=()=>{image.onload=null;image.onerror=null;};
    image.decoding='async';
    image.onload=()=>{clear();resolve(image);};
    image.onerror=()=>{clear();reject(new Error('The painted station image could not load.'));};
    try{image.src=src;}catch(error){clear();reject(error);}
  });
}

/**
 * loadImage(src) may return an image or a promise for one (e.g. an offline
 * Canvas loader). Each instance makes at most one attempt for its story chapter
 * (chapterIndex defaults to 0, preserving the original station contract).
 * request(context) resolves to readiness; failure is stable and never blocks
 * gameplay. getImage(context) is null outside its story chapter or before readiness.
 */
export function createPaintedSceneAssets(options={}){
  const loadImage=options?.loadImage===undefined?loadBrowserImage:options.loadImage;
  const src=typeof options?.src==='string'&&options.src.length?options.src:PAINTED_STATION_URL;
  const chapterIndex=Number.isInteger(options?.chapterIndex)&&options.chapterIndex>=0&&options.chapterIndex<=5?options.chapterIndex:0;
  const eligible=context=>context?.mode==='story'&&context?.chapterIndex===chapterIndex;
  let status='idle',image=null,pending=null;
  function request(context){
    if(status==='destroyed'||!eligible(context))return Promise.resolve(false);
    if(pending)return pending;
    status='loading';
    pending=Promise.resolve().then(()=>{
      // Destruction can happen before even the loader's first microtask.
      if(status==='destroyed')return null;
      if(typeof loadImage!=='function')throw new TypeError('loadImage must be a function.');
      return loadImage(src);
    }).then(loaded=>{
      if(status==='destroyed')return false;
      if(!readyImage(loaded))throw new Error('The painted station image has no loaded pixels.');
      image=loaded;status='ready';return true;
    }).catch(()=>{
      if(status!=='destroyed'){image=null;status='error';}
      return false;
    });
    return pending;
  }
  return Object.freeze({
    request,
    getImage(context){return status==='ready'&&eligible(context)?image:null;},
    getSnapshot(){return Object.freeze({status});},
    destroy(){image=null;status='destroyed';},
  });
}
