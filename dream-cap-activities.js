import { CAP_SCENES, getCapScene } from './dream-cap-story.js';

// Borrow a miniature from Ashi's head. Geometry, route order and progress belong to the engine.
const ashi = (text, mood = 'joy') => ({ speaker: 'ashi', text, mood });
const light = (text, mood = 'joy') => ({ speaker: 'light', text, mood });
const authorActivity = (sceneId, spec) => {
  const scene = CAP_SCENES.find(item => item.id === sceneId);
  if (!scene) throw new Error(`Unknown cap activity scene: ${sceneId}`);
  const destinations = spec.destinations.map(([id, label]) => ({ id: `${sceneId}-${id}`, label }));
  return {
    id: scene.id, sceneId: scene.id, chapterIndex: scene.chapterIndex, festivalId: scene.festivalId,
    title: spec.title, traveler: spec.traveler, motif: scene.motif, color: scene.color, accent: scene.accent,
    ringLabel: spec.ringLabel, destinations,
    // Every line describes its own destination, so the engine can reorder all three on replay.
    steps: spec.feedback.map((line, target) => ({ target, label: '送到' + destinations[target].label, ...line })),
    start: spec.start, wrong: spec.wrong, complete: spec.complete, replay: spec.replay,
  };
};

export const CAP_ACTIVITIES = [
  authorActivity('story-0', {
    title: '脑洞发车', traveler: '小火车', ringLabel: '汽笛圈',
    destinations: [['sign', '新站牌'], ['bench', '候车椅'], ['track', '回家轨']],
    feedback: [
      light('新站牌立起来了，站名就叫“明天”。'),
      ashi('候车椅多了一排，胆小的念头也有座。', 'tender'),
      light('回家轨铺好了，绕远也有回来的路。', 'brave'),
    ],
    start: ashi('把小火车带出来，给绒绒搭个迷你站。', 'open'),
    wrong: light('这班车先停另一站，看看亮起的站名。', 'peek'),
    complete: ashi('小站开张！我的脑袋终于有了外勤列车。'),
    replay: light('小火车想换个停站顺序，再带它兜一圈。', 'brave'),
  }),
  authorActivity('story-1', {
    title: '借一片春天', traveler: '小嫩芽', ringLabel: '春风圈',
    destinations: [['pot', '空花盆'], ['leaves', '叶台阶'], ['window', '迎风窗']],
    feedback: [
      ashi('空花盆长出新芽，脑洞租客有新家了。'),
      light('叶台阶伸出来了，春天也会垫脚。'),
      light('迎风窗推开了，连花香都有了地址。', 'brave'),
    ],
    start: light('小嫩芽想搬出去。替它借一片春天吧。', 'peek'),
    wrong: ashi('芽尖指着另一边，它可比我认路。', 'curious'),
    complete: ashi('一片春天搭好了，我的脑洞准许外借。', 'open'),
    replay: light('换条生长路线，春天也想散散步。'),
  }),
  authorActivity('story-2', {
    title: '给月亮搭台', traveler: '纸月亮', ringLabel: '月光圈',
    destinations: [['curtain', '幕布架'], ['spotlight', '追光台'], ['audience', '观众席']],
    feedback: [
      ashi('幕布挂好了，这回鼻孔真的不售票。'),
      light('追光台长出来了，小月亮有了工位。', 'brave'),
      ashi('观众席摆好了，最后一排也看得见。', 'tender'),
    ],
    start: ashi('纸月亮要借脑洞首演，先替它搭个台。', 'open'),
    wrong: light('这处暂时没有它的戏，换个亮着的位置。', 'peek'),
    complete: light('迷你剧场开张，纸月亮准备认真谢幕。'),
    replay: ashi('这次换个登场顺序，月亮说它没问题。'),
  }),
  authorActivity('story-3', {
    title: '替小鲸造海', traveler: '小纸鲸', ringLabel: '翻页圈',
    destinations: [['page', '留白页'], ['arch', '书拱门'], ['bay', '小海湾']],
    feedback: [
      light('留白页铺开了，小纸鲸能打一个滚。'),
      ashi('书拱门搭好了，大脑终于有了侧门。', 'open'),
      light('小海湾有水了，鲸的尾巴写出一个逗号。'),
    ],
    start: light('蓝页借来一条小纸鲸，想请你替它造海。', 'peek'),
    wrong: ashi('小鲸把这一页翻过去了，再找找亮处。', 'curious'),
    complete: light('鲸有海，故事有留白。这个脑洞真宽敞。'),
    replay: ashi('换一条游览路线，借鲸费还是一个笑。'),
  }),
  authorActivity('story-4', {
    title: '借来一秒钟', traveler: '小怀表', ringLabel: '滴答圈',
    destinations: [['pendulum', '钟摆座'], ['ticks', '刻度桥'], ['chimes', '风铃架']],
    feedback: [
      ashi('钟摆座站稳了，小怀表可以松口气。', 'tender'),
      light('刻度桥多出一格，够一个念头往前走。', 'brave'),
      light('风铃架响了一下，像明天敲了敲门。'),
    ],
    start: ashi('归先生借来小怀表，给这一秒搭个落脚处。', 'open'),
    wrong: light('这一秒先去别处，跟着亮起来的刻度。', 'peek'),
    complete: ashi('借来的这一秒，终于有地方慢慢向前。', 'tender'),
    replay: light('换条路线试试，时间也能散个步。'),
  }),
  authorActivity('story-5', {
    title: '把日出送出去', traveler: '小太阳', ringLabel: '晨光圈',
    destinations: [['stamp', '邮票窗'], ['letter', '回信桌'], ['sunrise', '朝阳台']],
    feedback: [
      light('邮票窗透进晨光，小太阳有了收件口。'),
      ashi('回信桌铺好了，空白纸也晒得暖暖的。', 'tender'),
      light('朝阳台伸出窗外，给新风景留了座。', 'brave'),
    ],
    start: light('小满画的小太阳，也想出去照照别人。', 'brave'),
    wrong: ashi('先去亮起的那个位置，小太阳认得路。', 'curious'),
    complete: ashi('晨光小邮局开张。明天，这里给你留门。', 'open'),
    replay: light('再借一轮日出，换几个方向打招呼。'),
  }),
  authorActivity('halloween', {
    title: '南瓜请进', traveler: '南瓜小灯', ringLabel: '糖光圈',
    destinations: [['welcome', '请进门'], ['shadow', '笑影墙'], ['candy', '糖果座']],
    feedback: [
      ashi('请进门长出来了，门铃只负责说欢迎。', 'open'),
      light('笑影墙亮了，影子把尖牙换成了酒窝。'),
      ashi('糖果座摆好了，局长的影子也有座。'),
    ],
    start: light('南瓜先生想开门，借你头里的小灯用用。', 'brave'),
    wrong: ashi('小灯没吓着谁，只是走错了邀请地址。', 'curious'),
    complete: light('脑洞夜市开门啦，胆小的客人也请进。'),
    replay: ashi('换一条夜邮路线，影子还想再来一次。'),
  }),
  authorActivity('thanksgiving', {
    title: '再添一个座', traveler: '暖汤勺', ringLabel: '麦香圈',
    destinations: [['table', '长餐桌'], ['soup', '热汤锅'], ['chair', '空椅子']],
    feedback: [
      light('长餐桌伸出一截，再迟到也有位置。'),
      ashi('热汤锅冒起香气，脑洞也想开饭了。'),
      light('空椅子摆好了，这个座位留给栗栗。'),
    ],
    start: ashi('栗栗总忘了自己的份，借脑洞搭张小餐桌。', 'tender'),
    wrong: light('汤勺想先去另一边，别让谢谢洒出来。', 'peek'),
    complete: ashi('小餐桌齐了，请厨师也坐下吃一口。', 'tender'),
    replay: light('换个摆桌顺序，下一顿照样留个空位。'),
  }),
  authorActivity('christmas', {
    title: '雪铃找暖窗', traveler: '小雪铃', ringLabel: '雪铃圈',
    destinations: [['sign', '雪路牌'], ['shelf', '礼物架'], ['window', '暖窗台']],
    feedback: [
      ashi('雪路牌立好了，下雪也盖不住方向。', 'open'),
      light('礼物架伸出小格子，每份温暖都有位置。'),
      ashi('暖窗台亮起来了，小雪铃有地方歇脚。', 'tender'),
    ],
    start: light('铃铛借出一枚小雪铃，想替温暖搭个家。', 'peek'),
    wrong: ashi('雪铃轻轻响，提醒我们换一个地址。', 'curious'),
    complete: light('脑内失物所开张，迷路的温暖请到这里。'),
    replay: ashi('换条送暖路线，小雪铃这回由我领路。', 'open'),
  }),
  authorActivity('newyear', {
    title: '零点小烟花', traveler: '许愿火星', ringLabel: '许愿圈',
    destinations: [['ticks', '刻度台'], ['wish', '许愿枝'], ['firework', '烟花台']],
    feedback: [
      light('刻度台长出新一格，留给还没开始的事。'),
      ashi('许愿枝挂出小星星，纸条不用写很满。', 'tender'),
      light('烟花台支好了，只放纸烟花，不震下巴。'),
    ],
    start: ashi('分针叔借来许愿火星，想给零点搭个舞台。', 'open'),
    wrong: light('火星眨了眨眼，下一处亮点在别处。', 'peek'),
    complete: light('零点小舞台齐了，新的第一步准备登场。', 'brave'),
    replay: ashi('心愿还能换条路走，再借它一趟脑洞。'),
  }),
  authorActivity('spring', {
    title: '年兽登台', traveler: '小年', ringLabel: '鼓点圈',
    destinations: [['ribbon', '彩绸门'], ['drum', '小鼓台'], ['seats', '欢迎席']],
    feedback: [
      light('彩绸门搭好了，小年的尾巴不必再藏。'),
      ashi('小鼓台站稳了，头盖骨终于不用兼任锣。'),
      light('欢迎席摆好了，紧张的念头也能来听。'),
    ],
    start: ashi('小年借了你的脑洞，想排一场小小试音会。', 'open'),
    wrong: light('鼓点在另一边，小年只是在试走位。', 'peek'),
    complete: light('年兽的小舞台齐了，第一拍可以轻轻敲。', 'brave'),
    replay: ashi('换一遍登台路线，小年说这叫彩排。'),
  }),
  authorActivity('lantern', {
    title: '兔灯认路', traveler: '兔耳灯', ringLabel: '银线圈',
    destinations: [['paper', '灯纸架'], ['thread', '银线桥'], ['dumpling', '汤圆摊']],
    feedback: [
      ashi('灯纸架展开了，兔耳灯有了小屋檐。'),
      light('银线桥连上了，月光也能走得稳稳的。', 'brave'),
      ashi('汤圆摊冒热气了，给收摊的人留一碗。', 'tender'),
    ],
    start: light('汤圆婆婆借来兔耳灯，陪它搭一段回家路。', 'peek'),
    wrong: ashi('兔耳朵朝另一边转，它听见了新方向。', 'curious'),
    complete: light('这条小灯街亮了，婆婆也有灯陪着回家。'),
    replay: ashi('再绕一条灯街，兔灯想多认识一扇窗。'),
  }),
  authorActivity('valentine', {
    title: '半颗心投递', traveler: '半心邮戳', ringLabel: '心意圈',
    destinations: [['voice', '开口窗'], ['listen', '倾听亭'], ['reply', '回信台']],
    feedback: [
      light('开口窗推开了，藏着的喜欢可以探头。'),
      ashi('倾听亭有位置了，先让对方把话说完。', 'tender'),
      light('回信台铺上空白纸，回应可以慢慢写。'),
    ],
    start: light('阿翎寄来半心邮戳，先给心意搭个落脚处。', 'peek'),
    wrong: ashi('地址还没对上，心意不用急着落款。', 'tender'),
    complete: light('心意小邮亭搭好了，喜欢和谢谢都能寄。'),
    replay: ashi('换一条投递路线，这次也记得认真听。', 'open'),
  }),
  authorActivity('dragonboat', {
    title: '一舟都不少', traveler: '粽叶舟', ringLabel: '浪花圈',
    destinations: [['start', '起航桩'], ['crew', '同伴埠'], ['return', '回头湾']],
    feedback: [
      ashi('起航桩扎稳了，小舟能放心把头探出去。', 'open'),
      light('同伴埠伸出栈桥，慢一点的也能上船。'),
      light('回头湾有了靠岸处，转身也算向前划。', 'brave'),
    ],
    start: ashi('粽队长借来小舟，先把回头的路也修好。', 'open'),
    wrong: light('这处先不靠岸，小舟指着另一道浪花。', 'peek'),
    complete: ashi('小码头搭好了，出发和回来都有位置。', 'tender'),
    replay: light('换条水路试试，小舟认得每一位同伴。', 'brave'),
  }),
  authorActivity('qixi', {
    title: '鹊桥补一段', traveler: '小喜鹊点点', ringLabel: '星河圈',
    destinations: [['pier', '星桥墩'], ['rail', '云线栏'], ['bell', '呼应铃']],
    feedback: [
      ashi('星桥墩站好了，点点的小爪有处落脚。'),
      light('云线栏接住一段距离，胆小也可以扶。', 'brave'),
      ashi('呼应铃挂好了，说声我在，它就轻轻响。', 'tender'),
    ],
    start: light('点点想借你的脑洞，把一小段星河接起来。', 'peek'),
    wrong: ashi('点点指着另一处缺口，咱们换边试试。', 'curious'),
    complete: light('小鹊桥搭好了，两边都有愿意靠近的路。'),
    replay: ashi('换个补桥顺序，点点想练练新走法。'),
  }),
  authorActivity('midautumn', {
    title: '月饼借路', traveler: '月饼小圆', ringLabel: '桂香圈',
    destinations: [['tree', '桂花树'], ['map', '地图台'], ['table', '团圆桌']],
    feedback: [
      light('桂花树伸出枝头，脑洞闻起来像过节。'),
      ashi('地图台摆好了，先认路，再讨论吃月饼。'),
      light('团圆桌多出一角，给远方也留个位置。'),
    ],
    start: ashi('桂桂画了三处小站，借块月饼把它们串起来。', 'open'),
    wrong: light('月饼地图朝另一边，先别急着咬一口。', 'peek'),
    complete: ashi('这份团圆搭好了，分着坐，月亮还是圆的。', 'tender'),
    replay: light('换条赏月路线，月饼小圆还没看够。'),
  }),
];

const activitiesByScene = new Map(CAP_ACTIVITIES.map(activity => [activity.sceneId, activity]));

export function getCapActivity({ chapterIndex = 0, festivalId = null } = {}) {
  const scene = getCapScene({ chapterIndex, festivalId });
  return activitiesByScene.get(scene.id) || CAP_ACTIVITIES[0];
}
