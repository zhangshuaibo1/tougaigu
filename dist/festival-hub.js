import {
  FESTIVALS, getFestival, getActiveFestivals, getCalendarDate,
  loadFestivalSave, validateFestivalSave, persistFestivalSave,
  getFestivalStats, getFestivalRecord, recordFestivalComplete,
  recordFestivalChoice, recordFestivalPuzzle, isFestivalOutfitUnlocked,
  unlockFestivalOutfit, equipFestivalOutfit,
} from './dream-festivals.js';
import { createRewardTracker, getRewardOverview, REWARD_ITEMS, validateRewardSave } from './play-rewards.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const picture = (kind,id) => './assets/festival-'+kind+'-'+id+'.svg';
const rewardPicture = id => './assets/reward-'+id+'.svg';
const itemName = id => REWARD_ITEMS.find(item=>item.id===id)?.name || id;
const duration = seconds => seconds < 60 ? Math.ceil(seconds)+'秒' : Math.floor(seconds/60)+'分'+(Math.floor(seconds%60) ? Math.floor(seconds%60)+'秒' : '');
const minutes = seconds => Math.round(seconds/60)+' 分钟';
const symbols = {
 gift:'<path d="M3 10h18v4H3Zm2 4v8h14v-8M12 10v12M12 9C1 11 5-1 12 9Zm0 0C23 11 19-1 12 9Z"/>',
 star:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
 coat:'<path d="m8 3 4 3 4-3 6 5-4 5-2-2v11H8V11l-2 2-4-5Z"/>',
 arrow:'<path d="M3 12h17m-6-6 6 6-6 6"/>',
 check:'<path d="m5 12 5 5L20 7"/>',
};
const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${symbols[name]}</svg>`;

/** Shared event, wardrobe and real-playtime UI; the host game owns pause/resume. */
export function createFestivalHub({ gameId='dream', onOpen, onClose, onLaunch, onOutfit, onSeason, onUseItem, onSummary, onNotice } = {}) {
  let save = loadFestivalSave();
  const tracker = createRewardTracker({gameId});
  let active = getActiveFestivals(new Date());
  let selectedId = active[0]?.id || 'halloween';
  let selectedTab = 'stories';
  let lastSummary = '';
  let lastRender = 0;
  let lastActivity = performance.now();
  let lastSnapshot = null;
  const pointers = new Set();
  const keyboard = new Set();
  let usable = false;
  let statusTimer;

  const dialog = document.createElement('dialog');
  dialog.id = 'festival-hub';
  dialog.className = 'festival-hub';
  dialog.setAttribute('aria-labelledby','festival-hub-title');
  dialog.innerHTML = `<div class="festival-hub-head"><div><span class="festival-kicker">黎明邮局 · 四季来信</span><h2 id="festival-hub-title">节日与礼物</h2></div><div class="hub-wallet" title="游玩获得，可兑换道具">${svg('star')}<b id="hub-stardust">0</b><span>星砂</span></div><button class="hub-close" aria-label="关闭节日与礼物">${svg('close')}</button></div>
    <nav class="hub-tabs" aria-label="节日与礼物分类"><button data-hub-tab="stories" aria-pressed="true">节日故事</button><button data-hub-tab="rewards" aria-pressed="false">时光礼物 <i id="hub-reward-dot" hidden></i></button><button data-hub-tab="wardrobe" aria-pressed="false">角色衣橱</button><button data-hub-tab="collection" aria-pressed="false">节日收藏</button></nav>
    <div id="hub-stories" class="hub-view"></div><div id="hub-rewards" class="hub-view" hidden></div><div id="hub-wardrobe" class="hub-view" hidden></div><div id="hub-collection" class="hub-view" hidden></div><p id="hub-status" class="hub-status" role="status" aria-live="polite"></p>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const announce = text => {
    clearTimeout(statusTimer); $('#hub-status').textContent=text;
    statusTimer=setTimeout(()=>{$('#hub-status').textContent='';},5000);
    onNotice?.(text);
  };
  function commitFestival() {
    if (!persistFestivalSave(save)) announce('浏览器暂时无法保存，请在设置里导出备份。');
  }
  function syncUnlocked() {
    let changed=false;
    for(const id of tracker.getSave().outfits || []) if(!isFestivalOutfitUnlocked(save,id)) changed=unlockFestivalOutfit(save,id)||changed;
    if(changed)commitFestival();
  }
  function overview() { return getRewardOverview(tracker.getSave(), {date:new Date(),activeFestivals:active}); }
  function outfit() { return save.settings?.selectedOutfit || 'auto'; }
  function effectiveOutfit(festival = null) { return outfit()==='auto' ? (festival?.id || active[0]?.id || 'default') : outfit(); }
  function portrait(festival = null,role='ashi') {
    if(role==='light')return './assets/portrait-soul.svg';
    const id=effectiveOutfit(festival);
    return id==='default' ? './assets/portrait-hero.svg' : picture('hero',id);
  }
  function rewardSummary(rewards) {
    if(!rewards)return '';
    const parts=[];
    if(rewards.stardust)parts.push('星砂 +'+rewards.stardust);
    for(const [id,count] of Object.entries(rewards.items || {}))if(count)parts.push(itemName(id)+' ×'+count);
    if(rewards.outfits?.length)parts.push(rewards.outfits[0]==='starlight'?'晨星披风':'节日装扮');
    if(rewards.badges?.length)parts.push('收藏徽章');
    return parts.join(' · ');
  }
  function publishSummary(force=false) {
    const info=overview();
    const summary={festival:active[0] || null,claimable:info.claimableCount,totalSeconds:info.totalSeconds,stardust:info.stardust,outfit:outfit(),portrait:portrait()};
    const key=[active.map(f=>f.id).join(','),info.claimableCount,Math.floor(info.totalSeconds/60),info.stardust,outfit()].join('|');
    if(force || key!==lastSummary){lastSummary=key;onSummary?.(summary);}
  }
  function updateCalendar() {
    const next=getActiveFestivals(new Date());
    if(next.map(f=>f.id).join('|')!==active.map(f=>f.id).join('|')){
      active=next;onSeason?.(active[0] || null);onOutfit?.(outfit());
      if(dialog.open)render();publishSummary(true);
    }
  }
  function renderStories() {
    const festival=getFestival(selectedId) || FESTIVALS[0];
    const ongoing=active.some(f=>f.id===festival.id);
    const record=getFestivalRecord(save,festival.id,new Date());
    const reward=overview().festivals.find(row=>row.id===festival.id && row.active!==false);
    $('#hub-stories').innerHTML=`<section class="festival-feature" style="--fest-color:${esc(festival.color)};--fest-accent:${esc(festival.accent || festival.color)}"><div class="festival-feature-art"><span class="festival-art-orbit"></span><img class="festival-art-npc" src="${picture('npc',festival.id)}" alt="${esc(festival.npc.name)}" width="190" height="190"><img class="festival-art-hero" src="${picture('hero',festival.id)}" alt="${esc(festival.name)}装扮的阿拾" width="116" height="116"><span class="festival-art-spark">✦</span></div><div class="festival-feature-copy"><span class="festival-state ${ongoing?'ongoing':''}">${ongoing?'正在发生':'四季回访'} · ${esc(festival.name)}</span><h3>${esc(festival.title)}</h3><p>${esc(festival.tagline)}</p><div class="festival-meta"><span>2 盏谜灯</span><span>3 份礼物</span><span>专属装扮</span></div><div class="festival-feature-actions"><button class="hub-primary" data-festival-enter="${festival.id}">${record?.completed?'重访故事':'进入故事'} ${svg('arrow')}</button>${ongoing?`<button class="hub-gift-button" data-festival-welcome="${festival.id}" ${reward?.welcome.claimed?'disabled':''}>${svg('gift')}${reward?.welcome.claimed?'见面礼已收好':'领取见面礼'}</button>`:''}</div><small>${esc(festival.periodLabel)}${ongoing?' · 活动期间玩任一游戏都累计节日时长':' · 回访可收集故事纪念物'}</small></div></section><div class="hub-section-title"><h3>一年的十封来信</h3><span>随时回访，节日自动到来</span></div><div class="festival-grid">${FESTIVALS.map(f=>{
      const running=active.some(a=>a.id===f.id),finished=getFestivalRecord(save,f.id,new Date())?.completed;
      return `<button class="festival-card ${f.id===festival.id?'selected':''}" data-festival-select="${f.id}" aria-pressed="${f.id===festival.id}" style="--fest-color:${esc(f.color)}"><img src="${picture('npc',f.id)}" alt="" width="66" height="66" loading="lazy"><span><small>${esc(f.name)}${running?' · 进行中':''}</small><b>${esc(f.title)}</b><em>${finished?'已送达 ✓':esc(f.periodLabel)}</em></span></button>`;
    }).join('')}</div>`;
  }
  function milestone(row,kind,event=null) {
    const claim=kind==='base'?`data-reward-base="${row.id}"`:`data-reward-event="${row.id}" data-festival-id="${event.id}" data-event-key="${event.key}"`;
    return `<article class="reward-milestone ${row.claimed?'claimed':row.available?'ready':''}"><div class="reward-milestone-top"><b>${minutes(row.seconds)}</b><span>${row.claimed?'已领取':row.available?'可领取':'累计解锁'}</span></div><h4>${esc(row.title)}</h4><p>${esc(rewardSummary(row.rewards))}</p><div class="reward-progress"><i style="width:${Math.min(100,Math.max(0,row.progress*100))}%"></i></div><button ${claim} ${!row.available?'disabled':''}>${row.claimed?'已经收好':row.available?'领取礼物':'还差 '+duration(row.remainingSeconds)}</button></article>`;
  }
  function renderRewards() {
    const info=overview();
    $('#hub-rewards').innerHTML=`<div class="reward-overview"><span class="reward-clock">${svg('clock')}</span><div><small>累计有效游玩</small><strong>${duration(info.totalSeconds)}</strong></div><p>两款游戏共同累计<br>暂停、后台与长时间无操作不计时</p></div>
      ${[...info.festivals,...(info.archived || [])].map(event=>`<section class="event-reward-section"><div class="hub-section-title"><h3>${esc(event.name)}${event.active===false?' · 已结束':''}</h3><span>已累计 ${duration(event.seconds)}</span></div>${event.welcome?.available?`<div class="welcome-reward"><span>${svg('gift')}节日见面礼</span><small>${esc(rewardSummary(event.welcome.rewards))}</small><button data-festival-welcome="${event.id}">领取</button></div>`:''}<div class="reward-grid event-reward-grid">${event.tiers.map(row=>milestone(row,'event',event)).join('')}</div></section>`).join('')}
      <section><div class="hub-section-title"><h3>每一段旅途都有礼物</h3><span>分次累计，不会因休息清零</span></div><div class="reward-grid">${info.base.map(row=>milestone(row,'base')).join('')}</div></section>
      <section class="travel-supply"><div><h3>旅途补给</h3><p>累计两小时后，每多玩30分钟，再收一份补给。</p><small>${esc(rewardSummary(info.supply?.rewards))}</small></div><button data-reward-supply ${!info.supply?.available?'disabled':''}>${info.supply?.available?'领取补给 · 待领 '+info.supply.availablePacks+' 份':'还差 '+duration(info.supply?.remainingSeconds || 0)}</button></section>
      <section><div class="hub-section-title"><h3>随身邮包</h3><span>星砂可兑换道具</span></div><div class="inventory-grid">${info.inventory.map(item=>`<article class="inventory-card"><img src="${rewardPicture(item.id)}" alt="" width="72" height="72"><div><h4>${esc(item.name)} <b>×${item.amount}</b></h4><p>${esc(item.desc)}</p></div><div class="inventory-actions"><button data-use-reward="${item.id}" ${!item.amount || !usable || gameId!=='dream'?'disabled':''}>使用</button><button data-buy-reward="${item.id}" ${info.stardust<item.price?'disabled':''}>${item.price} 星砂兑换</button></div></article>`).join('')}</div>${gameId==='survivor'?'<p class="hub-fine-print">道具用于《掀起你的头盖骨》，两款游戏都能赚取时光礼物。</p>':''}</section>`;
  }
  function renderWardrobe() {
    syncUnlocked();
    const chosen=outfit(),season=active[0];
    const outfits=[{id:'auto',name:'跟随节日',caption:season?season.name+'期间自动换装':'平日邮差装扮',owned:true,src:season?picture('hero',season.id):'./assets/portrait-hero.svg'},...FESTIVALS.map(f=>({id:f.id,name:f.name+'装扮',caption:isFestivalOutfitUnlocked(save,f.id)?'已经收进衣橱':'完成故事或活动累计20分钟',owned:isFestivalOutfitUnlocked(save,f.id),src:picture('hero',f.id)})),{id:'starlight',name:'晨星披风',caption:isFestivalOutfitUnlocked(save,'starlight')?'已经收进衣橱':'累计游玩30分钟领取',owned:isFestivalOutfitUnlocked(save,'starlight'),src:picture('hero','starlight')}];
    $('#hub-wardrobe').innerHTML=`<div class="wardrobe-heading"><div><h3>换一身心情，再出发</h3><p>节日期间可免费体验当季装扮；解锁后全年可穿。</p></div><span>${svg('coat')} ${outfits.filter(o=>o.owned&&o.id!=='auto').length} / 11</span></div><div class="wardrobe-grid">${outfits.map(o=>`<button class="wardrobe-card ${chosen===o.id?'selected':''} ${!o.owned?'locked':''}" data-outfit="${o.id}" ${!o.owned?'disabled':''} aria-pressed="${chosen===o.id}"><img src="${o.src}" alt="${esc(o.name)}" width="150" height="150" loading="lazy"><b>${esc(o.name)}</b><small>${chosen===o.id?'正在穿着':esc(o.caption)}</small></button>`).join('')}</div>`;
  }
  function renderCollection() {
    const stats=getFestivalStats(save);
    $('#hub-collection').innerHTML=`<div class="collection-heading"><h3>四季纪念册</h3><span>${Number(stats.completed || 0)} / 10 个故事送达</span></div><div class="festival-collection-grid">${FESTIVALS.map(f=>{
      const owned=isFestivalOutfitUnlocked(save,f.id),record=getFestivalRecord(save,f.id,new Date());
      const completed=record?.completed || stats.items.some(item=>item.id===f.item.id);
      return `<article class="festival-collectible ${completed?'owned':''}"><img src="${picture('item',f.id)}" alt="${esc(f.item.name)}" width="82" height="82" loading="lazy"><div><small>${esc(f.name)}</small><h4>${esc(f.item.name)}</h4><p>${completed?esc(f.item.description):'把这封节日来信送到，就能收好它。'}</p><span>${completed?'故事已送达':owned?'装扮已解锁 · 纪念物待收集':'等待一场相遇'}</span></div></article>`;
    }).join('')}</div>`;
    const badges=overview().badges;
    if(badges.length)$('#hub-collection').insertAdjacentHTML('beforeend',`<div class="hub-section-title"><h3>时光徽章</h3><span>${badges.length} 枚</span></div><div class="time-badges">${badges.map(id=>`<span>${svg('star')}${esc(id==='steady-light'?'一路有光':id==='night-collector'?'星夜收藏家':(getFestival(id.replace(/-friend$/,''))?.name || '')+'守灯人')}</span>`).join('')}</div>`);
  }
  function render() {
    const info=overview();
    $('#hub-stardust').textContent=info.stardust;
    $('#hub-reward-dot').hidden=!info.claimableCount;
    for(const button of dialog.querySelectorAll('[data-hub-tab]'))button.setAttribute('aria-pressed',String(button.dataset.hubTab===selectedTab));
    for(const view of dialog.querySelectorAll('.hub-view'))view.hidden=view.id!=='hub-'+selectedTab;
    if(selectedTab==='stories')renderStories();
    if(selectedTab==='rewards')renderRewards();
    if(selectedTab==='wardrobe')renderWardrobe();
    if(selectedTab==='collection')renderCollection();
  }
  function claim(result) {
    if(!result?.ok){announce(result?.reason || '这份礼物暂时无法领取。');return;}
    for(const id of result.unlockedOutfits || [])unlockFestivalOutfit(save,id);
    commitFestival();render();publishSummary(true);
    dialog.classList.remove('gift-claimed');void dialog.offsetWidth;dialog.classList.add('gift-claimed');
    announce('已收好：'+rewardSummary(result.rewards));
  }
  dialog.addEventListener('click',event=>{
    const tab=event.target.closest('[data-hub-tab]');if(tab){selectedTab=tab.dataset.hubTab;$('#hub-status').textContent='';render();return;}
    if(event.target.closest('.hub-close')){dialog.close();return;}
    const select=event.target.closest('[data-festival-select]');if(select){selectedId=select.dataset.festivalSelect;renderStories();dialog.scrollTop=0;return;}
    const enter=event.target.closest('[data-festival-enter]');if(enter){onLaunch?.(enter.dataset.festivalEnter);return;}
    const welcome=event.target.closest('[data-festival-welcome]');if(welcome){claim(tracker.claimWelcome(welcome.dataset.festivalWelcome,new Date()));return;}
    if(event.target.closest('[data-reward-supply]')){claim(tracker.claimSupply());return;}
    const base=event.target.closest('[data-reward-base]');if(base){claim(tracker.claimBase(base.dataset.rewardBase));return;}
    const tier=event.target.closest('[data-reward-event]');if(tier){claim(typeof tracker.claimFestivalKey==='function'?tracker.claimFestivalKey(tier.dataset.eventKey,tier.dataset.rewardEvent):tracker.claimFestival(tier.dataset.festivalId,tier.dataset.rewardEvent,new Date()));return;}
    const costume=event.target.closest('[data-outfit]');if(costume){if(equipFestivalOutfit(save,costume.dataset.outfit)){commitFestival();onOutfit?.(outfit());renderWardrobe();publishSummary(true);}return;}
    const buy=event.target.closest('[data-buy-reward]');if(buy){const result=tracker.purchase(buy.dataset.buyReward);renderRewards();publishSummary(true);announce(result.ok?'已兑换 '+itemName(buy.dataset.buyReward):result.reason);return;}
    const use=event.target.closest('[data-use-reward]');if(use){
      const id=use.dataset.useReward;
      if(!tracker.getSave().inventory[id]){announce('邮包里还没有这件道具。');return;}
      if(!tracker.consumeIf(id,()=>onUseItem?.(id)===true)){announce('现在不需要这件道具，已经替你留在邮包。');return;}
      renderRewards();publishSummary(true);announce('已使用 '+itemName(id));
    }
  });
  dialog.addEventListener('close',()=>{queueMicrotask(()=>onClose?.());});
  dialog.addEventListener('keydown',event=>{event.stopPropagation();});
  function activity(event) {
    if(event.type==='pointerdown')pointers.add(event.pointerId);
    if(event.type==='keydown' && !event.metaKey && !event.ctrlKey && !event.altKey)keyboard.add(event.code);
    lastActivity=performance.now();
  }
  const up=event=>{pointers.delete(event.pointerId);keyboard.delete(event.code);};
  document.addEventListener('pointerdown',activity,{passive:true});
  document.addEventListener('pointerup',up,{passive:true});
  document.addEventListener('pointercancel',up,{passive:true});
  document.addEventListener('keydown',activity);
  document.addEventListener('keyup',up);
  const blur=()=>{pointers.clear();keyboard.clear();if(lastSnapshot)tracker.track({...lastSnapshot,playing:false,visible:false,date:new Date()});tracker.flush();};
  window.addEventListener('blur',blur);
  const visibility=()=>{if(document.hidden)blur();else{tracker.refresh();save=loadFestivalSave();syncUnlocked();updateCalendar();onOutfit?.(outfit());publishSummary(true);if(dialog.open)render();}};
  document.addEventListener('visibilitychange',visibility);
  const storage=event=>{if(event.key==='tougaigu.festivals.v1' || event.key==='tougaigu.rewards.v1'){tracker.refresh();save=loadFestivalSave();syncUnlocked();onOutfit?.(outfit());publishSummary(true);if(dialog.open)render();}};
  window.addEventListener('storage',storage);
  const clockTimer=setInterval(updateCalendar,60000);
  syncUnlocked();

  return {
    open(tab='stories',festivalId) {
      tracker.refresh();save=loadFestivalSave();syncUnlocked();updateCalendar();
      selectedTab=['stories','rewards','wardrobe','collection'].includes(tab)?tab:'stories';
      if(getFestival(festivalId))selectedId=festivalId;
      else if(tab==='stories')selectedId=active[0]?.id || selectedId;
      render();$('#hub-status').textContent='';dialog.scrollTop=0;
      if(onOpen)onOpen('#festival-hub');else dialog.showModal();
    },
    tick({sessionId,time,playing,usable:canUse=false}) {
      usable=canUse;
      const recent=performance.now()-lastActivity<90000 || pointers.size>0 || keyboard.size>0;
      lastSnapshot={sessionId,time,playing:playing&&recent,visible:!document.hidden,activeFestivalIds:active.map(f=>f.id)};
      tracker.track({...lastSnapshot,date:new Date()});
      if(performance.now()-lastRender>1000){lastRender=performance.now();publishSummary();}
    },
    setUsable(value){usable=Boolean(value);},
    getSeason:()=>active[0] || null,
    getActive:()=>[...active],
    getOutfit:outfit,
    portrait,
    getRecord:id=>getFestivalRecord(save,id,new Date()),
    complete(id,result){const outcome=recordFestivalComplete(save,id,result,new Date());commitFestival();publishSummary(true);return outcome;},
    solvePuzzle(id,puzzleId,assisted){recordFestivalPuzzle(save,id,puzzleId,assisted,new Date());commitFestival();},
    choose(id,choiceId){const okay=recordFestivalChoice(save,id,choiceId,new Date());if(okay)commitFestival();return okay;},
    exportState(){tracker.flush();return {festivals:validateFestivalSave(save),rewards:validateRewardSave(tracker.getSave())};},
    importState(next){if(next?.festivals){save=validateFestivalSave(next.festivals);commitFestival();}if(next?.rewards)tracker.replace(validateRewardSave(next.rewards));syncUnlocked();onOutfit?.(outfit());publishSummary(true);},
    summary:()=>{publishSummary(true);},
    flush:()=>tracker.flush(),
    close:()=>dialog.close(),
    destroy(){clearInterval(clockTimer);clearTimeout(statusTimer);tracker.flush();tracker.destroy?.();dialog.remove();document.removeEventListener('pointerdown',activity);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);document.removeEventListener('keydown',activity);document.removeEventListener('keyup',up);window.removeEventListener('blur',blur);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',visibility);},
  };
}
