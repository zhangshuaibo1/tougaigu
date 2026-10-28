// Original seasonal adventures for Tougaigu. Calendar dates use Asia/Shanghai.
// HKO month anchors correct known ICU differences; see docs/FESTIVAL-CALENDAR-SOURCES.md.
export const FESTIVAL_SAVE_KEY = 'tougaigu.festivals.v1';
export const FESTIVAL_TIME_ZONE = 'Asia/Shanghai';
const DAY_MS = 86400000;
const HKO_MONTH_STARTS = [["2024-12-31",2024,12,false],["2025-01-29",2025,1,false],["2025-02-28",2025,2,false],["2025-03-29",2025,3,false],["2025-04-28",2025,4,false],["2025-05-27",2025,5,false],["2025-06-25",2025,6,false],["2025-07-25",2025,6,true],["2025-08-23",2025,7,false],["2025-09-22",2025,8,false],["2025-10-21",2025,9,false],["2025-11-20",2025,10,false],["2025-12-20",2025,11,false],["2026-01-19",2025,12,false],["2026-02-17",2026,1,false],["2026-03-19",2026,2,false],["2026-04-17",2026,3,false],["2026-05-17",2026,4,false],["2026-06-15",2026,5,false],["2026-07-14",2026,6,false],["2026-08-13",2026,7,false],["2026-09-11",2026,8,false],["2026-10-10",2026,9,false],["2026-11-09",2026,10,false],["2026-12-09",2026,11,false],["2027-01-08",2026,12,false],["2027-02-06",2027,1,false],["2027-03-08",2027,2,false],["2027-04-07",2027,3,false],["2027-05-06",2027,4,false],["2027-06-05",2027,5,false],["2027-07-04",2027,6,false],["2027-08-02",2027,7,false],["2027-09-01",2027,8,false],["2027-09-30",2027,9,false],["2027-10-29",2027,10,false],["2027-11-28",2027,11,false],["2027-12-28",2027,12,false],["2028-01-26",2028,1,false],["2028-02-25",2028,2,false],["2028-03-26",2028,3,false],["2028-04-25",2028,4,false],["2028-05-24",2028,5,false],["2028-06-23",2028,5,true],["2028-07-22",2028,6,false],["2028-08-20",2028,7,false],["2028-09-19",2028,8,false],["2028-10-18",2028,9,false],["2028-11-16",2028,10,false],["2028-12-16",2028,11,false],["2029-01-15",2028,12,false],["2029-02-13",2029,1,false],["2029-03-15",2029,2,false],["2029-04-14",2029,3,false],["2029-05-13",2029,4,false],["2029-06-12",2029,5,false],["2029-07-11",2029,6,false],["2029-08-10",2029,7,false],["2029-09-08",2029,8,false],["2029-10-08",2029,9,false],["2029-11-06",2029,10,false],["2029-12-05",2029,11,false],["2030-01-04",2029,12,false],["2030-02-03",2030,1,false],["2030-03-04",2030,2,false],["2030-04-03",2030,3,false],["2030-05-02",2030,4,false],["2030-06-01",2030,5,false],["2030-07-01",2030,6,false],["2030-07-30",2030,7,false],["2030-08-29",2030,8,false],["2030-09-27",2030,9,false],["2030-10-27",2030,10,false],["2030-11-25",2030,11,false],["2030-12-25",2030,12,false],["2031-01-23",2031,1,false],["2031-02-21",2031,2,false],["2031-03-23",2031,3,false],["2031-04-22",2031,3,true],["2031-05-21",2031,4,false],["2031-06-20",2031,5,false],["2031-07-19",2031,6,false],["2031-08-18",2031,7,false],["2031-09-17",2031,8,false],["2031-10-16",2031,9,false],["2031-11-15",2031,10,false],["2031-12-14",2031,11,false],["2032-01-13",2031,12,false],["2032-02-11",2032,1,false],["2032-03-12",2032,2,false],["2032-04-10",2032,3,false],["2032-05-09",2032,4,false],["2032-06-08",2032,5,false],["2032-07-07",2032,6,false],["2032-08-06",2032,7,false],["2032-09-05",2032,8,false],["2032-10-04",2032,9,false],["2032-11-03",2032,10,false],["2032-12-03",2032,11,false],["2033-01-01",2032,12,false],["2033-01-31",2033,1,false],["2033-03-01",2033,2,false],["2033-03-31",2033,3,false],["2033-04-29",2033,4,false],["2033-05-28",2033,5,false],["2033-06-27",2033,6,false],["2033-07-26",2033,7,false],["2033-08-25",2033,8,false],["2033-09-23",2033,9,false],["2033-10-23",2033,10,false],["2033-11-22",2033,11,false],["2033-12-22",2033,11,true],["2034-01-20",2033,12,false],["2034-02-19",2034,1,false],["2034-03-20",2034,2,false],["2034-04-19",2034,3,false],["2034-05-18",2034,4,false],["2034-06-16",2034,5,false],["2034-07-16",2034,6,false],["2034-08-14",2034,7,false],["2034-09-13",2034,8,false],["2034-10-12",2034,9,false],["2034-11-11",2034,10,false],["2034-12-11",2034,11,false],["2035-01-09",2034,12,false],["2035-02-08",2035,1,false],["2035-03-10",2035,2,false],["2035-04-08",2035,3,false],["2035-05-08",2035,4,false],["2035-06-06",2035,5,false],["2035-07-05",2035,6,false],["2035-08-04",2035,7,false],["2035-09-02",2035,8,false],["2035-10-01",2035,9,false],["2035-10-31",2035,10,false],["2035-11-30",2035,11,false],["2035-12-29",2035,12,false],["2036-01-28",2036,1,false]];


const line = (speaker, text) => ({ speaker, text });
const makeFestival = spec => ({
  ...spec,
  portrait: `./assets/festival-hero-${spec.id}.svg`,
  npc: { ...spec.npc, id: `npc-${spec.id}`, portrait: `./assets/festival-npc-${spec.id}.svg` },
  item: { ...spec.item, id: `keepsake-${spec.id}` },
  puzzles: spec.puzzles.map((puzzle, sealIndex) => ({ ...puzzle, id: `${spec.id}-${sealIndex}`, sealIndex, speaker: 'festival' })),
});

