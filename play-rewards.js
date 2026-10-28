import { getActiveFestivals, getFestival, getFestivalOccurrenceKey } from './dream-festivals.js';

// Both games share this small local ledger. Only engine time is counted.
export const REWARD_SAVE_KEY = 'tougaigu.rewards.v1';
export const REWARD_LEASE_KEY = 'tougaigu.rewards.clock.v1';
const FESTIVAL_IDS = ['halloween','thanksgiving','christmas','newyear','spring','lantern','valentine','dragonboat','qixi','midautumn'];
const FESTIVAL_SET = new Set(FESTIVAL_IDS);
const MAX_SECONDS = 100000000;
const MAX_STACK = 9999;
const MAX_EVENT_RECORDS = 120;
const MAX_SESSIONS = 16;
const SUPPLY_START = 7200;
const SUPPLY_INTERVAL = 1800;
const MAX_SUPPLY_PACKS = 50000;
const LEASE_MS = 1800;
const own = (object, key) => object != null && Object.hasOwn(object, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bounded = (value, max, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Math.floor(Number(value)))) : fallback;
const seconds = value => Number.isFinite(Number(value)) ? Math.max(0, Math.min(MAX_SECONDS, Math.round(Number(value) * 1000) / 1000)) : 0;
const dateOf = value => { const date = value instanceof Date ? value : new Date(value === undefined ? Date.now() : value); return Number.isFinite(date.getTime()) ? date : null; };
const validSessionId = value => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,96}$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
const eventIdFromKey = key => {
  const match = /^(halloween|thanksgiving|christmas|newyear|spring|lantern|valentine|dragonboat|qixi|midautumn):(20\d\d|21\d\d|2200)$/.exec(key);
  return match ? match[1] : null;
};

export const REWARD_ITEMS = Object.freeze([
  { id:'glow_candy',name:'灵光糖',desc:'立即补满拾光的灵光；灵光已满时不会消耗。',color:'#e7b079',price:5 },
  { id:'star_compass',name:'寻星罗盘',desc:'30 秒内指向尚未收集的礼物、谜灯与出口。',color:'#b7d7ed',price:8 },
  { id:'feather_charm',name:'轻羽护符',desc:'抵消下一次跌落的计数，仍会回到检查点。',color:'#c6e0b7',price:12 },
]);
const ITEM_IDS = new Set(REWARD_ITEMS.map(item => item.id));
const payload = (stardust, items = {}, outfits = [], badges = []) => ({stardust,items,outfits,badges});
export const BASE_MILESTONES = Object.freeze([
  {id:'base-2',title:'第一束光',seconds:120,rewards:payload(8,{glow_candy:1})},
  {id:'base-5',title:'走过一小段',seconds:300,rewards:payload(12,{glow_candy:1,star_compass:1})},
  {id:'base-15',title:'口袋渐渐发亮',seconds:900,rewards:payload(22,{glow_candy:2,feather_charm:1})},
  {id:'base-30',title:'披上晨星',seconds:1800,rewards:payload(35,{star_compass:2,feather_charm:1},['starlight'])},
  {id:'base-60',title:'一路有光',seconds:3600,rewards:payload(55,{glow_candy:3,star_compass:2,feather_charm:2},[],['steady-light'])},
  {id:'base-120',title:'星夜收藏家',seconds:7200,rewards:payload(90,{glow_candy:4,star_compass:3,feather_charm:3},[],['night-collector'])},
]);
export const FESTIVAL_MILESTONES = Object.freeze([
  {id:'event-3',title:'街角小礼',seconds:180,rewards:payload(12,{glow_candy:2})},
  {id:'event-8',title:'暖灯礼包',seconds:480,rewards:payload(22,{glow_candy:2,star_compass:2})},
  {id:'event-20',title:'节日盛装',seconds:1200,rewards:payload(40,{star_compass:2,feather_charm:2},['$festival'])},
  {id:'event-40',title:'满载而归',seconds:2400,rewards:payload(65,{glow_candy:4,star_compass:3,feather_charm:3})},
  {id:'event-75',title:'守灯人的谢礼',seconds:4500,rewards:payload(100,{glow_candy:5,star_compass:4,feather_charm:4},[],['$festival-friend'])},
]);
export const FESTIVAL_WELCOME_REWARD = Object.freeze(payload(10,{glow_candy:1,star_compass:1}));
export const TRAVEL_SUPPLY_REWARD = Object.freeze(payload(18,{glow_candy:2,star_compass:1}));
const BADGE_IDS = new Set(['steady-light','night-collector',...FESTIVAL_IDS.map(id=>id+'-friend')]);
const OUTFIT_IDS = new Set(['starlight',...FESTIVAL_IDS]);

