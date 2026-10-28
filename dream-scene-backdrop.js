// Chapter-specific, screen-space scenery. All landmarks are decorative; this
// module reads a small view and never reaches into physics, input, saves or HUD.
const TAU=Math.PI*2;
const SCENES=new Set(['station','garden','theatre','library','coast','post']);
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hex=(s,f)=>/^#[\da-f]{6}$/i.test(s||'')?s:/^#[\da-f]{3}$/i.test(s||'')?'#'+s.slice(1).split('').map(v=>v+v).join(''):f;
const tint=(s,a)=>s+Math.round(clamp(a,0,1)*255).toString(16).padStart(2,'0');

function line(c,points,color,width=1){
  if(!points.length)return;c.beginPath();c.moveTo(...points[0]);
  for(const p of points.slice(1))c.lineTo(...p);c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function curve(c,points,color,width=1){c.beginPath();c.moveTo(points[0],points[1]);c.bezierCurveTo(...points.slice(2));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function oval(c,x,y,rx,ry,color,rotation=0){c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fillStyle=color;c.fill();}
function rect(c,x,y,w,h,color,r=0,edge=null,width=1){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}}
function arc(c,x,y,r,start,end,color,width=1){c.beginPath();c.arc(x,y,r,start,end);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function star(c,x,y,r,color){c.beginPath();c.moveTo(x,y-r);for(const p of [[x+r*.25,y-r*.25],[x+r,y],[x+r*.25,y+r*.25],[x,y+r],[x-r*.25,y+r*.25],[x-r,y],[x-r*.25,y-r*.25]])c.lineTo(...p);c.closePath();c.fillStyle=color;c.fill();}
function moon(c,x,y,r,color){c.beginPath();c.moveTo(x+r*.3,y-r);c.bezierCurveTo(x-r*1.3,y-r,x-r*1.3,y+r,x+r*.25,y+r);c.quadraticCurveTo(x+r*.8,y+r*.7,x+r*.95,y+r*.15);c.bezierCurveTo(x-r*.1,y+r*.7,x-r*.5,y-r*.45,x+r*.3,y-r);c.closePath();c.fillStyle=color;c.fill();}
function pointedLeaf(c,x,y,length,width,angle,fill,vein=null){
  c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);
  c.bezierCurveTo(-width,-length*.23,-width*1.05,-length*.72,0,-length);
  c.bezierCurveTo(width*.96,-length*.72,width*.8,-length*.2,0,0);c.closePath();c.fillStyle=fill;c.fill();
  if(vein){curve(c,[0,0,-width*.12,-length*.35,width*.08,-length*.68,0,-length*.93],vein,1);for(let i=1;i<5;i++){const yy=-length*i/6,ww=width*Math.sin(i/6*Math.PI)*.7;line(c,[[-ww,yy-length*.09],[0,yy],[ww,yy-length*.09]],vein,.65);}}
  c.restore();
}
function arch(c,x,y,w,h,fill,edge,width=1){
  c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2,y-h+w*.35);
  c.bezierCurveTo(x-w/2,y-h-w*.18,x+w/2,y-h-w*.18,x+w/2,y-h+w*.35);
  c.lineTo(x+w/2,y);if(fill){c.closePath();c.fillStyle=fill;c.fill();}if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}
}
function repeats(v,spacing,offset,parallax,margin,paint){
  const scroll=v.camera*parallax;
  const first=Math.floor((scroll-offset-margin)/spacing),last=Math.ceil((scroll+v.width-offset+margin)/spacing);
  for(let i=first;i<=last&&i<first+50;i++){const x=offset+i*spacing-scroll;if(x+margin<0||x-margin>v.width)continue;paint(x,i);}
}
function addWeb(v,x,y,size=28,flip=1){if(x>12&&x<v.width-12&&y>45&&y<430&&v.webs.length<12)v.webs.push({x,y,size,flip});}

