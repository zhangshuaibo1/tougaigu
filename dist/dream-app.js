import { DreamGame } from './dream-engine.js';
import { mountGameShell } from './game-shell.js';
import { createFestivalHub } from './festival-hub.js';
import { getFestival, getFestivalPuzzle } from './dream-festivals.js';
import { getCapScene } from './dream-cap-story.js';
import { createCapBook } from './cap-book.js';
import { getCapActivity } from './dream-cap-activities.js';
import { CAP_ACTIVITY_SAVE_KEY, capActivityRevision, loadCapActivitySave, persistCapActivitySave, validateCapActivitySave, mergeCapActivitySaves, replaceCapActivitySave, getCapActivityRecord, getCapActivityStats, recordCapActivityEvent } from './cap-activity-progress.js';
import { getLostCase, evaluateLostClaim, LOST_CASE_TOTALS } from './dream-lost-cases.js';
import { createLostDiagram } from './lost-evidence.js';
import { LOST_SAVE_KEY, lostRevision, loadLostSave, persistLostSave, validateLostSave, mergeLostSaves, replaceLostSave, getLostRecord, getLostStats, recordLostEvent } from './lost-progress.js';
import {
  CHAPTERS, CAST, STORY_CHOICES, ENDINGS, STAMPS, STORY_ITEMS, PUZZLES, DREAM_SAVE_KEY,
  loadDreamSave, persistDreamSave, validateDreamSave, getUnlockedChapter, getJourneyStats,
  earnedStampIds, completeDreamChapter, chooseStoryReply, getEnding, rememberEnding,
  nextPendingChoice, getPuzzle, checkPuzzleAnswer, recordPuzzleSolve,
} from './dream-story.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = (name, className = '') => '<svg class="' + className + '" aria-hidden="true"><use href="#d-' + name + '"/></svg>';
const timeLabel = seconds => Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0') + ':' + Math.floor(Math.max(0, seconds) % 60).toString().padStart(2, '0');
const chaptersInChinese = ['第一幕', '第二幕', '第三幕', '第四幕', '第五幕', '第六幕'];
const stars = value => [0, 1, 2].map(index => icon('star', index < value ? 'earned' : '')).join('');
let save = loadDreamSave();
let game = null;
let currentChapter = 0;
let currentHud = null;
let storySequence = null;
let activePuzzle = null;
let activeChoice = null;
let lastResult = null;
let settled = false;
let storageWarningShown = false;
let toastTimer, announcementTimer;
const heldKeys = new Set();
const heldPointers = new Map();
let lastHudAt = 0;
let shell = null;
let overlayResumeGame = null;
let shellOverlayOpen = false;
let suppressPauseDialog = false;
let overlayReturnToPause = false;
let hub = null;
let hubSummary = null;
let currentFestival = null;
let pendingTalk = false;
let runSessionId = '';
let capBook = null;
let capBubbleTimer = null;
let lastCapBubbleAt = -Infinity;
let capActivitySave = loadCapActivitySave();
let capActivityStorageWarned = false;
let lostSave = loadLostSave();
let lostStorageWarned = false;
let lastLostEvidence = '';

function portraitForLine(line, festival = currentFestival) {
  const moods = line.speaker === 'ashi' ? ['curious', 'open', 'joy', 'tender'] : line.speaker === 'light' ? ['peek', 'joy', 'brave', 'sleep'] : [];
  if (moods.includes(line.mood)) return './assets/portrait-' + (line.speaker === 'ashi' ? 'hero-' : 'soul-') + line.mood + '.svg';
  if (line.speaker === 'ashi') return hub?.portrait(festival) || CAST.ashi.portrait;
  return (line.speaker === 'festival' ? festival?.npc : CAST[line.speaker])?.portrait || CAST.ashi.portrait;
}

function hideCapBubble() {
  clearTimeout(capBubbleTimer);
  $('#cap-bubble').classList.remove('show');
}

function onCapEvent(event) {
  const outcome = capBook?.record(event);
  if (!outcome?.ok) return;
  if (event.type === 'open' && currentHud?.lostCase?.opened && currentHud.lostCase.nearBox) return;
  const scene = outcome.scene;
  const now = performance.now();
  let lines;
  if (event.type === 'open') lines = outcome.firstOpen ? scene.opening : scene.reopening;
  else if (event.type === 'return') { if (now - lastCapBubbleAt < 1600) return; lines = scene.returning; }
  else if (outcome.changed) lines = [event.type === 'memory' ? scene.memories[event.index] : scene.seals[event.index]];
  showCapLines(lines);
}

function showCapLines(lines) {
  if (!lines?.length || document.querySelector('dialog[open]')) return;
  const now = performance.now();
  lastCapBubbleAt = now;
  clearTimeout(capBubbleTimer);
  clearTimeout(announcementTimer);
  $('#stage-announcement').classList.remove('show');
  $('#cap-bubble-portrait').src = portraitForLine(lines[0]);
  $('#cap-bubble-portrait').alt = '';
  $('#cap-bubble-lines').innerHTML = lines.slice(0, 2).map(line => '<p data-speaker="' + line.speaker + '"><b>' + (line.speaker === 'light' ? '拾光' : '阿拾') + '</b>' + escapeHtml(line.text) + '</p>').join('');
  $('#cap-bubble').classList.add('show');
  capBubbleTimer = setTimeout(hideCapBubble, lines.length > 1 ? 5800 : 3800);
}

function openCapBook() { capBook?.open({ chapterIndex: currentChapter, festivalId: currentFestival?.id }); }

function updateCapSummary() {
  const stats = capBook?.stats() || { opened: 0 };
  const activities = getCapActivityStats(capActivitySave);
  const lost = getLostStats(lostSave);
  $('#journal-cap-summary').textContent = stats.opened + ' / 16 个脑洞 · 借景 ' + activities.completed + ' / 16' + (lost.variants ? ' · 回执 ' + lost.variants + ' / ' + LOST_CASE_TOTALS.variants : '');
}

function currentLostCase() {
  return getLostCase(getCapScene({ chapterIndex: currentChapter, festivalId: currentFestival?.id }).id);
}

function syncLostInstance() {
  const item = currentLostCase();
  game?.setLostCaseRecord(item ? getLostRecord(lostSave, item.id) : null, lostRevision(lostSave));
}

function storeLostProgress() {
  const okay = persistLostSave(lostSave);
  if (!okay && !lostStorageWarned) {
    lostStorageWarned = true;
    toast('失物故事可以继续。请在设置里导出旅途存档，收好物证和回执。');
  }
  return okay;
}

function onLostCase(event) {
  lostSave = mergeLostSaves(lostSave, loadLostSave());
  if (event.revision !== lostRevision(lostSave)) {
    syncLostInstance();
    capBook?.refreshActivities();
    updateCapSummary();
    return;
  }
  const result = recordLostEvent(lostSave, event);
  if (!result.ok) return;
  if (result.changed) {
    storeLostProgress();
    capBook?.refreshActivities();
    updateCapSummary();
  }
  const item = getLostCase(event.sceneId);
  if (!item) return;
  if (event.type === 'open') showCapLines([{ speaker: 'light', mood: 'peek', text: item.intro }]);
  if (event.type === 'wrong' || event.type === 'solve') {
    const judgement = evaluateLostClaim(event.caseId, event.variant, event.claimantId);
    if (!judgement.valid) return;
    showCapLines([{ speaker: 'light', mood: judgement.correct ? 'joy' : 'peek', text: judgement.feedback }]);
  }
}

