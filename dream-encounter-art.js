// Six authored encounters, three hand-drawn friends. This painter owns no
// game state or timers: its pose is entirely described by the supplied view.
const TAU = Math.PI * 2;
const FONT = '"PingFang SC","Microsoft YaHei",sans-serif';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
export const STORY_NPC_BOUNDS = Object.freeze({ left: -46, right: 46, top: -134, bottom: 7 });

function ellipse(c, x, y, rx, ry, fill, angle = 0, stroke = null) {
  c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}
function line(c, points, color, width = 1.2) {
  c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p));
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function path(c, draw, fill, stroke = null, width = 1) {
  c.beginPath(); draw(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function box(c, x, y, w, h, r, fill, stroke = null, width = 1) {
  path(c, p => {
    const radius=Math.min(r,w/2,h/2);
    p.moveTo(x+radius,y);p.arcTo(x+w,y,x+w,y+h,radius);p.arcTo(x+w,y+h,x,y+h,radius);
    p.arcTo(x,y+h,x,y,radius);p.arcTo(x,y,x+w,y,radius);p.closePath();
  }, fill, stroke, width);
}
function star(c, x, y, r, color) {
  path(c, p => {
    p.moveTo(x, y - r); p.quadraticCurveTo(x + r * .22, y - r * .22, x + r, y);
    p.quadraticCurveTo(x + r * .22, y + r * .22, x, y + r);
    p.quadraticCurveTo(x - r * .22, y + r * .22, x - r, y);
    p.quadraticCurveTo(x - r * .22, y - r * .22, x, y - r);
  }, color);
}
function envelope(c, x, y, width, height, wax = '#aa91b0', open = 0) {
  c.save(); c.translate(x, y);
  box(c, -width / 2, -height / 2, width, height, 1.6, '#ead8b8', '#ab938e', .8);
  line(c, [[-width / 2 + 2, height / 2 - 2], [-3, -1]], '#b9a194', .7);
  line(c, [[width / 2 - 2, height / 2 - 2], [3, -1]], '#b9a194', .7);
  path(c, p => { p.moveTo(-width / 2 + 1, -height / 2); p.lineTo(0, open ? -height / 2 - 8 * open : 2); p.lineTo(width / 2 - 1, -height / 2); }, '#f5e7ca', '#b6a18f', .7);
  if (!open) { ellipse(c, 0, 2, 3.1, 3.1, wax); star(c, 0, 2, 1.7, '#f1dfbe'); }
  c.restore();
}
function lantern(c, pose) {
  const sway = pose.reduced ? 0 : Math.sin(pose.time * 1.45) * .8;
  c.save(); c.translate(sway+pose.propX, -27 - pose.lift);
  const light = c.createRadialGradient(0, 1, 0, 0, 1, 20);
  light.addColorStop(0, pose.warm?'#ffe1a55c':'#f7d59635'); light.addColorStop(1, '#f7d59600');
  ellipse(c, 0, 0, 20, 23, light);
  path(c, p => { p.moveTo(-6, -10); p.lineTo(-6, -15); p.quadraticCurveTo(0, -21, 6, -15); p.lineTo(6, -10); }, null, '#bca17d', 1.2);
  box(c, -10, -10, 20, 25, 3, '#8e758b', '#cfb99a', 1.1);
  box(c, -7, -7, 14, 18, 2, pose.warm?'#ffe1a1':pose.open ? '#f4d793' : '#d8b784');
  line(c, [[-3, -6], [-3, 10]], '#f8e7bf', .8); line(c, [[3, -6], [3, 10]], '#a98e76', .8);
  star(c, 0, 2, pose.open||pose.warm ? 4 : 3, '#fff0c4');
  box(c, -11, -11, 22, 3, 1, '#d4b98e'); box(c, -9, 13, 18, 3, 1, '#c0a782');
  c.restore();
}
function tickets(c, pose) {
  c.save(); c.translate(0, -26 - pose.lift);
  for (const [i, angle] of [-.28, 0, .25].entries()) {
    c.save(); c.translate((i - 1) * 5, 1); c.rotate(angle + (pose.reduced ? 0 : Math.sin(pose.time * 1.3) * .035));
    box(c, -7, -12, 14, 25, 1.8, i === 1 ? '#ead4b3' : '#cbb4c8', '#a78c9b', .75);
    line(c, [[-4, 6], [4, 6]], '#ad939a', .8);
    for (const x of [-3, 0, 3]) ellipse(c, x, 9, .5, .5, '#997d94');
    ellipse(c, 0, -3, 4, 4, '#9b7eaf'); ellipse(c, 1.6, -4.3, 3.5, 3.5, i === 1 ? '#ead4b3' : '#cbb4c8');
    c.restore();
  }
  c.restore();
}
function moth(c, pose) {
  const wing = pose.reduced ? 0 : Math.sin(pose.time * 1.8) * .035;
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1); c.translate(10, -49); c.rotate(wing + (pose.open ? -.04 : 0)-pose.salute*.07);c.scale(1+pose.salute*.055,1+pose.salute*.035);
    path(c, p => { p.moveTo(0, 0); p.bezierCurveTo(15, -38, 39, -35, 28, -13); p.bezierCurveTo(23, -2, 13, 3, 2, 2); p.bezierCurveTo(24, 7, 24, 26, 12, 25); p.bezierCurveTo(5, 24, 0, 13, 0, 0); }, side < 0 ? '#d7bba1' : '#e5cfad', '#9b8291', 1.1);
    line(c, [[3, -1], [24, -23], [11, -9], [29, -15]], '#b39794', .9);
    line(c, [[3, 4], [13, 18], [12, 7]], '#b39794', .9);
    line(c, [[19, -22], [22, -16], [26, -18]], '#f0ddbd', 1.5);
    for (const [x, y] of [[18,-12],[12,14]]) ellipse(c, x, y, 2.4, 1.6, '#bb969f', -.3);
    c.restore();
  }
  line(c, [[-7,-12],[-8,-2],[-13,-1]], '#c9bbad', 3.3);
  line(c, [[7,-12],[8,-2],[13,-1]], '#c9bbad', 3.3);
  path(c, p => { p.moveTo(-11,-49); p.quadraticCurveTo(0,-55,11,-49); p.quadraticCurveTo(19,-31,14,-10); p.quadraticCurveTo(0,-4,-14,-10); p.quadraticCurveTo(-18,-31,-11,-49); }, '#8c7799', '#67556f', 1.1);
  for (const y of [-38, -27, -17]) path(c, p => { p.moveTo(-12,y); p.quadraticCurveTo(0,y+4,12,y); }, null, '#b99db4', 2);
  line(c, [[-9,-43],[-11,-15]], '#d4b9bd', .7);
  for (const y of [-39,-33,-27,-21]) line(c, [[-11,y],[-9,y+1]], '#e4d2bd', .7);
  // Head and antennae tilt very slightly toward the light, without moving feet.
  c.save(); c.translate(0, (pose.open ? -1 : 0)-pose.salute*.8); c.translate(0,-65); c.rotate(pose.gazeX * .045+pose.salute*.035); c.translate(0,65);
  for (const side of [-1,1]) {
    const antennaTop=-88-pose.salute*3;
    path(c, p => { p.moveTo(side*7,-79); p.quadraticCurveTo(side*7,-85,side*13,antennaTop); }, null, '#b3a0ac', 1.3);
    ellipse(c,side*13,antennaTop,2,2,'#e8d4b3');
  }
  ellipse(c,0,-65,16.3,19,'#e8d4b1',0,'#a78d94');
  path(c,p=>{p.moveTo(-13,-76);p.bezierCurveTo(-17,-84,-8,-88,-5,-81);p.bezierCurveTo(-3,-90,5,-90,6,-82);p.bezierCurveTo(13,-88,18,-82,13,-76);},'#f3e6cd','#b8a2a3',.9);
  for (const side of [-1,1]) {
    ellipse(c,side*7.5,-65,6.6,7.3,null,0,'#806b80');
    if(pose.smile)path(c,p=>{p.moveTo(side*7.5-2.5,-64.5);p.quadraticCurveTo(side*7.5,-68,side*7.5+2.5,-64.5);},null,'#4f4358',1.4);
    else if(pose.blink) line(c,[[side*7.5-2,-65],[side*7.5+2,-65]],'#4f4358',1.4);
    else { ellipse(c,side*7.5+pose.gazeX*1.25,-65+pose.gazeY,2.2,3,'#4c4156'); ellipse(c,side*7.5+pose.gazeX*1.25+.6,-66.1+pose.gazeY,.75,.8,'#f7edd5'); }
    ellipse(c,side*12.5,-56,3,1.3,'#cfaa9b88');
  }
  line(c,[[-1,-65],[1,-65]],'#806b80',1); line(c,[[-14,-66],[-16,-67]],'#806b80',1);line(c,[[14,-66],[16,-67]],'#806b80',1);
  path(c,p=>{p.moveTo(-4,-54);p.quadraticCurveTo(0,pose.smile?-47.5:pose.talking?-48:-50.5,5,-54);},null,'#9d7d7f',1.05);
  c.restore();
  // The same offset owns lantern, wrist and elbow targets throughout the
  // greeting. The light cannot slide away from the hands that are lifting it.
  const propSway=pose.prop==='theatre-ticket'?0:pose.reduced?0:Math.sin(pose.time*1.45)*.8;
  const propX=pose.propX+propSway;
  const handY = -28 - pose.lift;
  for (const side of [-1,1]) { line(c,[[side*12,-43],[side*17+propX*.55,handY+4],[side*10+propX,handY]],'#cab5a5',3.1); }
  if(pose.prop==='theatre-ticket') tickets(c,pose); else lantern(c,pose);
  for(const side of [-1,1]) ellipse(c,side*11+propX,handY,2.6,3.2,'#ead7b5');
}