const copyPayload = (value, festivalId) => ({
  stardust:value.stardust,
  items:{...value.items},
  outfits:value.outfits.map(id=>id==='$festival'?festivalId:id).filter(Boolean),
  badges:value.badges.map(id=>id==='$festival-friend'?festivalId+'-friend':id),
});
const emptyEvent = id => ({id,seconds:0,welcomed:false,claimed:[]});
export function createRewardSave() {
  return {version:1,totalSeconds:0,stardust:0,inventory:{glow_candy:0,star_compass:0,feather_charm:0},claimedBase:[],supplyClaims:0,festivals:{},outfits:[],badges:[],sessions:{}};
}

export function validateRewardSave(value) {
  const clean=createRewardSave();
  if(!plain(value)||value.version!==1)return clean;
  clean.totalSeconds=seconds(value.totalSeconds);
  clean.supplyClaims=Math.min(bounded(value.supplyClaims,MAX_SUPPLY_PACKS),earnedSupplyPacks(clean.totalSeconds));
  clean.stardust=bounded(value.stardust,MAX_STACK);
  for(const id of ITEM_IDS)if(plain(value.inventory)&&own(value.inventory,id))clean.inventory[id]=bounded(value.inventory[id],MAX_STACK);
  if(Array.isArray(value.claimedBase))clean.claimedBase=BASE_MILESTONES.filter(t=>t.seconds<=clean.totalSeconds&&value.claimedBase.includes(t.id)).map(t=>t.id);
  if(plain(value.festivals))for(const key of Object.keys(value.festivals).filter(key=>eventIdFromKey(key)).sort((a,b)=>Number(b.split(':')[1])-Number(a.split(':')[1])||a.localeCompare(b)).slice(0,MAX_EVENT_RECORDS)){
    const record=value.festivals[key],id=eventIdFromKey(key);if(!plain(record))continue;
    const entry=emptyEvent(id);entry.seconds=Math.min(clean.totalSeconds,seconds(record.seconds));entry.welcomed=record.welcomed===true;
    if(Array.isArray(record.claimed))entry.claimed=FESTIVAL_MILESTONES.filter(t=>t.seconds<=entry.seconds&&record.claimed.includes(t.id)).map(t=>t.id);
    clean.festivals[key]=entry;
  }
  if(Array.isArray(value.outfits))clean.outfits=[...new Set(value.outfits.filter(id=>OUTFIT_IDS.has(id)))];
  if(Array.isArray(value.badges))clean.badges=[...new Set(value.badges.filter(id=>BADGE_IDS.has(id)))];
  if(plain(value.sessions))for(const [key,record] of Object.entries(value.sessions).filter(([key,r])=>validSessionId(key)&&plain(r)).sort((a,b)=>Number(b[1].seen)-Number(a[1].seen)).slice(0,MAX_SESSIONS)){
    if(!['dream','survivor'].includes(record.gameId))continue;
    clean.sessions[key]={gameId:record.gameId,time:seconds(record.time),seen:bounded(record.seen,9000000000000000),creditable:record.creditable===true};
  }
  return clean;
}