function renderLostEvidence(lost) {
  const evidence = lost?.evidence || null;
  const key = evidence ? JSON.stringify([lost.caseId, lost.variant, evidence]) : '';
  const card = $('#stage-lost-evidence');
  card.hidden = !evidence;
  if (key === lastLostEvidence) return;
  lastLostEvidence = key;
  if (!evidence) { card.replaceChildren(); return; }
  const heading = document.createElement('div');
  heading.className = 'lost-evidence-heading';
  const kind = document.createElement('small');
  kind.textContent = evidence.kind === 'claimant' ? '认领者' : '物证';
  const title = document.createElement('strong');
  title.textContent = evidence.title;
  heading.append(kind, title);
  const text = document.createElement('p');
  text.textContent = evidence.text;
  card.replaceChildren(heading, text);
  const diagram = evidence.diagram;
  if (diagram?.type === 'notes') {
    const notes = document.createElement('ol');
    notes.className = 'lost-evidence-notes';
    for (const note of diagram.notes) {
      const row = document.createElement('li');
      row.textContent = note.mark + ' ' + note.text;
      notes.append(row);
    }
    card.append(notes);
  }
  const picture = createLostDiagram(diagram);
  if (picture) card.append(picture);
}

function onCapActivity(event) {
  capActivitySave = mergeCapActivitySaves(capActivitySave, loadCapActivitySave());
  const revision = capActivityRevision(capActivitySave);
  if ((event.revision || '0:base') !== revision) {
    const scene = getCapScene({ chapterIndex: currentChapter, festivalId: currentFestival?.id });
    game?.setCapActivityRecord(getCapActivityRecord(capActivitySave, scene.id), revision);
    capBook?.refreshActivities();
    updateCapSummary();
    return;
  }
  const outcome = recordCapActivityEvent(capActivitySave, event);
  if (!outcome.ok) return;
  if (outcome.changed) {
    if (!persistCapActivitySave(capActivitySave) && !capActivityStorageWarned) { capActivityStorageWarned = true; toast('借景小戏可以继续。请在设置里导出旅途存档，收好已完成的路线。'); }
    capBook?.refreshActivities();
    updateCapSummary();
  }
  const activity = outcome.activity;
  const now = performance.now();
  if ((event.type === 'start' && now - lastCapBubbleAt < 1700) || (event.type === 'wrong' && now - lastCapBubbleAt < 3000)) return;
  const line = event.type === 'step' ? activity.steps[event.stepIndex] : event.type === 'complete' ? activity.complete : event.type === 'wrong' ? activity.wrong : event.variant > 0 ? activity.replay : activity.start;
  showCapLines([line]);
}

function updateShell() {
  const stats = getJourneyStats(save);
  const soul = currentHud?.form === 'soul';
  shell?.update({ role: soul ? '拾光' : '阿拾', progress: currentFestival ? currentFestival.name + ' · ' + (currentHud?.gifts || 0) + '/3 礼物' : stats.completed + '/6 章 · ' + stats.memories + '/18 记忆', portrait: hub?.portrait(currentFestival, soul ? 'light' : 'ashi'), rewards: hubSummary?.claimable || 0 });
}

function updateSeasonLabel() {
  const season = currentFestival || hub?.getSeason();
  $('#stage-season-label').textContent = season?.title || '四季来信';
  $('#stage-season-note').textContent = currentFestival ? '节日支线' : season ? '进行中 · 有礼物' : '故事与礼物';
  $('#stage-back-story').hidden = !currentFestival;
  $('#journal-dialog .profile-identity img').src = hub?.portrait(currentFestival) || './assets/portrait-hero.svg';
  updateShell();
}

function openFestivalHub(tab = 'stories') {
  hub?.setUsable(Boolean(game && !settled && !activePuzzle && !pendingTalk));
  hub?.open(tab, currentFestival?.id);
}

function pauseForOverlay() {
  hideCapBubble();
  if (!game || settled || game.state !== 'playing') return;
  overlayResumeGame = game;
  suppressPauseDialog = true;
  resetInput();
  game.pause('overlay');
  suppressPauseDialog = false;
}

function resumeAfterOverlay() {
  if (shellOverlayOpen || document.querySelector('dialog[open]') || storySequence || activeChoice || activePuzzle || pendingTalk || document.hidden) return;
  if (settled && currentFestival && lastResult?.festivalId === currentFestival.id) { openDialog('#result-dialog'); return; }
  if (overlayReturnToPause && game && !settled && game.state === 'paused') {
    overlayReturnToPause = false;
    showPause('manual');
    return;
  }
  const pausedGame = overlayResumeGame;
  overlayResumeGame = null;
  if (pausedGame && pausedGame === game && !settled) {
    resetInput();
    game.resume();
    $('#dream-canvas').focus({ preventScroll: true });
  }
}

function openMap() {
  renderLobby();
  $('#map-continue').innerHTML = settled ? '下一章 <span>→</span>' : '继续游戏 <span>→</span>';
  if (currentFestival && settled) $('#map-continue').innerHTML = '返回主线 <span>→</span>';
  if (!currentFestival && settled && getJourneyStats(save).completed === 6) $('#map-continue').innerHTML = '重访本章 <span>→</span>';
  openDialog('#map-dialog');
}

function continueFromMap() {
  if (currentFestival && settled) launchChapter(Math.min(save.lastChapter, getUnlockedChapter(save)));
  else if (!game || settled) beginChapter(getJourneyStats(save).completed === 6 ? save.lastChapter : getUnlockedChapter(save));
  else {
    overlayReturnToPause = false;
    if (game.state === 'paused') overlayResumeGame = game;
    $('#map-dialog').close();
  }
}

function handleShellAction(action) {
  if (action === 'map') openMap();
  if (action === 'profile') openJournal();
  if (action === 'events') openFestivalHub();
  if (action === 'help') openDialog('#guide-dialog');
  if (action === 'settings') { renderSettings(); $('#dream-save-message').textContent = ''; openDialog('#preferences-dialog'); }
  if (action === 'pause') { resetInput(); game?.pause('manual'); }
}


function toast(message) {
  clearTimeout(toastTimer);
  $('#dream-toast').textContent = message;
  $('#dream-toast').classList.add('show');
  toastTimer = setTimeout(() => $('#dream-toast').classList.remove('show'), 4000);
}

function persist() {
  const okay = persistDreamSave(save);
  $('#dream-save-status').innerHTML = '<i style="background:' + (okay ? 'var(--dream-mint)' : 'var(--dream-orange)') + '"></i>' + (okay ? '进度已保存' : '保存失败，请导出备份');
  if (!okay && !storageWarningShown) {
    storageWarningShown = true;
    toast('这段旅程可以继续，但浏览器暂时无法保存。请在偏好里导出故事存档。');
  }
  updateShell();
  return okay;
}

function closeDialogs() {
  $$('dialog[open]').forEach(dialog => dialog.close());
}

function openDialog(id) {
  hideCapBubble();
  if (id !== '#pause-dialog' && $('#pause-dialog').open) overlayReturnToPause = true;
  pauseForOverlay();
  resetInput();
  closeDialogs();
  const dialog = $(id);
  dialog.scrollTop = 0;
  dialog.showModal();
}

function renderSettings() {
  $('#dream-pref-sound').checked = save.settings.sound;
  $('#dream-pref-motion').checked = save.settings.reducedMotion;
  document.body.classList.toggle('reduced-motion', save.settings.reducedMotion);
  game?.setSound(save.settings.sound);
  game?.setReducedMotion(save.settings.reducedMotion);
  capBook?.setReducedMotion(save.settings.reducedMotion);
}

