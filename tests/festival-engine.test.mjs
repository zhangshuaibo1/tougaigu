import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { FESTIVAL_LEVELS, getFestivalLevel } from '../dist/dream-festival-levels.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const numericMethods=new Set(['moveTo','lineTo','bezierCurveTo','quadraticCurveTo','translate','scale','rotate','fillRect','strokeRect','clearRect','setTransform']);
const numeric=(name,args)=>{for(const value of args)assert.ok(typeof value==='number'&&Number.isFinite(value),`${name} received non-finite drawing coordinate ${String(value)}`);};
const context=new Proxy({
  createLinearGradient:(...args)=>{numeric('gradient',args);return {addColorStop:noop};},
  createRadialGradient:(...args)=>{numeric('gradient',args);return {addColorStop:noop};},
  measureText:text=>({width:String(text).length*10}),
  ellipse:(...args)=>{numeric('ellipse',args.slice(0,7));assert.ok(args[2]>=0&&args[3]>=0);},
  arc:(...args)=>numeric('arc',args.slice(0,5)),
  roundRect:(...args)=>numeric('roundRect',args),
},{get:(target,key)=>key in target?target[key]:numericMethods.has(key)?(...args)=>numeric(key,args):noop});
const configs=FESTIVAL_LEVELS.map(level=>({id:level.festivalId,title:level.title,npc:{id:level.festivalId+'-host',name:'节日朋友'}}));
function makeGame(id='halloween',callbacks={}){
  const game=new DreamGame({getContext:()=>context,getBoundingClientRect:()=>({width:1100,height:620})},callbacks);
  game.start({festival:configs.find(config=>config.id===id),sound:false});return game;
}
const tick=(game,seconds=1)=>{for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60);};
function walkTo(game,target,limit=60){
  let lastJump=-2;
  for(let i=0;i<limit*60&&game.state==='playing';i++){
    const delta=target-game.body.x;
    if(Math.abs(delta)<10&&game.body.grounded){game.setInput({x:0,y:0});tick(game,.15);return true;}
    const mushroomNear=game.pads.some(pad=>game.body.x>pad.x-110&&game.body.x<pad.x+pad.w+45);
    if(!mushroomNear&&Math.abs(delta)>=130&&game.body.grounded&&game.time-lastJump>.38){game.jump();lastJump=game.time;}
    game.setInput({x:Math.abs(delta)<8?0:Math.sign(delta),y:0});game.update(1/60);
  }
  return game.state==='complete';
}
function flyTo(game,target,limit=9){
  for(let i=0;i<limit*60;i++){
    const dx=target.x-game.soul.x,dy=target.y-game.soul.y;
    if(Math.hypot(dx,dy)<27){game.setInput({x:0,y:0});return true;}
    game.setInput({x:Math.max(-1,Math.min(1,dx/70)),y:Math.max(-1,Math.min(1,dy/70))});game.update(1/60);
    if(game.form!=='soul')return false;
  }
  return false;
}

test('ten seasonal stages are independent, have three named gifts and two real lamps',()=>{
  assert.equal(FESTIVAL_LEVELS.length,10);assert.equal(new Set(FESTIVAL_LEVELS.map(level=>level.festivalId)).size,10);
  for(const level of FESTIVAL_LEVELS){assert.equal(level.memories.length,3);assert.equal(level.lanterns.length,2);assert.equal(level.npcs.length,1);assert.ok(level.memories.every(gift=>gift.name));}
  const first=getFestivalLevel('halloween'),second=getFestivalLevel('halloween');first.platforms[0].w=1;assert.notEqual(first.platforms[0].w,second.platforms[0].w);
  assert.equal(getFestivalLevel('not-a-festival'),null);
  assert.notDeepEqual(getFestivalLevel('halloween').platforms,getFestivalLevel('midautumn').platforms);
  assert.notDeepEqual(getFestivalLevel('thanksgiving').platforms,getFestivalLevel('valentine').platforms);
  assert.ok(getFestivalLevel('dragonboat').movers.some(platform=>platform.kind==='dragonboat'));
  const game=makeGame();game.start({festival:{id:'halloween',gifts:['薄荷糖','笑声糖纸','南瓜软糖']},sound:false});assert.deepEqual(game.memories.map(gift=>gift.name),['薄荷糖','笑声糖纸','南瓜软糖']);game.destroy();
});

test('festival exit requires gifts as well as lamps; main-story optional memories stay optional',()=>{
  const results=[];const game=makeGame('halloween',{onComplete:result=>results.push(result)});
  game.body.x=game.level.exit.x;game.lightSeal(0);game.lightSeal(1);game.update(1/60);assert.equal(game.state,'playing');
  game.memories[0].collected=true;game.memories[1].collected=true;game.update(1/60);assert.equal(game.state,'playing');
  game.memories[2].collected=true;game.update(1/60);assert.equal(game.state,'complete');assert.equal(results.length,1);assert.equal(results[0].mode,'festival');assert.equal(results[0].festivalId,'halloween');assert.equal(results[0].gifts,3);game.finish();assert.equal(results.length,1);game.destroy();
});