export const FESTIVALS = [
  makeFestival({
    id: 'halloween', name: '万圣节', title: '南瓜夜邮', shortName: '南瓜夜邮', tagline: '把不敢敲门的心愿，送进一盏南瓜灯。',
    periodLabel: '10月24日—11月3日', priority: 100, color: '#ffbb70', accent: '#c8a7f4', weather: 'bats', motif: 'pumpkin', costume: 'halloween', outfitName: '南瓜小巫师',
    npc: { name: '南瓜先生', role: '害怕吓到人的夜邮局长' },
    gifts: ['会发光的薄荷糖', '装着笑声的糖纸', '最后一颗南瓜软糖'],
    item: { name: '不吓人的南瓜灯', description: '敲一下，会说“请进”。为那些还没勇气敲门的人留着。' },
    sceneHint: '收好三份糖果，解开两盏南瓜灯，把邀请函送到夜邮局。',
    intro: [line('festival', '嘘！我把今晚的惊吓通知，偷偷改成了邀请函。可糖果被蝙蝠当成星星搬走了。'), line('ashi', '我负责送信。拾光负责够高。您负责……先别把自己吓跑。'), line('light', '两盏谜灯、三份糖果。今晚的口令是：不给糖，也可以进来坐坐。')],
    encounters: [line('festival', '我练了一百次“不给糖就捣蛋”，每次都忍不住接一句“没关系，我带了”。'), line('ashi', '那就这么说。不是每一位南瓜，都得长成恶作剧。'), line('light', '把糖送到终点吧。最胆小的那位客人，已经在门口等很久了。')],
    outro: [line('festival', '灯亮了！门外不是怪物，是戴着怪物面具、怕被拒绝的邻居。'), line('ashi', '第一位客人摘下面具，发现大家都把“害怕”穿在了外面。'), line('light', '南瓜先生第一次笑出了声音。那张糖纸，真的装得下笑声。')],
    choice: { title: '最后一颗糖留给谁？', lead: '夜邮局的门还开着。糖盒里只剩一颗会发光的软糖。', options: [
      { id: 'doorstep', title: '放在门口的小碟里', text: '给还没勇气敲门的下一位客人。', reply: '天快亮时，小碟里多了一张纸条：“原来我不用很勇敢，也能收到礼物。”' },
      { id: 'keeper', title: '交给南瓜先生', text: '今晚邀请了所有人，也别忘记他。', reply: '南瓜先生把糖含在嘴里。那盏一直为别人亮着的灯，第一次照见了自己的笑容。' },
    ] },
    puzzles: [
      { type: '原创灯谜', title: '跟着你，却吃不到糖', scene: '墙上排着四位客人。南瓜先生说：“有一位一直跟着阿拾，却没有嘴巴。”', question: '灯亮我就来，你动我也动；糖果递给我，地上还是空。猜一物。', options: ['蝙蝠', '影子', '围巾', '南瓜'], answer: 1, hints: ['它会随着光线方向改变长短。', '低头看脚边，灯光被身体挡住的那一片就是它。'], explanation: '谜底是影子。南瓜先生给影子也留了座位：不能吃糖的客人，也可以听故事。' },
      { type: '故事推理', title: '蝙蝠的三只糖盒', scene: '南瓜盒、月亮盒、星星盒各装一件不同的礼物：薄荷糖、软糖、糖纸。薄荷不在南瓜盒，软糖在星星盒，月亮盒里不是糖纸。', question: '会发光的薄荷糖装在哪只盒子？', options: ['南瓜盒', '星星盒', '三个盒子都有', '月亮盒'], answer: 3, hints: ['先确定星星盒已经装了软糖。', '薄荷不在南瓜盒，也不能和软糖共用星星盒，只剩一只。'], explanation: '薄荷糖在月亮盒。星星盒是软糖，剩下的南瓜盒就是装着笑声的糖纸。三份礼物终于各归其位。' },
    ],
  }),
  makeFestival({
    id: 'thanksgiving', name: '感恩节', title: '空椅子晚餐', shortName: '枫叶晚餐', tagline: '这张长桌，多留一个位置也不会挤。',
    periodLabel: '11月第四个周四前后3天', priority: 70, color: '#eab36e', accent: '#d98b74', weather: 'leaves', motif: 'harvest', costume: 'thanksgiving', outfitName: '枫叶小厨师',
    npc: { name: '栗栗', role: '总把份量算多的松鼠厨师' },
    gifts: ['一捆暖麦穗', '漂远的木汤勺', '写着谢谢的餐巾'],
    item: { name: '多一人的木汤勺', description: '永远能再舀出一小勺热汤。栗栗说，留座比算准人数重要。' },
    sceneHint: '找回三件餐桌物品，点亮两盏枫叶灯，替晚归的人留饭。',
    intro: [line('festival', '我摆了七张椅子，邀请函只寄出六封。最后那张，是给还没认识的人。'), line('ashi', '可长桌被风拆成了好几段，汤勺也划着餐巾远航了。'), line('light', '那就顺着枫叶找。真正的晚餐，应该从“有人等你”开始。')],
    encounters: [line('festival', '去年我数着缺席的人，汤就凉了。今年我想先给到场的人盛一碗。'), line('ashi', '椅子可以空着，等候不一定要冷着。'), line('festival', '找到餐巾了吗？背面那句“谢谢你回来”，我练了很久。')],
    outro: [line('festival', '最后一张椅子被雨淋湿了。阿拾擦干它，一个迷路的旅行者刚好敲门。'), line('ashi', '他没带礼物，只带来了一段很长的路。'), line('light', '栗栗把汤舀满：“那就从最有趣的地方讲起。”')],
    choice: { title: '把空椅子放在哪里？', lead: '晚餐结束后，栗栗想为下一次相遇留一个位置。', options: [
      { id: 'table', title: '留在长桌旁', text: '以后每顿饭，都算上下一位朋友。', reply: '从此长桌总多摆一副餐具。有人问起，栗栗就说：“我们的朋友，还没来齐。”' },
      { id: 'window', title: '搬到温暖窗前', text: '让赶路的人，不进门也能先歇歇。', reply: '窗边添了一壶热茶。第一位坐下的人，只想避雨；第二次来，他带了一篮新烤的面包。' },
    ] },
    puzzles: [
      { type: '餐桌推理', title: '第七只碗', scene: '桌上有七只碗，其中三只已经盛好汤。栗栗准备让每位客人都喝上热汤。', question: '还需要再盛几碗？', options: ['四碗', '三碗', '七碗', '十碗'], answer: 0, hints: ['不要把已经盛好的三碗再算一次。', '总数七减去已经盛好的三。'], explanation: '还需要四碗。阿拾额外摆了一把勺子：别忘了忙前忙后的厨师，也要坐下来。' },
      { type: '故事推理', title: '谁的谢谢？', scene: '三张餐巾各有一句话。旅行者谢谢修鞋的人，修鞋匠谢谢种麦的人，农夫谢谢带来远方故事的人。', question: '哪张餐巾应该交给旅行者？', options: ['谢谢你修好鞋底', '谢谢你种下麦子', '谢谢你讲远方的故事', '三张都不是给他的'], answer: 2, hints: ['找的是旅行者收到的话，不是旅行者说出的话。', '旅行者带来的礼物，是一路上的故事。'], explanation: '旅行者收到“谢谢你讲远方的故事”。一圈感谢绕回原处，每个人都曾照顾别人，也被别人照顾。' },
    ],
  }),
  makeFestival({
    id: 'christmas', name: '圣诞节', title: '雪夜失物所', shortName: '雪夜失物', tagline: '丢失的礼物，也想找到真正需要它的人。',
    periodLabel: '12月18日—27日', priority: 70, color: '#a9dce7', accent: '#ee9b9b', weather: 'snow', motif: 'snow', costume: 'christmas', outfitName: '铃雪快递员',
    npc: { name: '铃铛', role: '第一次独自送礼的驯鹿学徒' },
    gifts: ['一只红色手套', '装着星光的玻璃球', '不会熄灭的小火柴'],
    item: { name: '慢一点的雪铃', description: '铃响时，赶路的人会想起看看身边。送得慢，也可以送得很准。' },
    sceneHint: '沿雪路找回三份失物，解开两盏雪灯，把礼物送到失物所。',
    intro: [line('festival', '坏消息：我的礼物袋漏了。好消息：雪地把每一件礼物的落点都记下来了。'), line('ashi', '这次先不比谁送得快。我们看看，谁正好需要它。'), line('light', '拾光侦探出动。我的放大镜……就是我自己！')],
    encounters: [line('festival', '送到第十家时，我才发现第九家的老奶奶还在朝我挥手。'), line('ashi', '她也许只是想把围巾替你系紧。'), line('festival', '那我回程再慢一点。礼物不一定都装在袋子里。')],
    outro: [line('ashi', '红手套给了扫雪人，星光球照亮小窗，火柴点着了失物所的炉子。'), line('festival', '我把礼物清单弄丢了，却记住了每个人的名字。'), line('light', '失物所多出一块牌子：“丢了方向，也可以来坐坐。”')],
    choice: { title: '最后一阵铃声送向哪？', lead: '驯鹿学徒准备返程，还有一段空闲的路。', options: [
      { id: 'old-window', title: '去那扇亮着的小窗', text: '补上刚才没来得及说的晚安。', reply: '窗后的老奶奶没有等礼物。她端出两杯热可可，说：“我就知道，你还会回来。”' },
      { id: 'trail', title: '挂在雪路的入口', text: '让下一位迷路的人听见失物所。', reply: '夜深以后，雪铃仍轻轻响。路过的人顺着铃声，找到了一盏灯和一个空位。' },
    ] },
    puzzles: [
      { type: '雪地推理', title: '没有绕远的脚印', scene: '失物所指示牌写着“向东两格，再向北一格”。铃铛起点旁的箭头说明：东在右，北在上。', question: '哪条路线能找到失物所？', options: ['左、左、上', '右、上、上', '右、右、上', '下、右、右'], answer: 2, hints: ['先走两步相同的方向，再转一次弯。', '东是右，北是上。'], explanation: '路线是右、右、上。脚印会被新雪盖住，认清方向比一味追着脚印更可靠。' },
      { type: '原创灯谜', title: '雪里的一双小房子', scene: '扫雪人手指冻红了，礼物袋里有一件东西正在等他。', question: '五位小客人，住进暖房间；出门一起走，握手不分散。猜一物。', options: ['帽子', '手套', '袜子', '围巾'], answer: 1, hints: ['五位小客人，是一只手上的五根手指。', '它通常成双出现，冬天戴在手上。'], explanation: '谜底是手套。给对方真正需要的温暖，是铃铛今天学会的第一条送礼诀窍。' },
    ],
  }),
  makeFestival({
    id: 'newyear', name: '元旦', title: '零点修理铺', shortName: '零点修理', tagline: '不是把过去清零，是把新的第一步装好。',
    periodLabel: '12月28日—1月4日', priority: 75, color: '#ead38a', accent: '#aebaf3', weather: 'confetti', motif: 'clock', costume: 'newyear', outfitName: '零点星旅人',
    npc: { name: '分针叔', role: '总在最后一秒犹豫的猫头鹰钟匠' },
    gifts: ['第一颗许愿齿轮', '写着再试一次的刻度', '零点的小铜锤'],
    item: { name: '第一秒怀表', description: '表盘没有“太晚了”。每次打开，都是一个可以开始的现在。' },
    sceneHint: '找齐三件钟表零件，点亮两盏倒数灯，敲响新年的第一秒。',
    intro: [line('festival', '我把旧年的最后一秒拆下来修，结果新年在门外排队了。'), line('ashi', '您是在修钟，还是舍不得那一秒？'), line('festival', '都有一点。请帮我找回齿轮吧。新的一年，不该一直站着等。')],
    encounters: [line('light', '这些刻度怎么都写着“下次”？'), line('festival', '都是没做完的小事。我以为把它们塞进钟里，就能多挤出一点时间。'), line('ashi', '把最想做的一件带过去就好。行李太满，第一步会很重。')],
    outro: [line('festival', '钟声响了！旧年的刻度没有消失，悄悄变成了新表盘的背面。'), line('ashi', '原来跨年不需要把自己换掉。只要把脚，往前放一点。'), line('light', '第一秒，已签收。还有很多秒，我们慢慢拆。')],
    choice: { title: '第一秒用来做什么？', lead: '怀表停在一个空白的刻度上，等你写下开头。', options: [
      { id: 'start', title: '做一件想做的小事', text: '把“下次”换成一个很小的现在。', reply: '分针叔终于把窗台那盆花搬到了阳光下。只用了一秒，却等了整整一年。' },
      { id: 'rest', title: '好好歇一口气', text: '把休息也算作值得完成的事。', reply: '修理铺第一次挂出“午睡中”。门外的钟没有催促，只替他轻轻数着好梦。' },
    ] },
    puzzles: [
      { type: '时钟推理', title: '跨过零点的五分钟', scene: '怀表现在是23:58。分针叔要用五分钟，把最后一颗齿轮装好。', question: '五分钟后，怀表应该显示什么？', options: ['23:03', '次日00:03', '次日00:58', '23:53'], answer: 1, hints: ['再过两分钟，就从23:59跨到次日00:00。', '五分钟用去两分钟，还剩三分钟。'], explanation: '五分钟后是次日00:03。零点不是所有事都必须做完的期限，没做完的，也可以接着做。' },
      { type: '机关推理', title: '缺了一格的倒数灯', scene: '倒数灯按同一规律排列：12、9、6、？、0。每响一次钟，就减少相同的数。', question: '空着的那盏灯应填几？', options: ['4', '2', '1', '3'], answer: 3, hints: ['从12到9，减少了多少？', '每次都减3；6再减3就是空位。'], explanation: '空位是3。倒数齐了，所有人一起把最后三个数念完；这一次，分针叔没有迟疑。' },
    ],
  }),
  makeFestival({
    id: 'spring', name: '春节', title: '年兽的试音会', shortName: '年兽试音', tagline: '那个躲在鼓声后面的家伙，其实想加入乐队。',
    periodLabel: '农历腊月廿五—正月初八', priority: 95, color: '#f0ab83', accent: '#f0cf79', weather: 'petals', motif: 'spring', costume: 'spring', outfitName: '春灯小瑞兽',
    npc: { name: '小年', role: '怕巨响、却想当鼓手的年兽' },
    gifts: ['不会炸响的红绸', '一只软软的鼓槌', '写着欢迎的春联'],
    item: { name: '轻轻响的迎春鼓', description: '轻敲一下，响起“欢迎”。小年的第一场演出，从允许紧张开始。' },
    sceneHint: '收齐三件演出道具，点亮两盏春灯，陪小年完成第一次登台。',
    intro: [line('festival', '别放大响声！我不是来吃人的。我看见招募鼓手的告示……字太小，还以为写着招募年兽。'), line('ashi', '没看错。我们正缺一位会紧张的鼓手，特别真诚的那种。'), line('light', '把红绸、鼓槌和春联找齐。今晚，小年只负责打自己喜欢的节拍。')],
    encounters: [line('festival', '大家见我就关门。我只好在门口踩节拍，结果他们关得更快了。'), line('ashi', '那这次我们先把名字写在门上，再写一句：请进。'), line('festival', '能再加一句吗？“鼓声不大，欢迎带着胆小一起来。”')],
    outro: [line('festival', '咚，咚咚。听见了吗？没有谁被吓跑。'), line('ashi', '小年敲错了第三拍，全镇却跟着笑了，然后重新数了一遍。'), line('light', '那副春联终于贴正了：上联“每个人都有位置”，下联“每一步都能重来”。')],
    choice: { title: '演出结束后，鼓放在哪？', lead: '小年不想把第一次被欢迎的声音锁起来。', options: [
      { id: 'door', title: '放在城门边', text: '谁回来，都可以敲一下报平安。', reply: '鼓不再用来吓走谁。每一声轻响，都意味着又有人回到了家。' },
      { id: 'square', title: '放在广场中央', text: '谁想练习，都可以从第一拍开始。', reply: '第二天，小年收了三位学生：一只结巴的风铃、一朵害羞的花，以及不太会拍手的阿拾。' },
    ] },
    puzzles: [
      { type: '原创字谜', title: '门里听见的欢迎', scene: '春灯少了一个字。小年提示：“嘴巴进了门，开口先说好。”', question: '“口”放进“门”里面，会组成哪个字？', options: ['间', '闷', '问', '闪'], answer: 2, hints: ['看四个候选字中，门里面是什么偏旁。', '门内有口，是询问的“问”。'], explanation: '答案是“问”。先问一句“你愿意进来吗”，比替别人猜好答案更温柔。' },
      { type: '节拍机关', title: '小年的第一段鼓谱', scene: '鼓谱每三拍重复一次：轻、轻、重；轻、轻、重；轻、轻、？。', question: '最后一拍应该怎么敲？', options: ['重', '轻', '停四拍', '任意连续敲'], answer: 0, hints: ['把鼓谱分成三拍一组。', '每组都是两个轻拍，接一个重拍。'], explanation: '最后是重拍。重拍也可以温柔，小年用软鼓槌敲出结尾，灯笼跟着点了点头。' },
    ],
  }),
  makeFestival({
    id: 'lantern', name: '元宵节', title: '月亮走失了', shortName: '寻月灯会', tagline: '谁把月亮装进了汤圆碗？',
    periodLabel: '农历正月初十—十七', priority: 85, color: '#f0d08b', accent: '#eba5ae', weather: 'lanterns', motif: 'lantern', costume: 'lantern', outfitName: '寻月灯使',
    npc: { name: '汤圆婆婆', role: '会给灯谜补鞋的兔子摊主' },
    gifts: ['一张兔耳灯纸', '月亮丢下的银线', '一颗不会凉的小汤圆'],
    item: { name: '装得下月亮的兔灯', description: '灯里没有关着月亮，只有一条愿意陪你回家的银线。' },
    sceneHint: '捡回三件月亮信物，解开两盏灯谜，送兔灯回到灯会。',
    intro: [line('festival', '不得了，我碗里多了一轮月亮！天上倒没少……难道它有双胞胎？'), line('ashi', '先别捞。水面一晃，它就碎成三片线索了。'), line('light', '我们去灯会问问。也许月亮只是想看看，大家怎么过元宵。')],
    encounters: [line('festival', '每年我都出同一道谜：“谁最想你回家？”大家总嫌答案太长。'), line('ashi', '那就不设标准答案，让他们写在灯上。'), line('festival', '好。写不出来的人，可以先吃一碗热的。')],
    outro: [line('ashi', '银线穿过灯纸，碗里的圆光忽然不再破碎。原来那是月亮的倒影。'), line('festival', '倒影也算客人。再添一只小碗！'), line('light', '兔灯在每个人手里绕了一圈，照亮了好多没写完的名字。')],
    choice: { title: '兔灯最后陪谁回家？', lead: '灯会要散了，手里的银线还暖着。', options: [
      { id: 'child', title: '交给迷路的小灯童', text: '让他先看清回家的路。', reply: '小灯童把灯举得很高。远处也亮起一盏灯，像两个人隔着人海挥手。' },
      { id: 'stall', title: '挂回婆婆的摊边', text: '为最后一位收摊的人留一束光。', reply: '汤圆婆婆收好锅，发现兔灯还等着她。这个夜晚，她也成了被照亮的人。' },
    ] },
    puzzles: [
      { type: '原创字谜', title: '赶路的人靠一靠', scene: '灯纸上画着一位旅人，正靠在树旁歇脚。', question: '一个“人”靠着一棵“木”，合起来是什么字？', options: ['林', '体', '本', '休'], answer: 3, hints: ['“人”在左边会写成单人旁。', '单人旁加“木”，是休息的“休”。'], explanation: '谜底是“休”。灯会很长，旅人也可以停下来吃一碗汤圆。' },
      { type: '灯会推理', title: '真正的月亮在哪？', scene: '三盏灯排成一行：兔灯不在中间；鱼灯在兔灯左边；月灯不在最左边。', question: '三盏灯从左到右怎样排列？', options: ['兔、月、鱼', '鱼、月、兔', '月、鱼、兔', '鱼、兔、月'], answer: 1, hints: ['兔灯不在中间，也不能在最左，因为鱼灯在它左边。', '兔灯在最右；月灯不能在最左，只能居中。'], explanation: '顺序是鱼、月、兔。把月灯挂回中间，水里便出现了一条完整的银光小路。' },
    ],
  }),
  makeFestival({
    id: 'valentine', name: '情人节', title: '两封没有地址的信', shortName: '无址情书', tagline: '有些话绕了很远，只差一次敲门。',
    periodLabel: '2月10日—17日', priority: 80, color: '#eea4bd', accent: '#c5b0ee', weather: 'hearts', motif: 'rose', costume: 'valentine', outfitName: '玫瑰信使',
    npc: { name: '阿翎', role: '总替别人传话的纸鹤邮差' },
    gifts: ['一枚半心邮戳', '一根蓝色羽毛', '带着铃声的信封'],
    item: { name: '愿意开口的半心邮戳', description: '另一半不属于某个固定的人，属于每一次认真说出的喜欢与感谢。' },
    sceneHint: '收齐三条寄信线索，解开两盏玫瑰灯，让两封信找到主人。',
    intro: [line('festival', '两封信都没写地址。一封说“给每天替我开窗的人”，一封说“给总在窗边唱歌的人”。'), line('ashi', '听起来像同一扇窗的两边。'), line('light', '先找齐邮戳、羽毛和信封。阿翎，你自己的信呢？别又塞回翅膀里。')],
    encounters: [line('festival', '我会说一百种“请查收”，可轮到自己的信，只会说天气不错。'), line('ashi', '那就从天气不错开始。下一句，不必特别漂亮。'), line('festival', '“今天天气不错，我想和你一起看看。”这样可以吗？')],
    outro: [line('ashi', '开窗的花匠和唱歌的云雀，终于读懂了同一阵风。'), line('festival', '我也把自己的信寄出去了。收件人是那位总替我捡回纸角的朋友。'), line('light', '今天收到的回应，有“我也是”，也有“谢谢你告诉我”。每一句都被认真签收。')],
    choice: { title: '空白的最后一张卡片', lead: '阿翎留给你一张没有写收件人的卡片。', options: [
      { id: 'someone', title: '写给一个重要的人', text: '一句喜欢、感谢或想念都可以。', reply: '卡片没有华丽的落款，只写着：“遇见你以后，有些普通日子也亮了起来。”' },
      { id: 'self', title: '写给一路走来的自己', text: '把自己的名字也写进收件人。', reply: '阿拾把卡片夹进邮包：“谢谢你没有因为紧张，就放弃继续出发。”拾光认真盖上了邮戳。' },
    ] },
    puzzles: [
      { type: '信件推理', title: '羽毛该送到哪一扇窗？', scene: '寄件人留下蓝羽毛，信里写“谢谢你每天替我开窗”。花匠负责开窗，云雀负责唱歌，钟匠只负责修钟。', question: '这封信应该交给谁？', options: ['花匠', '云雀', '钟匠', '纸鹤自己'], answer: 0, hints: ['收件人是被感谢的人，不是留下羽毛的人。', '信中感谢的是“替我开窗”。'], explanation: '信应交给花匠。蓝羽毛属于寄信的云雀；认真读完别人的话，地址就清楚了。' },
      { type: '故事推理', title: '哪一半能合成心？', scene: '一枚邮戳的左半写着“愿意说”，右半有四张候选纸片。阿翎想表达：交流需要两个人一起完成。', question: '哪张纸片最适合补上另一半？', options: ['替你决定', '必须答应', '永远猜测', '认真听'], answer: 3, hints: ['说出心意后，也要给对方表达自己想法的空间。', '交流需要开口，也需要倾听。'], explanation: '答案是“认真听”。愿意说、认真听，才是一枚完整的邮戳；回应可以不同，尊重始终相同。' },
    ],
  }),
  makeFestival({
    id: 'dragonboat', name: '端午节', title: '逆风龙舟局', shortName: '逆风龙舟', tagline: '这次回头，是为了把同伴一起带过终点。',
    periodLabel: '农历五月初三—初七', priority: 75, color: '#9dd6bc', accent: '#e7c97e', weather: 'reeds', motif: 'dragonboat', costume: 'dragonboat', outfitName: '青叶龙舟手',
    npc: { name: '粽队长', role: '把队友看得比奖杯重要的浣熊船长' },
    gifts: ['一片有字的粽叶', '一支漂远的木桨', '同伴留下的五彩绳'],
    item: { name: '会回头的小船哨', description: '吹响时，船队会先数一数同伴，再数还剩多少路。' },
    sceneHint: '找回三件船队物品，点亮两盏河灯，让落单的小船一起靠岸。',
    intro: [line('festival', '我们的龙舟本来领先。可我听见芦苇里，有一支小桨敲了三下。'), line('ashi', '求救？'), line('festival', '也可能是个不敢大声喊的人。奖杯又不会冷，先把人接回来。')],
    encounters: [line('light', '逆着风划，你们不怕落到最后吗？'), line('festival', '怕啊。我练了很久。但如果少一个人，第一名也装不满这条船。'), line('ashi', '那把绳结打牢。最后这一段，我们一起划。')],
    outro: [line('festival', '芦苇里的小船靠岸了。它没有队名，大家在船头写了“也算我们”。'), line('ashi', '计时员等了很久，终于想起举起终点旗。'), line('light', '今天的奖品是一锅热粽子。分得慢一点，谁都不会落下。')],
    choice: { title: '明年的船头挂什么？', lead: '粽队长留出一小块位置，想记住今天的比赛。', options: [
      { id: 'ribbon', title: '挂起那根五彩绳', text: '把“一个也不少”系在最前面。', reply: '风吹动五彩绳时，每个人都会回头数一遍。数到最后，船就划得更齐了。' },
      { id: 'whistle', title: '挂上能听远处的船哨', text: '让任何一条小船都知道可以求助。', reply: '后来河面上有了约定：三声短哨，不论谁听见，都愿意慢下来。' },
    ] },
    puzzles: [
      { type: '船队推理', title: '还缺几支桨？', scene: '三条小船各需要两支桨，码头已经找回四支。', question: '还要找回几支，才能让三条船一起出发？', options: ['一支', '四支', '两支', '六支'], answer: 2, hints: ['三条船，每条两支，共需要六支。', '总共六支，减去现有的四支。'], explanation: '还差两支桨。粽队长把多出来的座位留给帮忙寻桨的阿拾。' },
      { type: '绳结机关', title: '不会散开的颜色', scene: '五彩绳上的结按“红、黄、绿、蓝、紫”循环。已经系到：红、黄、绿、蓝、紫、红、黄、？。', question: '下一个绳结是什么颜色？', options: ['绿', '紫', '红', '蓝'], answer: 0, hints: ['每五种颜色为一个完整循环。', '第二轮已经到了红、黄，下一种与第一轮相同。'], explanation: '下一个是绿。相同的节奏把绳结连在一起，也让船桨落在同一个拍子上。' },
    ],
  }),
  makeFestival({
    id: 'qixi', name: '七夕', title: '鹊桥维修日', shortName: '鹊桥维修', tagline: '桥不是谁的特权，是每次愿意靠近的路。',
    periodLabel: '农历七月初五—初十', priority: 80, color: '#b6b4ed', accent: '#e6b8dc', weather: 'stars', motif: 'bridge', costume: 'qixi', outfitName: '星河补桥匠',
    npc: { name: '点点', role: '第一次当工头的小喜鹊' },
    gifts: ['一根星河针', '一截借来的云线', '不会压弯桥的羽毛'],
    item: { name: '留着门的星桥扣', description: '合起来能接住一段距离，打开时也不会失去彼此的方向。' },
    sceneHint: '找齐三件修桥材料，点亮两盏星灯，接上星河里的最后一段路。',
    intro: [line('festival', '鹊桥今天检修！请把浪漫排到安全检查后面。我的翅膀还没长齐，责任倒先长满了。'), line('ashi', '哪里需要帮忙？'), line('festival', '星河针、云线、羽毛。还有一句“你做得到”……最后那个不占背包。')],
    encounters: [line('festival', '我把桥修得太窄了。总怕两个人一起过，会把它压坏。'), line('light', '那就给他们一点空间。靠得很近，也可以各自站稳。'), line('ashi', '我们再添一块踏板。桥会结实，你也不用一直撑着。')],
    outro: [line('festival', '桥接好了！第一位过桥的是给姐姐送药的小兔，第二位是来道歉的云。'), line('ashi', '今晚想见的人，原来有这么多种。'), line('light', '点点终于收起检查单，在最稳的桥墩上打了个小小的盹。')],
    choice: { title: '最后一截云线系向哪里？', lead: '修桥材料还剩一截，足够再系一个结。', options: [
      { id: 'bell', title: '系成两端的呼应铃', text: '走远时，也能知道彼此平安。', reply: '桥这边响一下，桥那边轻轻回一下。没有催谁快点，只是告诉对方：我在。' },
      { id: 'rail', title: '补上小桥的扶手', text: '让第一次过桥的人也敢迈步。', reply: '最胆小的小兔扶着云线，一点点走到了对岸。点点在检查单末尾写：“勇气可以慢慢来。”' },
    ] },
    puzzles: [
      { type: '修桥推理', title: '哪块踏板能接上？', scene: '相邻踏板必须让同样的图案相接。缺口左边露出“星”，右边露出“月”；候选踏板不能翻转。', question: '哪块踏板能放进中间，让两端都接好？', options: ['左月右星', '左星右月', '左云右月', '左星右云'], answer: 1, hints: ['踏板左端必须接住缺口左边的星。', '踏板右端还必须接住缺口右边的月。'], explanation: '需要左星右月的踏板。把每一端的需要看清楚，中间那段距离就容易接上了。' },
      { type: '原创灯谜', title: '不说话的来回', scene: '点点试着向山谷喊“辛苦了”，对岸也传来同样一句。', question: '你说一句，我跟一句；隔着山谷，不见身体。猜一种现象。', options: ['下雪', '日出', '潮汐', '回声'], answer: 3, hints: ['声音遇到障碍后，会反射回来。', '这也是拾光最擅长听见的东西。'], explanation: '答案是回声。点点又喊了一遍“你做得到”，这一次，它也听见了自己给自己的回答。' },
    ],
  }),
  makeFestival({
    id: 'midautumn', name: '中秋节', title: '月饼里的地图', shortName: '月饼地图', tagline: '把圆分成几份，团圆反而更大了。',
    periodLabel: '农历八月十二—十八', priority: 85, color: '#edd29a', accent: '#b1d5c5', weather: 'osmanthus', motif: 'moon', costume: 'midautumn', outfitName: '桂月巡游者',
    npc: { name: '桂桂', role: '总把月饼烤成地图的月兔面点师' },
    gifts: ['一小罐桂花糖', '刻着小路的月饼模', '远方寄来的圆邮票'],
    item: { name: '分不散的圆月饼模', description: '每块月饼上都有一段路。分给不同的人，大家仍能找到同一张桌子。' },
    sceneHint: '收好三件团圆信物，解开两盏桂灯，把月饼地图送到月台。',
    intro: [line('festival', '我想把回家的路印在月饼上，可大家一口就把路口吃掉了。'), line('ashi', '那得赶在点心时间前，把三条线索找齐。'), line('light', '我负责看地图，不负责偷吃。毕竟我连嘴都只在开心的时候出现。')],
    encounters: [line('festival', '有些人今年回不来，我就把月饼烤得越来越大。总觉得大一点，距离就小一点。'), line('ashi', '也可以分开寄。收到同一种味道的人，就坐在了同一轮月亮下面。'), line('festival', '那我在每张包装纸上，都留一块空白。让他们把自己的路画回来。')],
    outro: [line('ashi', '桂花糖点出路口，模具连起小路，圆邮票让地图终于能够出发。'), line('festival', '月饼被分成好多份，桌子却好像没有少一个位置。'), line('light', '远方的回信里，有人画了家门，有人画了一扇暂时住下的窗。每一张都很圆。')],
    choice: { title: '第一块月饼怎样送出？', lead: '桂桂把新烤好的月饼交给你，香气还绕着邮包。', options: [
      { id: 'far', title: '寄给远方的人', text: '让不能到场的想念也有味道。', reply: '几天后，邮包里回来一张画着陌生城市的地图。尽头是四个字：“我也很好。”' },
      { id: 'near', title: '分给身边的邻居', text: '和眼前的人，一起坐下来。', reply: '门一扇扇打开，最后谁也记不清月饼分了几块。只记得那晚的桌子，一直往外加。' },
    ] },
    puzzles: [
      { type: '地图推理', title: '月饼上的回家路线', scene: '地图标了三站：先经过桂树，再到小桥，最后到月台。桂树用花朵表示，小桥用弧线表示，月台用圆圈表示。', question: '哪个图案顺序能走到月台？', options: ['圆圈→花朵→弧线', '弧线→圆圈→花朵', '花朵→弧线→圆圈', '花朵→圆圈→弧线'], answer: 2, hints: ['先把每个地点换成对应的图案。', '桂树是花朵，小桥是弧线，月台是圆圈。'], explanation: '顺序是花朵、弧线、圆圈。阿拾把路线抄到包装纸上，这回吃掉月饼也不会迷路了。' },
      { type: '分享机关', title: '圆不会因为分享变少', scene: '一块圆月饼平均切成八份。阿拾送出三份，桂桂送出两份。', question: '盘子里还剩几份？', options: ['三份', '五份', '两份', '八份'], answer: 0, hints: ['先算一共送出了多少份。', '送出三份加两份，共五份；八减五。'], explanation: '还剩三份。桂桂给自己留下一份，另外两份放进邮包：分享，也包括好好照顾自己。' },
    ],
  }),
];

