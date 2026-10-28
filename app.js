import { ArenaGame, drawSkull } from './engine.js';
import { mountGameShell } from './game-shell.js';
import { createFestivalHub } from './festival-hub.js';
import { getFestival } from './dream-festivals.js';
import { CHARACTERS, UPGRADES, SYNERGIES, META_UPGRADES, ACHIEVEMENTS, ENEMIES, loadSave, persistSave, metaCost, buyMeta, unlockCharacter, recordRun, getDailyKey, getDailySeed, exportSave, importSave } from './content.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, className = '') => `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const symbols = {bone:'✦',bolt:'ϟ',wind:'↗',heart:'♥',sprout:'♧',magnet:'∩',arrows:'⋔',arrow:'➶',spark:'✧',orbit:'◉',lightning:'ϟ',burst:'✹',snow:'❄',drop:'♦',shield:'⬡',clover:'♧',target:'◎',expand:'↔',flag:'⚑',moon:'☾',crown:'♛',clock:'◷',sun:'☀',group:'♧'};
const modes = {
  standard: { name:'墓园冒险', title:'墓园冒险', description:'坚持 5 分钟，击败终夜领主。', detail:'永久成长生效' },
  endless: { name:'无尽长夜', title:'无尽长夜', description:'怪潮不断增强，挑战最长生存纪录。', detail:'永久成长生效' },
  daily: { name:'每日试炼', title:'每日试炼', description:'每日固定种子，挑战今天的最高分。', detail:'固定小骨 · 无永久加成 · UTC 每日更新' },
};
let save = loadSave();
let mode = 'standard';
let game = null;
let currentPage = 'home';
let activeRun = null;
let currentHud = null;
let choices = [];
let lastUpgradeKey = '';
let toastTimer, announcementTimer, tutorialTimer;
let finished = false;
let warnedStorage = false;
let menuLease = null;
let shellOverlayOpen = false;
let shell = null;
let festivalHub = null;
const menuDialogIds = ['prep-dialog', 'help-dialog', 'settings-dialog', 'festival-hub'];
const keys = new Set();
let joystickPointer = null;
const formatTime = seconds => `${Math.floor(Math.max(0, seconds) / 60).toString().padStart(2,'0')}:${Math.floor(Math.max(0, seconds) % 60).toString().padStart(2,'0')}`;
const number = n => Math.floor(n).toLocaleString('zh-CN');
const heroFor = id => CHARACTERS.find(h => h.id === id) || CHARACTERS[0];
const touchControls = () => matchMedia('(pointer: coarse), (max-width: 640px)').matches;

