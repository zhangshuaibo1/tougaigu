import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { drawStationBackdrop } from '../dist/dream-station-art.js';
import { drawSceneBackdrop } from '../dist/dream-scene-backdrop.js';
import { drawFestivalProps, drawFestivalWeather, getFestivalTheme, FESTIVAL_VISUAL_IDS } from '../dist/dream-festival-art.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=noop;
const mainScenes=['station','garden','theatre','library','coast','post'];
const festivalScenes={halloween:'station',thanksgiving:'garden',christmas:'library',newyear:'coast',spring:'post',lantern:'theatre',valentine:'garden',dragonboat:'theatre',qixi:'library',midautumn:'station'};
const cases=[...mainScenes.map((sceneId,chapterIndex)=>({sceneId,options:{chapterIndex}})),...Object.entries(festivalScenes).map(([id,sceneId])=>({sceneId,options:{festival:{id}}}))];
const transform=(m,x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});

function makeContext(){
  const calls=[],painted=[],stack=[];let matrix=[1,0,0,1,0,0],ellipse=null;
  const finite=value=>{if(typeof value==='number')assert.ok(Number.isFinite(value),'non-finite Canvas geometry');else if(Array.isArray(value))value.forEach(finite);};
  const record=(name,args)=>{args.forEach(finite);calls.push([name,...args]);};
  const state={globalAlpha:1,fillStyle:'#000',strokeStyle:'#000',lineWidth:1};
  const apply=(a,b,c,d,e,f)=>{const [aa,bb,cc,dd,ee,ff]=matrix;matrix=[aa*a+cc*b,bb*a+dd*b,aa*c+cc*d,bb*c+dd*d,aa*e+cc*f+ee,bb*e+dd*f+ff];};
  const context={calls,painted,
    save(){record('save',[]);stack.push({matrix:[...matrix],state:{...state}});},
    restore(){record('restore',[]);const old=stack.pop();assert.ok(old,'unbalanced Canvas restore');matrix=old.matrix;Object.assign(state,old.state);},
    setTransform(...args){record('setTransform',args);matrix=[...args];},
    transform(...args){record('transform',args);apply(...args);},
    translate(x,y){record('translate',[x,y]);apply(1,0,0,1,x,y);},
    scale(x,y){record('scale',[x,y]);apply(x,0,0,y,0,0);},
    rotate(a){record('rotate',[a]);apply(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0);},
    beginPath(){record('beginPath',[]);ellipse=null;},
    ellipse(...args){record('ellipse',args);assert.ok(args[2]>=0&&args[3]>=0);ellipse={x:args[0],y:args[1],rx:args[2],ry:args[3]};},
    fill(...args){record('fill',args);if(ellipse)painted.push({...ellipse,point:transform(matrix,ellipse.x,ellipse.y),matrix:[...matrix],style:state.fillStyle});},
    createLinearGradient(...args){record('createLinearGradient',args);return {kind:'linear',args,stops:[],addColorStop(offset,color){record('addColorStop',[offset,color]);this.stops.push([offset,color]);}};},
    createRadialGradient(...args){record('createRadialGradient',args);return {kind:'radial',args,stops:[],addColorStop(offset,color){record('addColorStop',[offset,color]);this.stops.push([offset,color]);}};},
    measureText(value){return {width:String(value).length*10};},
    reset(){calls.length=0;painted.length=0;},
    balanced(){assert.equal(stack.length,0,'a drawing layer leaked Canvas state');},
  };
  return new Proxy(context,{
    get(target,key){if(key in target)return target[key];if(key in state)return state[key];return (...args)=>record(key,args);},
    set(target,key,value){finite(value);state[key]=value;calls.push(['set',key,value]);return true;},
  });
}
function makeGame(options={}){
  const ctx=makeContext(),game=new DreamGame({getContext:()=>ctx,getBoundingClientRect:()=>({width:1100,height:620})});
  game.start({sound:false,...options});return {game,ctx};
}
const physicsSnapshot=game=>JSON.stringify({body:game.body,soul:game.soul,energy:game.energy,form:game.form,platforms:game.level.platforms,lamps:game.lanterns,memories:game.memories,pads:game.pads,hazards:game.hazards});
const hasCircle=(view,x,y,minRadius)=>view.clearZones.some(zone=>zone.x===x&&zone.y===y&&zone.r>=minRadius);

