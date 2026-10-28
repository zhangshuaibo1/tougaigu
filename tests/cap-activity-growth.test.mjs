import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamCapActivity } from '../dist/dream-cap-activity-engine.js';
import { getCapActivity } from '../dist/dream-cap-activities.js';

const make = (options = {}, record) => {
  const events = [];
  const activity = new DreamCapActivity(getCapActivity({chapterIndex: 0}), {record, onEvent: event => events.push(event)});
  const context = {state: 'playing', form: 'soul', body: {x:330,y:560,grounded:true}, soul:{x:245,y:355}, reducedMotion:false, ...options};
  activity.refresh(context);
  return {activity, context, events};
};
const tick = (activity, context, seconds) => { for (let t=0;t<seconds;t+=.02) activity.update(.02,context); };
const deliver = (activity, context, targetCount) => {
  for (let i=0;i<10000;i++) {
    if (activity.delivered.size>=targetCount) return;
    const target=activity.targetIndex, desired={a:target===0?0:1,b:target===1?0:1};
    for (const id of ['a','b']) if (activity.switches[id]!==desired[id]) {
      context.soul={x:activity.nodes[id].x,y:activity.nodes[id].y};
      activity.refresh(context); assert.equal(activity.pulse(context.soul),true);
    }
    activity.update(.02,context);
  }
  assert.fail('traveler should reach the requested destination through its routes');
};

test('each actual delivery unfolds only its new prop, including the final prop after completion',()=>{
  const {activity,context,events}=make();
  for (let count=1;count<=3;count++) {
    deliver(activity,context,count);
    assert.deepEqual(activity.getView().growth,{index:count-1,progress:0});
    const view=activity.getView();view.growth.progress=1;
    assert.equal(activity.getView().growth.progress,0,'render snapshots cannot alter the animation clock');
    tick(activity,context,.2);assert.ok(activity.getView().growth.progress>0);
    tick(activity,context,.3);assert.equal(activity.getView().growth,null);
  }
  assert.equal(activity.phase,'complete');
  assert.equal(events.filter(event=>event.type==='complete').length,1);
  assert.ok(events.every(event=>!Object.hasOwn(event,'growth')),'presentation is never written into progress events');
});

test('pause freezes the unfolding, while a deliberate return to the body lets a delivered prop settle',()=>{
  const {activity,context}=make();deliver(activity,context,1);tick(activity,context,.12);
  const before=activity.getView().growth.progress;
  context.state='paused';tick(activity,context,2);assert.equal(activity.getView().growth.progress,before);
  context.state='playing';context.form='body';tick(activity,context,.4);
  assert.equal(activity.getView().growth,null);
  assert.equal(activity.phase,'suspended');assert.equal(activity.delivered.size,1);
});

test('reduced motion immediately shows the whole prop and never restarts an unfinished flourish',()=>{
  const normal=make();deliver(normal.activity,normal.context,1);
  normal.context.reducedMotion=true;normal.activity.refresh(normal.context);
  assert.equal(normal.activity.getView().growth,null);
  normal.context.reducedMotion=false;tick(normal.activity,normal.context,.1);assert.equal(normal.activity.getView().growth,null);
  const reduced=make({reducedMotion:true});deliver(reduced.activity,reduced.context,3);
  assert.equal(reduced.activity.phase,'complete');assert.equal(reduced.activity.getView().growth,null);
});

test('saved scenery, recovery, replay and destruction do not retain an obsolete unfolding',()=>{
  const saved=make({}, {completedSteps:[0,1,2],completedVariants:[0]});
  assert.equal(saved.activity.getView().growth,null);
  const run=make();deliver(run.activity,run.context,1);
  run.context.form='body';run.activity.recover(run.context);assert.equal(run.activity.getView().growth,null);
  run.context.form='soul';deliver(run.activity,run.context,3);assert.ok(run.activity.getView().growth);
  run.context.form='body';assert.equal(run.activity.replay(run.context),true);assert.equal(run.activity.getView().growth,null);
  run.activity.destroy();assert.equal(run.activity.getView(),null);
});