function renderLobby() {
  const stats = getJourneyStats(save);
  const unlocked = getUnlockedChapter(save);
  $('#journey-progress-label').textContent = stats.completed + ' / 6 章已完成';
  $('#journey-progress-fill').style.width = (stats.completed / 6 * 100) + '%';
  $('#chapter-grid').innerHTML = CHAPTERS.map((chapter, index) => {
    const record = save.chapters[index];
    const locked = index > unlocked;
    const state = locked ? 'locked' : record.completed ? 'completed' : 'current';
    const status = locked ? icon('lock') + '未解锁' : !currentFestival && index === currentChapter && !settled ? '当前章节' : record.completed ? '已完成' : '可出发';
    return '<button class="chapter-card ' + state + '" data-chapter="' + index + '" style="--chapter-color:' + chapter.color + '"' + (locked ? ' disabled' : '') + ' aria-label="' + escapeHtml(chaptersInChinese[index] + '，' + chapter.title + '，' + (locked ? '尚未解锁' : record.completed ? '重新游玩，最好' + record.bestStars + '星' : '开始章节')) + '"><div class="chapter-topline"><span class="chapter-number">CHAPTER 0' + (index + 1) + '</span><span class="chapter-status">' + status + '</span></div>' + icon(chapter.icon, 'chapter-icon') + '<h3>' + chapter.title + '</h3><span class="chapter-subtitle">' + chapter.subtitle + '</span><p>' + chapter.summary + '</p><div class="chapter-bottom"><span class="chapter-stars" aria-label="最好成绩' + record.bestStars + '星">' + stars(record.bestStars) + '</span><span class="chapter-memories">' + icon('letter') + record.bestMemories + ' / 3 记忆</span>' + icon(locked ? 'lock' : 'arrow', 'chapter-arrow') + '</div></button>';
  }).join('');
  renderSettings();
}

function renderJournal() {
  const stats = getJourneyStats(save);
  const stampIds = new Set(earnedStampIds(save));
  $('#journal-stats').innerHTML = [
    [stats.completed + ' / 6', '完成章节'], [stats.memories + ' / 18', '记忆残页'],
    [stats.riddles + ' / 12', '解开谜灯'], [stats.stars + ' / 18', '收集星星'],
  ].map(([value, label]) => '<div><b>' + value + '</b><span>' + label + '</span></div>').join('');
  $('#memory-grid').innerHTML = CHAPTERS.map((chapter, index) => {
    const amount = save.chapters[index].bestMemories;
    return '<button class="memory-card" data-letter="' + index + '"' + (amount === 0 ? ' disabled' : '') + '><small>0' + (index + 1) + ' · ' + chapter.title + '</small><h4>' + chapter.letterTitle + '</h4><span>' + icon(amount ? 'letter' : 'lock') + (amount ? '已找回 ' + amount + ' / 3 片 · 拆开看看' : '还在等你找回') + '</span></button>';
  }).join('');
  $('#keepsake-grid').innerHTML = STORY_ITEMS.map(item => {
    const owned = save.chapters[item.chapterIndex].completed;
    return '<article class="keepsake-card' + (owned ? '' : ' locked') + '" style="--item-color:' + item.color + '">' + icon(owned ? item.icon : 'lock') + '<div><h4>' + item.title + '</h4><p>' + (owned ? item.text : '完成“' + CHAPTERS[item.chapterIndex].title + '”后，阿拾会把它收进邮包。') + '</p></div></article>';
  }).join('');
  $('#stamp-grid').innerHTML = STAMPS.map(stamp => '<article class="stamp-card' + (stampIds.has(stamp.id) ? ' earned' : '') + '">' + icon(stamp.icon) + '<b>' + stamp.title + '</b><small>' + (stampIds.has(stamp.id) ? '✓ 已盖上邮戳' : stamp.text) + '</small></article>').join('');
  $('#journal-choices').innerHTML = Object.entries(STORY_CHOICES).map(([key, choice]) => {
    const selected = choice.options.find(option => option.id === save.choices[key]);
    const available = save.chapters[choice.chapterIndex].completed;
    return '<div class="journal-choice"><div><h4>' + choice.title + '</h4><p>' + (selected ? selected.title : available ? '这封信，正等着你的回音' : '故事将在“' + CHAPTERS[choice.chapterIndex].title + '”抵达这里') + '</p></div><button data-reply="' + key + '"' + (available ? '' : ' disabled') + '>' + (selected ? '重新回信' : '写下回信') + '</button></div>';
  }).join('');
  const ending = getEnding(save);
  $('#journal-ending').innerHTML = ending ? '<button class="dream-secondary" id="journal-ending-open">' + icon('sun') + '重读最后的回信 · ' + ending.title + '</button><p class="dialog-note">已发现 ' + save.discoveredEndings.length + ' / 3 种结局。不同回信，会留下不同的天色。</p>' : '<p class="dialog-note">走完六个夜晚后，你写下的回信，会变成最后的天色。</p>';
}

function openJournal() {
  renderJournal();
  updateSeasonLabel();
  openDialog('#journal-dialog');
}

function openLetter(index) {
  const chapter = CHAPTERS[index];
  const amount = save.chapters[index]?.bestMemories || 0;
  if (!chapter || amount === 0) return;
  $('#letter-chapter').textContent = chaptersInChinese[index] + ' · ' + chapter.title;
  $('#letter-title').textContent = chapter.letterTitle;
  $('#letter-fragments').innerHTML = chapter.memories.slice(0, amount).map(text => '<p>' + escapeHtml(text) + '</p>').join('');
  $('#letter-missing').textContent = amount === 3 ? '三片残页已经拼好。这一段记忆，没有再寄丢。' : '还差 ' + (3 - amount) + ' 片残页。重访这一章，可以把这封信拼完整。';
  openDialog('#letter-dialog');
}

function openStory(lines, chapterIndex, onDone, lastLabel = '收好这封信', festival = currentFestival) {
  storySequence = { lines, chapterIndex, index: 0, onDone, lastLabel, festival };
  renderStoryLine();
  openDialog('#story-dialog');
}

function renderStoryLine() {
  const sequence = storySequence;
  const line = sequence.lines[sequence.index];
  const speaker = line.speaker === 'festival' && sequence.festival ? sequence.festival.npc : CAST[line.speaker] || CAST.ashi;
  $('#story-dialog').style.setProperty('--speaker-color', speaker.color || sequence.festival?.color || '#a9ead6');
  $('#story-chapter-label').textContent = sequence.festival ? sequence.festival.name + ' · ' + sequence.festival.title : chaptersInChinese[sequence.chapterIndex] + ' · ' + CHAPTERS[sequence.chapterIndex].title;
  $('#story-page').textContent = (sequence.index + 1).toString().padStart(2, '0') + ' / ' + sequence.lines.length.toString().padStart(2, '0');
  $('#story-portrait').src = portraitForLine(line, sequence.festival);
  $('#story-portrait').alt = speaker.name;
  const portraitWrap = $('#story-dialog .story-portrait-wrap');
  portraitWrap.dataset.mood = line.mood || 'tender';
  portraitWrap.classList.remove('cap-portrait-enter');
  void portraitWrap.offsetWidth;
  portraitWrap.classList.add('cap-portrait-enter');
  $('#story-speaker-role').textContent = speaker.role;
  $('#story-dialog-title').textContent = speaker.name;
  $('#story-dialog-text').textContent = line.text;
  $('#story-next>span').textContent = sequence.index === sequence.lines.length - 1 ? sequence.lastLabel : '下一句';
}

