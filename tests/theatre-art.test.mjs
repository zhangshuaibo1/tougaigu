import test from 'node:test';
import assert from 'node:assert/strict';
import {getTheatreDockingOverlaps,drawTheatrePlatform,drawTheatreRigging} from '../dist/dream-theatre-art.js';
import {getDreamLevel} from '../dist/dream-levels.js';

function context(){
  let values={fillStyle:'#123456',strokeStyle:'#abcdef',lineWidth:4,globalAlpha:.61,lineCap:'square',lineJoin:'bevel'},clip=null,path=[];
  const stack=[],calls=[],paints=[];
  const clone=value=>value?.stops?{args:[...value.args],stops:value.stops.map(stop=>[...stop])}:value;
  const record=(name,args=[])=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),'finite Canvas coordinates');calls.push([name,...args.map(clone)]);};
  const api={calls,paints,fail:false,
    snapshot:()=>({values:{...values},clip:clip&&[...clip]}),
    balanced:()=>assert.equal(stack.length,0,'balanced Canvas state'),
    save(){stack.push(this.snapshot());record('save');},
    restore(){assert.ok(stack.length);const state=stack.pop();values=state.values;clip=state.clip;record('restore');},
    beginPath(){path=[];record('beginPath');},
    rect(...args){path.push(args);record('rect',args);},
    clip(){assert.ok(path.length);clip=[...path.at(-1)];record('clip',clip);},
    fill(){paints.push({clip:clip&&[...clip]});record('fill',[values.fillStyle]);},
    stroke(){assert.ok(values.lineWidth>0);paints.push({clip:clip&&[...clip]});record('stroke',[values.strokeStyle,values.lineWidth]);},
    fillRect(...args){paints.push({clip:clip&&[...clip]});record('fillRect',[...args,values.fillStyle]);},
    moveTo(...args){record('moveTo',args);},lineTo(...args){record('lineTo',args);},bezierCurveTo(...args){record('bezierCurveTo',args);},quadraticCurveTo(...args){record('quadraticCurveTo',args);},closePath(){record('closePath');},
    ellipse(...args){assert.ok(args[2]>=0&&args[3]>=0);record('ellipse',args);},
    roundRect(...args){assert.ok(args[2]>0&&args[3]>0&&args[4]>=0&&args[4]<=Math.min(args[2],args[3])/2);record('roundRect',args);},
    createLinearGradient(...args){if(this.fail)throw new Error('unavailable context');record('gradient',args);return {args,stops:[],addColorStop(offset,color){assert.ok(offset>=0&&offset<=1);this.stops.push([offset,color]);}};},
  };
  return new Proxy(api,{get:(target,key)=>key in target?target[key]:values[key],set(target,key,value){if(key in target)target[key]=value;else values[key]=value;return true;}});
}

const level=getDreamLevel(2),base=level.movers[0];
const stage=x=>({...base,x,baseX:base.x,baseY:base.y,dx:0,dy:0});

test('docking is the true same-height positive overlap, including both authored banks',()=>{
  assert.deepEqual(getTheatreDockingOverlaps(stage(695),level.platforms),[{x:695,y:465,w:90,platformIndex:2}]);
  assert.deepEqual(getTheatreDockingOverlaps(stage(940),level.platforms),[]);
  assert.deepEqual(getTheatreDockingOverlaps(stage(1185),level.platforms),[{x:1185,y:465,w:170,platformIndex:3}]);
  assert.deepEqual(getTheatreDockingOverlaps(stage(785),level.platforms),[],'departed left bank must not keep its light');
  assert.deepEqual(getTheatreDockingOverlaps(stage(945),level.platforms),[],'touching the right bank is not an overlap');
  assert.deepEqual(getTheatreDockingOverlaps(stage(946),level.platforms),[{x:1130,y:465,w:1,platformIndex:3}]);
  assert.deepEqual(getTheatreDockingOverlaps({...stage(695),y:464},level.platforms),[],'an above/below platform is not docked');
  assert.deepEqual(getTheatreDockingOverlaps(stage(695),[...level.platforms,stage(695)]),[{x:695,y:465,w:90,platformIndex:2}],'another moving stage is not a fixed bank');
});

test('overlap queries reject corrupt geometry and return independent copied data',()=>{
  const p=Object.freeze(stage(695)),banks=level.platforms.map(bank=>Object.freeze({...bank})),before=JSON.stringify([p,banks]);
  const result=getTheatreDockingOverlaps(p,Object.freeze(banks));result[0].x=-100;
  assert.equal(JSON.stringify([p,banks]),before);
  for(const bad of [null,{}, {...p,kind:'book'},{...p,x:NaN},{...p,h:0},{...p,x:Number.MAX_VALUE,w:Number.MAX_VALUE}])assert.deepEqual(getTheatreDockingOverlaps(bad,banks),[]);
  assert.deepEqual(getTheatreDockingOverlaps(p,null),[]);
  assert.deepEqual(getTheatreDockingOverlaps(p,[{...banks[2],w:-1},{...banks[2],y:Infinity}]),[]);
});

