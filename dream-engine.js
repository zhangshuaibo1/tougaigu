// One simulation and one animation loop. The unchanged v14 physics lives in
// dream-engine-base.js; this subclass adds presentation for the first three chapters.
import { DreamGame as BaseDreamGame } from './dream-engine-base.js';
import { drawCapFrontRim } from './dream-cap-art.js';
import { drawStationBackdrop, drawStationArchitecture, drawStationPlatform, drawStationSignal, drawStationCharacter, drawStationLantern } from './dream-station-art.js';
import { createPaintedSceneAssets, drawPaintedStation, drawPaintedStationLights } from './dream-painted-scene.js';
import { createGreenhouseSceneAssets, drawPaintedGreenhouse, drawPaintedGreenhouseLights } from './dream-greenhouse-scene.js';
import { drawGreenhousePlatform, drawGreenhouseMushroom } from './dream-greenhouse-finish.js';
import { normalizeLetterChoice, createLetterEcho, advanceLetterEcho, settleLetterEcho, getLetterEchoSnapshot, drawLetterEcho, drawLetterSceneWindow } from './dream-letter-echo.js';
import { drawTheatrePlatform, drawTheatreRigging } from './dream-theatre-art.js';
import { getTheatreGuidance } from './dream-theatre-guidance.js';
import { getGroundShadowView } from './dream-ground-shadow.js';
export { DREAM_LEVELS, DREAM_PHYSICS, createDreamRng, getDreamStars } from './dream-engine-base.js';