function finishStory() {
  if (!storySequence) return;
  const done = storySequence.onDone;
  storySequence = null;
  $('#story-dialog').close();
  done?.();
}

function advanceStory() {
  if (!storySequence) return;
  if (++storySequence.index >= storySequence.lines.length) finishStory();
  else renderStoryLine();
}

function openChoice(key, onDone = openJournal) {
  const choice = STORY_CHOICES[key];
  if (!choice || !save.chapters[choice.chapterIndex].completed) return;
  activeChoice = { key, onDone };
  $('#choice-title').textContent = choice.title;
  $('#choice-lead').textContent = choice.lead;
  $('#choice-options').innerHTML = choice.options.map((option, index) => '<button class="choice-option' + (save.choices[key] === option.id ? ' selected' : '') + '" data-choice="' + option.id + '"><span>' + (index ? '☾' : '✧') + '</span><strong>' + option.title + '</strong><small>' + option.text + '</small></button>').join('');
  openDialog('#choice-dialog');
}

function resolveChoice(id) {
  if (activeChoice?.festivalId) {
    const festival = getFestival(activeChoice.festivalId);
    const option = festival?.choice.options.find(item => item.id === id);
    if (!option || !hub.choose(festival.id, id)) return;
    const done = activeChoice.onDone;
    activeChoice = null;
    openStory([{ speaker: 'festival', text: option.reply }], currentChapter, done, '把这份回音收好', festival);
    return;
  }
  if (!activeChoice || !chooseStoryReply(save, activeChoice.key, id)) return;
  const { key, onDone } = activeChoice;
  const choice = STORY_CHOICES[key];
  const option = choice.options.find(item => item.id === id);
  activeChoice = null;
  persist();
  openStory([{ speaker: 'light', text: option.reply }], choice.chapterIndex, onDone, '把这份回音收好', null);
}

function openFestivalChoice(festival) {
  const choice = festival.choice;
  activeChoice = { festivalId: festival.id, onDone: () => hub.open('collection', festival.id) };
  $('#choice-title').textContent = choice.title;
  $('#choice-lead').textContent = choice.lead;
  const selected = hub.getRecord(festival.id)?.choice;
  $('#choice-options').innerHTML = choice.options.map((option, index) => '<button class="choice-option' + (selected === option.id ? ' selected' : '') + '" data-choice="' + option.id + '"><span>' + (index ? '☾' : '✧') + '</span><strong>' + escapeHtml(option.title) + '</strong><small>' + escapeHtml(option.text) + '</small></button>').join('');
  openDialog('#choice-dialog');
}

function showEnding() {
  const pending = nextPendingChoice(save);
  if (pending) { openChoice(pending, showEnding); return; }
  const ending = rememberEnding(save);
  if (!ending) { returnLobby(); return; }
  persist();
  $('#ending-dialog').style.setProperty('--ending-color', ending.color);
  $('#ending-eyebrow').textContent = ending.eyebrow;
  $('#ending-title').textContent = ending.title;
  $('#ending-text').innerHTML = ending.text.map(text => '<p>' + escapeHtml(text) + '</p>').join('');
  $('#ending-last-line').textContent = ending.lastLine;
  $('#ending-collection').textContent = '你已收好 ' + save.discoveredEndings.length + ' / ' + Object.keys(ENDINGS).length + ' 种天色';
  openDialog('#ending-dialog');
}

function beginChapter(index) {
  if (!Number.isInteger(index) || index < 0 || index > getUnlockedChapter(save)) return;
  if (!currentFestival && index === currentChapter && game && !settled) { continueFromMap(); return; }
  const pending = nextPendingChoice(save);
  if (pending && STORY_CHOICES[pending].chapterIndex < index) {
    openChoice(pending, () => beginChapter(index));
    return;
  }
  launchChapter(index);
}

function launchChapter(index) {
  launchScene(index, null);
}

function launchFestival(id) {
  const festival = getFestival(id);
  if (festival) launchScene(Math.min(save.lastChapter, getUnlockedChapter(save)), festival);
}

function launchScene(index, festival) {
  overlayReturnToPause = false;
  overlayResumeGame = null;
  storySequence = null;
  activeChoice = null;
  closeDialogs();
  stopGame();
  currentChapter = index;
  currentFestival = festival;
  runSessionId = 'dream-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2));
  currentHud = null;
  settled = false;
  lastHudAt = 0;
  lastCapBubbleAt = -Infinity;
  capActivitySave = mergeCapActivitySaves(capActivitySave, loadCapActivitySave());
  lostSave = mergeLostSaves(lostSave, loadLostSave());
  lastLostEvidence = '';
  renderLostEvidence(null);
  $('#dream-stage').hidden = false;
  document.body.classList.add('game-active');
  document.body.classList.toggle('festival-session', Boolean(festival));
  $('#stage-chapter-number').textContent = festival ? festival.name + ' · 四季来信' : '0' + (index + 1) + ' / 06';
  if (!festival) save.lastChapter = index;
  persist();
  $('#stage-chapter-title').textContent = festival?.title || CHAPTERS[index].title;
  $('#stage-memories-label').textContent = festival ? '礼物' : '记忆';
  $('#stage-restart').textContent = festival ? '重新开始这封来信' : '重新开始本章';
  const capScene = getCapScene({ chapterIndex: index, festivalId: festival?.id });
  const lost = getLostCase(capScene.id);
  game = new DreamGame($('#dream-canvas'), { onHud, onComplete: finishChapter, onPause: showPause, onEvent: announce, onPuzzle: showPuzzle, onTalk: showEncounter, onCapEvent, onCapActivity, onLostCase });
  game.start({ chapterIndex: index, festival, capScene, capActivityRecord: getCapActivityRecord(capActivitySave, capScene.id), capActivityRevision: capActivityRevision(capActivitySave), lostCaseRecord: lost ? getLostRecord(lostSave, lost.id) : null, lostCaseRevision: lostRevision(lostSave), season: hub?.getSeason(), outfit: hub?.getOutfit() || 'auto', sound: save.settings.sound, reducedMotion: save.settings.reducedMotion });
  updateSeasonLabel();
  $('#dream-canvas').focus({ preventScroll: true });
}

function stopGame() {
  hideCapBubble();
  renderLostEvidence(null);
  document.body.classList.remove('lost-inspecting');
  resetInput();
  game?.destroy();
  game = null;
  activePuzzle = null;
  pendingTalk = false;
  overlayReturnToPause = false;
  overlayResumeGame = null;
  clearTimeout(announcementTimer);
  $('#stage-announcement').classList.remove('show');
}

function returnLobby() {
  storySequence = null;
  activeChoice = null;
  openMap();
}

