import { getDreamLevel } from './dream-levels.js';
import { getFestivalTheme } from './dream-festival-art.js';

// Seasonal stages share the proven physical vocabulary, with authored routes,
// gifts and scenery of their own. No main-story level is mutated.
const definitions = [
  {id:'halloween',base:0,title:'南瓜夜邮',subtitle:'替害怕黑夜的南瓜，送出第一份糖。',anchors:[420,1220],hint:'踩住铜踏板，让拾光穿过幽紫帷幕。收好三份糖果，再去南瓜邮亭。',giftNames:['会发光的薄荷糖','装着笑声的糖纸','最后一颗南瓜软糖']},
  {id:'thanksgiving',base:1,title:'空椅子晚餐',subtitle:'那把空椅子，也等着一句谢谢。',anchors:[550,1640],hint:'借丰收蘑菇翻过树根，找齐三件餐桌物品，为空椅子摆好晚餐。',giftNames:['一捆暖麦穗','漂远的木汤勺','写着谢谢的餐巾']},
  {id:'christmas',base:3,title:'雪夜失物所',subtitle:'弄丢的礼物，都有想回去的地方。',anchors:[660,1740],hint:'踩上漂浮礼盒，顺着雪风找回三份遗失礼物。',giftNames:['一只红色手套','装着星光的玻璃球','不会熄灭的小火柴']},
  {id:'newyear',base:4,title:'零点修理铺',subtitle:'把落下的一秒，留给新的愿望。',anchors:[460,1510],hint:'用回声脉冲定住钟摆，捡回齿轮、刻度和小铜锤，修好零点的钟。',giftNames:['第一颗许愿齿轮','写着再试一次的刻度','零点的小铜锤']},
  {id:'spring',base:5,title:'年兽的试音会',subtitle:'年兽想学会的，是一句新年好。',anchors:[430,1950],hint:'穿过灯街，搭彩台、借弹床，找齐红绸、鼓槌与春联。',giftNames:['不会炸响的红绸','一只软软的鼓槌','写着欢迎的春联']},
  {id:'lantern',base:2,title:'月亮走失了',subtitle:'借一盏人间的灯，送月亮回家。',anchors:[550,1530],hint:'搭上漂浮灯台过河，收集灯纸、银线与小汤圆。',giftNames:['一张兔耳灯纸','月亮丢下的银线','一颗不会凉的小汤圆']},
  {id:'valentine',base:1,title:'两封没有地址的信',subtitle:'喜欢可以寄给朋友，也可以留给自己。',anchors:[550,1540],hint:'飞过玫瑰风廊，找到邮戳、羽毛与信封，把没有地址的心意送到。',giftNames:['一枚半心邮戳','一根蓝色羽毛','带着铃声的信封']},
  {id:'dragonboat',base:2,title:'逆风龙舟局',subtitle:'不抢第一，也能把大家一起带过河。',anchors:[550,1530],hint:'等龙舟靠岸，再跳上船。让拾光逆风找回粽叶、木桨和五彩绳。',giftNames:['一片有字的粽叶','一支漂远的木桨','同伴留下的五彩绳']},
  {id:'qixi',base:3,title:'鹊桥维修日',subtitle:'桥的另一端，是愿意等你的人。',anchors:[660,1740],hint:'沿星桥浮台向前，找齐星河针、云线和羽毛，帮喜鹊补好最后一道缝。',giftNames:['一根星河针','一截借来的云线','不会压弯桥的羽毛']},
  {id:'midautumn',base:0,title:'月饼里的地图',subtitle:'走到月亮下面，就离团圆近了一点。',anchors:[470,1420],hint:'压住桂花踏板，让拾光找到桂花糖、月饼模和圆邮票。',giftNames:['一小罐桂花糖','刻着小路的月饼模','远方寄来的圆邮票']},
];

