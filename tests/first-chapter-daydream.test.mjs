import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { getDaydreamFaceView, drawFirstChapterDaydreamFace, drawFirstChapterThoughtRibbon, drawFirstChapterThoughtRim, isFirstChapterDaydream } from '../dist/dream-ashi-daydream.js';
import { CAP_GRIP } from '../dist/dream-cap-art.js';

const noop = () => {};
globalThis.window = {devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document = {hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;

function fakeCanvas(){
  const log=[],stack=[];
  const ctx={globalAlpha:1,fillStyle:'#000',strokeStyle:'#000',lineWidth:1,lineCap:'butt',lineJoin:'miter',log,
    save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,lineCap:this.lineCap,lineJoin:this.lineJoin});log.push(['save']);},
    restore(){const prev=stack.pop();assert.ok(prev,'unbalanced canvas restore');Object.assign(this,prev);log.push(['restore']);},
    balanced(){assert.equal(stack.length,0);},
    createLinearGradient(...coords){return {kind:'linear',coords,stops:[],addColorStop(p,c){this.stops.push([p,c]);}};},
    createRadialGradient(...coords){return {kind:'radial',coords,stops:[],addColorStop(p,c){this.stops.push([p,c]);}};},
    ellipse(...args){log.push(['ellipse',...args]);},
    transform(...args){log.push(['transform',...args]);},
    measureText(x){return {width:String(x).length*8};},
  };
  return new Proxy(ctx,{get(target,key){if(key in target)return target[key];return (...args)=>{for(const x of args){if(typeof x==='number')assert.ok(Number.isFinite(x),String(key));}log.push([String(key),...args]);};}});
}
function make(options={}){const c=fakeCanvas();const game=new DreamGame({getContext:()=>c,getBoundingClientRect:()=>({width:390,height:600})});game.start({sound:false,chapterIndex:0,...options});return{game,c};}
const physics=g=>JSON.parse(JSON.stringify({body:g.body,soul:g.soul,cap:g.cap,form:g.form,energy:g.energy,
  runId:g.runId,deaths:g.deaths,lanterns:g.lanterns,memories:g.memories,firstTicket:g.firstTicket,checkpoint:g.checkpoint,movers:g.movers,time:g.time}));

test('first chapter is explicit production opt-in, not a hidden change to all six chapters, ten festivals or legacy studies',()=>{
  const {game:g}=make();
  assert.equal(isFirstChapterDaydream(g),false);
  g.daydreamFirstChapter=true;assert.equal(isFirstChapterDaydream(g),true);
  for(const chapterIndex of [1,2,3,4,5]){g.chapterIndex=chapterIndex;assert.equal(isFirstChapterDaydream(g),false);}
  for(const mode of ['festival','survivor',null]){g.mode=mode;g.chapterIndex=0;assert.equal(isFirstChapterDaydream(g),false);}
  g.destroy();
});

test('the real head-space painter replaces the skeletal socket/teeth palette, preserves the old matrix and paints a continuous face through opening',()=>{
  const {game:g,c}=make();g.daydreamFirstChapter=true;g.body.invulnerable=0;
  for(const phase of ['closed','opening','open','returning']){
    g.cap.phase=phase;
    for(const energy of [19,20,100]){
      g.energy=energy;g.emoteTime=energy===100?2:0;c.log.length=0;
      assert.equal(drawFirstChapterDaydreamFace(c,g,g.body,.75,null),true);
      c.balanced();
      assert.ok(c.log.some(row=>row[0]==='save'));
      assert.equal(c.log.some(row=>row[0]==='transform'),false,'head-space face cannot change rig/world matrix');
      assert.equal(c.log.filter(row=>row[0]==='ellipse').length>2,true);
    }
  }
  const v=getDaydreamFaceView(g,g.body,.75);assert.equal(typeof v.blink,'number');assert.equal(Object.isFrozen(v),true);
  g.destroy();
});

test('a visible ribbon keeps the original real CAP_GRIP and capLocalMatrix for both directions and each open fraction',()=>{
  const {game:g,c}=make();g.daydreamFirstChapter=true;
  for(const face of [-1,1])for(const open of [0,.01,.4,1]){
    g.body.face=face;g.capOpen=open;
    const p=g.getCharacterPresentation(.52);c.log.length=0;
    assert.equal(drawFirstChapterThoughtRibbon(c,g,.52,p.rig,'auto'),true);
    c.balanced();
    assert.ok(c.log.some(row=>row[0]==='transform'&&row.slice(1).every((x,i)=>x===p.rig.capLocalMatrix[i])));
    assert.ok(c.log.some(row=>row[0]==='ellipse'&&row[1]===CAP_GRIP.x&&row[2]===CAP_GRIP.y));
    assert.equal(drawFirstChapterThoughtRim(c,g),true);
    c.balanced();
  }
  g.destroy();
});

test('reduced motion freezes the face and ribbon across any two render times, but keeps the real open/closed shapes',()=>{
  const {game:g,c}=make({reducedMotion:true});g.daydreamFirstChapter=true;
  const p=g.getCharacterPresentation();
  function paint(t){c.log.length=0;drawFirstChapterDaydreamFace(c,g,g.body,t,null);drawFirstChapterThoughtRibbon(c,g,t,p.rig,'auto');c.balanced();return JSON.stringify(c.log);}
  for(const openness of [0,1]){g.capOpen=openness;assert.equal(paint(0),paint(932),'reduced-motion drawing time drift');}
  g.destroy();
});

test('the production DreamGame draw dispatches to new first-chapter art only when explicitly selected; all physics/controls are byte-equal to the default route',()=>{
  const base=make(),study=make();study.game.daydreamFirstChapter=true;
  for(let n=0;n<240;n++){
    const dir=n%70<40?1:n%70<57?-1:0;
    base.game.setInput({x:dir,y:0});study.game.setInput({x:dir,y:0});
    if(n===50||n===110||n===175){assert.equal(base.game.toggleSoul(),study.game.toggleSoul());}
    if(n===195){base.game.recall();study.game.recall();}
    base.game.update(1/60);study.game.update(1/60);
    if(n%10===0){base.game.render();study.game.render();}
    assert.deepEqual(physics(study.game),physics(base.game),`actual physics changed at frame ${n}`);
  }
  assert.notDeepEqual(study.c.log,base.c.log,'native production renderer must visibly change the actual first chapter');
  base.game.destroy();study.game.destroy();
});

test('out-of-scope painters leave context untouched and do not mutate game/soul facts',()=>{
  const {game:g,c}=make();
  const before=JSON.stringify(physics(g));
  assert.equal(drawFirstChapterDaydreamFace(c,g,g.body,.4,null),false);
  assert.equal(drawFirstChapterThoughtRibbon(c,g,.4,g.getCharacterPresentation().rig),false);
  assert.equal(drawFirstChapterThoughtRim(c,g),false);
  assert.deepEqual(c.log,[]);
  g.daydreamFirstChapter=true;
  Object.freeze(g.body);const bodyBefore=JSON.stringify(g.body);
  drawFirstChapterDaydreamFace(c,g,g.body,.4,{x:40});assert.equal(JSON.stringify(g.body),bodyBefore);
  assert.equal(JSON.stringify(physics(g)),before);
  c.balanced();g.destroy();
});