function pumpkinWindow(c,v,x,y,size){
  if(!v.halloween||v.pumpkins>=3||x<size||x>v.width-size)return;
  v.pumpkins++;oval(c,x,y,size,size*.8,tint('#d69b64',.34));
  for(const side of [-1,1])oval(c,x+side*size*.37,y,size*.38,size*.78,tint('#edb36f',.24));
  curve(c,[x,y-size*.7,x-2,y-size*1.3,x+3,y-size*1.45,x+4,y-size*1.15],tint(v.spirit,.4),1.4);
  for(const side of [-1,1]){c.beginPath();c.moveTo(x+side*size*.5,y-size*.18);c.lineTo(x+side*size*.22,y-size*.22);c.lineTo(x+side*size*.35,y+size*.07);c.closePath();c.fillStyle=tint('#ffe0a6',.56);c.fill();}
  curve(c,[x-size*.42,y+size*.28,x-size*.12,y+size*.66,x+size*.12,y+size*.66,x+size*.42,y+size*.28],tint('#ffe0a6',.5),1);
}
function windowLight(c,v,x,y,w,h,seed=0){
  const alpha=.065+(Math.abs(seed)%3<v.seals?.055:.015);
  const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,tint(v.light,alpha));g.addColorStop(1,tint(v.light,.015));
  arch(c,x,y+h,w,h,g,tint(v.mist,.15),.8);
  line(c,[[x,y+5],[x,y+h]],tint(v.edge,.17),1);
  if(Math.abs(seed)%3===1)pumpkinWindow(c,v,x,y+h-11,Math.min(8,w*.25));
}

function station(c,v,pass){
  if(pass==='far'){
    repeats(v,610,245,.12,330,(x,i)=>{
      c.beginPath();c.moveTo(x-290,512);c.lineTo(x-290,322);c.quadraticCurveTo(x,164,x+290,322);c.lineTo(x+290,512);c.closePath();c.fillStyle=tint(v.mist,.075);c.fill();
      for(let k=-2;k<=2;k++)arch(c,x+k*92,495,70,149,tint(v.sky,.16),tint(v.mist,.08),1);
      curve(c,[x-300,315,x-110,230,x+110,230,x+300,315],tint(v.edge,.12),2);
      line(c,[[x-285,513],[x+285,513]],tint(v.mist,.1),2);
    });
  } else if(pass==='mid'){
    repeats(v,430,205,.31,235,(x,i)=>{
      c.beginPath();c.moveTo(x-214,318);c.quadraticCurveTo(x,160,x+214,318);c.lineTo(x+214,331);c.quadraticCurveTo(x,184,x-214,331);c.closePath();c.fillStyle=tint(v.mist,.17);c.fill();
      curve(c,[x-215,317,x-85,200,x+85,200,x+215,317],tint(v.edge,.27),2);
      for(const side of [-1,1]){line(c,[[x+side*196,311],[x+side*196,522]],tint(v.edge,.19),3);line(c,[[x+side*186,316],[x+side*186,520]],tint(v.mist,.09),1);}
      for(let k=-3;k<=3;k++){const xx=x+k*57,roof=240+Math.pow(k/3,2)*65;line(c,[[xx,roof],[xx+28,304],[xx+55,roof+10]],tint(v.edge,.13),1.1);}
      line(c,[[x-192,321],[x+192,321]],tint(v.edge,.18),1.7);
      for(const xx of [x-110,x-38,x+38,x+110])arch(c,xx,504,48,113,tint(v.sky,.17),tint(v.edge,.11),1);
      addWeb(v,x-189,323,29,1);
    });
  } else {
    repeats(v,430,205,.31,235,(x,i)=>{
      const cx=x+92,cy=286;oval(c,cx,cy,20,20,tint(v.sky,.55));arc(c,cx,cy,20,0,TAU,tint(v.light,.29),1.4);arc(c,cx,cy,16,0,TAU,tint(v.mist,.2),.7);
      line(c,[[cx,cy-11],[cx,cy],[cx+8,cy+4]],tint(v.light,.39),1.3);
      for(let k=0;k<8;k++){const a=k*TAU/8;line(c,[[cx+Math.sin(a)*15,cy+Math.cos(a)*15],[cx+Math.sin(a)*17,cy+Math.cos(a)*17]],tint(v.light,.22),.7);}
      for(let k=0;k<3;k++)windowLight(c,v,x-109+k*73,391,43,110,i*3+k);
      line(c,[[x-179,345],[x-179,366]],tint(v.light,.25),1.1);rect(c,x-190,366,24,10,tint(v.light,.2),3);
    });
  }
}

