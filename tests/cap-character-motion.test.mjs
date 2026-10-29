import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { CAP_HINGE, CAP_GRIP } from '../dist/dream-cap-art.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=noop;
const near=(a,b,message='points differ')=>assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-7,message);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const transform=(m,x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});

function makeContext(){
  let matrix=[1,0,0,1,0,0],pathEllipse=null;const stack=[],fills=[],ellipses=[],rects=[],layers=[];
  const numeric=args=>{for(const n of args)assert.ok(Number.isFinite(n),'a Canvas coordinate was not finite');};
  const ctx={globalAlpha:1,fillStyle:'#000',strokeStyle:'#000',fills,ellipses,rects,layers,
    save(){stack.push({matrix:[...matrix],fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,globalAlpha:this.globalAlpha});},
    restore(){const state=stack.pop();assert.ok(state,'unbalanced restore');matrix=state.matrix;this.fillStyle=state.fillStyle;this.strokeStyle=state.strokeStyle;this.globalAlpha=state.globalAlpha;},
    transform(a,b,c,d,e,f){numeric([a,b,c,d,e,f]);const [aa,bb,cc,dd,ee,ff]=matrix;matrix=[aa*a+cc*b,bb*a+dd*b,aa*c+cc*d,bb*c+dd*d,aa*e+cc*f+ee,bb*e+dd*f+ff];},
    setTransform(...values){numeric(values);matrix=[...values];},
    translate(x,y){this.transform(1,0,0,1,x,y);},scale(x,y){this.transform(x,0,0,y,0,0);},rotate(a){this.transform(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0);},
    beginPath(){pathEllipse=null;},
    ellipse(...args){numeric(args.slice(0,7));assert.ok(args[2]>=0&&args[3]>=0);pathEllipse={x:args[0],y:args[1],rx:args[2],ry:args[3]};},
    arc(...args){numeric(args.slice(0,5));},
    createLinearGradient(...args){numeric(args);return {kind:'linear',args,stops:[],addColorStop(offset,color){this.stops.push([offset,color]);}};},
    createRadialGradient(...args){numeric(args);return {kind:'radial',args,stops:[],addColorStop(offset,color){this.stops.push([offset,color]);}};},
    measureText(text){return {width:String(text).length*10};},
    fill(){fills.push({style:this.fillStyle,matrix:[...matrix],alpha:this.globalAlpha});if(pathEllipse)ellipses.push({...pathEllipse,point:transform(matrix,pathEllipse.x,pathEllipse.y),style:this.fillStyle,alpha:this.globalAlpha});},
    stroke(){if(this.strokeStyle==='#f4e5bc')layers.push('rim');},
    fillRect(x,y,w,h){numeric([x,y,w,h]);rects.push({style:this.fillStyle,first:transform(matrix,x,y),last:transform(matrix,x+w,y+h)});},
    clearRect(...args){numeric(args);},
    resetLog(){fills.length=0;ellipses.length=0;rects.length=0;layers.length=0;},
  };
  const numbers=new Set(['moveTo','lineTo','bezierCurveTo','quadraticCurveTo','arcTo','roundRect']);
  return new Proxy(ctx,{get:(target,key)=>key in target?target[key]:numbers.has(key)?(...args)=>numeric(args):noop});
}
function makeGame({width=1100,height=620,...options}={}){
  const ctx=makeContext(),game=new DreamGame({getContext:()=>ctx,getBoundingClientRect:()=>({width,height})});
  game.start({sound:false,...options});return {game,ctx};
}
const tick=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60);};
function manualGrip(body,presentation,open){
  const angle=-1.16*open,dx=CAP_GRIP.x-CAP_HINGE.x,dy=CAP_GRIP.y-CAP_HINGE.y;
  const x=CAP_HINGE.x+dx*Math.cos(angle)-dy*Math.sin(angle),y=CAP_HINGE.y+dx*Math.sin(angle)+dy*Math.cos(angle);
  const hx=x*Math.cos(presentation.tilt)-y*Math.sin(presentation.tilt),hy=-49+x*Math.sin(presentation.tilt)+y*Math.cos(presentation.tilt);
  return {x:body.x+body.face*hx,y:body.y+(1-body.land)*(hy-presentation.hop)};
}

