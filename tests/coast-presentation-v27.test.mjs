import test from 'node:test';
import assert from 'node:assert/strict';
import {DreamGame} from '../dist/dream-engine.js';
import {DreamGame as BaseGame} from '../dist/dream-engine-base.js';
import {createCoastSceneAssets,eligibleCoast,getPaintedCoastLayout,drawPaintedCoast,drawPaintedCoastLights,COAST_PAINT_URL,COAST_LIGHT_ZONES} from '../dist/dream-coast-scene.js';
import {drawCoastPlatform,getCoastPendulumView,drawCoastPendulum} from '../dist/dream-coast-finish.js';
import {drawStoryNPC} from '../dist/dream-encounter-art.js';
import {getStoryNPC} from '../dist/dream-encounters.js';

const noop=()=>{},coast=Object.freeze({mode:'story',chapterIndex:4});
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const pixels=()=>Object.freeze({complete:true,naturalWidth:2172,naturalHeight:724});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const sceneView=(width=1100,cameraX=0)=>({worldWidth:2260,cameraX,viewport:{width,top:0,bottom:640}});
function context(){
  const original={globalAlpha:.43,globalCompositeOperation:'multiply',imageSmoothingEnabled:false,imageSmoothingQuality:'low'},values={...original},stack=[],calls=[];
  const api={calls,stack,failOn:null,
    save(){stack.push({...values});calls.push(['save']);},
    restore(){assert.ok(stack.length,'restore without save');Object.assign(values,stack.pop());calls.push(['restore']);},
    assertRestored(){assert.equal(stack.length,0);for(const [k,v]of Object.entries(original))assert.equal(values[k],v,k);},
    measureText:text=>({width:String(text).length*8}),
  };
  for(const name of ['createLinearGradient','createRadialGradient'])api[name]=(...args)=>{
    if(api.failOn===name)throw Error('controlled gradient failure');
    assert.ok(args.every(Number.isFinite));const stops=[];calls.push([name,...args,stops]);
    return{addColorStop:(at,color)=>{assert.ok(Number.isFinite(at));stops.push([at,color]);}};
  };
  return new Proxy(api,{get:(o,k)=>k in o?o[k]:k in values?values[k]:(...args)=>{
    if(api.failOn===k)throw Error('controlled '+String(k)+' failure');
    for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(k)+' must be finite');
    calls.push([k,...args]);
  },set:(o,k,v)=>{if(k in o)o[k]=v;else values[k]=v;return true;}});
}
function fixture({Class=DreamGame,resources={},options={},callbacks={}}={}){
  const c=context(),events=[],capEvents=[],completions=[];
  const g=new Class({getContext:()=>c,getBoundingClientRect:()=>({width:1100,height:640})},{onEvent:e=>events.push(e),onCapEvent:e=>capEvents.push(e),onComplete:e=>completions.push(e),...callbacks},resources);
  g.start({chapterIndex:4,sound:false,...options});return{g,c,events,capEvents,completions};
}
const tick=(g,frames)=>{for(let i=0;i<frames;i++)g.update(1/60);};
const physics=g=>structuredClone({state:g.state,form:g.form,time:g.time,body:g.body,soul:g.soul,energy:g.energy,deaths:g.deaths,lanterns:g.lanterns,memories:g.memories,hazards:g.hazards,movers:g.movers,checkpoint:g.checkpoint,level:g.level});

test('coast asset is lazy, limited to story chapter five, and shares one actual request',async()=>{
  assert.equal(COAST_PAINT_URL,new URL('../dist/assets/coast-painted-v27.webp',import.meta.url).href);
  const pending=deferred(),sources=[],a=createCoastSceneAssets({loadImage:src=>{sources.push(src);return pending.promise;}});
  for(const s of [null,{},...Array.from({length:6},(_,chapterIndex)=>({mode:'story',chapterIndex})).filter(s=>s.chapterIndex!==4),{mode:'festival',chapterIndex:4},{mode:'story',chapterIndex:'4'}]){
    assert.equal(eligibleCoast(s),false);assert.equal(await a.request(s),false);assert.equal(a.getImage(s),null);
  }
  assert.deepEqual(sources,[]);assert.equal(a.getSnapshot().status,'idle');assert.equal(eligibleCoast(coast),true);
  const first=a.request(coast),second=a.request(coast);assert.equal(first,second);assert.equal(a.getImage(coast),null);
  await Promise.resolve();assert.deepEqual(sources,[COAST_PAINT_URL]);
  const image=pixels();pending.resolve(image);assert.equal(await first,true);assert.equal(a.getImage(coast),image);
  assert.equal(await a.request(coast),true);assert.equal(sources.length,1);a.destroy();
});