test('all sixteen stages draw their explicit scene backdrop between the sky and world objects without mutating gameplay',()=>{
  assert.equal(cases.length,16);
  for(const {sceneId,options} of cases){
    const {game,ctx}=makeGame(options);game.camera=180;game.lanterns[0].lit=true;
    const view=game.getSceneBackdropView(),before=physicsSnapshot(game);
    assert.equal(view.sceneId,sceneId);assert.equal(view.cameraX,180);assert.equal(view.worldWidth,game.level.width);assert.equal(view.viewport.width,game.viewWidth);assert.equal(view.litSeals,1);assert.equal(view.palette,game.level.theme);assert.equal(view.seasonId,options.festival?.id||null);
    const direct=makeContext();(game.isStationFinish()?drawStationBackdrop:drawSceneBackdrop)(direct,view,2.5,false);direct.balanced();assert.ok(direct.calls.length>20,'the scene layer was empty');
    ctx.reset();game.drawBackground(ctx,game.viewWidth,640,2.5);ctx.balanced();
    const actual=JSON.stringify(ctx.calls),expected=JSON.stringify(direct.calls).slice(1,-1);
    const backdropAt=actual.indexOf(expected);assert.ok(backdropAt>=0,`${sceneId} backdrop was not invoked by drawBackground`);
    assert.ok(ctx.calls.some(call=>call[0]==='createLinearGradient'),'the background must paint its sky gradient');
    const layers=[],original=game.drawBackground.bind(game);game.drawBackground=(...args)=>{layers.push('background');return original(...args);};
    const originalPlatform=game.drawPlatform.bind(game);game.drawPlatform=(...args)=>{layers.push('platform');return originalPlatform(...args);};
    ctx.reset();game.visualTime=2.5;game.render();ctx.balanced();assert.ok(layers.indexOf('background')<layers.indexOf('platform'));
    assert.equal(physicsSnapshot(game),before,'a decorative backdrop changed gameplay state');game.destroy();
  }
});

test('Halloween preserves each main chapter palette while dedicated festivals and other seasonal themes keep their own colors',()=>{
  const skies=new Set();
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
    const {game}=makeGame({chapterIndex}),original=structuredClone(game.level.theme),before=physicsSnapshot(game);
    game.setSeason({id:'halloween'});assert.deepEqual(game.level.theme,original);assert.equal(game.getSceneBackdropView().seasonId,'halloween');assert.equal(game.getOutfitId(),'halloween');skies.add(game.level.theme.sky.join());
    assert.equal(physicsSnapshot(game),before);game.setSeason(null);assert.deepEqual(game.level.theme,original);game.destroy();
  }
  assert.equal(skies.size,6,'Halloween flattened the six chapters to one palette');
  for(const id of FESTIVAL_VISUAL_IDS){
    const {game}=makeGame({festival:{id},season:{id:'halloween'}});assert.deepEqual(game.level.theme,getFestivalTheme(id));assert.equal(game.getSceneBackdropView().seasonId,id);game.destroy();
    if(id!=='halloween'){
      const {game:story}=makeGame({chapterIndex:1,season:{id}}),theme=getFestivalTheme(id);
      for(const key of ['sky','light','spirit','accent'])assert.deepEqual(story.level.theme[key],theme[key]);assert.equal(story.level.theme.motif,'garden');story.destroy();
    }
  }
});

