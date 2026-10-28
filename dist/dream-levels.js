// Authored stages for 掀起你的头盖骨. Coordinates are logical pixels, feet down.
// Geometry and mechanics are data, so the same physics serves every chapter.
const themes = [
  { sky:['#101d2a','#243d43'], mist:'#7da8a0', ground:'#202d33', edge:'#8ba98b', light:'#e9bf78', spirit:'#a2ead9', accent:'#c8a5dd', motif:'station' },
  { sky:['#102b29','#34504a'], mist:'#96b995', ground:'#283b35', edge:'#9fbd83', light:'#ffcf88', spirit:'#b7f4cb', accent:'#f1a8a2', motif:'garden' },
  { sky:['#21182e','#483145'], mist:'#bf91ad', ground:'#352735', edge:'#b38a9f', light:'#f5ca91', spirit:'#d8c5ff', accent:'#eea7bc', motif:'theatre' },
  { sky:['#102638','#254a59'], mist:'#8bb8cc', ground:'#253b49', edge:'#8bb2bc', light:'#f1ce93', spirit:'#9dedee', accent:'#baafeb', motif:'library' },
  { sky:['#222137','#525260'], mist:'#b2bdc0', ground:'#393d4b', edge:'#b3b7a7', light:'#ffd291', spirit:'#bce6f3', accent:'#d8b497', motif:'coast' },
  { sky:['#302436','#87615e'], mist:'#d7b7a1', ground:'#473c48', edge:'#d2b49c', light:'#ffe1a2', spirit:'#d1f5d7', accent:'#eac3d1', motif:'post' },
];

const floor = (width, gaps = []) => {
  const out=[]; let x=0;
  for (const [a,b] of gaps) { out.push({x,y:560,w:a-x,h:100,solid:true,kind:'ground'}); x=b; }
  out.push({x,y:560,w:width-x,h:100,solid:true,kind:'ground'});
  return out;
};
const memory = (x,y,id) => ({x,y,id});
const lamp = (x,y,id) => ({x,y,id});
const common = { height:640, spawn:{x:105,y:560}, totalMemories:3, totalSeals:2 };

