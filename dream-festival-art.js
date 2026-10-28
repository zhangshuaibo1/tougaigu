// Original vector scenery and clothing. These decorations do not affect physics.
const TAU=Math.PI*2;
const FONT='"PingFang SC","Microsoft YaHei",sans-serif';
const themes={
  halloween:{sky:['#1c172d','#493349'],mist:'#c395b8',ground:'#332b3b',edge:'#aa9e88',light:'#ffbd72',spirit:'#b4edce',accent:'#dba7e8',motif:'festival'},
  thanksgiving:{sky:['#29202b','#69503c'],mist:'#c9a77e',ground:'#44352e',edge:'#c3a66d',light:'#ffcf86',spirit:'#c7e9b9',accent:'#dc977b',motif:'festival'},
  christmas:{sky:['#122439','#365268'],mist:'#b6d2d8',ground:'#304653',edge:'#d3e4dc',light:'#ffe2a4',spirit:'#bdeddf',accent:'#f0a5ae',motif:'festival'},
  newyear:{sky:['#1b1c37','#443856'],mist:'#aeb3dc',ground:'#36334b',edge:'#a9b6cb',light:'#ffe1a1',spirit:'#c5e4f7',accent:'#e7aed8',motif:'festival'},
  spring:{sky:['#301b2e','#6a3e43'],mist:'#d8a29b',ground:'#4e303b',edge:'#d6b284',light:'#ffdc8f',spirit:'#d0e7bd',accent:'#f0808a',motif:'festival'},
  lantern:{sky:['#191d34','#4d435c'],mist:'#c9aad7',ground:'#343346',edge:'#d2b993',light:'#ffdda0',spirit:'#d7efcb',accent:'#e6a6be',motif:'festival'},
  valentine:{sky:['#2b1e37','#694b64'],mist:'#d7aecb',ground:'#47364c',edge:'#c2b18e',light:'#ffe0b7',spirit:'#d8eff0',accent:'#f2a9bd',motif:'festival'},
  dragonboat:{sky:['#122d32','#356367'],mist:'#a5cbc0',ground:'#2c4647',edge:'#b6cd94',light:'#f5dc9d',spirit:'#bcecc9',accent:'#e6b09a',motif:'festival'},
  qixi:{sky:['#141c38','#393f68'],mist:'#b0b7dd',ground:'#323b55',edge:'#acb9cb',light:'#ffe3ad',spirit:'#cfecf6',accent:'#cfb0ee',motif:'festival'},
  midautumn:{sky:['#192a38','#4a5a62'],mist:'#b4c2bd',ground:'#37454a',edge:'#b6c8a2',light:'#ffe0a0',spirit:'#d5efdc',accent:'#e4b8a2',motif:'festival'},
};
export function getFestivalTheme(id){return {...(themes[id]||themes.halloween),sky:[...(themes[id]||themes.halloween).sky]};}
export const FESTIVAL_VISUAL_IDS=Object.freeze(Object.keys(themes));
const outfits={
  halloween:{coat:'#6f4c89',scarf:'#eba15f',trim:'#d6b4e3'},thanksgiving:{coat:'#887449',scarf:'#d88859',trim:'#edc28b'},
  christmas:{coat:'#a55564',scarf:'#eef0d9',trim:'#edd9c1'},newyear:{coat:'#4e648e',scarf:'#e3b977',trim:'#d3d6ec'},
  spring:{coat:'#af4e61',scarf:'#ecc26d',trim:'#f4d391'},lantern:{coat:'#9b6687',scarf:'#f0c58c',trim:'#ebc2cd'},
  valentine:{coat:'#9c718e',scarf:'#f1afb6',trim:'#ebd0dc'},dragonboat:{coat:'#558c7c',scarf:'#d2c27b',trim:'#bcddbc'},
  qixi:{coat:'#665995',scarf:'#bca4e3',trim:'#e7d3ef'},midautumn:{coat:'#6c8d88',scarf:'#e7c487',trim:'#dfd5b7'},
  starlight:{coat:'#304764',scarf:'#e2be73',trim:'#e9d4a7'},
};
export function getOutfitPalette(id){return outfits[id]||{coat:'#79689b',scarf:'#e4b27c',trim:'#d2bddc'};}
const ellipse=(c,x,y,rx,ry,color,rotation=0)=>{c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fillStyle=color;c.fill();};
const line=(c,points,color,width=2)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.stroke();};
const box=(c,x,y,w,h,r,fill,stroke)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}};
const star=(c,x,y,r,color)=>{c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.23,y-r*.23,x+r,y);c.quadraticCurveTo(x+r*.23,y+r*.23,x,y+r);c.quadraticCurveTo(x-r*.23,y+r*.23,x-r,y);c.quadraticCurveTo(x-r*.23,y-r*.23,x,y-r);c.fillStyle=color;c.fill();};
function heart(c,x,y,size,color){c.save();c.translate(x,y);c.scale(size/12,size/12);c.beginPath();c.moveTo(0,10);c.bezierCurveTo(-19,-1,-11,-15,0,-6);c.bezierCurveTo(11,-15,19,-1,0,10);c.fillStyle=color;c.fill();c.restore();}
function leaf(c,x,y,size,color,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.beginPath();c.moveTo(0,-size);c.lineTo(size*.3,-size*.45);c.lineTo(size*.75,-size*.55);c.lineTo(size*.55,-size*.05);c.lineTo(size,0);c.lineTo(size*.35,size*.4);c.lineTo(0,size*.5);c.lineTo(-size*.35,size*.4);c.lineTo(-size,0);c.lineTo(-size*.55,-size*.05);c.lineTo(-size*.75,-size*.55);c.lineTo(-size*.3,-size*.45);c.closePath();c.fillStyle=color;c.fill();line(c,[[0,-size*.6],[0,size*.7]],'#edd6a650',1);c.restore();}
function pumpkin(c,x,y,size,t=0,lit=true){c.save();c.translate(x,y);const g=c.createLinearGradient(0,-size,0,size*.2);g.addColorStop(0,'#eba267');g.addColorStop(1,'#9e5d46');ellipse(c,0,-size*.53,size,size*.74,g);for(const offset of [-.4,0,.4]){c.beginPath();c.ellipse(offset*size,-size*.53,size*.38,size*.72,0,0,TAU);c.strokeStyle='#75473c55';c.lineWidth=1.3;c.stroke();}line(c,[[0,-size*1.18],[2,-size*1.48],[size*.2,-size*1.57]],'#8eaa79',size*.15);c.fillStyle=lit?'#ffe3a0':'#583e45';for(const side of [-1,1]){c.beginPath();c.moveTo(side*size*.55,-size*.7);c.lineTo(side*size*.2,-size*.72);c.lineTo(side*size*.37,-size*.43);c.fill();}c.beginPath();c.moveTo(-size*.58,-size*.25);c.quadraticCurveTo(0,size*.2,size*.58,-size*.25);c.lineTo(size*.28,-size*.15);c.lineTo(size*.13,-size*.3);c.lineTo(-size*.08,-size*.12);c.lineTo(-size*.3,-size*.29);c.closePath();c.fill();if(lit){c.globalAlpha=.35+Math.sin(t*2)*.05;const glow=c.createRadialGradient(0,-size*.4,1,0,-size*.4,size*2);glow.addColorStop(0,'#ffd08b38');glow.addColorStop(1,'#ffd08b00');c.fillStyle=glow;c.fillRect(-size*2,-size*2.4,size*4,size*4);}c.restore();}
function lantern(c,x,y,size,color,t=0){c.save();c.translate(x,y);c.rotate(Math.sin(t*.8+x)*.04);line(c,[[0,-size*2],[0,-size]],'#d9c09877',1);ellipse(c,0,0,size*.75,size,color);for(const offset of [-.35,0,.35]){c.beginPath();c.ellipse(offset*size,0,size*.35,size,0,0,TAU);c.strokeStyle='#f5d39d55';c.lineWidth=1;c.stroke();}box(c,-size*.5,-size-2,size,5,2,'#d7b978');box(c,-size*.5,size-2,size,5,2,'#d7b978');line(c,[[0,size],[0,size*1.55]],'#edc580',2);ellipse(c,0,size*1.5,3,6,'#eac385');c.restore();}
function gift(c,x,y,size,color,trim){box(c,x-size,y-size*1.5,size*2,size*1.5,3,color,trim);box(c,x-size-2,y-size*1.65,size*2+4,5,2,trim);line(c,[[x,y-size*1.65],[x,y]],trim,3);c.beginPath();c.ellipse(x-4,y-size*1.65-3,5,3,-.45,0,TAU);c.ellipse(x+4,y-size*1.65-3,5,3,.45,0,TAU);c.strokeStyle=trim;c.lineWidth=2;c.stroke();}
function clock(c,x,y,r,t){ellipse(c,x,y,r,r,'#71657a');ellipse(c,x,y,r-4,r-4,'#e7d5b5');for(let i=0;i<12;i++){const a=i*TAU/12;line(c,[[x+Math.sin(a)*(r-9),y-Math.cos(a)*(r-9)],[x+Math.sin(a)*(r-6),y-Math.cos(a)*(r-6)]],'#87746c',1);}line(c,[[x,y-r*.55],[x,y],[x+r*.4,y+r*.2]],'#655a6b',2.5);const a=t*.3;line(c,[[x,y],[x+Math.sin(a)*(r-8),y-Math.cos(a)*(r-8)]],'#b86e7e',1);ellipse(c,x,y,2,2,'#bb9980');}
function rose(c,x,y,size){line(c,[[x,y],[x-2,y-size*2.4]],'#90ae86',2);ellipse(c,x-6,y-size,8,3,'#91a782',-.4);ellipse(c,x+5,y-size*1.6,7,3,'#96b38c',.4);for(let i=0;i<5;i++){const a=i*TAU/5;ellipse(c,x+Math.cos(a)*size*.4,y-size*2.5+Math.sin(a)*size*.3,size*.6,size*.48,'#df97b1',i*.8%1);}ellipse(c,x,y-size*2.5,size*.45,size*.4,'#efbdd0');}
function magpie(c,x,y,s,t){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,0,0,9,5,'#e9e7da');ellipse(c,5,-4,5,5,'#353747');line(c,[[-5,2],[-18,11]],'#c4c5e5',4);c.beginPath();c.moveTo(-3,-1);c.quadraticCurveTo(-13,-16-Math.sin(t*5)*4,-16,-5);c.quadraticCurveTo(-8,4,2,0);c.fillStyle='#676a99';c.fill();ellipse(c,7,-5,1,1,'#f5dca5');line(c,[[10,-3],[14,-2]],'#d2bb96',1.5);c.restore();}
function rabbit(c,x,y,s,t){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,0,-10,18,12,'#d9e1d2');ellipse(c,10,-22,12,12,'#e5e8d9');ellipse(c,7,-40,4,16,'#e7e8d9',-.12);ellipse(c,17,-40,4,15,'#d9dfd0',.15);ellipse(c,7,-40,1.7,11,'#d9b4b4',-.12);ellipse(c,17,-40,1.7,10,'#d9b4b4',.15);ellipse(c,14,-23,2,Math.sin(t*1.2)>.98?.3:2.5,'#3d5054');ellipse(c,22,-20,2,1.5,'#c68c91');ellipse(c,-16,-7,6,6,'#ecede0');ellipse(c,3,-1,10,3,'#b1c5b8');c.restore();}

