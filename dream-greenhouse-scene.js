// The greenhouse panorama is decorative. Its glass responds only to the two
// current-run poem-lamp booleans; a remembered head garden is not scene progress.
import { createPaintedSceneAssets } from './dream-painted-scene.js';

export const PAINTED_GREENHOUSE_URL=new URL('./assets/greenhouse-painted-v17.webp',import.meta.url).href;
export const PAINTED_GREENHOUSE_CONFIG=Object.freeze({
  aspect:3,baseWidth:1920,parallax:.28,
  subjectFraction:.50,initialSubjectFraction:.62,groundFraction:.79,groundY:500,
});

// Measured on the 2172x724 production image. Coordinates are centre-x,
// bottom-y, width and height, all normalised; the door remains untouched.
export const PAINTED_GREENHOUSE_WINDOWS=Object.freeze([
  Object.freeze({x:.4455,y:.737,w:.0505,h:.302}),
  Object.freeze({x:.5540,y:.737,w:.0505,h:.302}),
]);

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const positive=value=>Number.isFinite(value)&&value>0;

export function createGreenhouseSceneAssets(options={}){
  return createPaintedSceneAssets({...options,src:PAINTED_GREENHOUSE_URL,chapterIndex:1});
}

/** Logical screen space, before the world transform; no camera side can reveal
 * an uncovered edge. Extra portrait bands remain the caller's sky/ground. */
export function getPaintedGreenhouseLayout(view){
  const viewport=view?.viewport;
  if(!positive(viewport?.width)||!positive(view?.worldWidth)||!Number.isFinite(view?.cameraX)||
    !Number.isFinite(viewport.top)||!Number.isFinite(viewport.bottom)||!positive(viewport.bottom-viewport.top))return null;
  const cfg=PAINTED_GREENHOUSE_CONFIG,w=viewport.width;
  const scrollRange=Math.max(0,view.worldWidth-w),cameraX=clamp(view.cameraX,0,scrollRange);
  const width=Math.max(cfg.baseWidth,w+cfg.parallax*scrollRange),height=width/cfg.aspect;
  const minInitialX=Math.min(0,-(width-w)+cfg.parallax*scrollRange);
  const initialX=clamp(cfg.initialSubjectFraction*w-cfg.subjectFraction*width,minInitialX,0);
  const layout={x:initialX-cfg.parallax*cameraX,y:Math.min(0,cfg.groundY-cfg.groundFraction*height),width,height,parallax:cfg.parallax,cameraX,scrollRange};
  return Object.values(layout).every(Number.isFinite)?Object.freeze(layout):null;
}

function readyImage(image){
  if(!image||typeof image!=='object')return false;
  try{
    if(image.complete===false)return false;
    const natural='naturalWidth'in image||'naturalHeight'in image;
    return positive(natural?image.naturalWidth:image.width)&&positive(natural?image.naturalHeight:image.height);
  }catch{return false;}
}

export function drawPaintedGreenhouse(c,view,image){
  const layout=getPaintedGreenhouseLayout(view);
  if(!layout||!readyImage(image)||typeof c?.save!=='function'||typeof c?.restore!=='function'||typeof c?.drawImage!=='function')return false;
  let saved=false,drawn=false;
  try{
    c.save();saved=true;c.globalAlpha=1;c.globalCompositeOperation='source-over';c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.drawImage(image,layout.x,layout.y,layout.width,layout.height);drawn=true;
  }catch{drawn=false;}finally{if(saved)try{c.restore();}catch{drawn=false;}}
  return drawn;
}

/** The masks use the painting's parallax transform, never the actor camera. */
export function drawPaintedGreenhouseLights(c,view,lit=[],windows=PAINTED_GREENHOUSE_WINDOWS){
  const layout=getPaintedGreenhouseLayout(view);if(!layout||!c||!Array.isArray(windows))return;
  c.save();
  for(const [index,pane] of windows.slice(0,2).entries()){
    if(!pane||!Number.isFinite(pane.x)||!Number.isFinite(pane.y)||!positive(pane.w)||!positive(pane.h))continue;
    const active=Array.isArray(lit)&&lit[index]===true;
    const x=layout.x+pane.x*layout.width,y=layout.y+pane.y*layout.height,w=pane.w*layout.width,h=pane.h*layout.height,r=Math.min(w/2,h);
    c.save();c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2,y-h+r);
    c.arc(x,y-h+r,r,Math.PI,Math.PI*2);c.lineTo(x+w/2,y);c.closePath();c.clip();
    const glass=c.createLinearGradient(x-w/2,y-h,x+w/2,y);
    glass.addColorStop(0,active?'#f9e7ad3d':'#142f339c');
    glass.addColorStop(.58,active?'#ffe0a65c':'#1b3a3c85');
    glass.addColorStop(1,active?'#d9ba6c30':'#18373366');
    c.fillStyle=glass;c.fillRect(x-w/2,y-h,w,h);c.restore();
    if(active){const glow=c.createRadialGradient(x,y-h*.45,2,x,y-h*.45,w*.95);glow.addColorStop(0,'#ffe5ad25');glow.addColorStop(1,'#ffe5ad00');c.fillStyle=glow;c.fillRect(x-w,y-h,w*2,h+w*.5);}
  }
  c.restore();
}
