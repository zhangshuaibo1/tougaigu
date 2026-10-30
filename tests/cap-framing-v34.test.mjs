import test from 'node:test';
import assert from 'node:assert/strict';
import {DreamGame} from '../dist/dream-engine.js';
import {FESTIVAL_LEVELS} from '../dist/dream-festival-levels.js';
import {getCapFramingBounds,getCapFramingView,isCapFramingScene,accumulateCameraFollow,resolveCapFramingCamera} from '../dist/dream-cap-framing.js';

const noop=()=>{},clone=x=>JSON.parse(JSON.stringify(x));
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const gradient=()=>({addColorStop:noop});
function make({width=320,height=431,...options}={}){
  let dimensions={width,height};
  const c=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient,measureText:text=>({width:String(text).length*8})},{get:(o,k)=>k in o?o[k]:noop});
  const g=new DreamGame({getContext:()=>c,getBoundingClientRect:()=>dimensions});g.start({sound:false,outfit:'halloween',...options});g.render();
  return {g,resize(w,h){dimensions={width:w,height:h};g.resize();}};
}
const physical=g=>clone({body:g.body,soul:g.soul,companion:g.companion,cap:g.cap,form:g.form,state:g.state,input:g.input,
  time:g.time,visualTime:g.visualTime,energy:g.energy,runId:g.runId,deaths:g.deaths,memories:g.memories,lanterns:g.lanterns,
  checkpoint:g.checkpoint,movers:g.movers,hazards:g.hazards,pads:g.pads,firstTicket:g.firstTicket});
const step=(g,n=1,render=true)=>{for(let i=0;i<n;i++){g.update(1/60);if(render)g.render();}};
function fly(g,x,y){
  for(let i=0;i<600;i++){
    const dx=x-g.soul.x,dy=y-g.soul.y;
    if(Math.hypot(dx,dy)<1&&Math.hypot(g.soul.vx,g.soul.vy)<2){g.setInput({x:0,y:0});step(g,24);return;}
    g.setInput({x:Math.max(-1,Math.min(1,dx/65)),y:Math.max(-1,Math.min(1,dy/65))});step(g);
  }throw Error('normal input did not arrive');
}
function openNear(g){g.toggleSoul();step(g,44);fly(g,258,422);step(g,90);}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);

test('narrow ordinary play keeps the real cap, outfit and supporting hands inside the same whole-scene camera',()=>{
  for(const [width,height] of [[320,431],[390,595]]){
    const {g}=make({width,height});openNear(g);
    assert.equal(g.capFramingView.active,true);assert.equal(g.getOutfitId(),'halloween');
    for(const part of ['cap','hat','hands']){
      const b=g.capFramingView.bounds[part];assert.ok((b.left-g.camera)*g.scale>=7.8,part+' left clearance');
      assert.ok((b.right-g.camera)*g.scale<=width-7.8,part+' right clearance');
    }
    assert.equal(g.body.x,105);assert.equal(g.body.y,560);assert.equal(g.deaths,0);assert.equal(g.memories[0].collected,true);
    const p=g.getCharacterPresentation();near(Math.hypot(p.arms.left.world.x-p.rig.gripWorld.x,p.arms.left.world.y-p.rig.gripWorld.y),0);
    const oldTarget=g.soul.x-g.viewWidth*.43;assert.ok(g.camera<oldTarget-10,'near cap gets actual room');g.destroy();
  }
});

test('fixed-step follow composition has one budget, exact legacy fallthrough and no invented render time',()=>{
  for(const count of [1,2,6,12]){
    let camera=80,follow=null,product=1,weighted=0;
    for(let i=0;i<count;i++){
      const amount=5.5/60,target=150+i*5;
      follow=accumulateCameraFollow(follow,camera,amount);camera+=(target-camera)*amount;
      product*=1-amount;weighted=weighted*(1-amount)+target*amount;
    }
    near(follow.decay,product);near(camera,80*product+weighted);
    assert.equal(resolveCapFramingCamera(camera,follow,null),camera);
    assert.equal(resolveCapFramingCamera(camera,follow,{active:true,low:0,high:500}),camera);
    near(resolveCapFramingCamera(camera,follow,{active:true,low:0,high:60}),80*product+60*(1-product));
    assert.equal(resolveCapFramingCamera(camera,null,{active:true,low:0,high:60}),camera);
  }
});