const FESTIVAL_BY_ID = new Map(FESTIVALS.map(festival => [festival.id, festival]));
const LUNAR_IDS = new Set(['spring', 'lantern', 'dragonboat', 'qixi', 'midautumn']);
const OUTFIT_IDS = new Set([...FESTIVAL_BY_ID.keys(), 'starlight']);
export const getFestival = id => FESTIVAL_BY_ID.get(id) || null;
export const getFestivalPuzzle = (id, sealIndex) => getFestival(id)?.puzzles.find(puzzle => puzzle.sealIndex === sealIndex) || null;

const HKO_MONTHS = HKO_MONTH_STARTS.map(([date, year, month, isLeapMonth]) => ({
  stamp: Date.parse(date + 'T00:00:00Z'), year, month, isLeapMonth,
}));
const asDate = value => {
  try {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  } catch { return null; }
};
const pad = value => String(value).padStart(2, '0');

function chineseCalendarDate(date, stamp) {
  // Official anchors also work on browsers without the Chinese Intl calendar.
  if (stamp >= HKO_MONTHS[0].stamp && stamp < HKO_MONTHS.at(-1).stamp) {
    let low = 0, high = HKO_MONTHS.length - 1;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (HKO_MONTHS[middle].stamp <= stamp) low = middle;
      else high = middle;
    }
    const month = HKO_MONTHS[low];
    return { year: month.year, month: month.month, day: (stamp - month.stamp) / DAY_MS + 1, isLeapMonth: month.isLeapMonth, source: 'hko' };
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-chinese-nu-latn', {
      timeZone: FESTIVAL_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric',
    });
    // An unsupported calendar may silently resolve to Gregorian. Never activate
    // a lunar holiday using that fallback or an unrecognised leap-month label.
    if (formatter.resolvedOptions().calendar !== 'chinese') return null;
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    const match = /^(\d{1,2})(bis)?$/.exec(parts.month || '');
    const year = Number(parts.relatedYear), day = Number(parts.day);
    if (!match || !Number.isInteger(year) || year < 1999 || year > 2200 || !Number.isInteger(day) || day < 1 || day > 30) return null;
    const month = Number(match[1]);
    if (month < 1 || month > 12) return null;
    return { year, month, day, isLeapMonth: Boolean(match[2]), source: 'intl' };
  } catch { return null; }
}