export function drawFestivalArchitecture(game,c,t){
  const id=game.festivalId,th=game.level.theme,mid=game.level.width*.52;c.save();
  if(id==='halloween'){
    c.globalAlpha=.7;
    for(const [x,w,h] of [[510,230,235],[1320,290,290]]){box(c,x,560-h,w,h,12,'#302738','#bf8ac744');c.beginPath();c.moveTo(x-25,560-h);c.lineTo(x+w*.5,560-h-120);c.lineTo(x+w+25,560-h);c.closePath();c.fillStyle='#443044';c.fill();for(const xx of [x+w*.25,x+w*.7]){box(c,xx-18,500-h,36,64,18,'#efb86933','#cba38877');line(c,[[xx,507-h],[xx,560-h]],'#b79c8666',2);}box(c,x+w*.44,450,44,110,22,'#a87b7533');}
    line(c,[[420,250],[850,205],[1270,255],[1700,200]],'#b8a3bf44',2);
    for(let i=0;i<9;i++){const x=470+i*147,y=228+Math.sin(i*.7)*23;star(c,x,y,6,th.light+'a8');}
  }else if(id==='thanksgiving'){
    for(let i=0;i<6;i++){const x=400+i*300;line(c,[[x,560],[x+Math.sin(i)*20,240+i%2*25]],'#716353',15);for(let j=0;j<8;j++){leaf(c,x+Math.sin(j*2.3)*83,260+Math.cos(j*1.9)*55,38,[th.light+'99','#c7816f99','#ddad7699'][j%3],j);}}
    box(c,mid-190,496,380,25,10,'#876554','#caad8788');for(const x of [mid-150,mid+150])box(c,x,516,16,44,4,'#77604e');for(let i=0;i<5;i++){ellipse(c,mid-130+i*65,490,24,7,'#d6b89c');pumpkin(c,mid-10,490,19,t);}
  }else if(id==='christmas'){
    for(const x of [570,1360,2000]){for(let j=0;j<4;j++){const y=275+j*52,spread=45+j*20;c.beginPath();c.moveTo(x,y-55);c.lineTo(x-spread,y+55);c.quadraticCurveTo(x,y+75,x+spread,y+55);c.closePath();c.fillStyle=j%2?'#3d6869':'#38615f';c.fill();line(c,[[x-spread*.8,y+44],[x,y+53],[x+spread*.8,y+44]],'#d3e5df99',8);for(let k=-1;k<=1;k++)ellipse(c,x+k*spread*.55,y+36,3,3,k%2?th.light:th.accent);}star(c,x,204,15,th.light);box(c,x-11,500,22,60,3,'#665a5b');}
    box(c,mid-135,350,270,200,15,'#354d62','#abcbd344');box(c,mid-160,344,320,20,8,'#d1dfe0');clock(c,mid,396,30,t);for(const x of [mid-88,mid+75])box(c,x,450,32,70,5,th.light+'33',th.light+'77');
  }else if(id==='newyear'){
    for(const [x,r] of [[650,65],[1370,89],[1960,57]]){box(c,x-r*.7,330,r*1.4,220,9,'#403c57','#b4a2c844');clock(c,x,337,r,t);line(c,[[x,405],[x,485]],'#b7a2c377',3);ellipse(c,x,490,19,27,th.light+'66');}
    for(let i=0;i<4;i++){const x=500+i*450,y=125+i%2*45;for(let ray=0;ray<12;ray++){const a=ray*TAU/12;line(c,[[x+Math.cos(a)*28,y+Math.sin(a)*28],[x+Math.cos(a)*48,y+Math.sin(a)*48]],[th.light,th.accent,th.spirit][i%3]+'66',1.6);}}
  }else if(id==='spring'){
    for(const x of [500,1300,2100]){line(c,[[x-120,560],[x-120,290]],'#8f5460',18);line(c,[[x+120,560],[x+120,290]],'#8f5460',18);line(c,[[x-150,300],[x,270],[x+150,300]],'#c98179',18);line(c,[[x-150,290],[x,260],[x+150,290]],th.light+'99',4);box(c,x-73,293,146,42,5,'#a65360',th.light+'88');c.font=`bold 21px ${FONT}`;c.fillStyle=th.light;c.textAlign='center';c.fillText('新 岁 安 好',x,321);lantern(c,x-94,360,21,'#c25f6c',t);lantern(c,x+94,360,21,'#c25f6c',t);}
  }else if(id==='lantern'){
    c.strokeStyle='#bcb0c255';c.lineWidth=3;c.beginPath();c.moveTo(300,560);c.bezierCurveTo(760,310,1280,310,1760,560);c.stroke();
    for(let i=0;i<12;i++){const x=290+i*165,y=145+(i*47%150);lantern(c,x,y,15+i%3*4,[th.accent+'b0','#d79a7db0','#d3bc85b0'][i%3],t);}
    for(let i=0;i<7;i++){const x=380+i*270,y=530;ellipse(c,x,y,34,5,th.accent+'33');lantern(c,x,y-40,12,th.light+'99',t);}
  }else if(id==='valentine'){
    for(const x of [540,1320,1940]){c.strokeStyle='#aa8b9a55';c.lineWidth=6;c.beginPath();c.moveTo(x-95,560);c.lineTo(x-95,340);c.bezierCurveTo(x-95,235,x+95,235,x+95,340);c.lineTo(x+95,560);c.stroke();for(let i=0;i<10;i++){const a=Math.PI+i*Math.PI/9;heart(c,x+Math.cos(a)*95,335+Math.sin(a)*85,10,th.accent+'a0');}}
    for(let i=0;i<14;i++)rose(c,370+i*137,555,9+i%3*2);
    for(const x of [800,1670]){box(c,x-29,450,58,68,11,'#b27f98','#edbfd1');line(c,[[x-18,475],[x+18,475]],'#573f58',4);heart(c,x,498,9,'#f0c9ce');line(c,[[x,520],[x,560]],'#9e8394',7);}
  }else if(id==='dragonboat'){
    c.fillStyle='#79b8b016';c.fillRect(320,475,1700,90);for(let i=0;i<9;i++){c.beginPath();for(let x=250;x<2100;x+=30){const y=490+i*8+Math.sin(x/95+t+i)*3;x===250?c.moveTo(x,y):c.lineTo(x,y);}c.strokeStyle=th.spirit+'22';c.lineWidth=1;c.stroke();}
    for(let i=0;i<10;i++){const x=350+i*192;for(let j=0;j<4;j++){line(c,[[x+j*7,560],[x+j*9-14,440-j*13]],'#85a99b88',2);ellipse(c,x+j*9-14,430-j*13,4,20,'#c7c19299',.1);}}
    for(const x of [430,1450,2050]){line(c,[[x,560],[x,280]],'#9cb09a',5);c.beginPath();c.moveTo(x,284);c.lineTo(x+85,309);c.lineTo(x,335);c.closePath();c.fillStyle=th.accent+'99';c.fill();star(c,x+30,309,8,th.light);}
  }else if(id==='qixi'){
    c.save();c.globalAlpha=.45;for(let i=0;i<20;i++){const x=350+i*98,y=275-Math.sin(i/19*Math.PI)*100;ellipse(c,x,y,42,13,th.spirit+'30');star(c,x,y-12,5,th.light);}c.restore();
    for(let i=0;i<7;i++)magpie(c,480+i*227,220+Math.sin(i*.8)*58,1.5,t+i);
    for(let i=0;i<8;i++){const x=550+i*205;line(c,[[x,280],[x,335+i%3*26]],th.accent+'55',1);star(c,x,340+i%3*26,8,th.light+'b0');}
  }else if(id==='midautumn'){
    const x=mid,y=182;ellipse(c,x,y,106,106,'#eddbb01a');ellipse(c,x,y,83,83,'#f8e3b9d0');ellipse(c,x-26,y-10,20,24,'#c4be9d33');ellipse(c,x+35,y+33,17,12,'#c4be9d33');
    for(const xx of [540,1450,1990]){line(c,[[xx,560],[xx+14,332]],'#7e8c74',12);for(let i=0;i<9;i++){ellipse(c,xx+Math.sin(i*2.3)*65,330+Math.cos(i*1.8)*45,43,26,'#82997d99');star(c,xx+Math.sin(i*2.3)*67,327+Math.cos(i*1.8)*47,3,th.light+'a0');}}
    rabbit(c,mid+45,557,1.2,t);
  }
  c.restore();
}