test('NPC talk owns its pause until resolved, including repeated conversations',()=>{
  const talks=[];const game=makeGame('halloween',{onTalk:talk=>talks.push(talk)});
  assert.equal(game.getSnapshot().target.kind,'npc');assert.equal(game.getSnapshot().target.action,'talk');
  assert.equal(game.interact(),true);assert.equal(game.state,'paused');assert.ok(game.pendingTalk);assert.equal(talks[0].festivalId,'halloween');
  const time=game.time;tick(game,10);assert.equal(game.time,time);assert.equal(game.resume(),false);assert.equal(game.useItem('star_compass'),false);
  assert.equal(game.resolveTalk(),true);assert.equal(game.state,'playing');assert.equal(game.resolveTalk(),false);
  game.interact();assert.equal(talks.length,2);assert.equal(talks[1].repeated,true);game.resolveTalk();game.destroy();
});

test('festival puzzle handshake includes the festival identity and cannot be bypassed by items',()=>{
  const asks=[];const game=makeGame('halloween',{onPuzzle:payload=>asks.push(payload)});
  assert.equal(walkTo(game,420),true);game.toggleSoul();assert.equal(flyTo(game,game.lanterns[0]),true);game.pulse();
  assert.equal(game.state,'paused');assert.equal(asks[0].mode,'festival');assert.equal(asks[0].festivalId,'halloween');assert.equal(game.useItem('feather_charm'),false);assert.equal(game.resume(),false);
  game.resolvePuzzle(false);assert.equal(game.lanterns[0].lit,false);tick(game,.6);game.pulse();game.resolvePuzzle(true);assert.equal(game.lanterns[0].lit,true);game.destroy();
});

test('consumables have bounded, usable effects and paused time does not consume a compass',()=>{
  const game=makeGame('thanksgiving');game.toggleSoul();tick(game,2);assert.ok(game.energy<100);game.pause('menu');
  assert.equal(game.useItem('glow_candy'),true);assert.equal(game.energy,100);assert.equal(game.useItem('glow_candy'),false);
  assert.equal(game.useItem('star_compass'),true);assert.equal(game.useItem('star_compass'),false);tick(game,12);assert.equal(game.compassTime,30);game.resume();tick(game,2);assert.ok(Math.abs(game.compassTime-28)<.001);
  assert.equal(game.useItem('feather_charm'),true);assert.equal(game.useItem('feather_charm'),false);game.recall();game.respawn();assert.equal(game.deaths,0);assert.equal(game.featherCharges,0);game.respawn();assert.equal(game.deaths,1);
  assert.equal(game.useItem('missing-item'),false);game.destroy();assert.equal(game.useItem('star_compass'),false);
});

test('automatic season and equipped outfit can change without resetting a main-story run',()=>{
  const game=makeGame();game.start({chapterIndex:2,sound:false});game.setInput({x:1,y:0});tick(game,.5);const x=game.body.x,time=game.time,levelId=game.level.id;
  game.setSeason({id:'halloween'});game.setOutfit('starlight');assert.equal(game.mode,'story');assert.equal(game.festivalId,null);assert.equal(game.getOutfitId(),'starlight');assert.equal(game.level.id,levelId);assert.equal(game.body.x,x);assert.equal(game.time,time);assert.equal(game.level.theme.motif,'theatre');
  game.setOutfit('auto');assert.equal(game.getOutfitId(),'halloween');game.setSeason(null);assert.equal(game.getOutfitId(),null);assert.deepEqual(game.level.theme.sky,game.baseTheme.sky);game.destroy();
});

test('all seasonal art, hats, platform types, NPCs and compass render finite geometry',()=>{
  for(const config of configs){
    const game=makeGame(config.id);game.render();game.setOutfit(config.id);game.toggleSoul();tick(game,.5);game.render();game.useItem('star_compass');game.useItem('feather_charm');game.render();game.camera=game.level.width-game.viewWidth;game.render();game.setReducedMotion(true);game.render();game.setOutfit('starlight');game.render();game.destroy();
  }
});

for(const definition of FESTIVAL_LEVELS){
  test(`${definition.festivalId}: collect all gifts, solve lamps and finish with real movement inputs`,()=>{
    const game=makeGame(definition.festivalId);
    const diagnostic=()=>`${definition.festivalId} x=${game.body.x.toFixed(1)}, y=${game.body.y.toFixed(1)}, soul=${game.soul.x.toFixed(1)},${game.soul.y.toFixed(1)}, deaths=${game.deaths}, time=${game.time.toFixed(1)}`;
    for(let index=0;index<2;index++){
      assert.equal(walkTo(game,definition.routeAnchors[index]),true,`walk to anchor ${index}: ${diagnostic()}`);
      assert.equal(game.toggleSoul(),true,diagnostic());
      assert.equal(flyTo(game,game.lanterns[index]),true,`fly to lamp ${index}: ${diagnostic()}`);game.pulse();assert.equal(game.lanterns[index].lit,true,diagnostic());
      for(const giftIndex of index===0?[0,1]:[2]){
        assert.equal(flyTo(game,game.memories[giftIndex]),true,`fly to gift ${giftIndex}: ${diagnostic()}`);assert.equal(game.memories[giftIndex].collected,true,diagnostic());
      }
      game.recall();
    }
    assert.equal(walkTo(game,game.level.exit.x,90),true,`walk to exit: ${diagnostic()}`);assert.equal(game.state,'complete',diagnostic());assert.equal(game.memories.filter(gift=>gift.collected).length,3);game.destroy();
  });
}
