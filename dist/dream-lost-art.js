// A lost-property cabinet and its projected memories. The controller supplies
// all observation, selection and hand-off state; painting never changes it.
const TAU = Math.PI * 2;
const INK = '#40384f';
const NIGHT = '#202c36';
const CREAM = '#f8e9c8';
const GOLD = '#e8c491';
const MINT = '#bcebd4';
const ROSE = '#dca6b4';
const FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);

function ellipse(c, x, y, rx, ry, fill, rotation = 0) {
  c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rotation, 0, TAU);
  c.fillStyle = fill; c.fill();
}
function line(c, points, color, width = 1.5, close = false) {
  if (!points.length) return;
  c.beginPath(); c.moveTo(...points[0]);
  for (const p of points.slice(1)) c.lineTo(...p);
  if (close) c.closePath();
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function curve(c, points, color, width = 1.5) {
  c.beginPath(); c.moveTo(points[0], points[1]); c.bezierCurveTo(...points.slice(2));
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function shape(c, points, fill, edge = null, width = 1) {
  c.beginPath(); c.moveTo(...points[0]);
  for (const p of points.slice(1)) c.lineTo(...p);
  c.closePath(); c.fillStyle = fill; c.fill();
  if (edge) { c.strokeStyle = edge; c.lineWidth = width; c.stroke(); }
}
function box(c, x, y, w, h, fill, radius = 3, edge = null, width = 1) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, w), Math.max(0, h), radius);
  c.fillStyle = fill; c.fill();
  if (edge) { c.strokeStyle = edge; c.lineWidth = width; c.stroke(); }
}
function ring(c, x, y, r, color, width = 1) {
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU);
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function star(c, x, y, r, fill) {
  shape(c, [[x,y-r],[x+r*.29,y-r*.29],[x+r,y],[x+r*.29,y+r*.29],[x,y+r],[x-r*.29,y+r*.29],[x-r,y],[x-r*.29,y-r*.29]], fill);
}
function heart(c, x, y, r, fill) {
  c.beginPath(); c.moveTo(x, y+r);
  c.bezierCurveTo(x-r*1.7,y-r*.15,x-r*.8,y-r*1.55,x,y-r*.4);
  c.bezierCurveTo(x+r*.8,y-r*1.55,x+r*1.7,y-r*.15,x,y+r);
  c.fillStyle = fill; c.fill();
}
function pointedLeaf(c,x,y,w,h,fill,angle=0) {
  c.save();c.translate(x,y);c.rotate(angle);
  c.beginPath();c.moveTo(-w,0);c.bezierCurveTo(-w*.15,-h,w*.65,-h,w,0);c.bezierCurveTo(w*.15,h,-w*.65,h,-w,0);c.fillStyle=fill;c.fill();
  line(c,[[-w*.72,0],[w*.72,0]],CREAM+'77',.65);c.restore();
}
function mapleLeaf(c,x,y,r,fill) {
  const points=[[-.1,1],[-.25,.48],[-.84,.2],[-.53,.03],[-.74,-.55],[-.26,-.35],[0,-1],[.26,-.35],[.74,-.55],[.53,.03],[.84,.2],[.25,.48],[.1,1]].map(([px,py])=>[x+px*r,y+py*r]);
  shape(c,points,fill);line(c,[[x,y+r*.7],[x,y-r*.65]],CREAM+'99',.65);
}
function tick(c, x, y, size = 1, color = MINT) {
  line(c, [[x-3.5*size,y],[x-size,y+2.7*size],[x+4*size,y-3.5*size]], color, 1.6*size);
}
function arrowHead(c, x, y, angle, color, size = 4) {
  c.save(); c.translate(x,y); c.rotate(angle);
  line(c, [[-size,-size*.66],[0,0],[-size,size*.66]], color, 1.4); c.restore();
}
function returnMark(c, x, y, r, color) {
  c.beginPath(); c.arc(x,y,r,-.7,Math.PI*1.42); c.strokeStyle=color;c.lineWidth=1.6;c.stroke();
  const a=Math.PI*1.42;arrowHead(c,x+Math.cos(a)*r,y+Math.sin(a)*r,a+Math.PI/2,color,3.3);
}
function keyBadge(c, x, y) {
  box(c,x-7.5,y-7.5,15,15,CREAM,4,NIGHT,.8);
  c.font=`bold 10px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=NIGHT;c.fillText('Q',x,y+.5);
}
function glanceMark(c, x, y, seen, color = MINT) {
  ellipse(c,x,y,7.3,7.3,NIGHT+'f2');ring(c,x,y,7.3,seen?color:CREAM+'66',.9);
  if(seen) tick(c,x,y,.8,color);
  else {
    c.beginPath();c.moveTo(x-4.3,y);c.quadraticCurveTo(x,y-4.4,x+4.3,y);c.quadraticCurveTo(x,y+4.4,x-4.3,y);
    c.strokeStyle=CREAM+'aa';c.lineWidth=.8;c.stroke();ellipse(c,x,y,1.4,1.6,CREAM+'bb');
  }
}

function eyes(c, x, y, gap = 6, happy = false, ink = INK, size = 1) {
  for(const side of [-1,1]) {
    const ex=x+side*gap;
    if(happy) curve(c,[ex-2.5*size,y,ex-1.5*size,y-3*size,ex+1.5*size,y-3*size,ex+2.5*size,y],ink,1.5*size);
    else { ellipse(c,ex,y,1.8*size,2.7*size,ink);ellipse(c,ex+.5*size,y-size,.6*size,.9*size,CREAM); }
  }
}
function cheeks(c, x, y, spread = 11) {
  ellipse(c,x-spread,y,3.7,1.6,'#e6a9957d');ellipse(c,x+spread,y,3.7,1.6,'#e6a9957d');
}
function smile(c,x,y,wrong=false,color=INK) {
  curve(c,[x-3,y,x-1,y+(wrong?-2:3),x+1,y+(wrong?-2:3),x+3,y],color+'b8',1);
}
function clockFace(c,x,y,r) {
  ellipse(c,x,y,r,r,GOLD);ellipse(c,x,y,r-1.7,r-1.7,CREAM);
  line(c,[[x,y-r*.55],[x,y],[x+r*.36,y+r*.22]],'#7c6670',1.1);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])line(c,[[x+Math.cos(a)*r*.67,y+Math.sin(a)*r*.67],[x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.8]],'#9e7f6c',.65);
  ellipse(c,x,y,1.1,1.1,'#7c6670');
}

function ashi(c,happy,wrong) {
  // The same open seam, left hinge, patched scarf and star satchel as the
  // larger character rig, kept readable inside a small memory cameo.
  shape(c,[[-18,15],[-12,7],[12,7],[19,28],[-20,28]],'#8c759f');
  line(c,[[-12,12],[11,26]],'#c79c7b',3);
  box(c,10,17,17,13,'#a87960',3,'#6b4c54',.8);star(c,18,21.5,3.5,GOLD);
  shape(c,[[-11,9],[-29,6],[-23,14],[-13,15]],'#d99a74');
  box(c,-17,7,34,8,'#e3a782',4);line(c,[[-11,10],[9,11]],'#ffd4a1',.9);
  box(c,-8,9,5,5,'#d9baa0',.8);line(c,[[-7,9],[-8,12],[-4,14]],'#98706d',.65);
  c.beginPath();c.moveTo(-18,-12);c.bezierCurveTo(-21,3,-13,9,-10,9);c.lineTo(-9,15);c.quadraticCurveTo(0,21,10,14);c.lineTo(11,9);c.bezierCurveTo(18,7,21,-3,18,-12);c.closePath();
  const bone=c.createLinearGradient(-17,-15,16,17);bone.addColorStop(0,'#fff3d5');bone.addColorStop(1,'#dbbc91');c.fillStyle=bone;c.fill();c.strokeStyle='#816d6d';c.lineWidth=.9;c.stroke();
  ellipse(c,0,-12,18,4,'#c8ab88');ellipse(c,0,-13,15.5,2.8,'#314851');
  ellipse(c,4,-17,4,6,MINT);star(c,4,-21,2,GOLD);
  c.save();c.translate(-17,-13);c.rotate(-.24);c.translate(17,13);
  c.beginPath();c.moveTo(-18,-14);c.bezierCurveTo(-17,-35,15,-35,18,-14);c.quadraticCurveTo(0,-9,-18,-14);c.fillStyle=CREAM;c.fill();c.strokeStyle='#a58c76';c.lineWidth=.9;c.stroke();
  curve(c,[-13,-22,-8,-29,-2,-30,1,-30],'#fff8e4',2);line(c,[[3,-31],[0,-26],[4,-23]],'#b59d82',.6);c.restore();
  box(c,-19,-15,4,6,GOLD,1,'#92745c',.6);box(c,17,-14,3,5,GOLD,1);
  for(const x of [-8,8]){ellipse(c,x,-1,6,7.4,'#453c51');if(happy)curve(c,[x-3,0,x-1,-3,x+1,-3,x+3,0],GOLD,1.6);else{ellipse(c,x+.5,-1,2.2,3.5,GOLD);ellipse(c,x+1,-2,1,1.4,CREAM);}}
  cheeks(c,0,7,13);shape(c,[[-2,6],[0,3],[2,6],[0,7]],'#aa8572');
  smile(c,0,11,wrong,'#9f7b6b');for(const x of [-5,0,5])line(c,[[x,13],[x,16]],'#a88970',.65);
}
function light(c,happy,wrong) {
  const g=c.createLinearGradient(-10,-30,12,27);g.addColorStop(0,'#f2ffe7');g.addColorStop(.52,'#bff1d8');g.addColorStop(1,'#80cbb9');
  c.beginPath();c.moveTo(-12,14);c.bezierCurveTo(-30,6,-27,-12,-14,-19);c.quadraticCurveTo(-5,-25,-3,-33);c.bezierCurveTo(7,-29,5,-20,15,-14);c.bezierCurveTo(31,-4,22,16,9,20);c.quadraticCurveTo(0,23,-7,20);c.quadraticCurveTo(-11,29,-21,27);c.quadraticCurveTo(-14,21,-12,14);c.fillStyle=g;c.fill();c.strokeStyle='#e6f8dc';c.lineWidth=1.6;c.stroke();
  curve(c,[-17,-9,-16,-16,-9,-20,-6,-24],'#f5ffe7',2.2);star(c,0,-17,4.2,GOLD);
  eyes(c,0,-4,7,happy,'#48796d',1.15);cheeks(c,0,5,13);smile(c,1,8,wrong,'#578d79');
  curve(c,[-20,5,-27,1,-29,6,-31,4],MINT,2);curve(c,[21,5,27,-1,29,3,30,1],MINT,2);
}
function moth(c,happy,wrong) {
  for(const side of [-1,1]){
    c.save();c.scale(side,1);
    c.beginPath();c.moveTo(5,-4);c.bezierCurveTo(18,-28,36,-21,29,-4);c.quadraticCurveTo(24,5,11,7);c.bezierCurveTo(29,9,25,28,11,24);c.lineTo(5,10);c.fillStyle=side===1?'#e9d3b0':'#ddbd9f';c.fill();c.strokeStyle='#a58a9c';c.lineWidth=.8;c.stroke();
    line(c,[[12,-3],[25,-13],[20,-2]],'#b89c9c',.8);line(c,[[13,11],[19,19]],'#b79b9b',.8);star(c,23,-9,2.5,CREAM);c.restore();
  }
  ellipse(c,0,14,12,17,'#a189ad');curve(c,[-10,13,-3,16,4,16,11,13],'#d1b1c5',2);curve(c,[-10,23,-3,25,4,25,10,22],'#c8a8be',2);
  for(const side of [-1,1]){curve(c,[side*7,-19,side*9,-26,side*13,-27,side*14,-30],'#c9b5bf',1.3);ellipse(c,side*14,-30,2,2,CREAM);}
  ellipse(c,0,-8,14,15,'#efdabb');
  for(const[x,y,r]of[[-9,-21,5],[-3,-24,6],[5,-24,6],[10,-20,5]])ellipse(c,x,y,r,r*.75,'#f6e8cf');
  eyes(c,0,-9,6,happy,INK,.8);for(const x of [-6,6])ring(c,x,-9,5.5,'#866e85',.8);line(c,[[-.5,-9],[.5,-9]],'#866e85',.8);
  cheeks(c,0,-2,10);smile(c,0,2,wrong,'#9f7b79');
  curve(c,[-9,11,-15,15,-11,21,-6,20],CREAM,2);curve(c,[9,11,15,15,11,21,6,20],CREAM,2);
  box(c,-6,14,12,13,'#e9b979',2,'#a58578',.8);curve(c,[-4,14,-5,7,5,7,4,14],'#c3aa91',1);line(c,[[0,17],[0,24]],'#fff0bc',2);
}
function keeper(c,happy,wrong) {
  c.beginPath();c.moveTo(-19,25);c.bezierCurveTo(-25,3,-23,-28,-6,-30);c.bezierCurveTo(18,-36,26,-14,21,24);c.closePath();c.fillStyle='#42465e';c.fill();
  shape(c,[[-17,8],[0,5],[17,8],[26,28],[-26,28]],'#52647d');line(c,[[-17,13],[-7,21],[0,16],[9,22],[18,12]],'#9aacc2',1);
  c.beginPath();c.moveTo(-15,-19);c.bezierCurveTo(-21,-5,-14,8,-8,8);c.lineTo(-7,14);c.quadraticCurveTo(1,18,10,12);c.lineTo(10,7);c.bezierCurveTo(20,0,19,-13,12,-20);c.closePath();c.fillStyle='#e8d1ae';c.fill();
  shape(c,[[-16,-13],[-15,-23],[-7,-29],[0,-25],[5,-28],[15,-22],[18,-12],[8,-19],[4,-16],[-4,-21],[-9,-17]],'#b7b3ba');
  for(const x of [-7,7])ellipse(c,x,-5,5.5,5.4,'#4c4357');eyes(c,0,-5,7,happy,GOLD,.75);
  ring(c,8,-5,7.6,GOLD,1.3);curve(c,[15,0,16,8,20,11,18,18],GOLD,1);cheeks(c,0,2,12);
  smile(c,0,8,wrong,'#a18073');for(const x of [-4,0,4])line(c,[[x,10],[x,13]],'#a18476',.7);
  shape(c,[[-7,13],[0,15],[8,12],[4,22],[0,19],[-4,22]],'#c1bec6');
  curve(c,[-18,19,-18,13,-11,14,-9,20],CREAM,3);curve(c,[18,19,18,13,11,14,9,20],CREAM,3);clockFace(c,0,23,10.3);
}
function rabbit(c,happy,wrong) {
  for(const side of [-1,1]){ellipse(c,side*8,-22,5.3,12.7,CREAM,side*.16);ellipse(c,side*8,-22,2.2,8.6,'#daa8b6',side*.16);}
  ellipse(c,0,19,15,13,'#b69bc4');ellipse(c,0,17,9,8,'#e7d9dc');
  ellipse(c,0,-1,18,16.5,'#f0e4cb');ellipse(c,-15,3,5,5,'#f0e4cb');ellipse(c,15,3,5,5,'#f0e4cb');
  eyes(c,0,-3,7,happy,INK,1);cheeks(c,0,4,12);heart(c,0,4,2.2,'#c28a95');smile(c,0,8,wrong,'#9f7a7d');
  box(c,-13,11,26,6,'#c69db7',3);shape(c,[[10,13],[16,21],[9,23],[5,15]],'#c69db7');
  ellipse(c,-9,23,5,4,CREAM);ellipse(c,9,23,5,4,CREAM);star(c,0,21,5.2,GOLD);
}
function bat(c,happy,wrong) {
  for(const side of [-1,1]){
    c.save();c.scale(side,1);c.beginPath();c.moveTo(9,-1);c.quadraticCurveTo(24,-21,33,-12);c.quadraticCurveTo(23,-12,28,3);c.quadraticCurveTo(18,-1,17,12);c.quadraticCurveTo(12,6,8,11);c.closePath();c.fillStyle='#ab92bf';c.fill();c.strokeStyle='#d7bedc';c.lineWidth=.8;c.stroke();curve(c,[10,0,17,-9,21,-9,27,-11],'#d3b4d3',.75);c.restore();
  }
  ellipse(c,0,14,11,15,'#89769f');ellipse(c,0,16,6,10,'#bca8c4');
  for(const side of [-1,1]){shape(c,[[side*3,-15],[side*13,-31],[side*17,-11]],'#a58bb8','#d4b3cc',.7);shape(c,[[side*8,-16],[side*12,-25],[side*14,-15]],'#d5a9b7');}
  ellipse(c,0,-6,17,15,'#aa8eb9');eyes(c,0,-8,7,happy,INK,1.1);ellipse(c,0,0,8,5,'#d9bfd0');cheeks(c,0,1,12);smile(c,0,3,wrong,'#836181');
  shape(c,[[-9,10],[0,14],[-7,18]],'#d4b67e');shape(c,[[9,10],[0,14],[7,18]],GOLD);star(c,0,14,2.4,CREAM);
}
function pumpkin(c,happy,wrong) {
  shape(c,[[-15,11],[14,11],[23,29],[-22,29]],'#756080');box(c,-2,15,4,10,GOLD,1);star(c,0,19,2.2,CREAM);
  ellipse(c,0,-2,20,18,'#e5a36b');ellipse(c,-8,-2,10,17,'#eab176');ellipse(c,8,-2,10,17,'#dc9861');ellipse(c,0,-2,10,18,'#efb97b');
  for(const x of [-9,9])curve(c,[x,-17,x*.5,-10,x*.5,8,x,13],'#bd7a575c',.7);
  eyes(c,0,-3,7,happy,'#6f4c52',1.05);cheeks(c,0,4,13);smile(c,0,7,wrong,'#986047');
  shape(c,[[-14,-17],[-5,-33],[2,-29],[9,-17]],'#726080');ellipse(c,-1,-16,22,4,'#6c577e');line(c,[[-10,-21],[6,-21]],GOLD,3);box(c,-2,-23,5,4,'#6b587e',.5,GOLD,.8);
}
function crane(c,happy,wrong) {
  // Folded paper, an actual long neck, and the postal heart distinguish Aling
  // from the soft round rabbits used in the other festival memories.
  shape(c,[[-3,10],[-30,-8],[-24,23],[0,26]],'#d3d7df','#a8a7bf',.8);
  shape(c,[[0,12],[29,-16],[24,21],[0,26]],'#f4ecd9','#b8afbf',.8);
  line(c,[[-27,-5],[-8,19],[0,26]],'#b8b5c8',.8);line(c,[[26,-10],[9,16],[0,26]],'#d4c3c6',.8);
  shape(c,[[-9,20],[0,-4],[3,-22],[12,-25],[16,-17],[10,-12],[7,9],[15,23],[0,29]],'#f2e8d9','#b6a8bb',.8);
  shape(c,[[13,-21],[27,-15],[14,-14]],'#d2a282');line(c,[[1,-1],[7,5],[7,20]],'#c6bbcf',.9);
  if(happy)curve(c,[6,-18,7,-20,9,-20,10,-18],INK,1);else ellipse(c,8,-18,1.4,1.8,INK);
  ellipse(c,10,-13,3,1.2,'#d9a1af88');box(c,-3,-1,15,5,'#bf96b6',2);shape(c,[[6,1],[13,10],[7,11],[2,3]],'#bf96b6');
  box(c,-5,15,13,10,CREAM,2,'#c5b29d',.6);heart(c,1.5,19.5,3.1,ROSE);
  if(wrong)line(c,[[6,-23],[10,-22]],INK+'99',.8);
}
function sprout(c,happy,wrong) {
  // A little gardener: leaf silhouette, seed-shell collar and a stitched apron.
  curve(c,[0,-11,-1,-22,4,-24,2,-30],'#9cc9a2',2);
  pointedLeaf(c,-12,-23,12,6,'#9ac89c',.38);pointedLeaf(c,13,-27,12.5,6,'#b9d6a4',-.36);
  for(const side of [-1,1]){curve(c,[side*8,25,side*9,28,side*13,28,side*15,30],'#bdb68c',2);pointedLeaf(c,side*17,10,8,4,'#a8c6a0',side*.6);}
  c.beginPath();c.moveTo(-15,6);c.quadraticCurveTo(0,1,15,6);c.lineTo(12,28);c.quadraticCurveTo(0,34,-12,28);c.closePath();
  const pot=c.createLinearGradient(-12,6,12,30);pot.addColorStop(0,'#d8a17e');pot.addColorStop(1,'#a57565');c.fillStyle=pot;c.fill();c.strokeStyle='#8b6f67';c.lineWidth=.7;c.stroke();
  box(c,-17,7,34,6,'#e5b18a',3);shape(c,[[-10,12],[9,12],[12,27],[-11,27]],'#cfdbc0');
  c.setLineDash([1.1,2]);line(c,[[-7,14],[-8,24],[8,24],[7,14]],'#8eaa8a',.75);c.setLineDash([]);
  ellipse(c,0,-4,17,17,'#dcebc6');ellipse(c,-13,1,5.5,6,'#d4e6bd');ellipse(c,13,1,5.5,6,'#d4e6bd');
  curve(c,[-11,-13,-5,-19,5,-19,10,-14],'#f4f6d9',1.5);eyes(c,0,-5,6.5,happy,'#4b7060',1.05);cheeks(c,0,2,11);smile(c,0,6,wrong,'#71977b');
  shape(c,[[-14,7],[-5,10],[0,8],[5,10],[14,7],[9,13],[0,11],[-9,13]],'#8bb496');star(c,0,10,2.4,GOLD);
  ellipse(c,9,22,4.5,3.5,'#789f98');curve(c,[12,20,19,17,18,25,13,24],'#a9c9b6',1.1);line(c,[[5,21],[2,17]],'#a9c9b6',1.1);
}
function mushroom(c,happy,wrong) {
  // The cap is a small umbrella with visible gills, not a second flower head.
  shape(c,[[-10,7],[-18,26],[0,29],[18,26],[10,7]],'#91b6aa');line(c,[[-10,13],[-5,24]],'#c4dbba',.8);line(c,[[10,13],[5,24]],'#c4dbba',.8);
  c.beginPath();c.moveTo(-12,-8);c.quadraticCurveTo(-8,-15,11,-8);c.lineTo(13,19);c.quadraticCurveTo(1,30,-12,20);c.closePath();c.fillStyle='#f1dfbb';c.fill();c.strokeStyle='#bba28d';c.lineWidth=.8;c.stroke();
  ellipse(c,0,-10,28,7,'#c0a0ad');
  for(const x of [-21,-14,-7,0,7,14,21])line(c,[[x,-11],[x*.48,-5]],'#f4dbc2',.7);
  c.beginPath();c.moveTo(-29,-13);c.bezierCurveTo(-26,-28,-11,-32,0,-31);c.bezierCurveTo(17,-32,25,-25,29,-13);c.quadraticCurveTo(1,-5,-29,-13);c.closePath();
  const cap=c.createLinearGradient(-20,-31,22,-7);cap.addColorStop(0,'#cf9fae');cap.addColorStop(1,'#987990');c.fillStyle=cap;c.fill();c.strokeStyle='#dcc3c4';c.lineWidth=1;c.stroke();
  for(const[x,y,rx,ry]of[[-17,-20,4.5,2.3],[-6,-26,3.8,2.5],[9,-24,4.8,2.4],[21,-17,2.8,1.7],[-1,-15,3,1.7]])ellipse(c,x,y,rx,ry,'#f1dabb');
  curve(c,[-23,-21,-19,-26,-13,-28,-9,-28],'#eed2c9',1.3);eyes(c,0,0,6,happy,'#7d657a',1);cheeks(c,0,7,10);smile(c,0,10,wrong,'#a78181');
  box(c,-11,15,22,5,'#b9c8a8',2);star(c,0,17,3,GOLD);ellipse(c,-8,26,5,2.5,CREAM);ellipse(c,8,26,5,2.5,CREAM);
}
function whale(c,happy,wrong) {
  c.beginPath();c.moveTo(-30,-1);c.bezierCurveTo(-26,-17,-1,-20,13,-9);c.quadraticCurveTo(21,-1,24,-4);c.quadraticCurveTo(31,-9,29,-17);c.quadraticCurveTo(39,-9,29,2);c.quadraticCurveTo(34,2,35,-3);c.quadraticCurveTo(37,9,26,10);c.quadraticCurveTo(20,8,15,9);c.bezierCurveTo(-1,26,-29,22,-31,7);c.quadraticCurveTo(-33,3,-30,-1);c.closePath();
  const body=c.createLinearGradient(-20,-17,17,21);body.addColorStop(0,'#a6b9ce');body.addColorStop(1,'#768da9');c.fillStyle=body;c.fill();c.strokeStyle='#c5d7d8';c.lineWidth=.8;c.stroke();
  c.beginPath();c.moveTo(-29,9);c.quadraticCurveTo(-9,24,15,9);c.quadraticCurveTo(-5,29,-27,16);c.closePath();c.fillStyle='#c6d6d9';c.fill();
  c.beginPath();c.moveTo(-4,14);c.quadraticCurveTo(-4,27,6,28);c.quadraticCurveTo(1,21,6,15);c.fillStyle='#7d96b2';c.fill();
  if(happy)curve(c,[-24,0,-22,-3,-19,-3,-17,0],INK,1.5);else{ellipse(c,-21,0,2.3,3,INK);ellipse(c,-20.4,-1,1,1.3,CREAM);}
  ellipse(c,-24,6,4,1.5,'#e1b6ad88');smile(c,-16,8,wrong,'#61758d');line(c,[[-5,-5],[0,-2],[6,-7],[12,-4]],'#d4d8d5aa',.7);star(c,8,3,2.2,'#dfdbc4');
  c.save();c.translate(-2,-18);c.rotate(.08);shape(c,[[-12,-4],[0,-2],[13,-7],[13,7],[0,11],[-12,7]],'#f0dfbd','#8e8194',.75);line(c,[[0,-1],[0,10]],'#a28d8e',.7);line(c,[[-9,0],[-3,1]],'#baa397',.7);line(c,[[4,0],[10,-2]],'#baa397',.7);line(c,[[-9,4],[-3,5]],'#baa397',.7);line(c,[[4,4],[10,2]],'#baa397',.7);c.restore();
  line(c,[[-18,-17],[-18,-26]],MINT,1);line(c,[[-18,-23],[-23,-27]],MINT,1);ellipse(c,-17,-29,1.7,1.7,MINT);
}
function squirrel(c,happy,wrong) {
  // Lili's curled tail, cream muzzle and cook's hat match the feast portrait.
  c.beginPath();c.moveTo(-7,25);c.bezierCurveTo(-30,30,-36,6,-26,-3);c.bezierCurveTo(-15,-14,-7,1,-16,8);c.bezierCurveTo(-24,11,-18,20,-7,17);c.closePath();c.fillStyle='#bd8d68';c.fill();c.strokeStyle='#e6be8c';c.lineWidth=1;c.stroke();
  curve(c,[-10,23,-28,24,-29,6,-22,3],'#d9ae7f',2);
  shape(c,[[-14,9],[13,9],[20,28],[-18,28]],'#bd9475');shape(c,[[-9,13],[9,13],[12,30],[-11,30]],'#ead8b6');line(c,[[-7,16],[7,16]],'#b39b7f',.7);
  for(const side of [-1,1]){ellipse(c,side*13,-19,6.5,9,'#c49770',side*.3);ellipse(c,side*13,-20,3,5,'#e4b99a',side*.3);}
  ellipse(c,0,-4,18,17,'#c49a75');ellipse(c,0,4,11,9,'#efddba');eyes(c,0,-6,7,happy,'#56454f',1.05);cheeks(c,0,2,13);
  shape(c,[[-3,3],[0,5],[3,3]],'#81605a');line(c,[[0,5],[0,8]],'#916b61',.8);smile(c,0,9,wrong,'#916b61');box(c,-1.8,10,3.6,3.5,CREAM,.5);
  box(c,-16,-20,32,6,'#ead9bd',2);for(const[x,y,r]of[[-12,-25,6.4],[-4,-29,7.2],[5,-29,7.2],[13,-25,6.4]])ellipse(c,x,y,r,r*.72,'#f3e5cd');
  c.beginPath();c.moveTo(-9,21);c.quadraticCurveTo(0,34,11,21);c.fillStyle='#c6d7c1';c.fill();ellipse(c,1,21,10,3.1,'#f2e3c6');ellipse(c,1,21,7.4,1.5,'#8d9290');curve(c,[-11,18,-14,23,-9,25,-7,24],CREAM,2);curve(c,[12,18,16,22,11,25,9,24],CREAM,2);
  mapleLeaf(c,13,14,5.2,'#d89f6f');
}
const PEOPLE = {ashi,light,moth,keeper,rabbit,bat,pumpkin,sprout,mushroom,whale,squirrel,'paper-crane':crane};
const PERSON_COLORS = {ashi:'#e9bc89',light:'#b8edd7',moth:'#ceb3df',keeper:'#a8c8df',rabbit:'#e3bed3',bat:'#c6b0da',pumpkin:'#efb47d',sprout:'#bdd7a8',mushroom:'#d9b3c3',whale:'#b5d6df',squirrel:'#e5bf8d','paper-crane':'#e2bccf'};

function drawPerson(c,motif,happy=false,wrong=false) {
  (PEOPLE[motif]||light)(c,happy,wrong);
}
function placeSymbol(c,motif,x,y,size=1,color=INK) {
  c.save();c.translate(x,y);c.scale(size,size);
  if(motif==='clock'){
    shape(c,[[-7,8],[-7,-7],[0,-12],[7,-7],[7,8]],color);ellipse(c,0,-3,4.8,4.8,CREAM);line(c,[[0,-6],[0,-3],[2,-1]],color,.9);box(c,-2,3,4,5,CREAM,1);
  }else if(motif==='sprout'){
    line(c,[[0,8],[0,-7]],color,1.8);ellipse(c,-4,-1,5.5,2.6,color,.4);ellipse(c,4,-6,5.5,2.6,color,-.4);line(c,[[-7,9],[7,9]],color,1);
  }else{
    shape(c,[[-9,-4],[0,-10],[9,-4]],color);box(c,-8,-3,16,10,color,1);box(c,-5,0,3,5,CREAM,.5);box(c,2,0,3,5,CREAM,.5);line(c,[[-10,9],[10,9]],color,1);
  }c.restore();
}
function tinyPersonMark(c,motif,x,y,scale=.18) {
  c.save();c.translate(x,y);c.scale(scale,scale);drawPerson(c,motif,false,false);c.restore();
}
function evidenceNumber(c,n,x,y,size=7,color=INK) {
  c.save();c.font=`600 ${size}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(String(n),x,y);c.restore();
}
function evidenceSymbol(c,symbol,x,y,r=6,color=INK,paper=CREAM) {
  c.save();c.translate(x,y);
  if(symbol==='moon'){
    c.beginPath();c.moveTo(r*.34,-r*.94);c.bezierCurveTo(-r*1.1,-r,-r*1.2,r*.9,r*.27,r);c.bezierCurveTo(r*.82,r*.82,r*.99,r*.5,r*.95,r*.22);c.bezierCurveTo(-r*.07,r*.64,-r*.48,-r*.42,r*.34,-r*.94);c.closePath();c.fillStyle=color;c.fill();
  }else if(symbol==='bell'){
    c.beginPath();c.moveTo(-r*.82,r*.5);c.quadraticCurveTo(-r*.5,-r*.1,-r*.53,-r*.48);c.bezierCurveTo(-r*.5,-r*1.05,r*.5,-r*1.05,r*.53,-r*.48);c.quadraticCurveTo(r*.5,-r*.1,r*.82,r*.5);c.closePath();c.fillStyle=color;c.fill();ellipse(c,0,r*.77,r*.21,r*.2,color);line(c,[[-r*.35,-r*.52],[-r*.43,0]],paper+'a0',Math.max(.6,r*.1));
  }else if(symbol==='star')star(c,0,0,r,color);
  else if(symbol==='wave'){
    for(const yy of [-r*.3,r*.35])curve(c,[-r,yy,-r*.35,yy-r*.65,r*.2,yy+r*.65,r,yy],color,Math.max(.8,r*.23));
  }else if(symbol==='envelope'){
    box(c,-r,-r*.65,r*2,r*1.3,color,1);line(c,[[-r*.8,-r*.45],[0,r*.14],[r*.8,-r*.45]],paper,Math.max(.7,r*.13));
  }else if(symbol==='pinecone'){
    c.beginPath();c.moveTo(0,-r);c.bezierCurveTo(-r*.95,-r*.6,-r*.95,r*.3,0,r);c.bezierCurveTo(r*.95,r*.3,r*.95,-r*.6,0,-r);c.closePath();c.fillStyle=color;c.fill();
    for(const yy of [-.4,.05,.48])line(c,[[-r*.4,yy*r-r*.14],[0,yy*r+r*.12],[r*.4,yy*r-r*.14]],paper,Math.max(.55,r*.1));line(c,[[0,-r],[r*.14,-r*1.25]],color,Math.max(.65,r*.16));
  }c.restore();
}
function uprightArrow(c,x,y,size=5,color=GOLD) {
  line(c,[[x,y+size*.45],[x,y-size*.65]],color,1);arrowHead(c,x,y-size*.7,-Math.PI/2,color,size*.65);
}
function currentDiagram(view,back) {
  // Never combine layers here, even after both have been observed. Each face
  // is a separate authored clue; the claimant comparison belongs to the player.
  if(view.object?.clueIndex===null||view.object?.clueIndex===undefined)return null;
  return view.variantDefinition?.clues?.[back?1:0]?.diagram||null;
}
function seedWindowBag(c,view,back) {
  const diagram=currentDiagram(view,back),holes=diagram?.type==='light-stencil'?diagram.holes:[];
  const cloth=c.createLinearGradient(-24,-26,24,29);cloth.addColorStop(0,back?'#d4c5a1':'#eddbb0');cloth.addColorStop(1,back?'#b4aa87':'#c8b590');
  c.beginPath();c.moveTo(-19,-23);c.quadraticCurveTo(-26,-6,-29,21);c.quadraticCurveTo(-22,31,0,30);c.quadraticCurveTo(22,31,29,21);c.quadraticCurveTo(26,-6,19,-23);c.closePath();c.fillStyle=cloth;c.fill();c.strokeStyle='#a58e78';c.lineWidth=1;c.stroke();
  for(const side of [-1,1]){
    curve(c,[side*16,-19,side*22,-6,side*23,11,side*24,24],'#fff0c966',.9);
    c.setLineDash([1.5,2.3]);curve(c,[side*20,-17,side*25,0,side*25,14,side*22,23],'#9a8c77',.7);c.setLineDash([]);
  }
  box(c,-21,-28,42,7,back?'#b3bd94':'#c3ce9b',2,'#8e9d80',.8);
  for(const x of [-15,-7,1,9,17])line(c,[[x,-26],[x-2,-22]],'#e9e5bf',.7);
  curve(c,[-20,-24,-5,-20,8,-20,21,-24],'#788b77',1.3);
  curve(c,[13,-24,19,-34,27,-31,17,-25],'#e7d3a9',1.3);curve(c,[15,-24,26,-19,30,-25,18,-25],'#e7d3a9',1.3);line(c,[[17,-24],[24,-16]],'#a38e76',1.1);
  box(c,-18,-10,36,33,back?'#c9c5a0':'#e4d4aa',3,'#9e9d7d',.8);
  if(diagram?.type==='light-stencil'){
    uprightArrow(c,0,-15,5,'#738e79');
    // Cell 0/1 are always top-left/top-right; 2/3 remain below them on
    // both faces. Back-view art deliberately does not reflect this grid.
    for(let index=0;index<4;index++){
      const x=-7.5+(index%2)*15,y=-2+Math.floor(index/2)*15;
      if(holes.includes(index)){
        box(c,x-5.5,y-5.5,11,11,'#344c4c',1.5,'#f1dfad',.9);
        line(c,[[x-4,y+4],[x+4,y+4]],'#88ada0',.6);line(c,[[x-4,y-4],[x+4,y-4]],'#243c3f',.7);
      }else{
        box(c,x-5.5,y-5.5,11,11,'#cabd94',1.5,'#aba47f',.6);
        line(c,[[x-4,y-2],[x+4,y-2]],'#e4d7ae',.6);line(c,[[x-4,y+2],[x+4,y+2]],'#e4d7ae',.6);
      }
    }
  }else{
    pointedLeaf(c,-5,2,6.5,3,'#9fab84',.5);pointedLeaf(c,6,-4,7,3.1,'#9fab84',-.4);line(c,[[0,13],[0,-4]],'#93a27f',1.2);
    c.setLineDash([1,2]);line(c,[[-12,18],[12,18]],'#aaa17f',.7);c.setLineDash([]);
  }
  if(back)curve(c,[-20,22,-9,25,11,25,21,22],'#92977b',.7);
  else{ellipse(c,-20,16,1.3,1.8,'#c89d6d',-.3);ellipse(c,21,9,1.2,1.7,'#ba9773',.4);}
}
function echoBookmark(c,view,back) {
  const diagram=currentDiagram(view,back),slots=diagram?.type==='score-fragment'?diagram.slots:[];
  c.beginPath();c.moveTo(-34,-9);c.bezierCurveTo(-27,-24,-6,-22,12,-13);c.quadraticCurveTo(21,-6,25,-10);c.quadraticCurveTo(33,-16,32,-24);c.quadraticCurveTo(40,-16,32,-4);c.quadraticCurveTo(38,-3,39,-8);c.quadraticCurveTo(41,4,29,8);c.bezierCurveTo(14,26,-16,27,-30,13);c.quadraticCurveTo(-38,5,-34,-9);c.closePath();
  const paper=c.createLinearGradient(-26,-20,30,23);paper.addColorStop(0,back?'#bfc9d5':'#c8dbe0');paper.addColorStop(1,back?'#8f9eb6':'#93afbf');c.fillStyle=paper;c.fill();c.strokeStyle='#d9e3db';c.lineWidth=.9;c.stroke();
  line(c,[[-31,-9],[-15,-18],[5,-10]],'#f5ebd5aa',.9);line(c,[[23,1],[32,-4],[32,-18]],'#748ba384',.8);
  shape(c,[[-4,20],[1,32],[9,21]],'#94b0c1','#cedbd7',.7);line(c,[[1,25],[3,29]],'#e4e7d7',.6);
  ellipse(c,-25,-12,1.7,1.9,'#5d6d80');ellipse(c,-24.6,-12.6,.55,.65,CREAM);curve(c,[-21,-7,-19,-5,-17,-5,-15,-7],'#7a8596',.7);
  ring(c,-14,-18,2.3,'#e7cfac',.9);curve(c,[-14,-20,-19,-29,-9,-31,-6,-25],'#b7a5b5',1.1);line(c,[[-6,-25],[-4,-20]],'#e2c4af',1.2);
  box(c,-29,-5,54,24,back?'#e3dac4':'#f1e7cc',2,'#a8a0a0',.65);
  if(diagram?.type==='score-fragment'){
    line(c,[[-26,-8],[-17,-8]],'#758c98',.8);arrowHead(c,-16,-8,0,'#758c98',2.4);
    for(let beat=0;beat<4;beat++){
      const x=-22.5+beat*13.5,slot=slots.find(item=>item.beat===beat);
      box(c,x-5.3,-2.5,10.6,11.5,slot?'#fcf1d6':'#c9c9be',1,'#b4b3a56b',.5);
      if(slot)evidenceSymbol(c,slot.symbol,x,3.3,4.1,'#697a87','#fcf1d6');
      else line(c,[[x-3.8,6.5],[x+3.8,-.5]],'#dce0cb',.65);
      evidenceNumber(c,beat+1,x,14,6.8,'#6e7e86');
    }
  }else{
    for(const yy of [2,8,14])curve(c,[-22,yy,-12,yy-3,7,yy+3,18,yy],'#b3bcae',.65);
  }
}
function littleSeat(c,x,y,selected=false,number=null) {
  box(c,x-4,y-7,8,7,selected?'#e7bd82':'#c7ac87',1.6,selected?'#9e785c':'#aa967e',.6);line(c,[[x-5,y+1],[x+5,y+1]],'#9f826b',1.2);line(c,[[x-3,y+1],[x-4,y+5]],'#9f826b',.8);line(c,[[x+3,y+1],[x+4,y+5]],'#9f826b',.8);
  if(number!==null)evidenceNumber(c,number,x,y-3,5.8,selected?'#785f53':'#9b826a');
  if(selected)line(c,[[x-7,y-9],[x-7,y-12],[x+7,y-12],[x+7,y-9]],'#bd8e62',1);
}
function foldedSeatCard(c,view,back) {
  const diagram=currentDiagram(view,back);
  shape(c,[[-31,-24],[28,-24],[36,24],[-36,24]],back?'#ddbd91':'#f0d8b0','#b29173',.9);
  shape(c,[[-31,-24],[-23,-19],[-28,23],[-36,24]],back?'#b79578':'#d1ab83');
  line(c,[[-30,-23],[28,-23]],'#fff0cc',1.1);line(c,[[-29,23],[30,23]],'#be9c7a',.65);
  c.setLineDash([1,2.2]);line(c,[[-28,-17],[25,-17]],'#d6b28a',.6);c.setLineDash([]);
  mapleLeaf(c,-27,-17,5.8,'#c68b69');mapleLeaf(c,28,17,4.8,'#d5a171');
  if(diagram?.type==='seat-relation'){
    // A relation strip and a separate row of empty chairs do not assign either
    // symbol to a numbered seat before the two facts have been combined.
    box(c,-23,-14,46,18,'#f9e9c8',2,'#c9b08b',.55);
    evidenceSymbol(c,diagram.relation.left,-14,-5,5,'#8e776b','#f9e9c8');
    evidenceSymbol(c,diagram.relation.right,14,-5,5,'#8e776b','#f9e9c8');
    line(c,[[-4,-5],[4,-5]],'#a48063',1);arrowHead(c,5,-5,0,'#a48063',2.8);
    for(let index=0;index<3;index++)littleSeat(c,-17+index*17,16,Number.isInteger(diagram.targetSeat)&&index===diagram.targetSeat,index+1);
  }else{
    mapleLeaf(c,0,-1,13,'#d4a37d');curve(c,[-20,15,-9,18,8,18,20,15],'#c8a17d',.8);
  }
}
function drawClaimantEvidence(c,person) {
  const diagram=person.diagram;
  if(diagram?.type==='lamp-badge'){
    box(c,-33,10,21,25,'#3e5752',4,GOLD,.9);uprightArrow(c,-22.5,14,2.6,CREAM);
    for(let index=0;index<4;index++){
      const x=-26+(index%2)*7,y=21+Math.floor(index/2)*7,lit=diagram.cells.includes(index);
      box(c,x-2.5,y-2.5,5,5,lit?'#f2dc9e':'#263c3d',.8,lit?'#fff0c2':'#72948a',.5);
    }
  }else if(diagram?.type==='name-badge'){
    ellipse(c,-24,25,9,9,'#e8cfaa');ring(c,-24,25,9,'#aa8770',.8);evidenceSymbol(c,diagram.symbol,-24,25,5.2,'#8d7066','#e8cfaa');
  }else if(diagram?.type==='rhythm-signature'){
    // Keep all four numbered beats above the cameo: the whale-library
    // exhibit is directly below the right-hand claimant, so a lower ribbon
    // would cover either the bookmark or that claimant's signature.
    box(c,-32,-64,64,22,NIGHT+'ed',4,'#b6cdd46e',.7);
    for(let beat=0;beat<4;beat++){
      const x=-24+beat*16;evidenceNumber(c,beat+1,x,-59,6.2,'#c0c1bd');evidenceSymbol(c,diagram.symbols[beat],x,-49.5,4.5,'#dfd5ba',NIGHT);
    }
  }
}
function ticket(c,view,back) {
  const fill=c.createLinearGradient(-34,-20,31,22);fill.addColorStop(0,'#fff0c8');fill.addColorStop(1,'#e3bf89');
  c.beginPath();c.moveTo(-35,-19);c.lineTo(35,-19);c.lineTo(35,-6);c.quadraticCurveTo(27,0,35,6);c.lineTo(35,19);c.lineTo(-35,19);c.lineTo(-35,6);c.quadraticCurveTo(-27,0,-35,-6);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle='#a48670';c.lineWidth=1;c.stroke();
  box(c,-29,-15,58,30,'#fff3d008',2,'#bd997555',.7);line(c,[[23,-15],[23,15]],'#9c7b6888',.8);c.setLineDash([1.4,2.4]);line(c,[[-24,-14],[-24,14]],'#ab8b72',.8);c.setLineDash([]);
  if(back){
    ring(c,-2,0,12,'#a77d7588',1.7);returnMark(c,-2,0,7.5,'#a77d75');star(c,17,-9,2.3,'#ac8a6c');line(c,[[-19,11],[-11,11]],'#b3937266',.8);
  }else if(view.object?.clueIndex!==null&&view.object?.clueIndex!==undefined){
    const d=view.variantDefinition?.clues?.[0]?.diagram;
    placeSymbol(c,d?.from?.motif,-13,0,.8,'#796d71');placeSymbol(c,d?.to?.motif,13,0,.8,'#796d71');
    line(c,[[-3,0],[4,0]],'#a37c64',1.2);arrowHead(c,5,0,0,'#a37c64',3);star(c,28,0,2.1,'#af8b64');
  }else{
    ring(c,-1,0,9,'#b2927255',.8);star(c,-1,0,5,'#b2927280');line(c,[[-18,-7],[-13,-7]],'#c5a68477',1);line(c,[[11,7],[17,7]],'#c5a68477',1);
  }
  curve(c,[-28,-15,-12,-17,7,-17,20,-15],'#fff9e6',.8);
}
function jar(c,view,back) {
  if(back){
    ellipse(c,0,1,30,22,'#b0d5cc');ellipse(c,0,1,27,19,'#3f626a');ellipse(c,0,1,23,15,'#a2c9be');
    // One shared truth mark above three equal notes gives a count, without
    // falsely identifying the first (or any other) note as the true one.
    ellipse(c,0,-6,4.8,4.8,GOLD);tick(c,0,-6,.72,'#4d6864');
    line(c,[[-12,4],[-12,2],[12,2],[12,4]],'#d9e6c4',.7);line(c,[[0,-.3],[0,4]],'#d9e6c4',.7);
    for(const x of [-12,0,12]){box(c,x-3,5,6,7,'#6c9a90',1,'#d9e6c4',.6);line(c,[[x-1.5,8],[x+1.5,8]],'#d9e6c4',.6);}
    curve(c,[-21,-10,-9,-19,13,-18,22,-7],'#e6f5de88',1.5);box(c,-18,20,36,5,'#8d6d91',2);return;
  }
  const glass=c.createLinearGradient(-26,-23,28,28);glass.addColorStop(0,'#b4e3d7db');glass.addColorStop(.45,'#709d9acb');glass.addColorStop(1,'#547e86e8');
  c.beginPath();c.moveTo(-16,-23);c.lineTo(16,-23);c.lineTo(16,-16);c.quadraticCurveTo(28,-12,27,-3);c.lineTo(24,24);c.quadraticCurveTo(0,31,-24,24);c.lineTo(-27,-3);c.quadraticCurveTo(-28,-12,-16,-16);c.closePath();c.fillStyle=glass;c.fill();c.strokeStyle='#c1e4d7';c.lineWidth=1;c.stroke();
  for(const[x,y,rotation,color]of[[-14,12,-.3,ROSE],[4,17,.25,GOLD],[13,3,-.4,MINT],[-7,-1,.3,'#ccb8df']]){
    c.save();c.translate(x,y);c.rotate(rotation);shape(c,[[-6,-2],[-10,-5],[-10,4],[-6,2]],color);shape(c,[[6,-2],[10,-5],[10,4],[6,2]],color);box(c,-6,-4,12,8,color,3,CREAM+'88',.5);line(c,[[-3,-2],[0,2]],CREAM+'77',.8);c.restore();
  }
  box(c,-20,-29,40,8,'#b899ba',3,'#755d82',.8);line(c,[[-17,-26],[17,-26]],'#eedbc9',.9);ellipse(c,0,-30,5,2.4,GOLD);
  curve(c,[-21,-9,-24,0,-23,13,-20,20],'#e4f7e1ad',2);curve(c,[18,13,20,18,18,22,13,23],'#b4e2d0bb',1);
  const notes=view.variantDefinition?.clues?.[0]?.diagram?.notes||[];
  for(let i=0;i<3;i++){
    const x=-15+i*15,y=-7+(i===1?2:0),note=notes[i];
    box(c,x-6,y-7,12,17,'#f3dfbb',1.7,'#b5977e',.6);
    if(view.object?.clueIndex!==null&&view.object?.clueIndex!==undefined){
      const motif=note?.claim?.ownerId||['bat','bat','rabbit'][i];tinyPersonMark(c,motif,x,y-1,.15);
      if(note?.claim?.operator==='is-not')line(c,[[x-4,y-5],[x+4,y+3]],'#9c696e',1.2);
    }else{line(c,[[x-3,y-2],[x+3,y-2]],'#c0a68b88',.7);line(c,[[x-3,y+1],[x+1,y+1]],'#c0a68b66',.7);}
    for(let dot=0;dot<=i;dot++)ellipse(c,x+(dot-i/2)*2.6,y+7,.65,.65,'#9c7d6e');
  }
}
function thankedAction(c,action,x,y) {
  c.save();c.translate(x,y);
  if(action==='cross-curtain'){
    shape(c,[[-15,-13],[-7,-13],[-11,11],[-15,11]],'#a78fac');shape(c,[[15,-13],[7,-13],[11,11],[15,11]],'#a78fac');line(c,[[-17,-14],[17,-14]],'#b9927e',1);
    curve(c,[-20,7,-7,7,-6,-5,7,-5],'#85ab9d',1.4);arrowHead(c,7,-5,0,'#85ab9d',3);
    ellipse(c,7,-6,6.8,5.3,'#bedfd0');shape(c,[[4,-3],[2,1],[9,-2]],'#bedfd0');star(c,7,-6,3.1,'#f7dcab');
  }else{
    // Show the act of providing a steady base, not the recipient's portrait.
    // The player still compares the action with the three observations.
    ellipse(c,0,12,13,3,'#ddbc8f');line(c,[[-4,-2],[-4,9],[-9,9]],'#9b899e',2.6);line(c,[[4,-2],[4,9],[9,9]],'#9b899e',2.6);
    curve(c,[-11,-1,-6,3,6,3,11,-1],'#c5a17f',1.4);line(c,[[0,-1],[0,-11]],'#95b7a3',.9);star(c,0,-14,5.1,'#d5b98a');
    curve(c,[7,-1,18,-4,19,-11,15,-16],'#88b3a2',1);arrowHead(c,15,-16,-2.3,'#88b3a2',2.8);
  }c.restore();
}
function letter(c,view,back) {
  if(view.object?.clueIndex===null||view.object?.clueIndex===undefined){
    box(c,-34,-22,68,44,'#f5e6cb',3,'#b7a18b',1);shape(c,[[-33,-20],[0,5],[33,-20]],'#ecdbbd');line(c,[[-33,-20],[0,5],[33,-20]],'#b49b8b',.9);line(c,[[-32,20],[-10,3]],'#ccb49b',.7);line(c,[[32,20],[10,3]],'#ccb49b',.7);heart(c,0,3,5,ROSE);return;
  }
  if(back){
    box(c,-34,-22,68,44,'#f5e6cb',3,'#b7a18b',1);
    shape(c,[[-33,-20],[0,5],[33,-20]],'#ecdbbd');line(c,[[-33,-20],[0,5],[33,-20]],'#b49b8b',.9);line(c,[[-32,20],[-10,3]],'#ccb49b',.7);line(c,[[32,20],[10,3]],'#ccb49b',.7);heart(c,0,3,5,ROSE);
    const sender=view.variantDefinition?.clues?.[1]?.diagram?.sender?.id==='ashi'?'ashi':'light';
    ring(c,-22,9,7.8,'#aa8b9d',.8);tinyPersonMark(c,sender,-22,9,.21);
    box(c,17,-16,13,15,'#d4bccb',1,'#a28b9e',.65);tinyPersonMark(c,'paper-crane',23.5,-8,.22);
    for(let i=0;i<2;i++)curve(c,[6,10+i*3,11,6+i*3,18,14+i*3,27,10+i*3],'#c2a0a5',.6);
  }else{
    box(c,-35,-9,70,31,'#d5bdc9',3,'#aa8c99',.8);shape(c,[[-34,-8],[0,-29],[34,-8],[0,16]],'#ebd4ce');
    c.save();c.rotate(-.055);box(c,-27,-29,54,46,'#fff0cf',2,'#bea48d',.8);shape(c,[[17,-29],[27,-19],[17,-19]],'#ddc3a3');
    heart(c,-19,-21,3.2,ROSE);thankedAction(c,view.variantDefinition?.clues?.[0]?.diagram?.thankedActionId,0,-4);line(c,[[-18,12],[-5,12]],'#bca18f66',.8);c.restore();
    shape(c,[[-35,-7],[0,13],[35,-7],[35,23],[-35,23]],'#ead5bc','#b79a8a',.8);line(c,[[-34,22],[-8,6]],'#bfa390',.65);line(c,[[34,22],[8,6]],'#bfa390',.65);heart(c,0,14,4.3,ROSE);
  }
}
function objectArt(c,view,back) {
  const motif=view.object?.motif||view.config?.object?.motif;
  if(motif==='candy-jar')jar(c,view,back);
  else if(motif==='letter')letter(c,view,back);
  else if(motif==='seed-window-bag')seedWindowBag(c,view,back);
  else if(motif==='echo-bookmark')echoBookmark(c,view,back);
  else if(motif==='folded-seat-card')foldedSeatCard(c,view,back);
  else ticket(c,view,back);
}