function garden(c,v,pass){
  if(pass==='far'){
    repeats(v,255,90,.13,190,(x,i)=>{
      const angle=Math.sin(i*2.1)*.5,length=174+Math.abs(Math.sin(i*1.7))*98;
      pointedLeaf(c,x,526,length,45,angle,tint(v.spirit,.06),tint(v.mist,.09));
      pointedLeaf(c,x+91,528,length*.73,32,-.46-angle*.25,tint(v.mist,.07),tint(v.mist,.07));
    });
    const mist=c.createLinearGradient(0,280,0,525);mist.addColorStop(0,tint(v.spirit,0));mist.addColorStop(.6,tint(v.spirit,.025));mist.addColorStop(1,tint(v.spirit,0));c.fillStyle=mist;c.fillRect(0,280,v.width,245);
  } else if(pass==='mid'){
    repeats(v,420,211,.3,225,(x,i)=>{
      c.beginPath();c.moveTo(x-205,522);c.lineTo(x-205,264);c.bezierCurveTo(x-174,93,x+174,93,x+205,264);c.lineTo(x+205,522);c.closePath();c.fillStyle=tint(v.spirit,.025);c.fill();c.strokeStyle=tint(v.edge,.23);c.lineWidth=2.5;c.stroke();
      for(let k=-3;k<=3;k++){const dx=k*61;curve(c,[x+dx,522,x+dx*1.09,370,x+dx*.75,158,x,128],tint(v.mist,k===0?.29:.19),k===0?2:1.3);}
      for(const y of [302,406])curve(c,[x-204,y,x-80,y-15,x+80,y-15,x+204,y],tint(v.edge,.17),1.25);
      for(const side of [-1,1]){
        const sway=Math.sin(v.t*.45+i+side)*2.4;
        curve(c,[x+side*191,521,x+side*168+sway,438,x+side*216,371,x+side*190,308],tint(v.edge,.26),2.1);
        for(let k=0;k<4;k++)pointedLeaf(c,x+side*(187+Math.sin(k)*8),481-k*43,25+k%2*9,8,side*(.45+k%2*.34),tint(v.spirit,.16),tint(v.edge,.19));
      }
      addWeb(v,x-199,278,32,1);
    });
  } else {
    repeats(v,420,211,.3,225,(x,i)=>{
      for(const [dx,y,len]of[[-125,219,40],[-92,243,21],[82,192,36],[118,281,23]])line(c,[[x+dx,y],[x+dx+len*.55,y-len]],tint(v.spirit,.25),1.2);
      for(let k=0;k<3;k++){
        const wx=x-124+k*124;windowLight(c,v,wx,438,30,58,i*3+k);
        pointedLeaf(c,wx,498,35,9,k%2?.35:-.35,tint(v.spirit,.19));
        line(c,[[wx-19,505],[wx+19,504]],tint(v.edge,.2),1.5);
      }
    });
  }
}

