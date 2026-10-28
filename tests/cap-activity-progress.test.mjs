import test from 'node:test';
import assert from 'node:assert/strict';
import { CAP_ACTIVITY_SAVE_KEY, capActivityRevision, createCapActivitySave, validateCapActivitySave, loadCapActivitySave, persistCapActivitySave, replaceCapActivitySave, getCapActivityRecord, getCapActivityStats, mergeCapActivitySaves, recordCapActivityEvent } from '../dist/cap-activity-progress.js';
import { CAP_ACTIVITIES } from '../dist/dream-cap-activities.js';

const event = (type, extra={}) => ({ type,sceneId:'story-0',chapterIndex:0,festivalId:null,variant:0,...extra });
const finish = (extra={}) => event('complete',{completedSteps:[0,1,2],switches:5,activeSeconds:28.5,resumed:false,...extra});
test('partial delivery persists by actual destination and replay steps cannot complete the base route',()=>{
  const save=createCapActivitySave();
  recordCapActivityEvent(save,event('step',{stepIndex:2}));
  recordCapActivityEvent(save,event('step',{stepIndex:2}));
  recordCapActivityEvent(save,event('step',{stepIndex:1,variant:1}));
  assert.deepEqual(getCapActivityRecord(save,'story-0').completedSteps,[2]);
  assert.equal(getCapActivityStats(save).completed,0);
});
test('completing a route is idempotent and keeps the best full-run effort',()=>{
  const save=createCapActivitySave();
  assert.equal(recordCapActivityEvent(save,finish()).firstCompletion,true);
  assert.equal(recordCapActivityEvent(save,finish()).changed,false);
  recordCapActivityEvent(save,finish({switches:7,activeSeconds:10}));
  assert.deepEqual(getCapActivityRecord(save,'story-0').best[0],{switches:5,seconds:28.5});
  recordCapActivityEvent(save,finish({switches:4,activeSeconds:40}));
  recordCapActivityEvent(save,finish({switches:4,activeSeconds:31.0014}));
  assert.deepEqual(getCapActivityRecord(save,'story-0').best[0],{switches:4,seconds:31.001});
});
test('a resumed completion unlocks the route without inventing a full-run speed record',()=>{
  const save=createCapActivitySave();
  recordCapActivityEvent(save,event('step',{stepIndex:0}));
  recordCapActivityEvent(save,finish({resumed:true,activeSeconds:1,switches:0}));
  const record=getCapActivityRecord(save,'story-0');
  assert.deepEqual(record.completedVariants,[0]);assert.deepEqual(record.best,{});
  recordCapActivityEvent(save,finish({resumed:false}));
  assert.equal(getCapActivityRecord(save,'story-0').best[0].seconds,28.5);
});
test('all three completed route variants remain separate from main and holiday discoveries',()=>{
  const save=createCapActivitySave();
  for(const variant of [0,1,2])recordCapActivityEvent(save,finish({variant}));
  recordCapActivityEvent(save,finish({sceneId:'halloween',festivalId:'halloween',chapterIndex:0}));
  assert.deepEqual(getCapActivityStats(save),{completed:2,variants:4,steps:6});
  assert.equal(getCapActivityRecord(save,'story-1').completedVariants.length,0);
});
test('unknown scenes, mismatched context and incomplete finish events do not mutate a save',()=>{
  const save=createCapActivitySave(),before=JSON.stringify(save);
  for(const invalid of [finish({sceneId:'__proto__'}),finish({festivalId:'halloween'}),finish({chapterIndex:3}),finish({variant:3}),finish({variant:'0'}),finish({completedSteps:[0,0,1]}),event('step',{stepIndex:NaN}),event('step',{stepIndex:-1}),event('win')])assert.equal(recordCapActivityEvent(save,invalid).ok,false);
  assert.equal(JSON.stringify(save),before);
});
test('validation rejects wrong versions and nonfinite records while bounding known route identifiers',()=>{
  assert.deepEqual(validateCapActivitySave({version:2,scenes:{'story-0':{completedSteps:[0,1,2]}}}),createCapActivitySave());
  const input={version:1,scenes:{'story-0':{completedSteps:[2,2,-1,'0'],completedVariants:[1,4],best:{0:{switches:Infinity,seconds:0},1:{switches:3,seconds:NaN},2:{switches:3,seconds:25}}},unknown:{completedSteps:[0,1,2]}}};
  const record=getCapActivityRecord(input,'story-0');
  assert.deepEqual(record.completedSteps,[2]);assert.deepEqual(record.completedVariants,[1,2]);assert.deepEqual(record.best,{2:{switches:3,seconds:25}});
  assert.equal(getCapActivityRecord(input,'unknown'),null);
});
test('merging browser records retains unique deliveries and real best runs without aliasing',()=>{
  const a=createCapActivitySave(),b=createCapActivitySave();
  recordCapActivityEvent(a,event('step',{stepIndex:0}));recordCapActivityEvent(b,event('step',{stepIndex:1}));
  recordCapActivityEvent(a,finish({variant:1,switches:7}));recordCapActivityEvent(b,finish({variant:1,switches:4,activeSeconds:33}));
  const merged=mergeCapActivitySaves(a,b),record=getCapActivityRecord(merged,'story-0');
  assert.deepEqual(record.completedSteps,[0,1]);assert.deepEqual(record.completedVariants,[1]);assert.equal(record.best[1].switches,4);
  assert.deepEqual(getCapActivityRecord(a,'story-0').completedSteps,[0]);
  record.best[1].switches=0;assert.equal(getCapActivityRecord(merged,'story-0').best[1].switches,4);
});
test('storage round trip is isolated and corruption or quota errors do not break play',()=>{
  const map=new Map([['tougaigu.rewards.v1','unchanged'],['tougaigu.capbook.v1','keep-book']]);
  const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const save=createCapActivitySave();recordCapActivityEvent(save,finish());
  assert.equal(persistCapActivitySave(save,storage),true);assert.deepEqual(loadCapActivitySave(storage),save);
  assert.equal(map.get('tougaigu.rewards.v1'),'unchanged');assert.equal(map.get('tougaigu.capbook.v1'),'keep-book');
  map.set(CAP_ACTIVITY_SAVE_KEY,'broken');assert.deepEqual(loadCapActivitySave(storage),createCapActivitySave());
  assert.equal(persistCapActivitySave(save,{setItem(){throw new Error('quota');}}),false);
});
test('the actual start, three steps, complete sequence confirms a first completion exactly once',()=>{
  const save=createCapActivitySave();
  recordCapActivityEvent(save,event('start',{attemptId:'actual-1',completedSteps:[]}));
  for(const target of [0,1,2])recordCapActivityEvent(save,event('step',{attemptId:'actual-1',stepIndex:target,completedSteps:[0,1,2].slice(0,target+1)}));
  assert.deepEqual(getCapActivityRecord(save,'story-0').completedVariants,[]);
  assert.equal(recordCapActivityEvent(save,finish({attemptId:'actual-1'})).firstCompletion,true);
  assert.equal(recordCapActivityEvent(save,finish({attemptId:'actual-1'})).changed,false);
  assert.equal(getCapActivityRecord(save,'story-0').pending,null);
});
test('unfinished replay variants keep their own route and targets across a backup round trip',()=>{
  const save=createCapActivitySave();recordCapActivityEvent(save,finish());
  recordCapActivityEvent(save,event('start',{variant:1,attemptId:'replay-1',completedSteps:[]}));
  recordCapActivityEvent(save,event('step',{variant:1,attemptId:'replay-1',stepIndex:1,completedSteps:[1]}));
  const record=getCapActivityRecord(JSON.parse(JSON.stringify(save)),'story-0');
  assert.deepEqual(record.completedSteps,[0,1,2]);
  assert.deepEqual(record.pending,{variant:1,attemptId:'replay-1',completedSteps:[1]});
  assert.deepEqual(record.completedVariants,[0]);
});
test('completion supersedes an older pending snapshot without resurrecting that attempt',()=>{
  const save=createCapActivitySave();recordCapActivityEvent(save,event('step',{stepIndex:0,attemptId:'attempt-a',completedSteps:[0]}));
  const old=structuredClone(save);
  recordCapActivityEvent(save,finish({attemptId:'attempt-a'}));
  assert.equal(getCapActivityRecord(mergeCapActivitySaves(old,save),'story-0').pending,null);
  assert.equal(getCapActivityRecord(mergeCapActivitySaves(save,old),'story-0').pending,null);
});
test('concurrent writes to different scenes converge by merging local, event and stored snapshots',()=>{
  const a=createCapActivitySave(),b=createCapActivitySave();
  recordCapActivityEvent(a,event('step',{stepIndex:0,attemptId:'tab-a'}));
  recordCapActivityEvent(b,event('step',{stepIndex:0,attemptId:'tab-b',sceneId:'halloween',festivalId:'halloween'}));
  const aMerged=mergeCapActivitySaves(mergeCapActivitySaves(a,b),b);
  const bMerged=mergeCapActivitySaves(mergeCapActivitySaves(b,a),aMerged);
  assert.deepEqual(Object.keys(aMerged.scenes).sort(),['halloween','story-0']);
  assert.deepEqual(bMerged,aMerged);
});
test('a replacement revision wins over stale runs and stale storage after import failure',()=>{
  const old=createCapActivitySave();recordCapActivityEvent(old,event('step',{stepIndex:0}));
  const wanted=createCapActivitySave();recordCapActivityEvent(wanted,event('step',{stepIndex:1}));
  const imported=replaceCapActivitySave(wanted,old,old,{now:1000,id:'import-a'});
  assert.notEqual(capActivityRevision(old),capActivityRevision(imported));
  assert.equal(persistCapActivitySave(imported,{setItem(){throw new Error('quota');}}),false);
  recordCapActivityEvent(old,finish());
  for(const merged of [mergeCapActivitySaves(old,imported),mergeCapActivitySaves(imported,old)]){
    assert.deepEqual(getCapActivityRecord(merged,'story-0').completedSteps,[1]);
    assert.deepEqual(getCapActivityRecord(merged,'story-0').completedVariants,[]);
  }
});
test('a second import remains newer even with the same clock and keeps an intentional empty replacement',()=>{
  const a=createCapActivitySave();recordCapActivityEvent(a,finish());
  const b=replaceCapActivitySave(createCapActivitySave(),a,a,{now:1000,id:'first'});
  const c=replaceCapActivitySave(createCapActivitySave(),b,b,{now:1000,id:'second'});
  assert.ok(c.revision>b.revision);
  assert.deepEqual(mergeCapActivitySaves(c,a).scenes,{});
  assert.deepEqual(mergeCapActivitySaves(a,c).scenes,{});
});

