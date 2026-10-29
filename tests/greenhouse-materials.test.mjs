import test from 'node:test';
import assert from 'node:assert/strict';
import {drawGreenhousePlatform,drawGreenhouseMushroom} from '../dist/dream-greenhouse-finish.js';

function makeContext(){
  let state={fillStyle:'#123456',strokeStyle:'#fedcba',lineWidth:3.1,lineCap:'square',lineJoin:'bevel',globalAlpha:.63},matrix=[1,0,0,1,17,23],clip=null,path=[];
  const stack=[],calls=[],paints=[];
  const numeric=args=>args.forEach(value=>{if(typeof value==='number')assert.ok(Number.isFinite(value),'nonfinite Canvas argument');});
  // Compare a gradient's authored colors and coordinates, not the identity of
  // the mock's addColorStop method, when checking repeatable paused frames.
  const valueSnapshot=value=>value&&Array.isArray(value.stops)?{args:[...value.args],stops:value.stops.map(stop=>[...stop])}:value;
  const log=(name,args)=>{numeric(args);calls.push([name,...args.map(valueSnapshot)]);};
  const ctx={calls,paints,fail:null,
    snapshot(){return {state:{...state},matrix:[...matrix],clip:clip&&[...clip]};},
    balanced(){assert.equal(stack.length,0,'unbalanced Canvas save/restore');},
    save(){stack.push(this.snapshot());log('save',[]);},
    restore(){const saved=stack.pop();assert.ok(saved);state=saved.state;matrix=saved.matrix;clip=saved.clip;log('restore',[]);},
    beginPath(){path=[];log('beginPath',[]);},
    rect(...args){log('rect',args);path.push(['rect',...args]);},
    clip(){const rect=path.find(entry=>entry[0]==='rect');assert.ok(rect);clip=rect.slice(1);log('clip',clip);},
    fill(){paints.push({type:'fill',clip:clip&&[...clip],style:state.fillStyle});log('fill',[state.fillStyle]);},
    stroke(){assert.ok(state.lineWidth>0);paints.push({type:'stroke',clip:clip&&[...clip],style:state.strokeStyle});log('stroke',[state.strokeStyle,state.lineWidth]);},
    fillRect(...args){log('fillRect',args);paints.push({type:'rect',clip:clip&&[...clip],style:state.fillStyle});},
    moveTo(...args){log('moveTo',args);},lineTo(...args){log('lineTo',args);},
    bezierCurveTo(...args){log('bezierCurveTo',args);},quadraticCurveTo(...args){log('quadraticCurveTo',args);},closePath(){log('closePath',[]);},
    ellipse(...args){assert.ok(args[2]>=0&&args[3]>=0);log('ellipse',args);},
    roundRect(...args){assert.ok(args[2]>0&&args[3]>0&&args[4]>=0);assert.ok(args[4]<=Math.min(args[2],args[3])/2);log('roundRect',args);},
    createLinearGradient(...args){if(this.fail==='gradient')throw new Error('context unavailable');log('gradient',args);return {args,stops:[],addColorStop(at,color){assert.ok(at>=0&&at<=1);this.stops.push([at,color]);}};},
    translate(x,y){log('translate',[x,y]);matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},
    scale(x,y){log('scale',[x,y]);matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},
  };
  return new Proxy(ctx,{get:(target,key)=>key in target?target[key]:state[key],set(target,key,value){if(key in target)target[key]=value;else state[key]=value;return true;}});
}

const platforms=[
  {x:0,y:560,w:2180,h:100,kind:'ground'},
  {x:895,y:385,w:145,h:175,solid:true,kind:'root'},
  {x:250,y:465,w:145,h:18},
  {x:50.25,y:80.125,w:.5,h:.25},
];

test('every platform paint is clipped to its exact authored rectangle, with no state or input mutation',()=>{
  for(const input of platforms){
    const p=Object.freeze({...input}),before=JSON.stringify(p),c=makeContext(),state=c.snapshot();
    assert.equal(drawGreenhousePlatform(c,p,0,2180),true);c.balanced();assert.deepEqual(c.snapshot(),state);assert.equal(JSON.stringify(p),before);assert.ok(c.paints.length>0);
    for(const paint of c.paints)assert.deepEqual(paint.clip,[p.x,p.y,p.w,p.h],'material escaped the physical platform silhouette');
    const top=c.calls.find(call=>call[0]==='fillRect'&&call[1]===p.x&&call[2]===p.y&&call[3]===p.w&&call[4]===Math.min(1,p.h));
    assert.ok(top,'the visible top must remain exactly p.y');
  }
});

