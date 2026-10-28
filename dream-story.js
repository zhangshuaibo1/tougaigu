export const DREAM_SAVE_KEY = 'tougaigu.dream.v1';
export const DREAM_TITLE = '掀起你的头盖骨';

export const CAST = {
  ashi: { name: '阿拾', role: '黎明邮局 · 第 拾 号邮差', portrait: './assets/portrait-hero.svg', color: '#ffbd7a' },
  light: { name: '拾光', role: '住在头盖骨里的小小回声', portrait: './assets/portrait-soul.svg', color: '#a9ead6' },
  moth: { name: '绒绒', role: '苔灯站台 · 夜班检票员', portrait: './assets/portrait-moth.svg', color: '#cfb7ef' },
  keeper: { name: '归先生', role: '黎明邮局 · 守钟人', portrait: './assets/portrait-keeper.svg', color: '#9ac4e3' },
  whale: { name: '蓝页', role: '鲸落图书馆 · 记忆保管员', portrait: './assets/portrait-whale.svg', color: '#9fd8e1' },
};

export const CHAPTERS = [
  {
    id: 'platform', title: '苔灯站台', subtitle: '给明天的一封信', stamp: '第一声汽笛', color: '#b8d8b3', icon: 'station',
    summary: '没有列车进站的夜里，一封信找到了没有心跳的邮差。',
    hint: '掀开头盖骨，让拾光穿过帘幕；点亮两盏回声灯，再让阿拾走向出口。',
    intro: [
      { speaker: 'moth', text: '阿拾！有你的信。奇怪，寄件人也是阿拾，邮戳却盖着“明天”。' },
      { speaker: 'ashi', text: '这座镇子三百年没天亮了。我的记性，已经好到能忘记自己忘过什么。' },
      { speaker: 'light', text: '先把头顶打开一点吧。我在里面听见了灯的声音。放心，我不会把你的脑洞弄丢。' },
    ],
    outro: [
      { speaker: 'moth', text: '灯亮了！我终于看清站牌。上面不是“终点”，是“请在这里等一个人”。' },
      { speaker: 'ashi', text: '信里只有一句话：“如果你又忘了回家的路，就把没送出的信，一封封送到。”' },
      { speaker: 'light', text: '信封上有六枚邮戳。第一枚，刚刚亮了。我们走吧，明天在等回信。' },
    ],
    letterTitle: '没有发车的车票',
    memories: [
      '站台木椅下面，藏着两张车票。去程那张被反复攥过，回程那张干干净净。',
      '票背写着：“我不怕你走远，只怕你以为，远了就不能回来。”',
      '绒绒把夜班做成了一生。她等的不是某一班车，而是有人愿意再出发。',
    ],
  },
  {
    id: 'greenhouse', title: '倒流温室', subtitle: '让没有开过的花开一次', stamp: '一朵迟开的花', color: '#9ce2c1', icon: 'flower',
    summary: '这里的雨从花盆飞回云里，花朵却始终不肯告别种子。',
    hint: '试试发亮的弹跳蘑菇。阿拾留在原处时，拾光能抵达身体够不到的地方。',
    intro: [
      { speaker: 'ashi', text: '雨为什么往上落？我第一次觉得，撑伞也需要想象力。' },
      { speaker: 'light', text: '温室的主人每天都把花变回种子。她说，只要还没开花，就不用看见花谢。' },
      { speaker: 'keeper', text: '并非所有停下的人都懦弱，小邮差。有些人，只是还没准备好说再见。' },
    ],
    outro: [
      { speaker: 'ashi', text: '这封信是一个孩子写给妈妈的：“明天我就回来，陪你看第一朵花。”' },
      { speaker: 'light', text: '信没寄出去，种子就一直等。可我们也不知道，寄出它之后，他能不能回来。' },
      { speaker: 'keeper', text: '你可以把信交给风，也可以先留下它。送信的人，不能替收信的人决定忘记。' },
    ],
    choice: 'letter', letterTitle: '温室里的小纸条',
    memories: [
      '花盆标签上写着“明天开花”。后来“明天”被划掉，改成了“一起”。',
      '一双小靴子的边上长满了苔。靴子主人把所有雨水都留给了最后一粒种子。',
      '温室主人在日记末尾补了一句：“如果等不到一起，那就让我先替你看看。”',
    ],
  },
  {
    id: 'theater', title: '借月剧场', subtitle: '最后一排还有观众', stamp: '谢幕之前', color: '#d5b1ec', icon: 'moon',
    summary: '演员借走月亮做追光，舞台却困在没有掌声的谢幕里。',
    hint: '留意身体与灵魂能触及的不同机关。让阿拾站稳，再派拾光去借一束月光。',
    intro: [
      { speaker: 'moth', text: '今晚首演！也是昨晚、前晚，以及上一千个晚上的首演。票很便宜，勇气自备。' },
      { speaker: 'ashi', text: '台词写着：“我想回家。”演员却说不出口。因为他的家，正坐在最后一排。' },
      { speaker: 'light', text: '有的门用钥匙开。有的门，要先让一个人被看见。我们把追光送过去。' },
    ],
    outro: [
      { speaker: 'moth', text: '他终于说出来了。最后一排没有鼓掌，那个人只是站起来，说：“我听见了。”' },
      { speaker: 'ashi', text: '我的头里也闪过一个舞台。有人替我缝围巾，抱怨我总把自己冻得骨头响。' },
      { speaker: 'light', text: '阿拾，你看。围巾内侧有名字。不是寄件人，是等你回家的人。' },
    ],
    letterTitle: '不需要完美的谢幕',
    memories: [
      '剧本第十三页反复涂改。演员划掉“我一直很勇敢”，写下“其实我很害怕”。',
      '一张过期票根上，有人认真写着：“演砸了也没关系，我还是会来。”',
      '舞台的月亮终于被归还夜空。演员第一次，没有在谢幕之后独自留下。',
    ],
  },
  {
    id: 'library', title: '鲸落图书馆', subtitle: '记忆不是一座牢房', stamp: '鲸的回信', color: '#9dcee4', icon: 'whale',
    summary: '一头鲸替小镇保管着过去。它背得太久，已经忘了自己会游。',
    hint: '在漂浮书页之间寻找落脚点。回声灯藏在书架后面，拾光的路线会更自由。',
    intro: [
      { speaker: 'whale', text: '嘘。这里的书，睡着的时候会梦见读者。请不要随便叫醒别人的昨天。' },
      { speaker: 'ashi', text: '我想找一封寄给明天的信。还有……一个会给骷髅织围巾的人。' },
      { speaker: 'whale', text: '你不是第一次来，阿拾。上一次，你求我把那个人的名字藏起来，因为你怕一想起，就走不动。' },
    ],
    outro: [
      { speaker: 'whale', text: '这里还有守钟人的记忆。归先生不是偷走黎明的人。他只是在女儿离开的那天，拧停了钟。' },
      { speaker: 'ashi', text: '后来，全镇的人都把不愿面对的明天，交给他保管。一个人的舍不得，变成了所有人的长夜。' },
      { speaker: 'light', text: '要把这段记忆留在书页里，还是还给钟声？记得，并不意味着必须一直站在原地。' },
    ],
    choice: 'clock', letterTitle: '鲸腹中的借阅卡',
    memories: [
      '借阅卡上有阿拾的笔迹：“借走一个不疼的晚上。归还日期，等我准备好。”',
      '鲸曾把每一滴眼泪都当作海。后来它才懂，海也需要流动，才不会变成玻璃。',
      '最后一页没有催还章，只有一行蓝字：“你可以带着记忆走。它没有那么重了。”',
    ],
  },
  {
    id: 'coast', title: '钟摆海岸', subtitle: '走过一秒钟的距离', stamp: '向前一秒', color: '#e4ba98', icon: 'clock',
    summary: '潮水被一秒钟困住，归先生站在海岸，守着世界最慢的告别。',
    hint: '观察风和钟摆的节奏。拾光的脉冲能让危险短暂停顿，给阿拾留出路。',
    intro: [
      { speaker: 'keeper', text: '你送出的每一封信，都让钟走快一点。你真的知道天亮之后，会失去什么吗？' },
      { speaker: 'ashi', text: '我不知道。但我找回了她的名字。她叫小满。她教我，帽子太紧的时候，可以把头顶掀开。' },
      { speaker: 'keeper', text: '我的女儿也叫小满。她最后写给镇子的信，一直由你保管。后来，你连自己是她的邮差也忘了。' },
    ],
    outro: [
      { speaker: 'keeper', text: '我以为停住时间，就能一直听见她上楼的脚步。可这些年，楼梯一次也没有响。' },
      { speaker: 'ashi', text: '她没有回来。但她给我们的信，也从来没有到达。归先生，让我把最后一段路走完。' },
      { speaker: 'light', text: '风停了一瞬。不是永远，只是一瞬。已经足够一个人，迈出一步。' },
    ],
    letterTitle: '停在一秒前的潮汐',
    memories: [
      '海边的钟没有分针。归先生说，等待的人，最先丢掉的就是对分钟的耐心。',
      '钟摆背面刻着小满小时候的身高。每一年，她都把自己画得比实际高一点点。',
      '旧木板留着两行脚印。一行走向海，一行在原地。今天，第二行终于多了一步。',
    ],
  },
  {
    id: 'postoffice', title: '黎明邮局', subtitle: '收件人：明天', stamp: '终于寄出的明天', color: '#f6ca88', icon: 'sun',
    summary: '最后一封信不需要地址。它写给所有还愿意继续生活的人。',
    hint: '把一路学会的办法用在最后一站。两盏灯都亮起后，让身体和拾光一起回到邮局。',
    intro: [
      { speaker: 'ashi', text: '原来那封寄给自己的信，是我怕忘记，提前写下的路标。走了这么远，我终于记起自己为什么出发。' },
      { speaker: 'light', text: '我不是另一个灵魂。小满把一小片勇气留在你的头顶，你给它起名叫拾光。' },
      { speaker: 'keeper', text: '邮局的灯还差最后两盏。去吧，阿拾。这一次，我替你把门留着。' },
    ],
    outro: [
      { speaker: 'ashi', text: '“爸爸，阿拾，还有镇上的每个人：如果我没能赶回来，也请替我过一个很好的明天。”' },
      { speaker: 'light', text: '“不是每封信都有回音。但写信的时候，我们已经把自己，轻轻交给了另一个人。”' },
      { speaker: 'keeper', text: '我收到了。小满，我收到了。' },
    ],
    letterTitle: '小满写给所有人的信',
    memories: [
      '“阿拾，要是你又把头盖骨扣得太紧，记得掀开。世界很大，别把星星闷在里面。”',
      '“爸爸，别再替整个镇子守夜。你还欠我一次日出，可以先替我去看。”',
      '“至于明天，不需要伟大。热一点的茶，慢一点的散步，偶尔想起我。这样就很好。”',
    ],
  },
];