const resolveStorage = storage => {try{return storage===undefined?globalThis.localStorage:storage;}catch{return null;}};
export function loadRewardSave(storage) {
  try{const target=resolveStorage(storage),raw=target?.getItem(REWARD_SAVE_KEY);return raw&&raw.length<=200000?validateRewardSave(JSON.parse(raw)):createRewardSave();}catch{return createRewardSave();}
}
export function persistRewardSave(save,storage) {
  try{const target=resolveStorage(storage);if(!target)return false;target.setItem(REWARD_SAVE_KEY,JSON.stringify(validateRewardSave(save)));return true;}catch{return false;}
}

let calendarCache=null;
function actualActiveIds(date){
  const day=new Date(date.getTime()+8*3600000).toISOString().slice(0,10);
  if(calendarCache?.day!==day)calendarCache={day,ids:new Set(getActiveFestivals(date).map(f=>f.id))};
  return calendarCache.ids;
}
function occurrence(id,date){if(!FESTIVAL_SET.has(id)||!date)return null;const key=getFestivalOccurrenceKey(id,date);return eventIdFromKey(key)===id?key:null;}
function ensureEvent(save,id,date){const key=occurrence(id,date);if(!key)return null;if(!own(save.festivals,key))save.festivals[key]=emptyEvent(id);return {key,record:save.festivals[key]};}
function trimSessions(save){const keys=Object.keys(save.sessions);if(keys.length<=MAX_SESSIONS)return;keys.sort((a,b)=>save.sessions[b].seen-save.sessions[a].seen).slice(MAX_SESSIONS).forEach(key=>delete save.sessions[key]);}

/** First sample establishes a baseline. Gaps, pauses and repeated timestamps never create play time. */
export function accruePlayTime(save,{sessionId,gameId,time,playing,visible,activeFestivalIds,date}={}) {
  const moment=dateOf(date);
  if(!moment||!validSessionId(sessionId)||!['dream','survivor'].includes(gameId)||!Number.isFinite(time)||time<0||time>MAX_SECONDS)return {added:0,festivalsAdded:{},reason:'invalid-sample'};
  const key=gameId+':'+sessionId;if(!validSessionId(key))return {added:0,festivalsAdded:{},reason:'invalid-session'};
  const previous=own(save.sessions,key)?save.sessions[key]:null;
  const creditable=playing===true&&visible===true;
  save.sessions[key]={gameId,time,seen:moment.getTime(),creditable};trimSessions(save);
  if(!previous||!creditable||!previous.creditable)return {added:0,festivalsAdded:{},reason:creditable?'baseline':'paused'};
  const delta=time-previous.time;
  // A resumed tab or imported/replaced session must not receive catch-up rewards.
  if(!(delta>0)||delta>2.001)return {added:0,festivalsAdded:{},reason:delta>2.001?'time-gap':'duplicate'};
  const added=Math.min(MAX_SECONDS-save.totalSeconds,Math.round(delta*1000)/1000);
  if(!(added>0))return {added:0,festivalsAdded:{},reason:'cap'};
  save.totalSeconds=seconds(save.totalSeconds+added);
  const active=actualActiveIds(moment),requested=Array.isArray(activeFestivalIds)?new Set(activeFestivalIds.filter(id=>FESTIVAL_SET.has(id))):active;
  const festivalsAdded={};
  for(const id of requested){
    if(!active.has(id))continue;
    const event=ensureEvent(save,id,moment);if(!event)continue;
    event.record.seconds=seconds(event.record.seconds+added);festivalsAdded[event.key]=added;
  }
  return {added,festivalsAdded,reason:'playing'};
}

