// v26 Whalefall Library: a non-interactive panorama driven only by story chapter 4.
// The archived artwork is never used by festivals which share the library motif.
import { createPaintedSceneAssets } from './dream-painted-scene.js';
export const LIBRARY_PAINT_URL = new URL('./assets/library-painted-v26.webp', import.meta.url).href;
export const LIBRARY_PAINT_PARALLAX = .7;
export const LIBRARY_LIGHT_ZONES = Object.freeze([
  Object.freeze({x:.27,y:.57,rx:.12,ry:.235}),
  Object.freeze({x:.77,y:.57,rx:.12,ry:.235}),
]);
const finite=Number.isFinite;
const positive=n=>finite(n)&&n>0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const eligibleLibrary = context => context?.mode==='story'&&context?.chapterIndex===3;
export function createLibrarySceneAssets(options={}) {
  return createPaintedSceneAssets({loadImage:options.loadImage,src:options.src||LIBRARY_PAINT_URL,chapterIndex:3});
}
export function getPaintedLibraryLayout(view) {
  const v=view?.viewport;
  if(!positive(v?.width)||!positive(view?.worldWidth)||!finite(view?.cameraX)||
     !finite(v.top)||!finite(v.bottom)||v.bottom<=v.top)return null;
  const travel=Math.max(0,view.worldWidth-v.width),camera=clamp(view.cameraX,0,travel);
  const width=Math.max(2400,v.width+LIBRARY_PAINT_PARALLAX*travel+40);
  const layout={x:-LIBRARY_PAINT_PARALLAX*camera,y:-52,width,height:width/3,cameraX:camera,parallax:LIBRARY_PAINT_PARALLAX};
  return Object.values(layout).every(finite)?Object.freeze(layout):null;
}
export function drawPaintedLibrary(c,view,image) {
  const l=getPaintedLibraryLayout(view);
  if(!l||!image||typeof c?.drawImage!=='function'||typeof c?.save!=='function')return false;
  try {
    if(image.complete===false||!positive('naturalWidth'in image?image.naturalWidth:image.width)||!positive('naturalHeight'in image?image.naturalHeight:image.height))return false;
  }catch{return false;}
  let saved=false,success=false;
  try{
    c.save();saved=true;
    c.beginPath();c.rect(0,view.viewport.top,view.viewport.width,view.viewport.bottom-view.viewport.top);c.clip();
    c.globalAlpha=1;c.globalCompositeOperation='source-over';c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.drawImage(image,l.x,l.y,l.width,l.height);success=true;
  }catch{success=false;}finally{if(saved)try{c.restore();}catch{success=false;}}
  return success;
}
// The painted warm windows are architecture, not completed seals. These two
// additional soft pools appear only from current-run poem lamps.
export function drawPaintedLibraryLights(c,view,amounts=[]) {
  const l=getPaintedLibraryLayout(view);
  if(!l||typeof c?.createRadialGradient!=='function'||typeof c?.save!=='function')return false;
  let saved=false,success=false;
  try {
    c.save();saved=true;
    c.beginPath();c.rect(0,view.viewport.top,view.viewport.width,view.viewport.bottom-view.viewport.top);c.clip();
    LIBRARY_LIGHT_ZONES.forEach((zone,index)=>{
      const a=clamp(finite(amounts[index])?amounts[index]:0,0,1);
      if(a===0)return;
      const x=l.x+l.width*zone.x,y=l.y+l.height*zone.y,rx=l.width*zone.rx,ry=l.height*zone.ry;
      c.save();
      try{
        c.translate(x,y);c.scale(1,ry/rx);
        const glow=c.createRadialGradient(0,0,6,0,0,rx);
        glow.addColorStop(0,`rgba(255,223,163,${(a*.32).toFixed(4)})`);
        glow.addColorStop(.35,`rgba(249,187,112,${(a*.16).toFixed(4)})`);
        glow.addColorStop(1,'rgba(249,187,112,0)');
        c.fillStyle=glow;c.beginPath();c.arc(0,0,rx,0,Math.PI*2);c.fill();
      }finally{c.restore();}
    });
    success=true;
  }catch{success=false;}finally{if(saved)try{c.restore();}catch{success=false;}}
  return success;
}