export const STORY_CHOICES = {
  letter: {
    chapterIndex: 1, title: '这封信，交给谁？', lead: '温室的种子已经醒了。阿拾替那封迟到的信，轻轻抚平折角。',
    options: [
      { id: 'send', title: '让风把它送出去', text: '允许一个尚未确定的明天发生。', reply: '阿拾把信放进风里。温室的第一朵花，开得很小，却朝着天亮的方向。' },
      { id: 'keep', title: '先替她好好保管', text: '给等待的人，再留一点准备的时间。', reply: '阿拾把信收进邮包。种子没有被催促，只在土里，悄悄舒展了一下。' },
    ],
  },
  clock: {
    chapterIndex: 3, title: '记忆，应该留在哪里？', lead: '归先生的昨天，在蓝页的书架上泛着微光。它不是错误，也不是必须背一生的债。',
    options: [
      { id: 'release', title: '把它还给钟声', text: '带着记忆向前，而不是把昨天关起来。', reply: '蓝页翻开书。一个名字变成钟声，轻轻落在了海面上。' },
      { id: 'hold', title: '留下一页安静的地方', text: '让想念随时有地方回来。', reply: '阿拾在空白页上画了一盏灯。从此，归先生不必靠停住时间，才能找到昨天。' },
    ],
  },
};

