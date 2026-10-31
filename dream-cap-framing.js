// One whole-scene camera for a nearby traveler and the cap they are holding.
// The engine supplies the exact character / soul already used for this frame.
// These conservative authored envelopes contain the painted strokes; soft light,
// particles and the tether do not force a wider view. No pixels are scanned and
// no pose is recomputed here.
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const finite=Number.isFinite;
const matrix=m=>Array.isArray(m)&&m.length===6&&m.every(finite);
const point=p=>p&&finite(p.x)&&finite(p.y);

// Local cap coordinates from drawOutfitHat in dream-festival-art.js. Curves are
// enclosed by their control hulls; rounded hats include their full ellipse box.
// Padding includes strokes, including the wide ribbons around several hats.
const HATS=Object.freeze({
  halloween:[-28,-67,26,-20], christmas:[-25,-62,32,-24],
  thanksgiving:[-28,-47,28,-23], newyear:[-14.5,-66,17.5,-26.5],
  spring:[-27,-55,27,-26], lantern:[-23,-44,23,-12],
  valentine:[-23,-49,25,-27], dragonboat:[-29,-54,29,-26.5],
  qixi:[-23.5,-47,23.5,-28.5], midautumn:[-23,-67,23,-26],
  starlight:[-22,-46,23,-28],
});

function rectangle(m,[left,top,right,bottom],pad=0){
  const xs=[];
  for(const x of [left-pad,right+pad])for(const y of [top-pad,bottom+pad])xs.push(m[0]*x+m[2]*y+m[4]);
  return {left:Math.min(...xs),right:Math.max(...xs)};
}
const union=parts=>({left:Math.min(...parts.map(p=>p.left)),right:Math.max(...parts.map(p=>p.right))});

export function isCapFramingScene(game){
  return !!game&&!game.destroyed&&game.mode==='story'&&Number.isInteger(game.chapterIndex)
    &&game.chapterIndex>=0&&game.chapterIndex<6&&game.cssWidth>0&&game.cssWidth<=480
    &&finite(game.scale)&&game.scale>0&&finite(game.viewWidth)&&game.viewWidth>0
    &&finite(game.camera)&&finite(game.level?.width)&&game.level.width>0
    &&point(game.body)&&!game.activityFramed&&!!game.options&&typeof game.getOutfitId==='function';
}

export function getCapFramingBounds(character,shown,outfit){
  const rig=character?.rig;
  if(!rig||!['bodyMatrix','headMatrix','capMatrix'].every(k=>matrix(rig[k])))return null;
  const arms=Object.values(character.arms||{});
  if(arms.length!==2||arms.some(a=>!['shoulder','elbow','wrist'].every(k=>point(a[k]))))return null;
  const body=rectangle(rig.bodyMatrix,[-50,-60,35,8]);
  const cap=rectangle(rig.capMatrix,[-22,-40,25,-11],1.5);
  const hat=HATS[outfit]?rectangle(rig.capMatrix,HATS[outfit],1):null;
  const head=rectangle(rig.headMatrix,[-26,-17,26,26],1.5);
  const hands=union(arms.flatMap(a=>['shoulder','elbow','wrist'].map(k=>rectangle(rig.bodyMatrix,[a[k].x,a[k].y,a[k].x,a[k].y],k==='wrist'?6:3))));
  let soul=null;
  if(shown){
    if(!point(shown)||!finite(shown.alpha??1)||!finite(shown.scale??1)||(shown.scale??1)<0)return null;
    // 38 encloses the original and refined crest, tail tilt, hands and low-energy
    // arc (31), at the supplied visible scale. The large glow is decorative.
    if((shown.alpha??1)>0){const extent=38*(shown.scale??1);soul={left:shown.x-extent,right:shown.x+extent};}
  }
  const parts=[body,cap,head,hands,...(hat?[hat]:[]),...(soul?[soul]:[])];
  if(parts.some(p=>!finite(p.left)||!finite(p.right)))return null;
  return {body,cap,hat,hands,soul,...union(parts)};
}

export function getCapFramingView(game,character,shown,{wasActive=false,resized=false,previousViewport=null}={}){
  if(!isCapFramingScene(game)||!finite(game.capOpen)||!game.cap
    ||!['opening','open','returning'].includes(game.cap.phase))return null;
  const bounds=getCapFramingBounds(character,shown,game.getOutfitId());
  if(!bounds)return null;
  // Eight CSS pixels leave breathing room outside the already padded strokes.
  // Enter / exit thresholds differ by 16 CSS pixels to avoid edge oscillation.
  const marginCss=8,margin=marginCss/game.scale;
  const low=Math.max(0,bounds.right+margin-game.viewWidth);
  const high=Math.min(Math.max(0,game.level.width-game.viewWidth),bounds.left-margin);
  // A center already inside the picture leaves at least half the traveler
  // readable. Requiring a fully inset body here stranded near returns: the old
  // follow target could settle with the face visible but short of that inset.
  const bodyVisible=(camera,width)=>game.body.x-camera>=0&&game.body.x-camera<=width;
  const readable=bodyVisible(game.camera,game.viewWidth)||(resized&&previousViewport
    &&bodyVisible(previousViewport.camera,previousViewport.viewWidth));
  // World-edge clamping may leave only one valid camera even though the actors
  // have ample room. Hysteresis measures picture space, not camera travel.
  const slackCss=(game.viewWidth-(bounds.right-bounds.left)-2*margin)*game.scale;
  const active=readable&&low<=high&&slackCss>=(wasActive?8:24);
  return {active,reason:!readable?'body-away':low>high?'cannot-share':active?'nearby':'edge-buffer',
    low,high,marginCss,slackCss,bounds};
}

export function accumulateCameraFollow(previous,start,amount){
  if(!finite(start)||!finite(amount)||amount<=0)return previous;
  return {start:previous?.start??start,decay:(previous?.decay??1)*(1-clamp(amount,0,1))};
}

export function resolveCapFramingCamera(camera,follow,view,{playing=true,reducedMotion=false,resized=false}={}){
  if(!view?.active||!finite(camera)||(!playing&&!resized))return camera;
  if(resized||reducedMotion)return clamp(camera,view.low,view.high);
  if(!follow||!finite(follow.start)||!finite(follow.decay))return camera;
  const weight=1-follow.decay;if(weight<=0)return camera;
  // Reconstruct the weighted target of all original fixed steps since the last
  // painted frame. The unchanged path returns the original value bit-for-bit.
  const target=(camera-follow.start*follow.decay)/weight;
  const framed=clamp(target,view.low,view.high);
  return framed===target?camera:follow.start+(framed-follow.start)*weight;
}
