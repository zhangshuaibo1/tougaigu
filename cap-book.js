import { CAP_SCENES, getCapScene } from './dream-cap-story.js';
import { drawCapMiniature } from './dream-cap-art.js';
import { CHAPTERS } from './dream-story.js';
import { getFestival } from './dream-festivals.js';
import { getCapActivity } from './dream-cap-activities.js';
import { CAP_ACTIVITY_VARIANTS } from './cap-activity-progress.js';
import { CAP_SAVE_KEY, loadCapSave, persistCapSave, validateCapSave, mergeCapSaves, getCapRecord, getCapStats, recordCapEvent } from './cap-progress.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const titleFor = scene => scene.festivalId ? getFestival(scene.festivalId)?.title : CHAPTERS[scene.chapterIndex]?.title;
const pictureFor = scene => scene.festivalId ? './assets/festival-item-' + scene.festivalId + '.svg' : './assets/portrait-hero-open.svg';

export function createCapBook({ onOpen, onClose, onReadLetter, onSummary, onNotice, getActivityRecord, getActivityStats, onPlayActivity } = {}) {
  let save = loadCapSave(), selected = 'story-0', reducedMotion = false, animation = null, lastDraw = 0, elapsed = 0, storageWarned = false;
  const dialog = document.createElement('dialog');
  dialog.id = 'cap-book-dialog';
  dialog.className = 'dream-dialog cap-book-dialog';
  dialog.setAttribute('aria-labelledby', 'cap-book-title');
  dialog.innerHTML = '<button class="dream-dialog-close" data-cap-close aria-label="关闭脑洞画册">×</button><div class="dialog-eyebrow">阿拾的脑内小剧场</div><h2 id="cap-book-title">掀开一点，藏着一个世界。</h2><div class="cap-book-stats" id="cap-book-stats"></div><div class="cap-book-feature" id="cap-book-feature"></div><div class="cap-book-section-title"><h3>一路打开的脑洞</h3><span>6 幕旅途 · 10 封节日来信</span></div><div class="cap-book-grid" id="cap-book-grid"></div>';
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);

  function report() { onSummary?.(getCapStats(save)); }
  function commit() { if (!persistCapSave(save) && !storageWarned) { storageWarned = true; onNotice?.('脑洞还在。浏览器暂时无法保存，请在设置里导出旅途存档。'); } }
  function stopAnimation() { if (animation !== null) cancelAnimationFrame(animation); animation = null; lastDraw = 0; }
  function draw(time = 0) {
    const scene = CAP_SCENES.find(item => item.id === selected) || CAP_SCENES[0];
    const canvas = $('#cap-book-canvas');
    if (!canvas || !getCapRecord(save, scene.id)?.opens) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== 300 * dpr || canvas.height !== 248 * dpr) { canvas.width = 300 * dpr; canvas.height = 248 * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 300, 248);
    const glow = ctx.createRadialGradient(150, 113, 8, 150, 113, 115);
    glow.addColorStop(0, (scene.color || '#a9ead6') + '35'); glow.addColorStop(1, (scene.color || '#a9ead6') + '00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 300, 248);
    // A little hinged skull is the stage, rather than a generic preview tile.
    ctx.save(); ctx.translate(150, 173);
    ctx.fillStyle = '#ead8b6'; ctx.strokeStyle = '#b8a58b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-55, -12); ctx.bezierCurveTo(-58, 27, -37, 36, -28, 40); ctx.lineTo(-27, 57); ctx.quadraticCurveTo(0, 66, 27, 57); ctx.lineTo(28, 40); ctx.bezierCurveTo(51, 33, 58, 14, 55, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4d455a'; for (const x of [-23, 23]) { ctx.beginPath(); ctx.ellipse(x, 17, 14, 18, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f3d39c'; for (const x of [-19, 19]) { ctx.beginPath(); ctx.ellipse(x, 15, 4, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#ac927b'; for (const x of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(x, 52); ctx.lineTo(x, 61); ctx.stroke(); }
    ctx.save(); ctx.translate(-54, -13); ctx.rotate(-1.08); ctx.translate(54, 13);
    ctx.fillStyle = '#f3e4c6'; ctx.beginPath(); ctx.moveTo(-55, -13); ctx.bezierCurveTo(-53, -77, 53, -77, 55, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d2a66c'; ctx.beginPath(); ctx.moveTo(-44, -19); ctx.lineTo(44, -19); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#b89760'; ctx.beginPath(); ctx.arc(-54, -13, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#30484b'; ctx.beginPath(); ctx.ellipse(0, -12, 53, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c7e7cf'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(150, 115); ctx.scale(1.15, 1.15); drawCapMiniature(ctx, scene, reducedMotion ? 0 : time); ctx.restore();
  }
  function animate(time) {
    if (!dialog.open || reducedMotion) { stopAnimation(); draw(0); return; }
    if (!lastDraw || time - lastDraw >= 66) { elapsed += lastDraw ? Math.min(.1, (time - lastDraw) / 1000) : 0; lastDraw = time; draw(elapsed); }
    animation = requestAnimationFrame(animate);
  }
  function runAnimation() { stopAnimation(); draw(elapsed); if (dialog.open && !reducedMotion) animation = requestAnimationFrame(animate); }

  function activityMarkup(scene, opened) {
    const activity = getCapActivity(scene), record = getActivityRecord?.(scene.id) || { completedSteps: [], completedVariants: [], best: {}, pending: null };
    const complete = record.completedVariants.includes(0);
    return '<section class="cap-book-activity"><div class="cap-book-activity-title"><span>✧</span><div><small>借景小戏</small><h4>' + escape(activity.title) + '</h4></div><b>' + (complete ? '已搭好' : record.completedSteps.length + ' / 3 处') + '</b></div><div class="cap-activity-destinations">' + activity.destinations.map((destination, index) => '<span class="' + (record.completedSteps.includes(index) ? 'done' : '') + '"><i>' + (record.completedSteps.includes(index) ? '✦' : '○') + '</i>' + escape(destination.label) + '</span>').join('') + '</div><div class="cap-activity-variants">' + CAP_ACTIVITY_VARIANTS.map((label, index) => {
      const completed = record.completedVariants.includes(index), best = record.best[index];
      const pending = record.pending?.variant === index ? record.pending : null;
      return '<span class="' + (completed ? 'done' : '') + '"><b>' + (completed ? '✓ ' : '') + label + '</b><small>' + (pending ? '待续 · ' + pending.completedSteps.length + ' / 3 处' : best ? best.switches + ' 次转向 · ' + Math.ceil(best.seconds) + ' 秒' : completed ? '已收好这条路线' : index ? '完成后按 Q 再来一局' : '把三个念头送到亮起的地方') + '</small></span>';
    }).join('') + '</div>' + (opened ? '<button class="dream-secondary" data-cap-play="' + scene.id + '">去看看这出小戏 <span>↗</span></button>' : '') + '<p>阿拾站在圆环供光，拾光靠近岔路按空格转向。</p></section>';
  }

  function render() {
    const stats = getCapStats(save), scene = CAP_SCENES.find(item => item.id === selected) || CAP_SCENES[0], record = getCapRecord(save, scene.id), opened = record.opens > 0;
    $('#cap-book-stats').innerHTML = [[stats.opens, '次掀盖'], [stats.opened + ' / 16', '个脑洞'], [stats.memories + ' / 48', '个念头']].map(([value, label]) => '<span><b>' + value + '</b>' + label + '</span>').join('');
    const festival = getFestival(scene.festivalId);
    $('#cap-book-feature').style.setProperty('--cap-accent', scene.color || '#a9ead6');
    $('#cap-book-feature').innerHTML = '<div class="cap-book-window ' + (opened ? '' : 'unopened') + '">' + (opened ? '<canvas id="cap-book-canvas" width="300" height="248" aria-label="' + escape(scene.title) + '：从掀开的头盖骨里升起的小剧场"></canvas>' : '<img src="./assets/portrait-hero-curious.svg" width="196" height="196" alt="等着掀盖的阿拾"><span>这一个脑洞，等你来打开</span>') + '</div><div class="cap-book-copy"><small>' + escape(titleFor(scene)) + '</small><h3>' + escape(scene.title) + '</h3><p>' + escape(scene.tagline) + '</p><div class="cap-book-lines">' + (opened ? scene.opening.map(line => '<p><b>' + (line.speaker === 'light' ? '拾光' : '阿拾') + '</b>' + escape(line.text) + '</p>').join('') : '<p>在这一幕按 <kbd>E</kbd> 掀开头盖骨，让拾光出来看看。</p>') + '</div><div class="cap-book-actions"><button class="dream-secondary" data-cap-close>回到游戏</button>' + (opened ? '<button class="dream-text-link" data-cap-letter="' + scene.id + '">读这一幕的来信 ↗</button>' : '') + '</div></div><div class="cap-thoughts"><div class="cap-thoughts-title"><b>带回脑袋的念头</b><span>' + record.memories.length + ' / 3</span></div>' + [0, 1, 2].map(index => {
      const found = record.memories.includes(index);
      const title = festival ? festival.gifts[index] : '记忆 ' + (index + 1);
      const prose = festival ? scene.memories[index].text : CHAPTERS[scene.chapterIndex].memories[index];
      return '<article class="cap-thought ' + (found ? 'found' : '') + '"><i>' + (found ? '✦' : '·') + '</i><div><small>' + escape(title) + '</small><p>' + (found ? escape(prose) : '还藏在这一幕里，等拾光把它带回来。') + '</p></div></article>';
    }).join('') + '</div>';
    $('#cap-book-feature').insertAdjacentHTML('beforeend', activityMarkup(scene, opened));
    const activityStats = getActivityStats?.();
    if (activityStats) $('.cap-book-section-title>span').textContent = '借景 ' + activityStats.completed + ' / 16 · 路线 ' + activityStats.variants + ' / 48';
    $('#cap-book-grid').innerHTML = CAP_SCENES.map(item => {
      const value = getCapRecord(save, item.id), discovered = value.opens > 0;
      const activityComplete = getActivityRecord?.(item.id)?.completedVariants?.includes(0);
      return '<button class="cap-book-card ' + (discovered ? 'discovered' : '') + (item.id === selected ? ' selected' : '') + '" data-cap-scene="' + item.id + '" aria-pressed="' + (item.id === selected) + '"><img src="' + pictureFor(item) + '" alt="" width="52" height="52" loading="lazy"><span><small>' + escape(titleFor(item)) + '</small><b>' + escape(item.title) + '</b><em>' + (discovered ? value.memories.length + '/3 念头 · ' + value.seals.length + '/2 谜灯' : '等你掀开') + (activityComplete ? ' · 借景 ✓' : '') + '</em></span></button>';
    }).join('');
    runAnimation();
  }
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-cap-close]')) { dialog.close(); return; }
    const card = event.target.closest('[data-cap-scene]');
    if (card) { selected = card.dataset.capScene; render(); dialog.scrollTop = 0; return; }
    const letter = event.target.closest('[data-cap-letter]');
    if (letter) onReadLetter?.(CAP_SCENES.find(scene => scene.id === letter.dataset.capLetter));
    const play = event.target.closest('[data-cap-play]');
    if (play) onPlayActivity?.(CAP_SCENES.find(scene => scene.id === play.dataset.capPlay));
  });
  dialog.addEventListener('close', () => { stopAnimation(); queueMicrotask(() => onClose?.()); });
  dialog.addEventListener('keydown', event => event.stopPropagation());
  const storage = event => { if (event.key === CAP_SAVE_KEY) { save = loadCapSave(); report(); if (dialog.open) render(); } };
  window.addEventListener('storage', storage);

  return {
    open(scene) { save = mergeCapSaves(save, loadCapSave()); const next = typeof scene === 'string' ? CAP_SCENES.find(item => item.id === scene) : getCapScene(scene || {}); if (next) selected = next.id; render(); onOpen?.('#cap-book-dialog'); if (!onOpen) dialog.showModal(); runAnimation(); },
    record(event) { save = mergeCapSaves(save, loadCapSave()); const outcome = recordCapEvent(save, event); if (outcome.changed) { commit(); report(); if (dialog.open) render(); } return outcome; },
    stats: () => getCapStats(save),
    getRecord: id => getCapRecord(save, id),
    setReducedMotion(value) { reducedMotion = Boolean(value); if (dialog.open) runAnimation(); },
    exportState: () => validateCapSave(save),
    importState(next) { if (!next) return; save = validateCapSave(next); commit(); report(); if (dialog.open) render(); },
    summary: report,
    refreshActivities() { report(); if (dialog.open) render(); },
    destroy() { stopAnimation(); window.removeEventListener('storage', storage); dialog.remove(); },
  };
}