export const ENDINGS = {
  dawn: { id: 'dawn', eyebrow: 'ENDING 01 · 一起向前', title: '天亮了。你也还在。', color: '#f7cc8c', text: ['第一班列车停在苔灯站台。温室的花没有永远盛开，但第二朵已经有了名字。归先生走下楼梯，第一次觉得脚步声可以属于自己。', '阿拾把头盖骨轻轻扣好。拾光没有消失，只是缩成一粒小星星：需要勇气的时候，它还会亮。', '小镇没有忘记小满。它只是终于学会，一边想念，一边把明天过好。'], lastLine: '下一封信，寄给正在继续生活的你。' },
  tender: { id: 'tender', eyebrow: 'ENDING 02 · 慢慢天亮', title: '不用一下子，走出长夜。', color: '#cfb5ec', text: ['黎明没有突然照亮整个镇子。它先落在一扇窗、一张长椅和一杯还温着的茶上。有人选择出发，有人愿意再等一会儿。', '阿拾每天送一封信。归先生每天让钟多走一秒。他们发现，往前走并不需要很大的步子。', '没有被寄出的信，也被郑重地保管着。总有一天，它会遇到准备好的收件人。'], lastLine: '你可以慢一点。灯会替你留着。' },
  lanterns: { id: 'lanterns', eyebrow: 'ENDING 03 · 长夜有灯', title: '这一夜，不再只有你。', color: '#a9dfd4', text: ['太阳暂时还没升起来。可是温室、剧场和图书馆的灯，一盏接一盏亮了。长夜第一次有了吃晚饭、讲故事和互相敲门的声音。', '归先生仍然想念女儿，但他不再独自守钟。阿拾给每一个愿意等的人送去灯，也给想出发的人留下车票。', '天亮可以晚一点到。愿意陪伴彼此的人，已经让明天有了开始的地方。'], lastLine: '世界还暗着。幸好，我们亮着。' },
};