function authorStage(definition) {
  const level = getDreamLevel(definition.base);
  Object.assign(level, {
    id:'festival-'+definition.id, festivalId:definition.id, chapterIndex:0,
    title:definition.title, subtitle:definition.subtitle, tutorial:definition.hint,
    mechanic:definition.hint, theme:getFestivalTheme(definition.id),
    parTime:Math.max(180,level.parTime+80),
    npcs:[{id:definition.id+'-host',x:196,y:560}],
    routeAnchors:[...definition.anchors],
  });
  level.memories.forEach((gift,index) => {gift.id=definition.id+'-gift-'+index;gift.name=definition.giftNames[index];});
  level.lanterns.forEach((lamp,index)=>{lamp.id=definition.id+'-lamp-'+index;});
  level.signs = [{x:210,text:'Q：和节日朋友说话'},{x:definition.anchors[0],text:'两盏谜灯 · 三份节日礼物'},{x:level.exit.x-165,text:'带上礼物，让身体走进节日邮亭'}];
  // Four celebrations reshape their route rather than recolouring the same room.
  if (definition.id==='halloween') {
    level.platforms.push({x:1280,y:455,w:138,h:18});
    level.winds=[{x:1110,y:120,w:340,h:270,dx:0,dy:-45}];
    level.memories[1].x=850;
  }
  if (definition.id==='thanksgiving') {
    level.platforms.push({x:520,y:465,w:125,h:18});
    level.winds[0].dx=28;level.winds[0].dy=-60;
  }
  if (definition.id==='christmas') {
    level.movers.forEach(platform=>{platform.kind='gift';platform.speed*=.8;});
    level.hazards=[];
    level.winds[0].dx=-28;level.winds[0].dy=-75;
  }
  if (definition.id==='newyear') {
    level.memories[1].x=950;
    level.hazards.forEach((hazard,index)=>{hazard.phase+=.35*index;hazard.speed*=.85;});
  }
  if (definition.id==='spring') {
    level.memories[1].x=900;
    level.movers[0].kind='festival-stage';
    level.hazards[0].speed=.8;
  }
  if (definition.id==='lantern') {
    level.movers[0].kind='lantern';
    level.movers[0].speed=.55;
    level.platforms.push({x:1745,y:465,w:150,h:18});
  }
  if (definition.id==='valentine') {
    const root=level.platforms.find(platform=>platform.kind==='root');root.x=1055;
    level.pads[0].x=905;
    level.winds[0]={x:1450,y:145,w:410,h:300,dx:35,dy:-65};
    level.hazards=[];
    level.memories[1]={...level.memories[1],x:945,y:300};
  }
  if (definition.id==='dragonboat') {
    level.movers[0].kind='dragonboat';
    level.winds=[{x:750,y:190,w:520,h:290,dx:-70,dy:-12}];
    level.platforms.push({x:1440,y:465,w:115,h:18});
  }
  if (definition.id==='qixi') {
    level.movers.forEach((platform,index)=>{platform.kind='starbridge';platform.phase+=index?-.4:.4;});
    level.hazards=[];
    level.winds[0]={x:1290,y:100,w:650,h:355,dx:34,dy:-82};
    level.platforms.push({x:2050,y:465,w:130,h:18});
  }
  if (definition.id==='midautumn') {
    level.width=2260;level.platforms[0].w=2260;
    level.plates[0].x=415;level.barriers[0].x=585;
    level.lanterns[0].x=755;level.lanterns[1].x=1575;
    level.memories[0].x=335;level.memories[1].x=905;level.memories[1].y=310;level.memories[2].x=1835;
    level.exit.x=2120;
    level.platforms.push({x:1780,y:465,w:175,h:18});
    level.checkpoints=[{x:1100,y:560},{x:1750,y:560}];
    level.signs[2].x=1955;
  }
  return level;
}

export const FESTIVAL_LEVELS = definitions.map(authorStage);
export function getFestivalLevel(id='halloween') {
  const level=FESTIVAL_LEVELS.find(item=>item.festivalId===id);
  return level ? JSON.parse(JSON.stringify(level)) : null;
}