test('the frame reuses its exact character and soul; repeated, nested and failed rendering cannot spend an old follow budget',()=>{
  const {g}=make();openNear(g);g.setInput({x:.2,y:0});step(g,6,false);
  let characterReads=0,soulReads=0,frameCharacter,frameSoul;
  const character=g.getCharacterPresentation.bind(g),soul=g.getSoulPresentation.bind(g),draw=g.drawCharacter.bind(g),background=g.drawBackground.bind(g);
  g.getCharacterPresentation=(...args)=>{characterReads++;return frameCharacter=character(...args);};
  g.getSoulPresentation=(p)=>{soulReads++;assert.strictEqual(p,frameCharacter);return frameSoul=soul(p);};
  g.drawCharacter=(c,b,t,s,p)=>{assert.strictEqual(s,frameSoul);assert.strictEqual(p,frameCharacter);return draw(c,b,t,s,p);};
  const before=physical(g);g.render();assert.deepEqual(physical(g),before);assert.equal(characterReads,1);assert.equal(soulReads,1);assert.equal(g.capCameraFollow,null);
  const camera=g.camera;g.render();assert.equal(g.camera,camera,'a second render has no fixed-step budget');
  // Existing v33 independently verifies the cat receives the identical shown object.
  g.drawCharacter=draw;g.getSoulPresentation=soul;g.getCharacterPresentation=character;
  let reentered=false;g.drawBackground=(...args)=>{if(!reentered){reentered=true;const outer=g.camera;g.render();assert.equal(g.camera,outer);}return background(...args);};
  g.render();assert.equal(g.capCameraFollow,null);g.drawBackground=background;
  step(g,2,false);assert.ok(g.capCameraFollow);g.getCharacterPresentation=()=>{throw Error('pose failed');};
  assert.throws(()=>g.render(),/pose failed/);assert.equal(g.capCameraFollow,null);g.getCharacterPresentation=character;
  const afterFailure=g.camera;g.render();assert.equal(g.camera,afterFailure,'a failed frame cannot replay its accumulated movement');g.destroy();
});

test('resize resolves the first frame with one projection while paused time and all physical state remain frozen',()=>{
  const {g,resize}=make({width:1280,height:640});openNear(g);assert.equal(g.capFramingView,null);
  g.pause();const paused=physical(g);
  for(const [width,height] of [[390,595],[320,431],[390,595]]){
    resize(width,height);g.render();assert.deepEqual(physical(g),paused);assert.equal(g.capFramingView.active,true);
    const left=(g.capFramingView.bounds.left-g.camera)*g.scale;assert.ok(left>=8-1e-8,'first resized frame must fit');
    const camera=g.camera;step(g,12);assert.equal(g.camera,camera);assert.deepEqual(physical(g),paused);
  }g.destroy();
});

test('near/far transition keeps normal soul travel and has a geometric hysteresis band',()=>{
  const {g}=make({width:390,height:595});openNear(g);const start=g.camera;
  g.setInput({x:1,y:0});let leftNear=false,previous=g.camera;
  for(let i=0;i<45;i++){
    step(g);const maximum=Math.abs((g.soul.x-g.viewWidth*.43)-previous)*5.5/60+1e-8;
    assert.ok(Math.abs(g.camera-previous)<=maximum+1,'ordinary transition must retain the original follow scale');
    if(!g.capFramingView?.active)leftNear=true;previous=g.camera;
  }
  assert.ok(leftNear);assert.ok(g.camera>start+70);assert.equal(g.body.x,105);
  g.setInput({x:0,y:0});fly(g,258,422);step(g,90);assert.equal(g.capFramingView.active,true);
  const p=g.getCharacterPresentation(),s=g.getSoulPresentation(p),base=getCapFramingView(g,p,s,{wasActive:true});assert.ok(base.active);
  // Preserve the same visible actors, varying only available geometric room.
  const synthetic={...g,getOutfitId:()=>g.getOutfitId(),camera:0,viewWidth:base.bounds.right-base.bounds.left+16/g.scale+16/g.scale};
  assert.equal(getCapFramingView(synthetic,p,s,{wasActive:false}).active,false);
  assert.equal(getCapFramingView(synthetic,p,s,{wasActive:true}).active,true);g.destroy();
});

test('opening, return, immediate reversal and both facings preserve every gameplay field',()=>{
  for(const face of [-1,1]){
    const {g}=make(),{g:unpainted}=make();
    // Reach a left-facing position through ordinary body input, not changed poses.
    if(face<0)for(const value of [g,unpainted]){value.setInput({x:1,y:0});step(value,50,false);value.setInput({x:-1,y:0});step(value,20,false);value.setInput({x:0,y:0});step(value,20,false);}
    for(const value of [g,unpainted])value.toggleSoul();
    for(let i=0;i<110;i++){
      if(i===45||i===55||i===73){g.toggleSoul();unpainted.toggleSoul();}
      g.update(1/60);unpainted.update(1/60);const before=physical(g);g.render();assert.deepEqual(physical(g),before);assert.deepEqual(physical(g),physical(unpainted));
    }
    assert.equal(g.body.face,face);g.destroy();unpainted.destroy();
  }
});