function wateringCan(c, pose) {
  c.save(); c.translate(0,-27-pose.lift); c.rotate(pose.open ? -.12 : 0);
  path(c,p=>{p.moveTo(9,-7);p.bezierCurveTo(23,-16,26,5,11,4);},null,'#afc4a5',2.5);
  path(c,p=>{p.moveTo(-9,-1);p.lineTo(-20,-10);p.lineTo(-24,-9);p.lineTo(-12,8);},'#95ac9c','#657e77',.9);
  box(c,-11,-10,23,22,4,'#9fb5a2','#d4d5b3',1);
  path(c,p=>{p.moveTo(-8,-10);p.quadraticCurveTo(0,-15,8,-10);},'#647f76','#c0c8a8',.8);
  ellipse(c,-23,-10,3.2,1.4,'#d8d9b7',.6);
  star(c,1,1,4,'#dbe2bc'); line(c,[[-7,8],[7,8]],'#799486',.8);
  if(pose.open)for(let i=0;i<3;i++) {
    const offset=pose.reduced?i*4:((pose.time*9+i*4)%13);
    ellipse(c,-26-offset*.25,-6+offset,1,1.7,'#bde5d4aa');
  }
  c.restore();
}
function pocketWatch(c, pose) {
  c.save();c.translate(0,-26-pose.lift);
  path(c,p=>{p.moveTo(4,-19);p.bezierCurveTo(20,-23,20,-7,11,-6);},null,'#c6b17e',1.2);
  box(c,-3,-17,6,5,1,'#d4ba83');ellipse(c,0,-15,3.8,3.3,null,0,'#c2a67b');
  ellipse(c,0,0,13,13,'#74647a',0,'#d0b183');ellipse(c,0,0,10.3,10.3,'#e7d6b4');
  for(let i=0;i<12;i++) {const a=i*TAU/12;line(c,[[Math.sin(a)*8,-Math.cos(a)*8],[Math.sin(a)*(i%3?8.8:9.3),-Math.cos(a)*(i%3?8.8:9.3)]],'#9c8586',.65);}
  const tick=pose.reduced?0:Math.sin(pose.time*1.2)*.11;
  line(c,[[0,-6],[0,0],[-4+tick,3]],'#786375',1.1);ellipse(c,0,0,1.15,1.15,'#786375');
  path(c,p=>{p.moveTo(-6,-7);p.quadraticCurveTo(-9,-2,-7,3);},null,'#fff1d699',1.1);
  c.restore();
}
function keeper(c,pose) {
  line(c,[[-7,-12],[-8,-2],[-14,-1]],'#cfc0a6',3.3);line(c,[[7,-12],[8,-2],[14,-1]],'#cfc0a6',3.3);
  path(c,p=>{p.moveTo(-16,-49);p.quadraticCurveTo(0,-60,16,-49);p.lineTo(25,-8);p.quadraticCurveTo(0,-1,-25,-8);p.closePath();},'#43546b','#2a364d',1.1);
  path(c,p=>{p.moveTo(-15,-49);p.lineTo(-5,-37);p.lineTo(0,-44);p.lineTo(7,-36);p.lineTo(17,-49);},'#6f8093','#8996a3',.8);
  line(c,[[-2,-37],[-2,-8]],'#9b9aac',1);line(c,[[-19,-16],[-18,-10],[-11,-9]],'#b0a7ad',.7);
  for(const y of [-31,-23,-15])ellipse(c,2,y,1.35,1.4,'#cbb58c');
  c.save();c.translate(0,pose.open?-1:0);c.translate(0,-66);c.rotate(pose.gazeX*.04);c.translate(0,66);
  path(c,p=>{p.moveTo(-18,-51);p.bezierCurveTo(-25,-71,-16,-89,0,-89);p.bezierCurveTo(19,-90,26,-73,18,-51);},'#363e54','#293347',1);
  path(c,p=>{p.moveTo(-14,-78);p.bezierCurveTo(-20,-62,-14,-49,-6,-47);p.lineTo(7,-47);p.bezierCurveTo(17,-51,20,-63,14,-79);p.closePath();},'#e5d4b1','#a39289',.95);
  path(c,p=>{p.moveTo(-17,-67);p.lineTo(-17,-78);p.lineTo(-10,-87);p.lineTo(-3,-84);p.lineTo(2,-88);p.lineTo(12,-85);p.lineTo(18,-76);p.lineTo(18,-66);p.lineTo(10,-77);p.lineTo(6,-75);p.lineTo(-3,-79);p.lineTo(-8,-74);p.lineTo(-11,-77);p.closePath();},'#b4afb7','#77758b',.9);
  for(const side of [-1,1]) {
    ellipse(c,side*7.8,-65,5.5,6.2,'#423d50',side*.16);
    if(pose.blink)line(c,[[side*7.8-2.6,-64],[side*7.8+2.6,-64]],'#d4bd99',1.3);
    else ellipse(c,side*7.8+pose.gazeX*1.3,-65+pose.gazeY,1.9,2.8,'#dfc691');
  }
  ellipse(c,8,-65,8.2,8.6,null,0,'#d5bb80');
  path(c,p=>{p.moveTo(14,-58);p.bezierCurveTo(18,-49,15,-44,20,-39);},null,'#bda47b',.9);
  path(c,p=>{p.moveTo(-1,-59);p.lineTo(-3,-54);p.lineTo(3,-54);},null,'#ab9681',.9);
  path(c,p=>{p.moveTo(-8,-50);p.quadraticCurveTo(0,-46,9,-50);},null,'#a38b7d',1);
  for(const x of [-4,1,6])line(c,[[x,-48],[x,-44]],'#b39c85',.7);
  path(c,p=>{p.moveTo(-10,-44);p.quadraticCurveTo(0,-39,10,-44);p.lineTo(5,-32);p.lineTo(0,-36);p.lineTo(-4,-32);p.closePath();},'#b6b1bb','#78778b',.75);
  c.restore();
  const handY=-26-pose.lift;
  for(const side of [-1,1])line(c,[[side*17,-43],[side*21,handY+4],[side*12,handY]],'#6c7d90',5.5);
  if(pose.prop==='greenhouse-can')wateringCan(c,pose);
  else if(pose.prop==='post-letter') {
    c.save();c.translate(0,-27-pose.lift);c.rotate(pose.open?pose.gazeX*.1:0);
    envelope(c,0,0,26,18,'#a4b4ad',pose.open?.7:0);
    if(pose.open)star(c,1,-12,2.2,'#e9d5a2');c.restore();
  } else pocketWatch(c,pose);
  for(const side of [-1,1])ellipse(c,side*12,handY,3.2,3.5,'#e6d0ac');
}