test('a late start or step from the same resumed attempt cannot undo merged deliveries',()=>{
  for(const [variant,first,second] of [[1,1,2],[2,2,0]]){
    const stale=createCapActivitySave(),attemptId='shared-resume-'+variant;
    recordCapActivityEvent(stale,finish());
    recordCapActivityEvent(stale,event('start',{variant,attemptId,completedSteps:[first]}));
    const advanced=structuredClone(stale);
    recordCapActivityEvent(advanced,event('step',{variant,attemptId,stepIndex:second,completedSteps:[first,second]}));
    const merged=mergeCapActivitySaves(stale,advanced),before=JSON.stringify(merged);
    for(const late of [event('start',{variant,attemptId,completedSteps:[first]}),event('step',{variant,attemptId,stepIndex:first,completedSteps:[first]})]){
      const result=recordCapActivityEvent(merged,late);
      assert.equal(result.ok,true);assert.equal(result.changed,false);
      assert.deepEqual(getCapActivityRecord(merged,'story-0').pending.completedSteps,[first,second].sort());
      assert.equal(JSON.stringify(merged),before,'a late event cannot acquire a newer pending timestamp');
    }
  }
});

test('late events from a completed attempt cannot resurrect it or revise its score',()=>{
  const save=createCapActivitySave(),attemptId='finished-shared-run';
  recordCapActivityEvent(save,event('start',{attemptId,completedSteps:[]}));
  recordCapActivityEvent(save,finish({attemptId}));
  const restored=validateCapActivitySave(JSON.parse(JSON.stringify(save))),before=JSON.stringify(restored);
  for(const late of [
    event('start',{attemptId,completedSteps:[]}),
    event('step',{attemptId,stepIndex:0,completedSteps:[0]}),
    event('wrong',{attemptId,stepIndex:1}),
    finish({attemptId,switches:0,activeSeconds:0}),
  ]){
    const result=recordCapActivityEvent(restored,late);
    assert.equal(result.ok,false);assert.equal(result.reason,'closed-attempt');
    assert.equal(result.changed,false);assert.equal(result.firstCompletion,false);
    assert.equal(JSON.stringify(restored),before);
  }
  assert.equal(getCapActivityRecord(restored,'story-0').pending,null);
  assert.deepEqual(getCapActivityRecord(restored,'story-0').best[0],{switches:5,seconds:28.5});
});