export function drawFestivalProps(game,c,t){
  const id=game.festivalId||game.season?.id;if(!themes[id])return;
  const left=Math.max(0,Math.floor((game.camera-130)/185)),right=Math.min(Math.ceil(game.level.width/185),Math.ceil((game.camera+game.viewWidth+130)/185));
  for(let i=left;i<right;i++){
    const x=95+i*185,y=559; c.save();c.globalAlpha=.9;
    if(id==='halloween'){pumpkin(c,x,y,13+i%3*4,t);if(i%3===1){line(c,[[x+38,y],[x+38,y-54]],'#82617d',4);box(c,x+22,y-78,32,29,12,'#dba57f','#edd4a5');heart(c,x+38,y-64,6,'#8c607e');}}
    else if(id==='thanksgiving'){leaf(c,x,y-4,17,'#d5a376',i);if(i%3===0)gift(c,x+24,y,13,'#af8768','#e3c294');}
    else if(id==='christmas'){gift(c,x,y,14+i%2*3,['#a9677b','#5f8c86','#8d839c'][i%3],'#efdfbc');if(i%2)ellipse(c,x+25,y-1,13,5,'#e2ebe3');}
    else if(id==='newyear'){star(c,x,y-12,10,'#e5c48c');if(i%3===0)clock(c,x+36,y-24,23,t);}
    else if(id==='spring'){lantern(c,x,y-31,16,'#bc5c68',t);if(i%2===0){box(c,x+20,y-24,23,23,2,'#b96069','#f0cb87');c.fillStyle='#f0cb87';c.font=`14px ${FONT}`;c.textAlign='center';c.fillText('福',x+32,y-7);}}
    else if(id==='lantern'){lantern(c,x,y-30,14,i%2?'#a779a8':'#d5a778',t);}
    else if(id==='valentine'){rose(c,x,y,7+i%3*2);heart(c,x+26,y-16,9,'#ddb0c2');}
    else if(id==='dragonboat'){c.beginPath();c.moveTo(x,y-30);c.lineTo(x-17,y-3);c.lineTo(x+16,y-3);c.closePath();c.fillStyle='#80ad93';c.fill();line(c,[[x-11,y-20],[x+11,y-10],[x-12,y-4]],'#dccd99',2);}
    else if(id==='qixi'){star(c,x,y-19,10,'#dbd0e7');if(i%3===0)magpie(c,x+32,y-12,.75,t);}
    else if(id==='midautumn'){ellipse(c,x,y-9,15,9,'#cfa879');ellipse(c,x,y-11,11,6,'#e9c797');star(c,x,y-11,4,'#ae805f');if(i%4===0)rabbit(c,x+37,y,.6,t);}
    c.restore();
  }
}