function onHud(snapshot) {
  const previousForm = currentHud?.form;
  const previousGifts = currentHud?.gifts;
  currentHud = snapshot;
  hub?.tick({ sessionId: runSessionId, time: snapshot.time, playing: snapshot.state === 'playing' && !document.querySelector('dialog[open]') && !shellOverlayOpen, usable: !settled && !activePuzzle && !pendingTalk && ['playing', 'paused'].includes(snapshot.state) });
  const now = performance.now();
  if (now - lastHudAt < 80 && previousForm === snapshot.form && previousGifts === snapshot.gifts && snapshot.state === 'playing') return;
  lastHudAt = now;
  $('#stage-seals').textContent = snapshot.seals + ' / ' + snapshot.totalSeals;
  $('#stage-memories').textContent = snapshot.memories + ' / ' + snapshot.totalMemories;
  $('#stage-time').textContent = timeLabel(snapshot.time);
  const lost = snapshot.lostCase;
  const lostExpanded = Boolean(lost && ['active', 'solved', 'delivering', 'returning'].includes(lost.phase));
  const lostVisible = Boolean(lost && (lost.nearBox || lostExpanded));
  document.body.classList.toggle('lost-inspecting', lostExpanded);
  $('#stage-objective').textContent = lostVisible ? lost.title : snapshot.objective || '点亮两盏回声谜灯，让阿拾走向出口';
  $('#stage-lost-case').hidden = !lostVisible;
  if (lostVisible) {
    const lostDone = getLostRecord(lostSave, lost.caseId)?.solvedVariants.includes(lost.variant);
    $('#stage-lost-case').dataset.phase = lost.phase;
    const encoreVisible = lost.encore && ['unfold', 'celebrate', 'settled'].includes(lost.encore.stage);
    const lostLabel = encoreVisible ? lost.encore.caption : '失物 ' + (lost.variant + 1) + ' / 2 · ' + (lostDone || ['solved', 'delivering'].includes(lost.phase) ? '物归原主' : '物证 ' + lost.seenClues + ' / ' + lost.totalClues);
    if ($('#stage-lost-case').textContent !== lostLabel) $('#stage-lost-case').textContent = lostLabel;
  }
  renderLostEvidence(lost);
  $('#stage-near-hint').textContent = snapshot.nearHint || currentFestival?.sceneHint || CHAPTERS[snapshot.chapterIndex].hint;
  $('#stage-buffs').innerHTML = (snapshot.buffs?.compass ? '<span>罗盘 ' + snapshot.buffs.compass + 's</span>' : '') + (snapshot.buffs?.feather ? '<span>轻羽守护</span>' : '');
  const soul = snapshot.form === 'soul';
  document.body.classList.toggle('soul-active', soul);
  $('#stage-form-name').textContent = soul ? '拾光 · 灵魂' : '阿拾 · 身体';
  if (previousForm !== snapshot.form || previousGifts !== snapshot.gifts) updateShell();
  const energy = Math.max(0, Math.min(100, snapshot.energy / Math.max(1, snapshot.maxEnergy) * 100));
  $('#stage-energy').style.width = energy + '%';
  $('#stage-energy').style.background = energy < 25 ? 'var(--dream-orange)' : 'var(--dream-mint)';
  $('#stage-energy-label').textContent = soul ? '灵光 ' + Math.ceil(energy) + '%' : energy < 99 ? '恢复中 ' + Math.ceil(energy) + '%' : '灵光充足';
  const capPhase = snapshot.cap?.phase || (soul ? 'open' : 'closed');
  $('#stage-cap-status').dataset.phase = capPhase;
  $('#stage-cap-label').textContent = ({ closed: 'E · 掀开脑洞', opening: '咔哒 · 脑洞打开', open: '脑洞打开 · 念头出发', returning: '拾光回家 · 轻轻扣盖' })[capPhase] || '';
  const activity = snapshot.capActivity;
  const activityVisible = !lostVisible && Boolean(activity && (activity.phase === 'active' || activity.nearRing));
  $('#stage-cap-activity').hidden = !activityVisible;
  if (activityVisible) {
    const config = getCapActivity({ chapterIndex: snapshot.chapterIndex, festivalId: snapshot.festivalId });
    const count = Array.isArray(activity.completedSteps) ? activity.completedSteps.length : activity.completedSteps || 0;
    $('#stage-cap-activity').dataset.phase = activity.phase;
    $('#stage-cap-activity-name').textContent = config.title;
    $('#stage-cap-activity-count').textContent = count + ' / 3';
    $('#stage-cap-activity-progress').innerHTML = [0, 1, 2].map(index => '<i class="' + (index < count ? 'done' : '') + '"></i>').join('');
  }
  $('#stage-toggle-label').textContent = soul ? '回到身体' : '掀开头盖骨';
  $('#stage-action-label').textContent = soul ? '回声脉冲' : '跳跃';
  $('#stage-action-glyph').textContent = soul ? '✧' : '↑';
  if (previousForm && previousForm !== snapshot.form) resetInput();
}

function announce(event) {
  if (!event?.text) return;
  if (['memory', 'seal'].includes(event.type) && $('#cap-bubble').classList.contains('show')) return;
  clearTimeout(announcementTimer);
  $('#stage-announcement').textContent = event.text;
  $('#stage-announcement').classList.add('show');
  announcementTimer = setTimeout(() => $('#stage-announcement').classList.remove('show'), event.type === 'tutorial' ? 4600 : 3000);
}

function showPause(reason) {
  if (suppressPauseDialog || shellOverlayOpen || !game || settled || activePuzzle || pendingTalk || storySequence || document.querySelector('dialog[open]')) return;
  $('#pause-detail').textContent = reason === 'visibility' || reason === 'blur' ? '离开页面时，游戏已自动暂停。' : currentFestival?.title || CHAPTERS[currentChapter].title;
  openDialog('#pause-dialog');
}

function resumeGame() {
  if (!game || settled || activePuzzle || pendingTalk) return;
  overlayReturnToPause = false;
  overlayResumeGame = null;
  $('#pause-dialog').close();
  resetInput();
  game.resume();
  $('#dream-canvas').focus({ preventScroll: true });
}

function restartChapter() {
  if (currentFestival) launchFestival(currentFestival.id);
  else launchChapter(currentChapter);
}

function showEncounter(payload) {
  const festival = getFestival(payload.festivalId);
  if (!festival) { game?.resolveTalk(); return; }
  pendingTalk = true;
  const lines = payload.repeated ? festival.encounters : festival.intro;
  openStory(lines, currentChapter, () => {
    pendingTalk = false;
    resetInput();
    game?.resolveTalk();
    $('#dream-canvas').focus({ preventScroll: true });
  }, '一起去找礼物', festival);
}

function finishChapter(result) {
  if (result.mode === 'festival' || currentFestival) { finishFestival(result); return; }
  if (settled) return;
  settled = true;
  resetInput();
  const recorded = completeDreamChapter(save, result);
  if (!recorded.ok) { toast('这一站的记录没有写好，请重新出发。'); returnLobby(); return; }
  lastResult = result;
  persist();
  const chapter = CHAPTERS[result.chapterIndex];
  const item = STORY_ITEMS[result.chapterIndex];
  $('#result-memories-label').textContent = '记忆残页';
  $('#result-map').textContent = '章节地图';
  $('#result-kicker').textContent = chaptersInChinese[result.chapterIndex] + ' · ' + chapter.title + ' · 已送达';
  $('#result-title').textContent = result.chapterIndex === 5 ? '最后一封信，终于到了。' : '这盏灯，为你亮着。';
  $('#result-stars').innerHTML = stars(result.stars);
  $('#result-stars').setAttribute('aria-label', '本章获得' + result.stars + '颗星');
  $('#result-message').textContent = result.memories === 3 ? '三片残页都在。这个夜晚的故事，被你完整地带了回来。' : '还有 ' + (3 - result.memories) + ' 片记忆留在路上。随时可以回来，把它们慢慢找齐。';
  $('#result-memories').textContent = result.memories + ' / 3';
  $('#result-time').textContent = timeLabel(result.time);
  $('#result-falls').textContent = result.deaths;
  $('#result-keepsake').style.setProperty('--item-color', item.color);
  $('#result-keepsake').innerHTML = icon(item.icon) + '<div><b>收进邮包 · ' + item.title + '</b><span>' + item.text + '</span></div>';
  $('#result-new-stamps').textContent = recorded.newStamps.length ? '新邮戳：' + recorded.newStamps.map(id => STAMPS.find(stamp => stamp.id === id).title).join(' · ') : '更好的章节成绩与记忆收集，已经记进信箱。';
  openDialog('#result-dialog');
}

