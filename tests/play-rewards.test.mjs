import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REWARD_SAVE_KEY, REWARD_ITEMS, BASE_MILESTONES, FESTIVAL_MILESTONES,
  createRewardSave, validateRewardSave, loadRewardSave, persistRewardSave,
  accruePlayTime, getRewardOverview, claimBaseReward, claimFestivalWelcome,
  claimFestivalReward, claimFestivalOccurrenceReward, consumeRewardItem,
  purchaseRewardItem, createRewardTracker,
  claimTravelSupply,
} from '../dist/play-rewards.js';

const HALLOWEEN=new Date('2026-10-28T04:00:00Z');
const at=seconds=>new Date(HALLOWEEN.getTime()+seconds*1000);
const tick=(save,time,extra={})=>accruePlayTime(save,{sessionId:'run-a',gameId:'dream',time,playing:true,visible:true,activeFestivalIds:['halloween'],date:at(time),...extra});
const memoryStore=()=>{const entries=new Map();return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,String(value)),removeItem:key=>entries.delete(key)};};

test('ordinary reward ledger stays separate and starts with independent inventories',()=>{
  const a=createRewardSave(),b=createRewardSave();a.inventory.glow_candy=5;
  assert.equal(b.inventory.glow_candy,0);
  const storage=memoryStore();storage.setItem('tougaigu.save.v1','existing survival');storage.setItem('tougaigu.dream.v1','existing story');
  assert.equal(persistRewardSave(a,storage),true);
  assert.equal(storage.getItem('tougaigu.save.v1'),'existing survival');
  assert.equal(storage.getItem('tougaigu.dream.v1'),'existing story');
  assert.notEqual(REWARD_SAVE_KEY,'tougaigu.dream.v1');
});

test('first samples, repeated HUD emissions and new sessions never grant catch-up time',()=>{
  const save=createRewardSave();assert.equal(tick(save,72).added,0);
  assert.equal(tick(save,72).added,0);assert.equal(tick(save,73).added,1);
  assert.equal(tick(save,90,{sessionId:'run-b'}).added,0);
  assert.equal(tick(save,91,{sessionId:'run-b'}).added,1);
  assert.equal(save.totalSeconds,2);assert.equal(save.festivals['halloween:2026'].seconds,2);
});

test('paused and background periods are excluded, including the first resumed sample',()=>{
  const save=createRewardSave();tick(save,0);tick(save,1);
  assert.equal(tick(save,2,{playing:false}).added,0);
  assert.equal(tick(save,80,{playing:false}).added,0);
  assert.equal(tick(save,81).added,0);assert.equal(tick(save,82).added,1);
  assert.equal(tick(save,83,{visible:false}).added,0);
  assert.equal(tick(save,120,{visible:false}).added,0);
  assert.equal(tick(save,121).added,0);assert.equal(tick(save,122).added,1);
  assert.equal(save.totalSeconds,3);
});

test('invalid time, backwards time and long discontinuities do not become rewards',()=>{
  const save=createRewardSave();tick(save,0);assert.equal(tick(save,100).added,0);
  assert.equal(tick(save,101).added,1);assert.equal(tick(save,90).added,0);
  assert.equal(tick(save,91).added,1);
  for(const time of [NaN,Infinity,-1])assert.equal(tick(save,time).added,0);
  assert.equal(tick(save,92,{sessionId:'__proto__'}).added,0);
  assert.equal(tick(save,92,{gameId:'made-up'}).added,0);
  assert.equal(save.totalSeconds,2);
});

test('both games contribute to ordinary cumulative progress without changing reward keys',()=>{
  const save=createRewardSave();tick(save,0);tick(save,1);tick(save,2);
  tick(save,0,{gameId:'survivor',sessionId:'arena-a'});
  tick(save,1,{gameId:'survivor',sessionId:'arena-a'});
  assert.equal(save.totalSeconds,3);assert.equal(save.festivals['halloween:2026'].seconds,3);
});

test('archive visits cannot manufacture holiday playtime outside actual dates',()=>{
  const save=createRewardSave(),date=new Date('2026-07-01T04:00:00Z');
  tick(save,0,{date});tick(save,1,{date,activeFestivalIds:['halloween','christmas','__proto__']});
  assert.equal(save.totalSeconds,1);assert.deepEqual(save.festivals,{});
  assert.equal(claimFestivalWelcome(save,'halloween',date).ok,false);
});