function theatre(c,v,pass){
  if(pass==='far'){
    repeats(v,760,330,.12,440,(x,i)=>{
      arch(c,x,523,690,373,tint(v.accent,.045),tint(v.mist,.1),4);
      arch(c,x,523,580,325,null,tint(v.mist,.065),8);
      for(let row=0;row<3;row++)for(let j=-8;j<=8;j++){
        const sx=x+j*38+row%2*19,sy=482+row*19+Math.pow(j/8,2)*9;
        rect(c,sx-13,sy-10,26,15,tint(v.sky,.28),9);line(c,[[sx-10,sy+4],[sx+10,sy+4]],tint(v.mist,.075),1);
      }
    });
  } else if(pass==='mid'){
    repeats(v,490,236,.3,258,(x,i)=>{
      c.beginPath();c.moveTo(x-244,109);c.quadraticCurveTo(x-119,250,x,123);c.quadraticCurveTo(x+121,250,x+244,109);c.lineTo(x+244,73);c.lineTo(x-244,73);c.closePath();c.fillStyle=tint(v.accent,.16);c.fill();
      curve(c,[x-240,114,x-150,208,x-72,190,x-3,126],tint(v.mist,.19),1.7);curve(c,[x+3,126,x+72,190,x+150,208,x+240,114],tint(v.mist,.19),1.7);
      for(const side of [-1,1]){
        const xx=x+side*228;c.beginPath();c.moveTo(xx-side*15,116);c.lineTo(xx+side*27,116);c.quadraticCurveTo(xx-side*17,326,xx+side*31,519);c.lineTo(xx-side*24,519);c.quadraticCurveTo(xx+side*13,317,xx-side*15,116);c.fillStyle=tint(v.accent,.13);c.fill();
        for(let k=0;k<3;k++)curve(c,[xx+side*k*7,136,xx-side*17,280,xx+side*22,386,xx+side*k*8,503],tint(v.mist,.1),1);
      }
      addWeb(v,x-214,137,29,1);
    });
  } else {
    repeats(v,490,236,.3,258,(x,i)=>{
      line(c,[[x+117,128],[x+117,221]],tint(v.light,.18),.8);moon(c,x+117,242,25,tint(v.light,.19));
      for(const [xx,yy]of[[x-103,175],[x-21,139],[x+204,157]]){line(c,[[xx,yy],[xx,yy+13]],tint(v.light,.22),.7);star(c,xx,yy+16,3,tint(v.light,.24));}
      windowLight(c,v,x-74,351,37,116,i+1);
      if(v.seals>0){const glow=c.createRadialGradient(x+35,354,5,x+35,354,99);glow.addColorStop(0,tint(v.light,.045+v.seals*.015));glow.addColorStop(1,tint(v.light,0));c.fillStyle=glow;c.fillRect(x-64,255,198,198);}
    });
  }
}