export function drawFestivalWeather(game,c,w,h,t){
  const id=game.festivalId||game.season?.id;if(!themes[id])return;const th=getFestivalTheme(id),count=game.options.reducedMotion?6:25;c.save();
  for(let i=0;i<count;i++){
    const speed=.3+(i%4)*.13,tt=game.options.reducedMotion?0:t;
    const x=((i*137+Math.sin(tt*.25+i)*35-game.camera*.12)%(w+90)+w+90)%(w+90)-45;
    const y=(i*91+tt*9*speed)%580;
    c.globalAlpha=.18+(i%4)*.08;
    if(id==='halloween'){if(i%3===0){const wing=Math.sin(tt*3+i)*5;c.fillStyle='#c5a6c288';c.beginPath();c.moveTo(x-13,y-wing);c.quadraticCurveTo(x-8,y+7,x,y+2);c.quadraticCurveTo(x+8,y+7,x+13,y-wing);c.lineTo(x+6,y-5);c.lineTo(x,y-1);c.lineTo(x-6,y-5);c.closePath();c.fill();}else star(c,x,y,2,th.light);}
    else if(id==='thanksgiving')leaf(c,x,y,4+i%3,th.accent,tt*.3+i);
    else if(id==='christmas'){ellipse(c,x,y,1.2+i%3*.7,1.2+i%3*.7,'#f1f4e7');if(i%5===0){line(c,[[x-4,y],[x+4,y]],'#f2f6e7',1);line(c,[[x,y-4],[x,y+4]],'#f2f6e7',1);}}
    else if(id==='valentine')heart(c,x,y,3+i%3,th.accent);
    else if(id==='spring'){c.fillStyle=i%2?th.light:th.accent;c.fillRect(x,y,3,7);}
    else if(id==='dragonboat'){ellipse(c,x,y,1,4,th.spirit,-.3);}
    else if(id==='midautumn'){star(c,x,y,2+i%3,th.light);}
    else star(c,x,y,2+i%3,th.light);
  }
  c.restore();
}