function finishFestival(result) {
  if (settled || !currentFestival) return;
  const festival = currentFestival;
  const recorded = hub.complete(festival.id, result);
  if (!recorded.ok) { toast('礼物还没有装齐，再试一次吧。'); launchFestival(festival.id); return; }
  settled = true;
  resetInput();
  lastResult = { ...result, festivalId: festival.id };
  $('#result-kicker').textContent = festival.name + ' · ' + festival.title + ' · 已送达';
  $('#result-title').textContent = '这份相遇，收进四季里。';
  $('#result-stars').innerHTML = stars(result.stars);
  $('#result-stars').setAttribute('aria-label', '本次获得' + result.stars + '颗星');
  $('#result-message').textContent = '两盏谜灯亮了，三份礼物齐了。' + festival.npc.name + '还留了一封回信给你。';
  $('#result-memories').textContent = '3 / 3';
  $('#result-memories-label').textContent = '节日礼物';
  $('#result-time').textContent = timeLabel(result.time);
  $('#result-falls').textContent = result.deaths;
  $('#result-keepsake').style.setProperty('--item-color', festival.color);
  $('#result-keepsake').innerHTML = '<img src="./assets/festival-item-' + festival.id + '.svg" width="76" height="76" alt=""><div><b>收进邮包 · ' + escapeHtml(festival.item.name) + '</b><span>' + escapeHtml(festival.item.description) + '</span></div>';
  $('#result-new-stamps').textContent = recorded.newOutfit ? '新装扮已解锁：' + festival.name + '装扮 · 全年可穿' : '更好的成绩已经收好，随时可以回来重访。';
  $('#result-map').textContent = '返回主线';
  openDialog('#result-dialog');
}

function readChapterOutro() {
  if (!lastResult) return;
  if (lastResult.festivalId) {
    const festival = getFestival(lastResult.festivalId);
    openStory(festival.outro, currentChapter, () => openFestivalChoice(festival), '留下一句回音', festival);
    return;
  }
  const index = lastResult.chapterIndex;
  const after = () => {
    const choice = CHAPTERS[index].choice;
    if (choice) openChoice(choice, () => returnLobby());
    else if (index === 5) showEnding();
    else returnLobby();
  };
  openStory(CHAPTERS[index].outro, index, after, index === 5 ? '读一读，明天的回信' : '收好这封信', null);
}