test('near return around275 reenters naturally after far flight instead of stranding a visible traveler at the edge',()=>{
  for(const target of [265,275,282]){
    const {g}=make({width:390,height:595});openNear(g);fly(g,480,422);assert.equal(g.capFramingView.active,false);
    const readings=[];const paint=g.drawBackground.bind(g);
    g.drawBackground=(...args)=>{readings.push({camera:g.camera,active:g.capFramingView?.active});return paint(...args);};
    fly(g,target,422);step(g,120);assert.equal(g.capFramingView.active,true,'a visible body center must return to near framing at '+target);
    assert.ok((g.capFramingView.bounds.hat.left-g.camera)*g.scale>=7.5);assert.equal(g.body.x,105);assert.equal(g.deaths,0);
    const first=readings.findIndex(r=>r.active);assert.ok(first>=0);assert.ok(readings.slice(first).every(r=>r.active),'reentry must not alternate around the boundary');
    assert.ok(readings.slice(first+1).every((r,i)=>Math.abs(r.camera-readings[first+i].camera)<8),'reentry keeps the original smooth follow');g.destroy();
  }
});

test('body-center reentry is symmetric, includes the old18 boundary, and rejects a genuinely offscreen body',()=>{
  const {g}=make({width:390,height:595});openNear(g);const p=clone(g.getCharacterPresentation()),shown=g.getSoulPresentation(),shift=595;
  for(const name of ['bodyMatrix','headMatrix','capMatrix'])p.rig[name][4]+=shift;
  const body={...g.body,x:g.body.x+shift},s={...shown,x:shown.x+shift};
  for(const center of [-.1,0,7,17.9,18.1,g.viewWidth-18.1,g.viewWidth-7,g.viewWidth,g.viewWidth+.1]){
    const input={...g,body,camera:body.x-center,getOutfitId:()=>g.getOutfitId()};
    const v=getCapFramingView(input,p,s);assert.equal(v.active,center>=0&&center<=g.viewWidth,'visible center '+center);
  }g.destroy();
});

test('desktop, all festival modes and activity framing retain original camera behavior without a borrowed budget',()=>{
  for(const options of [{width:1280,height:640},...FESTIVAL_LEVELS.map(l=>({festival:{id:l.festivalId}}))]){
    const {g}=make(options);g.toggleSoul();g.setInput({x:.5,y:-.4});
    for(let i=0;i<60;i++){g.update(1/60);const camera=g.camera;g.render();assert.equal(g.camera,camera);assert.equal(g.capCameraFollow,null);assert.equal(g.capFramingView,null);}g.destroy();
  }
  const {g}=make();g.setInput({x:1,y:0});step(g,55);g.setInput({x:0,y:0});step(g,20);g.toggleSoul();step(g,44);
  g.capCameraFollow={start:999,decay:.1};
  // The existing activity owns its real table bounds once it starts.
  g.capActivity.started=true;g.render();assert.equal(g.activityFramed,true);assert.equal(g.capCameraFollow,null);assert.equal(g.capFramingView,null);
  const activityCamera=g.camera;g.render();assert.equal(g.camera,activityCamera);g.recall();g.render();assert.equal(g.activityFramed,false);assert.equal(g.capCameraFollow,null);g.destroy();
});

test('reduced motion uses the existing immediate target and pause cannot add a camera animation',()=>{
  const {g}=make({width:390,height:595});openNear(g);g.setReducedMotion(true);step(g);
  near(g.camera,Math.max(g.capFramingView.low,Math.min(g.capFramingView.high,g.soul.x-g.viewWidth*.43)));
  g.pause();const before=physical(g),camera=g.camera;step(g,60);assert.equal(g.camera,camera);assert.deepEqual(physical(g),before);g.destroy();
});

test('invalid or impossible world-edge context fails closed without moving the traveler or widening the world',()=>{
  const {g}=make();openNear(g);const p=g.getCharacterPresentation(),s=g.getSoulPresentation(p),before=physical(g);
  for(const bad of [null,{}, {...g,scale:NaN},{...g,mode:'festival'},{...g,cssWidth:481},{...g,destroyed:true},{...g,getOutfitId:null}])assert.equal(isCapFramingScene(bad),false);
  for(const bad of [null,{}, {...p,rig:{...p.rig,capMatrix:[1,0,0,1,NaN,0]}}])assert.equal(getCapFramingBounds(bad,s,'halloween'),null);
  assert.equal(getCapFramingBounds(p,{...s,x:Infinity},'halloween'),null);
  const edge={...g,camera:0,body:{...g.body,x:20},getOutfitId:()=>g.getOutfitId()},edgePose=clone(p);
  for(const name of ['bodyMatrix','headMatrix','capMatrix'])edgePose.rig[name][4]-=85;
  const v=getCapFramingView(edge,edgePose,{...s,x:s.x-85},{wasActive:true});assert.equal(v.active,false);assert.equal(v.reason,'cannot-share');
  assert.equal(resolveCapFramingCamera(g.camera,{start:0,decay:.5},v),g.camera);assert.deepEqual(physical(g),before);g.destroy();
});
