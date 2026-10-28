// Optional thought-routing play: its curves never enter the platform collision model.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
const indexes=values=>Array.isArray(values)?[...new Set(values.filter(n=>Number.isInteger(n)&&n>=0&&n<3))].sort():[];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(x,y)=>({x,y});
const validAttemptId=value=>typeof value==='string'&&/^[a-zA-Z0-9_.:-]{1,96}$/.test(value);
let instanceCount=0;

export const CAP_ACTIVITY_ANCHOR=Object.freeze({x:330,y:560,r:24});
export const CAP_ACTIVITY_SWITCH_RADIUS=40;
export const CAP_ACTIVITY_VARIANTS=Object.freeze([[0,1,2],[1,2,0],[2,0,1]].map(order=>Object.freeze(order)));

export function pointOnCapRoute(points,t){
  const q=clamp(finite(t),0,1),u=1-q;
  return {x:u*u*u*points[0].x+3*u*u*q*points[1].x+3*u*q*q*points[2].x+q*q*q*points[3].x,y:u*u*u*points[0].y+3*u*u*q*points[1].y+3*u*q*q*points[2].y+q*q*q*points[3].y};
}

function routeLength(points){
  let total=0,last=points[0];
  for(let i=1;i<=24;i++){const next=pointOnCapRoute(points,i/24);total+=distance(last,next);last=next;}
  return Math.max(1,total);
}

export function createCapActivityLayout(){
  const nodes=[
    {id:'source',x:330,y:494,kind:'source'},
    {id:'a',x:245,y:355,kind:'switch'},
    {id:'b',x:365,y:355,kind:'switch'},
    {id:'destination-0',x:175,y:285,kind:'destination',index:0},
    {id:'destination-1',x:355,y:265,kind:'destination',index:1},
    {id:'destination-2',x:460,y:340,kind:'destination',index:2},
  ];
  const byId=Object.fromEntries(nodes.map(node=>[node.id,node]));
  const route=(id,from,to,controls,kind,switchId=null,selection=null)=>{
    const points=[point(byId[from].x,byId[from].y),...controls,point(byId[to].x,byId[to].y)];
    return {id,from,to,points,kind,switchId,selection,length:routeLength(points)};
  };
  const routes=[
    route('source-a','source','a',[point(315,470),point(235,445)],'trunk'),
    route('a-0','a','destination-0',[point(212,354),point(177,329)],'choice','a',0),
    route('a-b','a','b',[point(273,317),point(335,317)],'choice','a',1),
    route('b-1','b','destination-1',[point(392,320),point(373,284)],'choice','b',0),
    route('b-2','b','destination-2',[point(395,340),point(432,317)],'choice','b',1),
    route('return-0','destination-0','source',[point(145,410),point(260,485)],'return'),
    route('return-1','destination-1','source',[point(430,290),point(454,475)],'return'),
    route('return-2','destination-2','source',[point(487,419),point(425,484)],'return'),
  ];
  return {anchor:{...CAP_ACTIVITY_ANCHOR},nodes,routes};
}

export function normalizeCapActivityRecord(input){
  const completedSteps=indexes(input?.completedSteps),completedVariants=indexes(input?.completedVariants),best={};
  for(let variant=0;variant<3;variant++){
    const record=input?.best?.[variant];
    if(!record||!Number.isFinite(record.switches)||record.switches<0||!Number.isFinite(record.seconds)||record.seconds<0)continue;
    best[variant]={switches:Math.min(99999,Math.floor(record.switches)),seconds:Math.min(360000,record.seconds)};
    if(!completedVariants.includes(variant))completedVariants.push(variant);
  }
  if(completedVariants.includes(0))completedSteps.splice(0,completedSteps.length,0,1,2);
  const candidate=input?.pending;
  const pending=candidate&&Number.isInteger(candidate.variant)&&candidate.variant>=0&&candidate.variant<3&&validAttemptId(candidate.attemptId)?{variant:candidate.variant,completedSteps:indexes(candidate.completedSteps),attemptId:candidate.attemptId}:null;
  return {completedSteps,completedVariants:completedVariants.sort(),best,pending};
}