export function drawFestivalGift(game,c,m,t){
  const th=game.level.theme,id=game.festivalId,y=m.y+(game.options.reducedMotion?0:Math.sin(t*2+m.x)*5);c.save();
  const halo=c.createRadialGradient(m.x,y,2,m.x,y,48);halo.addColorStop(0,th.accent+'44');halo.addColorStop(1,th.accent+'00');c.fillStyle=halo;c.fillRect(m.x-50,y-50,100,100);
  c.translate(m.x,y);c.rotate(game.options.reducedMotion?0:Math.sin(t+m.x)*.06);
  if(id==='halloween'){box(c,-12,-9,24,18,8,'#eab383','#f5d9ae');for(const side of [-1,1]){c.beginPath();c.moveTo(side*10,-5);c.lineTo(side*22,-11);c.lineTo(side*22,10);c.lineTo(side*10,5);c.closePath();c.fillStyle='#b798c8';c.fill();}star(c,0,0,6,'#985e82');}
  else if(id==='thanksgiving'){leaf(c,0,0,19,'#e8bd88');box(c,-7,-4,14,15,5,'#9a745c');}
  else if(id==='christmas')gift(c,0,12,17,'#b9667c','#f0dbb8');
  else if(id==='newyear')clock(c,0,0,20,t);
  else if(id==='spring'){box(c,-15,-20,30,40,4,'#b95465','#f2ce8e');c.fillStyle='#f2ce8e';c.font=`bold 20px ${FONT}`;c.textAlign='center';c.fillText('福',0,8);}
  else if(id==='lantern')lantern(c,0,0,17,'#d899a5',t);
  else if(id==='valentine'){box(c,-18,-13,36,26,4,'#edd6dc','#f5e1da');line(c,[[-16,-10],[0,2],[16,-10]],'#ac7796',1.4);heart(c,0,4,7,'#ce8da8');}
  else if(id==='dragonboat'){c.beginPath();c.moveTo(0,-24);c.quadraticCurveTo(-29,0,-20,18);c.lineTo(20,18);c.quadraticCurveTo(28,-2,0,-24);c.fillStyle='#8ebba1';c.fill();line(c,[[-18,-2],[18,12],[-17,15]],'#ecd9aa',2.5);line(c,[[0,-24],[0,-31]],'#d6c598',2);}
  else if(id==='qixi'){ellipse(c,0,1,17,10,'#ab98c9');for(let i=0;i<5;i++){c.beginPath();c.ellipse(0,0,14,8,0,0,TAU);c.strokeStyle=i%2?'#e8d6b7':'#d3c5e7';c.lineWidth=1.5;c.stroke();c.translate(0,-2);}star(c,0,-7,7,'#f2d9a5');}
  else if(id==='midautumn'){ellipse(c,0,1,23,17,'#c89a69');ellipse(c,0,-3,21,14,'#edc18a');for(let i=0;i<8;i++){const a=i*TAU/8;ellipse(c,Math.cos(a)*16,-3+Math.sin(a)*9,3,3,'#c89a69');}star(c,0,-3,8,'#ba8a5e');}
  c.restore();star(c,m.x+28,y-20,3,th.light);
  if(game.compassTime>0||Math.hypot((game.form==='soul'?game.soul.x:game.body.x)-m.x,(game.form==='soul'?game.soul.y:game.body.y-35)-m.y)<120){c.save();c.font=`11px ${FONT}`;c.textAlign='center';c.fillStyle=th.light;c.fillText(m.name||'节日礼物',m.x,y+39);c.restore();}
}

