// Borrowed moonlight, painted in world coordinates. The controller supplies
// every beam segment and target state; drawing never advances the puzzle.
const TAU = Math.PI * 2;
const FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const P = Object.freeze({ ink:'#342b3d', shadow:'#292535', brass:'#b69a78', gold:'#e1c396', paper:'#f3e4c7', glass:'#bcd8e5', rose:'#bd8da8', mint:'#acd3c3' });
const PALETTES = Object.freeze([
  { light:'#eacf9f', accent:'#c3b9e9', cloth:'#a7809c' },
  { light:'#e8c6a3', accent:'#aed1d3', cloth:'#95b4c0' },
  { light:'#efce94', accent:'#c9b4da', cloth:'#a69dc5' },
]);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const finite = (n,fallback=0) => Number.isFinite(n)?n:fallback;
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const ease = n => { n=clamp(n,0,1); return n*n*(3-2*n); };

function shape(c,draw,fill=null,stroke=null,width=1) {
  c.beginPath(); draw(c);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function line(c,points,color,width=1) {
  shape(c,p=>points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y)),null,color,width);
}
function oval(c,x,y,rx,ry,fill,stroke=null,width=1,angle=0) {
  shape(c,p=>p.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),angle,0,TAU),fill,stroke,width);
}
function box(c,x,y,w,h,fill,r=2,stroke=null,width=1) {
  shape(c,p=>p.roundRect(x,y,w,h,r),fill,stroke,width);
}
function curve(c,points,color,width=1) {
  shape(c,p=>{p.moveTo(points[0],points[1]);p.bezierCurveTo(...points.slice(2));},null,color,width);
}
function star(c,x,y,r,fill,stroke=null,width=1) {
  shape(c,p=>{
    p.moveTo(x,y-r);
    for(const [dx,dy] of [[.25,-.25],[1,0],[.25,.25],[0,1],[-.25,.25],[-1,0],[-.25,-.25]])p.lineTo(x+dx*r,y+dy*r);
    p.closePath();
  },fill,stroke,width);
}
function crescent(c,x,y,r,color) {
  shape(c,p=>{
    p.moveTo(x+r*.44,y-r*.89);
    p.bezierCurveTo(x-r*.42,y-r*.71,x-r*.62,y+r*.29,x+r*.52,y+r*.83);
    p.bezierCurveTo(x-r*1.38,y+r*.88,x-r*1.38,y-r*.88,x+r*.44,y-r*.89);
  },color);
}
function wash(c,x,y,r,color,alpha=.18) {
  if(r<=0)return;
  c.save();c.globalAlpha*=alpha;
  const g=c.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color+'cc');g.addColorStop(.32,color+'65');g.addColorStop(1,color+'00');
  oval(c,x,y,r,r,g);c.restore();
}
function text(c,value,x,y,size=11,color=P.paper,weight='500') {
  c.font=`${weight} ${size}px ${FONT}`;c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(String(value),x,y);
}

function drawFooting(c,view,palette) {
  const {x,y}=view.anchor,near=!!view.near;
  c.save();
  oval(c,x,y-1,49,6,P.shadow+'70',near?palette.light+'c0':P.brass+'8c',near?1.65:1.2);
  oval(c,x,y-1,40,3.5,null,palette.accent+(near?'80':'45'),.7);
  for(const side of [-1,1]){
    line(c,[[x+side*51,y-1],[x+side*58,y-1]],P.brass,1.4);
    star(c,x+side*62,y-1,2.2,near?palette.light:P.brass);
  }
  crescent(c,x-35,y-1,3.3,palette.light);
  // A low sign sits beside the player's feet, never over the character.
  const sx=x+63;
  box(c,sx-1,y-29,55,20,P.shadow+'e8',4,P.brass+'99',.8);
  text(c,'借月追光',sx+26,y-19,10,near?P.paper:'#b6a6b5');
  line(c,[[sx+9,y-9],[sx+9,y-3]],P.brass,1.2);
  c.restore();
}