const rowFor=(tier,played,claimed,festivalId)=>({...tier,rewards:copyPayload(tier.rewards,festivalId),playedSeconds:played,remainingSeconds:Math.max(0,tier.seconds-played),progress:Math.min(1,played/tier.seconds),claimed:claimed.includes(tier.id),available:played>=tier.seconds&&!claimed.includes(tier.id)});
const earnedSupplyPacks=played=>Math.min(MAX_SUPPLY_PACKS,Math.max(0,Math.floor((played-SUPPLY_START)/SUPPLY_INTERVAL)));
export function getRewardOverview(save,{date,activeFestivals}={}){
  const safe=validateRewardSave(save),moment=dateOf(date)||new Date(),actual=actualActiveIds(moment);
  const requested=Array.isArray(activeFestivals)?activeFestivals.map(f=>typeof f==='string'?f:f?.id):[...actual];
  const ids=[...new Set(requested.filter(id=>actual.has(id)))];
  const base=BASE_MILESTONES.map(tier=>rowFor(tier,safe.totalSeconds,safe.claimedBase));
  const festivals=ids.map(id=>{
    const key=occurrence(id,moment),record=safe.festivals[key]||emptyEvent(id),spec=getFestival(id);
    const tiers=FESTIVAL_MILESTONES.map(tier=>rowFor(tier,record.seconds,record.claimed,id));
    return {id,key,name:spec?.name||id,title:spec?.title||spec?.name||id,active:true,seconds:record.seconds,welcome:{claimed:record.welcomed,available:!record.welcomed,rewards:copyPayload(FESTIVAL_WELCOME_REWARD,id)},tiers,next:tiers.find(row=>!row.claimed)||null};
  });
  const currentKeys=new Set(festivals.map(event=>event.key));
  const archived=Object.entries(safe.festivals).filter(([key])=>!currentKeys.has(key)).map(([key,record])=>{
    const spec=getFestival(record.id),tiers=FESTIVAL_MILESTONES.map(tier=>rowFor(tier,record.seconds,record.claimed,record.id));
    return {id:record.id,key,name:spec?.name||record.id,title:spec?.title||record.id,year:Number(key.split(':')[1]),active:false,seconds:record.seconds,tiers};
  }).filter(event=>event.tiers.some(row=>row.available));
  const earned=earnedSupplyPacks(safe.totalSeconds),availablePacks=Math.max(0,earned-safe.supplyClaims),nextSeconds=SUPPLY_START+(safe.supplyClaims+1)*SUPPLY_INTERVAL,maxed=safe.supplyClaims>=MAX_SUPPLY_PACKS;
  const supply={available:availablePacks>0,availablePacks,claimedPacks:safe.supplyClaims,remainingSeconds:maxed?0:Math.max(0,nextSeconds-safe.totalSeconds),progress:maxed?1:Math.max(0,Math.min(1,(safe.totalSeconds-(nextSeconds-SUPPLY_INTERVAL))/SUPPLY_INTERVAL)),rewards:copyPayload(TRAVEL_SUPPLY_REWARD),nextSeconds,maxed};
  return {totalSeconds:safe.totalSeconds,stardust:safe.stardust,inventory:REWARD_ITEMS.map(item=>({...item,amount:safe.inventory[item.id]})),outfits:[...safe.outfits],badges:[...safe.badges],base,festivals,archived,supply,nextBase:base.find(row=>!row.claimed)||null,claimableCount:base.filter(row=>row.available).length+festivals.reduce((sum,event)=>sum+Number(event.welcome.available)+event.tiers.filter(row=>row.available).length,0)+archived.reduce((sum,event)=>sum+event.tiers.filter(row=>row.available).length,0)+availablePacks};
}