test('rendered support fingers meet the actual hinged cap for both facings, head tilts and landing compression',()=>{
  const {game,ctx}=makeGame();game.form='soul';game.cap.phase='open';game.cap.handGrip=1;game.cap.handClasp=1;
  for(const face of [-1,1])for(const open of [0,.1,.4,.75,1])for(const land of [-.15,0,.22])for(const velocity of [-240,0,240]){
    Object.assign(game.body,{x:340,y:500,face,land,vx:velocity,vy:velocity===0?850:-600,grounded:false,walk:1.2,invulnerable:0});game.capOpen=open;
    const pose=game.getCharacterPresentation(.7),expected=manualGrip(game.body,pose,open);
    near(pose.arms.left.world,expected,'support wrist detached from cap grip');
    for(const arm of Object.values(pose.arms)){assert.ok(Math.abs(distance(arm.shoulder,arm.elbow)-20)<1e-7);assert.ok(Math.abs(distance(arm.elbow,arm.wrist)-20)<1e-7);}
    ctx.resetLog();game.drawCharacter(ctx,game.body,.7,null,pose);
    const hand=ctx.ellipses.find(item=>item.style==='#f2e5c6');assert.ok(hand);near(hand.point,expected,'rendered hand used a different transform');
    const cap=ctx.fills.find(item=>item.style?.kind==='linear'&&item.style.args.join(',')==='0,-36,0,-12');assert.ok(cap);near(transform(cap.matrix,CAP_GRIP.x,CAP_GRIP.y),hand.point,'painted lid and hand matrices disagree');
  }
  game.destroy();
});

test('rapid E reversals preserve both hand poses at the input boundary and retain contact while the cap moves',()=>{
  const {game}=makeGame();game.body.invulnerable=0;
  for(let i=0;i<48;i++){
    const before=game.getCharacterPresentation();assert.equal(game.toggleSoul(),true);const after=game.getCharacterPresentation();
    near(before.arms.left.world,after.arms.left.world,'E made the supporting hand jump');near(before.arms.right.world,after.arms.right.world,'E made the clasp hand jump');
    const frames=[0,2,5,9,20,33,7,1][i%8];
    for(let frame=0;frame<frames;frame++){
      game.update(1/60);const pose=game.getCharacterPresentation();
      if(game.capOpen>.001)near(pose.arms.left.world,manualGrip(game.body,pose,game.capOpen),'moving cap lost the supporting hand');
      for(const arm of Object.values(pose.arms)){assert.ok(Number.isFinite(arm.elbow.x)&&Number.isFinite(arm.elbow.y));assert.ok(Math.abs(distance(arm.shoulder,arm.elbow)-20)<1e-7);assert.ok(Math.abs(distance(arm.elbow,arm.wrist)-20)<1e-7);}
    }
  }
  game.destroy();
});

test('peek and return are masked by the front skull and rim, while free flight uses the normal front layer',()=>{
  const {game,ctx}=makeGame(),layers=ctx.layers;let count=0,lastSoul=null;
  const originalGet=game.getSoulPresentation.bind(game);game.getSoulPresentation=(...args)=>{count++;return lastSoul=originalGet(...args);};
  for(const method of ['drawSkullFront','drawCapLid','drawCharacterHands']){const original=game[method].bind(game);game[method]=(...args)=>{layers.push(method);if(method==='drawSkullFront')assert.equal(args[3],lastSoul);return original(...args);};}
  const originalSoul=game.drawSoul.bind(game);game.drawSoul=(c,s,t)=>{assert.equal(s,lastSoul);layers.push('soul-'+s.layer);return originalSoul(c,s,t);};
  function renderAndCheck(inside){ctx.resetLog();count=0;game.render();assert.equal(count,1,'one render must calculate its soul presentation once');const soul=layers.indexOf('soul-'+(inside?'inside':'world')),front=layers.indexOf('drawSkullFront'),rim=layers.indexOf('rim'),lid=layers.indexOf('drawCapLid'),hands=layers.indexOf('drawCharacterHands');assert.ok(soul>=0);if(inside){assert.ok(soul<front&&front<rim&&rim<lid&&lid<hands);}else assert.ok(front<rim&&rim<lid&&lid<hands&&hands<soul);assert.equal(layers.filter(item=>item.startsWith('soul-')).length,1);}
  game.toggleSoul();tick(game,.3);game.body.invulnerable=1;game.visualTime=.34;renderAndCheck(true);
  const skull=ctx.fills.find(item=>item.style?.kind==='linear'&&item.style.args.join(',')==='-22,-13,23,23');assert.equal(skull.alpha,1,'invulnerability blinking must not reveal a soul through the face');
  tick(game,.5);renderAndCheck(false);game.recall();tick(game,.2);renderAndCheck(true);game.destroy();
});