function toast(text) {
  clearTimeout(toastTimer); $('#toast').textContent = text; $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3300);
}
function persist() {
  const ok = persistSave(save);
  $$('.save-dot').forEach(el => el.style.background = ok ? 'var(--mint)' : 'var(--red)');
  if (!ok && !warnedStorage) { warnedStorage = true; toast('浏览器暂时无法保存进度，请在设置中导出存档备份。'); }
  return ok;
}
function openDialog(id) { const dialog = $(id); if (!dialog.open) dialog.showModal(); }
function closeDialog(id) { const dialog = $(id); if (dialog.open) dialog.close(); }
function closeAllDialogs() { $$('dialog[open]').forEach(d => d.close()); }
function pauseForMenu() {
  if (!menuLease) menuLease = { game, resume: game?.state === 'playing' && !finished };
  if (game?.state === 'playing') game.pause();
  resetInput();
}
function resumeAfterMenu() {
  if (shellOverlayOpen || menuDialogIds.some(id => $(`#${id}`).open)) return;
  const lease = menuLease; menuLease = null;
  if (finished && game?.state === 'ended' && !$$('dialog[open]').length) { openDialog('#result-dialog'); return; }
  if (lease?.resume && lease.game === game && !finished && !$$('dialog[open]').length && game?.state === 'paused') {
    game.resume(); $('#game-canvas').focus({preventScroll:true});
  }
}
function openMenuDialog(id) {
  if ($('#upgrade-dialog').open || $('#result-dialog').open) return;
  pauseForMenu();
  for (const other of menuDialogIds) if (`#${other}` !== id) closeDialog(`#${other}`);
  openDialog(id);
}
function openPreparation(page = 'home') {
  showPage(page);
  $('#prep-title').textContent = page === 'journal' ? '冒险档案' : '备战';
  $('#prep-run-note').textContent = game && !finished ? '开始新局会结算当前这一局。关闭菜单可继续。' : '选择角色与模式，开始下一局。';
  $('#play-button>span').textContent = game && !finished ? '结算本局并开始' : '开始新局';
  openMenuDialog('#prep-dialog');
}
function updateShell() {
  const hero = heroFor(activeRun?.characterId || save.selectedCharacter);
  shell?.update({role:hero.name,progress:`${number(save.bones)} 骨片`});
  $('#profile-identity').textContent = `${hero.name} · 本地冒险者 · ${save.unlockedCharacters.length} / 3 角色`;
}
function showPage(page) {
  if (!['home','workshop','journal'].includes(page)) return;
  currentPage = page;
  $$('.page-view').forEach(el => { el.hidden = el.id !== `page-${page}`; });
  $$('.nav-link').forEach(el => { const active = el.dataset.page === page; el.classList.toggle('active',active); active ? el.setAttribute('aria-current','page') : el.removeAttribute('aria-current'); });
  renderLobby(); $('#prep-dialog').scrollTop = 0;
}
function selectMode(next) {
  mode = next in modes ? next : 'standard';
  $$('.mode-tab').forEach(el => { const active = el.dataset.mode === mode; el.classList.toggle('selected',active); el.setAttribute('aria-pressed',String(active)); });
  $('#play-heading').textContent = modes[mode].title;
  $('#mode-description').textContent = modes[mode].description;
  $('#mode-detail').textContent = modes[mode].detail;
  $('#play-button>span').textContent = game && !finished ? '结算本局并开始' : '开始新局';
  renderCharacters();
}
function renderSettings() {
  document.body.classList.toggle('reduced-motion',save.settings.reducedMotion);
  $$('.sound-toggle').forEach(el => { el.innerHTML = icon(save.settings.sound?'sound':'mute'); el.setAttribute('aria-label',save.settings.sound?'关闭音效':'开启音效'); el.setAttribute('aria-pressed',String(save.settings.sound)); });
  $('#setting-sound').checked = save.settings.sound;
  $('#setting-motion').checked = save.settings.reducedMotion;
}
function renderCharacters() {
  const chosen = mode === 'daily' ? 'bone' : save.selectedCharacter;
  $('#character-count').textContent = `${save.unlockedCharacters.length} / 3 已唤醒`;
  $('#character-cards').innerHTML = CHARACTERS.map(hero => {
    const unlocked = save.unlockedCharacters.includes(hero.id);
    const selected = chosen === hero.id;
    return `<button class="character-card ${selected?'selected':''} ${unlocked?'':'locked'}" data-hero="${hero.id}" aria-pressed="${selected}" aria-label="${hero.name}，${hero.title}，${unlocked?(selected?'已选择':'选择出战'):`${hero.unlockCost} 骨片解锁`}"><canvas data-portrait="${hero.id}" width="116" height="150" aria-hidden="true"></canvas><div><h3>${hero.name}</h3><small>${hero.title}</small></div><div class="character-bottom">${unlocked?(selected?'✓ 已选择':escapeHtml(hero.shortDescription)):`${icon('lock')} ${hero.unlockCost} 骨片解锁`}</div></button>`;
  }).join('');
  $$('[data-portrait]').forEach(canvas => {
    const hero = heroFor(canvas.dataset.portrait); const ctx = canvas.getContext('2d');
    drawSkull(ctx,58,77,65,hero.color,hero.id,0);
  });
}
function goalProgress(id) {
  const s=save.stats;
  const mapping={first_run:[s.runs,1],kill100:[s.kills,100],kill1000:[s.kills,1000],boss1:[s.bosses,1],level10:[s.maxLevel,10],survive180:[s.bestTime,180],win:[s.wins,1],allheroes:[save.unlockedCharacters.length,3]};
  return mapping[id] || [0,1];
}
function renderGoal() {
  const goal=ACHIEVEMENTS.find(item=>!save.achievements.includes(item.id));
  if(!goal){$('#next-goal').innerHTML='<div class="goal-name">骨骨皆传奇 <span>全成就 ✓</span></div><p class="goal-desc">去无尽长夜，写下新的纪录。</p><div class="goal-progress"><i style="width:100%"></i></div>';return;}
  const [now,total]=goalProgress(goal.id);
  $('#next-goal').innerHTML=`<div class="goal-name">${goal.name}<span>+${goal.reward} 骨片</span></div><p class="goal-desc">${goal.description}</p><div class="goal-progress"><i style="width:${Math.min(100,now/total*100)}%"></i></div>`;
}
function renderWorkshop() {
  $('#workshop-cards').innerHTML=META_UPGRADES.map(item=>{
    const level=save.meta[item.id]||0;const full=level>=item.max;const cost=metaCost(item.id,level);
    return `<article class="workshop-card"><div class="workshop-icon" style="color:${item.color}">${symbols[item.icon]||'✦'}</div><h2>${item.name}</h2><p>${item.description}永久生效，最多 ${item.max} 级。</p><div class="upgrade-pips" aria-label="${level} / ${item.max} 级">${Array.from({length:item.max},(_,i)=>`<i class="${i<level?'filled':''}"></i>`).join('')}</div><button class="purchase-button" data-buy="${item.id}" ${full?'disabled':''}><span>${full?'已达最高等级':`强化至 Lv.${level+1}`}</span><span>${full?'✓':`${icon('bone')} ${number(cost)}`}</span></button></article>`;
  }).join('');
  $('.recipe-grid').innerHTML=SYNERGIES.map((item,index)=>`<article><span>${['◉ + ↗','ϟ + ϟ','✦ + ⋔'][index]}</span><h3>${item.name}</h3><p>${Object.entries(item.requirements).map(([id,lvl])=>`${UPGRADES.find(u=>u.id===id).name} Lv.${lvl}`).join(' + ')}</p><small>${item.description}</small></article>`).join('');
}
function renderJournal() {
  const stats=[['冒险次数',number(save.stats.runs)],['累计击败',number(save.stats.kills)],['最长生存',formatTime(save.stats.bestTime)],['最高得分',number(save.stats.bestScore)]];
  $('#stats-grid').innerHTML=stats.map(([label,value])=>`<div class="stat-card"><span>${label}</span><b>${value}</b></div>`).join('');
  $('#achievement-count').textContent=`${save.achievements.length} / ${ACHIEVEMENTS.length} 已达成`;
  $('#achievement-cards').innerHTML=ACHIEVEMENTS.map(item=>`<article class="achievement-card ${save.achievements.includes(item.id)?'unlocked':''}"><span>${symbols[item.icon]||'✦'}</span><h3>${item.name}</h3><p>${item.description}</p><small>${save.achievements.includes(item.id)?'已领取':'达成奖励'} · ${item.reward} 骨片</small></article>`).join('');
  if(!save.history.length){$('#history-list').innerHTML='<div class="empty-state">这一页还是空白。去墓园里，写下你的第一段传说吧。</div>';}
  else{$('#history-list').innerHTML=`<table class="history-table"><thead><tr><th>冒险</th><th>角色</th><th>生存</th><th>击败</th><th>得分</th><th>带回骨片</th></tr></thead><tbody>${save.history.slice(0,10).map(run=>`<tr><td>${modes[run.mode].name} ${run.won?'<span class="won-tag">通关 ✓</span>':''}</td><td>${heroFor(run.characterId).name}</td><td>${formatTime(run.time)}</td><td>${number(run.kills)}</td><td>${number(run.score)}</td><td>+${number(run.earned)}</td></tr>`).join('')}</tbody></table>`;}
  const enemySymbols={ghost:'◕',bat:'⋈',slime:'◡',mage:'ϟ',charger:'✹',boss:'♛'};
  $('#enemy-cards').innerHTML=ENEMIES.map(enemy=>`<article class="enemy-card"><div class="enemy-avatar" style="color:${enemy.color}">${enemySymbols[enemy.id]||'◉'}</div><div><h3>${enemy.name} · ${enemy.title}</h3><p>${enemy.description}<br>${enemy.tip}</p></div></article>`).join('');
}
function renderLobby() {
  $('#wallet').textContent=number(save.bones); renderSettings();updateShell();
  if(currentPage==='home'){renderCharacters();renderGoal();const day=getDailyKey();$('#daily-date').textContent=`${day.slice(5).replace('-',' / ')} · 每日试炼`;const best=save.dailyBests[day];$('#daily-score').textContent=best?`今日最高 ${number(best.score)} 分`:'今日暂无纪录';}
  if(currentPage==='workshop')renderWorkshop();
  if(currentPage==='journal')renderJournal();
}