/** Civil date in Shanghai; lunar=null means lunar scheduling is unavailable. */
export function getCalendarDate(value = new Date()) {
  const date = asDate(value);
  if (!date) return null;
  let year, month, day;
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone: FESTIVAL_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(date).map(part => [part.type, part.value]));
    year = Number(parts.year); month = Number(parts.month); day = Number(parts.day);
  } catch {
    // UTC+8 keeps solar events usable if Intl itself is unavailable.
    const shifted = new Date(date.getTime() + 8 * 3600000);
    year = shifted.getUTCFullYear(); month = shifted.getUTCMonth() + 1; day = shifted.getUTCDate();
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2200 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) return null;
  const stamp = Date.UTC(year, month - 1, day);
  const lunar = chineseCalendarDate(date, stamp);
  return { dateKey: `${year}-${pad(month)}-${pad(day)}`, year, month, day, weekday: new Date(stamp).getUTCDay(), lunar, lunarAvailable: lunar !== null };
}

function festivalIsActive(id, calendar) {
  const { year, month, day, lunar } = calendar;
  const md = month * 100 + day;
  if (id === 'halloween') return md >= 1024 && md <= 1103;
  if (id === 'christmas') return md >= 1218 && md <= 1227;
  if (id === 'newyear') return md >= 1228 || md <= 104;
  if (id === 'valentine') return md >= 210 && md <= 217;
  if (id === 'thanksgiving') {
    const firstWeekday = new Date(Date.UTC(year, 10, 1)).getUTCDay();
    const fourthThursday = 1 + ((4 - firstWeekday + 7) % 7) + 21;
    const distance = (Date.UTC(year, month - 1, day) - Date.UTC(year, 10, fourthThursday)) / DAY_MS;
    return Math.abs(distance) <= 3;
  }
  if (!lunar || lunar.isLeapMonth) return false;
  if (id === 'spring') return (lunar.month === 12 && lunar.day >= 25) || (lunar.month === 1 && lunar.day <= 8);
  const windows = { lantern: [1, 10, 17], dragonboat: [5, 3, 7], qixi: [7, 5, 10], midautumn: [8, 12, 18] };
  const window = windows[id];
  return Boolean(window && lunar.month === window[0] && lunar.day >= window[1] && lunar.day <= window[2]);
}

