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
const PEOPLE = {ashi,light,moth,keeper,rabbit,bat,pumpkin,'paper-crane':crane};
const PERSON_COLORS = {ashi:'#e9bc89',light:'#b8edd7',moth:'#ceb3df',keeper:'#a8c8df',rabbit:'#e3bed3',bat:'#c6b0da',pumpkin:'#efb47d','paper-crane':'#e2bccf'};

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
    selectedCorners(c,40,CREAM);star(c,0,-41,2.5,color);
    if(!view.handoff&&!delivered)keyBadge(c,31,-27);
  }
  if(success){ring(c,0,0,38.5,MINT,1.3);for(const[x,y,r]of[[-30,-24,2.7],[26,-30,2],[34,12,2]])star(c,x,y,r,GOLD);glanceMark(c,25,26,true,MINT);}
  else if(wrong){ellipse(c,26,25,8,8,NIGHT);returnMark(c,26,25,5,'#e3b48f');}
  else glanceMark(c,25,26,!!person.seen,color);
  c.font=`600 11px ${FONT}`;c.textAlign='center';c.textBaseline='alphabetic';
  const label=typeof person.name==='string'?person.name:'';
  const width=Math.min(75,Math.max(35,c.measureText(label).width+13));
  box(c,-width/2,41,width,16,NIGHT+'eb',5,color+'44',.6);c.fillStyle=CREAM;c.fillText(label,0,52,68);
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
    selectedCorners(c,40,CREAM+'dd');keyBadge(c,31,-31);
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
