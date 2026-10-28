// UI-only descriptions of the face being observed. This module never receives
// the other face, an answer, or a claimant's ownership result.
const corners = ['左上', '右上', '左下', '右下'];
const names = Object.freeze({ moon: '月', bell: '铃', star: '星', wave: '浪', pinecone: '松果', envelope: '信封' });
const rhythmSymbols = new Set(['moon', 'bell', 'star', 'wave']);
const badges = new Set(['pinecone', 'envelope', 'moon']);
const validCells = values => Array.isArray(values) && values.length <= 4 && new Set(values).size === values.length && Array.from(values).every(value => Number.isInteger(value) && value >= 0 && value < 4);

export function lostDiagramModel(diagram) {
  if (!diagram || typeof diagram !== 'object') return null;
  if (diagram.type === 'light-stencil' || diagram.type === 'lamp-badge') {
    const stencil = diagram.type === 'light-stencil';
    if (stencil && (diagram.rows !== 2 || diagram.columns !== 2 || diagram.orientation !== 'up')) return null;
    const marked = stencil ? diagram.holes : diagram.cells;
    if (!validCells(marked)) return null;
    const cells = corners.map((corner, index) => ({ corner, active: marked.includes(index) }));
    return { kind: 'grid', stencil, cells, label: (stencil ? '箭头朝上；开孔：' : '灯牌亮格：') + cells.filter(cell => cell.active).map(cell => cell.corner).join('、') };
  }
  if (diagram.type === 'score-fragment' || diagram.type === 'rhythm-signature') {
    const symbols = Array(4).fill(null);
    if (diagram.type === 'rhythm-signature') {
      if (!Array.isArray(diagram.symbols) || diagram.symbols.length !== 4 || Array.from(diagram.symbols).some(symbol => !rhythmSymbols.has(symbol))) return null;
      symbols.splice(0, 4, ...diagram.symbols);
    } else {
      if (diagram.beats !== 4 || !Array.isArray(diagram.slots) || diagram.slots.length > 4) return null;
      for (const slot of diagram.slots) {
        if (!slot || !Number.isInteger(slot.beat) || slot.beat < 0 || slot.beat > 3 || !rhythmSymbols.has(slot.symbol) || symbols[slot.beat] !== null) return null;
        symbols[slot.beat] = slot.symbol;
      }
    }
    const beats = symbols.map((symbol, index) => ({ beat: index + 1, symbol, name: symbol ? names[symbol] : '未记' }));
    return { kind: 'beats', beats, label: beats.map(beat => '第' + beat.beat + '拍' + beat.name).join('，') };
  }
  if (diagram.type === 'seat-relation') {
    const { left, right } = diagram.relation || {};
    if (diagram.seatCount !== 3 || !badges.has(left) || !badges.has(right) || left === right || (diagram.targetSeat !== undefined && diagram.targetSeat !== 1) || (diagram.direction !== undefined && diagram.direction !== 'screen-left-to-right')) return null;
    return { kind: 'seats', left, right, targetSeat: diagram.targetSeat ?? null, label: names[left] + '在' + names[right] + '左边' + (diagram.targetSeat === 1 ? '；座签属于中间一席' : '') };
  }
  if (diagram.type === 'name-badge' && badges.has(diagram.symbol)) return { kind: 'badge', symbol: diagram.symbol, label: '名牌：' + names[diagram.symbol] };
  return null;
}

const iconPaths = Object.freeze({
  moon: 'M18 3A9 9 0 1 0 21 17 8 8 0 0 1 18 3Z',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 3h4M12 2v2',
  star: 'm12 2 2.8 6.1 6.7.8-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6L2.5 8.9l6.7-.8L12 2Z',
  wave: 'M2 7c3-5 6 5 10 0s7 5 10 0M2 13c3-5 6 5 10 0s7 5 10 0M2 19c3-5 6 5 10 0s7 5 10 0',
  pinecone: 'M12 2C4 7 4 16 12 22c8-6 8-15 0-20ZM7 8l5 4 5-4M6 13l6 4 6-4M12 3v18',
  envelope: 'M3 5h18v14H3V5Zm0 0 9 8 9-8M3 19l6-7m12 7-6-7',
});

function symbolIcon(doc, symbol) {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', iconPaths[symbol]);
  svg.append(path);
  return svg;
}

export function createLostDiagram(diagram, doc = document) {
  const model = lostDiagramModel(diagram);
  if (!model) return null;
  const root = doc.createElement('div');
  root.className = 'lost-diagram lost-diagram-' + model.kind;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', model.label);
  if (model.kind === 'grid') {
    if (model.stencil) {
      const arrow = doc.createElement('span');
      arrow.className = 'lost-grid-orientation';
      arrow.textContent = '↑';
      arrow.setAttribute('aria-label', '箭头朝上');
      root.append(arrow);
    }
    const grid = doc.createElement('div');
    grid.className = 'lost-evidence-grid';
    for (const cell of model.cells) {
      const part = doc.createElement('span');
      part.className = cell.active ? 'active' : '';
      const dot = doc.createElement('i');
      dot.setAttribute('aria-hidden', 'true');
      const label = doc.createElement('small');
      label.textContent = cell.corner;
      part.setAttribute('aria-label', cell.corner + '：' + (cell.active ? model.stencil ? '开孔' : '亮' : model.stencil ? '挡光' : '暗'));
      part.append(dot, label);
      grid.append(part);
    }
    root.append(grid);
  } else if (model.kind === 'beats') {
    for (const beat of model.beats) {
      const part = doc.createElement('span');
      part.className = beat.symbol ? 'known' : 'unknown';
      const number = doc.createElement('small');
      number.textContent = String(beat.beat);
      const label = doc.createElement('b');
      label.textContent = beat.symbol ? beat.name : '—';
      part.append(number);
      if (beat.symbol) part.append(symbolIcon(doc, beat.symbol));
      part.append(label);
      part.setAttribute('aria-label', '第' + beat.beat + '拍：' + beat.name);
      root.append(part);
    }
  } else if (model.kind === 'seats') {
    if (model.targetSeat !== null) {
      const seats = doc.createElement('div');
      seats.className = 'lost-seat-target';
      seats.setAttribute('aria-hidden', 'true');
      for (let index = 0; index < 3; index++) {
        const seat = doc.createElement('i');
        if (index === model.targetSeat) seat.className = 'target';
        seats.append(seat);
      }
      root.append(seats);
    }
    const relation = doc.createElement('div');
    relation.className = 'lost-seat-relation';
    for (const [index, symbol] of [model.left, model.right].entries()) {
      if (index) {
        const arrow = doc.createElement('span');
        arrow.className = 'lost-relation-arrow';
        arrow.textContent = '在左边 →';
        relation.append(arrow);
      }
      const badge = doc.createElement('span');
      badge.className = 'lost-name-badge';
      const label = doc.createElement('b');
      label.textContent = symbol === 'moon' ? '月亮' : names[symbol];
      badge.append(symbolIcon(doc, symbol), label);
      relation.append(badge);
    }
    root.append(relation);
  } else {
    root.append(symbolIcon(doc, model.symbol));
    const label = doc.createElement('b');
    label.textContent = model.symbol === 'moon' ? '月亮' : names[model.symbol];
    root.append(label);
  }
  return root;
}