test('overlapping real festivals can each record the same valid session minute',()=>{
  const save=createRewardSave(),date=new Date('2026-02-14T04:00:00Z');
  tick(save,0,{date,activeFestivalIds:['spring','valentine']});
  tick(save,1,{date,activeFestivalIds:['spring','valentine']});
  assert.equal(save.totalSeconds,1);
  assert.equal(save.festivals['spring:2026'].seconds,1);
  assert.equal(save.festivals['valentine:2026'].seconds,1);
});

test('new year keeps one occurrence over December and January',()=>{
  const save=createRewardSave(),dec=new Date('2026-12-30T04:00:00Z'),jan=new Date('2027-01-02T04:00:00Z');
  assert.equal(claimFestivalWelcome(save,'newyear',dec).ok,true);
  assert.equal(claimFestivalWelcome(save,'newyear',jan).ok,false);
  tick(save,0,{date:dec,activeFestivalIds:['newyear']});tick(save,1,{date:dec,activeFestivalIds:['newyear']});
  tick(save,2,{date:jan,activeFestivalIds:['newyear']});
  assert.equal(save.festivals['newyear:2027'].seconds,2);
  assert.equal(Object.keys(save.festivals).length,1);
});

test('welcome gifts are once per occurrence and the next year has its own gift',()=>{
  const save=createRewardSave();const first=claimFestivalWelcome(save,'halloween',HALLOWEEN);
  assert.equal(first.ok,true);assert.equal(save.stardust,10);assert.equal(save.inventory.glow_candy,1);
  assert.equal(claimFestivalWelcome(save,'halloween',HALLOWEEN).ok,false);
  assert.equal(claimFestivalWelcome(save,'halloween',new Date('2027-10-28T04:00:00Z')).ok,true);
  assert.equal(save.stardust,20);assert.equal(claimFestivalWelcome(save,'__proto__',HALLOWEEN).ok,false);
});

test('ordinary thresholds are cumulative, idempotent and grant a usable outfit',()=>{
  const save=createRewardSave();save.totalSeconds=1800;
  assert.equal(claimBaseReward(save,'base-60').ok,false);
  const reward=claimBaseReward(save,'base-30');assert.equal(reward.ok,true);
  assert.deepEqual(reward.unlockedOutfits,['starlight']);assert.equal(save.stardust,35);
  assert.equal(claimBaseReward(save,'base-30').ok,false);
  assert.equal(save.inventory.star_compass,2);
  assert.equal(claimBaseReward(save,'base-2').ok,true);
  assert.equal(save.stardust,43);
});

test('richer festival tiers require actual accrued event time and unlock its outfit',()=>{
  const save=createRewardSave();save.totalSeconds=1200;
  claimFestivalWelcome(save,'halloween',HALLOWEEN);
  assert.equal(claimFestivalReward(save,'halloween','event-20',HALLOWEEN).ok,false);
  save.festivals['halloween:2026'].seconds=1200;
  const reward=claimFestivalReward(save,'halloween','event-20',HALLOWEEN);
  assert.equal(reward.ok,true);assert.deepEqual(reward.unlockedOutfits,['halloween']);
  assert.equal(claimFestivalReward(save,'halloween','event-20',HALLOWEEN).ok,false);
  assert.equal(save.stardust,50);assert.equal(save.inventory.feather_charm,2);
  assert.equal(FESTIVAL_MILESTONES.at(-1).rewards.stardust>FESTIVAL_MILESTONES[0].rewards.stardust,true);
});

test('already earned gifts remain discoverable and claimable after their event and year',()=>{
  const save=createRewardSave();save.totalSeconds=480;
  save.festivals['halloween:2026']={id:'halloween',seconds:480,welcomed:true,claimed:[]};
  const overview=getRewardOverview(save,{date:new Date('2027-07-01T04:00:00Z')});
  assert.equal(overview.archived.length,1);assert.equal(overview.archived[0].key,'halloween:2026');
  assert.equal(overview.archived[0].tiers.filter(t=>t.available).length,2);
  assert.equal(claimFestivalOccurrenceReward(save,'halloween:2026','event-8').ok,true);
  assert.equal(claimFestivalOccurrenceReward(save,'__proto__','event-8').ok,false);
});