/** Every overlapping event is returned, ordered by priority then stable ID. */
export function getActiveFestivals(date = new Date()) {
  const calendar = getCalendarDate(date);
  if (!calendar) return [];
  return FESTIVALS.filter(festival => festivalIsActive(festival.id, calendar))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

/** Dec/Jan New Year and lunar Dec/Jan Spring share the upcoming year's key. */
export function getFestivalOccurrenceKey(id, date = new Date()) {
  if (!getFestival(id)) return null;
  const calendar = getCalendarDate(date);
  if (!calendar || (LUNAR_IDS.has(id) && !calendar.lunar)) return null;
  let year = LUNAR_IDS.has(id) ? calendar.lunar.year : calendar.year;
  if (id === 'newyear' && calendar.month === 12) year++;
  if (id === 'spring' && calendar.lunar.month === 12) year++;
  return year <= 2200 ? `${id}:${year}` : null;
}

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bounded = (value, min, max, fallback = min) => Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback;
const emptyRecord = () => ({ completed: false, bestStars: 0, bestGifts: 0, bestTime: 0, bestDeaths: 0, runs: 0, choice: null, puzzles: {} });
const completedRecord = entry => plain(entry) && entry.completed === true && entry.bestGifts === 3 && Number.isFinite(entry.bestTime) && entry.bestTime >= 0 && Number.isFinite(entry.bestStars) && entry.bestStars >= 1;
const recordFestivalId = key => {
  if (typeof key !== 'string') return null;
  const match = /^([a-z]+):(20\d\d|21\d\d|2200)$/.exec(key);
  return match && FESTIVAL_BY_ID.has(match[1]) ? match[1] : null;
};
const validContainer = save => plain(save) && save.version === 1 && plain(save.records) && Array.isArray(save.outfits) && plain(save.settings);
const MAX_RECORDS = 300;
const MAX_SAVE_SIZE = 300000;

export function createFestivalSave() {
  return { version: 1, records: {}, outfits: [], settings: { selectedOutfit: 'auto' } };
}

/** Whitelist keys, limits and story choices; never merge untrusted save objects. */
export function validateFestivalSave(value) {
  const clean = createFestivalSave();
  if (!plain(value) || value.version !== 1) return clean;
  if (plain(value.records)) {
    const keys = Object.keys(value.records).filter(key => recordFestivalId(key))
      .sort((a, b) => Number(b.split(':')[1]) - Number(a.split(':')[1]) || a.localeCompare(b));
    // Keep one completed record per story even when trimming a very old archive.
    const keep = new Set();
    for (const festival of FESTIVALS) {
      const completed = keys.find(key => recordFestivalId(key) === festival.id && completedRecord(value.records[key]));
      if (completed) keep.add(completed);
    }
    for (const key of keys) { if (keep.size >= MAX_RECORDS) break; keep.add(key); }
    for (const key of keep) {
      const entry = value.records[key], festival = getFestival(recordFestivalId(key));
      if (!plain(entry)) continue;
      const record = emptyRecord();
      // A complete parcel must contain all three physical gifts. A damaged or
      // partial imported run cannot manufacture a permanent story collectible.
      record.completed = completedRecord(entry);
      if (record.completed) {
        record.bestStars = bounded(entry.bestStars, 1, 3);
        record.bestGifts = 3;
        record.bestTime = bounded(entry.bestTime, 1, 7200, 1);
        record.bestDeaths = bounded(entry.bestDeaths, 0, 999);
        record.runs = bounded(entry.runs, 1, 999999, 1);
        if (festival.choice.options.some(option => option.id === entry.choice)) record.choice = entry.choice;
      }
      if (plain(entry.puzzles)) for (const puzzle of festival.puzzles) {
        const solved = Object.hasOwn(entry.puzzles, puzzle.id) ? entry.puzzles[puzzle.id] : null;
        if (plain(solved) && solved.solved === true) record.puzzles[puzzle.id] = { solved: true, assisted: solved.assisted === true };
      }
      clean.records[key] = record;
    }
  }
  // Reward grants are a separate authorised route to outfits, never to keepsakes.
  if (Array.isArray(value.outfits)) clean.outfits = [...new Set(value.outfits.filter(id => OUTFIT_IDS.has(id)))];
  for (const [key, record] of Object.entries(clean.records)) {
    const id = recordFestivalId(key);
    if (record.completed && !clean.outfits.includes(id)) clean.outfits.push(id);
  }
  const selected = plain(value.settings) ? value.settings.selectedOutfit : 'auto';
  if (selected === 'auto' || (OUTFIT_IDS.has(selected) && clean.outfits.includes(selected))) clean.settings.selectedOutfit = selected;
  return clean;
}

export function loadFestivalSave(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const raw = target?.getItem(FESTIVAL_SAVE_KEY);
    if (!raw || typeof raw !== 'string' || raw.length > MAX_SAVE_SIZE) return createFestivalSave();
    return validateFestivalSave(JSON.parse(raw));
  } catch { return createFestivalSave(); }
}