test('unsupported contexts and invalid platform geometry decline without drawing',()=>{
  assert.equal(drawGreenhousePlatform(null,platforms[0]),false);
  const invalid=[null,{}, {...platforms[0],x:NaN},{...platforms[0],h:0},{...platforms[0],w:-1},{...platforms[0],y:Infinity},{...platforms[0],x:Number.MAX_VALUE,w:Number.MAX_VALUE}];
  for(const p of invalid){const c=makeContext(),before=c.snapshot();assert.equal(drawGreenhousePlatform(c,p,0,1100),false);assert.equal(c.calls.length,0);assert.deepEqual(c.snapshot(),before);}
  for(const args of [[NaN,1100],[0,-1],[0,NaN]]){const c=makeContext();assert.equal(drawGreenhousePlatform(c,platforms[0],...args),false);assert.equal(c.calls.length,0);}
});

test('offscreen platforms are handled without work and texture effort stays bounded for huge surfaces',()=>{
  const c=makeContext();assert.equal(drawGreenhousePlatform(c,platforms[2],2000,400),true);assert.equal(c.calls.length,0);
  assert.equal(drawGreenhousePlatform(c,{x:-1e8,y:560,w:2e8,h:100,kind:'ground'},15000,1100),true);c.balanced();assert.ok(c.calls.length<6000,'a platform width created unbounded offscreen drawing');
});

test('camera movement preserves the same world-space stones in the overlapping view',()=>{
  const a=makeContext(),b=makeContext();drawGreenhousePlatform(a,platforms[0],0,1100);drawGreenhousePlatform(b,platforms[0],150,1100);
  const visible=c=>c.calls.filter(call=>call[0]==='roundRect'&&call[1]>=200&&call[1]<=900);
  assert.ok(visible(a).length>0);assert.deepEqual(visible(a),visible(b));
});

test('the mushroom uses the actual pad anchor and boing without altering state or consuming time',()=>{
  const results=[];
  for(const boing of [0,.75,.6,.25,.01]){
    const p=Object.freeze({x:745,y:560,w:115,power:850,boing,cooldown:.6}),before=JSON.stringify(p),c=makeContext(),state=c.snapshot();
    assert.equal(drawGreenhouseMushroom(c,p,.8,false),true);c.balanced();assert.deepEqual(c.snapshot(),state);assert.equal(JSON.stringify(p),before);
    assert.deepEqual(c.calls.find(call=>call[0]==='translate'),['translate',802.5,560]);
    const again=makeContext();assert.equal(drawGreenhouseMushroom(again,p,.8,false),true);assert.deepEqual(c.calls,again.calls,'unchanged paused inputs must produce the same drawing');
    const transform=c.calls.find(call=>call[0]==='scale');assert.ok(transform[1]>.9&&transform[1]<1.07&&transform[2]>=.86&&transform[2]<1.15);results.push(transform);
  }
  assert.notDeepEqual(results[0],results[1],'a real bounce must have visible compression');assert.ok(results[1][2]<1);assert.ok(results[2][2]>1,'compression should be followed by a rebound');
});

test('reduced-motion mushroom stays fixed across decorative time and impact animation values',()=>{
  let reference=null;
  for(const time of [0,.7,200])for(const boing of [0,.75,.4]){
    const c=makeContext();assert.equal(drawGreenhouseMushroom(c,{x:745,y:560,w:115,boing},time,true),true);
    if(reference)assert.deepEqual(c.calls,reference);else reference=c.calls;
  }
});

test('mushroom rejects unusable geometry and renders finite small or unusual valid values',()=>{
  for(const p of [null,{}, {x:0,y:0,w:0},{x:NaN,y:0,w:115},{x:0,y:Infinity,w:115},{x:0,y:0,w:-2}]){
    const c=makeContext();assert.equal(drawGreenhouseMushroom(c,p,0),false);assert.equal(c.calls.length,0);
  }
  for(const p of [{x:0,y:0,w:.5,boing:NaN},{x:-100,y:40,w:115,boing:Infinity},{x:40,y:0,w:500,boing:-5}]){
    const c=makeContext(),before=c.snapshot();assert.equal(drawGreenhouseMushroom(c,Object.freeze(p),NaN),true);c.balanced();assert.deepEqual(c.snapshot(),before);
  }
});

test('a context failure reports fallback and restores all saved Canvas state',()=>{
  for(const painter of [c=>drawGreenhousePlatform(c,platforms[0],0,1100),c=>drawGreenhouseMushroom(c,{x:745,y:560,w:115,boing:.6},1)]){
    const c=makeContext(),before=c.snapshot();c.fail='gradient';assert.equal(painter(c),false);c.balanced();assert.deepEqual(c.snapshot(),before);
  }
});