test('stardust buys actual consumables without negative balances or unknown item writes',()=>{
  const save=createRewardSave();save.stardust=13;
  assert.equal(purchaseRewardItem(save,'star_compass').ok,true);
  assert.equal(save.stardust,5);assert.equal(save.inventory.star_compass,1);
  assert.equal(purchaseRewardItem(save,'feather_charm').ok,false);
  assert.equal(purchaseRewardItem(save,'__proto__').ok,false);
  assert.equal(purchaseRewardItem(save,'glow_candy').ok,true);assert.equal(save.stardust,0);
  assert.equal(consumeRewardItem(save,'glow_candy'),true);
  assert.equal(consumeRewardItem(save,'glow_candy'),false);
  assert.equal(consumeRewardItem(save,'unknown'),false);
});

test('grants and purchases respect inventory caps',()=>{
  const save=createRewardSave();save.stardust=9999;save.totalSeconds=7200;
  for(const item of REWARD_ITEMS)save.inventory[item.id]=9999;
  assert.equal(claimBaseReward(save,'base-120').ok,true);
  assert.equal(save.stardust,9999);assert.equal(save.inventory.feather_charm,9999);
  assert.equal(purchaseRewardItem(save,'glow_candy').ok,false);
  assert.equal(save.stardust,9999);
});

test('overview computes meaningful progress, available rewards and inventory prices',()=>{
  const save=createRewardSave();save.totalSeconds=150;
  const overview=getRewardOverview(save,{date:HALLOWEEN});
  assert.equal(overview.base[0].available,true);assert.equal(overview.base[1].remainingSeconds,150);
  assert.equal(overview.nextBase.id,'base-2');assert.equal(overview.claimableCount,2);
  assert.equal(overview.festivals[0].welcome.available,true);
  assert.deepEqual(overview.inventory.map(i=>i.price),[5,8,12]);
});

test('save validation bounds collections, prevents prototype keys and keeps legitimate roundtrips',()=>{
  const malformed=JSON.parse('{"version":1,"totalSeconds":300,"stardust":999999,"inventory":{"glow_candy":-5,"star_compass":99999,"__proto__":{"polluted":1}},"claimedBase":["base-2","base-120","bogus"],"festivals":{"__proto__":{"seconds":8},"halloween:2026":{"seconds":9999,"claimed":["event-3","event-75"]}},"outfits":["halloween","bogus","halloween"],"badges":["steady-light","bad"]}');
  const save=validateRewardSave(malformed);
  assert.equal(save.stardust,9999);assert.equal(save.inventory.glow_candy,0);assert.equal(save.inventory.star_compass,9999);
  assert.deepEqual(save.claimedBase,['base-2']);assert.equal(save.festivals['halloween:2026'].seconds,300);
  assert.deepEqual(save.festivals['halloween:2026'].claimed,['event-3']);assert.deepEqual(save.outfits,['halloween']);
  assert.equal({}.polluted,undefined);assert.equal(Object.hasOwn(save.festivals,'__proto__'),false);
  const storage=memoryStore();assert.equal(persistRewardSave(save,storage),true);
  assert.deepEqual(loadRewardSave(storage),save);
  assert.deepEqual(validateRewardSave({version:99}),createRewardSave());
});

test('unavailable or corrupted storage does not block play',()=>{
  const storage={getItem(){throw new Error('denied');},setItem(){throw new Error('full');}};
  assert.deepEqual(loadRewardSave(storage),createRewardSave());assert.equal(persistRewardSave(createRewardSave(),storage),false);
  const tracker=createRewardTracker({gameId:'dream',storage});
  tracker.track({sessionId:'a',time:0,playing:true,visible:true,date:HALLOWEEN});
  tracker.track({sessionId:'a',time:1,playing:true,visible:true,date:at(1)});
  assert.equal(tracker.getSave().totalSeconds,1);
});