export const DREAM_LEVELS = [
  {
    ...common, id:'moss-station', title:'苔灯站台', subtitle:'替迟到的旅人，留一盏灯。', width:2020, theme:themes[0], parTime:115,
    mechanic:'身体压住铜踏板，灵魂穿过帷幕。',
    tutorial:'走到发光的铜踏板，按 E 掀开头盖骨。灵魂飞近灯笼后，按空格点亮它。',
    platforms:[...floor(2020),{x:195,y:465,w:155,h:18},{x:810,y:445,w:170,h:18},{x:1090,y:365,w:150,h:18},{x:1590,y:465,w:175,h:18}],
    plates:[{id:'ticket',x:365,y:560,w:110,label:'身体留在这里'}],
    barriers:[{id:'ticket-veil',x:520,y:0,w:22,h:560,plateId:'ticket',latchedBy:0}],
    lanterns:[lamp(665,285,'depart'),lamp(1430,315,'arrive')],
    memories:[memory(270,420,'m1'),memory(880,300,'m2'),memory(1680,420,'m3')],
    checkpoints:[{x:1020,y:560},{x:1510,y:560}],
    exit:{x:1890,y:560}, movers:[], pads:[], winds:[], hazards:[],
    signs:[{x:170,text:'W / 空格：轻轻一跳'},{x:370,text:'让身体站在踏板上 · E 出窍'},{x:1240,text:'飞近灯笼 · 空格共鸣'}],
  },
  {
    ...common, id:'backflow-greenhouse', title:'倒流温室', subtitle:'悲伤也会长出蘑菇。', width:2180, theme:themes[1], parTime:125,
    mechanic:'蘑菇弹床把身体送上高台。',
    tutorial:'先点亮温室的灯。向前踩上大蘑菇，它会把身体弹上普通跳跃到不了的高台。',
    platforms:[...floor(2180),{x:250,y:465,w:145,h:18},{x:895,y:385,w:145,h:175,solid:true,kind:'root'},{x:1270,y:445,w:170,h:18},{x:1680,y:365,w:155,h:18}],
    plates:[],barriers:[],
    lanterns:[lamp(630,250,'seed'),lamp(1700,250,'bloom')],
    memories:[memory(325,420,'m1'),memory(970,275,'m2'),memory(1810,420,'m3')],
    checkpoints:[{x:570,y:560},{x:1180,y:560},{x:1850,y:560}],
    exit:{x:2040,y:560}, movers:[],
    pads:[{x:745,y:560,w:115,power:850}],
    winds:[{x:1480,y:120,w:330,h:350,dx:10,dy:-85}],
    hazards:[{kind:'drifter',x:1450,y:515,range:95,speed:1.1,r:22}],
    signs:[{x:450,text:'灵魂可以飞过缠绕的树根'},{x:720,text:'踩上蘑菇 · 保持向右'},{x:1530,text:'温室的风，会把灵魂托起来'}],
  },
  {
    ...common, id:'borrowed-moon-theatre', title:'借月剧场', subtitle:'没人鼓掌的时候，也请谢幕。', width:2260, theme:themes[2], parTime:145,
    mechanic:'搭乘会移动的舞台，跨过幕间空隙。',
    tutorial:'前方的舞台在左右移动。先跳上岸边踏台，等它靠近，再搭它过河。灵魂可以先去探路。',
    platforms:[...floor(2260,[[735,1200]]),{x:565,y:465,w:220,h:18},{x:1130,y:465,w:225,h:18},{x:1550,y:435,w:155,h:18}],
    plates:[],barriers:[],
    lanterns:[lamp(515,285,'overture'),lamp(1720,275,'curtain')],
    memories:[memory(305,425,'m1'),memory(990,310,'m2'),memory(1855,420,'m3')],
    checkpoints:[{x:510,y:560},{x:1360,y:560},{x:1860,y:560}],
    exit:{x:2115,y:560}, pads:[],winds:[],hazards:[],
    movers:[{id:'stage',x:940,y:465,w:185,h:20,axis:'x',range:245,speed:.6,phase:-Math.PI/2,kind:'stage'}],
    signs:[{x:400,text:'先跳上踏台，等舞台过来'},{x:1320,text:'幕布后面，还有一盏月亮'}],
  },
  {
    ...common, id:'whalefall-library', title:'鲸落图书馆', subtitle:'没能说出口的，都写在潮汐里。', width:2340, theme:themes[3], parTime:140,
    mechanic:'浮书可以落脚，风廊改变灵魂的航线。',
    tutorial:'书会浮起来，也会轻轻落下。身体能站在书上；灵魂进入风廊后，按住方向修正航线。',
    platforms:[...floor(2340),{x:300,y:465,w:145,h:18},{x:950,y:445,w:155,h:18},{x:1700,y:460,w:175,h:18}],
    plates:[],barriers:[{id:'catalogue',x:1180,y:390,w:38,h:170,latchedBy:0}],
    lanterns:[lamp(835,205,'name'),lamp(1830,200,'voice')],
    memories:[memory(375,420,'m1'),memory(990,270,'m2'),memory(2060,390,'m3')],
    checkpoints:[{x:570,y:560},{x:1280,y:560},{x:1920,y:560}],
    exit:{x:2195,y:560}, pads:[],
    movers:[{id:'book-a',x:615,y:430,w:155,h:18,axis:'y',range:62,speed:.85,phase:0,kind:'book'},{id:'book-b',x:1410,y:415,w:170,h:18,axis:'y',range:72,speed:.75,phase:1.4,kind:'book'}],
    winds:[{x:1350,y:95,w:590,h:370,dx:-48,dy:-100}],
    hazards:[{kind:'drifter',x:1580,y:515,range:90,speed:.9,r:22}],
    signs:[{x:500,text:'会漂浮的书，也能成为落脚点'},{x:1360,text:'风向 ↖ · 灵魂要稳住方向'}],
  },
  {
    ...common, id:'pendulum-shore', title:'钟摆海岸', subtitle:'迟到的道歉，也能赶上黎明。', width:2260, theme:themes[4], parTime:150,
    mechanic:'灵魂共鸣能让钟摆暂停四秒。',
    tutorial:'钟摆扫过的地方，身体会散架。让灵魂靠近钟摆，按空格把它暂时定住，再按 E 回来通过。',
    platforms:[...floor(2260),{x:280,y:460,w:150,h:18},{x:1450,y:445,w:185,h:18}],
    plates:[],barriers:[],
    lanterns:[lamp(680,220,'yesterday'),lamp(1750,250,'tomorrow')],
    memories:[memory(355,415,'m1'),memory(1130,320,'m2'),memory(1915,420,'m3')],
    checkpoints:[{x:460,y:560},{x:1420,y:560},{x:1900,y:560}],
    exit:{x:2120,y:560}, movers:[],pads:[],winds:[{x:1020,y:150,w:350,h:250,dx:55,dy:-20}],
    hazards:[{kind:'pendulum',x:820,y:215,length:310,swing:.6,speed:1.05,phase:0,r:31},{kind:'pendulum',x:1130,y:180,length:350,swing:.5,speed:.9,phase:1.8,r:34},{kind:'pendulum',x:1720,y:215,length:310,swing:.55,speed:1.1,phase:2.5,r:30}],
    signs:[{x:430,text:'出窍，靠近钟摆 · 空格让时间停住'},{x:1440,text:'灯亮起来了 · 还有时间'}],
  },
  {
    ...common, id:'dawn-post-office', title:'黎明邮局', subtitle:'把自己，也写进收件人里。', width:2680, theme:themes[5], parTime:190,
    mechanic:'踏板、浮台、弹床与钟摆，把旅途接起来。',
    tutorial:'最后一封信，要由身体与灵魂一起送到。踩踏板、点灯、搭浮台、借蘑菇起跳——你已经会了。',
    platforms:[...floor(2680,[[870,1240]]),{x:700,y:465,w:210,h:18},{x:1180,y:465,w:175,h:18},{x:1600,y:390,w:130,h:170,solid:true,kind:'root'},{x:2070,y:450,w:170,h:18}],
    plates:[{id:'letter',x:375,y:560,w:115,label:'把身体留给这盏灯'}],
    barriers:[{id:'last-veil',x:550,y:0,w:22,h:560,plateId:'letter',latchedBy:0}],
    lanterns:[lamp(700,270,'others'),lamp(2130,260,'self')],
    memories:[memory(225,420,'m1'),memory(1100,305,'m2'),memory(2350,400,'m3')],
    checkpoints:[{x:650,y:560},{x:1390,y:560},{x:1850,y:560},{x:2390,y:560}],
    exit:{x:2540,y:560},
    movers:[{id:'last-stage',x:1010,y:465,w:190,h:20,axis:'x',range:185,speed:.7,phase:-Math.PI/2,kind:'book'}],
    pads:[{x:1450,y:560,w:115,power:850}],
    winds:[{x:1880,y:100,w:380,h:330,dx:-35,dy:-75}],
    hazards:[{kind:'pendulum',x:2350,y:215,length:310,swing:.58,speed:1.0,phase:1.0,r:30}],
    signs:[{x:370,text:'第一步，记得把身体留在踏板上'},{x:700,text:'第二步，搭上回家的浮台'},{x:1430,text:'第三步，借一朵蘑菇的勇气'},{x:2170,text:'最后，给自己留一束光'}],
  },
].map((level,index)=>({...level,chapterIndex:index}));

export const LEVELS = DREAM_LEVELS;
export function getDreamLevel(index=0) {
  const i=Number.isInteger(index)?Math.max(0,Math.min(DREAM_LEVELS.length-1,index)):0;
  return JSON.parse(JSON.stringify(DREAM_LEVELS[i]));
}