test('backdrop exclusion circles follow real world interactions, collected memories and the active borrowing stage',()=>{
  const {game}=makeGame({festival:{id:'halloween'}});let view=game.getSceneBackdropView();
  for(const lamp of game.lanterns)assert.ok(hasCircle(view,lamp.x,lamp.y,70));
  for(const memory of game.memories)assert.ok(hasCircle(view,memory.x,memory.y,50));
  for(const plate of game.level.plates)assert.ok(hasCircle(view,plate.x+plate.w/2,plate.y-13,plate.w/2));
  for(const npc of game.level.npcs)assert.ok(hasCircle(view,npc.x,npc.y-78,85));
  const initial=structuredClone(view.clearZones);game.camera=500;assert.deepEqual(game.getSceneBackdropView().clearZones,initial,'world exclusions must not be pre-scrolled');
  game.memories[0].collected=true;view=game.getSceneBackdropView();assert.equal(hasCircle(view,game.memories[0].x,game.memories[0].y,1),false);
  game.body.x=330;game.update(1/60);game.toggleSoul();game.soul.x=245;game.soul.y=355;view=game.getSceneBackdropView();
  assert.ok(hasCircle(view,game.soul.x,game.soul.y,45));assert.ok(hasCircle(view,330,game.body.y-36,50));
  const activity=game.capActivity.getView();assert.equal(activity.active,true);
  for(const bell of activity.switches)assert.ok(hasCircle(view,bell.x,bell.y,45));
  for(const target of activity.destinations)assert.ok(hasCircle(view,target.x,target.y+12,55));
  assert.ok(view.clearZones.length<40);for(const circle of view.clearZones)assert.ok(Number.isFinite(circle.x)&&Number.isFinite(circle.y)&&Number.isFinite(circle.r)&&circle.r>0);
  game.destroy();
  const {game:finalChapter}=makeGame({chapterIndex:5});finalChapter.update(1/60);const moving=finalChapter.getSceneBackdropView();
  for(const platform of finalChapter.movers)assert.ok(hasCircle(moving,platform.x+platform.w/2,platform.y-8,60));
  for(const hazard of finalChapter.hazards)assert.ok(hasCircle(moving,hazard.px,hazard.py,hazard.r+20));finalChapter.destroy();
});

test('reduced-motion scene rendering is identical at different presentation times in all sixteen stages',()=>{
  for(const {options} of cases){
    const {game,ctx}=makeGame({...options,season:{id:'halloween'},reducedMotion:true});
    game.visualTime=1;ctx.reset();game.render();ctx.balanced();const first=JSON.stringify(ctx.calls);
    game.visualTime=99;ctx.reset();game.render();ctx.balanced();assert.equal(JSON.stringify(ctx.calls),first);game.destroy();
  }
});

test('Halloween has no duplicate foreground weather and its sparse stationary pumpkins sit on unobstructed ground',()=>{
  let pumpkinCount=0;
  for(const options of [...mainScenes.map((_,chapterIndex)=>({chapterIndex,season:{id:'halloween'}})),{festival:{id:'halloween'}}]){
    const {game,ctx}=makeGame(options);ctx.reset();drawFestivalWeather(game,ctx,game.viewWidth,640,4);assert.deepEqual(ctx.calls,[],'Halloween weather must be drawn only by the distant backdrop');
    for(const camera of [0,game.level.width-game.viewWidth]){
      game.camera=camera;ctx.reset();drawFestivalProps(game,ctx,3);ctx.balanced();
      const pumpkins=ctx.painted.filter(item=>item.style?.stops?.[0]?.[1]==='#eba267');assert.ok(pumpkins.length<=5,'ground pumpkins are too repetitive in one viewport');pumpkinCount+=pumpkins.length;
      for(const pumpkin of pumpkins){
        const x=pumpkin.matrix[4],y=pumpkin.matrix[5],r=pumpkin.rx;
        assert.equal(y,559);assert.ok(game.level.platforms.some(p=>p.kind==='ground'&&x-r>=p.x&&x+r<=p.x+p.w),'pumpkin was floating over a gap');
        for(const plate of game.level.plates)assert.ok(x+r<plate.x||x-r>plate.x+plate.w,'pumpkin covered a copper plate');
        for(const pad of game.level.pads)assert.ok(x+r<pad.x||x-r>pad.x+pad.w,'pumpkin covered a spring pad');
        for(const npc of game.level.npcs||[])assert.ok(Math.abs(x-npc.x)>80,'pumpkin covered a festival host');
        assert.ok(Math.abs(x-game.capActivity.layout.anchor.x)>74,'pumpkin covered the borrowing ring');
      }
      const positions=pumpkins.map(item=>item.matrix.slice(4));game.body.x+=33;ctx.reset();drawFestivalProps(game,ctx,8);
      assert.deepEqual(ctx.painted.filter(item=>item.style?.stops?.[0]?.[1]==='#eba267').map(item=>item.matrix.slice(4)),positions,'walking made the fixed scenery pop in and out');
    }
    game.destroy();
  }
  assert.ok(pumpkinCount>0,'all existing ground props were removed');
  for(const id of FESTIVAL_VISUAL_IDS.filter(id=>id!=='halloween')){
    const {game,ctx}=makeGame({festival:{id}});ctx.reset();drawFestivalWeather(game,ctx,game.viewWidth,640,3);ctx.balanced();assert.ok(ctx.calls.length>20,`${id} lost its existing weather`);game.destroy();
  }
});