export function drawFestivalNPC(game,c,npc,t){
  const id=game.festivalId,th=game.level.theme,near=game.form==='body'&&Math.abs(game.body.x-npc.x)<98&&Math.abs(game.body.y-npc.y)<90,breath=game.options.reducedMotion?0:Math.sin(t*1.8)*1.5;c.save();c.translate(npc.x,npc.y);ellipse(c,0,1,29,6,'#14122244');c.translate(0,-breath);
  const palette=getOutfitPalette(id);
  if(id==='thanksgiving'){ellipse(c,-38,-41,23,38,'#b98761',-.45);ellipse(c,-39,-47,14,25,'#e4bc8c',-.45);line(c,[[-43,-65],[-49,-52],[-43,-34]],'#9b6d5844',3);}
  if(id==='dragonboat'){c.save();c.translate(-36,-24);c.rotate(-.5);ellipse(c,0,0,12,31,'#b9b6a0');for(const yy of [-19,-5,10])ellipse(c,0,yy,11,5,'#686e6a');c.restore();}
  if(id==='qixi'){line(c,[[-14,-29],[-39,-1],[-52,-2]],'#9ca7cc',9);line(c,[[-19,-32],[-42,-4]],'#d9e2df',3);}
  if(id==='valentine'){c.beginPath();c.moveTo(-18,-52);c.lineTo(-48,-78);c.lineTo(-36,-25);c.lineTo(-13,-22);c.closePath();c.fillStyle='#d9dce3';c.fill();line(c,[[-45,-74],[-25,-40]],'#a9b9cb',1.5);}
  line(c,[[-11,-19],[-13,-2],[ -20,-1]],'#c1bbab',5);line(c,[[11,-19],[13,-2],[20,-1]],'#c1bbab',5);
  c.beginPath();c.moveTo(-23,-60);c.quadraticCurveTo(0,-74,23,-60);c.lineTo(29,-19);c.quadraticCurveTo(0,-10,-29,-19);c.closePath();c.fillStyle=palette.coat;c.fill();line(c,[[0,-53],[0,-21]],palette.trim,2);for(const y of [-47,-35,-24])ellipse(c,3,y,2,2,palette.trim);
  line(c,[[-22,-52],[-35,-31]],palette.trim,7);line(c,[[22,-52],[33,-34+Math.sin(t*2)*3]],palette.trim,7);ellipse(c,-35,-31,5,5,'#e2d6ba');ellipse(c,33,-34+Math.sin(t*2)*3,5,5,'#e2d6ba');
  if(id==='halloween'){pumpkin(c,0,-53,29,t);box(c,-21,-103,42,8,4,'#574369');c.beginPath();c.moveTo(-14,-102);c.lineTo(-4,-143);c.quadraticCurveTo(11,-139,11,-103);c.closePath();c.fillStyle='#574369';c.fill();line(c,[[-11,-110],[10,-110]],'#d6a16e',5);}
  else if(id==='newyear'){
    ellipse(c,0,-84,31,31,'#938274');for(const side of [-1,1]){c.beginPath();c.moveTo(side*27,-94);c.lineTo(side*30,-122);c.lineTo(side*8,-109);c.closePath();c.fillStyle='#938274';c.fill();ellipse(c,side*13,-84,16,19,'#ddc7a4');ellipse(c,side*12,-84,8,9,'#4b4551');ellipse(c,side*12+1,-86,3,4,th.light);}
    c.beginPath();c.moveTo(-6,-77);c.lineTo(6,-77);c.lineTo(0,-66);c.closePath();c.fillStyle='#d1a96f';c.fill();line(c,[[-27,-83],[-3,-83],[3,-83],[27,-83]],'#c8a779',1.5);clock(c,0,-39,13,t);star(c,0,-121,7,th.light);
  }
  else {
    const fur={thanksgiving:'#c4936e',christmas:'#c5a27e',spring:'#c38e7d',dragonboat:'#b2b7a6',qixi:'#dfe4df',lantern:'#e4dfcb',midautumn:'#dfe3d2',valentine:'#e9e3df'}[id]||'#ddcfb2';
    if(id==='thanksgiving'||id==='christmas'||id==='spring'||id==='dragonboat'){for(const side of [-1,1]){ellipse(c,side*25,-105,id==='christmas'?11:10,id==='christmas'?18:12,fur,side*.5);ellipse(c,side*25,-106,5,8,'#d9b9a1',side*.5);}}
    if(id==='christmas'){for(const side of [-1,1]){line(c,[[side*18,-108],[side*21,-132],[side*15,-145]],'#9d8a6d',4);line(c,[[side*21,-128],[side*33,-137],[side*34,-145]],'#9d8a6d',3);}}
    if(id==='lantern'){for(const side of [-1,1]){ellipse(c,side*14,-122,7,25,fur,side*.14);ellipse(c,side*14,-123,3,17,'#cfb4b0',side*.14);}}
    if(id==='valentine'){c.beginPath();c.moveTo(-30,-87);c.lineTo(-11,-114);c.lineTo(25,-105);c.lineTo(34,-76);c.lineTo(10,-58);c.lineTo(-23,-66);c.closePath();c.fillStyle=fur;c.fill();line(c,[[-29,-87],[1,-79],[25,-104]],'#bfb6cb',1);}
    else{ellipse(c,0,-83,29,27,fur);ellipse(c,-24,-84,6,8,fur);ellipse(c,24,-84,6,8,fur);}
    if(id==='dragonboat'){ellipse(c,-12,-85,15,10,'#64706b',-.25);ellipse(c,12,-85,15,10,'#64706b',.25);ellipse(c,0,-71,11,10,'#ddd9be');}
    if(id==='qixi'){ellipse(c,0,-91,29,22,'#4b4d67');ellipse(c,0,-75,22,16,'#e2e4d9');}
    if(id==='thanksgiving'||id==='christmas'||id==='spring')ellipse(c,0,-72,id==='spring'?18:14,12,'#e7d1af');
    const blink=Math.sin(t*1.4)>.985?.2:1,look=Math.max(-1,Math.min(1,(game.body.x-npc.x)/160));for(const x of [-10,10]){ellipse(c,x,-82,4.5,5.8*blink,'#3b3a45');if(blink>.5)ellipse(c,x+look+1,-84,1.4,1.4,th.light);}ellipse(c,-20,-72,5,2.5,'#c98c9277');ellipse(c,20,-72,5,2.5,'#c98c9277');
    if(id==='valentine'||id==='qixi'){c.beginPath();c.moveTo(-5,-75);c.lineTo(6,-75);c.lineTo(id==='valentine'?12:3,-66);c.closePath();c.fillStyle=id==='valentine'?'#c6997e':'#bda783';c.fill();}
    else{ellipse(c,0,-74,id==='spring'?7:4.5,id==='christmas'?4:3,id==='christmas'?'#c47477':'#806f67');line(c,[[-5,-69],[0,-66],[5,-69]],'#8f7474',1.4);if(id==='thanksgiving')box(c,-3,-68,6,5,1,'#f2e2c6');}
    if(id==='thanksgiving'){box(c,-25,-112,50,13,6,'#dfd5bb');for(const x of [-15,0,15])ellipse(c,x,-117,12,13,'#eee3c9');}
    else if(id==='christmas'){c.beginPath();c.moveTo(-26,-103);c.lineTo(-5,-141);c.quadraticCurveTo(17,-143,24,-114);c.lineTo(26,-103);c.closePath();c.fillStyle='#b76072';c.fill();box(c,-29,-109,58,13,6,'#f0e7d2');ellipse(c,23,-119,9,9,'#f1e8d6');}
    else if(id==='spring'){for(const x of [-23,23]){c.beginPath();c.moveTo(x,-97);c.quadraticCurveTo(x*1.6,-127,x*.7,-132);c.quadraticCurveTo(x*.8,-111,x*.6,-103);c.fillStyle='#ebcf91';c.fill();}box(c,-21,-112,42,15,7,'#b85367');star(c,0,-106,6,'#f0d58d');}
    else if(id==='lantern'){ellipse(c,0,-110,31,11,'#a97997');box(c,-24,-115,48,8,4,'#e6c08d');lantern(c,36,-27,10,'#dfa989',t);}
    else if(id==='valentine'){for(const x of [-25,25])ellipse(c,x,-106,12,7,'#b998c0',x<0?-.4:.4);heart(c,0,-113,11,'#e4a4bc');}
    else if(id==='dragonboat'){c.beginPath();c.moveTo(-35,-103);c.lineTo(0,-134);c.lineTo(35,-103);c.closePath();c.fillStyle='#b6be87';c.fill();line(c,[[-34,-103],[34,-103]],'#d6d4a5',4);}
    else if(id==='qixi'){ellipse(c,0,-108,30,8,'#8d7bac');line(c,[[-12,-112],[-19,-125]],'#c5cbe5',3);star(c,5,-117,7,'#f3d8a5');}
    else if(id==='midautumn'){for(const x of [-13,13]){ellipse(c,x,-123,6,22,'#e6e6cf',x*.012);ellipse(c,x,-123,2,15,'#cdb59f',x*.012);}box(c,-25,-107,50,10,5,'#789a91');}
  }
  c.textAlign='center';c.font=`bold 12px ${FONT}`;c.fillStyle=th.light;c.fillText(game.festival?.npc?.name||'节日朋友',0,-159);
  if(near){box(c,-38,-190,76,22,10,'#19232bd9',th.light+'55');c.fillStyle='#f4e5c8';c.font=`11px ${FONT}`;c.fillText('Q · 聊一聊',0,-175);}
  c.restore();
}