test('pause freezes hand transitions and reduced motion immediately settles a valid grip without breaking controls',()=>{
  const {game}=makeGame();game.toggleSoul();tick(game,.15);game.pause();const pose=game.getCharacterPresentation(),hands={grip:game.cap.handGrip,clasp:game.cap.handClasp,catching:game.cap.handCatch};
  tick(game,2);assert.deepEqual(game.getCharacterPresentation(),pose);assert.deepEqual({grip:game.cap.handGrip,clasp:game.cap.handClasp,catching:game.cap.handCatch},hands);
  game.setReducedMotion(true);assert.equal(game.capActivityContext().reducedMotion,true);const still=game.getCharacterPresentation();near(still.arms.left.world,still.rig.gripWorld);assert.equal(game.cap.phase,'open');
  game.resume();game.setInput({x:-1,y:-1});const before={x:game.soul.x,y:game.soul.y};tick(game,.2);assert.ok(game.soul.x<before.x&&game.soul.y<before.y);game.recall();assert.equal(game.form,'body');assert.equal(game.getSoulPresentation(),null);game.destroy();
});

test('320px and 390px activity framing includes all destination labels and paints the entire canvas',()=>{
  for(const width of [320,390]){
    const {game,ctx}=makeGame({width,height:620});game.body.x=330;game.update(1/60);game.toggleSoul();ctx.resetLog();game.render();
    assert.equal(game.activityFramed,true);assert.ok(game.viewWidth>=400);assert.ok(game.scale<=game.baseScale);assert.equal(game.viewportOffsetY,(620-640*game.scale)/2);
    for(const destination of game.capActivity.getView().destinations){const half=Math.max(42,Math.min(90,String(destination.label).slice(0,8).length*10+12))/2;const left=(destination.x-half-game.camera)*game.scale,right=(destination.x+half-game.camera)*game.scale;assert.ok(left>=0&&right<=width,'a destination label was outside the screen');}
    for(const x of [120,520])assert.ok((x-game.camera)*game.scale>=-.0001&&(x-game.camera)*game.scale<=width+.0001,'the framing safety margin was cropped');
    const sky=ctx.rects.find(item=>item.style?.stops?.length>=2&&Math.abs(item.first.x)<1e-7&&Math.abs(item.first.y)<1e-7&&Math.abs(item.last.x-width)<1e-7&&Math.abs(item.last.y-620)<1e-7);assert.ok(sky);near(sky.first,{x:0,y:0});near(sky.last,{x:width,y:620});
    const camera=game.camera;game.setInput({x:1,y:-1});tick(game,.7);assert.equal(game.camera,camera,'moving the soul must not crop the other activity targets');game.destroy();
  }
});

test('activity framing survives pause and completion but restores ordinary framing on recall or leaving the ring',()=>{
  const {game}=makeGame({width:320,height:620});game.body.x=330;game.update(1/60);game.toggleSoul();game.render();
  const framed={scale:game.scale,camera:game.camera,width:game.viewWidth,offset:game.viewportOffsetY};game.pause();tick(game,2);game.render();assert.deepEqual({scale:game.scale,camera:game.camera,width:game.viewWidth,offset:game.viewportOffsetY},framed);
  game.resume();game.capActivity.phase='complete';game.render();assert.equal(game.activityFramed,true);game.recall();game.render();assert.equal(game.activityFramed,false);assert.equal(game.scale,game.baseScale);assert.equal(game.viewportOffsetY,0);assert.equal(game.viewWidth,320/game.baseScale);
  game.toggleSoul();game.render();assert.equal(game.activityFramed,true);game.body.x=500;game.render();assert.equal(game.activityFramed,false);assert.equal(game.scale,game.baseScale);assert.equal(game.viewportOffsetY,0);game.destroy();
});

test('activity fitting never enlarges desktop graphics or changes direction-input physics',()=>{
  const small=makeGame({width:320,height:620}).game,large=makeGame({width:1100,height:620}).game;
  for(const game of [small,large]){game.body.x=330;game.update(1/60);game.toggleSoul();game.setInput({x:-.6,y:-.8});tick(game,.7);game.render();}
  assert.deepEqual(small.body,large.body);assert.deepEqual(small.soul,large.soul);assert.equal(small.energy,large.energy);assert.equal(large.scale,large.baseScale);assert.equal(large.viewportOffsetY,0);small.destroy();large.destroy();
});
