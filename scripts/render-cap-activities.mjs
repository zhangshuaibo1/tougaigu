// Optional local art inspection. Uses @napi-rs/canvas when installed; it is not
// required by the browser build or the game. No project assets are overwritten.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CAP_ACTIVITIES } from '../dist/dream-cap-activities.js';
import { DreamCapActivity } from '../dist/dream-cap-activity-engine.js';
import { drawCapActivity } from '../dist/dream-cap-activity-art.js';

const require = createRequire(import.meta.url);
const canvasPath = require.resolve('@napi-rs/canvas', { paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || ''] });
const { createCanvas } = require(canvasPath);
const folder = resolve(process.argv[2] || '/tmp/tougaigu-cap-activities-v6');
await mkdir(folder, { recursive: true });

function buildView(config, complete = false) {
  const game = new DreamCapActivity(config, { record: { completedSteps: complete ? [0, 1, 2] : [0] } });
  const context = { state: 'playing', form: complete ? 'body' : 'soul', body: { x: 330, y: 560, grounded: true }, soul: { x: 245, y: 355 } };
  game.refresh(context);
  for (let i = 0; i < 120; i++) game.update(1 / 60, context);
  const view = game.getView();
  // The inspection container may not include CJK fonts. These short English
  // substitutes affect this preview only; the game uses the authored labels.
  view.hint = 'Q / Space: turn route A';
  view.destinations.forEach((d, i) => { d.label = ['Place I', 'Place II', 'Place III'][i]; });
  return view;
}

function backdrop(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1d2133'); g.addColorStop(1, '#29454a');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#a4c7bc15'; c.lineWidth = 1;
  for (let y = 60; y < h; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
}

const tiles = [];
for (const config of CAP_ACTIVITIES) {
  const tile = createCanvas(400, 450), c = tile.getContext('2d');
  backdrop(c, 400, 450);
  c.save(); c.translate(-120, -175);
  drawCapActivity(c, buildView(config), 1.6, false);
  c.restore();
  c.fillStyle = '#f3dfb9'; c.font = '16px sans-serif'; c.textAlign = 'left';
  c.fillText(config.motif, 18, 24);
  await writeFile(resolve(folder, `${config.motif}-active.png`), await tile.encode('png'));
  tiles.push(tile);
}
const sheet = createCanvas(1600, 1800), s = sheet.getContext('2d');
for (let i = 0; i < tiles.length; i++) s.drawImage(tiles[i], i % 4 * 400, Math.floor(i / 4) * 450);
await writeFile(resolve(folder, 'activities-contact.png'), await sheet.encode('png'));

const growth = createCanvas(1600, 880), g = growth.getContext('2d');
backdrop(g, 1600, 880);
for (const [i, config] of CAP_ACTIVITIES.entries()) {
  const x = i % 4 * 400, y = Math.floor(i / 4) * 220;
  g.save(); g.translate(x + 200 - 330 * 1.7, y + 170 - 544 * 1.7); g.scale(1.7, 1.7);
  drawCapActivity(g, buildView(config, true), 0, true); g.restore();
  g.fillStyle = '#f3dfb9'; g.font = '16px sans-serif'; g.textAlign = 'left'; g.fillText(config.motif, x + 18, y + 27);
}
await writeFile(resolve(folder, 'growth-contact.png'), await growth.encode('png'));

function growthView(config,index,progress) {
  const view=buildView(config,true);
  view.phase=index===2?'complete':'suspended';view.active=false;view.completed=index===2;
  view.anchor.inRange=false;view.completedSteps=Array.from({length:index+1},(_,i)=>i);
  view.delivered=[0,1,2].map(i=>i<=index);
  view.destinations.forEach((d,i)=>{d.complete=i<=index;});
  view.growth={index,progress};
  return view;
}
function growthFrame(c,config,index,progress,x,y,label='') {
  c.save();c.beginPath();c.rect(x,y,320,220);c.clip();
  c.translate(x+160-330*1.55,y+162-544*1.55);c.scale(1.55,1.55);
  drawCapActivity(c,growthView(config,index,progress),0,false);c.restore();
  c.fillStyle='#f3dfb9';c.font='13px sans-serif';c.textAlign='left';
  c.fillText(`${label||config.motif}  ${Math.round(progress*480)} ms`,x+12,y+22);
}
const progressFrames=[0,.16,.42,.72,1];
for(let page=0;page<4;page++){
  const keyframes=createCanvas(1600,880),k=keyframes.getContext('2d');backdrop(k,1600,880);
  for(let row=0;row<4;row++){
    const config=CAP_ACTIVITIES[page*4+row];
    for(let col=0;col<5;col++)growthFrame(k,config,2,progressFrames[col],col*320,row*220);
  }
  await writeFile(resolve(folder,`growth-keyframes-${page+1}.png`),await keyframes.encode('png'));
}
const featured=CAP_ACTIVITIES.filter(config=>['station','sprout','pumpkin'].includes(config.motif));
const early=createCanvas(1600,1320),e=early.getContext('2d');backdrop(e,1600,1320);
for(const [i,config] of featured.entries())for(let index=0;index<2;index++)for(let col=0;col<5;col++){
  growthFrame(e,config,index,progressFrames[col],col*320,(i*2+index)*220,`${config.motif} / piece ${index+1}`);
}
await writeFile(resolve(folder,'growth-first-two-keyframes.png'),await early.encode('png'));

// Completing presentation and enabling reduced motion must exactly match the
// established settled art; no delivery state or view may be changed by paint.
function renderView(view,reduced=false) {
  const canvas=createCanvas(640,640);drawCapActivity(canvas.getContext('2d'),view,0,reduced);return canvas;
}
for(const config of CAP_ACTIVITIES){
  for(let index=0;index<3;index++){
    const view=growthView(config,index,1),before=JSON.stringify(view);
    const settled=renderView(view);view.growth=null;
    if(!Buffer.from(settled.data()).equals(Buffer.from(renderView(view).data())))throw new Error(`${config.motif}/${index}: settled art changed`);
    view.growth={index,progress:0};
    if(!Buffer.from(settled.data()).equals(Buffer.from(renderView(view,true).data())))throw new Error(`${config.motif}/${index}: reduced growth did not settle immediately`);
    view.growth.progress=1;
    if(JSON.stringify(view)!==before)throw new Error(`${config.motif}/${index}: rendering changed the view`);
  }
}

// The renderer must freeze decoration without freezing controller-supplied
// traveler positions. Compare equal positions at different decorative times.
const reducedView = buildView(CAP_ACTIVITIES[0]);
const a = createCanvas(640, 640), b = createCanvas(640, 640);
drawCapActivity(a.getContext('2d'), reducedView, 1, true);
drawCapActivity(b.getContext('2d'), reducedView, 99, true);
if (!Buffer.from(a.data()).equals(Buffer.from(b.data()))) throw new Error('Reduced-motion presentation drifted with decorative time');
const before = Buffer.from(a.data());
reducedView.traveler.x += 20;
const moved = createCanvas(640, 640); drawCapActivity(moved.getContext('2d'), reducedView, 99, true);
if (before.equals(Buffer.from(moved.data()))) throw new Error('Reduced motion hid necessary traveler movement');
console.log(`Rendered ${CAP_ACTIVITIES.length} activity scenes and completed vignettes to ${folder}`);
console.log('Reduced-motion decoration is stable; traveler positions remain visible.');
console.log('Inspected all 16 final-delivery keyframe sequences; 48 settled/reduced growth comparisons passed.');
