import test from 'node:test';
import assert from 'node:assert/strict';
import { CAP_SAVE_KEY, createCapSave, validateCapSave, loadCapSave, persistCapSave, getCapStats, getCapRecord, recordCapEvent, mergeCapSaves } from '../dist/cap-progress.js';

const event = (type, extra={}) => ({type,chapterIndex:0,festivalId:null,...extra});
const storage = () => { const map=new Map(); return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)}; };
test('capbook distinguishes actual lid opening from returning and collects each thought once',()=>{
  const save=createCapSave();
  assert.equal(recordCapEvent(save,event('return')).changed,false);
  assert.equal(recordCapEvent(save,event('open')).firstOpen,true);
  assert.equal(recordCapEvent(save,event('open')).firstOpen,false);
  assert.equal(recordCapEvent(save,event('memory',{index:2})).changed,true);
  assert.equal(recordCapEvent(save,event('memory',{index:2})).changed,false);
  assert.equal(recordCapEvent(save,event('seal',{index:0})).changed,true);
  assert.deepEqual(getCapRecord(save,'story-0'),{opens:2,memories:[2],seals:[0]});
  assert.deepEqual(getCapStats(save),{opened:1,opens:2,memories:1,seals:1,complete:0});
});
test('festival records do not change main chapter discoveries',()=>{
  const save=createCapSave();
  recordCapEvent(save,event('open',{festivalId:'halloween'}));
  recordCapEvent(save,event('memory',{festivalId:'halloween',index:0}));
  assert.equal(getCapRecord(save,'story-0').opens,0);
  assert.equal(getCapStats(save).opened,1);
  assert.equal(getCapStats(save).memories,1);
});
test('invalid scenes, event types and indexes do not mutate progress',()=>{
  const save=createCapSave(),before=JSON.stringify(save);
  for(const invalid of [event('unknown'),event('open',{chapterIndex:8}),event('open',{chapterIndex:'0'}),event('open',{festivalId:'__proto__'}),event('memory',{index:3}),event('seal',{index:2}),event('memory',{index:NaN})]) assert.equal(recordCapEvent(save,invalid).ok,false);
  assert.equal(JSON.stringify(save),before);
});
test('records are sanitized and unknown prototype keys cannot create discoveries',()=>{
  const input=JSON.parse('{"version":1,"scenes":{"story-0":{"opens":1e100,"memories":[2,2,0,"1",-1,99],"seals":[1,1,7]},"__proto__":{"opens":9},"unknown":{"opens":9}}}');
  const clean=validateCapSave(input);
  assert.deepEqual(clean.scenes,{'story-0':{opens:99999,memories:[0,2],seals:[1]}});
  clean.scenes['story-0'].memories.push(1);
  assert.equal(input.scenes['story-0'].memories.includes(1),false);
  assert.equal(getCapRecord(clean,'__proto__'),null);
});
test('cross-tab merge retains distinct discoveries without double counting opens',()=>{
  const a=createCapSave(),b=createCapSave();
  recordCapEvent(a,event('open'));recordCapEvent(a,event('memory',{index:1}));
  recordCapEvent(b,event('open'));recordCapEvent(b,event('memory',{index:2}));recordCapEvent(b,event('seal',{index:0}));
  const combined=mergeCapSaves(a,b);
  assert.deepEqual(getCapRecord(combined,'story-0'),{opens:1,memories:[1,2],seals:[0]});
  assert.deepEqual(getCapRecord(a,'story-0').memories,[1]);
});
test('save round trip is independent of story, festival and reward stores',()=>{
  const target=storage();target.setItem('tougaigu.dream.v1','original');target.setItem('tougaigu.rewards.v1','rewards');
  const save=createCapSave();recordCapEvent(save,event('open'));
  assert.equal(persistCapSave(save,target),true);assert.deepEqual(loadCapSave(target),save);
  assert.equal(target.getItem('tougaigu.dream.v1'),'original');assert.equal(target.getItem('tougaigu.rewards.v1'),'rewards');
  target.setItem(CAP_SAVE_KEY,'{broken');assert.deepEqual(loadCapSave(target),createCapSave());
  assert.equal(persistCapSave(save,{setItem(){throw new Error('full');}}),false);
});
test('full scene collection requires all actual thoughts and both lamps',()=>{
  const save=createCapSave();recordCapEvent(save,event('open'));
  for(const index of [0,1,2])recordCapEvent(save,event('memory',{index}));
  recordCapEvent(save,event('seal',{index:0}));assert.equal(getCapStats(save).complete,0);
  recordCapEvent(save,event('seal',{index:1}));assert.equal(getCapStats(save).complete,1);
});
