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
function material(c,x1,y1,x2,y2,stops){
  const g=c.createLinearGradient(x1,y1,x2,y2);
  for(const [at,color] of stops)g.addColorStop(at,color);
  return g;
}
function lantern(c, pose) {
  const sway = pose.reduced ? 0 : Math.sin(pose.time * 1.45) * .8;
  c.save(); c.translate(sway+pose.propX, -27 - pose.lift);
  const light = c.createRadialGradient(0, 1, 0, 0, 1, 20);
  light.addColorStop(0, pose.painted?(pose.warm?'#ffdc9473':'#efd29d46'):pose.warm?'#ffe1a55c':'#f7d59635'); light.addColorStop(1, '#f7d59600');
  ellipse(c, 0, 0, 20, 23, light);
  path(c, p => { p.moveTo(-6, -10); p.lineTo(-6, -15); p.quadraticCurveTo(0, -21, 6, -15); p.lineTo(6, -10); }, null, pose.painted?'#d5bb90':'#bca17d', 1.2);
  const frame=pose.painted?material(c,-10,-10,10,15,[[0,'#727081'],[.48,'#a18a80'],[1,'#a48a68']]):'#8e758b';
  box(c, -10, -10, 20, 25, 3, frame, pose.painted?'#dfc69d':'#cfb99a', 1.1);
  const glass=pose.painted?material(c,-6,-7,7,11,[[0,pose.warm?'#e8ba70':'#c6a47b'],[.48,pose.warm||pose.open?'#ffe9b0':'#ead2a4'],[1,'#b68e61']]):pose.warm?'#ffe1a1':pose.open ? '#f4d793' : '#d8b784';
  box(c, -7, -7, 14, 18, 2, glass);
  if(pose.painted){
    // Two broad glass reflections, not a texture. They stay inside the glass
    // and move with the exact same hand-held frame throughout the greeting.
    path(c,p=>{p.moveTo(-5.7,-5.5);p.lineTo(-1.4,-6.1);p.lineTo(-4,8.4);p.lineTo(-5.7,8.4);p.closePath();},'#fff5d55c');
    line(c,[[5.4,-3],[5.4,7]],'#fff1c978',.65);
  }
  line(c, [[-3, -6], [-3, 10]], pose.painted?'#f8e7bf9c':'#f8e7bf', .8); line(c, [[3, -6], [3, 10]], pose.painted?'#a98e768c':'#a98e76', .8);
  star(c, 0, 2, pose.open||pose.warm ? 4 : 3, '#fff0c4');
  const brass=pose.painted?material(c,-11,0,11,0,[[0,'#ab916d'],[.42,'#f0d7a7'],[1,'#b49a74']]):'#d4b98e';
  box(c, -11, -11, 22, 3, 1, brass); box(c, -9, 13, 18, 3, 1, pose.painted?brass:'#c0a782');
  c.restore();
}
// The ticket fan has a single hinge. The hands, three papers and moon stamp
// remain attached when Rongrong invites the exposed cap onto the stage.
function theatreTicketGrip(pose) {
  return {x:pose.propX, y:-26-pose.lift, angle:pose.theatre ? -.16*pose.invite+.025*pose.theatreLamps : 0};
}
function tickets(c, pose) {
  const grip=theatreTicketGrip(pose);
  c.save();c.translate(grip.x,grip.y);c.rotate(grip.angle);
  if(pose.painted)ellipse(c,0,2,15,15,'#3d30476b');
  for(const [i,angle] of [-.31,0,.28].entries()) {
    const sway=pose.reduced?0:Math.sin(pose.time*1.3)*.024;
    c.save();c.translate((i-1)*5,1);c.rotate(angle+sway+(i-1)*pose.invite*.07);
    const color=i===1?'#f1dfbe':'#d6bfd3';
    if(pose.painted){
      box(c,-7.8,-11.4,15.6,25.8,1.7,'#806985','#e7d4bb',.6);
      box(c,-7,-12,14,25,1.7,material(c,-7,-12,7,13,[[0,'#fff3dc'],[.55,color],[1,'#ad92b3']]),'#a58c9a',.75);
      // A little diagonal cut-out and a pressed brass border are legible at 1x.
      path(c,p=>{p.moveTo(-7,-7);p.lineTo(-4.7,-5.2);p.lineTo(-7,-3.4);p.closePath();},'#6a53739c');
      line(c,[[-5.5,-9.2],[5,-9.2]],'#fff5d3ad',.7);
      line(c,[[-5.4,4],[5.4,4]],'#aa8f9ca8',.8);
    } else box(c,-7,-12,14,25,1.8,color,'#a78c9b',.75);
    line(c,[[-4,6],[4,6]],'#ad939a',.8);
    for(const x of [-3,0,3])ellipse(c,x,9,.5,.5,'#997d94');
    ellipse(c,0,-3,4,4,pose.painted?'#a889a6':'#9b7eaf');
    ellipse(c,1.6,-4.3,3.5,3.5,color);
    if(pose.painted){
      path(c,p=>{p.moveTo(0,-6.3);p.quadraticCurveTo(2.8,-6.4,3.2,-3.7);},null,'#fff4cf',.8);
      star(c,-2,-8,.75,'#c8a46e');
    }
    c.restore();
  }
  // Fingertips in the same rotated space as the paper: no detached hands.
  if(pose.theatre){
    for(const side of [-1,1]){
      ellipse(c,side*10,-2,2.4,3.1,'#e8d4b4',side*.12,'#b6a08f');
      ellipse(c,side*9.2,-3,1,1.25,'#fff1d0');
    }
  }
  c.restore();
}
function mothWing(c){
  c.moveTo(0,0);c.bezierCurveTo(15,-38,39,-35,28,-13);c.bezierCurveTo(23,-2,13,3,2,2);
  c.bezierCurveTo(24,7,24,26,12,25);c.bezierCurveTo(5,24,0,13,0,0);
}
function moth(c, pose) {
  const wing = pose.reduced ? 0 : Math.sin(pose.time * 1.8) * .035;
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1); c.translate(10, -49); c.rotate(wing + (pose.open ? -.04 : 0)-pose.salute*.07);c.scale(1+pose.salute*.055,1+pose.salute*.035);
    const membrane=pose.painted?material(c,0,16,29,-27,[[0,side<0?'#998998':'#b39c9a'],[.45,side<0?'#c9b5ad':'#dbc3ab'],[1,'#f0d9b2']]):side < 0 ? '#d7bba1' : '#e5cfad';
    path(c,mothWing,membrane,pose.painted?'#978896':'#9b8291',1.1);
    if(pose.painted){
      // The edge catches a narrow crescent of the real theatre moonlight.
      path(c,p=>{p.moveTo(6,-19);p.bezierCurveTo(15,-35,33,-34,29,-21);},null,pose.theatre?'#f2e5f1a6':'#fff0d095',1.2);
      path(c,p=>{p.moveTo(8,-15);p.bezierCurveTo(17,-31,31,-31,31,-21);},null,'#fff0d095',.8);
      path(c,p=>{p.moveTo(6,7);p.quadraticCurveTo(21,14,15,22);},null,'#ead5ba75',.8);
      path(c,p=>{p.moveTo(4,-3);p.quadraticCurveTo(15,-15,28,-16);},null,'#8d87944d',2.2);
    }
    line(c, [[3, -1], [24, -23], [11, -9], [29, -15]], pose.painted?'#9a87918a':'#b39794', .9);
    line(c, [[3, 4], [13, 18], [12, 7]], pose.painted?'#96818d80':'#b39794', .9);
    line(c, [[19, -22], [22, -16], [26, -18]], pose.painted?'#f5e4c978':'#f0ddbd', 1.5);
    for (const [x, y] of [[18,-12],[12,14]]) ellipse(c, x, y, 2.4, 1.6, pose.painted?'#b08a9675':'#bb969f', -.3);
    c.restore();
  }
  line(c, [[-7,-12],[-8,-2],[-13,-1]], '#c9bbad', 3.3);
  line(c, [[7,-12],[8,-2],[13,-1]], '#c9bbad', 3.3);
  const coat=pose.painted?material(c,-17,-30,16,-23,[[0,pose.theatre?'#5f4e78':'#68667f'],[.42,'#9586a2'],[.78,pose.theatre?'#c5a8cf':'#b49aab'],[1,'#897489']]):'#8c7799';
  path(c, p => { p.moveTo(-11,-49); p.quadraticCurveTo(0,-55,11,-49); p.quadraticCurveTo(19,-31,14,-10); p.quadraticCurveTo(0,-4,-14,-10); p.quadraticCurveTo(-18,-31,-11,-49); }, coat, pose.painted?'#625a73':'#67556f', 1.1);
  if(pose.painted){
    path(c,p=>{p.moveTo(11,-45);p.quadraticCurveTo(16,-28,12.5,-13);},null,'#e3c5b366',1.15);
    if(pose.theatre){
      path(c,p=>{p.moveTo(-9,-44);p.quadraticCurveTo(-4,-40,0,-42);p.quadraticCurveTo(6,-41,10,-44);},null,'#efdfd1b5',1);
      path(c,p=>{p.moveTo(-16,-19);p.quadraticCurveTo(-12,-13,-11,-10);},null,'#e8cade8c',1.4);
      path(c,p=>{p.moveTo(14,-30);p.quadraticCurveTo(17,-23,15,-17);},null,'#ecd1e8a1',1.4);
      ellipse(c,0,-43,1.7,1.3,'#ead6ae',0,'#a38b78');
    }
  }
  for (const y of [-38, -27, -17]) path(c, p => { p.moveTo(-12,y); p.quadraticCurveTo(0,y+4,12,y); }, null, pose.painted?'#ceb2be9c':'#b99db4', 2);
  line(c, [[-9,-43],[-11,-15]], '#d4b9bd', .7);
  for (const y of [-39,-33,-27,-21]) line(c, [[-11,y],[-9,y+1]], '#e4d2bd', .7);
  // Head and antennae tilt very slightly toward the light, without moving feet.
  c.save(); c.translate(0, (pose.open ? -1 : 0)-pose.salute*.8); c.translate(0,-65); c.rotate(pose.gazeX * .045+pose.salute*.035); c.translate(0,65);
  for (const side of [-1,1]) {
    const antennaTop=-88-pose.salute*3;
    path(c, p => { p.moveTo(side*7,-79); p.quadraticCurveTo(side*7,-85,side*13,antennaTop); }, null, '#b3a0ac', 1.3);
    ellipse(c,side*13,antennaTop,2,2,'#e8d4b3');
  }
  let face='#e8d4b1';
  if(pose.painted){face=c.createRadialGradient(5,-73,2,1,-65,23);face.addColorStop(0,'#f9e9c8');face.addColorStop(.58,'#ead3b0');face.addColorStop(1,'#bda69d');}
  ellipse(c,0,-65,16.3,19,face,0,pose.painted?'#a39599':'#a78d94');
  if(pose.painted){
    if(pose.theatre){
      ellipse(c,-12.4,-62,3.5,2,'#f8e2d456');
      ellipse(c,12.4,-62,3.5,2,'#f8e2d456');
    }
    path(c,p=>{p.moveTo(9,-79);p.quadraticCurveTo(16,-72,14.5,-61);},null,'#fff0cd9c',.85);
    path(c,p=>{p.moveTo(-12,-75);p.quadraticCurveTo(-17,-65,-11,-55);},null,'#8b97aa55',.9);
  }
  const fur=pose.painted?material(c,-8,-87,9,-75,[[0,'#f8ecd5'],[.5,'#f2e0be'],[1,'#d3bca5']]):'#f3e6cd';
  path(c,p=>{p.moveTo(-13,-76);p.bezierCurveTo(-17,-84,-8,-88,-5,-81);p.bezierCurveTo(-3,-90,5,-90,6,-82);p.bezierCurveTo(13,-88,18,-82,13,-76);},fur,'#b8a2a3',.9);
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
  for (const side of [-1,1]) {
    const arm=[[side*12,-43],[side*17+propX*.55,handY+4],[side*10+propX,handY]];
    line(c,arm,pose.painted?'#b29d99':'#cab5a5',3.1);
    if(pose.painted)line(c,arm,'#eed8b6bb',1.1);
  }
  if(pose.prop==='theatre-ticket')tickets(c,pose);else lantern(c,pose);
  if(!pose.theatre)for(const side of [-1,1])ellipse(c,side*11+propX,handY,2.6,3.2,'#ead7b5');
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

