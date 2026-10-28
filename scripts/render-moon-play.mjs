// Optional offline Canvas inspection. This solves the real moon controller,
// then paints its copied views; it does not replace browser interaction QA.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { MOON_PLAY_CONFIG, DreamMoonPlay, solveMoonSource } from '../dist/dream-moon-play.js';
import { drawMoonPlay } from '../dist/dream-moon-art.js';

const require=createRequire(import.meta.url);
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const folder=resolve(process.argv[2]||'/tmp/tougaigu-moon-art-v13');
await mkdir(folder,{recursive:true});
const body={...MOON_PLAY_CONFIG.anchor,grounded:true};
const ctx=(soul,form='soul',state='playing',reducedMotion=false)=>({body,soul,form,state,reducedMotion});
const tick=(moon,seconds,context)=>{for(let i=0;i<Math.ceil(seconds*60);i++)moon.update(1/60,context);};
const pixels=canvas=>Buffer.from(canvas.data());
function paint(view,{width=480,height=430,t=1,reduced=false,background=true}={}){
  const canvas=createCanvas(width,height),c=canvas.getContext('2d');
  if(background){const g=c.createLinearGradient(0,0,0,height);g.addColorStop(0,'#21182e');g.addColorStop(1,'#483145');c.fillStyle=g;c.fillRect(0,0,width,height);}
  c.translate(width/2-1460,32-170);
  const before=JSON.stringify(view),matrix=c.getTransform(),alpha=c.globalAlpha,dash=c.getLineDash();
  drawMoonPlay(c,view,t,reduced);
  assert.equal(JSON.stringify(view),before,'rendering cannot mutate a controller view');
  assert.equal(c.globalAlpha,alpha,'rendering restores alpha');
  assert.deepEqual(c.getLineDash(),dash,'rendering restores dash');
  assert.deepEqual(c.getTransform(),matrix,'rendering restores world transform');
  return canvas;
}
function title(c,label,x,y){c.fillStyle='#f3e4c7';c.font='12px sans-serif';c.textAlign='left';c.fillText(label,x+12,y+20);}
// This executor has no CJK font. English receiver captions are used only in
// inspection images; authored in-game Chinese labels are not changed.
function labeled(view){view.targets.forEach(target=>{target.label=target.kind;});return view;}

const sheet=createCanvas(1440,1290),sc=sheet.getContext('2d');
const details=createCanvas(1080,205),dc=details.getContext('2d');
dc.fillStyle='#34283b';dc.fillRect(0,0,1080,205);
const moon=new DreamMoonPlay();let checks=0;
for(let variant=0;variant<3;variant++){
  assert.equal(moon.variant,variant);
  const config=MOON_PLAY_CONFIG.variants[variant];
  moon.refresh(ctx({x:1460,y:470},'body'));
  const unlit=labeled(moon.getView()),idle=paint(unlit);
  sc.drawImage(idle,0,variant*430);title(sc,`${config.id} / approach`,0,variant*430);
  const first=solveMoonSource(config.targets[0],MOON_PLAY_CONFIG.angles[0]);
  tick(moon,.22,ctx(first));
  const charging=labeled(moon.getView());assert.ok(charging.targets[0].charge>0&&charging.targets[0].charge<1);
  const active=paint(charging);sc.drawImage(active,480,variant*430);title(sc,`${config.id} / reflected light`,480,variant*430);
  assert.notDeepEqual(pixels(idle),pixels(active),'a real reflected beam and held target visibly change the scene');checks++;
  for(const target of config.targets){const source=solveMoonSource(target,MOON_PLAY_CONFIG.angles[0]);tick(moon,1.6,ctx(source));}
  assert.ok(moon.complete,'every layout is reached through reflected player positions');
  const settled=labeled(moon.getView());assert.equal(settled.targets.every(target=>target.unfoldProgress===1),true);
  const finished=paint(settled);sc.drawImage(finished,960,variant*430);title(sc,`${config.id} / all three illuminated`,960,variant*430);
  assert.deepEqual(pixels(paint(settled)),pixels(paint(settled)),'identical input draws identical pixels');checks++;
  assert.deepEqual(pixels(paint({...settled,clock:1},{reduced:true})),pixels(paint({...settled,clock:999},{reduced:true})),'reduced motion has no moving light or sparkle');checks++;
  for(let i=0;i<3;i++){
    const target=settled.targets[i],index=variant*3+i;
    const tile=createCanvas(120,180),tc=tile.getContext('2d');
    tc.fillStyle='#34283b';tc.fillRect(0,0,120,180);tc.translate(60-target.x*1.5,65-target.y*1.5);tc.scale(1.5,1.5);
    drawMoonPlay(tc,{...settled,targets:[target],beam:[],active:false,complete:false},0,true);
    dc.drawImage(tile,index*120,0);title(dc,target.kind,index*120,160);
    const middle={...settled,targets:settled.targets.map((item,j)=>({...item,unfoldProgress:j===i?.4:item.unfoldProgress}))};
    assert.notDeepEqual(pixels(paint(middle)),pixels(finished),target.kind+' has an unfolding pose distinct from the finished prop');checks++;
  }
  const pausedContext=ctx(first,'soul','paused');moon.refresh(pausedContext);
  const paused=JSON.stringify(moon.getView());tick(moon,3,pausedContext);
  assert.equal(JSON.stringify(moon.getView()),paused,'paused inspection cannot advance target unfolds');checks++;
  assert.deepEqual(pixels(paint(moon.getView(),{t:0})),pixels(paint(moon.getView(),{t:90})),'a parent render clock cannot move paused moonlight');checks++;
  moon.refresh(ctx(first,'body'));
  if(variant<2)assert.equal(moon.interact(ctx(first,'body')),true);
}
await writeFile(resolve(folder,'moon-play-states.png'),await sheet.encode('png'));
await writeFile(resolve(folder,'moon-play-nine-props.png'),await details.encode('png'));
console.log(JSON.stringify({folder,checks,layouts:3,props:9,states:9,browserQA:false}));