function drawMirror(c,view,palette,t,reduced) {
  const {anchor,mirror}=view,x=mirror.x,y=mirror.y,near=!!view.near,live=!!(view.illuminated??view.active);
  c.save();
  // The slender offset stand leaves room for Ashi beneath the mirror.
  curve(c,[x-11,y+19,x-35,y+58,anchor.x-30,anchor.y-55,anchor.x-31,anchor.y-14],P.shadow,5.5);
  curve(c,[x-11,y+19,x-35,y+58,anchor.x-30,anchor.y-55,anchor.x-31,anchor.y-14],P.brass,2.2);
  curve(c,[x-10,y+19,x-31,y+60,anchor.x-26,anchor.y-58,anchor.x-28,anchor.y-15],P.paper+'4d',.75);
  oval(c,anchor.x-31,anchor.y-12,15,3,P.shadow,P.brass,1.1);
  line(c,[[anchor.x-31,anchor.y-21],[anchor.x-42,anchor.y-9],[anchor.x-19,anchor.y-9]],P.brass,1.5);
  oval(c,x,y,24,24,null,P.brass+(near?'94':'55'),1.15);
  for(let i=0;i<3;i++){
    const a=(Array.isArray(mirror.angles)?mirror.angles[i]:Math.PI/4+i*Math.PI/4);
    if(!Number.isFinite(a))continue;
    const chosen=i===mirror.index;
    oval(c,x+Math.cos(a)*29,y+Math.sin(a)*29,chosen?2.4:1.5,chosen?2.4:1.5,chosen?palette.light:P.brass+'77');
  }
  if(live)wash(c,x,y,35,palette.accent,.21);
  c.save();c.translate(x,y);c.rotate(finite(mirror.angle,Math.PI/4));
  oval(c,0,0,27,7.5,P.shadow,P.brass,1.7);
  oval(c,0,-1,23.5,4.4,near?'#afc8d7':'#687582',P.paper+(near?'b0':'60'),.9);
  line(c,[[-20,-1],[20,-1]],near?'#edf0df':'#b4bec4',1.45);
  line(c,[[-14,1],[0,1]],'#e8edee88',.7);
  for(const side of [-1,1]){
    oval(c,side*27,0,2.5,3.6,P.brass,P.paper+'77',.6);
    line(c,[[side*30,0],[side*34,0]],P.brass,1.8);
  }
  c.restore();
  if(view.canTurn){
    box(c,x+35,y+8,22,19,P.paper,4,P.brass,.8);
    text(c,'Q',x+46,y+18,11,P.ink,'700');
    shape(c,p=>{p.arc(x+45,y-8,6,-2.6,1.1);},null,palette.light,1.2);
    line(c,[[x+48,y-2],[x+45,y-2],[x+46,y-5]],palette.light,1.1);
  }else if(near){
    text(c,'月镜',x,y+43,10,P.paper);
  }
  if(live&&view.beam?.length>=3){
    const glint=reduced?1:.9+Math.sin(t*2.1)*.1;
    c.save();c.globalAlpha*=.8;star(c,x,y,4.3*glint,P.paper);c.restore();
  }
  c.restore();
}

function arrow(c,a,b,q,color) {
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<30)return;
  const x=a.x+dx*q,y=a.y+dy*q,angle=Math.atan2(dy,dx);
  c.save();c.translate(x,y);c.rotate(angle);
  line(c,[[-4,-2.7],[0,0],[-4,2.7]],color,1.1);c.restore();
}
function drawBeam(c,view,palette,t,reduced) {
  const beam=view.beam;
  if(!(view.illuminated??view.active)||!Array.isArray(beam)||beam.length<2||!beam.every(point))return;
  c.save();
  for(let i=1;i<beam.length;i++){
    const a=beam[i-1],b=beam[i],color=i===1?palette.accent:palette.light;
    // Finite, supplied segments only: no decorative line can claim a hit.
    line(c,[[a.x,a.y],[b.x,b.y]],color+'0d',13);
    line(c,[[a.x,a.y],[b.x,b.y]],color+'24',5);
    line(c,[[a.x,a.y],[b.x,b.y]],color+'b8',1.3);
    line(c,[[a.x,a.y],[b.x,b.y]],P.paper+'8c',.5);
    arrow(c,a,b,.5,color+'dc');
    if(!reduced){const q=(finite(t)*.23+i*.17)%1;oval(c,a.x+(b.x-a.x)*q,a.y+(b.y-a.y)*q,1.5,1.5,P.paper+'c0');}
  }
  c.restore();
}