export const STAMPS = [
  { id: 'first', title: '第一封回信', text: '完成苔灯站台', icon: 'letter' },
  { id: 'gentle', title: '骨头很稳', text: '任意一章零次跌落完成', icon: 'star' },
  { id: 'pages', title: '拾光收藏家', text: '收集至少 9 片记忆', icon: 'spark' },
  { id: 'constellation', title: '半空的星图', text: '获得至少 12 颗章节星星', icon: 'moon' },
  { id: 'letters', title: '没有遗失的信', text: '收齐 18 片记忆', icon: 'letter' },
  { id: 'tomorrow', title: '明天的邮差', text: '完成最后一章', icon: 'sun' },
];

export const STORY_ITEMS = [
  { title: '风铃钥匙', icon: 'key', color: '#b8d8b3', text: '不负责开锁，负责提醒你：站台还有人等你回来。', chapterIndex: 0 },
  { title: '青芽瓶', icon: 'flower', color: '#9ce2c1', text: '一粒终于愿意发芽的种子。小小的明天，也值得随身带着。', chapterIndex: 1 },
  { title: '借月镜', icon: 'moon', color: '#d5b1ec', text: '演员留下的化妆镜。照见的不是完美，而是愿意登台的自己。', chapterIndex: 2 },
  { title: '留白书签', icon: 'letter', color: '#9dcee4', text: '蓝页送来的空白页。过去可以被珍藏，未来仍然可以续写。', chapterIndex: 3 },
  { title: '停摆怀表', icon: 'clock', color: '#e4ba98', text: '归先生重新上好的旧表。它走得不快，但确实在向前。', chapterIndex: 4 },
  { title: '黎明邮票', icon: 'sun', color: '#f6ca88', text: '最后一枚邮票上没有面额，只有小满画的一轮小太阳。', chapterIndex: 5 },
];