test('tracker prevents two active windows counting the same real interval',()=>{
  const storage=memoryStore(),a=createRewardTracker({gameId:'dream',storage,ownerId:'window-a'}),b=createRewardTracker({gameId:'survivor',storage,ownerId:'window-b'});
  const sample=(time,extra={})=>({sessionId:'run',time,playing:true,visible:true,date:at(time),...extra});
  a.track(sample(0));assert.equal(b.track(sample(0)).reason,'another-window');
  a.track(sample(1));assert.equal(b.track(sample(1)).added,0);
  assert.equal(loadRewardSave(storage).totalSeconds,1);
  a.track(sample(1,{playing:false,date:at(1.2)}));
  assert.equal(b.track(sample(2)).added,0);assert.equal(b.track(sample(3)).added,1);
  assert.equal(loadRewardSave(storage).totalSeconds,2);
});

test('tracker transactions refresh inventory so stale tabs cannot spend already spent stars',()=>{
  const storage=memoryStore(),save=createRewardSave();save.stardust=8;persistRewardSave(save,storage);
  const a=createRewardTracker({gameId:'dream',storage}),b=createRewardTracker({gameId:'survivor',storage});
  assert.equal(a.purchase('star_compass').ok,true);
  assert.equal(b.purchase('star_compass').ok,false);
  assert.equal(b.getSave().stardust,0);assert.equal(b.consume('star_compass'),true);
  a.flush();assert.equal(loadRewardSave(storage).inventory.star_compass,0);
});

test('item use checks the latest inventory and spends only after a successful effect',()=>{
  const storage=memoryStore(),save=createRewardSave();save.inventory.glow_candy=1;persistRewardSave(save,storage);
  const tracker=createRewardTracker({gameId:'dream',storage});let effects=0;
  assert.equal(tracker.consumeIf('glow_candy',()=>false),false);
  assert.equal(tracker.getSave().inventory.glow_candy,1);
  assert.equal(tracker.consumeIf('glow_candy',()=>{throw new Error('not available');}),false);
  assert.equal(tracker.consumeIf('glow_candy',()=>{effects++;return true;}),true);
  assert.equal(tracker.consumeIf('glow_candy',()=>{effects++;return true;}),false);
  assert.equal(effects,1);assert.equal(loadRewardSave(storage).inventory.glow_candy,0);
});

test('using a welcome compass persists its consumption when the effect emits a paused HUD sample',()=>{
  const storage=memoryStore(),tracker=createRewardTracker({gameId:'dream',storage});
  assert.equal(tracker.claimWelcome('halloween',HALLOWEEN).ok,true);
  assert.equal(tracker.getSave().inventory.star_compass,1);
  tracker.track({sessionId:'story',time:1,playing:false,visible:true,date:HALLOWEEN});
  let effects=0;
  assert.equal(tracker.consumeIf('star_compass',()=>{
    effects++;
    tracker.track({sessionId:'story',time:1,playing:false,visible:true,date:HALLOWEEN});
    tracker.refresh();tracker.flush();
    return true;
  }),true);
  assert.equal(tracker.getSave().inventory.star_compass,0);
  assert.equal(loadRewardSave(storage).inventory.star_compass,0);
  assert.equal(loadRewardSave(storage).totalSeconds,0);
  assert.equal(tracker.consumeIf('star_compass',()=>{effects++;return true;}),false);
  assert.equal(effects,1);
  const reload=createRewardTracker({gameId:'dream',storage});
  assert.equal(reload.getSave().inventory.star_compass,0);
});

test('reentrant active HUD samples retain their time while item transactions commit or decline',()=>{
  const storage=memoryStore(),tracker=createRewardTracker({gameId:'dream',storage});
  tracker.claimWelcome('halloween',HALLOWEEN);
  const sample=time=>({sessionId:'story',time,playing:true,visible:true,date:at(time)});
  tracker.track(sample(0));
  assert.equal(tracker.consumeIf('star_compass',()=>{assert.equal(tracker.track(sample(1)).added,1);return true;}),true);
  assert.equal(loadRewardSave(storage).inventory.star_compass,0);
  assert.equal(loadRewardSave(storage).totalSeconds,1);
  assert.equal(tracker.consumeIf('glow_candy',()=>{assert.equal(tracker.track(sample(2)).added,1);return false;}),false);
  assert.equal(loadRewardSave(storage).inventory.glow_candy,1);
  assert.equal(loadRewardSave(storage).totalSeconds,2);
  assert.equal(loadRewardSave(storage).festivals['halloween:2026'].seconds,2);
});