function book(c,x,y,turn=0) {
  c.save();c.translate(x,y);
  path(c,p=>{p.moveTo(-17,-5);p.lineTo(-2,-2);p.lineTo(15,-7);p.lineTo(17,6);p.lineTo(0,12);p.lineTo(-17,7);p.closePath();},'#786b89','#494b67',1);
  path(c,p=>{p.moveTo(-16,-8);p.lineTo(-1,-5);p.lineTo(14,-10);p.lineTo(16,3);p.lineTo(0,9);p.lineTo(-16,4);p.closePath();},'#ecdcbc','#baa69b',.8);
  line(c,[[-1,-5],[0,9]],'#a88e92',.8);
  for(const yy of [-2,1,4]) {line(c,[[-12,yy],[-5,yy+1]],'#bda69b',.6);line(c,[[4,yy-1],[12,yy-4]],'#bda69b',.6);}
  if(turn>0)path(c,p=>{p.moveTo(0,8);p.lineTo(-1,-5);p.quadraticCurveTo(4-turn*9,-17-turn*2,12-turn*6,-13);p.lineTo(13-turn*7,0);p.closePath();},'#f5e8cf','#c3b09f',.7);
  c.restore();
}
function whale(c,pose) {
  const bob=pose.reduced?0:Math.sin(pose.time*1.5)*1.1;
  // Ripples stay at the feet. The hovering body and its book share one pose.
  for(const [i,w]of[29,20].entries())path(c,p=>{p.moveTo(-w,1+i*3);p.quadraticCurveTo(0,7+i*2,w,1+i*3);},null,i?'#91b8c03d':'#9cc5cb59',.9);
  c.save();c.translate(0,bob);
  path(c,p=>{p.moveTo(-30,-48);p.bezierCurveTo(-14,-65,11,-64,24,-48);p.quadraticCurveTo(30,-39,33,-42);p.quadraticCurveTo(41,-44,43,-57);p.quadraticCurveTo(47,-38,36,-32);p.quadraticCurveTo(42,-31,45,-37);p.quadraticCurveTo(43,-23,32,-26);p.quadraticCurveTo(26,-27,21,-31);p.bezierCurveTo(6,-14,-19,-19,-31,-32);p.quadraticCurveTo(-38,-40,-30,-48);},'#879db5','#4c647c',1.05);
  path(c,p=>{p.moveTo(-32,-35);p.bezierCurveTo(-15,-24,5,-23,22,-33);p.bezierCurveTo(7,-17,-18,-20,-29,-30);p.closePath();},'#c1cfce');
  path(c,p=>{p.moveTo(-7,-26);p.quadraticCurveTo(-10,-12,2,-10);p.quadraticCurveTo(-1,-20,4,-25);},'#748eaa','#556f89',.85);
  path(c,p=>{p.moveTo(-30,-45);p.quadraticCurveTo(-40,-44,-44,-37);p.quadraticCurveTo(-35,-37,-29,-40);},'#9fb3c3','#637c95',.8);
  if(pose.blink)line(c,[[-25,-43],[-19,-43]],'#34465e',1.7);
  else{ellipse(c,-22+pose.gazeX*.9,-43+pose.gazeY,3,3.7,'#34465e');ellipse(c,-21+pose.gazeX*.9,-44.2+pose.gazeY,.95,1.1,'#f6e9cd');}
  path(c,p=>{p.moveTo(-23,-33);p.quadraticCurveTo(-17,-29,-12,-34);},null,'#526d88',1);
  ellipse(c,-27,-35,3,1.3,'#b8adb788');
  line(c,[[-4,-43],[1,-40],[6,-46],[12,-44]],'#c6d3d0',.8);line(c,[[2,-31],[8,-30]],'#d1d9d2',.7);
  const lift=pose.open?10:pose.talking?3:0;
  book(c,1,-65-lift,pose.open?(pose.reduced?.55:.5+Math.sin(pose.time*2)*.15):0);
  for(let i=0;i<(pose.open?3:1);i++) {
    const rise=pose.reduced?i*4:((pose.time*4+i*4)%10);
    ellipse(c,-22+i*3,-71-rise,1.7,2.1,null,0,'#b1d5d1aa');
  }
  c.restore();
}