export const PUZZLES = [
  {
    id: 'platform-0', chapterIndex: 0, sealIndex: 0, type: '原创灯谜', title: '站台的第一盏灯', speaker: 'moth',
    scene: '绒绒把一枚邮戳按在灯罩上：“灯认得回信，可它把装信的东西忘了。帮它想起来？”',
    question: '小小一间房，没有门和窗。装下心里话，跟风去远方。猜一件物品。',
    options: ['信封', '行李箱', '鸟笼'], answer: 0,
    hints: ['它常常是一张纸折出来的，能放进口袋。', '写好信以后，要把信纸装进它里面。'],
    explanation: '谜底是“信封”。信封把想说的话妥帖装好，也把远方变成一个可以抵达的地址。风铃钥匙上的第一个音，回来了。',
  },
  {
    id: 'platform-1', chapterIndex: 0, sealIndex: 1, type: '歇后语', title: '各有各的过海办法', speaker: 'moth',
    scene: '站台旧画上，八位旅客正用不同的法宝过海。绒绒笑了：“身体和拾光，也该各用各的本事。”',
    question: '八仙过海——？',
    options: ['一场空', '各显神通', '节节高'], answer: 1,
    hints: ['画中每一位都用自己的法宝，没有统一的渡船。', '这句歇后语形容：每个人拿出各自的本领。'],
    explanation: '“八仙过海——各显神通”。阿拾负责站稳、跳跃，拾光负责飞行、穿过回声帘幕。解开机关，也需要各自发挥所长。',
  },
  {
    id: 'greenhouse-0', chapterIndex: 1, sealIndex: 0, type: '诗词 · 贺知章《咏柳》', title: '给春风一把工具', speaker: 'light',
    scene: '温室的柳枝卡在玻璃里。灯罩上浮出半句诗：“不知细叶谁裁出……”后面的字，被倒流的雨水洗淡了。',
    question: '诗中把二月的春风，比作什么？',
    options: ['一架织布机', '一盏灯笼', '一把剪刀'], answer: 2,
    hints: ['注意“裁出”和“似”这两个词。', '这件工具有两片刀刃，合在一起能裁剪东西。'],
    explanation: '“不知细叶谁裁出，二月春风似剪刀。”出自贺知章《咏柳》。答案是“一把剪刀”。诗人把春风想象成巧手，裁出细细的柳叶。温室的春天，终于有了形状。',
  },
  {
    id: 'greenhouse-1', chapterIndex: 1, sealIndex: 1, type: '歇后语', title: '一节一节长大的明天', speaker: 'light',
    scene: '一株芝麻把花开在不同高度的枝节上。拾光想给它一句祝福，帮它够到窗外。',
    question: '芝麻开花——？',
    options: ['节节高', '一场空', '各显神通'], answer: 0,
    hints: ['芝麻的花会随着茎秆生长，逐渐向上开放。', '这句歇后语常被用来祝愿日子或进步越来越好。'],
    explanation: '“芝麻开花——节节高”。向前不一定需要很大的跨越，也可以像一株植物，一节一节地长高。',
  },
  {
    id: 'theater-0', chapterIndex: 2, sealIndex: 0, type: '诗词 · 李白《静夜思》', title: '演员说不出口的下一句', speaker: 'moth',
    scene: '舞台上的月亮照向最后一排。演员念到“举头望明月”，却忘了那句想说给家人听的话。',
    question: '“举头望明月”的下一句是什么？',
    options: ['闭目听风响', '低头思故乡', '转身看烛光'], answer: 1,
    hints: ['这首诗把月光和游子的思乡连在了一起。', '与“举头”相对的是“低头”；他想起的是家乡。'],
    explanation: '“举头望明月，低头思故乡。”出自李白《静夜思》。月光照在远方，也照在故乡；演员终于把想念说出了口。',
  },
  {
    id: 'theater-1', chapterIndex: 2, sealIndex: 1, type: '原创灯谜', title: '借来的追光', speaker: 'moth',
    scene: '剧场管理员拿来三样道具。只有找回真正的“借光者”，舞台上的追光才会归位。',
    question: '我不自己点灯，却把夜空照亮；有时像弯弯小船，有时像圆圆银盘。我是谁？',
    options: ['路灯', '影子', '月亮'], answer: 2,
    hints: ['它的形状看上去会在一个月里变化。', '它反射太阳的光，常被写进思乡的诗里。'],
    explanation: '谜底是“月亮”。月亮反射太阳的光，才有我们看见的明亮。剧场借来的月光，现在也愿意照一照最后一排。',
  },
  {
    id: 'library-0', chapterIndex: 3, sealIndex: 0, type: '诗词 · 王之涣《登鹳雀楼》', title: '再高一层的视野', speaker: 'whale',
    scene: '蓝页把一册书放上漂浮书架：“不是为了站得比谁高，是为了看见原先看不见的路。”',
    question: '“欲穷千里目”的下一句是什么？',
    options: ['更上一层楼', '且听一夜风', '再翻千页书'], answer: 0,
    hints: ['想把更远的景色看在眼里，可以换一个更高的观察位置。', '这首诗的场景是一座楼。答案里有“上一层”。'],
    explanation: '“欲穷千里目，更上一层楼。”出自王之涣《登鹳雀楼》。换一个位置看世界，有时也能换一个办法面对记忆。',
  },
  {
    id: 'library-1', chapterIndex: 3, sealIndex: 1, type: '故事推理', title: '给昨天留一个位置', speaker: 'whale',
    scene: '蓝页需要一件东西：既不把书锁起来，也不把书页撕掉，却能让读者下次找到停下的地方。',
    question: '阿拾应该把哪件物品放到书里？',
    options: ['一把锁', '一枚书签', '一根蜡烛'], answer: 1,
    hints: ['这件物品通常很薄，不会妨碍合上书。', '它帮你标记读到哪一页，想继续时再回来。'],
    explanation: '答案是“书签”。珍藏昨天不必封住明天。蓝页把留白书签交给阿拾：过去有位置，新的故事也有。',
  },
  {
    id: 'coast-0', chapterIndex: 4, sealIndex: 0, type: '歇后语', title: '留不住的潮水', speaker: 'keeper',
    scene: '归先生试着用一只竹篮留住退去的潮水。每一滴都从缝隙流走，灯却在等待他说出原因。',
    question: '竹篮打水——？',
    options: ['节节高', '各显神通', '一场空'], answer: 2,
    hints: ['竹篮的编织缝隙会漏水。', '忙了一阵，却没有把水留住。这句歇后语形容白费力气。'],
    explanation: '“竹篮打水——一场空”。归先生发现，留住每一秒并不能留住一个人；但那些一起度过的日子，并没有因此消失。',
  },
  {
    id: 'coast-1', chapterIndex: 4, sealIndex: 1, type: '原创灯谜', title: '世界最轻的脚步', speaker: 'keeper',
    scene: '旧怀表终于开始走动。它每向前一点，海边就多响起一次很轻的脚步声。',
    question: '看不见，也摸不着；人人都拥有，却谁也留不牢。走过昨天，还要走向明朝。猜一个词。',
    options: ['时间', '沙滩', '邮票'], answer: 0,
    hints: ['钟表记录的是它的流逝。', '过去、现在、未来，都是我们谈论它时会用到的词。'],
    explanation: '谜底是“时间”。时间不能倒流，但人可以带着想念向前。怀表走过的一秒，给海岸留出了一条新的路。',
  },
  {
    id: 'postoffice-0', chapterIndex: 5, sealIndex: 0, type: '故事推理', title: '最后一封信的收件人', speaker: 'ashi',
    scene: '小满在信封上写着：“如果我没能赶回来，也请替我过一个很好的明天。”下面没有一户人家的地址。',
    question: '这封信，应该送给谁？',
    options: ['只送给守钟人', '所有愿意继续生活的人', '只送给过去的自己'], answer: 1,
    hints: ['信封的背面，画着站台、花、舞台、鲸、海岸和邮局。', '小满想把勇气留给整座小镇，而不只是一位收件人。'],
    explanation: '答案是“所有愿意继续生活的人”。这封信沿路抵达每一盏灯，也在阿拾走过的每一段路上，被一遍遍读懂。',
  },
  {
    id: 'postoffice-1', chapterIndex: 5, sealIndex: 1, type: '原创字谜', title: '为新的日子盖章', speaker: 'light',
    scene: '最后一枚邮票还空着一个字。拾光把一路借来的月亮，与小满画下的太阳，放在了一起。',
    question: '日与月，肩并肩；合成一字，照亮前面。猜一个汉字。',
    options: ['林', '休', '明'], answer: 2,
    hints: ['把谜面里的两个偏旁，按左右结构放在一起。', '左边是“日”，右边是“月”。它也在“明天”这个词里。'],
    explanation: '谜底是“明”。日与月组成“明”，昨天的月光和明天的太阳，终于在一封信上相逢。',
  },
];