export class DreamCapActivity {
  constructor(config,{record,onEvent,chapterIndex=0,festivalId=null,mode='story',revision=''}={}){
    this.config=config;
    this.layout=createCapActivityLayout();
    this.nodes=Object.fromEntries(this.layout.nodes.map(node=>[node.id,node]));
    this.routes=Object.fromEntries(this.layout.routes.map(route=>[route.id,route]));
    this.record=normalizeCapActivityRecord(record);
    this.revision=typeof revision==='string'?revision:'';
    this.meta={chapterIndex,festivalId,mode,revision:this.revision};this.onEvent=onEvent;
    this.sessionId='cap-'+Date.now().toString(36)+'-'+(++instanceCount).toString(36);this.attempt=0;
    this.destroyed=false;this.context=null;this.inRange=false;this.nearbySwitchId=null;
    this.variant=this.record.pending?.variant??0;this.delivered=new Set(this.record.pending?.completedSteps??this.record.completedSteps);this.resumed=this.delivered.size>0;
    this.switches={a:1,b:1};this.switchCount=0;this.activeSeconds=0;this.started=false;this.completeSent=false;
    this.phase=this.delivered.size===3?'complete':'idle';this.wait=.65;this.pendingRoute=null;
    // A last step can have been saved immediately before its completion callback.
    // Repair on the first eligible refresh, after the owner has installed this instance.
    this.repairCompletion=this.phase==='complete'&&!this.record.completedVariants.includes(this.variant);
    this.attemptId=this.record.pending?.attemptId||this.sessionId+'-'+this.attempt;this.resetTraveler();
  }
  get order(){
    const authored=Array.isArray(this.config?.steps)?this.config.steps.map(step=>step.target):[];
    const base=new Set(authored).size===3&&authored.every(n=>Number.isInteger(n)&&n>=0&&n<3)?authored:[0,1,2];
    return CAP_ACTIVITY_VARIANTS[this.variant].map(index=>base[index]);
  }
  get targetIndex(){return this.order.find(target=>!this.delivered.has(target))??null;}
  get targetLabel(){
    const target=this.targetIndex;
    return target===null?'已完成':this.config?.steps?.find(step=>step.target===target)?.label||this.config?.destinations?.[target]?.label||'送往第 '+(target+1)+' 站';
  }
  resetTraveler(){
    const source=this.nodes.source;
    this.traveler={x:source.x,y:source.y,angle:-Math.PI/2,routeId:null,progress:0,state:'parked',carrying:true};
  }
  bodyInRange(body){return !!body&&body.grounded===true&&Math.abs(finite(body.x,-1000)-this.layout.anchor.x)<=this.layout.anchor.r&&Math.abs(finite(body.y,-1000)-this.layout.anchor.y)<=8;}
  nearRing(body=this.context?.body){return !!body&&Math.abs(finite(body.x,-1000)-this.layout.anchor.x)<=110&&Math.abs(finite(body.y,-1000)-this.layout.anchor.y)<=65;}
  nearestSwitch(soul){
    if(!soul||!Number.isFinite(soul.x)||!Number.isFinite(soul.y))return null;
    const nearby=['a','b'].map(id=>({id,distance:distance(soul,this.nodes[id])})).filter(entry=>entry.distance<=CAP_ACTIVITY_SWITCH_RADIUS).sort((a,b)=>a.distance-b.distance);
    return nearby[0]?.id||null;
  }
  refresh(context){
    if(this.destroyed)return;
    this.context=context;this.inRange=this.bodyInRange(context?.body);
    if(this.repairCompletion&&context?.state==='playing'){
      this.repairCompletion=false;this.resumed=true;this.commitCompletion();return;
    }
    const canRun=context?.state==='playing'&&context?.form==='soul'&&this.inRange;
    if(this.phase!=='complete'){
      if(canRun){
        const first=!this.started;this.phase='active';this.started=true;
        this.nearbySwitchId=this.nearestSwitch(context.soul);
        if(first){this.rememberPending();this.emit('start');}
      }else{
        this.phase=this.started?'suspended':'idle';this.nearbySwitchId=null;
      }
    }else this.nearbySwitchId=null;
  }
  emit(type,target){
    if(this.destroyed||typeof this.onEvent!=='function')return;
    this.onEvent({type,sceneId:this.config.id,variant:this.variant,...(Number.isInteger(target)?{stepIndex:target}:{}),completedSteps:[...this.delivered].sort(),switches:this.switchCount,activeSeconds:Math.round(this.activeSeconds*1000)/1000,resumed:this.resumed,attemptId:this.attemptId,...this.meta});
  }
  rememberPending(){
    this.record.pending={variant:this.variant,completedSteps:[...this.delivered].sort(),attemptId:this.attemptId};
    if(this.variant===0)this.record.completedSteps=indexes([...this.record.completedSteps,...this.delivered]);
  }
  commitCompletion(){
    if(this.destroyed||this.phase!=='complete'||this.completeSent)return;
    this.completeSent=true;this.repairCompletion=false;
    this.record.completedVariants=indexes([...this.record.completedVariants,this.variant]);
    if(this.variant===0)this.record.completedSteps=[0,1,2];
    this.record.pending=null;
    this.emit('complete');
  }
  pulse(soul){
    if(this.destroyed||this.phase!=='active'||!this.inRange||this.context?.state!=='playing'||this.context?.form!=='soul')return false;
    const id=this.nearestSwitch(soul);if(!id)return false;
    this.switches[id]=1-this.switches[id];this.switchCount=Math.min(99999,this.switchCount+1);this.nearbySwitchId=id;return true;
  }
  beginRoute(id){
    const route=this.routes[id];if(!route)return;
    const start=route.points[0],next=pointOnCapRoute(route.points,.01);
    this.traveler={...this.traveler,x:start.x,y:start.y,angle:Math.atan2(next.y-start.y,next.x-start.x),routeId:id,progress:0,state:route.kind==='return'?'returning':'moving'};
  }
  arrive(route){
    if(this.destroyed||this.phase!=='active')return;
    if(route.to==='a'){this.beginRoute(this.switches.a===0?'a-0':'a-b');return;}
    if(route.to==='b'){this.beginRoute(this.switches.b===0?'b-1':'b-2');return;}
    if(route.to==='source'){
      this.traveler.routeId=null;this.traveler.state='parked';this.traveler.carrying=true;this.wait=.45;return;
    }
    const destination=this.nodes[route.to],correct=destination?.index===this.targetIndex;
    this.traveler.routeId=null;this.traveler.state='waiting';this.wait=correct?.45:.75;this.pendingRoute='return-'+destination.index;
    if(!correct){this.emit('wrong',destination.index);return;}
    const target=destination.index;this.delivered.add(target);this.traveler.carrying=false;
    const complete=this.delivered.size===3;
    if(complete){this.phase='complete';this.pendingRoute=null;this.wait=0;this.traveler.state='parked';this.nearbySwitchId=null;}
    this.rememberPending();const attempt=this.attemptId;
    this.emit('step',target);
    if(complete&&!this.destroyed&&this.attemptId===attempt)this.commitCompletion();
  }
  update(dt,context){
    if(this.destroyed)return;
    this.refresh(context);
    if(this.destroyed||this.phase!=='active')return;
    dt=clamp(finite(dt),0,.04);if(!dt)return;
    this.activeSeconds=Math.min(360000,this.activeSeconds+dt);
    if(this.wait>0){this.wait=Math.max(0,this.wait-dt);return;}
    if(this.pendingRoute){const route=this.pendingRoute;this.pendingRoute=null;this.beginRoute(route);}
    else if(this.traveler.state==='parked')this.beginRoute('source-a');
    const route=this.routes[this.traveler.routeId];if(!route)return;
    const speed=route.kind==='return'?125:87;
    this.traveler.progress=clamp(this.traveler.progress+dt*speed/route.length,0,1);
    const position=pointOnCapRoute(route.points,this.traveler.progress),before=pointOnCapRoute(route.points,Math.max(0,this.traveler.progress-.006));
    this.traveler.x=position.x;this.traveler.y=position.y;
    if(distance(position,before)>.00001)this.traveler.angle=Math.atan2(position.y-before.y,position.x-before.x);
    if(this.traveler.progress>=1)this.arrive(route);
  }
  recover(context){
    if(this.destroyed)return;
    this.resetTraveler();this.pendingRoute=null;this.wait=.65;this.nearbySwitchId=null;
    if(this.phase!=='complete')this.phase=this.started?'suspended':'idle';
    this.refresh(context);
  }
  replay(context){
    if(this.destroyed||this.phase!=='complete'||context?.state!=='playing'||context?.form!=='body'||!this.bodyInRange(context.body))return false;
    this.variant=[0,1,2].find(variant=>!this.record.completedVariants.includes(variant))??(this.variant+1)%3;this.attempt++;this.attemptId=this.sessionId+'-'+this.attempt;
    this.delivered=new Set();this.resumed=false;this.phase='idle';this.started=false;this.completeSent=false;this.repairCompletion=false;this.switchCount=0;this.activeSeconds=0;this.switches={a:1,b:1};this.wait=.65;this.pendingRoute=null;this.resetTraveler();this.rememberPending();this.refresh(context);return true;
  }
  getHint(context=this.context){
    if(this.destroyed)return '';
    if(!this.bodyInRange(context?.body))return context?.form==='body'&&this.nearRing(context.body)?'走进发光圆环，E 借出脑内小景':'';
    if(this.phase==='complete')return context.form==='body'?'Q：再借一景 · 换一条送达顺序':'E 归位后，圈内 Q 再借一景';
    if(context.form==='body')return this.started?'E：继续借景，已送达的会等你':'E：掀开头盖骨，把小景借出来';
    const nearby=this.nearestSwitch(context.soul);
    return nearby?'空格 / Q：转动导向铃 '+nearby.toUpperCase():'飞近导向铃 · '+this.targetLabel;
  }
  getSnapshot(){
    if(this.destroyed)return null;
    return {id:this.config.id,phase:this.phase,completedSteps:this.delivered.size,totalSteps:3,targetLabel:this.targetLabel,nearbySwitchId:this.nearbySwitchId,variant:this.variant,nearRing:this.nearRing(),hint:this.getHint()};
  }
  getView(){
    if(this.destroyed)return null;
    const active=this.phase==='active',destinations=[0,1,2].map(index=>{
      const node=this.nodes['destination-'+index],definition=this.config?.destinations?.[index];
      return {...node,id:definition?.id||node.id,nodeId:node.id,label:definition?.label||'第 '+(index+1)+' 站',complete:this.delivered.has(index)};
    });
    const switches=['a','b'].map(id=>({...this.nodes[id],selected:this.switches[id],routeIndex:this.switches[id],nearby:active&&this.nearbySwitchId===id,reachable:active,outputs:(id==='a'?['a-0','a-b']:['b-1','b-2']).map(routeId=>{const route=this.routes[routeId],to=this.nodes[route.to];return {routeId,to:route.to,...(Number.isInteger(to.index)?{targetIndex:to.index}:{})};})}));
    const routes=this.layout.routes.map(route=>({...route,points:route.points.map(p=>({...p})),selected:route.kind==='trunk'||(route.kind==='choice'&&this.switches[route.switchId]===route.selection),active:active&&this.traveler.routeId===route.id}));
    return {id:this.config.id,sceneId:this.config.id,title:this.config.title,motif:this.config.motif,color:this.config.color,accent:this.config.accent,ringLabel:this.config.ringLabel,phase:this.phase,active,completed:this.phase==='complete',anchor:{...this.layout.anchor,inRange:this.inRange},origin:{x:this.layout.anchor.x,y:this.layout.anchor.y},variant:this.variant,targetIndex:this.targetIndex,targetLabel:this.targetLabel,completedSteps:[...this.delivered].sort(),delivered:[0,1,2].map(index=>this.delivered.has(index)),nodes:this.layout.nodes.map(node=>({...node})),routes,switches,bells:switches,destinations,targets:destinations,traveler:{...this.traveler,kind:this.config.traveler,visible:active,targetIndex:this.targetIndex},hint:this.getHint()};
  }
  destroy(){this.destroyed=true;this.phase='destroyed';this.context=null;this.nearbySwitchId=null;this.pendingRoute=null;this.wait=0;this.traveler=null;this.onEvent=null;}
}