function whaleShape(c,x,y,scale,fill){
  c.save();c.translate(x,y);c.scale(scale,scale);c.beginPath();c.moveTo(-219,10);
  c.bezierCurveTo(-270,-91,119,-113,211,-43);c.quadraticCurveTo(279,-10,245,39);c.bezierCurveTo(187,109,-78,107,-219,10);
  c.quadraticCurveTo(-269,36,-314,72);c.quadraticCurveTo(-314,11,-277,-2);c.quadraticCurveTo(-322,-15,-322,-66);c.quadraticCurveTo(-271,-39,-219,10);c.closePath();c.fillStyle=fill;c.fill();
  c.beginPath();c.moveTo(31,46);c.quadraticCurveTo(-18,124,-69,111);c.quadraticCurveTo(-43,65,31,46);c.fill();c.restore();
}
function library(c,v,pass){
  const whaleX=350-v.camera*.12,whaleY=232+Math.sin(v.t*.23)*2.5,scale=clamp(v.width/700,.66,1.08);
  if(pass==='far'){
    whaleShape(c,whaleX,whaleY,scale,tint(v.spirit,.075));
    c.save();c.translate(whaleX,whaleY);c.scale(scale,scale);
    curve(c,[-226,-9,-112,-79,109,-71,230,-12],tint(v.mist,.15),2);
    for(let k=-4;k<=4;k++){const x=k*39;curve(c,[x,-43,x-34,-1,x-34,62,x+10,68-Math.abs(k)*5],tint(v.spirit,.12),1.3);}
    oval(c,216,-8,3.6,3.6,tint(v.light,.21));c.restore();
    for(let i=0;i<3;i++)curve(c,[-60,457+i*21,v.width*.23,434+i*23,v.width*.67,477+i*13,v.width+60,449+i*22],tint(v.spirit,.04+i*.013),1.2);
  } else if(pass==='mid'){
    repeats(v,285,145,.31,162,(x,i)=>{
      arch(c,x,522,239,205,tint(v.sky,.2),tint(v.mist,.17),4);
      for(const side of [-1,1])for(let k=0;k<5;k++){const y=358+k*31;rect(c,x+side*105-13,y,26,25,tint(k%2?v.accent:v.mist,.15),3,tint(v.edge,.14),.8);}
      for(let shelf=0;shelf<4;shelf++){
        const y=385+shelf*35;line(c,[[x-78,y],[x+78,y]],tint(v.mist,.17),1.7);
        for(let book=0;book<9;book++){const xx=x-72+book*17,bh=17+Math.abs(Math.sin((i*7+book*3+shelf)*1.2))*10;rect(c,xx,y-bh,11,bh,tint((book+shelf)%3===0?v.light:(book+shelf)%3===1?v.accent:v.spirit,.085),1);}
      }
      addWeb(v,x-102,350,28,1);
    });
  } else {
    repeats(v,285,145,.31,162,(x,i)=>{
      for(let k=0;k<3;k++){const yy=383+k*35,xx=x-46+k*34;line(c,[[xx,yy-19],[xx,yy-3]],tint(v.light,.21+v.seals*.025),.9);}
      windowLight(c,v,x,319,43,45,i+1);
      for(const side of [-1,1])curve(c,[x+side*100,321,x+side*72,289,x+side*36,280,x,278],tint(v.spirit,.18),1);
    });
  }
}

function coast(c,v,pass){
  if(pass==='far'){
    const horizon=351;const water=c.createLinearGradient(0,horizon,0,558);water.addColorStop(0,tint(v.spirit,.065));water.addColorStop(.65,tint(v.mist,.045));water.addColorStop(1,tint(v.sky,.15));c.fillStyle=water;c.fillRect(0,horizon,v.width,207);
    curve(c,[-30,horizon, v.width*.31,horizon-5,v.width*.7,horizon+4,v.width+30,horizon],tint(v.mist,.23),1.1);
    const cx=227-v.camera*.12,cy=348;c.save();c.translate(cx,cy);c.rotate(-.27);
    oval(c,0,0,104,104,tint(v.sky,.15));arc(c,0,0,104,Math.PI,TAU,tint(v.mist,.14),4);arc(c,0,0,87,Math.PI,TAU,tint(v.edge,.1),1.4);
    for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6;line(c,[[Math.cos(a)*77,Math.sin(a)*77],[Math.cos(a)*91,Math.sin(a)*91]],tint(v.mist,.16),2);}
    line(c,[[-43,-55],[0,0],[38,-16]],tint(v.mist,.18),2.3);c.restore();
    repeats(v,570,456,.1,210,(x,i)=>{c.beginPath();c.moveTo(x-135,361);c.lineTo(x-81,338);c.lineTo(x-47,347);c.lineTo(x-13,309);c.lineTo(x+62,345);c.lineTo(x+139,358);c.closePath();c.fillStyle=tint(v.sky,.27);c.fill();});
  } else if(pass==='mid'){
    for(let band=0;band<3;band++){
      const yy=399+band*51,amp=4+band*2;
      c.beginPath();c.moveTo(-30,yy);
      for(let x=-30;x<=v.width+30;x+=20)c.lineTo(x,yy+Math.sin((x+v.camera*(.2+band*.05))/112+v.t*.22+band)*amp);
      c.strokeStyle=tint(v.spirit,.1+band*.017);c.lineWidth=band===2?2:1.25;c.stroke();
    }
    repeats(v,590,330,.32,180,(x,i)=>{
      line(c,[[x-86,522],[x-78,469]],tint(v.edge,.13),4);line(c,[[x+34,524],[x+27,483]],tint(v.edge,.14),4);
      curve(c,[x-78,480,x-47,503,x+4,507,x+27,491],tint(v.mist,.12),1.4);
      addWeb(v,x-76,477,21,1);
    });
  } else {
    const rx=clamp(v.width*.71-v.camera*.055,95,v.width-55);
    for(let i=0;i<7;i++){const y=378+i*18,spread=12+i*6,phase=Math.sin(v.t*.2+i)*2;line(c,[[rx-spread+phase,y],[rx+spread*.6+phase,y]],tint(v.light,.055+v.seals*.012),1.1);}
    repeats(v,590,330,.32,180,(x,i)=>{
      line(c,[[x-78,469],[x-76,456]],tint(v.light,.2),1);rect(c,x-88,438,23,29,tint(v.light,.07),5,tint(v.mist,.21),1);
      pumpkinWindow(c,v,x-76,457,6.7);
    });
  }
}

