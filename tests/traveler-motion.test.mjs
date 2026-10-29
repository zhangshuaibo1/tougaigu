import test from 'node:test';
import assert from 'node:assert/strict';
import { getTravelerMotion } from '../dist/dream-traveler-art.js';
import { createCapRig, transformCapPoint } from '../dist/dream-cap-art.js';

const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,message||`${a} != ${b}`);
const snapshot=value=>JSON.stringify(value);

test('every grounded gait frame plants at least one sole on the unchanged collision top',()=>{
  for(const face of [-1,1])for(const land of [-.15,0,.1,.22])for(const speed of [0,12,60,120,240])for(let step=0;step<=90;step++){
    const body={x:310,y:510,face,vx:face*speed,vy:0,walk:step/30,grounded:true,land};
    const hop=1.2+Math.sin(step*.13)*1.1;
    const rig=createCapRig({x:body.x,y:body.y,face,scaleY:1-land,hop});
    const pose=getTravelerMotion(body,{time:step/60,hop});
    const planted=pose.legs.filter(leg=>leg.planted);assert.ok(planted.length>=1);
    for(const leg of planted){near(leg.foot.angle,0);near(transformCapPoint(rig.bodyMatrix,leg.foot).y,body.y,'a planted boot floated or sank during the body bob');}
  }
});

test('full-speed contact is fixed in world space while the body travels across a stance',()=>{
  for(const face of [-1,1])for(const index of [0,1]){
    let start=null;
    for(let sample=1;sample<30;sample++){
      const walk=index*1.5+sample*.05;
      const body={x:300+face*walk*20,y:500,face,vx:face*240,vy:0,walk,grounded:true};
      const pose=getTravelerMotion(body,{hop:1.7,time:sample/60}),leg=pose.legs[index];
      assert.equal(leg.planted,true);
      const world=transformCapPoint(createCapRig({x:body.x,y:500,face,hop:1.7}).bodyMatrix,leg.foot);
      if(start)near(world.x,start.x,'a contact foot slid horizontally at full speed');else start=world;
    }
  }
});

test('a lifted boot clears the ground, joins contact continuously, and never adds movement state',()=>{
  const body=Object.freeze({vx:240,vy:0,walk:0,grounded:true,land:0}),old=snapshot(body);
  for(let sample=0;sample<=120;sample++){
    const walk=sample/40,pose=getTravelerMotion({...body,walk},{hop:2.1});
    for(const leg of pose.legs){
      // The painted sole runs from -6 to 9; account for its swing rotation.
      for(const edge of [-6,9])assert.ok(leg.foot.y+Math.sin(leg.foot.angle)*edge<=2.1+1e-8,'swing toe crossed the collision plane');
    }
  }
  for(const walk of [0,1.5,3]){
    const before=getTravelerMotion({...body,walk:walk-1e-7}),after=getTravelerMotion({...body,walk:walk+1e-7});
    for(let i=0;i<2;i++){assert.ok(Math.hypot(before.legs[i].foot.x-after.legs[i].foot.x,before.legs[i].foot.y-after.legs[i].foot.y)<.0001);}
  }
  assert.equal(snapshot(body),old);
});

test('airborne poses follow velocity and land without consulting another animation timer',()=>{
  const takeoff=getTravelerMotion({grounded:false,vx:240,vy:-600,walk:1});
  const apex=getTravelerMotion({grounded:false,vx:240,vy:0,walk:1});
  const descending=getTravelerMotion({grounded:false,vx:240,vy:650,walk:1});
  for(let index=0;index<2;index++){
    assert.ok(takeoff.legs[index].foot.y<apex.legs[index].foot.y);
    assert.ok(apex.legs[index].foot.y<descending.legs[index].foot.y);
    assert.equal(takeoff.legs[index].planted,false);
  }
  const landed=getTravelerMotion({grounded:true,vx:0,vy:0,walk:1,land:.22},{hop:.6});
  for(const leg of landed.legs){assert.equal(leg.planted,true);near(leg.foot.y,.6);}
});

test('scarf and bag remain continuous when the walking cycle wraps',()=>{
  for(const cycle of [-3,-1,0,1,3,20]){
    const walk=cycle*3,time=cycle*.25;
    const before=getTravelerMotion({vx:240,vy:0,walk:walk-1e-7,grounded:true},{time:time-1e-8});
    const after=getTravelerMotion({vx:240,vy:0,walk:walk+1e-7,grounded:true},{time:time+1e-8});
    assert.ok(Math.abs(before.scarfWave-after.scarfWave)<.00001,'the scarf snapped when phase wrapped to zero');
    assert.ok(Math.abs(before.satchelAngle-after.satchelAngle)<.00001);
  }
});

test('reduced motion settles feet and cloth regardless of decorative time or gait phase',()=>{
  let stable=null;
  for(const time of [0,1,500])for(const walk of [0,.7,4])for(const vy of [-600,0,650]){
    const pose=getTravelerMotion({grounded:vy===0,vx:240,vy,walk,land:.22},{time,hop:0,reducedMotion:true});
    const appearance={legs:pose.legs.map(leg=>leg.foot),scarf:pose.scarfWave,lift:pose.scarfLift,hem:pose.hem,satchel:pose.satchelAngle};
    if(stable)assert.deepEqual(appearance,stable);else stable=appearance;
  }
});

test('presentation tolerates nonfinite optional inputs and never mutates frozen body data',()=>{
  for(const body of [{},{vx:NaN,vy:Infinity,walk:-Infinity,land:NaN},{vx:-240,vy:850,walk:-20,grounded:false}]){
    const before=snapshot(body);Object.freeze(body);
    const result=getTravelerMotion(body,{time:NaN,hop:Infinity});
    const visit=value=>{if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(visit);};
    visit(result);assert.equal(snapshot(body),before);assert.deepEqual(result,getTravelerMotion(body,{time:NaN,hop:Infinity}));
  }
});