// The greenhouse keeper uses the same authored silhouette and interaction
// pose. Cloth, bone and aged enamel are painted inside it; no new particles,
// collision, clock or saved state belongs to this finish.
function greenhouseCanPose(pose){
  const angle=pose.open?-.14:0,co=Math.cos(angle),si=Math.sin(angle),y=-27-pose.lift;
  const point=(x,yy)=>({x:-1+x*co-yy*si,y:y+x*si+yy*co});
  return {x:-1,y,angle,hands:[point(-12,0),point(12,-1)]};
}
function finishedWateringCan(c,pose,can){
  c.save();c.translate(can.x,can.y);c.rotate(can.angle);
  const brass=material(c,-16,-14,17,11,[[0,'#e0c99b'],[.32,'#b49e73'],[.64,'#ecdbad'],[1,'#887754']]);
  // A broad enamel handle has a shaded inner edge rather than a flat loop.
  path(c,p=>{p.moveTo(10,-8);p.bezierCurveTo(24,-17,27,4,11,5);},null,'#3e655e',4.2);
  path(c,p=>{p.moveTo(10,-8);p.bezierCurveTo(24,-17,27,4,11,5);},null,'#a9b89a',2.3);
  path(c,p=>{p.moveTo(13,-9);p.quadraticCurveTo(22,-12,22,-4);},null,'#e0d8b184',.8);
  path(c,p=>{p.moveTo(-10,-1);p.lineTo(-21,-11);p.lineTo(-25,-10);p.lineTo(-12,8);p.closePath();},material(c,-23,-10,-12,5,[[0,'#c6cdb0'],[.35,'#97b39c'],[1,'#4e7b6d']]),'#3e645c',.85);
  line(c,[[-22,-9],[-12,1]],'#e0ddbb99',.8);
  box(c,-11,-10,23,22,4,material(c,-11,-8,13,11,[[0,'#9cb29b'],[.27,'#c1c9a4'],[.55,'#8fae94'],[1,'#547e6d']]),'#405e53',1);
  path(c,p=>{p.moveTo(-9,-8);p.quadraticCurveTo(-10,1,-8,8);},null,'#dce2bd9c',1.1);
  path(c,p=>{p.moveTo(9,-7);p.lineTo(9,7);p.quadraticCurveTo(7,10,4,10);},null,'#3e655e80',1.15);
  // Rolled copper rims, a recessed filling mouth and a tiny embossed leaf.
  ellipse(c,.5,-10,10.6,2.8,brass,0,'#77876c');
  ellipse(c,.5,-10.1,7.8,1.65,'#466d60');
  path(c,p=>{p.moveTo(-6,-10.5);p.quadraticCurveTo(0,-12,6,-10.5);},null,'#ced6b6',.6);
  path(c,p=>{p.moveTo(-9,10);p.quadraticCurveTo(1,12,10,9.7);},null,brass,1.4);
  ellipse(c,-23.5,-10.5,3.9,1.8,brass,.64,'#577868');
  for(const [x,y]of[[-24.2,-11.2],[-22.7,-10.4],[-24,-9.8]])ellipse(c,x,y,.45,.45,'#617866');
  path(c,p=>{p.moveTo(-1,5);p.quadraticCurveTo(-6,-1,3,-5);p.quadraticCurveTo(7,2,-1,5);},'#d7ddba','#7c9b7e',.7);
  path(c,p=>{p.moveTo(-1,6);p.quadraticCurveTo(0,2,3,-3);},null,'#72917a',.8);
  // Two small enamel chips are fixed to the object, never screen-space noise.
  line(c,[[7,5],[8,6]],'#dcd6ad',.8);line(c,[[-5,8],[-3,8.4]],'#577c68',.7);
  if(pose.open)for(let i=0;i<3;i++){
    const offset=pose.reduced?i*4:((pose.time*9+i*4)%13),x=-26-offset*.25,y=-6+offset;
    path(c,p=>{p.moveTo(x,y-2);p.quadraticCurveTo(x+1.6,y+.2,x,y+1.6);p.quadraticCurveTo(x-1.6,y+.2,x,y-2);},'#bce2cfaa');
    ellipse(c,x-.25,y+.2,.35,.65,'#f0f4dba8');
  }
  c.restore();
}
function greenhouseKeeper(c,pose){
  const cloth=material(c,-23,-44,24,-13,[[0,'#304b58'],[.28,'#55717a'],[.55,'#72848a'],[.78,'#4c6671'],[1,'#2c4754']]);
  // Small grounded shoes and narrow bone ankles retain the original height.
  for(const side of [-1,1]){
    line(c,[[side*7,-13],[side*8,-4]],'#c6b89c',3.4);
    path(c,p=>{p.moveTo(side*5,-5);p.lineTo(side*9,-6);p.quadraticCurveTo(side*11,-3,side*15,-3);p.lineTo(side*16,-.7);p.quadraticCurveTo(side*10,1,side*5,-.4);p.closePath();},material(c,0,-6,0,1,[[0,'#627066'],[.4,'#354d47'],[1,'#233e38']]),'#203a36',.65);
    line(c,[[side*6,.2],[side*15,.2]],'#a59e7c',.7);
  }
  path(c,p=>{p.moveTo(-16,-49);p.quadraticCurveTo(-3,-58,16,-49);p.bezierCurveTo(18,-37,19,-18,25,-8);p.quadraticCurveTo(13,-3,1,-6);p.quadraticCurveTo(-13,-2,-25,-8);p.bezierCurveTo(-20,-21,-19,-39,-16,-49);p.closePath();},cloth,'#263f4a',1.1);
  path(c,p=>{p.moveTo(-15,-44);p.quadraticCurveTo(-11,-28,-17,-8);p.lineTo(-23,-9);p.quadraticCurveTo(-19,-23,-15,-44);},'#1f3a4859');
  path(c,p=>{p.moveTo(9,-42);p.quadraticCurveTo(11,-22,18,-7);p.quadraticCurveTo(13,-6,9,-7);p.quadraticCurveTo(4,-29,9,-42);},'#a8b4ad22');
  path(c,p=>{p.moveTo(-13,-42);p.quadraticCurveTo(-12,-27,-14,-15);},null,'#9aa9a470',.85);
  path(c,p=>{p.moveTo(15,-42);p.quadraticCurveTo(17,-20,22,-10);},null,'#c0c1a94d',.85);
  path(c,p=>{p.moveTo(-22,-9);p.quadraticCurveTo(-11,-5,0,-7);p.quadraticCurveTo(13,-4.6,22,-8.8);},null,'#b8b4a57d',.85);
  path(c,p=>{p.moveTo(-15,-49);p.lineTo(-5,-37);p.lineTo(0,-44);p.lineTo(7,-36);p.lineTo(17,-49);},material(c,-15,-49,17,-36,[[0,'#81928f'],[.48,'#a5aca0'],[1,'#4c666e']]),'#394e58',.8);
  line(c,[[-13,-48],[-5,-39],[-1,-44]],'#d0cbb167',.75);line(c,[[2,-44],[7,-38],[14,-47]],'#d7d2ba79',.7);
  path(c,p=>{p.moveTo(-2,-37);p.quadraticCurveTo(-1,-21,-2,-8);},null,'#2e4652',2.3);
  line(c,[[-1.3,-36],[-1.3,-9]],'#b9b6aa80',.7);
  for(const y of [-31,-23,-15]){ellipse(c,2,y,1.5,1.6,'#5e695b');ellipse(c,2,y-.25,1.2,1.15,'#c7b484');ellipse(c,1.7,y-.7,.45,.4,'#ece0b4');}
  // The pocket is cloth; its warm stitching stays broad enough for 1x pixels.
  path(c,p=>{p.moveTo(-19,-18);p.lineTo(-11,-17);p.lineTo(-12,-10);p.quadraticCurveTo(-16,-9,-19,-12);p.closePath();},'#3b586258','#a9ad997a',.7);
  line(c,[[-18,-16],[-13,-15.5]],'#c4c3a86c',.65);

  c.save();c.translate(0,pose.open?-1:0);c.translate(0,-66);c.rotate(pose.gazeX*.045);c.translate(0,66);
  // The hood remains behind the bone face. Silver hair is made of soft locks,
  // not a hard helmet edge, while preserving the keeper's recognizable fringe.
  path(c,p=>{p.moveTo(-18,-51);p.bezierCurveTo(-25,-70,-18,-89,0,-90);p.bezierCurveTo(20,-90,25,-73,18,-51);},material(c,-21,-78,21,-58,[[0,'#2b424d'],[.5,'#51616a'],[1,'#273d49']]),'#253641',1);
  path(c,p=>{p.moveTo(-18,-53);p.quadraticCurveTo(-22,-72,-14,-81);},null,'#7f929259',.95);
  const bone=c.createRadialGradient(7,-73,3,0,-64,26);bone.addColorStop(0,'#fff0d0');bone.addColorStop(.48,'#e9d6b4');bone.addColorStop(.82,'#cdbb9c');bone.addColorStop(1,'#a39482');
  path(c,p=>{p.moveTo(-14,-78);p.bezierCurveTo(-19,-66,-16,-53,-9,-49);p.quadraticCurveTo(-4,-46,1,-47);p.quadraticCurveTo(12,-46,16,-58);p.quadraticCurveTo(19,-70,14,-79);p.closePath();},bone,'#968d7d',.85);
  path(c,p=>{p.moveTo(12,-76);p.quadraticCurveTo(17,-67,13,-57);},null,'#fff4d59c',.9);
  path(c,p=>{p.moveTo(-14,-71);p.quadraticCurveTo(-16,-63,-11,-57);},null,'#72958c40',1.1);
  const hair=material(c,-13,-85,15,-66,[[0,'#d7d8cc'],[.36,'#bfc3bd'],[.7,'#9ba8a6'],[1,'#6e8589']]);
  path(c,p=>{p.moveTo(-18,-65);p.quadraticCurveTo(-19,-77,-13,-84);p.quadraticCurveTo(-8,-89,-3,-85);p.quadraticCurveTo(3,-91,8,-86);p.quadraticCurveTo(17,-86,19,-75);p.lineTo(18,-65);p.quadraticCurveTo(13,-68,11,-76);p.quadraticCurveTo(8,-72,5,-77);p.quadraticCurveTo(1,-76,-4,-81);p.quadraticCurveTo(-7,-75,-11,-77);p.quadraticCurveTo(-12,-68,-18,-65);p.closePath();},hair,'#6a7b80',.8);
  for(const [x,y,x2,y2,x3,y3]of[[-15,-78,-13,-85,-7,-84],[-3,-84,2,-88,7,-84],[9,-83,15,-81,16,-75],[-15,-73,-15,-69,-17,-67]])path(c,p=>{p.moveTo(x,y);p.quadraticCurveTo(x2,y2,x3,y3);},null,'#f0ead66b',.8);
  for(const side of [-1,1]){
    const x=side*7.8;
    ellipse(c,x,-65,5.5,6.3,material(c,x-3,-70,x+4,-59,[[0,'#343d45'],[.6,'#455052'],[1,'#6a6a5b']]),side*.16,'#b7a58a');
    if(pose.blink)path(c,p=>{p.moveTo(x-2.7,-64.6);p.quadraticCurveTo(x,-63.5,x+2.7,-64.6);},null,'#dec69f',1.25);
    else{
      const irisX=x+pose.gazeX*1.3,irisY=-65+pose.gazeY;
      ellipse(c,irisX,irisY,1.85,2.7,'#d8c492');ellipse(c,irisX+.45,irisY-1,.6,.85,'#fff1c7');
    }
    const brow=pose.open?-1.1:pose.talking?-.5:0;
    path(c,p=>{p.moveTo(x-3.6,-73+brow);p.quadraticCurveTo(x,-75+brow,x+3.4,-72.7+brow);},null,'#c6c7b9',1.7);
    ellipse(c,side*12,-55.5,3,1.1,'#be9f8261');
  }
  // Brass rim and one quiet glass reflection keep the eye clearly readable.
  const rim=material(c,1,-73,16,-56,[[0,'#e8d7a2'],[.32,'#a99669'],[.58,'#f4e5b7'],[1,'#a38e61']]);
  ellipse(c,8,-65,8.2,8.6,null,0,'#61736a');c.lineWidth=1.3;ellipse(c,8,-65,7.8,8.2,null,0,rim);
  path(c,p=>{p.moveTo(4,-71);p.quadraticCurveTo(2,-68,2.5,-65);},null,'#fff6d860',.9);
  path(c,p=>{p.moveTo(14,-58);p.bezierCurveTo(18,-50,15,-44,20,-39);},null,'#6c7361',1.7);
  path(c,p=>{p.moveTo(14,-58);p.bezierCurveTo(18,-50,15,-44,20,-39);},null,'#c4b183',.85);
  path(c,p=>{p.moveTo(-1,-59);p.lineTo(-3,-54);p.quadraticCurveTo(0,-53,3,-54);},null,'#a18e78',.85);
  path(c,p=>{p.moveTo(-8,-50);p.quadraticCurveTo(0,pose.talking?-44.5:pose.open?-45.5:-47,9,-50);},null,'#947e6c',1);
  for(const x of [-4,1,6])line(c,[[x,-48],[x,-45]],'#b69e80',.7);
  path(c,p=>{p.moveTo(-10,-44);p.quadraticCurveTo(0,-40,10,-44);p.quadraticCurveTo(9,-36,5,-32);p.lineTo(0,-36);p.lineTo(-4,-32);p.quadraticCurveTo(-8,-38,-10,-44);},material(c,-9,-43,9,-33,[[0,'#d5d7ca'],[.45,'#b7c0b7'],[1,'#809797']]),'#74878b',.7);
  line(c,[[-5,-41],[-3,-36]],'#eef0d573',.75);line(c,[[4,-41],[3,-36]],'#dee3cc73',.75);
  c.restore();

  // The wrists are the rotated can's own grip points. Raising or tipping the
  // prop cannot leave either hand floating beside its handle.
  const can=greenhouseCanPose(pose);
  for(const [index,side]of[-1,1].entries()){
    const hand=can.hands[index],elbowX=side*21,elbowY=hand.y+5;
    path(c,p=>{p.moveTo(side*16,-43);p.quadraticCurveTo(elbowX,elbowY,hand.x,hand.y);},null,'#2f4953',7.4);
    path(c,p=>{p.moveTo(side*16,-43);p.quadraticCurveTo(elbowX,elbowY,hand.x,hand.y);},null,side<0?'#688180':'#849690',5.4);
    path(c,p=>{p.moveTo(side*16-1,-43);p.quadraticCurveTo(elbowX-1,elbowY-2,hand.x-1,hand.y-1);},null,'#bdc4ad7a',.8);
  }
  finishedWateringCan(c,pose,can);
  for(const hand of can.hands){
    ellipse(c,hand.x,hand.y,3.1,3.5,material(c,hand.x-3,hand.y-3,hand.x+3,hand.y+3,[[0,'#fff0ce'],[.5,'#dfceab'],[1,'#ab9f86']]),-.1,'#9d9c7b');
    line(c,[[hand.x-.6,hand.y+.5],[hand.x-.5,hand.y+2]],'#b7a88b',.6);
  }
}
function keeper(c,pose) {
  if(pose.greenhouse){greenhouseKeeper(c,pose);return;}
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
  const theatre=view.chapterIndex===2&&view.motif==='moth'&&view.prop==='theatre-ticket';
  const theatreLamps=theatre?clamp(finite(view.seals),0,2):0;
  const invite=theatre&&open?clamp(finite(view.capOpen),0,1):0;
  const pose={time:t,reduced:!!reducedMotion,prop:view.prop,open,talking:!!view.talking,salute,warm,propX:salute*21,
    greenhouse:view.chapterIndex===1&&view.prop==='greenhouse-can',
    painted:(view.lighting==='painted-station'&&view.chapterIndex===0)||theatre,
    theatre,theatreLamps,invite,
    smile:(welcome&&!reducedMotion&&progress>.24&&progress<.81)||(theatre&&theatreLamps===2),
    gazeX:clamp((finite(look.x,x)-x)/140,-1,1),gazeY:clamp((finite(look.y,y-65)-(y-65))/100-(invite*.45),-1.2,1.2),
    blink:!reducedMotion&&Math.sin(t*1.67+view.chapterIndex*.4)>.992,
    lift:(open?11:view.talking?3:0)+notice*2+salute*14+invite*2};
  c.save();c.translate(x,y);c.lineCap='round';c.lineJoin='round';c.lineWidth=1;
  ellipse(c,0,2,view.motif==='whale'?34:27,4,'#10202a55');
  // Body breathing is deliberately tiny; the first platform is just above us.
  c.save();if(view.motif!=='whale'&&!reducedMotion)c.translate(0,-Math.sin(t*1.4)*.7);
  if(view.motif==='moth')moth(c,pose);else if(view.motif==='keeper')keeper(c,pose);else whale(c,pose);
  c.restore();label(c,view);c.restore();
}
