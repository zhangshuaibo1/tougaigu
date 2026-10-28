// A thank-you becomes a small, finished place. The controller alone decides
// whether it exists and supplies its clock; this painter never starts a timer,
// infers an owner, changes a save, or consults an unseen evidence face.
const TAU=Math.PI*2;
const INK='#493e53',NIGHT='#23313a',CREAM='#f7e7c5',GOLD='#e8c18a',MINT='#b9e4cb',ROSE='#dca7b4';
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const phase=(seconds,start,duration)=>smooth((seconds-start)/duration);
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const kinds=new Set(['train','candy','window','sprout','echo','table']);

function ellipse(c,x,y,rx,ry,fill,rotation=0){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),rotation,0,TAU);c.fillStyle=fill;c.fill();}
function line(c,points,color,width=1){if(!points.length)return;c.beginPath();c.moveTo(...points[0]);for(const point of points.slice(1))c.lineTo(...point);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function curve(c,points,color,width=1){c.beginPath();c.moveTo(points[0],points[1]);c.bezierCurveTo(...points.slice(2));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function shape(c,points,fill,edge=null,width=.7){c.beginPath();c.moveTo(...points[0]);for(const point of points.slice(1))c.lineTo(...point);c.closePath();c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}}
function box(c,x,y,w,h,fill,r=2,edge=null,width=.7){c.beginPath();c.roundRect(x,y,Math.max(0,w),Math.max(0,h),r);c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}}
function ring(c,x,y,r,color,width=.8){c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function star(c,x,y,r,fill){shape(c,[[x,y-r],[x+r*.3,y-r*.3],[x+r,y],[x+r*.3,y+r*.3],[x,y+r],[x-r*.3,y+r*.3],[x-r,y],[x-r*.3,y-r*.3]],fill);}
function leaf(c,x,y,w,h,fill,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(-w,0);c.bezierCurveTo(-w*.3,-h,w*.7,-h,w,0);c.bezierCurveTo(w*.3,h,-w*.7,h,-w,0);c.fillStyle=fill;c.fill();line(c,[[-w*.7,0],[w*.7,0]],CREAM+'aa',.55);c.restore();}
function heart(c,x,y,r,fill){c.beginPath();c.moveTo(x,y+r);c.bezierCurveTo(x-r*1.7,y-r*.2,x-r*.8,y-r*1.5,x,y-r*.4);c.bezierCurveTo(x+r*.8,y-r*1.5,x+r*1.7,y-r*.2,x,y+r);c.fillStyle=fill;c.fill();}
function envelope(c,x,y,w=13,h=9,fill=CREAM){box(c,x-w/2,y-h/2,w,h,fill,1,'#a18b83',.55);line(c,[[x-w/2,y-h/2],[x,y+1],[x+w/2,y-h/2]],'#af968c',.6);}
function glimmer(c,x,y,r,amount,color=GOLD){if(amount<=0)return;star(c,x,y,r*(.35+.65*amount),color);}

function theatreBase(c,reveal,accent){
  c.save();c.globalAlpha*=reveal;
  const glow=c.createRadialGradient(0,15,2,0,15,48);glow.addColorStop(0,accent+'25');glow.addColorStop(1,accent+'00');ellipse(c,0,11,49,20,glow);
  ellipse(c,0,28,49,3.5,'#14242b70');
  // The ivory bow, brass hinge and fine opening seam echo Ashi's raised lid.
  curve(c,[-46,24,-28,31,29,31,46,24],'#e8cc9c',1.4);
  curve(c,[-42,25,-23,29,23,29,42,25],CREAM+'9c',.65);
  box(c,-48,22,4,5,GOLD,1,'#9b7d64',.5);line(c,[[-46,22],[-46,27]],CREAM,.7);
  box(c,44,22,4,5,GOLD,1,'#9b7d64',.5);ellipse(c,46,24.5,.7,.7,INK);
  c.restore();
}

function wheel(c,x,y,angle){ellipse(c,x,y,3.7,3.7,'#695464');ellipse(c,x,y,2.6,2.6,GOLD);line(c,[[x-Math.cos(angle)*2,y-Math.sin(angle)*2],[x+Math.cos(angle)*2,y+Math.sin(angle)*2]],INK,.6);ellipse(c,x,y,.7,.7,CREAM);}
function train(c,s,view){
  const arrive=phase(s,.83,1.5),unfold=phase(s,.7,.6),warm=phase(s,1.8,.9),v=view.variant===1;
  c.save();c.globalAlpha*=unfold;
  ellipse(c,0,21,44,3.4,'#26333b');line(c,[[-44,17],[44,17]],'#b7a381',1);line(c,[[-44,23],[44,23]],'#b7a381',1);
  for(let x=-39;x<=39;x+=8)line(c,[[x,17],[x-2,23]],'#9a8578',.7);
  // A station canopy unfolds before the returning train arrives.
  c.save();c.translate(30,15);c.scale(1,unfold);line(c,[[-11,0],[-11,-34],[11,-34],[11,0]],'#b6aa8c',1.1);
  shape(c,[[-18,-31],[0,-41],[18,-31]],'#70988f','#c4cfb3',.8);line(c,[[-12,-31],[12,-31]],CREAM+'77',.7);
  if(v){box(c,-8,-8,16,3,'#bf9b81',1);line(c,[[-6,-5],[-6,0],[6,0],[6,-5]],'#8f8b7b',1);envelope(c,0,-12,9,6,'#f4dfb6');}
  else{box(c,-7,-27,14,14,'#c6b696',2,'#79958a',.8);box(c,-4,-24,8,8,GOLD,1);line(c,[[0,-24],[0,-16]],CREAM,.7);line(c,[[-4,-20],[4,-20]],CREAM,.7);}
  c.restore();
  c.save();const tx=-35+arrive*43;c.translate(tx,10);
  box(c,-16,-14,18,14,'#92bbae',2,'#587b75',.8);box(c,-14,-12,14,7,'#f0dfb9',1);line(c,[[-7,-12],[-7,-5]],'#c5ac86',.65);
  box(c,1,-12,18,12,'#c9a68c',2,'#8d6d6a',.8);box(c,5,-24,13,14,'#8b7e9e',2,'#695a7d',.8);
  box(c,8,-21,7,7,'#f6dca5',1);box(c,3,-26,17,3,CREAM,1);box(c,20,-17,4,12,'#826a7e',1);ellipse(c,22,-18,3.2,1.3,GOLD);
  shape(c,[[24,-1],[30,4],[23,4]],'#ccab8c','#a28777',.6);line(c,[[-18,1],[25,1]],'#ebcf9e',1.5);
  wheel(c,-11,4,arrive*8);wheel(c,0,4,arrive*8);wheel(c,13,4,arrive*8);wheel(c,22,4,arrive*8);
  // The last steam puff becomes a little light, then remains quiet.
  const puff=Math.sin(Math.PI*phase(s,1.02,1.4));
  if(puff>.01){ellipse(c,23,-22-puff*3,2.6,2.2,CREAM+'a8');ellipse(c,29,-25,2,1.6,CREAM+'60');}
  c.restore();glimmer(c,-36,-18,2.2,warm);c.restore();
}

function tinyChair(c,x,y,fill=GOLD){box(c,x-5,y-9,10,9,fill,2,'#9e7b70',.7);box(c,x-6,y,12,3,fill,1,'#9e7b70',.6);line(c,[[x-4,y+3],[x-5,y+9],[x+5,y+9],[x+4,y+3]],'#a78c78',.9);}
function candy(c,s,view){
  const grow=phase(s,.7,.62),invite=phase(s,1.15,1.3),spark=phase(s,2,.8),v=view.variant===1;
  c.save();c.globalAlpha*=grow;
  // A translucent jar opens; a wrapped sweet follows a finite invitation arc.
  c.save();c.translate(-25,7);c.scale(1,grow);
  c.beginPath();c.moveTo(-12,-21);c.lineTo(12,-21);c.lineTo(15,12);c.quadraticCurveTo(0,17,-15,12);c.closePath();c.fillStyle='#c3b4bf';c.fill();c.strokeStyle='#f2dec1';c.lineWidth=.9;c.stroke();
  c.beginPath();c.moveTo(-10,-18);c.lineTo(10,-18);c.lineTo(12,9);c.quadraticCurveTo(0,13,-12,9);c.closePath();c.fillStyle='#80788f';c.fill();
  for(const [x,y,color]of[[-7,5,GOLD],[5,3,ROSE],[0,-8,MINT]]){ellipse(c,x,y,3.2,3.2,color);shape(c,[[x-3,y],[x-6,y-2],[x-6,y+2]],color);shape(c,[[x+3,y],[x+6,y-2],[x+6,y+2]],color);}
  c.save();c.translate(11,-21);c.rotate(-invite*.65);box(c,-25,-4,27,5,'#dbc5a8',2,'#a28a7c',.8);ellipse(c,-10,-5,5,1.6,'#ead7b5');c.restore();
  curve(c,[-8,-16,-11,-5,-8,4,-9,8],'#fff2d6b8',1.2);c.restore();
  c.save();c.translate(28,14);c.scale(invite,invite);
  if(v){shape(c,[[-14,-12],[13,-12],[15,7],[-15,7]],'#ae8198','#ddc2b6',.8);curve(c,[-13,-11,-9,-27,8,-27,12,-11],GOLD,1.3);envelope(c,0,-2,17,11,'#eddbbb');heart(c,0,-1,2.6,ROSE);}
  else{tinyChair(c,0,0,'#c8aa8e');box(c,-9,-18,18,12,'#f0dfb9',1,'#b5a086',.8);heart(c,0,-12,3.1,ROSE);}
  c.restore();
  const path=phase(s,1.2,1.1),x=-13+path*41,y=-4-Math.sin(path*Math.PI)*20+path*8;
  if(path<1){c.save();c.translate(x,y);c.rotate(path*TAU*.35);ellipse(c,0,0,3.7,3.7,'#d6bdd2');shape(c,[[-3,0],[-7,-2],[-7,2]],ROSE);shape(c,[[3,0],[7,-2],[7,2]],ROSE);star(c,0,0,1.9,CREAM);c.restore();}
  else{ellipse(c,28,view.variant===1?6:12,3.6,3.6,'#dfb8bf');star(c,28,view.variant===1?6:12,1.7,CREAM);}
  glimmer(c,10,-18,2.7,spark,MINT);glimmer(c,42,-12,2,spark);c.restore();
}

function paperWindow(c,s,view){
  const unfold=phase(s,.7,1.02),warm=phase(s,1.5,.9),lift=phase(s,1.88,.85),v=view.variant===1;
  c.save();c.globalAlpha*=phase(s,.7,.28);
  c.save();c.translate(0,16);c.scale(1,Math.max(.05,unfold));
  shape(c,[[-23,-39],[19,-39],[24,-33],[24,9],[-24,9]],'#e7d3b2','#a68c83',.8);shape(c,[[19,-39],[24,-33],[19,-33]],'#cdb195');
  box(c,-16,-32,32,33,'#536c70',1,'#cfba95',1);box(c,-13,-29,26,27,'#99bbab',1);
  const glow=c.createLinearGradient(0,-29,0,-2);glow.addColorStop(0,'#d1e8ca');glow.addColorStop(1,'#8ebba6');box(c,-12,-28,24,26,glow,1);
  // Two folded shutters open away from the small, warmly lit room.
  const wing=18*unfold;
  shape(c,[[-16,-32],[-16-wing,-27],[-16-wing,4],[-16,1]],'#f0dfbd','#a99383',.8);
  shape(c,[[16,-32],[16+wing,-27],[16+wing,4],[16,1]],'#ead1b9','#a99383',.8);
  for(const side of [-1,1]){line(c,[[side*(18+wing*.1),-22],[side*(16+wing*.85),-20]],'#bca291',.65);line(c,[[side*(18+wing*.1),-17],[side*(16+wing*.85),-15]],'#bca291',.65);}
  line(c,[[0,-30],[0,-2]],'#e7d7b3',1);line(c,[[-13,-16],[13,-16]],'#e7d7b3',1);box(c,-20,0,40,4,CREAM,1,'#c3ab8d',.65);
  if(v){
    // A toy skull window has its own little lifted ivory lid.
    box(c,-8,-9,16,13,'#f1dfbd',4,'#b89d85',.6);ellipse(c,-3,-3,2,2.4,INK);ellipse(c,3,-3,2,2.4,INK);line(c,[[-3,3],[3,3]],'#ac8c7e',.7);
    c.save();c.translate(-8,-9);c.rotate(-lift*.7);ellipse(c,8,-1,8.2,3,CREAM);line(c,[[1,0],[15,0]],'#c4a98b',.6);c.restore();star(c,2,-13,2.2,warm>.1?GOLD:'#d2c9af');
  }else{
    // The letter rests in the scarf pocket of the one who stood still for us.
    shape(c,[[-9,-9],[8,-9],[8,9],[-5,9],[-5,3],[-9,3]],'#c59173','#aa7766',.6);line(c,[[-8,-6],[7,-6]],'#ebbd8b',1);envelope(c,0,1,11,8);heart(c,0,1,1.7,ROSE);
  }
  c.restore();
  c.save();c.globalAlpha*=warm;heart(c,-29,-15-lift*3,2.8,ROSE);heart(c,29,-8-lift*2,2.2,GOLD);c.restore();c.restore();
}

function plant(c,s,view){
  const window=phase(s,.7,.65),grow=phase(s,1.1,1.15),bloom=phase(s,1.9,.85),v=view.variant===1;
  c.save();c.globalAlpha*=phase(s,.7,.3);
  // The greenhouse window is clear before the seed reaches it.
  c.save();c.translate(0,13);c.scale(1,Math.max(.03,window));box(c,-15,-37,30,33,'#799d8c',2,'#c6d2ad',1);box(c,-12,-34,24,27,'#52716c',1);
  line(c,[[0,-34],[0,-7]],'#d5d9b4',1);line(c,[[-12,-21],[12,-21]],'#d5d9b4',1);
  for(const side of [-1,1]){const angle=window*12;shape(c,[[side*15,-37],[side*(15+angle),-33],[side*(15+angle),-4],[side*15,-4]],side===1?'#a4b9a0':'#bac6a7','#d5d5b1',.7);line(c,[[side*17,-30],[side*(14+angle),-27]],'#e3ddbd77',.65);}
  c.restore();
  ellipse(c,0,24,14,3.6,'#27483d7a');shape(c,[[-13,9],[13,9],[10,23],[-9,23]],'#bd8f72','#8b7066',.8);box(c,-15,6,30,5,'#dfb48b',1.5,'#b78c70',.7);ellipse(c,0,7,11,2,'#655349');
  c.save();c.translate(0,5);c.scale(1,Math.max(.01,grow));curve(c,[0,1,0,-7,3,-14,0,-24],'#aad3aa',1.9);
  leaf(c,-7,-8,8,4,'#b8d7ac',.5);leaf(c,8,-15,9,4.7,'#99c4a5',-.43);
  c.restore();
  if(v){c.save();c.translate(26,15);c.scale(bloom,bloom);line(c,[[0,8],[0,-10]],'#e2c798',1.1);c.beginPath();c.moveTo(-14,-10);c.quadraticCurveTo(0,-25,14,-10);c.quadraticCurveTo(0,-5,-14,-10);c.fillStyle='#b99db2';c.fill();c.strokeStyle='#e0c4bc';c.lineWidth=.8;c.stroke();line(c,[[0,-21],[0,-10]],'#d9bdba',.6);ellipse(c,-7,-13,2,1.3,CREAM);ellipse(c,5,-15,2,1.4,CREAM);c.restore();}
  else{c.save();c.translate(0,5-grow*24);c.scale(bloom,bloom);for(let i=0;i<5;i++){const a=i*TAU/5;ellipse(c,Math.sin(a)*4.2,Math.cos(a)*4.2,3.2,4.1,'#dfb7b5',-a);}ellipse(c,0,0,3.3,3.3,GOLD);star(c,0,0,2,CREAM);c.restore();}
  glimmer(c,-34,-15,2.6,bloom);glimmer(c,36,-21,2,bloom,MINT);c.restore();
}

function beatSymbol(c,symbol,x,y,size=1){
  c.save();c.translate(x,y);c.scale(size,size);
  if(symbol==='moon'){ellipse(c,0,0,3.8,4,GOLD);ellipse(c,2,-1,3.4,3.7,'#516575');}
  else if(symbol==='bell'){shape(c,[[-3,2],[-2,-3],[2,-3],[3,2]],CREAM);ellipse(c,0,-3,2,1.6,CREAM);line(c,[[-4,2],[4,2]],CREAM,1);ellipse(c,0,4,.9,.9,GOLD);}
  else if(symbol==='star')star(c,0,0,4,GOLD);
  else if(symbol==='wave'){curve(c,[-4,-1,-1,-5,1,3,4,-1],MINT,.9);curve(c,[-4,2,-1,-2,1,6,4,2],MINT,.9);}
  c.restore();
}
function echo(c,s,view){
  const unfold=phase(s,.7,.65),rise=phase(s,1.25,1.45),v=view.variant===1;
  c.save();c.globalAlpha*=phase(s,.7,.3);
  c.save();c.translate(0,22);c.scale(Math.max(.04,unfold),1);
  shape(c,[[-35,-13],[-3,-8],[0,-3],[3,-8],[35,-13],[32,0],[4,3],[0,6],[-4,3],[-32,0]],'#b7c9c8','#e0dbc0',.9);
  shape(c,[[-32,-16],[-4,-11],[0,-7],[4,-11],[32,-16],[30,-3],[4,1],[0,4],[-4,1],[-30,-3]],'#eddfbf','#b1a18f',.7);
  for(const side of [-1,1])for(let row=0;row<3;row++)line(c,[[side*7,-8+row*3],[side*25,-12+row*3]],'#b4a69a',.6);
  line(c,[[0,-6],[0,4]],'#a98e86',.8);c.restore();
  const symbols=Array.isArray(view.signature)?view.signature:Array.isArray(view.recipient?.diagram?.symbols)?view.recipient.diagram.symbols:[];
  // Only the controller's proven recipient can supply this completed signature.
  for(let i=0;i<4;i++){
    const beat=phase(s,1.05+i*.22,.55);if(beat<=0)continue;
    const x=-30+i*20,y=7-beat*(i===0||i===3?22:27);
    c.save();c.globalAlpha*=beat;
    if(v){shape(c,[[x-7,y-6],[x+6,y-6],[x+7,y+7],[x-6,y+7]],'#678092','#d2d6c3',.65);line(c,[[x-7,y-6],[x-6,y-10]],'#b9c9bc',.6);}
    else{ellipse(c,x,y,7.3,7.3,'#506977');ring(c,x,y,7.3,'#bfd8cf',.75);curve(c,[x-4,y-4,x-3,y-6,x-1,y-6,x,y-6],CREAM+'b8',.65);}
    beatSymbol(c,symbols[i],x,y,.95);c.restore();
  }
  curve(c,[-37,6,-20,0,17,2,37,6],'#a9d7c98c',.8);
  glimmer(c,-42,-17,2,rise,MINT);glimmer(c,42,-12,2.3,rise);c.restore();
}

function table(c,s,view){
  const unfold=phase(s,.7,.65),seat=phase(s,1.12,.98),warm=phase(s,1.9,.85),v=view.variant===1;
  c.save();c.globalAlpha*=phase(s,.7,.3);
  // The centre chair rises into the space left between its two neighbours.
  for(const x of [-29,29]){c.save();c.translate(x,4);c.scale(1,unfold);tinyChair(c,0,0,'#bfa58b');c.restore();}
  c.save();c.translate(0,8-seat*4);c.scale(1,Math.max(.01,seat));tinyChair(c,0,-4,'#e2bd88');star(c,0,-8,2.1,CREAM);c.restore();
  c.save();c.scale(Math.max(.03,unfold),1);
  shape(c,[[-40,9],[40,9],[35,23],[-35,23]],'#9e776a','#c8ab89',.7);line(c,[[-31,20],[-34,27]],'#bd9b7c',1.4);line(c,[[31,20],[34,27]],'#bd9b7c',1.4);
  shape(c,[[-41,6],[41,6],[41,12],[33,16],[24,12],[12,16],[0,12],[-12,16],[-24,12],[-33,16],[-41,12]],'#dcc8ae','#b29480',.75);
  line(c,[[-36,9],[36,9]],'#f3ddbb',.8);c.restore();
  for(const x of [-27,27]){ellipse(c,x,5,6.7,2.7,'#eff0cf');ellipse(c,x,5,4.5,1.5,'#a6bca1');}
  c.save();c.globalAlpha*=seat;
  ellipse(c,0,6,9,3.4,'#f1e0bd');c.beginPath();c.moveTo(-7,3);c.quadraticCurveTo(0,14,7,3);c.fillStyle='#b6c1a0';c.fill();ellipse(c,0,3,7,2.5,v?'#d0ae80':'#d99e72');
  line(c,[[9,2],[14,-2]],'#c7ae8a',1.1);ellipse(c,14,-2,2.3,1.2,CREAM,-.5);c.restore();
  c.save();c.globalAlpha*=warm;
  curve(c,[-3,0,-8,-8,3,-10,-1,-18],CREAM+'b5',.9);curve(c,[4,-3,1,-8,9,-11,5,-16],CREAM+'88',.7);
  if(v){envelope(c,26,-8,12,8);heart(c,26,-8,2,ROSE);}else{leaf(c,-26,-15,7,3.5,'#d5b277',-.4);leaf(c,27,-18,6,3,'#ca9a78',.6);}
  c.restore();c.restore();
}

const painters={train,candy,window:paperWindow,sprout:plant,echo,table};

/** Draws an already-authorized miniature in world coordinates, without text. */
export function drawLostEncore(c,view,reducedMotion=false){
  if(!c||!view||!kinds.has(view.kind)||!validPoint(view.anchor))return;
  const seconds=reducedMotion?3:clamp(finite(view.elapsed,finite(view.progress)*3),0,3);
  if(seconds<=.7)return;
  const b=view.bounds;
  if(!b||![b.left,b.right,b.top,b.bottom].every(Number.isFinite)||b.left>=b.right||b.top>=b.bottom)return;
  const accent=/^#[\da-f]{6}$/i.test(view.accent||'')?view.accent:MINT;
  c.save();c.lineCap='round';c.lineJoin='round';
  c.beginPath();c.rect(b.left,b.top,b.right-b.left,b.bottom-b.top);c.clip();
  c.translate(view.anchor.x,view.anchor.y);
  // A compact authored frame (the whale library sits just above the raised
  // Halloween hat) may compress the decoration without moving interaction.
  c.scale(Math.min(1,(b.right-b.left)/104),Math.min(1,(b.bottom-b.top)/60));
  theatreBase(c,phase(seconds,.7,.35),accent);
  painters[view.kind](c,seconds,view);
  c.restore();
}