function onHud(hud) {
  currentHud=hud;
  if(activeRun?.runId)festivalHub?.tick({
    sessionId:activeRun.runId,
    time:hud.time,
    playing:game?.state==='playing' && !finished && !menuLease && !shellOverlayOpen && !document.hidden && !$$('dialog[open]').length,
    usable:false,
  });
  $('#health-label').textContent=`${Math.ceil(hud.hp)} / ${hud.maxHp}`;
  $('#health-fill').style.width=`${Math.max(0,hud.hp/hud.maxHp)*100}%`;
  $('#time-label').textContent=formatTime(hud.time);$('#wave-label').textContent=`第 ${hud.wave} 波`;
  $('#kills-label').textContent=number(hud.kills);$('#score-label').textContent=number(hud.score);
  $('#level-label').textContent=`LV. ${hud.level}`;$('#xp-label').textContent=`${Math.floor(hud.xp)} / ${hud.xpNext}`;
  $('#xp-fill').style.width=`${Math.min(100,hud.xp/hud.xpNext*100)}%`;
  $('#dash-label').textContent=hud.dashCooldown>.1?`${hud.dashCooldown.toFixed(1)}s`:(touchControls()?'就绪':'SPACE');
  $('#dash-shade').style.transform=`scaleY(${Math.min(1,hud.dashCooldown/hud.dashMax)})`;
  $('#boss-hud').hidden=!hud.boss;
  if(hud.boss){$('#boss-name').textContent=hud.boss.name;$('#boss-fill').style.width=`${hud.boss.hp/hud.boss.maxHp*100}%`;}
  const key=JSON.stringify(hud.upgrades);
  if(key!==lastUpgradeKey){lastUpgradeKey=key;$('#active-upgrades').innerHTML=Object.entries(hud.upgrades).filter(([,level])=>level>0).map(([id,level])=>{const u=UPGRADES.find(x=>x.id===id);return `<span class="active-upgrade" title="${u.name} Lv.${level}" aria-label="${u.name} ${level} 级">${symbols[u.icon]||'✦'}<small>${level}</small></span>`;}).join('');}
}
function showUpgrade(ids) {
  resetInput();choices=ids;
  $('#upgrade-options').innerHTML=ids.map((id,index)=>{const u=UPGRADES.find(x=>x.id===id);const lvl=(currentHud?.upgrades[id]||0)+1;return `<button class="upgrade-option" data-upgrade="${id}"><kbd>${index+1}</kbd><span class="upgrade-symbol" style="color:${u.color}">${symbols[u.icon]||'✦'}</span><h3>${u.name}</h3><p>${u.description}</p><small>${({weapon:'异能武器',power:'输出强化',survival:'生存本能'})[u.type]}</small><span class="upgrade-tag">LV.${lvl} / ${u.max}</span></button>`;}).join('');
  openDialog('#upgrade-dialog');
}
function selectUpgrade(id) {
  if(!game||!choices.includes(id))return;
  if(game.chooseUpgrade(id)){choices=[];closeDialog('#upgrade-dialog');$('#game-canvas').focus({preventScroll:true});}
}
function announce(event) {
  if(event.type==='start')return;
  clearTimeout(announcementTimer);$('#battle-announcement').textContent=event.text;$('#battle-announcement').classList.add('visible');
  announcementTimer=setTimeout(()=>$('#battle-announcement').classList.remove('visible'),event.type==='evolution'?3000:2200);
}
function pauseRun() {
  if(!game||finished||$$('dialog[open]').length||shellOverlayOpen)return;
  game.pause();resetInput();openDialog('#pause-dialog');
}
function resumeRun(){closeDialog('#pause-dialog');resetInput();if(!finished&&!$$('dialog[open]').length){game?.resume();$('#game-canvas').focus({preventScroll:true});}}
function startPreparedRun() {
  // Only this explicit action settles a running game; opening preparation does not.
  if (game && !finished && activeRun && game.state !== 'ended') game.finish(false);
  startRun();
}
function startRun() {
  menuLease=null;shell?.close();
  closeAllDialogs();game?.destroy();resetInput();finished=false;currentHud=null;lastUpgradeKey='';choices=[];
  const today=new Date();const dailyKey=getDailyKey(today);const seed=mode==='daily'?getDailySeed(today):crypto.getRandomValues(new Uint32Array(1))[0];
  const characterId=mode==='daily'?'bone':save.selectedCharacter;
  activeRun={mode,characterId,seed,dailyKey,runId:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${seed}`};
  $('#arena').hidden=false;document.body.style.overflow='hidden';
  $('#hero-name').textContent=heroFor(characterId).name;$('#battle-mode').textContent=modes[mode].name;
  $('#battle-announcement').classList.remove('visible');$('#active-upgrades').innerHTML='';
  $('#battle-tutorial').textContent=touchControls()?'左侧摇杆移动 · 右侧按钮冲刺 · 收集光点升级':'收集光点升级 · WASD 移动 · 空格冲刺';
  $('#battle-tutorial').style.opacity='1';clearTimeout(tutorialTimer);tutorialTimer=setTimeout(()=>$('#battle-tutorial').style.opacity='0',14000);
  try {
    game=new ArenaGame($('#game-canvas'),{onHud,onUpgrade:showUpgrade,onEnd:finishRun,onEvent:announce,onPause:()=>{resetInput();if(!finished&&!$$('dialog[open]').length&&!shellOverlayOpen)openDialog('#pause-dialog');}});
    game.start({...activeRun,meta:save.meta,sound:save.settings.sound,reducedMotion:save.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches});
    game.resize();updateShell();$('#game-canvas').focus({preventScroll:true});
  } catch(error){console.error('Unable to start game',error);returnLobby();toast('游戏暂时无法启动，请尝试更新浏览器后再试。');}
}
function finishRun(result) {
  if(finished)return;finished=true;menuLease=null;resetInput();closeAllDialogs();choices=[];
  const outcome=recordRun(save,{...result,seed:activeRun.seed,dailyKey:activeRun.dailyKey,runId:activeRun.runId});persist();
  updateShell();
  $('#result-kicker').textContent=result.won?'YOU MADE IT TO DAWN':'NOT THE END';
  $('#result-title').textContent=result.won?'天亮了。你还站着。':'散架了，但没白来。';
  $('#result-subtitle').textContent=!outcome.qualified?'坚持满 15 秒，即可获得成长奖励。下一局再试试。':result.won?'长夜已过。想试试另一种活法，或挑战无尽长夜吗？':'每次重来，都比上一次多一点底气。';
  $('#result-stats').innerHTML=[['生存时间',formatTime(result.time)],['击败怪物',number(result.kills)],['最终得分',number(result.score)]].map(([label,value])=>`<div class="result-stat"><small>${label}</small><b>${value}</b></div>`).join('');
  $('#result-bones').textContent=number(outcome.earned);
  $('#result-achievements').innerHTML=outcome.unlockedAchievements.map(id=>`<div class="result-new-achievement">✦ 新成就 · ${ACHIEVEMENTS.find(a=>a.id===id).name}</div>`).join('');
  openDialog('#result-dialog');
}
function returnLobby() {
  menuLease=null;resetInput();closeAllDialogs();clearTimeout(tutorialTimer);clearTimeout(announcementTimer);
  openPreparation('home');$('#play-button').focus({preventScroll:true});
}
function resetInput(){keys.clear();joystickPointer=null;$('#joystick-stick').style.transform='translate(0,0)';game?.setInput({x:0,y:0});}
function syncKeys(){game?.setInput({x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),y:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))});}

document.addEventListener('click',event=>{
  const pageButton=event.target.closest('[data-page]');if(pageButton)showPage(pageButton.dataset.page);
  const closeButton=event.target.closest('[data-close]');if(closeButton)closeDialog(`#${closeButton.dataset.close}`);
  const modeButton=event.target.closest('[data-mode]');if(modeButton)selectMode(modeButton.dataset.mode);
  const heroButton=event.target.closest('[data-hero]');if(heroButton){
    const id=heroButton.dataset.hero,hero=heroFor(id);
    if(mode==='daily'&&id!=='bone'){toast('每日试炼固定使用小骨。切换冒险模式即可更换角色。');return;}
    if(!save.unlockedCharacters.includes(id)){const result=unlockCharacter(save,id);if(!result.ok){toast(result.reason);return;}toast(result.unlockedAchievements?.length?`${hero.name}醒来了！全角色成就达成，额外获得 80 骨片。`:`${hero.name}醒来了！新的冒险伙伴已加入。`);}
    save.selectedCharacter=id;persist();renderLobby();
  }
  const buyButton=event.target.closest('[data-buy]');if(buyButton){const result=buyMeta(save,buyButton.dataset.buy);toast(result.ok?`强化完成 · Lv.${result.level}，下一局生效。`:result.reason);if(result.ok){persist();renderLobby();}}
  const upgradeButton=event.target.closest('[data-upgrade]');if(upgradeButton)selectUpgrade(upgradeButton.dataset.upgrade);
});
$('#play-button').addEventListener('click',startPreparedRun);
$('#daily-select').addEventListener('click',()=>{selectMode('daily');$('#play-button').focus({preventScroll:true});});
$('#help-open').addEventListener('click',()=>openMenuDialog('#help-dialog'));
$('#settings-open').addEventListener('click',()=>{renderSettings();$('#save-message').textContent='';openMenuDialog('#settings-dialog');});
$$('.sound-toggle').forEach(el=>el.addEventListener('click',()=>{save.settings.sound=!save.settings.sound;game?.setSound(save.settings.sound);persist();renderSettings();}));
$('#setting-sound').addEventListener('change',event=>{save.settings.sound=event.target.checked;game?.setSound(save.settings.sound);persist();renderSettings();});
$('#setting-motion').addEventListener('change',event=>{save.settings.reducedMotion=event.target.checked;if(game)game.reducedMotion=event.target.checked;persist();renderSettings();});
$('#pause-button').addEventListener('click',pauseRun);$('#resume-button').addEventListener('click',resumeRun);
$('#end-run-button').addEventListener('click',()=>game?.finish(false));
$('#again-button').addEventListener('click',startRun);$('#return-button').addEventListener('click',returnLobby);
$('#dash-button').addEventListener('pointerdown',event=>{event.preventDefault();game?.dash();});
$('#dash-button').addEventListener('click',event=>{if(event.detail===0)game?.dash();});
$('#upgrade-dialog').addEventListener('cancel',event=>event.preventDefault());
$('#result-dialog').addEventListener('cancel',event=>{event.preventDefault();returnLobby();});
$('#pause-dialog').addEventListener('cancel',event=>{event.preventDefault();resumeRun();});