export function getPuzzle(chapterIndex, sealIndex) {
  return PUZZLES.find(puzzle => puzzle.chapterIndex === chapterIndex && puzzle.sealIndex === sealIndex) || null;
}

export function checkPuzzleAnswer(puzzleId, answer) {
  const puzzle = PUZZLES.find(item => item.id === puzzleId);
  return Boolean(puzzle && Number.isInteger(answer) && answer === puzzle.answer);
}

export function recordPuzzleSolve(save, puzzleId, assisted = false) {
  const puzzle = PUZZLES.find(item => item.id === puzzleId);
  if (!puzzle || puzzle.chapterIndex > getUnlockedChapter(save)) return false;
  const previous = save.riddles[puzzleId];
  save.riddles[puzzleId] = { solved: true, assisted: previous?.solved ? previous.assisted && assisted === true : assisted === true };
  return true;
}

const int = (value, low, high, fallback = low) => Number.isFinite(Number(value)) ? Math.min(high, Math.max(low, Math.floor(Number(value)))) : fallback;
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const emptyChapter = () => ({ completed: false, bestStars: 0, bestMemories: 0, bestTime: 0, bestDeaths: 0, runs: 0 });

export function createDreamSave() {
  return { version: 1, chapters: CHAPTERS.map(emptyChapter), choices: { letter: null, clock: null }, lastChapter: 0, settings: { sound: true, reducedMotion: false }, discoveredEndings: [], riddles: {} };
}