function label(c,view) {
  const name=typeof view.name==='string'?view.name.slice(0,12):'';
  if(!name)return;
  const talkable=view.near&&view.form==='body';
  c.font=`${talkable?'10':'9'}px ${FONT}`;c.textAlign='center';c.textBaseline='alphabetic';
  if(talkable) {
    const text=view.talking?name+' · …':'Q · '+name;
    const width=Math.min(82,Math.max(48,c.measureText(text).width+14));
    box(c,-width/2,-116,width,17,7,'#1b2533e8','#d5c49a55',.75);
    c.fillStyle='#e9dcc0';c.fillText(text,0,-104);
  } else {
    c.fillStyle='#d6d9c9';c.fillText(name,0,-104);
  }
}

export function drawStoryNPC(c,view,time=0,reducedMotion=false) {
  if(!c||!view||!['moth','keeper','whale'].includes(view.motif))return;
  const x=finite(view.x),y=finite(view.y),t=reducedMotion?0:finite(time);
  const ticket=view.chapterIndex===0&&view.motif==='moth'&&view.prop==='station-lantern'&&view.stationTicket&&typeof view.stationTicket==='object'?view.stationTicket:null;
  const open=Boolean(view.near&&(view.form==='soul'||ticket?.phase==='returning')&&view.capOpen);
  const look=view.look||{x,y:y-58};
  const greeting=ticket?.greeting,progress=clamp(finite(ticket?.progress,1),0,1);
  const welcome=!!ticket&&greeting==='welcome'&&ticket.fresh===true;
  // This one-shot gesture consumes engine progress, never wall time. Reduced
  // motion settles it into the warmer resting lamp without a brief flash.
  const salute=welcome&&!reducedMotion?Math.sin(progress*Math.PI):0;
  const notice=!!ticket&&greeting==='notice'&&ticket.fresh===true?progress*progress*(3-2*progress):0;
  const warm=!!ticket&&['held','returning','stowed'].includes(ticket.phase);
  const pose={time:t,reduced:!!reducedMotion,prop:view.prop,open,talking:!!view.talking,salute,warm,propX:salute*21,
    smile:welcome&&!reducedMotion&&progress>.24&&progress<.81,
    gazeX:clamp((finite(look.x,x)-x)/140,-1,1),gazeY:clamp((finite(look.y,y-65)-(y-65))/100,-1.2,1.2),
    blink:!reducedMotion&&Math.sin(t*1.67+view.chapterIndex*.4)>.992,
    lift:(open?11:view.talking?3:0)+notice*2+salute*14};
  c.save();c.translate(x,y);c.lineCap='round';c.lineJoin='round';c.lineWidth=1;
  ellipse(c,0,2,view.motif==='whale'?34:27,4,'#10202a55');
  // Body breathing is deliberately tiny; the first platform is just above us.
  c.save();if(view.motif!=='whale'&&!reducedMotion)c.translate(0,-Math.sin(t*1.4)*.7);
  if(view.motif==='moth')moth(c,pose);else if(view.motif==='keeper')keeper(c,pose);else whale(c,pose);
  c.restore();label(c,view);c.restore();
}