function windowScene(c,p,palette) {
  box(c,-20,-25,40,44,P.brass,3,P.paper+'88',.8);
  box(c,-16.5,-21.5,33,37,'#4f506a',1);
  wash(c,0,-5,24,palette.light,.42*p);
  crescent(c,7,-11,7,palette.light);
  line(c,[[-14,12],[-6,7],[3,10],[14,4]],palette.accent+'b0',1.1);
  line(c,[[0,-21],[0,16]],P.paper,1.3);line(c,[[-16,-3],[16,-3]],P.paper,1.1);
  for(const side of [-1,1]){
    const spread=2+10*p;
    shape(c,q=>{q.moveTo(side*18,-22);q.lineTo(side*(18+spread),-20);q.lineTo(side*(18+spread),17);q.lineTo(side*18,16);q.closePath();},palette.cloth,P.brass,.8);
    line(c,[[side*(20+spread*.35),-17],[side*(20+spread*.35),12]],P.paper+'45',.7);
  }
  box(c,-24,18,48,4,P.brass,1);
  box(c,-6,13,10,5,'#bd949e',1);line(c,[[-1,13],[-1,5]],P.mint,1);oval(c,-3,7,3,1.5,P.mint);
}
function bellScene(c,p,palette) {
  const y=2-(1-p)*8;
  curve(c,[-21,-20,-10,-29,10,-29,21,-20],P.brass,1.8);
  for(const [x,end] of [[-13,2],[0,12],[13,5]]){
    line(c,[[x,-23],[x,end-9+y]],P.paper+'9c',.8);
    shape(c,q=>{q.moveTo(x-5,end+y);q.quadraticCurveTo(x-3,end-3+y,x-3,end-6+y);q.bezierCurveTo(x-3,end-12+y,x+3,end-12+y,x+3,end-6+y);q.quadraticCurveTo(x+3,end-3+y,x+5,end+y);q.closePath();},palette.light,P.brass,.7);
    oval(c,x,end+y,5,1.3,P.brass);oval(c,x,end+2+y,1.3,1.6,P.paper);
  }
  line(c,[[0,17],[0,22]],P.brass,.8);box(c,-4,22,8,10,palette.cloth,1);line(c,[[-2,25],[2,25]],P.paper,.6);
}
function birdScene(c,p,palette) {
  const spread=5+16*p;
  shape(c,q=>{q.moveTo(-2,6);q.lineTo(-spread,-17);q.lineTo(0,-5);q.lineTo(spread+5,-22);q.lineTo(10,4);q.lineTo(24,9);q.lineTo(9,13);q.lineTo(-5,17);q.lineTo(-16,9);q.closePath();},P.paper,P.brass,.9);
  line(c,[[-2,6],[0,-5],[9,13]],palette.cloth,1);line(c,[[0,-5],[spread+5,-22]],P.brass,.8);
  shape(c,q=>{q.moveTo(-3,6);q.lineTo(-22,1);q.lineTo(-13,11);q.closePath();},palette.accent,P.brass,.8);
  oval(c,14,8,1,1,P.ink);curve(c,[-21,22,-9,27,9,29,24,22],palette.accent+'a0',.9);
}
function boatScene(c,p,palette) {
  const sail=.3+.7*p;
  line(c,[[-3,9],[-3,-27]],P.brass,1.5);
  shape(c,q=>{q.moveTo(-5,-25);q.lineTo(-5,7);q.lineTo(-25*sail,7);q.closePath();},P.paper,P.brass,.8);
  shape(c,q=>{q.moveTo(0,-21);q.lineTo(20*sail,5);q.lineTo(0,5);q.closePath();},palette.cloth,P.paper+'80',.7);
  shape(c,q=>{q.moveTo(-27,9);q.lineTo(26,9);q.lineTo(14,22);q.lineTo(-16,22);q.closePath();},palette.accent,P.brass,.9);
  line(c,[[-19,13],[18,13]],P.paper,.9);
  for(let i=0;i<2;i++)curve(c,[-29,26+i*5,-9,20+i*5,7,34+i*5,29,25+i*5],palette.accent+'a0',.8);
}
function kiteScene(c,p,palette) {
  const spread=.55+.45*p;
  c.save();c.scale(spread,1);
  shape(c,q=>{q.moveTo(0,-31);q.lineTo(23,-8);q.lineTo(0,15);q.lineTo(-18,-8);q.closePath();},P.paper,P.brass,.9);
  shape(c,q=>{q.moveTo(0,-31);q.lineTo(23,-8);q.lineTo(0,-8);q.closePath();},palette.cloth);
  shape(c,q=>{q.moveTo(0,-8);q.lineTo(0,15);q.lineTo(-18,-8);q.closePath();},palette.accent);
  line(c,[[0,-31],[0,15]],P.brass,.8);line(c,[[-18,-8],[23,-8]],P.brass,.8);c.restore();
  curve(c,[0,15,-9,28,16,25,6,36],P.paper+'ba',.8);
  for(const [x,y] of [[0,22],[7,30]])shape(c,q=>{q.moveTo(x-4,y-2);q.lineTo(x+4,y+2);q.lineTo(x+4,y-2);q.lineTo(x-4,y+2);q.closePath();},palette.cloth);
}
function starScene(c,p,palette) {
  line(c,[[0,-32],[0,-24]],P.brass,.8);
  c.save();c.scale(.6+.4*p,.6+.4*p);
  shape(c,q=>{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?11:26;i?q.lineTo(Math.cos(a)*r,Math.sin(a)*r):q.moveTo(Math.cos(a)*r,Math.sin(a)*r);}q.closePath();},palette.light,P.brass,1);
  for(let i=0;i<5;i++){const a=-Math.PI/2+i*TAU/5;line(c,[[0,0],[Math.cos(a)*24,Math.sin(a)*24]],P.paper+'86',.7);}
  oval(c,0,0,4.3,4.3,P.paper,P.brass,.7);c.restore();
  for(const side of [-1,1])star(c,side*29,side*8,2.8,palette.accent);
}
function lanternScene(c,p,palette) {
  shape(c,q=>{q.arc(0,-23,7,Math.PI,0);},null,P.brass,1.3);
  const wide=10+10*p;
  oval(c,0,-3,wide,24,palette.cloth,P.brass,.9);
  for(const side of [-1,1])shape(c,q=>{q.ellipse(0,-3,wide*.55,24,0,side<0?Math.PI/2:-Math.PI/2,side<0?Math.PI*1.5:Math.PI/2);},null,P.paper+'88',.7);
  box(c,-10,-28,20,4,P.brass,1);box(c,-9,20,18,4,P.brass,1);
  star(c,0,-3,8,palette.light);line(c,[[0,24],[0,30]],P.brass,1);line(c,[[-3,30],[3,30]],palette.light,1.2);
  for(const x of [-2,0,2])line(c,[[x,30],[x,36]],palette.cloth,.9);
}
function roofScene(c,p,palette) {
  box(c,-21,-8,42,34,'#6e5a70',2,P.brass,.8);
  shape(c,q=>{q.moveTo(-30,-8);q.lineTo(-3,-28);q.lineTo(28,-8);q.closePath();},palette.cloth,P.brass,1.2);
  line(c,[[-32,-7],[30,-7]],P.paper,1.5);
  for(let i=0;i<4;i++)line(c,[[-21+i*12,-12],[ -12+i*12,-12]],P.paper+'60',.7);
  box(c,-12,0,23,22,P.ink,2,P.brass,.8);wash(c,0,12,15,palette.light,.45*p);
  box(c,-9,3,17,17,palette.light+(p>.3?'b8':'50'),1);line(c,[[0,3],[0,20]],P.paper,1);line(c,[[-9,11],[8,11]],P.paper,1);
  box(c,-26,26,52,4,P.brass,1);box(c,15,-30,6,15,P.brass,1);
}
function moonfishScene(c,p,palette) {
  c.save();c.scale(.65+.35*p,.8+.2*p);
  shape(c,q=>{q.moveTo(-27,0);q.bezierCurveTo(-15,-22,13,-22,21,-5);q.lineTo(34,-16);q.lineTo(30,0);q.lineTo(34,15);q.lineTo(20,6);q.bezierCurveTo(6,23,-17,18,-27,0);q.closePath();},palette.accent,P.brass,.85);
  shape(c,q=>{q.moveTo(-23,4);q.bezierCurveTo(-9,10,9,10,20,5);q.bezierCurveTo(6,20,-15,18,-23,4);},P.paper+'c4');
  oval(c,-16,-3,1.8,2.1,P.ink);oval(c,-15.5,-4,.6,.7,P.paper);
  crescent(c,2,-5,9,palette.light);curve(c,[-2,11,2,18,9,17,12,11],P.brass,.9);c.restore();
  for(const [x,y,r] of [[-31,-11,2],[-35,-20,2.8],[-28,-29,1.7]])oval(c,x,y,r,r,null,palette.accent+'99',.8);
}
const SCENES=Object.freeze({window:windowScene,bell:bellScene,bird:birdScene,boat:boatScene,kite:kiteScene,star:starScene,lantern:lanternScene,roof:roofScene,moonfish:moonfishScene});