export function persistFestivalSave(save, storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target) return false;
    const raw = JSON.stringify(validateFestivalSave(save));
    if (raw.length > MAX_SAVE_SIZE) return false;
    target.setItem(FESTIVAL_SAVE_KEY, raw);
    return true;
  } catch { return false; }
}

export function getFestivalRecord(save, id, date = new Date()) {
  const key = getFestivalOccurrenceKey(id, date);
  return key && plain(save?.records) && Object.hasOwn(save.records, key) && plain(save.records[key]) ? save.records[key] : null;
}

function ensureRecord(save, id, date) {
  if (!validContainer(save)) return null;
  const key = getFestivalOccurrenceKey(id, date);
  if (!key) return null;
  if (!Object.hasOwn(save.records, key)) save.records[key] = emptyRecord();
  return plain(save.records[key]) ? { key, record: save.records[key] } : null;
}

/** Permanent collection totals count each story once, across annual records. */
export function getFestivalStats(save) {
  const clean = validateFestivalSave(save);
  let completed = 0, gifts = 0, stars = 0, annualCompletions = 0, runs = 0;
  const items = [], solvedPuzzles = new Set();
  for (const festival of FESTIVALS) {
    const records = Object.entries(clean.records).filter(([key]) => recordFestivalId(key) === festival.id).map(([, record]) => record);
    const finished = records.filter(record => record.completed);
    for (const record of records) for (const id of Object.keys(record.puzzles)) solvedPuzzles.add(id);
    if (finished.length) {
      completed++; gifts += Math.max(...finished.map(record => record.bestGifts)); stars += Math.max(...finished.map(record => record.bestStars));
      items.push({ ...festival.item, festivalId: festival.id });
    }
    annualCompletions += finished.length;
    runs += finished.reduce((sum, record) => sum + record.runs, 0);
  }
  return { completed, gifts, stars, items, outfits: [...clean.outfits], itemCount: items.length, outfitCount: clean.outfits.length, riddles: solvedPuzzles.size, annualCompletions, runs };
}