test('late coast pixels never leak into another chapter or resurrect a destroyed loader',async()=>{
  for(const fail of [false,true]){
    const pending=deferred(),a=createCoastSceneAssets({loadImage:()=>pending.promise});
    const p=a.request(coast);await Promise.resolve();a.destroy();
    if(fail)pending.reject(Error('late rejection'));else pending.resolve(pixels());
    assert.equal(await p,false);assert.equal(a.getSnapshot().status,'destroyed');assert.equal(a.getImage(coast),null);
    assert.equal(await a.request(coast),false);
  }
  const pending=deferred(),a=createCoastSceneAssets({loadImage:()=>pending.promise});
  const p=a.request(coast);await Promise.resolve();
  const elsewhere={mode:'story',chapterIndex:5};assert.equal(await a.request(elsewhere),false);
  pending.resolve(pixels());assert.equal(await p,true);assert.equal(a.getImage(elsewhere),null);a.destroy();
  let loads=0;const early=createCoastSceneAssets({loadImage:()=>{loads++;return pixels();}}),before=early.request(coast);
  early.destroy();assert.equal(await before,false);assert.equal(loads,0);
});

test('coast failed decode and malformed pixels fail once and leave a stable procedural fallback',async()=>{
  const attempts=[()=>Promise.reject(Error('network')),()=>{throw Error('decode');},()=>({complete:false,width:2172,height:724}),()=>({complete:true,naturalWidth:0,naturalHeight:724,width:2172,height:724}),()=>({width:2172,height:NaN})];
  for(const failure of attempts){
    let count=0;const a=createCoastSceneAssets({loadImage:()=>{count++;return failure();}});
    assert.equal(await a.request(coast),false);assert.equal(await a.request(coast),false);
    assert.equal(count,1);assert.equal(a.getSnapshot().status,'error');assert.equal(a.getImage(coast),null);a.destroy();
  }
});

test('coast parallax covers actual desktop and narrow Canvas edges without stretching the 3:1 painting',()=>{
  for(const [cssWidth,cssHeight]of [[1100,640],[1920,1080],[390,595],[320,431]]){
    const width=cssWidth/(cssHeight/640),travel=Math.max(0,2260-width);
    for(const camera of [0,travel/2,travel]){
      const source=sceneView(width,camera),before=structuredClone(source),l=getPaintedCoastLayout(source);
      assert.ok(Object.isFrozen(l));assert.deepEqual(source,before);
      assert.ok(l.x<=0&&l.x+l.width>=width,'No exposed horizontal edge');
      assert.ok(l.y<=0&&l.y+l.height>=640,'Authored vertical area is covered');
      assert.ok(Math.abs(l.width/l.height-3)<1e-12);
    }
    assert.deepEqual(getPaintedCoastLayout(sceneView(width,-100)),getPaintedCoastLayout(sceneView(width,0)));
    assert.deepEqual(getPaintedCoastLayout(sceneView(width,9000)),getPaintedCoastLayout(sceneView(width,travel)));
  }
  const a=getPaintedCoastLayout(sceneView(1100,0)),b=getPaintedCoastLayout(sceneView(1100,300));
  assert.equal(b.x-a.x,-210,'A distant coast moves by the authored 0.7 parallax');
});