function post(c,v,pass){
  if(pass==='far'){
    const dawn=c.createLinearGradient(0,199,0,521);dawn.addColorStop(0,tint(v.light,0));dawn.addColorStop(.7,tint(v.light,.045));dawn.addColorStop(1,tint(v.light,.08));c.fillStyle=dawn;c.fillRect(0,199,v.width,322);
    repeats(v,510,225,.12,285,(x,i)=>{
      c.beginPath();c.moveTo(x-265,520);c.lineTo(x-265,352);c.lineTo(x-205,352);c.lineTo(x-168,299);c.lineTo(x-110,351);c.lineTo(x-40,351);c.lineTo(x+16,282);c.lineTo(x+83,347);c.lineTo(x+180,347);c.lineTo(x+215,315);c.lineTo(x+270,354);c.lineTo(x+270,520);c.closePath();c.fillStyle=tint(v.sky,.22);c.fill();
      line(c,[[x-166,300],[x-110,352],[x-42,352],[x+16,282],[x+83,348]],tint(v.light,.12),1.3);
    });
  } else if(pass==='mid'){
    repeats(v,360,182,.3,196,(x,i)=>{
      arch(c,x,524,310,285,tint(v.mist,.055),tint(v.edge,.2),3);
      for(const side of [-1,1]){arch(c,x+side*82,459,85,148,tint(v.sky,.17),tint(v.mist,.19),1.5);line(c,[[x+side*82,319],[x+side*82,457]],tint(v.edge,.15),1);}
      for(let row=0;row<3;row++)for(let col=0;col<7;col++){const xx=x-129+col*38,yy=469+row*16;rect(c,xx,yy,30,12,tint(v.sky,.2),2,tint(v.mist,.09),.7);line(c,[[xx+9,yy+5],[xx+21,yy+5]],tint(v.light,.075),.8);}
      curve(c,[x-184,264,x-58,294,x+58,294,x+184,264],tint(v.edge,.18),1.2);
      addWeb(v,x-141,302,30,1);
    });
  } else {
    repeats(v,360,182,.3,196,(x,i)=>{
      for(let k=0;k<2;k++){
        const xx=x+(k?82:-82);windowLight(c,v,xx,316,75,140,i*2+k);
        for(let row=0;row<2;row++)line(c,[[xx-33,358+row*45],[xx+33,358+row*45]],tint(v.mist,.16),.9);
      }
      // Small letters stay inside glass, never imitate a collectible in space.
      rect(c,x-102,421,16,10,tint(v.light,.16),1);line(c,[[x-101,422],[x-94,427],[x-87,422]],tint(v.sky,.18),.7);
      line(c,[[x+47,327],[x+63,307]],tint(v.light,.22),1.3);
      star(c,x,251,7,tint(v.light,.22));
    });
  }
}