document.addEventListener('keydown',event=>{
  if($('#arena').hidden||event.ctrlKey||event.metaKey||event.altKey)return;
  if($('#upgrade-dialog').open){if(['Digit1','Digit2','Digit3'].includes(event.code)){event.preventDefault();selectUpgrade(choices[Number(event.code.slice(-1))-1]);}return;}
  if(event.code==='Escape'){
    if($('#pause-dialog').open){event.preventDefault();resumeRun();return;}
    if($$('dialog[open]').length)return;
    if(!finished){event.preventDefault();pauseRun();}return;
  }
  if($$('dialog[open]').length)return;
  if(event.target instanceof Element && event.target.closest('button,a,input,select,textarea,[contenteditable]'))return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();keys.add(event.code);syncKeys();}
  if(event.code==='Space'){event.preventDefault();if(!event.repeat)game?.dash();}
});
document.addEventListener('keyup',event=>{if(keys.delete(event.code))syncKeys();});
window.addEventListener('blur',()=>{resetInput();if(game&&!finished&&game.state==='playing')pauseRun();});
$('#joystick').addEventListener('pointerdown',event=>{if(joystickPointer!==null)return;event.preventDefault();joystickPointer=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);moveJoystick(event);});
$('#joystick').addEventListener('pointermove',event=>{if(event.pointerId===joystickPointer)moveJoystick(event);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('#joystick').addEventListener(name,event=>{if(event.pointerId===joystickPointer)resetInput();});
function moveJoystick(event){const rect=$('#joystick').getBoundingClientRect();const dx=event.clientX-(rect.left+rect.width/2),dy=event.clientY-(rect.top+rect.height/2);const distance=Math.hypot(dx,dy),max=35,scale=distance>max?max/distance:1;$('#joystick-stick').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;game?.setInput({x:dx*scale/max,y:dy*scale/max});}

$('#export-button').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([exportSave(save)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`tougaigu-save-${getDailyKey()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('#save-message').textContent='存档已导出。把它留好，下一次接着冒险。';
});
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{if(file.size>256000)throw new Error('存档文件过大，请选择游戏导出的 JSON 文件。');const next=importSave(await file.text());if(!window.confirm(`导入后将替换当前浏览器的进度：${next.stats.runs} 次冒险、${next.bones} 骨片。确定导入吗？`))return;menuLease=null;game?.destroy();game=null;activeRun=null;save=next;const ok=persist();renderLobby();renderSettings();startRun();toast(ok?'存档已导入，已按新进度开始。':'存档已载入，请保留导出备份。');}catch(error){$('#save-message').textContent=error.message;}finally{event.target.value='';}
});
window.addEventListener('pageshow',()=>{if(!game)renderLobby();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!game)renderLobby();});
shell = mountGameShell({
  gameId:'survivor',
  onAction(action) {
    if (action === 'events') festivalHub?.open();
    if (action === 'map') openPreparation('home');
    if (action === 'profile') openPreparation('journal');
    if (action === 'help') openMenuDialog('#help-dialog');
    if (action === 'settings') { renderSettings(); $('#save-message').textContent=''; openMenuDialog('#settings-dialog'); }
    if (action === 'pause') pauseRun();
  },
  onOverlayChange(open) {
    shellOverlayOpen = open;
    if (open) pauseForMenu(); else resumeAfterMenu();
  }
});
festivalHub = createFestivalHub({
  gameId:'survivor',
  onOpen:()=>openMenuDialog('#festival-hub'),
  onClose:resumeAfterMenu,
  onLaunch(id) {
    const festival=getFestival(id);
    if(festival)location.href='./index.html?festival='+encodeURIComponent(festival.id);
  },
  onUseItem:()=>false,
  onSummary:summary=>shell?.update({rewards:summary.claimable}),
  onNotice:toast,
});
// The hub creates its dialog above and owns its own close callback.
for (const id of menuDialogIds) if(id!=='festival-hub')$(`#${id}`).addEventListener('close', resumeAfterMenu);
festivalHub.summary();
selectMode('standard');renderLobby();persist();startRun();