function shuffledIndexes(length) {
  const values = Array.from({ length }, (_, index) => index);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function showPuzzle(payload) {
  const festival = getFestival(payload.festivalId);
  const puzzle = festival ? getFestivalPuzzle(festival.id, payload.sealIndex) : getPuzzle(payload.chapterIndex, payload.sealIndex);
  if (!puzzle) { game?.resolvePuzzle(false); toast('这盏灯还没找到自己的谜面，请试试另一盏灯。'); return; }
  activePuzzle = { puzzle, festivalId: festival?.id, hints: 0, solved: false, assisted: false, order: shuffledIndexes(puzzle.options.length) };
  const speaker = puzzle.speaker === 'festival' && festival ? festival.npc : CAST[puzzle.speaker] || CAST.light;
  $('#puzzle-dialog').dataset.puzzleKind = puzzle.type.startsWith('诗词') ? 'poem' : puzzle.type === '歇后语' ? 'saying' : puzzle.type.startsWith('原创') ? 'riddle' : 'story';
  $('#puzzle-type').textContent = puzzle.type;
  $('#puzzle-count').textContent = festival ? (payload.sealIndex + 1).toString().padStart(2, '0') + ' / 02' : (PUZZLES.indexOf(puzzle) + 1).toString().padStart(2, '0') + ' / 12';
  $('#puzzle-portrait').src = speaker.portrait;
  $('#puzzle-portrait').alt = speaker.name;
  $('#puzzle-scene').textContent = puzzle.scene;
  $('#puzzle-title').textContent = puzzle.title;
  $('#puzzle-question').textContent = puzzle.question;
  $('#puzzle-options').innerHTML = activePuzzle.order.map((answer, displayIndex) => '<button class="puzzle-option" data-answer="' + answer + '"><span>' + String.fromCharCode(65 + displayIndex) + '</span><span>' + escapeHtml(puzzle.options[answer]) + '</span></button>').join('');
  $('#puzzle-feedback').textContent = '';
  $('#puzzle-hints').innerHTML = '';
  $('#puzzle-explanation').hidden = true;
  $('#puzzle-explanation').textContent = '';
  $('#puzzle-hint').hidden = false;
  $('#puzzle-hint').textContent = '提示 ✧';
  $('#puzzle-return').hidden = false;
  $('#puzzle-continue').hidden = true;
  openDialog('#puzzle-dialog');
}

function answerPuzzle(answer, assisted = false) {
  if (!activePuzzle || activePuzzle.solved) return;
  const { puzzle } = activePuzzle;
  const correct = activePuzzle.festivalId ? Number.isInteger(answer) && answer === puzzle.answer : checkPuzzleAnswer(puzzle.id, answer);
  const selected = $('#puzzle-options').querySelector('[data-answer="' + answer + '"]');
  if (!correct) {
    selected?.classList.add('wrong');
    $('#puzzle-feedback').textContent = '还不对，再试一次。也可以查看提示。';
    return;
  }
  activePuzzle.solved = true;
  activePuzzle.assisted = assisted;
  $$('#puzzle-options button').forEach(button => {
    button.disabled = true;
    button.classList.toggle('correct', Number(button.dataset.answer) === puzzle.answer);
    button.classList.remove('wrong');
  });
  $('#puzzle-feedback').textContent = assisted ? '已查看答案。' : '答对了！';
  $('#puzzle-explanation').textContent = puzzle.explanation;
  $('#puzzle-explanation').hidden = false;
  $('#puzzle-hint').hidden = true;
  $('#puzzle-return').hidden = true;
  $('#puzzle-continue').hidden = false;
  if (activePuzzle.festivalId) hub.solvePuzzle(activePuzzle.festivalId, puzzle.id, assisted);
  else { recordPuzzleSolve(save, puzzle.id, assisted); persist(); }
  $('#puzzle-continue').focus({ preventScroll: true });
}

function revealHint() {
  if (!activePuzzle || activePuzzle.solved) return;
  if (activePuzzle.hints >= 2) { answerPuzzle(activePuzzle.puzzle.answer, true); return; }
  const hint = activePuzzle.puzzle.hints[activePuzzle.hints];
  activePuzzle.hints++;
  const paragraph = document.createElement('p');
  paragraph.textContent = '拾光的提示 ' + activePuzzle.hints + ' · ' + hint;
  $('#puzzle-hints').append(paragraph);
  $('#puzzle-hint').textContent = activePuzzle.hints === 1 ? '下一条提示 ✧' : '看看答案，再继续 →';
}

function leavePuzzle(solved) {
  if (!activePuzzle) return;
  const canLight = solved && activePuzzle.solved;
  activePuzzle = null;
  $('#puzzle-dialog').close();
  resetInput();
  game?.resolvePuzzle(Boolean(canLight));
  $('#dream-canvas').focus({ preventScroll: true });
}

function syncInput() {
  const pointerDirections = new Set(heldPointers.values());
  const left = heldKeys.has('KeyA') || heldKeys.has('ArrowLeft') || pointerDirections.has('left');
  const right = heldKeys.has('KeyD') || heldKeys.has('ArrowRight') || pointerDirections.has('right');
  const up = heldKeys.has('KeyW') || heldKeys.has('ArrowUp') || pointerDirections.has('up');
  const down = heldKeys.has('KeyS') || heldKeys.has('ArrowDown') || pointerDirections.has('down');
  game?.setInput({ x: Number(right) - Number(left), y: Number(down) - Number(up) });
}

function resetInput() {
  heldKeys.clear();
  heldPointers.clear();
  $$('[data-direction].held').forEach(button => button.classList.remove('held'));
  game?.setInput({ x: 0, y: 0 });
}

function gameplayAvailable() { return game && !settled && game.state === 'playing' && !document.querySelector('dialog[open]'); }

document.addEventListener('click', event => {
  const chapter = event.target.closest('[data-chapter]');
  if (chapter && !chapter.disabled) { beginChapter(Number(chapter.dataset.chapter)); return; }
  const close = event.target.closest('[data-close]');
  if (close) {
    if (close.dataset.close === 'letter-dialog') openJournal();
    else document.getElementById(close.dataset.close)?.close();
    return;
  }
  const letter = event.target.closest('[data-letter]');
  if (letter && !letter.disabled) { openLetter(Number(letter.dataset.letter)); return; }
  const reply = event.target.closest('[data-reply]');
  if (reply && !reply.disabled) { openChoice(reply.dataset.reply, openJournal); return; }
  const choice = event.target.closest('[data-choice]');
  if (choice) { resolveChoice(choice.dataset.choice); return; }
  const answer = event.target.closest('[data-answer]');
  if (answer && !answer.disabled) { answerPuzzle(Number(answer.dataset.answer)); return; }
  if (event.target.closest('#journal-ending-open')) showEnding();
});

$('#stage-story').addEventListener('click', () => {
  openStory(currentFestival?.intro || CHAPTERS[currentChapter].intro, currentChapter, resumeAfterOverlay, '返回游戏');
});
$('#stage-season').addEventListener('click', () => openFestivalHub());
$('#stage-back-story').addEventListener('click', () => launchChapter(Math.min(save.lastChapter, getUnlockedChapter(save))));
$('#journal-festivals').addEventListener('click', () => openFestivalHub('collection'));
$('#journal-capbook').addEventListener('click', openCapBook);
$('#map-continue').addEventListener('click', continueFromMap);
$$('dialog').forEach(dialog => dialog.addEventListener('close', () => {
  queueMicrotask(() => {
    if (dialog.id === 'map-dialog' && !document.querySelector('dialog[open]') && (!game || settled)) continueFromMap();
    else if (dialog.id === 'preferences-dialog' && !game && !document.querySelector('dialog[open]')) launchChapter(Math.min(save.lastChapter, getUnlockedChapter(save)));
    else resumeAfterOverlay();
  });
}));
$('#story-next').addEventListener('click', advanceStory);
$('#story-skip').addEventListener('click', finishStory);
$('#story-dialog').addEventListener('cancel', event => { event.preventDefault(); finishStory(); });
$('#puzzle-hint').addEventListener('click', revealHint);
$('#puzzle-return').addEventListener('click', () => leavePuzzle(false));
$('#puzzle-continue').addEventListener('click', () => leavePuzzle(true));
$('#puzzle-dialog').addEventListener('cancel', event => { event.preventDefault(); leavePuzzle(activePuzzle?.solved === true); });
$('#stage-resume').addEventListener('click', resumeGame);
$('#stage-restart').addEventListener('click', restartChapter);
$('#stage-home').addEventListener('click', () => returnLobby());
$('#pause-dialog').addEventListener('cancel', event => { event.preventDefault(); resumeGame(); });
$('#result-story').addEventListener('click', readChapterOutro);
$('#result-map').addEventListener('click', () => {
  if (lastResult?.festivalId) launchChapter(Math.min(save.lastChapter, getUnlockedChapter(save)));
  else if (lastResult?.chapterIndex === 5) showEnding();
  else returnLobby();
});
$('#result-dialog').addEventListener('cancel', event => { event.preventDefault(); returnLobby(); });
$('#choice-dialog').addEventListener('cancel', event => { event.preventDefault(); returnLobby(); });
$('#ending-home').addEventListener('click', () => returnLobby());
$('#ending-dialog').addEventListener('cancel', event => { event.preventDefault(); returnLobby(); });
$('#letter-back').addEventListener('click', openJournal);
$('#letter-dialog').addEventListener('cancel', event => { event.preventDefault(); openJournal(); });

$('#stage-toggle').addEventListener('click', () => { if (gameplayAvailable()) { resetInput(); game.toggleSoul(); $('#dream-canvas').focus({ preventScroll: true }); } });
$('#stage-jump').addEventListener('click', () => { if (gameplayAvailable()) { game.jump(); $('#dream-canvas').focus({ preventScroll: true }); } });
$('#stage-interact').addEventListener('click', () => { if (gameplayAvailable()) { game.interact(); if (!activePuzzle && !pendingTalk) $('#dream-canvas').focus({ preventScroll: true }); } });

$$('[data-direction]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (!gameplayAvailable()) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    heldPointers.set(event.pointerId, button.dataset.direction);
    button.classList.add('held');
    if (button.dataset.direction === 'up' && currentHud?.form === 'body') game.jump();
    syncInput();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => {
    heldPointers.delete(event.pointerId);
    button.classList.remove('held');
    syncInput();
  });
});

document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Escape' && gameplayAvailable()) { event.preventDefault(); resetInput(); game.pause('manual'); return; }
  if (!gameplayAvailable()) return;
  if (event.target instanceof Element && event.target.closest('button,a,input,select,textarea,[contenteditable]')) return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) {
    event.preventDefault();
    heldKeys.add(event.code);
    if ((event.code === 'KeyW' || event.code === 'ArrowUp') && currentHud?.form === 'body' && !event.repeat) game.jump();
    syncInput();
  }
  if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) game.jump(); }
  if (event.code === 'KeyE') { event.preventDefault(); if (!event.repeat) { resetInput(); game.toggleSoul(); } }
  if (event.code === 'KeyQ') { event.preventDefault(); if (!event.repeat) game.interact(); }
});
document.addEventListener('keyup', event => { if (heldKeys.delete(event.code)) syncInput(); });
window.addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); else resumeAfterOverlay(); });