test('closing one attempt still permits a fresh replay of the same variant',()=>{
  const save=createCapActivitySave();recordCapActivityEvent(save,finish({attemptId:'old-run'}));
  assert.equal(recordCapActivityEvent(save,event('start',{attemptId:'new-run',completedSteps:[]})).ok,true);
  assert.equal(recordCapActivityEvent(save,event('step',{attemptId:'new-run',stepIndex:0,completedSteps:[0]})).ok,true);
  const before=JSON.stringify(save);
  assert.equal(recordCapActivityEvent(save,event('step',{attemptId:'new-run',variant:1,stepIndex:1})).ok,false);
  for(const attemptId of ['',null,{},'a'.repeat(97)])assert.equal(recordCapActivityEvent(save,event('start',{attemptId,completedSteps:[]})).ok,false);
  assert.equal(JSON.stringify(save),before);
  const result=recordCapActivityEvent(save,finish({attemptId:'new-run',switches:4,activeSeconds:24}));
  assert.equal(result.ok,true);assert.equal(result.firstCompletion,false);
  const record=getCapActivityRecord(save,'story-0');
  assert.equal(record.pending,null);assert.deepEqual(record.best[0],{switches:4,seconds:24});
  assert.deepEqual(new Set(record.closedAttempts.map(entry=>entry.attemptId)),new Set(['old-run','new-run']));
});