function grant(save,rewards){
  save.stardust=Math.min(MAX_STACK,save.stardust+rewards.stardust);
  for(const id of ITEM_IDS)save.inventory[id]=Math.min(MAX_STACK,save.inventory[id]+(rewards.items[id]||0));
  const unlockedOutfits=rewards.outfits.filter(id=>OUTFIT_IDS.has(id)&&!save.outfits.includes(id));
  const unlockedBadges=rewards.badges.filter(id=>BADGE_IDS.has(id)&&!save.badges.includes(id));
  save.outfits.push(...unlockedOutfits);save.badges.push(...unlockedBadges);
  return {ok:true,rewards,unlockedOutfits,unlockedBadges};
}
export function claimBaseReward(save,tierId){
  const tier=BASE_MILESTONES.find(t=>t.id===tierId);if(!tier)return {ok:false,reason:'没有这份礼物'};
  if(save.claimedBase.includes(tierId))return {ok:false,reason:'这份礼物已经收好'};
  if(save.totalSeconds<tier.seconds)return {ok:false,reason:'游玩时长还未达到'};
  save.claimedBase.push(tierId);return grant(save,copyPayload(tier.rewards));
}
export function claimTravelSupply(save){
  const earned=earnedSupplyPacks(save.totalSeconds),claimed=bounded(save.supplyClaims,MAX_SUPPLY_PACKS);
  if(claimed>=earned)return {ok:false,reason:claimed>=MAX_SUPPLY_PACKS?'所有旅途补给都已收好':'下一份补给还在路上'};
  save.supplyClaims=claimed+1;
  return {...grant(save,copyPayload(TRAVEL_SUPPLY_REWARD)),packNumber:save.supplyClaims};
}
export function claimFestivalWelcome(save,festivalId,date){
  const moment=dateOf(date);if(!moment||!FESTIVAL_SET.has(festivalId)||!actualActiveIds(moment).has(festivalId))return {ok:false,reason:'这份见面礼会在节日期间开放'};
  const event=ensureEvent(save,festivalId,moment);if(!event)return {ok:false,reason:'活动日期不可用'};
  if(event.record.welcomed)return {ok:false,reason:'今年的见面礼已经收好'};
  event.record.welcomed=true;return grant(save,copyPayload(FESTIVAL_WELCOME_REWARD,festivalId));
}
export function claimFestivalReward(save,festivalId,tierId,date){
  const moment=dateOf(date),tier=FESTIVAL_MILESTONES.find(t=>t.id===tierId);
  if(!tier||!moment||!FESTIVAL_SET.has(festivalId))return {ok:false,reason:'没有这份节日礼物'};
  const key=occurrence(festivalId,moment);
  return claimFestivalOccurrenceReward(save,key,tierId);
}
export function claimFestivalOccurrenceReward(save,key,tierId){
  const festivalId=typeof key==='string'?eventIdFromKey(key):null,tier=FESTIVAL_MILESTONES.find(t=>t.id===tierId);
  if(!festivalId||!tier)return {ok:false,reason:'没有这份节日礼物'};
  const record=own(save.festivals,key)?save.festivals[key]:null;
  // Earned tiers remain claimable after the event; only earning time and welcome gifts are date-gated.
  if(!record||record.seconds<tier.seconds)return {ok:false,reason:'节日游玩时长还未达到'};
  if(record.claimed.includes(tierId))return {ok:false,reason:'这份节日礼物已经收好'};
  record.claimed.push(tierId);return grant(save,copyPayload(tier.rewards,festivalId));
}
export function consumeRewardItem(save,itemId){if(!ITEM_IDS.has(itemId)||!(save.inventory[itemId]>0))return false;save.inventory[itemId]--;return true;}
export function purchaseRewardItem(save,itemId){
  const item=REWARD_ITEMS.find(item=>item.id===itemId);if(!item)return {ok:false,reason:'没有这件道具'};
  if(save.inventory[itemId]>=MAX_STACK)return {ok:false,reason:'邮包已经装满这件道具'};
  if(save.stardust<item.price)return {ok:false,reason:'星砂还不够'};
  save.stardust-=item.price;save.inventory[itemId]++;return {ok:true,itemId,price:item.price,amount:save.inventory[itemId]};
}