export function validateDreamSave(value) {
  const clean = createDreamSave();
  if (!plain(value) || value.version !== 1) return clean;
  if (Array.isArray(value.chapters)) value.chapters.slice(0, 6).forEach((chapter, index) => {
    if (!plain(chapter)) return;
    const completed = chapter.completed === true;
    clean.chapters[index] = {
      completed,
      bestStars: completed ? int(chapter.bestStars, 1, 3, 1) : 0,
      bestMemories: completed ? int(chapter.bestMemories, 0, 3) : 0,
      bestTime: completed ? int(chapter.bestTime, 1, 7200, 1) : 0,
      bestDeaths: completed ? int(chapter.bestDeaths, 0, 999) : 0,
      runs: completed ? int(chapter.runs, 1, 999999, 1) : 0,
    };
  });
  // A corrupted future chapter must not unlock a route through unsolved chapters.
  for (let i = 1; i < 6; i++) if (!clean.chapters[i - 1].completed) clean.chapters[i] = emptyChapter();
  if (plain(value.choices)) for (const key of Object.keys(STORY_CHOICES)) {
    const spec = STORY_CHOICES[key];
    if (clean.chapters[spec.chapterIndex].completed && spec.options.some(option => option.id === value.choices[key])) clean.choices[key] = value.choices[key];
  }
  clean.lastChapter = int(value.lastChapter, 0, getUnlockedChapter(clean));
  if (plain(value.settings)) {
    clean.settings.sound = typeof value.settings.sound === 'boolean' ? value.settings.sound : true;
    clean.settings.reducedMotion = value.settings.reducedMotion === true;
  }
  if (clean.chapters[5].completed && Array.isArray(value.discoveredEndings)) clean.discoveredEndings = [...new Set(value.discoveredEndings.filter(id => Object.hasOwn(ENDINGS, id)))];
  if (plain(value.riddles)) for (const puzzle of PUZZLES) {
    const entry = value.riddles[puzzle.id];
    if (puzzle.chapterIndex <= getUnlockedChapter(clean) && plain(entry) && entry.solved === true) clean.riddles[puzzle.id] = { solved: true, assisted: entry.assisted === true };
  }
  return clean;
}