/** Called by the engine's gated exit: three gifts and two lit puzzle lamps. */
export function recordFestivalComplete(save, id, result, date = new Date()) {
  const rejected = { ok: false, firstCompletion: false, newItem: null, newOutfit: null };
  if (!validContainer(save) || !getFestival(id) || !plain(result)) return rejected;
  const gifts = result.gifts ?? result.memories;
  if (gifts !== 3 || !Number.isFinite(result.time) || result.time < 0 || !Number.isInteger(result.deaths) || result.deaths < 0 || !Number.isInteger(result.stars) || result.stars < 1 || result.stars > 3) return rejected;
  if (result.seals !== undefined && (!Number.isInteger(result.seals) || result.seals < 2)) return rejected;
  const before = getFestivalStats(save);
  const entry = ensureRecord(save, id, date);
  if (!entry) return rejected;
  const { key, record } = entry;
  const firstCompletion = record.completed !== true;
  const time = bounded(result.time, 1, 7200, 1), deaths = bounded(result.deaths, 0, 999);
  record.bestTime = firstCompletion ? time : Math.min(record.bestTime, time);
  record.bestDeaths = firstCompletion ? deaths : Math.min(record.bestDeaths, deaths);
  record.bestStars = Math.max(record.bestStars || 0, result.stars);
  record.bestGifts = 3;
  record.runs = bounded((record.runs || 0) + 1, 1, 999999, 1);
  record.completed = true;
  const newItem = before.items.some(item => item.festivalId === id) ? null : { ...getFestival(id).item, festivalId: id };
  const newOutfit = before.outfits.includes(id) ? null : id;
  unlockFestivalOutfit(save, id);
  return { ok: true, firstCompletion, newItem, newOutfit, key, record };
}