function drawTarget(c,target,index,palette,reduced) {
  if(!point(target))return;
  const lit=target.lit===true,charge=clamp(finite(target.charge),0,1);
  const p=lit?(reduced?1:ease(finite(target.unfoldProgress,1))):0;
  c.save();c.translate(target.x,target.y);
  if(lit)wash(c,0,0,47,palette.light,.12+.15*p);
  oval(c,0,0,31,31,P.shadow+(lit?'28':'85'),lit?palette.light+'80':palette.accent+'88',.8);
  if(!lit){
    // A thin hollow orbit and numeral distinguish an unlit receiver even in
    // grayscale. All nine silhouettes differ before their paper opens.
    c.save();c.globalAlpha*=.32;(SCENES[target.kind]||starScene)(c,0,palette);c.restore();
    oval(c,0,0,6.7,6.7,P.ink,palette.accent,1);
    text(c,index+1,0,.3,8.5,P.paper,'600');
    if(charge>0){
      shape(c,q=>q.arc(0,0,34,-Math.PI/2,-Math.PI/2+TAU*charge),null,palette.light,2.7);
      star(c,Math.sin(TAU*charge)*34,-Math.cos(TAU*charge)*34,2.4,P.paper);
    }
  }else{
    c.save();c.globalAlpha*=.55+.45*p;c.translate(0,4*(1-p));
    (SCENES[target.kind]||starScene)(c,p,palette);c.restore();
    // Completion is a quiet check, rather than a permanent flashing pulse.
    oval(c,27,-26,5.7,5.7,P.ink,palette.light,1);
    line(c,[[24.3,-26],[26.3,-23.8],[29.7,-28.2]],P.paper,1.2);
  }
  const label=typeof target.label==='string'?target.label:'月光';
  const width=Math.max(32,Math.min(116,label.length*10+14));
  box(c,-width/2,39,width,17,P.shadow+'e0',4,P.brass+(lit?'99':'45'),.7);
  text(c,label,0,47.5,10,lit?P.paper:'#c4b6c5');
  c.restore();
}