test('invalid coast views and images do not draw, and a failed texture preserves the caller Canvas state',()=>{
  for(const view of [null,{},sceneView(0),sceneView(NaN),sceneView(Infinity),sceneView(1100,Infinity),{...sceneView(),worldWidth:-1},{...sceneView(),viewport:{width:1100,top:1,bottom:1}}]){
    const c=context();assert.equal(getPaintedCoastLayout(view),null);assert.equal(drawPaintedCoast(c,view,pixels()),false);assert.deepEqual(c.calls,[]);
  }
  for(const image of [null,{}, {complete:false,naturalWidth:2172,naturalHeight:724},{complete:true,naturalWidth:0,naturalHeight:0,width:2172,height:724},{width:Infinity,height:724}]){
    const c=context();assert.equal(drawPaintedCoast(c,sceneView(),image),false);assert.deepEqual(c.calls,[]);
  }
  const c=context();c.failOn='drawImage';assert.equal(drawPaintedCoast(c,sceneView(),pixels()),false);c.assertRestored();
  c.failOn=null;assert.equal(drawPaintedCoast(c,sceneView(),{width:2172,height:724}),true);c.assertRestored();
  assert.ok(c.calls.some(x=>x[0]==='clip'),'Painting is clipped to the actual viewport');
});

test('each distant light response remains visible at its actual coast milestone in all three view sizes',()=>{
  for(const [cssWidth,cssHeight]of [[1100,640],[390,595],[320,431]]){
    const width=cssWidth/(cssHeight/640),travel=Math.max(0,2260-width);
    for(const [index,camera]of [[0,Math.max(0,680-width*.43)],[1,travel]]){
      const layout=getPaintedCoastLayout(sceneView(width,camera)),zone=COAST_LIGHT_ZONES[index];
      const center=layout.x+layout.width*zone.x;
      assert.ok(center>=0&&center<=width,'Lamp '+index+' roof response must be visible at '+cssWidth+' pixels');
      assert.ok(layout.y+layout.height*zone.y>=0&&layout.y+layout.height*zone.y<=640);
    }
  }
});

test('only each real lamp amount illuminates its corresponding roof pool, including nested drawing failure',()=>{
  const source=sceneView(1100,650),before=structuredClone(source),c=context();
  const translated=amounts=>{c.calls.length=0;assert.equal(drawPaintedCoastLights(c,source,amounts),true);c.assertRestored();return c.calls.filter(x=>x[0]==='translate');};
  assert.deepEqual(translated([0,0]),[]);const first=translated([1,0]),second=translated([0,1]);
  assert.equal(first.length,1);assert.equal(second.length,1);assert.notDeepEqual(first,second);
  assert.deepEqual(translated([1,1]),[...first,...second]);assert.deepEqual(translated([NaN,-1]),[]);
  c.failOn='createRadialGradient';assert.equal(drawPaintedCoastLights(c,source,[1,1]),false);c.assertRestored();
  assert.deepEqual(source,before);
});

test('coast stone uses the physical platform top and clip and rejects invalid geometry',()=>{
  const p=Object.freeze({kind:'ground',x:0,y:560,w:2260,h:100}),c=context();
  assert.equal(drawCoastPlatform(c,p,{camera:900,viewWidth:390}),true);c.assertRestored();
  assert.ok(c.calls.some(x=>x[0]==='rect'&&x.slice(1).join(',')==='0,560,2260,100'));
  assert.ok(c.calls.some(x=>x[0]==='fillRect'&&x.slice(1).join(',')==='0,560,2260,1'));
  for(const bad of [{...p,y:NaN},{...p,w:0},{...p,h:-1},{...p,x:Infinity},{...p,kind:'book'}])assert.equal(drawCoastPlatform(c,bad),false);
  const failed=context();failed.failOn='createLinearGradient';assert.equal(drawCoastPlatform(failed,p),false);failed.assertRestored();
});

test('pendulum appearance follows the actual pivot, bob, radius and remaining freeze without mutating danger',()=>{
  const h=Object.freeze({kind:'pendulum',x:820,y:215,px:900,py:510,r:31,angle:.26,clock:2.5,frozen:0,hitCooldown:0});
  const before=structuredClone(h),view=getCoastPendulumView(h);assert.ok(Object.isFrozen(view));
  assert.deepEqual([view.x,view.y,view.px,view.py,view.radius,view.frozen],[820,215,900,510,31,0]);
  const normal=context();assert.equal(drawCoastPendulum(normal,h),true);normal.assertRestored();
  assert.equal(normal.calls.some(x=>x[0]==='fillText'&&String(x[1]).includes('静止')),false);
  const frozen=context();assert.equal(drawCoastPendulum(frozen,{...h,frozen:1.25}),true);frozen.assertRestored();
  assert.ok(frozen.calls.some(x=>x[0]==='fillText'&&String(x[1]).includes('1.3s')),'Countdown reads the current 1.25-second value');
  assert.deepEqual(h,before);
  for(const bad of [null,{...h,kind:'drifter'},{...h,px:NaN},{...h,py:Infinity},{...h,r:0}])assert.equal(getCoastPendulumView(bad),null);
  const failure=context();failure.failOn='createRadialGradient';assert.equal(drawCoastPendulum(failure,h),false);failure.assertRestored();
});