function drawCabinet(c,view) {
  const p=view.box;if(!validPoint(p))return;
  const near=!!(p.nearby||view.nearBox),solved=(view.solvedVariants||[]).length,open=!!view.opened;
  c.save();c.translate(p.x,p.y);ellipse(c,0,0,27,5,'#101c2699');
  box(c,-22,-27,44,25,'#69586e',4,GOLD+'bb',1);box(c,-19,-22,38,17,'#967788',2,'#302b4444',.7);
  line(c,[[-15,-22],[-15,-6]],'#d3b19688',.7);line(c,[[15,-22],[15,-6]],'#d3b19688',.7);
  if(open){
    c.beginPath();c.moveTo(-22,-27);c.lineTo(-18,-37);c.lineTo(20,-37);c.lineTo(22,-27);c.closePath();c.fillStyle='#705e78';c.fill();c.strokeStyle=GOLD+'aa';c.lineWidth=1;c.stroke();
    ellipse(c,0,-27,17,3,'#b4dbca55');line(c,[[-13,-32],[13,-32]],GOLD+'66',.7);
  }else{
    box(c,-23,-31,46,8,'#957a8d',3,GOLD+'bb',1);line(c,[[-18,-28],[18,-28]],'#e5c69c88',.8);
  }
  box(c,-5,-24,10,10,'#d5af7e',2,'#8d7164',.7);star(c,0,-19,3.3,CREAM);ellipse(c,0,-11,1.2,1.5,'#665367');
  for(let i=0;i<2;i++){
    const x=-12+i*24;ellipse(c,x,-9,2.7,2.7,solved>i?MINT:'#57465e');ring(c,x,-9,2.7,GOLD+'88',.6);if(solved>i)tick(c,x,-9,.37,'#44665d');
  }
  if(!open){c.save();c.translate(1,-36);c.scale(.27,.27);objectArt(c,view,false);c.restore();}
  if(near&&!view.expanded){
    line(c,[[-27,-22],[-27,-33],[-19,-33]],CREAM,1.2);line(c,[[27,-22],[27,-33],[19,-33]],CREAM,1.2);
    if(!open||view.object?.delivered)keyBadge(c,31,-19);
  }
  c.restore();
}
function selectedCorners(c,r,color) {
  for(const sx of [-1,1])for(const sy of [-1,1])line(c,[[sx*(r-8),sy*r],[sx*r,sy*r],[sx*r,sy*(r-8)]],color,1.6);
}
function drawClaimant(c,person,view,t,reduced) {
  if(!validPoint(person))return;
  const delivery=view.handoff?.claimantId===person.id?view.handoff:null;
  const delivered=!!view.object?.delivered||view.phase==='solved';
  const deliveredTo=view.deliveredClaimantId||(view.feedback?.kind==='solve'?view.feedback.claimantId:null);
  const wrong=delivery?.kind==='wrong'||(!view.handoff&&view.feedback?.kind==='wrong'&&view.feedback.claimantId===person.id);
  const success=delivery?.kind==='solve'||(delivered&&deliveredTo===person.id);
  const color=PERSON_COLORS[person.motif]||MINT,selected=!!person.selected;
  const bob=reduced?0:Math.sin(t*1.35+person.x*.014)*.8;
  c.save();c.translate(person.x,person.y);
  ellipse(c,0,38,25,3.5,'#101c2659');line(c,[[-13,36],[13,36]],color+'66',.8);
  const aura=c.createRadialGradient(0,-2,12,0,0,40);aura.addColorStop(0,color+'24');aura.addColorStop(1,color+'00');ellipse(c,0,0,40,40,aura);
  ellipse(c,0,0,35.3,35.3,NIGHT+'ed');ring(c,0,0,35.3,selected?CREAM:color+'b8',selected?1.8:1);
  ring(c,0,0,31.8,color+'28',.75);
  c.save();c.beginPath();c.arc(0,0,34.1,0,TAU);c.clip();c.translate(0,bob);drawPerson(c,person.motif,success,wrong);c.restore();
  if(selected){
    selectedCorners(c,40,CREAM);if(person.diagram?.type==='rhythm-signature')star(c,-41,0,2.5,color);else star(c,0,-41,2.5,color);
    if(!view.handoff&&!delivered)keyBadge(c,31,-27);
  }
  if(success){ring(c,0,0,38.5,MINT,1.3);for(const[x,y,r]of[[-30,-24,2.7],[26,-30,2],[34,12,2]])star(c,x,y,r,GOLD);glanceMark(c,25,26,true,MINT);}
  else if(wrong){ellipse(c,26,25,8,8,NIGHT);returnMark(c,26,25,5,'#e3b48f');}
  else glanceMark(c,25,26,!!person.seen,color);
  c.font=`600 11px ${FONT}`;c.textAlign='center';c.textBaseline='alphabetic';
  const label=typeof person.name==='string'?person.name:'';
  const width=Math.min(75,Math.max(35,c.measureText(label).width+13));
  box(c,-width/2,41,width,16,NIGHT+'eb',5,color+'44',.6);c.fillStyle=CREAM;c.fillText(label,0,52,68);
  drawClaimantEvidence(c,person);
  if(delivered&&success&&!view.handoff){c.save();c.translate(23,17);c.rotate(.14);c.scale(.3,.3);objectArt(c,view,false);c.restore();}
  c.restore();
}
function sideMarkers(c,view) {
  const current=view.object?.clueIndex,seen=view.object?.seen||view.seenClues||[];
  for(let i=0;i<2;i++){
    const x=(i-.5)*21,active=current===i;
    box(c,x-7,38,14,12,active?CREAM+'e8':NIGHT+'dc',3,active?CREAM:GOLD+'88',.7);
    const ink=active?'#71616c':CREAM+'99';
    if(i===0){box(c,x-3.5,41,7,5,'#00000000',.5,ink,.65);line(c,[[x-2,43],[x+2,43]],ink,.65);}
    else returnMark(c,x,44,3,ink);
    if(seen.includes(i)){ellipse(c,x+5,39,3.8,3.8,MINT);tick(c,x+5,39,.48,'#3f635c');}
  }
}
function drawEvidence(c,view,t,reduced) {
  const object=view.object;if(!validPoint(object))return;
  const handoff=view.handoff&&validPoint(view.handoff)?view.handoff:null;
  const solved=(!!object.delivered||view.phase==='solved')&&!handoff;
  c.save();c.translate(object.x,object.y);
  ellipse(c,0,31,34,5,NIGHT+'aa');ellipse(c,0,29,30,2.8,GOLD+'22');
  line(c,[[-32,26],[-36,30],[-26,33]],GOLD+'88',1);line(c,[[32,26],[36,30],[26,33]],GOLD+'88',1);
  if(object.selected&&!handoff&&!solved){
    const closeName=(view.claimants||[]).some(person=>Math.abs(person.x-object.x)<60&&Math.abs(person.y+49-(object.y-31))<25);
    selectedCorners(c,40,CREAM+'dd');keyBadge(c,31,closeName?32:-31);
    // A tiny magnifier distinguishes observation from the claimant targets.
    ring(c,-35,-30,4.8,CREAM,1);line(c,[[-31,-26],[-28,-23]],CREAM,1.4);
  }
  sideMarkers(c,view);c.restore();
  if(solved)return;
  const p=handoff||object,back=object.clueIndex===1;
  const bob=handoff||reduced?0:Math.sin(t*1.6)*1.5;
  c.save();c.translate(p.x,p.y+bob);
  const scale=handoff?clamp(finite(handoff.scale,1),.05,2):1;c.scale(scale,scale);
  if(handoff){
    const progress=clamp(finite(handoff.progress));
    if(!reduced)c.rotate(Math.sin(progress*Math.PI)*(handoff.kind==='wrong'?-.14:.1));
    if(handoff.kind==='wrong')returnMark(c,0,-40,7,'#e8b68e');
    else {star(c,-27,-29,3.4,GOLD);star(c,27,23,2.7,MINT);}
  }
  objectArt(c,view,back);c.restore();
}

/** Pure Canvas presentation, in world coordinates. */
export function drawLostCase(c,view,t=0,reducedMotion=false) {
  if(!c||!view||view.visible===false||view.available===false||view.phase==='locked')return;
  c.save();c.lineCap='round';c.lineJoin='round';
  const time=reducedMotion?0:finite(t);
  drawCabinet(c,view);
  if(view.expanded){
    for(const person of view.claimants||[])drawClaimant(c,person,view,time,reducedMotion);
    drawEvidence(c,view,time,reducedMotion);
  }
  c.restore();
}