export function drawMoonPlay(c,view,t=0,reducedMotion=false) {
  if(!c||!view||!point(view.anchor)||!point(view.mirror))return;
  const variant=Number.isInteger(view.variant)?clamp(view.variant,0,2):0,palette=PALETTES[variant];
  const reduced=!!reducedMotion||!!view.reducedMotion;
  // Use simulation time supplied by the moon controller. Paused moonlight
  // stays exactly where it was even if a parent keeps rendering its canvas.
  const clock=finite(view.clock);
  // The caller's state, clipping, dash and transform must survive unchanged.
  c.save();c.lineCap='round';c.lineJoin='round';c.setLineDash([]);
  drawFooting(c,view,palette);
  const detailed=!!view.near||!!(view.illuminated??view.active);
  if(detailed){
    drawBeam(c,view,palette,clock,reduced);
    (Array.isArray(view.targets)?view.targets:[]).forEach((target,i)=>drawTarget(c,target,i,palette,reduced));
  }
  drawMirror(c,view,palette,clock,reduced);
  if(detailed&&view.complete){
    const x=view.anchor.x-70,y=view.anchor.y-27;
    box(c,x-55,y-9,110,18,P.shadow+'e8',5,P.brass+'99',.8);
    text(c,view.canAdvance?'Q · 换一幕月光':'三处小景都亮了',x,y,10,P.paper);
  }
  c.restore();
}