const PAINTERS={station,garden,theatre,library,coast,post};

function clipBrightDetails(c,v,zones){
  // Each circle gets its own exclusion clip. A single evenodd path would make
  // the overlap of two protected circles visible again.
  for(const zone of zones){
    if(!zone||!Number.isFinite(zone.x)||!Number.isFinite(zone.y)||!Number.isFinite(zone.r)||zone.r<0)continue;
    const x=zone.x-v.camera,y=zone.y,r=clamp(zone.r+5,5,1200);
    if(x+r<0||x-r>v.width||y+r<v.top||y-r>v.bottom)continue;
    c.beginPath();c.rect(-1,v.top-1,v.width+2,v.bottom-v.top+2);c.moveTo(x+r,y);c.arc(x,y,r,0,TAU);c.closePath();c.clip('evenodd');
  }
}
function halloween(c,v){
  if(!v.halloween)return;
  for(const web of v.webs.filter((w,i)=>i%2===0).slice(0,2)){
    c.save();c.translate(web.x,web.y);c.scale(web.flip,1);
    for(let i=0;i<4;i++){const a=i*Math.PI/6;line(c,[[0,0],[Math.cos(a)*web.size,Math.sin(a)*web.size]],tint(v.mist,.22),.65);}
    for(const f of [.36,.65,1])arc(c,0,0,web.size*f,0,Math.PI/2,tint(v.mist,.2),.65);
    c.restore();
  }
  const count=v.width<600?4:6,span=v.width+80;
  for(let i=0;i<count;i++){
    const x=((i+.55)*span/count-v.camera*.055)%span+((i+.55)*span/count-v.camera*.055<0?span:0)-40;
    const y=74+(i%3)*28+Math.sin(v.t*.28+i)*2.5,wing=Math.sin(v.t*1.8+i)*2;
    c.save();c.translate(x,y);c.beginPath();c.moveTo(-12,-2-wing);c.quadraticCurveTo(-8,5,-3,1);c.lineTo(-1,-3);c.lineTo(1,-3);c.lineTo(3,1);c.quadraticCurveTo(8,5,12,-2-wing);c.lineTo(6,-5);c.lineTo(1,-1);c.lineTo(-1,-1);c.lineTo(-6,-5);c.closePath();c.fillStyle=tint(v.accent,.2);c.fill();c.restore();
  }
}

/** Draw after sky/moon/mist, before the engine's world transform and objects. */
export function drawSceneBackdrop(c,view,t=0,reducedMotion=false){
  if(!c||!view)return;
  const palette=view.palette||{},width=clamp(finite(view.viewport?.width,960),1,8192);
  const top=finite(view.viewport?.top),bottom=Math.max(top+1,finite(view.viewport?.bottom,640));
  const v={width,top,bottom,camera:finite(view.cameraX),worldWidth:Math.max(width,finite(view.worldWidth,width)),
    sky:hex(palette.sky?.[0],'#152631'),mist:hex(palette.mist,'#9cb9b3'),edge:hex(palette.edge,'#a4b598'),light:hex(palette.light,'#e6c28b'),spirit:hex(palette.spirit,'#bae3ce'),accent:hex(palette.accent,'#c3b3d6'),
    seals:clamp(Math.floor(finite(view.litSeals)),0,2),t:reducedMotion?0:clamp(finite(t),-1e6,1e6),halloween:view.seasonId==='halloween',webs:[],pumpkins:0};
  const paint=PAINTERS[SCENES.has(view.sceneId)?view.sceneId:'station'];
  c.save();c.lineCap='round';c.lineJoin='round';c.beginPath();c.rect(0,top,width,bottom-top);c.clip();
  paint(c,v,'far');paint(c,v,'mid');
  c.save();clipBrightDetails(c,v,Array.isArray(view.clearZones)?view.clearZones:[]);paint(c,v,'detail');halloween(c,v);c.restore();
  c.restore();
}