test('the coast watch and both wrists follow every actual opening and returning amount continuously',()=>{
  const render=(chapterIndex,capOpen,form,talking=false,near=true)=>{
    const c=context(),view={...getStoryNPC(chapterIndex),chapterIndex,near,capOpen,form,talking,look:{x:190,y:495}};
    const before=structuredClone(view);drawStoryNPC(c,view,0,true);assert.deepEqual(view,before);c.assertRestored();return c.calls;
  };
  const grips=calls=>{
    const dial=calls.findIndex(c=>c[0]==='ellipse'&&c[3]===13.4&&c[4]===14);
    assert.ok(dial>=0,'The actual finished copper dial must be drawn');
    const transform=calls.slice(0,dial).findLast(c=>c[0]==='translate');
    const hands=calls.filter(c=>c[0]==='ellipse'&&c[3]===3.1&&c[4]===3.5).map(c=>({x:c[1],y:c[2]}));
    assert.equal(hands.length,2,'Both actual wrist ellipses must be drawn');
    return{watch:{x:transform[1],y:transform[2]},hands};
  };
  for(const talking of [false,true]){
    let previous=null;
    for(const amount of [0,.25,.5,.75,1]){
      const opening=grips(render(4,amount,'soul',talking)),returning=grips(render(4,amount,'body',talking));
      const y=-26-amount*11-(talking?3*(1-amount):0);
      assert.deepEqual(opening,{watch:{x:0,y},hands:[{x:-11,y},{x:11,y}]},'The dial and hands must share the partial cap lift');
      assert.deepEqual(returning,opening,'Body recall keeps the same watch/hand pose at the same remaining openness');
      if(previous!==null)assert.equal(previous-y,talking?2:2.75,'Each quarter-open step has a continuous, equal displacement');
      previous=y;
    }
  }
  assert.deepEqual(grips(render(4,1,'soul',false,false)),grips(render(4,0,'body')),'A far-away open cap must not raise the watch');
  for(const chapter of [1]){ // Sixth chapter keeper receives a new continuous letter pose.
    assert.deepEqual(render(chapter,.25,'soul'),render(chapter,1,'soul'),'Other keepers retain their existing fully raised open pose');
    assert.deepEqual(render(chapter,.5,'body'),render(chapter,0,'body'),'The coast return interpolation must not affect other chapters');
  }
});

test('coast integration preserves same-input physics and events with a loaded or failed painting',async()=>{
  for(const fail of [false,true]){
    const a=fixture({resources:{loadCoastImage:()=>fail?Promise.reject(Error('offline')):pixels()}}),b=fixture({Class:BaseGame});
    await a.g.coastScenes.request(coast);
    assert.equal(a.g.isCoastFinish(),true);assert.equal(!!a.g.getPaintedCoastImage(),!fail);
    for(let frame=0;frame<300;frame++){
      if(frame===30)for(const h of [a,b])h.g.jump();
      if(frame===80)for(const h of [a,b])h.g.toggleSoul();
      if(frame===220)for(const h of [a,b])h.g.recall();
      const input={x:frame<80?.5:frame<220?.15:0,y:frame>=80&&frame<160?-.4:0};
      for(const h of [a,b]){h.g.setInput(input);h.g.update(1/60);}
      assert.deepEqual(physics(a.g),physics(b.g));
    }
    const before=physics(a.g);a.g.render();assert.deepEqual(physics(a.g),before);assert.equal(a.g.coastPaintedFrame,!fail);assert.equal(a.c.stack.length,0);
    assert.deepEqual(a.events,b.events);assert.deepEqual(a.capEvents,b.capEvents);assert.deepEqual(a.completions,b.completions);
    a.g.destroy();b.g.destroy();
  }
});