export function recordFestivalChoice(save, id, choiceId, date = new Date()) {
  const festival = getFestival(id), record = getFestivalRecord(save, id, date);
  if (!festival || !completedRecord(record) || !festival.choice.options.some(option => option.id === choiceId)) return false;
  record.choice = choiceId;
  return true;
}

export function recordFestivalPuzzle(save, id, puzzleId, assisted = false, date = new Date()) {
  const festival = getFestival(id);
  if (!festival || !festival.puzzles.some(puzzle => puzzle.id === puzzleId) || typeof assisted !== 'boolean') return false;
  const entry = ensureRecord(save, id, date);
  if (!entry) return false;
  if (!plain(entry.record.puzzles)) entry.record.puzzles = {};
  const previous = entry.record.puzzles[puzzleId];
  // Once solved independently, a later assisted replay cannot erase that credit.
  entry.record.puzzles[puzzleId] = { solved: true, assisted: previous?.solved ? previous.assisted === true && assisted : assisted };
  return true;
}

export function isFestivalOutfitUnlocked(save, id) {
  if (!OUTFIT_IDS.has(id)) return false;
  if (Array.isArray(save?.outfits) && save.outfits.includes(id)) return true;
  return plain(save?.records) && Object.entries(save.records).some(([key, record]) => recordFestivalId(key) === id && completedRecord(record));
}

/** Grant only after a legitimate story completion or playtime reward claim. */
export function unlockFestivalOutfit(save, id) {
  if (!validContainer(save) || !OUTFIT_IDS.has(id)) return false;
  if (save.outfits.includes(id)) return false;
  save.outfits.push(id);
  return true;
}

export function equipFestivalOutfit(save, idOrAuto) {
  if (!validContainer(save) || (idOrAuto !== 'auto' && !isFestivalOutfitUnlocked(save, idOrAuto))) return false;
  save.settings.selectedOutfit = idOrAuto;
  return true;
}