export function drawOutfitBack(c,id,t,walking){
  const palette=getOutfitPalette(id);c.save();
  if(id==='starlight'||id==='halloween'||id==='qixi'||id==='christmas'){
    c.beginPath();c.moveTo(-13,-44);c.quadraticCurveTo(-26,-18,-30+Math.sin(t*2.6)*4,-12);c.quadraticCurveTo(-8,-8,12,-15);c.lineTo(13,-43);c.closePath();c.fillStyle=palette.coat;c.fill();line(c,[[-21,-20],[-8,-15],[8,-19]],palette.trim+'66',1.1);
    if(id==='starlight'||id==='qixi'){for(const [x,y] of [[-17,-31],[-8,-22],[3,-29]])star(c,x,y,2,palette.trim);}
  }
  c.restore();
}

// Called in the skull-cap's hinge transform: hats lift with the lid.
export function drawOutfitHat(c,id,t){
  c.save();
  if(id==='halloween'){
    c.beginPath();c.moveTo(-28,-29);c.quadraticCurveTo(-1,-39,26,-29);c.quadraticCurveTo(-1,-20,-28,-29);c.fillStyle='#664c80';c.fill();c.beginPath();c.moveTo(-17,-30);c.lineTo(-4,-67);c.quadraticCurveTo(7,-66,12,-52);c.lineTo(18,-30);c.closePath();c.fillStyle='#72558d';c.fill();line(c,[[-14,-36],[15,-36]],'#e4af75',5);box(c,-3,-40,8,7,1,'#9e7570','#efd0a0');star(c,-2,-50,3,'#dac6d8');
  }else if(id==='christmas'){
    c.beginPath();c.moveTo(-23,-28);c.quadraticCurveTo(-15,-62,5,-60);c.quadraticCurveTo(21,-57,25,-40);c.lineTo(23,-28);c.closePath();c.fillStyle='#b66275';c.fill();box(c,-25,-32,50,8,4,'#ece7d5');ellipse(c,25,-42,7,7,'#f0ead9');
  }else if(id==='thanksgiving'){
    ellipse(c,0,-29,28,6,'#bb9d69');box(c,-16,-46,32,18,5,'#c3a273');line(c,[[-15,-32],[15,-32]],'#8d7770',5);leaf(c,14,-39,7,'#d78d69',.4);
  }else if(id==='newyear'){
    c.beginPath();c.moveTo(-13,-28);c.lineTo(2,-61);c.lineTo(16,-28);c.closePath();c.fillStyle='#6f82ad';c.fill();for(const y of [-34,-44])line(c,[[-6,y],[8,y]],'#d9bdd8',3);star(c,2,-61,5,'#f1d69d');
  }else if(id==='spring'){
    box(c,-23,-36,46,10,5,'#bd5c69');star(c,0,-32,6,'#f2d38c');for(const side of [-1,1]){c.beginPath();c.moveTo(side*16,-33);c.quadraticCurveTo(side*27,-51,side*18,-55);c.quadraticCurveTo(side*20,-43,side*10,-35);c.fillStyle='#e7cc91';c.fill();}
  }else if(id==='lantern'){
    box(c,-23,-35,46,8,4,'#b781a0');for(const x of [-18,18]){line(c,[[x,-29],[x,-16]],'#e5bd8a',1);ellipse(c,x,-16,3,4,'#edc193');}star(c,0,-38,6,'#efd19b');
  }else if(id==='valentine'){
    line(c,[[-21,-29],[-9,-35],[12,-34],[22,-29]],'#e1afb9',4);heart(c,12,-38,7,'#eeb7c7');ellipse(c,-11,-35,5,3,'#a7bd99',-.4);
  }else if(id==='dragonboat'){
    c.beginPath();c.moveTo(-28,-28);c.lineTo(0,-54);c.lineTo(28,-28);c.closePath();c.fillStyle='#b8be88';c.fill();line(c,[[-27,-28],[27,-28]],'#ded7a5',3);line(c,[[-19,-30],[0,-49],[19,-30]],'#8fa17a',1);
  }else if(id==='qixi'){
    line(c,[[-22,-30],[-12,-38],[0,-35],[12,-38],[22,-30]],'#c8b6dd',3);star(c,12,-40,7,'#ead7a7');ellipse(c,-11,-37,3,3,'#e0d7ed');
  }else if(id==='midautumn'){
    for(const x of [-9,9]){ellipse(c,x,-47,5,19,'#e4e5cf',x*.012);ellipse(c,x,-47,2,13,'#d5b9b4',x*.012);}box(c,-23,-34,46,8,4,'#89a599');
  }else if(id==='starlight'){
    line(c,[[-21,-30],[-10,-36],[0,-32],[11,-38],[22,-29]],'#d9bf82',2);star(c,10,-40,6,'#f3dca4');star(c,-13,-35,3,'#e6cf95');
  }
  c.restore();
}

