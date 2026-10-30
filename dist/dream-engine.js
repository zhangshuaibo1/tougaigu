// One simulation and one animation loop. The unchanged v14 physics lives in
// dream-engine-base.js; this subclass adds presentation for the six story chapters.
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
import { createTheatrePaintedAssets, drawPaintedTheatre, drawPaintedTheatreLights } from './dream-theatre-painted.js';
import { drawTheatreLantern } from './dream-theatre-lantern.js';
import { createLibrarySceneAssets, drawPaintedLibrary, drawPaintedLibraryLights } from './dream-library-scene.js';
import { drawLibraryPlatform } from './dream-library-finish.js';
import { createCoastSceneAssets, drawPaintedCoast, drawPaintedCoastLights } from './dream-coast-scene.js';
import { drawCoastPlatform, drawCoastPendulum } from './dream-coast-finish.js';
import {createPostSceneAssets,drawPaintedPost,drawPaintedPostLights} from './dream-post-scene.js';
import {drawPostPlatform,drawPostMushroom,drawPostPendulum,drawPostExit} from './dream-post-finish.js';
import {createPostDelivery,beginPostReturn,advancePostDelivery,clearPostDelivery,settlePostDelivery,postDeliveryView,drawPostReturnSpark} from './dream-post-delivery.js';
import { normalizeClockChoice, createClockEcho, advanceClockEcho, settleClockEcho, getClockEchoSnapshot, drawClockEcho } from './dream-clock-echo.js';
import { drawRefinedSoul } from './dream-soul-art.js';
import { drawTravelerSkullFront } from './dream-traveler-face.js';
import { createTheatreEncore, advanceTheatreEncore, drawTheatreEncore, getTheatreEncoreView } from './dream-theatre-encore.js';
import { createTravelerPerformance, advanceTravelerPerformance, settleTravelerPerformance, getTravelerPerformanceView, applyTravelerPerformance, isTravelerPerformanceScene } from './dream-traveler-performance.js';
export { DREAM_LEVELS, DREAM_PHYSICS, createDreamRng, getDreamStars } from './dream-engine-base.js';