$('#dream-pref-sound').addEventListener('change', event => { save.settings.sound = event.target.checked; persist(); renderSettings(); });
$('#dream-pref-motion').addEventListener('change', event => { save.settings.reducedMotion = event.target.checked; persist(); renderSettings(); });
$('#dream-export').addEventListener('click', () => {
  lostSave = mergeLostSaves(lostSave, loadLostSave());
  const backup = { type: 'tougaigu-journey', version: 2, story: validateDreamSave(save), ...hub.exportState(), capbook: capBook.exportState(), capactivities: validateCapActivitySave(capActivitySave), lostcases: validateLostSave(lostSave) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tougaigu-journey-save-' + new Date().toISOString().slice(0, 10) + '.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  $('#dream-save-message').textContent = '故事、脑洞画册、借景路线、失物回执、节日收藏和时光奖励已一起备份。';
});
$('#dream-import').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 262144) throw new Error('这份存档太大，请选择本游戏导出的旅途存档。');
    const parsed = JSON.parse(await file.text());
    const journey = parsed?.type === 'tougaigu-journey' && parsed.version === 2;
    const story = journey ? parsed.story : parsed;
    if (!story || typeof story !== 'object' || Array.isArray(story) || story.version !== 1 || !Array.isArray(story.chapters)) throw new Error('这不是可识别的旅途存档。原版生存存档请在原版导入。');
    const imported = validateDreamSave(story);
    const stats = getJourneyStats(imported);
    if (!window.confirm('导入会替换当前故事进度：已完成 ' + stats.completed + ' 章，收集 ' + stats.memories + ' 片记忆。' + (journey ? '文件中的脑洞画册、借景路线、失物回执、节日收藏和时光奖励也会一并载入。' : '') + '原版生存成长不受影响。确定导入吗？')) return;
    const importedLost = journey && parsed.lostcases ? replaceLostSave(parsed.lostcases, lostSave, loadLostSave()) : null;
    stopGame();
    save = imported;
    let activityStored = true, lostStored = true;
    if (journey) {
      hub.importState(parsed);
      capBook.importState(parsed.capbook);
      if (parsed.capactivities) {
        capActivitySave = replaceCapActivitySave(parsed.capactivities, capActivitySave, loadCapActivitySave());
        activityStored = persistCapActivitySave(capActivitySave);
        capActivityStorageWarned = !activityStored;
        capBook.refreshActivities();
        updateCapSummary();
      }
      if (importedLost) {
        lostSave = importedLost;
        lostStored = persistLostSave(lostSave);
        lostStorageWarned = !lostStored;
        capBook.refreshActivities();
        updateCapSummary();
      }
    }
    const okay = persist() && activityStored && lostStored;
    settled = true;
    renderLobby();
    $('#dream-save-message').textContent = okay ? '故事接好了。欢迎回来，邮差。' : '故事已载入，但浏览器暂时无法保存，请保留备份。';
  } catch (error) {
    $('#dream-save-message').textContent = error instanceof SyntaxError ? '这份文件没有读懂，请选择导出的 JSON 故事存档。' : error.message;
  } finally { event.target.value = ''; }
});

try {
  if (!localStorage.getItem(DREAM_SAVE_KEY) && matchMedia('(prefers-reduced-motion: reduce)').matches) save.settings.reducedMotion = true;
} catch { /* Storage failure is surfaced by persist(), without blocking play. */ }
shell = mountGameShell({
  gameId: 'dream',
  onAction: handleShellAction,
  onOverlayChange(open) { shellOverlayOpen = open; if (open) pauseForOverlay(); else queueMicrotask(resumeAfterOverlay); },
});
hub = createFestivalHub({
  gameId: 'dream',
  onOpen: openDialog,
  onClose: resumeAfterOverlay,
  onLaunch: launchFestival,
  onOutfit(id) { game?.setOutfit(id); updateSeasonLabel(); },
  onSeason(season) { game?.setSeason(season); updateSeasonLabel(); },
  onUseItem(id) { return Boolean(game && !settled && !activePuzzle && !pendingTalk && game.useItem(id)); },
  onSummary(summary) { hubSummary = summary; updateSeasonLabel(); },
  onNotice: toast,
});
hub.summary();
capBook = createCapBook({
  onOpen: openDialog,
  onClose: resumeAfterOverlay,
  onReadLetter(scene) {
    if (!scene) return;
    const festival = getFestival(scene.festivalId);
    const index = festival ? currentChapter : scene.chapterIndex;
    openStory(festival?.intro || CHAPTERS[index].intro, index, () => capBook.open(scene.id), '收回脑洞画册', festival || null);
  },
  getActivityRecord: id => getCapActivityRecord(capActivitySave, id),
  getActivityStats: () => getCapActivityStats(capActivitySave),
  getLostRecord: id => getLostRecord(lostSave, id),
  getLostStats: () => getLostStats(lostSave),
  onPlayLost(scene) {
    if (!scene) return;
    capActivitySave = mergeCapActivitySaves(capActivitySave, loadCapActivitySave());
    lostSave = mergeLostSaves(lostSave, loadLostSave());
    const festival = getFestival(scene.festivalId);
    const same = festival ? currentFestival?.id === festival.id : !currentFestival && currentChapter === scene.chapterIndex;
    if (same && game && !settled) {
      const activityRecord = getCapActivityRecord(capActivitySave, scene.id);
      if (!game.getSnapshot().lostCase && activityRecord.completedVariants.includes(0)) {
        game.setCapActivityRecord(activityRecord, capActivityRevision(capActivitySave));
      }
      syncLostInstance();
      $('#cap-book-dialog').close();
      toast('从借景圆环向右，找到失物匣。阿拾按 Q 打开，再按 E 让拾光查看。');
      return;
    }
    if (festival) launchFestival(festival.id);
    else if (scene.chapterIndex <= getUnlockedChapter(save)) launchChapter(scene.chapterIndex);
  },
  onPlayActivity(scene) {
    const festival = getFestival(scene.festivalId);
    const same = festival ? currentFestival?.id === festival.id : !currentFestival && currentChapter === scene.chapterIndex;
    if (same && game && !settled) {
      $('#cap-book-dialog').close();
      toast('在起点附近找到发光圆环：站稳后按 E 借出脑洞，拾光靠近岔路按空格转向。');
      return;
    }
    if (festival) launchFestival(festival.id);
    else if (scene.chapterIndex <= getUnlockedChapter(save)) launchChapter(scene.chapterIndex);
  },
  onSummary: updateCapSummary,
  onNotice: toast,
});
capBook.summary();
window.addEventListener('storage', event => {
  if (event.key === LOST_SAVE_KEY) {
    const previousRevision = lostRevision(lostSave), stored = loadLostSave();
    let incoming;
    try { incoming = event.newValue ? validateLostSave(JSON.parse(event.newValue)) : null; } catch { incoming = null; }
    lostSave = mergeLostSaves(mergeLostSaves(lostSave, incoming), stored);
    if (JSON.stringify(lostSave) !== JSON.stringify(stored)) storeLostProgress();
    if (lostRevision(lostSave) !== previousRevision && game) syncLostInstance();
    capBook.refreshActivities();
    updateCapSummary();
    return;
  }
  if (event.key !== CAP_ACTIVITY_SAVE_KEY) return;
  const previousRevision = capActivityRevision(capActivitySave), stored = loadCapActivitySave();
  let incoming;
  try { incoming = event.newValue ? validateCapActivitySave(JSON.parse(event.newValue)) : null; } catch { incoming = null; }
  capActivitySave = mergeCapActivitySaves(mergeCapActivitySaves(capActivitySave, incoming), stored);
  if (JSON.stringify(capActivitySave) !== JSON.stringify(stored)) persistCapActivitySave(capActivitySave);
  if (capActivityRevision(capActivitySave) !== previousRevision && game) {
    const scene = getCapScene({ chapterIndex: currentChapter, festivalId: currentFestival?.id });
    game.setCapActivityRecord(getCapActivityRecord(capActivitySave, scene.id), capActivityRevision(capActivitySave));
  }
  capBook.refreshActivities();
  updateCapSummary();
});
renderLobby();
const requestedFestival = getFestival(new URLSearchParams(location.search).get('festival'));
if (requestedFestival) launchFestival(requestedFestival.id);
else launchChapter(Math.min(save.lastChapter, getUnlockedChapter(save)));
window.addEventListener('pagehide', event => { hub.flush(); if (!event.persisted) { hideCapBubble(); capBook.destroy(); hub.destroy(); game?.destroy(); } });