export function drawCompass(game,c,w,t){
  if(game.compassTime<=0)return;const th=game.level.theme,actor=game.form==='soul'?game.soul:{x:game.body.x,y:game.body.y-45};
  const targets=[...game.memories.filter(item=>!item.collected).map(item=>({...item,label:game.mode==='festival'?'礼物':'记忆'})),...game.lanterns.filter(item=>!item.lit).map(item=>({...item,label:'谜灯'}))];
  if(!targets.length)targets.push({...game.level.exit,y:game.level.exit.y-70,label:'出口'});
  targets.sort((a,b)=>Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y));c.save();
  for(const target of targets.slice(0,3)){
    const rawX=target.x-game.camera,x=Math.max(25,Math.min(w-25,rawX)),y=Math.max(150,Math.min(500,target.y));
    c.globalAlpha=.75;c.strokeStyle=th.light;c.lineWidth=1.5;c.setLineDash([3,5]);c.beginPath();c.arc(x,y,26+Math.sin(t*2)*3,0,TAU);c.stroke();c.setLineDash([]);star(c,x,y-33,5,th.light);c.font=`11px ${FONT}`;c.fillStyle=th.light;c.textAlign='center';c.fillText((rawX<25?'← ':rawX>w-25?'→ ':'')+target.label,x,y+43);
  }
  c.restore();
}

export function drawFestivalPlatform(game,c,p,t){
  const th=game.level.theme;
  if(!['gift','lantern','dragonboat','starbridge','festival-stage'].includes(p.kind))return false;
  if(p.kind==='gift'){
    box(c,p.x,p.y,p.w,p.h+8,4,'#a76c80','#e5c8b4');box(c,p.x-3,p.y-3,p.w+6,7,3,'#dcb9b0');
    for(const x of [p.x+p.w*.25,p.x+p.w*.72])line(c,[[x,p.y],[x,p.y+p.h+8]],'#eddbb6',5);
    line(c,[[p.x+14,p.y+p.h+1],[p.x+p.w-14,p.y+p.h+1]],'#e4baa8',2);
  }else if(p.kind==='starbridge'){
    for(let i=0;i<5;i++)ellipse(c,p.x+p.w*(i+.5)/5,p.y+8,p.w/7,13,'#aebed1');
    box(c,p.x,p.y-3,p.w,8,4,'#d6dce0');for(let i=0;i<4;i++)star(c,p.x+22+i*(p.w-44)/3,p.y+22+Math.sin(t+i)*2,3,th.light);
  }else if(p.kind==='dragonboat'){
    c.beginPath();c.moveTo(p.x-13,p.y-4);c.quadraticCurveTo(p.x+p.w/2,p.y+50,p.x+p.w+13,p.y-4);c.lineTo(p.x+p.w,p.y+24);c.quadraticCurveTo(p.x+p.w/2,p.y+63,p.x,p.y+24);c.closePath();c.fillStyle='#9aa96e';c.fill();
    box(c,p.x,p.y,p.w,7,3,'#d0c28d');for(let i=0;i<5;i++){const x=p.x+20+i*(p.w-40)/4;line(c,[[x,p.y+5],[x-13,p.y+36]],'#d3b386',3);}
    c.save();c.translate(p.x+p.w+8,p.y-8);ellipse(c,0,0,14,14,'#91ad83');ellipse(c,10,-2,13,7,'#b7c398');ellipse(c,3,-7,3,3,'#304d4a');line(c,[[-5,-13],[-9,-24]],'#e4d1a0',3);line(c,[[5,-13],[8,-23]],'#e4d1a0',3);line(c,[[15,2],[25,7]],'#e7c69a',1.5);c.restore();
  }else{
    box(c,p.x,p.y,p.w,p.h+5,5,p.kind==='lantern'?'#98798e':'#9e5e6e',th.light+'99');box(c,p.x-4,p.y-4,p.w+8,8,3,'#d7b594');
    for(let i=0;i<5;i++)line(c,[[p.x+18+i*(p.w-36)/4,p.y+6],[p.x+18+i*(p.w-36)/4,p.y+p.h]],'#e3c19b55',1);
    for(const x of [p.x+18,p.x+p.w-18])lantern(c,x,p.y+35,10,p.kind==='lantern'?'#d4a0a5':'#c66b73',t);
  }
  return true;
}