test('an item effect cannot reenter another spend or replace its pending inventory transaction',()=>{
  const storage=memoryStore(),tracker=createRewardTracker({gameId:'dream',storage});
  tracker.claimWelcome('halloween',HALLOWEEN);
  let effects=0;
  assert.equal(tracker.consumeIf('star_compass',()=>{
    effects++;
    assert.equal(tracker.consumeIf('star_compass',()=>{effects++;return true;}),false);
    assert.equal(tracker.consume('star_compass'),false);
    assert.equal(tracker.purchase('glow_candy').ok,false);
    assert.equal(tracker.replace(createRewardSave()),false);
    return true;
  }),true);
  assert.equal(effects,1);
  assert.equal(loadRewardSave(storage).inventory.star_compass,0);
  assert.equal(loadRewardSave(storage).inventory.glow_candy,1);
  assert.equal(loadRewardSave(storage).stardust,10);
});

test('confirmed replacement resets samples and cannot credit the previous run to imported progress',()=>{
  const storage=memoryStore(),tracker=createRewardTracker({gameId:'dream',storage});
  tracker.track({sessionId:'old',time:0,playing:true,visible:true,date:HALLOWEEN});
  tracker.track({sessionId:'old',time:1,playing:true,visible:true,date:at(1)});
  const incoming=createRewardSave();incoming.totalSeconds=300;incoming.stardust=12;
  assert.equal(tracker.replace(incoming),true);
  assert.equal(tracker.track({sessionId:'old',time:100,playing:true,visible:true,date:at(2)}).added,0);
  assert.equal(tracker.getSave().totalSeconds,300);assert.equal(tracker.getSave().stardust,12);
  assert.equal(tracker.claimBase(BASE_MILESTONES[0].id).ok,true);
  assert.equal(tracker.getSave().stardust,20);
});

test('travel supplies continue after two hours, with one package per additional active half-hour',()=>{
  const save=createRewardSave();save.totalSeconds=7200;
  assert.equal(claimTravelSupply(save).ok,false);
  let overview=getRewardOverview(save,{date:HALLOWEEN});
  assert.equal(overview.supply.remainingSeconds,1800);assert.equal(overview.supply.nextSeconds,9000);
  save.totalSeconds=9000;assert.equal(claimTravelSupply(save).ok,true);
  assert.equal(save.supplyClaims,1);assert.equal(save.stardust,18);assert.equal(save.inventory.glow_candy,2);
  assert.equal(claimTravelSupply(save).ok,false);
  save.totalSeconds=12600;overview=getRewardOverview(save,{date:HALLOWEEN});
  assert.equal(overview.supply.availablePacks,2);
  assert.equal(claimTravelSupply(save).packNumber,2);assert.equal(claimTravelSupply(save).packNumber,3);
  assert.equal(claimTravelSupply(save).ok,false);assert.equal(save.stardust,54);
});

test('travel supply claims survive reload and paused time cannot cross their threshold',()=>{
  const save=createRewardSave();save.totalSeconds=8999;
  tick(save,0);tick(save,1,{playing:false});tick(save,100,{playing:false});tick(save,101);
  assert.equal(save.totalSeconds,8999);assert.equal(claimTravelSupply(save).ok,false);
  tick(save,102);assert.equal(save.totalSeconds,9000);
  const storage=memoryStore();persistRewardSave(save,storage);
  const tracker=createRewardTracker({gameId:'dream',storage});assert.equal(tracker.claimSupply().ok,true);
  const reload=createRewardTracker({gameId:'survivor',storage});assert.equal(reload.claimSupply().ok,false);
  assert.equal(reload.getSave().supplyClaims,1);assert.equal(reload.getSave().stardust,18);
});

test('travel supply counters are finite and cannot claim beyond cumulative playtime',()=>{
  const malformed=createRewardSave();malformed.totalSeconds=999999999999;malformed.supplyClaims=999999999999;
  const save=validateRewardSave(malformed);
  assert.equal(save.totalSeconds,100000000);assert.equal(save.supplyClaims,50000);
  assert.equal(claimTravelSupply(save).ok,false);assert.equal(getRewardOverview(save,{date:HALLOWEEN}).supply.maxed,true);
  assert.equal(validateRewardSave({...malformed,totalSeconds:7200,supplyClaims:100}).supplyClaims,0);
});