/** A synchronous storage-backed service for normal multi-tab use, not an anti-cheat authority. */
export function createRewardTracker({gameId,storage,ownerId}={}){
  if(!['dream','survivor'].includes(gameId))throw new TypeError('Unknown game for reward tracker');
  const target=resolveStorage(storage);
  const owner=validSessionId(ownerId)?ownerId:'reward-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
  let current=loadRewardSave(target),blocked=false,lastSample=null,volatile=!target;
  let transactionActive=false,pendingWrite=false;
  // Item effects may synchronously emit a HUD sample. Keep that sample on the
  // transaction's live object and persist once, after the effect has succeeded.
  const read=()=>{if(!transactionActive&&!volatile)current=loadRewardSave(target);return current;};
  const write=()=>{if(transactionActive){pendingWrite=true;return true;}const okay=persistRewardSave(current,target);if(!okay)volatile=true;return okay;};
  const release=()=>{try{const raw=JSON.parse(target?.getItem(REWARD_LEASE_KEY)||'null');if(raw?.owner===owner)target.removeItem?.(REWARD_LEASE_KEY);}catch{/* Unavailable storage does not block play. */}};
  const lease=at=>{
    if(!target||volatile)return true;
    try{
      const previous=JSON.parse(target.getItem(REWARD_LEASE_KEY)||'null');
      if(previous?.owner!==owner&&typeof previous?.owner==='string'&&Number.isFinite(previous?.until)&&previous.until>at&&previous.until-at<=LEASE_MS)return false;
      target.setItem(REWARD_LEASE_KEY,JSON.stringify({owner,until:at+LEASE_MS}));
      return JSON.parse(target.getItem(REWARD_LEASE_KEY)||'null')?.owner===owner;
    }catch{volatile=true;return true;}
  };
  const transact=(fn,busyResult={ok:false,reason:'正在处理这份礼物，请稍后再试'})=>{
    if(transactionActive)return busyResult;
    read();transactionActive=true;pendingWrite=false;
    try{
      const result=fn(current);
      if(result===true||result?.ok)pendingWrite=true;
      return result;
    }finally{
      transactionActive=false;
      const shouldWrite=pendingWrite;pendingWrite=false;
      if(shouldWrite)write();
    }
  };
  return {
    track(sample={}){
      const moment=dateOf(sample.date);if(!moment)return {added:0,festivalsAdded:{},reason:'invalid-date'};
      const running=sample.playing===true&&sample.visible===true;
      // No need to synchronously write localStorage on every animation/HUD frame.
      if(running&&lastSample?.sessionId===sample.sessionId&&lastSample.running&&sample.time>=lastSample.time&&sample.time-lastSample.time<.25)return {added:0,festivalsAdded:{},reason:'sampling'};
      const allowed=!running||lease(moment.getTime());
      if(!allowed){blocked=true;lastSample=null;return {added:0,festivalsAdded:{},reason:'another-window'};}
      read();
      if(blocked){const key=gameId+':'+sample.sessionId;if(validSessionId(key))delete current.sessions[key];blocked=false;}
      const result=accruePlayTime(current,{...sample,gameId,date:moment});
      lastSample={sessionId:sample.sessionId,time:sample.time,running};write();
      if(!running)release();
      return result;
    },
    getSave(){return validateRewardSave(current);},
    refresh(){read();return validateRewardSave(current);},
    flush(){read();return write();},
    claimBase(tierId){return transact(save=>claimBaseReward(save,tierId));},
    claimSupply(){return transact(save=>claimTravelSupply(save));},
    claimWelcome(festivalId,date){return transact(save=>claimFestivalWelcome(save,festivalId,date));},
    claimFestival(festivalId,tierId,date){return transact(save=>claimFestivalReward(save,festivalId,tierId,date));},
    claimOccurrence(key,tierId){return transact(save=>claimFestivalOccurrenceReward(save,key,tierId));},
    claimFestivalKey(key,tierId){return transact(save=>claimFestivalOccurrenceReward(save,key,tierId));},
    consume(itemId){return transact(save=>consumeRewardItem(save,itemId),false);},
    consumeIf(itemId,apply){
      return transact(save=>{
        if(!ITEM_IDS.has(itemId)||!(save.inventory[itemId]>0)||typeof apply!=='function')return false;
        try{if(apply()!==true)return false;}catch{return false;}
        return consumeRewardItem(save,itemId);
      },false);
    },
    purchase(itemId){return transact(save=>purchaseRewardItem(save,itemId));},
    replace(next){if(transactionActive)return false;release();current=validateRewardSave(next);current.sessions={};lastSample=null;blocked=false;return write();},
    destroy(){release();lastSample=null;},
  };
}