test('every material is confined to its physical platform and retains an exact y top',()=>{
  const samples=[...level.platforms,stage(695),stage(1185),{x:50.25,y:80.125,w:.5,h:.25}];
  for(const source of samples){
    const p=Object.freeze({...source}),before=JSON.stringify(p),c=context(),state=c.snapshot();
    assert.equal(drawTheatrePlatform(c,p,{camera:0,viewWidth:2260,platforms:level.platforms,movers:[stage(695)]}),true);
    c.balanced();assert.deepEqual(c.snapshot(),state);assert.equal(JSON.stringify(p),before);assert.ok(c.paints.length);
    for(const paint of c.paints)assert.deepEqual(paint.clip,[p.x,p.y,p.w,p.h],'no faux lip, sideways overhang or material escapes the collision rectangle');
    assert.ok(c.calls.some(call=>call[0]==='fillRect'&&call[1]===p.x&&call[2]===p.y&&call[3]===p.w&&call[4]===Math.min(1,p.h)),'the visible landing edge is p.y');
  }
});

test('unsupported or corrupt drawing inputs cleanly decline; offscreen work is bounded',()=>{
  const p=stage(695);
  for(const bad of [null,{}, {...p,kind:'book'},{...p,w:0},{...p,y:NaN},{...p,x:Infinity}]){const c=context();assert.equal(drawTheatrePlatform(c,bad),false);assert.equal(c.calls.length,0);}
  assert.equal(drawTheatrePlatform(null,p),false);
  for(const options of [{camera:NaN},{viewWidth:0},{viewWidth:NaN}]){const c=context();assert.equal(drawTheatrePlatform(c,p,options),false);assert.equal(c.calls.length,0);}
  const hidden=context();assert.equal(drawTheatrePlatform(hidden,p,{camera:2000,viewWidth:320}),true);assert.equal(hidden.calls.length,0);
  const huge=context();assert.equal(drawTheatrePlatform(huge,{x:-1e8,y:560,w:2e8,h:100,kind:'ground'},{camera:15000,viewWidth:1100}),true);huge.balanced();assert.ok(huge.calls.length<3500,'offscreen apron detail must not scale with world size');
});

test('camera movement does not slide the same fixed timber grain across world space',()=>{
  const p={x:0,y:560,w:2200,h:100,kind:'ground'},a=context(),b=context();
  drawTheatrePlatform(a,p,{camera:0,viewWidth:1100});drawTheatrePlatform(b,p,{camera:150,viewWidth:1100});
  const visible=c=>c.calls.filter(call=>call[0]==='roundRect'&&call[1]>200&&call[1]<900);
  assert.ok(visible(a).length);assert.deepEqual(visible(a),visible(b));
});

test('unchanged platform and rigging positions paint deterministically without mutating views',()=>{
  for(const x of [695,940,1185]){
    const p=Object.freeze(stage(x)),view=Object.freeze({movers:Object.freeze([p]),camera:500,viewWidth:1100}),before=JSON.stringify(view);
    const a=context(),b=context(),state=a.snapshot();
    assert.equal(drawTheatreRigging(a,view),true);assert.equal(drawTheatreRigging(b,view),true);
    assert.deepEqual(a.calls,b.calls,'same position cannot advance pulley or cable animation');a.balanced();assert.deepEqual(a.snapshot(),state);assert.equal(JSON.stringify(view),before);
    const pa=context(),pb=context();drawTheatrePlatform(pa,p,{platforms:level.platforms});drawTheatrePlatform(pb,p,{platforms:level.platforms});assert.deepEqual(pa.calls,pb.calls);
  }
  const left=context(),right=context();drawTheatreRigging(left,{movers:[stage(695)]});drawTheatreRigging(right,{movers:[stage(1185)]});assert.notDeepEqual(left.calls,right.calls,'actual stage motion must move the suspension and wheel spokes');
});

test('rigging rejects invalid views, skips invalid/offscreen stages, and limits work',()=>{
  assert.equal(drawTheatreRigging(null,{movers:[stage(695)]}),false);
  for(const view of [{movers:null},{camera:NaN},{viewWidth:-1}]){const c=context();assert.equal(drawTheatreRigging(c,view),false);assert.equal(c.calls.length,0);}
  for(const movers of [[],[null,{}, {...stage(695),kind:'book'}],[{...stage(695),baseX:Number.MAX_VALUE,range:Number.MAX_VALUE}]]){
    const c=context();assert.equal(drawTheatreRigging(c,{movers}),true);c.balanced();assert.equal(c.paints.length,0);
  }
  const c=context();assert.equal(drawTheatreRigging(c,{movers:[stage(695)],camera:2000,viewWidth:320}),true);assert.equal(c.paints.length,0);
});

test('a Canvas failure requests fallback and still restores the caller state',()=>{
  for(const paint of [c=>drawTheatrePlatform(c,stage(695),{platforms:level.platforms}),c=>drawTheatreRigging(c,{movers:[stage(695)]})]){
    const c=context(),before=c.snapshot();c.fail=true;assert.equal(paint(c),false);c.balanced();assert.deepEqual(c.snapshot(),before);
  }
});
