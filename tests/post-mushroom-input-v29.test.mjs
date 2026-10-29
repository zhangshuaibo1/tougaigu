import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from '../docs/verification-v29-mushroom-input/normal-input-analysis.mjs';

// Two concrete regressions use the unchanged production engine from its
// original spawn. The broad 80-case timing study remains an archived analysis.
test('a continuous hold avoids the old 1440 reversal consuming a real mushroom flight',()=>{
  const timing={poll:5,gap:3,handoff:0};
  const old=run('old',timing),actual=run('continuous-release',timing);
  assert.equal(old.outcome,'failed');assert.equal(old.error,'steer timeout 1680');
  assert.equal(old.bounce.phase,'approach-1440');assert.equal(old.bounce.body.vy,-850);
  assert(old.bounceBeforeFinalHold);assert(old.commands.some(c=>c.phase==='approach-1440'&&c.x===-1));
  assert.equal(old.final.body.x,1585);assert.equal(old.final.body.y,560);
  assertSafeContinuousCrossing(actual);
});

test('releasing above the root avoids target-steering oscillation after an actual landing',()=>{
  const timing={poll:6,gap:0,handoff:2};
  const old=run('old',timing),actual=run('continuous-release',timing);
  assert.equal(old.outcome,'failed');assert.equal(old.error,'steer timeout 1680');
  assert.equal(old.final.body.y,390);assert.equal(old.final.body.vx,-240);
  assert(old.commands.some(c=>c.phase==='steer-root'&&c.x===-1));
  assertSafeContinuousCrossing(actual);
});

function assertSafeContinuousCrossing(actual){
  assert.equal(actual.outcome,'root-landed');assert.equal(actual.bounceBeforeFinalHold,false);
  assert(actual.bounce.body.vy<-800&&actual.secondsHoldToBounce<=2.8&&actual.secondsHoldToLanding<=6);
  const commands=actual.commands.filter(c=>c.phase==='one-continuous-right');
  assert.deepEqual(commands.map(c=>[c.x,c.y]),[[1,0],[0,0]]);
  assert(actual.releaseDecision.body.x>=1660&&actual.releaseDecision.body.y<=390);
  assert(actual.final.sameBody&&actual.final.deaths===0);
  assert.equal(actual.final.body.y,390);assert(actual.final.body.grounded);
  assert.equal(actual.final.body.vx,0);assert.deepEqual(actual.final.input,{x:0,y:0});
  assert(actual.final.body.x-actual.final.body.w/2>=1600);
  assert(actual.final.body.x+actual.final.body.w/2<=1730);
}
