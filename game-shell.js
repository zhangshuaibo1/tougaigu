/* Shared, game-first navigation. Each game owns its own pause state and data. */
const ICONS = {
  gift: '<path d="M3 9h18v5H3Zm2 5v8h14v-8M12 9v13M12 8C1 10 5-1 12 8Zm0 0C23 10 19-1 12 8Z"/>',
  cap: '<path d="M5 13c-1.8 7 2 9 4 9v3h9v-3c4-1 6-4 4-10Z" fill="currentColor"/><path d="M4 7c-1-7 17-10 19-3L4 7Z" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="#171b2b"/><circle cx="17" cy="17" r="2" fill="#171b2b"/><path d="m13.5 20-1.5 2h3Z" fill="#171b2b"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16m6-14v16"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0c0 1.8-2.5 2-2.5 4M12 16h.01"/>',
  settings: '<path d="m9 3 .5 3-2 1.2L5 6 3 9l2.4 2v2L3 15l2 3 2.5-1.2 2 1.2.5 3h4l.5-3 2-1.2L19 18l2-3-2.4-2v-2L21 9l-2-3-2.5 1.2-2-1.2L14 3Z"/><circle cx="12" cy="12" r="3"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  moon: '<path d="M20 15A8.5 8.5 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
};
const icon = name => `<svg viewBox="0 0 ${name==='cap'?'28 28':'24 24'}" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

export function mountGameShell({ gameId, onAction = () => {}, onOverlayChange = () => {} }) {
  const dream = gameId !== 'survivor';
  const header = document.createElement('header');
  header.className = 'game-shell';
  header.setAttribute('aria-label', '游戏菜单');
  header.innerHTML = `
    <button class="shell-game-button" type="button" aria-haspopup="dialog" aria-controls="shell-switch-dialog" aria-expanded="false" title="切换游戏">
      <span class="shell-brand-mark">${icon('cap')}</span>
      <span class="shell-game-name">${dream?'掀起你的头盖骨':'头盖骨 · 再活一局'}</span>${icon('chevron')}
    </button>
    <span class="shell-divider" aria-hidden="true"></span>
    <button class="shell-profile" type="button" data-shell-action="profile" aria-label="角色档案与游戏数据">
      <span class="shell-avatar">${dream?'<img src="./assets/portrait-hero.svg" alt="" width="32" height="32">':icon('cap')}</span>
      <span class="shell-identity"><b class="shell-role">${dream?'阿拾':'小骨'}</b><small class="shell-progress">${dream?'记忆 0 / 18':'骨片 0'}</small></span>
      <span class="shell-profile-label">档案</span>
    </button>
    <nav class="shell-actions" aria-label="游戏工具">
      <button type="button" class="shell-labeled-action shell-event-action" data-shell-action="events" title="节日故事、时光礼物与衣橱">${icon('gift')}<span>礼物</span><i hidden aria-hidden="true"></i></button>
      <button type="button" class="shell-labeled-action" data-shell-action="map" title="${dream?'章节地图':'角色、模式与工坊'}">${icon('map')}<span>${dream?'章节':'备战'}</span></button>
      <button type="button" class="shell-labeled-action" data-shell-action="help" title="操作帮助">${icon('help')}<span>帮助</span></button>
      <button type="button" class="shell-icon-action" data-shell-action="settings" aria-label="设置与存档" title="设置与存档">${icon('settings')}</button>
      <button type="button" class="shell-icon-action shell-pause" data-shell-action="pause" aria-label="暂停游戏" title="暂停游戏 · Esc">${icon('pause')}</button>
    </nav>`;

  const picker = document.createElement('dialog');
  picker.id = 'shell-switch-dialog';
  picker.className = 'shell-switch-dialog';
  picker.setAttribute('aria-labelledby', 'shell-switch-title');
  picker.innerHTML = `
    <div class="shell-picker-heading"><h2 id="shell-switch-title">切换游戏</h2><button type="button" class="shell-close" aria-label="关闭游戏切换">${icon('close')}</button></div>
    <div class="shell-game-list">
      <a href="./index.html" class="shell-game-card shell-dream-card ${dream?'is-current':''}" ${dream?'aria-current="page"':''}>
        <span class="shell-card-art"><img src="./assets/portrait-hero.svg" alt="" width="74" height="74"></span>
        <span class="shell-card-copy"><strong>掀起你的头盖骨</strong><small>掀盖飞行 · 机关解谜</small></span><span class="shell-card-status">${dream?'当前':icon('arrow')}</span>
      </a>
      <a href="./survivor.html" class="shell-game-card shell-survivor-card ${dream?'':'is-current'}" ${dream?'':'aria-current="page"'}>
        <span class="shell-card-art">${icon('moon')}${icon('cap')}</span>
        <span class="shell-card-copy"><strong>头盖骨 · 再活一局</strong><small>怪潮生存 · 异能成长</small></span><span class="shell-card-status">${dream?icon('arrow'):'当前'}</span>
      </a>
    </div><p class="shell-switch-note">切换后从关卡起点或新一局开始，已结算进度保留。</p>`;
  document.body.prepend(header);
  document.body.append(picker);
  const trigger = header.querySelector('.shell-game-button');
  let active = false;
  let destroyed = false;

  const close = () => { if (picker.open) picker.close(); };
  trigger.addEventListener('click', () => {
    if (picker.open) return close();
    // A puzzle, result, or another native modal already owns keyboard focus.
    if (document.querySelector('dialog[open]')) return;
    active = true;
    onOverlayChange(true);
    trigger.setAttribute('aria-expanded', 'true');
    picker.showModal();
  });
  picker.querySelector('.shell-close').addEventListener('click', close);
  picker.addEventListener('click', event => {
    if (event.target === picker) {
      const r = picker.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
    }
    if (event.target.closest('[aria-current="page"]')) { event.preventDefault(); close(); }
  });
  // Keep Escape local; game key handlers must not open a second pause dialog.
  picker.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  });
  picker.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    if (active && !destroyed) { active = false; onOverlayChange(false); }
  });
  header.addEventListener('click', event => {
    const button = event.target.closest('[data-shell-action]');
    if (button) onAction(button.dataset.shellAction);
  });
  return {
    update({ role, progress, portrait, rewards } = {}) {
      if (role !== undefined) {
        header.querySelector('.shell-role').textContent = role;
        if (dream) {
          const avatar = header.querySelector('.shell-avatar img');
          const source = portrait || (role === '拾光' ? './assets/portrait-soul.svg' : './assets/portrait-hero.svg');
          if (avatar.getAttribute('src') !== source) avatar.src = source;
        }
      }
      if (progress !== undefined) header.querySelector('.shell-progress').textContent = progress;
      if (rewards !== undefined) {
        const dot = header.querySelector('.shell-event-action i');
        dot.hidden = rewards < 1; dot.textContent = Math.min(99,rewards);
        header.querySelector('.shell-event-action').setAttribute('aria-label', rewards ? '节日与礼物，'+rewards+'份可领取' : '节日故事、时光礼物与衣橱');
      }
      const roleText = header.querySelector('.shell-role').textContent;
      const progressText = header.querySelector('.shell-progress').textContent;
      header.querySelector('.shell-profile').setAttribute('aria-label', `${roleText} · ${progressText} · 打开角色档案与游戏数据`);
    },
    close,
    destroy() { destroyed = true; close(); header.remove(); picker.remove(); },
  };
}