export class DreamGame extends BaseDreamGame {
  constructor(canvas,callbacks={},resources={}){
    super(canvas,callbacks);
    this.paintedScenes=createPaintedSceneAssets({loadImage:resources.loadImage});
    this.greenhouseScenes=createGreenhouseSceneAssets({loadImage:resources.loadImage});
    this.theatreScenes=createTheatrePaintedAssets({loadImage:resources.loadTheatreImage});
    this.libraryScenes=createLibrarySceneAssets({loadImage:resources.loadLibraryImage});
    this.coastScenes=createCoastSceneAssets({loadImage:resources.loadCoastImage});
    this.postScenes=createPostSceneAssets({loadImage:resources.loadPostImage});
    this.coastPaintedFrame=false;this.coastLight=null;this.clockEcho=null;
    this.postPaintedFrame=false;this.postLight=null;this.postDelivery=null;
    this.paintedFrame=false;this.greenhousePaintedFrame=false;this.theatrePaintedFrame=false;this.theatreLight=null;this.libraryLight=null;this.libraryPaintedFrame=false;this.theatreEncore=null;this.letterEcho=null;this.travelerPerformance=null;
  }
  isStationFinish(){return this.mode==='story'&&this.chapterIndex===0;}
  isGreenhouseFinish(){return this.mode==='story'&&this.chapterIndex===1;}
  isTheatreFinish(){return this.mode==='story'&&this.chapterIndex===2;}
  isLibraryFinish(){return this.mode==='story'&&this.chapterIndex===3;}
  isCoastFinish(){return this.mode==='story'&&this.chapterIndex===4;}
  isPostFinish(){return this.mode==='story'&&this.chapterIndex===5;}
  start(options={}){
    if(this.destroyed)return;
    this.stationSignal=null;this.paintedFrame=false;this.greenhousePaintedFrame=false;this.theatrePaintedFrame=false;this.libraryPaintedFrame=false;this.theatreLight=null;this.libraryLight=null;this.theatreEncore=null;this.letterEcho=null;
    this.coastPaintedFrame=false;this.coastLight=null;this.clockEcho=null;
    this.postPaintedFrame=false;this.postLight=null;this.postDelivery=createPostDelivery();
    this.travelerPerformance=createTravelerPerformance();
    super.start(options);
    if(this.destroyed)return;
    if(!isTravelerPerformanceScene(this))this.travelerPerformance=null;
    this.stationSignal={amount:this.stationSignalOpen()?1:0};
    this.paintedScenes.request({mode:this.mode,chapterIndex:this.chapterIndex});
    this.greenhouseScenes.request({mode:this.mode,chapterIndex:this.chapterIndex});
    this.theatreScenes.request({mode:this.mode,chapterIndex:this.chapterIndex});
    this.libraryScenes.request({mode:this.mode,chapterIndex:this.chapterIndex});
    this.coastScenes.request({mode:this.mode,chapterIndex:this.chapterIndex});
    this.postScenes.request({mode:this.mode,chapterIndex:this.chapterIndex});
    this.theatreLight=this.isTheatreFinish()?{amounts:this.lanterns.slice(0,2).map(l=>l.lit?1:0)}:null;
    this.libraryLight=this.isLibraryFinish()?{amounts:this.lanterns.slice(0,2).map(l=>l.lit?1:0)}:null;
    this.coastLight=this.isCoastFinish()?{amounts:this.lanterns.slice(0,2).map(l=>l.lit?1:0)}:null;
    this.postLight=this.isPostFinish()?{amounts:this.lanterns.slice(0,2).map(l=>l.lit?1:0)}:null;
    this.theatreEncore=this.isTheatreFinish()?createTheatreEncore():null;
    this.letterEcho=this.isGreenhouseFinish()?createLetterEcho(this.options.letterChoice,this.options.reducedMotion):null;
    this.clockEcho=this.isCoastFinish()?createClockEcho(this.options.clockChoice,this.options.reducedMotion):null;
    this.syncLetterMiniature();
    this.syncClockMiniature();
    this.syncPostMiniature();
    if(this.letterEcho)this.emitHud(true);
  }
  syncLetterMiniature(){
    if(!this.capScene)return;
    if(this.letterEcho)this.capScene.letterEcho=getLetterEchoSnapshot(this.letterEcho);
    else delete this.capScene.letterEcho;
  }
  syncClockMiniature(){
    if(!this.capScene)return;
    if(this.clockEcho)this.capScene.clockEcho=getClockEchoSnapshot(this.clockEcho);
    else delete this.capScene.clockEcho;
  }
  syncPostMiniature(){
    if(!this.capScene)return;
    if(this.isPostFinish()&&this.postDelivery)this.capScene.postDelivery=postDeliveryView(this.postDelivery);
    else delete this.capScene.postDelivery;
  }
  getPostDeliveryView(){return this.isPostFinish()&&!this.destroyed?postDeliveryView(this.postDelivery):null;}
  setClockChoice(value){
    if(this.destroyed||!this.level)return false;
    const choice=normalizeClockChoice(value);this.options.clockChoice=choice;
    const activeChoice=this.isCoastFinish()?choice:null;
    if((this.clockEcho?.choice||null)===activeChoice)return false;
    this.clockEcho=createClockEcho(activeChoice,this.options.reducedMotion);
    this.syncClockMiniature();return true;
  }
  getClockEchoView(){return this.isCoastFinish()&&!this.destroyed?getClockEchoSnapshot(this.clockEcho):null;}
  getCoastLightView(){
    return this.coastLight?{amounts:[...this.coastLight.amounts],lamps:this.lanterns.slice(0,2).map(l=>!!l.lit),reducedMotion:!!this.options.reducedMotion}:null;
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
    if(this.letterEcho)snapshot.letterEcho=getLetterEchoSnapshot(this.letterEcho);
    if(this.clockEcho)snapshot.clockEcho=getClockEchoSnapshot(this.clockEcho);
    if(this.isPostFinish())snapshot.postDelivery=this.getPostDeliveryView();
    return snapshot;
  }
  recall(){
    const eligible=this.isPostFinish()&&!this.destroyed&&this.state==='playing'&&this.form==='soul'&&
      this.lanterns?.slice(0,2).every(l=>l.lit);
    const run=this.runId,body=this.body,ok=super.recall();
    if(ok&&eligible&&this.runId===run&&this.body===body){
      beginPostReturn(this.postDelivery,{eligible:true,lamps:this.lanterns,run,body,cap:this.cap,reducedMotion:this.options.reducedMotion});
      this.syncPostMiniature();
    }
    return ok;
  }
  toggleSoul(){
    const wasBody=this.form==='body',ok=super.toggleSoul();
    if(ok&&wasBody&&this.isPostFinish()&&this.postDelivery?.phase==='returning'){
      advancePostDelivery(this.postDelivery,{eligible:true,lamps:this.lanterns,run:this.runId,body:this.body,cap:this.cap});
      this.syncPostMiniature();
    }
    return ok;
  }
  finish(){
    const result=super.finish();
    if(result&&this.postDelivery){clearPostDelivery(this.postDelivery);this.syncPostMiniature();}
    return result;
  }
  stationSignalOpen(){return !!(this.lanterns?.[0]?.lit||this.plateState?.get('ticket'));}
  update(dt){
    const active=this.state==='playing'&&!this.destroyed,run=this.runId;
    const travelerBefore=active&&this.travelerPerformance?{body:this.body,runId:run,deaths:this.deaths,form:this.form,grounded:this.body.grounded,vy:this.body.vy}:null;
    super.update(dt);
    if(!active||this.destroyed||run!==this.runId||!this.stationSignal)return;
    if(travelerBefore)advanceTravelerPerformance(this.travelerPerformance,travelerBefore,this.getTravelerPerformanceContext(),Math.max(0,Math.min(.04,Number(dt)||0)));
    const target=this.stationSignalOpen()?1:0,step=Math.max(0,Math.min(.04,Number(dt)||0))*6;
    this.stationSignal.amount=this.options.reducedMotion?target:this.stationSignal.amount<target?Math.min(target,this.stationSignal.amount+step):Math.max(target,this.stationSignal.amount-step);
    advanceLetterEcho(this.letterEcho,dt,{playing:this.state==='playing',reducedMotion:this.options.reducedMotion,capPhase:this.cap.phase,capAge:this.cap.age,capOpen:this.capOpen});
    advanceClockEcho(this.clockEcho,dt,{playing:this.state==='playing',reducedMotion:this.options.reducedMotion,capPhase:this.cap.phase,capAge:this.cap.age,capOpen:this.capOpen});
    if(this.postDelivery){
      advancePostDelivery(this.postDelivery,{eligible:this.isPostFinish(),lamps:this.lanterns,run:this.runId,body:this.body,cap:this.cap,playing:this.state==='playing',reducedMotion:this.options.reducedMotion});
      this.syncPostMiniature();
    }
    this.syncLetterMiniature();
    this.syncClockMiniature();
    if(this.theatreEncore)advanceTheatreEncore(this.theatreEncore,{state:this.state,mode:this.mode,chapterIndex:this.chapterIndex,form:this.form,body:this.body,movers:this.movers,level:this.level,deaths:this.deaths},dt);
    if(this.libraryLight){
      const speed=Math.max(0,Math.min(.04,Number(dt)||0))*3.6;
      for(let i=0;i<2;i++){
        const target=this.lanterns[i]?.lit?1:0,current=this.libraryLight.amounts[i]||0;
        this.libraryLight.amounts[i]=this.options.reducedMotion?target:current<target?Math.min(target,current+speed):Math.max(target,current-speed);
      }
    }
    if(this.theatreLight){
      const step=Math.max(0,Math.min(.04,Number(dt)||0))*3.6;
      for(let i=0;i<2;i++){
        const target=this.lanterns[i]?.lit?1:0,current=this.theatreLight.amounts[i]||0;
        this.theatreLight.amounts[i]=this.options.reducedMotion?target:
          current<target?Math.min(target,current+step):Math.max(target,current-step);
      }
    }
    if(this.postLight){
      const speed=Math.max(0,Math.min(.04,Number(dt)||0))*3.6;
      for(let i=0;i<2;i++){const target=this.lanterns[i]?.lit?1:0,current=this.postLight.amounts[i]||0;
        this.postLight.amounts[i]=this.options.reducedMotion?target:current<target?Math.min(target,current+speed):Math.max(target,current-speed);}
    }
    if(this.coastLight){
      const speed=Math.max(0,Math.min(.04,Number(dt)||0))*3.6;
      for(let i=0;i<2;i++){
        const target=this.lanterns[i]?.lit?1:0,current=this.coastLight.amounts[i]||0;
        this.coastLight.amounts[i]=this.options.reducedMotion?target:current<target?Math.min(target,current+speed):Math.max(target,current-speed);
      }
    }
  }
  setReducedMotion(value){
    super.setReducedMotion(value);
    if(value&&this.stationSignal)this.stationSignal.amount=this.stationSignalOpen()?1:0;
    if(value){
      settleTravelerPerformance(this.travelerPerformance);settleLetterEcho(this.letterEcho);settleClockEcho(this.clockEcho);settlePostDelivery(this.postDelivery);
      this.syncLetterMiniature();this.syncClockMiniature();this.syncPostMiniature();
      for(const light of [this.theatreLight,this.libraryLight,this.coastLight,this.postLight])if(light)light.amounts=this.lanterns.slice(0,2).map(l=>l.lit?1:0);
    }
  }
  getPaintedStationImage(){return this.paintedScenes.getImage({mode:this.mode,chapterIndex:this.chapterIndex});}
  getPaintedGreenhouseImage(){return this.greenhouseScenes.getImage({mode:this.mode,chapterIndex:this.chapterIndex});}
  getPaintedTheatreImage(){return this.theatreScenes.getImage({mode:this.mode,chapterIndex:this.chapterIndex});}
  getPaintedLibraryImage(){return this.libraryScenes.getImage({mode:this.mode,chapterIndex:this.chapterIndex});}
  getPaintedCoastImage(){return this.coastScenes.getImage({mode:this.mode,chapterIndex:this.chapterIndex});}
  getPaintedPostImage(){return this.postScenes.getImage({mode:this.mode,chapterIndex:this.chapterIndex});}
  getTheatreEncoreView(){return getTheatreEncoreView(this.theatreEncore);}
  destroy(){super.destroy();this.paintedScenes.destroy();this.greenhouseScenes.destroy();this.theatreScenes.destroy();this.libraryScenes.destroy();this.coastScenes.destroy();this.postScenes.destroy();this.paintedFrame=false;this.greenhousePaintedFrame=false;this.theatrePaintedFrame=false;this.theatreLight=null;this.libraryLight=null;this.libraryPaintedFrame=false;this.coastLight=null;this.coastPaintedFrame=false;this.clockEcho=null;this.postLight=null;this.postPaintedFrame=false;this.postDelivery=null;this.theatreEncore=null;this.letterEcho=null;this.travelerPerformance=null;this.syncLetterMiniature();this.syncClockMiniature();}
  getTravelerPerformanceContext(){
    return {mode:this.mode,chapterIndex:this.chapterIndex,state:this.state,form:this.form,body:this.body,
      level:this.level,movers:this.movers,closedBarriers:this.level?.barriers.filter(b=>!this.barrierOpen(b))||[],
      time:this.visualTime,reducedMotion:this.options?.reducedMotion,runId:this.runId,deaths:this.deaths};
  }
  getTravelerPerformanceView(){
    return isTravelerPerformanceScene(this)&&!this.destroyed?getTravelerPerformanceView(this.travelerPerformance,this.getTravelerPerformanceContext()):null;
  }
  getCharacterPresentation(t=this.options.reducedMotion?0:this.visualTime){
    return applyTravelerPerformance(super.getCharacterPresentation(t),this.getTravelerPerformanceView());
  }
  getStoryNPCView(npc){
    const view=super.getStoryNPCView(npc);
    if(view&&this.isCoastFinish())return{...view,clockChoice:this.clockEcho?.choice||null,lighting:'painted-coast'};
    if(view&&this.isPostFinish())return{...view,lighting:'painted-post'};
    return view&&this.paintedFrame&&this.isStationFinish()?{...view,lighting:'painted-station'}:view;
  }
  drawBackground(c,w,h,t){
    this.paintedFrame=false;this.greenhousePaintedFrame=false;this.theatrePaintedFrame=false;this.libraryPaintedFrame=false;this.coastPaintedFrame=false;this.postPaintedFrame=false;
    if(this.isPostFinish()){
      const view=this.getSceneBackdropView(),image=this.getPaintedPostImage();
      if(image){let saved=false;try{c.save();saved=true;const sky=c.createLinearGradient(0,view.viewport.top,0,view.viewport.bottom);
        sky.addColorStop(0,'#536d89');sky.addColorStop(.57,'#5a647a');sky.addColorStop(1,'#464858');
        c.fillStyle=sky;c.fillRect(0,view.viewport.top,w,view.viewport.bottom-view.viewport.top);
      }catch{}finally{if(saved)try{c.restore();}catch{}}
        if(drawPaintedPost(c,view,image)){this.postPaintedFrame=true;drawPaintedPostLights(c,view,this.postLight?.amounts||[0,0]);return;}
      }
      super.drawBackground(c,w,h,t);return;
    }
    if(this.isCoastFinish()){
      const view=this.getSceneBackdropView(),image=this.getPaintedCoastImage();
      if(image){
        let saved=false;
        try{
          c.save();saved=true;
          const sky=c.createLinearGradient(0,view.viewport.top,0,view.viewport.bottom);
          sky.addColorStop(0,'#507b9b');sky.addColorStop(.6,'#34667e');sky.addColorStop(1,'#183f55');
          c.fillStyle=sky;c.fillRect(0,view.viewport.top,w,view.viewport.bottom-view.viewport.top);
        }catch{}finally{if(saved)try{c.restore();}catch{}}
        if(drawPaintedCoast(c,view,image)){
          this.coastPaintedFrame=true;drawPaintedCoastLights(c,view,this.coastLight?.amounts||[0,0]);return;
        }
      }
      super.drawBackground(c,w,h,t);return;
    }
    if(this.isLibraryFinish()){
      const view=this.getSceneBackdropView(),image=this.getPaintedLibraryImage();
      if(image){
        let saved=false;
        try{
          c.save();saved=true;
          const sky=c.createLinearGradient(0,view.viewport.top,0,view.viewport.bottom);
          sky.addColorStop(0,'#0c1b30');sky.addColorStop(.56,'#142c42');sky.addColorStop(1,'#183c45');
          c.fillStyle=sky;c.fillRect(0,view.viewport.top,w,view.viewport.bottom-view.viewport.top);
        }catch{}finally{if(saved)try{c.restore();}catch{}}
        if(drawPaintedLibrary(c,view,image)){
          this.libraryPaintedFrame=true;
          drawPaintedLibraryLights(c,view,this.libraryLight?.amounts||[0,0]);return;
        }
      }
      super.drawBackground(c,w,h,t);return;
    }
    if(this.isTheatreFinish()){
      const view=this.getSceneBackdropView(),image=this.getPaintedTheatreImage();
      if(image){
        c.save();const sky=c.createLinearGradient(0,view.viewport.top,0,view.viewport.bottom);
        sky.addColorStop(0,'#111829');sky.addColorStop(.55,'#29243a');sky.addColorStop(1,'#181d30');
        c.fillStyle=sky;c.fillRect(0,view.viewport.top,w,view.viewport.bottom-view.viewport.top);c.restore();
        if(drawPaintedTheatre(c,view,image)){
          this.theatrePaintedFrame=true;
          drawPaintedTheatreLights(c,view,this.theatreLight?.amounts||[0,0],image);return;
        }
      }
      super.drawBackground(c,w,h,t);return;
    }
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
    else if((!this.isGreenhouseFinish()||!this.greenhousePaintedFrame)&&(!this.isTheatreFinish()||!this.theatrePaintedFrame)&&(!this.isLibraryFinish()||!this.libraryPaintedFrame)&&(!this.isCoastFinish()||!this.coastPaintedFrame)&&(!this.isPostFinish()||!this.postPaintedFrame))super.drawArchitecture(c,t);
    if(this.isTheatreFinish()){drawTheatreRigging(c,{movers:this.movers,camera:this.camera,viewWidth:this.viewWidth});drawTheatreEncore(c,this.theatreEncore,{reducedMotion:this.options.reducedMotion});}
    if(this.letterEcho)drawLetterSceneWindow(c,this.letterEcho.choice,t);
  }
  drawPlatform(c,p,t){
    if(this.isStationFinish())drawStationPlatform(c,p,this.camera,this.viewWidth);
    else if(this.isPostFinish()&&drawPostPlatform(c,p,{camera:this.camera,viewWidth:this.viewWidth}))return;
    else if(this.isCoastFinish()&&drawCoastPlatform(c,p,{camera:this.camera,viewWidth:this.viewWidth}))return;
    else if(this.isLibraryFinish()&&drawLibraryPlatform(c,p,{camera:this.camera,viewWidth:this.viewWidth}))return;
    else if(this.isTheatreFinish()&&drawTheatrePlatform(c,p,{camera:this.camera,viewWidth:this.viewWidth,platforms:this.level.platforms,movers:this.movers}))return;
    else if(!this.isGreenhouseFinish()||!drawGreenhousePlatform(c,p,this.camera,this.viewWidth))super.drawPlatform(c,p,t);
  }
  drawMushroom(c,p,t){
    if(this.isPostFinish()&&drawPostMushroom(c,p,t,this.options.reducedMotion))return;
    if(!this.isGreenhouseFinish()||!drawGreenhouseMushroom(c,p,t,this.options.reducedMotion))super.drawMushroom(c,p,t);
  }
  drawPlate(c,p,t){if(this.isStationFinish())drawStationSignal(c,this,p);else super.drawPlate(c,p,t);}
  drawHazard(c,h,t){
    if(this.isCoastFinish()&&drawCoastPendulum(c,h,{camera:this.camera,viewWidth:this.viewWidth}))return;
    if(this.isPostFinish()&&drawPostPendulum(c,h,{camera:this.camera,viewWidth:this.viewWidth}))return;
    super.drawHazard(c,h,t);
  }
  drawLantern(c,l,index,t){
    if(this.isTheatreFinish()||this.isLibraryFinish()||this.isCoastFinish()||this.isPostFinish()){if(drawTheatreLantern(c,this,l,index,t))return;super.drawLantern(c,l,index,t);return;}
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
  drawExit(c,t){
    if(this.isPostFinish()&&drawPostExit(c,this.level.exit,this.exitReady(),this.lanterns.map(l=>l.lit)))return;
    super.drawExit(c,t);
  }
  drawStationRim(c){drawCapFrontRim(c,this.capScene,this.capOpen);}
  drawSkullFront(c,b,t,shown){
    if(drawTravelerSkullFront(c,this,b,t,shown))return;
    super.drawSkullFront(c,b,t,shown);
  }
  drawSoul(c,s,t){
    if(this.mode==='story'&&this.chapterIndex<=5&&drawRefinedSoul(c,this,s,t))return;
    super.drawSoul(c,s,t);
  }
  drawCharacter(c,b,t,shown=null,character=null){
    const presentation=character||this.getCharacterPresentation(t);
    if(this.letterEcho)drawLetterEcho(c,this.letterEcho,{opening:presentation.rig.openingWorld,face:b.face,camera:this.camera,width:this.viewWidth});
    if(this.clockEcho)drawClockEcho(c,this.clockEcho,{opening:presentation.rig.openingWorld,face:b.face,camera:this.camera,width:this.viewWidth});
    if(this.isPostFinish()&&this.postDelivery?.phase==='returning')drawPostReturnSpark(c,this.postDelivery,this.getSoulPresentation(presentation),presentation.rig.openingWorld);
    if(this.isTheatreFinish()||this.isLibraryFinish()||this.isCoastFinish()||this.isPostFinish()){
      const shadow=getGroundShadowView({body:b,level:this.level,movers:this.movers,closedBarriers:this.level.barriers.filter(barrier=>!this.barrierOpen(barrier))});
      drawStationCharacter(this,c,b,t,shown,presentation,{shadow,reflection:this.isPostFinish()?'#f1c8ab62':this.isCoastFinish()?'#a6dce065':this.isLibraryFinish()?'#9adbd258':'#baa1ed61'});
    }
    else if(this.isStationFinish()||this.isGreenhouseFinish()){
      const shadow=getGroundShadowView({body:b,level:this.level,movers:this.movers,closedBarriers:this.level.barriers.filter(barrier=>!this.barrierOpen(barrier))});
      drawStationCharacter(this,c,b,t,shown,presentation,{shadow});
    }
    else super.drawCharacter(c,b,t,shown,character);
  }
}
