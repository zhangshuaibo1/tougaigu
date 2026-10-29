// One simulation and one animation loop. The unchanged v14 physics lives in
// dream-engine-base.js; this subclass adds first-chapter presentation only.
import { DreamGame as BaseDreamGame } from './dream-engine-base.js';
import { drawCapFrontRim } from './dream-cap-art.js';
import { drawStationBackdrop, drawStationArchitecture, drawStationPlatform, drawStationSignal, drawStationCharacter, drawStationLantern } from './dream-station-art.js';
export { DREAM_LEVELS, DREAM_PHYSICS, createDreamRng, getDreamStars } from './dream-engine-base.js';

export class DreamGame extends BaseDreamGame {
  isStationFinish(){return this.mode==='story'&&this.chapterIndex===0;}
  start(options={}){
    if(this.destroyed)return;
    this.stationSignal=null;
    super.start(options);
    this.stationSignal={amount:this.stationSignalOpen()?1:0};
  }
  stationSignalOpen(){return !!(this.lanterns?.[0]?.lit||this.plateState?.get('ticket'));}
  update(dt){
    const active=this.state==='playing'&&!this.destroyed,run=this.runId;
    super.update(dt);
    if(!active||this.destroyed||run!==this.runId||!this.stationSignal)return;
    const target=this.stationSignalOpen()?1:0,step=Math.max(0,Math.min(.04,Number(dt)||0))*6;
    this.stationSignal.amount=this.options.reducedMotion?target:this.stationSignal.amount<target?Math.min(target,this.stationSignal.amount+step):Math.max(target,this.stationSignal.amount-step);
  }
  setReducedMotion(value){super.setReducedMotion(value);if(value&&this.stationSignal)this.stationSignal.amount=this.stationSignalOpen()?1:0;}
  drawBackground(c,w,h,t){if(this.isStationFinish())drawStationBackdrop(c,this.getSceneBackdropView(),t,this.options.reducedMotion);else super.drawBackground(c,w,h,t);}
  drawArchitecture(c,t){if(this.isStationFinish())drawStationArchitecture(c,this);else super.drawArchitecture(c,t);}
  drawPlatform(c,p,t){if(this.isStationFinish())drawStationPlatform(c,p,this.camera,this.viewWidth);else super.drawPlatform(c,p,t);}
  drawPlate(c,p,t){if(this.isStationFinish())drawStationSignal(c,this,p);else super.drawPlate(c,p,t);}
  drawLantern(c,l,index,t){if(this.isStationFinish())drawStationLantern(c,this,l,index,t);else super.drawLantern(c,l,index,t);}
  drawStationRim(c){drawCapFrontRim(c,this.capScene,this.capOpen);}
  drawCharacter(c,b,t,shown=null,character=null){
    if(this.isStationFinish())drawStationCharacter(this,c,b,t,shown,character||this.getCharacterPresentation(t));
    else super.drawCharacter(c,b,t,shown,character);
  }
}