test('closed attempts beat newer stale snapshots without discarding a different live replay',()=>{
  const closed=createCapActivitySave(),attemptId='closed-attempt';
  recordCapActivityEvent(closed,event('step',{attemptId,stepIndex:0,completedSteps:[0]}));
  const stale=structuredClone(closed);
  recordCapActivityEvent(closed,finish({attemptId}));
  // An older app tab could have timestamped this stale start after completion.
  stale.scenes['story-0'].pendingAt=getCapActivityRecord(closed,'story-0').pendingAt+1000;
  for(const merged of [mergeCapActivitySaves(stale,closed),mergeCapActivitySaves(closed,stale)]){
    assert.equal(getCapActivityRecord(merged,'story-0').pending,null);
  }
  const live=structuredClone(closed);
  recordCapActivityEvent(live,event('start',{variant:1,attemptId:'live-replay',completedSteps:[1]}));
  const forward=mergeCapActivitySaves(stale,live),reverse=mergeCapActivitySaves(live,stale);
  assert.deepEqual(forward,reverse);
  assert.deepEqual(getCapActivityRecord(forward,'story-0').pending,{variant:1,attemptId:'live-replay',completedSteps:[1]});
  const inconsistent=structuredClone(closed);
  inconsistent.scenes['story-0'].pending=stale.scenes['story-0'].pending;
  assert.equal(getCapActivityRecord(inconsistent,'story-0').pending,null,'validation removes pending state for a known closed ID');
});

test('closed history is bounded, validated and backward compatible within the existing storage limit',()=>{
  const legacy=validateCapActivitySave({version:1,scenes:{'story-0':{completedSteps:[0],completedVariants:[],best:{}}}});
  assert.deepEqual(getCapActivityRecord(legacy,'story-0').completedSteps,[0]);
  assert.deepEqual(getCapActivityRecord(legacy,'story-0').closedAttempts,[]);
  const ids=Array.from({length:40},(_,index)=>('attempt-'+String(index).padStart(2,'0')+'-').padEnd(96,'x'));
  const history=ids.map((attemptId,index)=>({attemptId,closedAt:1000+index}));
  history.push({attemptId:ids[39],closedAt:2000});
  history.push(null,[],{attemptId:'',closedAt:3000},{attemptId:'z'.repeat(97),closedAt:3000},{attemptId:'bad-time',closedAt:-1},{attemptId:'string-time',closedAt:'3000'},{attemptId:'nonfinite',closedAt:Infinity},{attemptId:'too-late',closedAt:8640000000000001});
  const raw={version:1,scenes:Object.fromEntries(CAP_ACTIVITIES.map(activity=>[activity.sceneId,{completedSteps:[0,1,2],completedVariants:[0,1,2],best:{0:{switches:99999,seconds:86400},1:{switches:99999,seconds:86400},2:{switches:99999,seconds:86400}},closedAttempts:history}]))};
  const clean=validateCapActivitySave(raw),record=getCapActivityRecord(clean,'story-0');
  assert.equal(record.closedAttempts.length,16);
  assert.equal(record.closedAttempts[0].attemptId,ids[39]);assert.equal(record.closedAttempts[0].closedAt,2000);
  assert.deepEqual(new Set(record.closedAttempts.map(entry=>entry.attemptId)),new Set(ids.slice(-16)));
  assert.ok(JSON.stringify(clean).length<65536,'all 16 bounded histories must remain loadable');
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(persistCapActivitySave(clean,storage),true);assert.deepEqual(loadCapActivitySave(storage),clean);
});