test('late coast load after leaving or destroying cannot decorate another chapter or restart a game',async()=>{
  for(const destroy of [false,true]){
    const pending=deferred(),h=fixture({resources:{loadCoastImage:()=>pending.promise}});
    const request=h.g.coastScenes.request(coast);await Promise.resolve();
    if(destroy)h.g.destroy();else h.g.start({chapterIndex:3,sound:false});
    const before=physics(h.g);pending.resolve(pixels());await request;
    assert.deepEqual(physics(h.g),before);assert.equal(h.g.getPaintedCoastImage(),null);
    h.g.render();assert.equal(h.g.coastPaintedFrame,false);assert.equal(h.c.stack.length,0);h.g.destroy();
  }
});

test('cached paintings from all first four chapters cannot stand in for a pending or ready coast painting',async()=>{
  const pending=deferred(),oldImages=[],loads=[];
  const oldLoader=src=>{loads.push(src);const image=Object.freeze({...pixels(),source:src});oldImages.push(image);return image;};
  const h=fixture({options:{chapterIndex:0},resources:{loadImage:oldLoader,loadTheatreImage:oldLoader,loadLibraryImage:oldLoader,loadCoastImage:()=>pending.promise}});
  for(const [chapterIndex,key]of [[0,'paintedScenes'],[1,'greenhouseScenes'],[2,'theatreScenes'],[3,'libraryScenes']]){
    h.g.start({chapterIndex,sound:false});const scene={mode:'story',chapterIndex};
    assert.equal(await h.g[key].request(scene),true);assert.ok(h.g[key].getImage(scene));
  }
  assert.equal(loads.length,4);assert.equal(new Set(loads).size,4);
  h.g.start({chapterIndex:4,sound:false});const before=physics(h.g);
  assert.equal(h.g.getPaintedCoastImage(),null);assert.deepEqual(h.g.coastLight.amounts,[0,0]);
  h.c.calls.length=0;h.g.render();assert.equal(h.g.coastPaintedFrame,false);assert.deepEqual(physics(h.g),before);
  assert.equal(h.c.calls.some(c=>c[0]==='drawImage'&&oldImages.includes(c[1])),false,'No cached earlier painting may draw while coast is pending');
  const coastImage=Object.freeze({...pixels(),source:'coast-only'});pending.resolve(coastImage);await h.g.coastScenes.request(coast);
  h.c.calls.length=0;h.g.render();assert.equal(h.g.coastPaintedFrame,true);assert.deepEqual(physics(h.g),before);
  assert.ok(h.c.calls.some(c=>c[0]==='drawImage'&&c[1]===coastImage));
  assert.equal(h.c.calls.some(c=>c[0]==='drawImage'&&oldImages.includes(c[1])),false);assert.equal(h.c.stack.length,0);h.g.destroy();
});

test('lamp fade uses actual independent lamps, freezes on pause, resets on restart and settles under reduced motion',async()=>{
  const h=fixture({resources:{loadCoastImage:()=>pixels()}});await h.g.coastScenes.request(coast);
  assert.deepEqual(h.g.coastLight.amounts,[0,0]);h.g.lightSeal(1);h.g.update(1/60);
  assert.equal(h.g.coastLight.amounts[0],0);assert.ok(h.g.coastLight.amounts[1]>0&&h.g.coastLight.amounts[1]<1);
  h.g.pause();const before=physics(h.g),light=structuredClone(h.g.coastLight);tick(h.g,120);
  assert.deepEqual(physics(h.g),before);assert.deepEqual(h.g.coastLight,light);
  h.g.setReducedMotion(true);assert.deepEqual(h.g.coastLight.amounts,[0,1]);
  h.g.resume();h.g.restart();assert.deepEqual(h.g.coastLight.amounts,[0,0]);assert.equal(h.g.exitReady(),false);
  for(const chapterIndex of [0,1,2,3,5]){h.g.start({chapterIndex,sound:false});assert.equal(h.g.isCoastFinish(),false);assert.equal(h.g.getPaintedCoastImage(),null);assert.equal(h.g.coastLight,null);}
  h.g.start({festival:{id:'newyear'},sound:false});assert.equal(h.g.isCoastFinish(),false);assert.equal(h.g.getPaintedCoastImage(),null);assert.equal(h.g.coastLight,null);h.g.destroy();
});
