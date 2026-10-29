// Sixth chapter: the original pre-sunrise postal street remains scenery.
// No platform, puzzle lamp, postbox, pendulum or collision is baked into it.
import {createPaintedSceneAssets} from './dream-painted-scene.js';

export const POST_PAINT_URL=new URL('./assets/post-painted-v28.webp',import.meta.url).href;
export const POST_PAINT_PARALLAX=.54;
export const POST_WARM_ZONES=Object.freeze([
  Object.freeze({x:.27,y:.64,rx:.064,ry:.16}),
  Object.freeze({x:.77,y:.61,rx:.073,ry:.14}),
]);
const finite=Number.isFinite;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const eligiblePost=context=>context?.mode==='story'&&context?.chapterIndex===5;
export function createPostSceneAssets({loadImage,src=POST_PAINT_URL}={}){
  return createPaintedSceneAssets({loadImage,src,chapterIndex:5});
}
export function getPaintedPostLayout(view){
  const v=view?.viewport;
  if(!finite(v?.width)||v.width<=0||!finite(view?.worldWidth)||view.worldWidth<=0||
    !finite(view?.cameraX)||!finite(v.top)||!finite(v.bottom)||v.bottom<=v.top)return null;
  const travel=Math.max(0,view.worldWidth-v.width);
  const camera=clamp(view.cameraX,0,travel);
  const width=Math.max(2350,v.width+POST_PAINT_PARALLAX*travel+32);
  const initialX=clamp(v.width*.50-width*.50,v.width-width+POST_PAINT_PARALLAX*travel,0);
  const x=clamp(initialX-POST_PAINT_PARALLAX*camera,v.width-width,0);
  const layout={x,y:-55,width,height:width/3,cameraX:camera,parallax:POST_PAINT_PARALLAX};
  return Object.values(layout).every(finite)?Object.freeze(layout):null;
}
export function drawPaintedPost(c,view,image){
  const l=getPaintedPostLayout(view);
  if(!l||!image||typeof c?.drawImage!=='function'||typeof c?.save!=='function')return false;
  try{if(image.complete===false||!(('naturalWidth'in image?image.naturalWidth:image.width)>0)||
      !(('naturalHeight'in image?image.naturalHeight:image.height)>0))return false;}catch{return false;}
  let saved=false,drawn=false;
  try{
    c.save();saved=true;c.beginPath();c.rect(0,view.viewport.top,view.viewport.width,view.viewport.bottom-view.viewport.top);c.clip();
    c.globalAlpha=1;c.globalCompositeOperation='source-over';c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.drawImage(image,l.x,l.y,l.width,l.height);drawn=true;
  }catch{drawn=false;}finally{if(saved)try{c.restore();}catch{drawn=false;}}
  return drawn;
}
export function drawPaintedPostLights(c,view,amounts=[]){
  const l=getPaintedPostLayout(view);if(!l||typeof c?.save!=='function'||typeof c?.createRadialGradient!=='function')return false;
  let saved=false,drawn=false;
  try{
    c.save();saved=true;c.beginPath();c.rect(0,view.viewport.top,view.viewport.width,view.viewport.bottom-view.viewport.top);c.clip();
    for(const [i,z]of POST_WARM_ZONES.entries()){
      const alpha=clamp(finite(amounts[i])?amounts[i]:0,0,1);if(alpha===0)continue;
      const x=l.x+l.width*z.x,y=l.y+l.height*z.y,r=l.width*z.rx;
      c.save();try{
        c.translate(x,y);c.scale(1,z.ry/z.rx);
        const g=c.createRadialGradient(0,0,2,0,0,r);
        g.addColorStop(0,`rgba(255,224,160,${(alpha*.28).toFixed(4)})`);
        g.addColorStop(.42,`rgba(245,182,127,${(alpha*.12).toFixed(4)})`);
        g.addColorStop(1,'rgba(245,182,127,0)');
        c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
      }finally{c.restore();}
    }
    drawn=true;
  }catch{drawn=false;}finally{if(saved)try{c.restore();}catch{drawn=false;}}
  return drawn;
}