export function loadDreamSave(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const raw = target?.getItem(DREAM_SAVE_KEY);
    if (!raw || raw.length > 32000) return createDreamSave();
    return validateDreamSave(JSON.parse(raw));
  } catch { return createDreamSave(); }
}

export function persistDreamSave(save, storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target) return false;
    target.setItem(DREAM_SAVE_KEY, JSON.stringify(validateDreamSave(save)));
    return true;
  } catch { return false; }
}

export function getUnlockedChapter(save) {
  const first = save.chapters.findIndex(chapter => !chapter.completed);
  return first === -1 ? 5 : first;
}

export function getJourneyStats(save) {
  const completed = save.chapters.filter(chapter => chapter.completed).length;
  const memories = save.chapters.reduce((sum, chapter) => sum + chapter.bestMemories, 0);
  const stars = save.chapters.reduce((sum, chapter) => sum + chapter.bestStars, 0);
  return { completed, memories, stars, endings: save.discoveredEndings.length, riddles: Object.keys(save.riddles).length };
}

export function earnedStampIds(save) {
  const stats = getJourneyStats(save);
  return STAMPS.filter(stamp => ({
    first: save.chapters[0].completed,
    gentle: save.chapters.some(chapter => chapter.completed && chapter.bestDeaths === 0),
    pages: stats.memories >= 9,
    constellation: stats.stars >= 12,
    letters: stats.memories === 18,
    tomorrow: save.chapters[5].completed,
  })[stamp.id]).map(stamp => stamp.id);
}

export function completeDreamChapter(save, result) {
  const index = result?.chapterIndex;
  if (!Number.isInteger(index) || index < 0 || index >= 6 || index > getUnlockedChapter(save)) return { ok: false, newStamps: [] };
  if (!Number.isFinite(result.time) || result.time < 0 || !Number.isFinite(result.memories) || !Number.isFinite(result.deaths)) return { ok: false, newStamps: [] };
  const before = new Set(earnedStampIds(save));
  const chapter = save.chapters[index];
  const time = int(result.time, 1, 7200, 1);
  const deaths = int(result.deaths, 0, 999);
  const stars = int(result.stars, 1, 3, 1);
  chapter.bestTime = chapter.completed ? Math.min(chapter.bestTime, time) : time;
  chapter.bestDeaths = chapter.completed ? Math.min(chapter.bestDeaths, deaths) : deaths;
  chapter.bestStars = Math.max(chapter.bestStars, stars);
  chapter.bestMemories = Math.max(chapter.bestMemories, int(result.memories, 0, 3));
  chapter.completed = true;
  chapter.runs = Math.min(999999, chapter.runs + 1);
  save.lastChapter = Math.min(5, index + 1);
  return { ok: true, newStamps: earnedStampIds(save).filter(id => !before.has(id)) };
}

export function chooseStoryReply(save, key, id) {
  if (!Object.hasOwn(STORY_CHOICES, key)) return false;
  const choice = STORY_CHOICES[key];
  if (!save.chapters[choice.chapterIndex].completed || !choice.options.some(option => option.id === id)) return false;
  save.choices[key] = id;
  return true;
}

export function getEnding(save) {
  if (!save.chapters[5].completed || !save.choices.letter || !save.choices.clock) return null;
  if (save.choices.letter === 'send' && save.choices.clock === 'release') return ENDINGS.dawn;
  if (save.choices.letter === 'keep' && save.choices.clock === 'hold') return ENDINGS.lanterns;
  return ENDINGS.tender;
}

export function rememberEnding(save) {
  const ending = getEnding(save);
  if (ending && !save.discoveredEndings.includes(ending.id)) save.discoveredEndings.push(ending.id);
  return ending;
}

export function nextPendingChoice(save) {
  return Object.keys(STORY_CHOICES).find(key => save.chapters[STORY_CHOICES[key].chapterIndex].completed && !save.choices[key]) || null;
}