export class DreamGame extends BaseDreamGame {
  constructor(canvas,callbacks={},resources={}){
    super(canvas,callbacks);
    this.paintedScenes=createPaintedSceneAssets({loadImage:resources.loadImage});
    this.greenhouseScenes=createGreenhouseSceneAssets({loadImage:resources.loadImage});
    this.paintedFrame=false;this.greenhousePaintedFrame=false;this.letterEcho=null;
  }
  isStationFinish(){return this.mode==='story'&&this.chapterIndex===0;}
  isGreenhouseFinish(){return this.mode==='story'&&this.chapterIndex===1;}
  isTheatreFinish(){return this.mode==='story'&&this.chapterIndex===2;}
  start(options={}){
    if(this.destroyed)return;
    this.stationSignal=null;this.paintedFrame=false;this.greenhousePaintedFrame=false;this.letterEcho=null;
    super.start(options);
    if(this.destroyed)return;
    this.stationSignal={amount:this.stationSignalOpen()?1:0};
    this.paintedScenes.request({mode:this.mode,chapterIndex:this.chapterIndex});
    this.greenhouseScenes.request({mode:this.mode,chapterIndex:this.chapterIndex});
    this.letterEcho=this.isGreenhouseFinish()?createLetterEcho(this.options.letterChoice,this.options.reducedMotion):null;
    this.syncLetterMiniature();
    if(this.letterEcho)this.emitHud(true);
  }
  syncLetterMiniature(){
    if(!this.capScene)return;
    if(this.letterEcho)this.capScene.letterEcho=getLetterEchoSnapshot(this.letterEcho);
    else delete this.capScene.letterEcho;
  }
  // Called only after a real saved reply changes, including the journey diary.
  // Applying the same reply twice does not restart the performance.
  setLetterChoice(value){
    if(this.destroyed||!this.level)return false;
    const choice=normalizeLetterChoice(value);this.options.letterChoice=choice;
    const activeChoice=this.isGreenhouseFinish()?choice:null;
    if((this.letterEcho?.choice||null)===activeChoice)return false;
    this.letterEcho=createLetterEcho(activeChoice,this.options.reducedMotion);
    this.syncLetterMiniature();this.emitHud(true);return true;
  }
  getJourneyContext(){
    const facts=super.getJourneyContext();
    return this.isGreenhouseFinish()&&this.letterEcho?{...facts,letterChoice:this.letterEcho.choice}:facts;
  }
  getTheatreGuidance(nearHint){
    if(!this.isTheatreFinish()||!this.level)return null;
    return getTheatreGuidance({mode:this.mode,chapterIndex:this.chapterIndex,form:this.form,body:this.body,level:this.level,movers:this.movers,nearHint:nearHint??super.getNearHint()});
  }
  getNearHint(){
    const existing=super.getNearHint();
    return this.getTheatreGuidance(existing)?.text||existing;
  }
  getSnapshot(){
    const snapshot=super.getSnapshot();
    return this.letterEcho?{...snapshot,letterEcho:getLetterEchoSnapshot(this.letterEcho)}:snapshot;
  }
  stationSignalOpen(){return !!(this.lanterns?.[0]?.lit||this.plateState?.get('ticket'));}
  update(dt){
    const active=this.state==='playing'&&!this.destroyed,run=this.runId;
    super.update(dt);
    if(!active||this.destroyed||run!==this.runId||!this.stationSignal)return;
    const target=this.stationSignalOpen()?1:0,step=Math.max(0,Math.min(.04,Number(dt)||0))*6;
    this.stationSignal.amount=this.options.reducedMotion?target:this.stationSignal.amount<target?Math.min(target,this.stationSignal.amount+step):Math.max(target,this.stationSignal.amount-step);
    advanceLetterEcho(this.letterEcho,dt,{playing:this.state==='playing',reducedMotion:this.options.reducedMotion,capPhase:this.cap.phase,capAge:this.cap.age,capOpen:this.capOpen});
    this.syncLetterMiniature();
  }
  setReducedMotion(value){super.setReducedMotion(value);if(value&&this.stationSignal)this.stationSignal.amount=this.stationSignalOpen()?1:0;if(value){settleLetterEcho(this.letterEcho);this.syncLetterMiniature();}}
  getPaintedStationImage(){return this.paintedScenes.getImage({mode:this.mode,chapterIndex:this.chapterIndex});}
  getPaintedGreenhouseImage(){return this.greenhouseScenes.getImage({mode:this.mode,chapterIndex:this.chapterIndex});}
  destroy(){super.destroy();this.paintedScenes.destroy();this.greenhouseScenes.destroy();this.paintedFrame=false;this.greenhousePaintedFrame=false;this.letterEcho=null;this.syncLetterMiniature();}
  getStoryNPCView(npc){
    const view=super.getStoryNPCView(npc);
    return view&&this.paintedFrame&&this.isStationFinish()?{...view,lighting:'painted-station'}:view;
  }
  drawBackground(c,w,h,t){
    this.paintedFrame=false;this.greenhousePaintedFrame=false;
    if(this.isGreenhouseFinish()){
      const view=this.getSceneBackdropView(),image=this.getPaintedGreenhouseImage();
      if(image){
        c.save();const sky=c.createLinearGradient(0,view.viewport.top,0,view.viewport.bottom);
        sky.addColorStop(0,'#102b29');sky.addColorStop(.62,'#203e38');sky.addColorStop(1,'#263f36');
        c.fillStyle=sky;c.fillRect(0,view.viewport.top,w,view.viewport.bottom-view.viewport.top);c.restore();
        if(drawPaintedGreenhouse(c,view,image)){
          this.greenhousePaintedFrame=true;
          drawPaintedGreenhouseLights(c,view,this.lanterns.map(lamp=>lamp.lit));return;
        }
      }
      super.drawBackground(c,w,h,t);return;
    }
    if(!this.isStationFinish()){super.drawBackground(c,w,h,t);return;}
    const view=this.getSceneBackdropView(),image=this.getPaintedStationImage();
    if(image){
      c.save();
      const sky=c.createLinearGradient(0,view.viewport.top,0,view.viewport.bottom);
      sky.addColorStop(0,'#102d4e');sky.addColorStop(.65,'#16364e');sky.addColorStop(1,'#152d3f');
      c.fillStyle=sky;c.fillRect(0,view.viewport.top,w,view.viewport.bottom-view.viewport.top);c.restore();
      if(drawPaintedStation(c,view,image)){
        this.paintedFrame=true;
        drawPaintedStationLights(c,view,this.lanterns.map(lamp=>lamp.lit));
        return;
      }
    }
    drawStationBackdrop(c,view,t,this.options.reducedMotion);
  }
  drawArchitecture(c,t){
    if(this.isStationFinish()){if(!this.paintedFrame)drawStationArchitecture(c,this);}
    else if(!this.isGreenhouseFinish()||!this.greenhousePaintedFrame)super.drawArchitecture(c,t);
    if(this.isTheatreFinish())drawTheatreRigging(c,{movers:this.movers,camera:this.camera,viewWidth:this.viewWidth});
    if(this.letterEcho)drawLetterSceneWindow(c,this.letterEcho.choice,t);
  }
  drawPlatform(c,p,t){
    if(this.isStationFinish())drawStationPlatform(c,p,this.camera,this.viewWidth);
    else if(this.isTheatreFinish()&&drawTheatrePlatform(c,p,{camera:this.camera,viewWidth:this.viewWidth,platforms:this.level.platforms,movers:this.movers}))return;
    else if(!this.isGreenhouseFinish()||!drawGreenhousePlatform(c,p,this.camera,this.viewWidth))super.drawPlatform(c,p,t);
  }
  drawMushroom(c,p,t){
    if(!this.isGreenhouseFinish()||!drawGreenhouseMushroom(c,p,t,this.options.reducedMotion))super.drawMushroom(c,p,t);
  }
  drawPlate(c,p,t){if(this.isStationFinish())drawStationSignal(c,this,p);else super.drawPlate(c,p,t);}
  drawLantern(c,l,index,t){
    if(!this.isStationFinish()&&!this.isGreenhouseFinish()){super.drawLantern(c,l,index,t);return;}
    if(this.paintedFrame||this.greenhousePaintedFrame){
      const y=l.y+(this.options.reducedMotion?0:Math.sin(t*1.2+index)*4);
      c.save();const separation=c.createRadialGradient(l.x,y,18,l.x,y,70);
      separation.addColorStop(0,'#10283c99');separation.addColorStop(.6,'#10283c4d');separation.addColorStop(1,'#10283c00');
      c.fillStyle=separation;c.fillRect(l.x-70,y-70,140,140);
      c.beginPath();c.roundRect(l.x-35,y+57,70,18,7);c.fillStyle='#102838dd';c.fill();c.restore();
    }
    if(this.isStationFinish())drawStationLantern(c,this,l,index,t);
    else super.drawLantern(c,l,index,t);
  }
  drawStationRim(c){drawCapFrontRim(c,this.capScene,this.capOpen);}
  drawCharacter(c,b,t,shown=null,character=null){
    const presentation=character||this.getCharacterPresentation(t);
    if(this.letterEcho)drawLetterEcho(c,this.letterEcho,{opening:presentation.rig.openingWorld,face:b.face,camera:this.camera,width:this.viewWidth});
    if(this.isTheatreFinish()){
      const shadow=getGroundShadowView({body:b,level:this.level,movers:this.movers,closedBarriers:this.level.barriers.filter(barrier=>!this.barrierOpen(barrier))});
      drawStationCharacter(this,c,b,t,shown,presentation,{shadow,reflection:'#baa1ed61'});
    }
    else if(this.isStationFinish()||this.isGreenhouseFinish())drawStationCharacter(this,c,b,t,shown,presentation);
    else super.drawCharacter(c,b,t,shown,character);
  }
}
