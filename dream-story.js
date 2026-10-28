export const DREAM_SAVE_KEY = 'tougaigu.dream.v1';
export const DREAM_TITLE = '掀起你的头盖骨';

export const CAST = {
  ashi: { name: '阿拾', role: '黎明邮差 · 头顶有座小剧场', portrait: './assets/portrait-hero.svg', color: '#ffbd7a' },
  light: { name: '拾光', role: '住在脑洞里的勇气 · 兼任追光', portrait: './assets/portrait-soul.svg', color: '#a9ead6' },
  moth: { name: '绒绒', role: '夜班检票员 · 月光剧场兼职', portrait: './assets/portrait-moth.svg', color: '#cfb7ef' },
  keeper: { name: '归先生', role: '黎明邮局 · 守钟人', portrait: './assets/portrait-keeper.svg', color: '#9ac4e3' },
  whale: { name: '蓝页', role: '鲸落图书馆 · 记忆保管员', portrait: './assets/portrait-whale.svg', color: '#9fd8e1' },
};

export const CHAPTERS = [
  {
    id: 'platform', title: '苔灯站台', subtitle: '给明天的一封信', stamp: '第一声汽笛', color: '#b8d8b3', icon: 'station',
    summary: '寄自明天的信，让阿拾头盖骨里的小火车第一次鸣笛。',
    hint: '掀盖放出拾光，穿过帘幕点亮两盏灯；带回念头，再让阿拾走向出口。',
    intro: [
      { speaker: 'moth', text: '阿拾！你寄给自己的信，邮戳是“明天”。这地方三百年没营业了。' },
      { speaker: 'ashi', text: '我的头顶怎么在鸣笛？忘了带车票，总不会被自己的脑袋赶下车吧。', mood: 'curious' },
      { speaker: 'light', text: '掀盖看看！你把没说完的话搭成了小剧场。今晚，候车室终于开窗了。', mood: 'peek' },
    ],
    outro: [
      { speaker: 'moth', text: '站牌亮了：“请在这里等一个人。”下面还有小字：也可以一起出发。' },
      { speaker: 'ashi', text: '信上写着：“又忘了回家的路，就送完这六封信。”原来我给自己留了班次。', mood: 'open' },
      { speaker: 'light', text: '小火车已经听见发车铃。还没带回的念头会留在站台，愿意时再来接它。', mood: 'joy' },
    ],
    letterTitle: '没有发车的车票',
    memories: [
      '站台上方挂着一张去程票。小火车给它留了位子：远方不是忘记回家的理由。',
      '回程票背面画着一扇头顶小窗：“想不明白的时候，先让念头出去转一圈。”',
      '绒绒把站钟调快一分钟。头里的候车室响起广播：“明天，请别再误车。”',
    ],
  },
  {
    id: 'greenhouse', title: '倒流温室', subtitle: '让没有开过的花开一次', stamp: '一朵迟开的花', color: '#9ce2c1', icon: 'flower',
    summary: '雨往天上落，一句没说出的约定，却在头盖骨里长了芽。',
    hint: '让阿拾留在稳固的高台，拾光去找高处的灯。弹跳蘑菇会把身体送得更远。',
    intro: [
      { speaker: 'ashi', text: '这里连雨都往回走。头里的小盆倒是空着，像在等一粒种子。', mood: 'curious' },
      { speaker: 'keeper', text: '温室主人天天把花变回种子。孩子答应陪她看花，她怕错过那一天。' },
      { speaker: 'light', text: '高处旧靴子里有位小客人。身体借蘑菇站稳，我去看看它愿不愿意同行。', mood: 'brave' },
    ],
    outro: [
      { speaker: 'ashi', text: '孩子的信在这里：“妈妈，第一朵花开时，替我留个位置。”我们来晚了。', mood: 'tender' },
      { speaker: 'keeper', text: '我们不知道他何时回来。信可以送出去，也可以再保管一晚；让她自己选花期。' },
      { speaker: 'light', text: '温室亮了，头里的小盆还空着。旧靴子里的种子，等愿意时再来接。', mood: 'joy' },
    ],
    choice: 'letter', letterTitle: '温室里的小纸条',
    memories: [
      '花盆标签上的“明天”被改成“一起”。拾光添了一行小字：“窗户朝上。”',
      '旧靴子里藏着最后一粒种子。它想住进阿拾的脑洞，先问了一句：有没有朝上的窗？',
      '温室主人画下第一片新叶，准备夹进回信。头里的小芽也挺了挺腰。',
    ],
  },
  {
    id: 'theater', title: '借月剧场', subtitle: '最后一排还有观众', stamp: '谢幕之前', color: '#d5b1ec', icon: 'moon',
    summary: '纸月亮挂进脑内小剧场，最后一排等着一句迟到的台词。',
    hint: '身体留在移动舞台上，拾光飞去借月光；回盖时，把找到的台词一起带上。',
    intro: [
      { speaker: 'moth', text: '今晚第一千零一次首演！演员卡在“我想回家”，家人卡在最后一排。' },
      { speaker: 'ashi', text: '我头里的舞台也搭好了，还吊着纸月亮。麻烦大家别把我的鼻孔当检票口。', mood: 'open' },
      { speaker: 'light', text: '身体替我压住幕布，我去当追光。先照见最后一排，台词就有地方落下了。', mood: 'brave' },
    ],
    outro: [
      { speaker: 'moth', text: '“我听见了。”最后一排的声音很轻，演员却终于肯谢幕。今晚可以下班了。' },
      { speaker: 'ashi', text: '纸月亮照见一双缝围巾的手。那个人笑我：骨头咯咯响，都替乐队省钱了。', mood: 'tender' },
      { speaker: 'light', text: '围巾里缝着“小满”。这回把名字带回头里吧，给她留个看得见舞台的位置。', mood: 'peek' },
    ],
    letterTitle: '不需要完美的谢幕',
    memories: [
      '剧本最后一页只有“我想回家”。纸月亮悄悄把追光挪向了那几个字。',
      '票根上写着：“演砸了也来接你。”阿拾把它放在脑内剧场最好的座位上。',
      '围巾角有小满绣的歪月亮。头里的纸月亮照着它，第一次不必借别人的光。',
    ],
  },
  {
    id: 'library', title: '鲸落图书馆', subtitle: '记忆不是一座牢房', stamp: '鲸的回信', color: '#9dcee4', icon: 'whale',
    summary: '忘掉的名字藏在鲸腹；拾光想把一小片海，搬回阿拾头里。',
    hint: '身体在书页间落脚，拾光绕过书架找灯；找到的记忆，可以一起带回脑洞。',
    intro: [
      { speaker: 'whale', text: '借书可以，借鲸也行。你头里那条小的，请别拿书签喂它；我还得对账。' },
      { speaker: 'ashi', text: '它一碰旧书就打嗝，吐出“小满”。这个名字，我是不是故意忘记过？', mood: 'curious' },
      { speaker: 'whale', text: '上回你求我藏好她的名字，怕想起就走不动。今天，头顶的窗总算开着。' },
    ],
    outro: [
      { speaker: 'whale', text: '归先生在女儿离开的那天拧停了钟。后来，全镇的人都把不敢碰的明天交给他。' },
      { speaker: 'ashi', text: '原来我的头盖骨也锁着一小段昨天。小鲸，把这一页带上，我们边走边读。', mood: 'tender' },
      { speaker: 'light', text: '归先生的记忆，要还给钟声，还是留一页灯光？两条路，都不用把门锁回去。', mood: 'brave' },
    ],
    choice: 'clock', letterTitle: '鲸腹中的借阅卡',
    memories: [
      '旧借阅卡写着：“先借一个不疼的晚上。”小鲸叼住卡角，等阿拾亲手接回。',
      '一滴想念落进脑洞，小鲸便有了海。它转了半圈，发现这里还容得下明天。',
      '蓝页把催还章改成“路上慢读”。小鲸缩成一枚书签，终于肯陪阿拾出门。',
    ],
  },
  {
    id: 'coast', title: '钟摆海岸', subtitle: '走过一秒钟的距离', stamp: '向前一秒', color: '#e4ba98', icon: 'clock',
    summary: '一只怀表在头里等了太久；小满的名字，让它重新响了一声。',
    hint: '留意钟摆的节奏。身体守住落脚点，拾光的脉冲能让危险短暂停顿。',
    intro: [
      { speaker: 'keeper', text: '每送一封信，钟就多走一点。你头里那只怀表，也准备跟着走了吗？' },
      { speaker: 'ashi', text: '是小满放进去的。她说我的脑袋太爱堵车，掀个盖，念头就能换条路。', mood: 'tender' },
      { speaker: 'keeper', text: '小满是我的女儿。她把最后一封信交给你；我锁住钟，你锁住头顶，谁也没送到。' },
    ],
    outro: [
      { speaker: 'keeper', text: '我把发条拧得那么紧，楼梯却一直没响。刚才听见脚步，才发现是我自己。' },
      { speaker: 'ashi', text: '怀表走了一格，我的头盖骨也松了一格。归先生，最后一封信，我们一起送。', mood: 'open' },
      { speaker: 'light', text: '身体替我站住，我替你们停一阵风。那一步不必很远，能迈出去就好。', mood: 'brave' },
    ],
    letterTitle: '停在一秒前的潮汐',
    memories: [
      '怀表里夹着一张便条：“阿拾，别把脑袋上成发条。——小满，今日修表员”',
      '钟摆背面刻着小满的身高，每年都偷偷多一厘米。归先生一直没有擦掉。',
      '旧木板上多了一步新脚印。头里的怀表轻轻响起，像有人敲了敲门。',
    ],
  },
  {
    id: 'postoffice', title: '黎明邮局', subtitle: '收件人：明天', stamp: '终于寄出的明天', color: '#f6ca88', icon: 'sun',
    summary: '六扇小窗都打开了。阿拾头里的日出，终于有了投递地址。',
    hint: '点亮最后两盏灯，收好小满的信；让拾光回到头顶，和阿拾一起走进邮局。',
    intro: [
      { speaker: 'ashi', text: '寄给自己的信，原来是提醒我掀盖。火车、嫩芽、小鲸……都挤来等头里的日出。', mood: 'joy' },
      { speaker: 'light', text: '我就是小满留下的那一点勇气。你叫我拾光；每次开窗，我就敢再飞远一点。', mood: 'brave' },
      { speaker: 'keeper', text: '邮局还差两盏灯。你们轮流替彼此站稳那么久，这一回，我来替你们留门。' },
    ],
    outro: [
      { speaker: 'ashi', text: '“爸爸，我要是没赶回来，你先去看日出。记得带茶，别只带怀表。”', mood: 'tender' },
      { speaker: 'light', text: '“阿拾，头顶扣好也别上锁。还没说完的话，明天可以接着说。”', mood: 'joy' },
      { speaker: 'keeper', text: '我收到了，小满。阿拾，给我也留个座位吧；我想看看你头里那场日出。' },
    ],
    letterTitle: '小满写给所有人的信',
    memories: [
      '“阿拾，掀起你的头盖骨。里面有没讲完的故事，也该有没见过的风景。”',
      '“爸爸，你欠我一次日出。先替我看吧，颜色记不住也没关系，再看一次。”',
      '信尾画着一个小太阳，旁边留了空白。拾光把它挂上头顶，等明天续写。',
    ],
  },
];

export const STORY_CHOICES = {
  letter: {
    chapterIndex: 1, title: '这封信，交给谁？', lead: '温室的窗开着。这句迟到的约定，也该有个能进出的位置。',
    options: [
      { id: 'send', title: '让风把它送出去', text: '窗开着，让信去找愿意接住它的人。', reply: '信乘着掀盖时的风飞走。温室的第一朵花，朝着打开的窗轻轻点头。' },
      { id: 'keep', title: '先替她好好保管', text: '信先住下，靠窗的位置给它留着。', reply: '阿拾把信收好，头顶留了一道缝。还没说完的约定，有了靠窗的位置。' },
    ],
  },
  clock: {
    chapterIndex: 3, title: '记忆，应该留在哪里？', lead: '小鲸叼来归先生的昨天。阿拾想给它一个能进出、不会落锁的位置。',
    options: [
      { id: 'release', title: '把它还给钟声', text: '让想念跟着钟，去下一秒看看。', reply: '小鲸从头顶跃出，把记忆放进钟声。归先生的昨天，第一次经过了明天。' },
      { id: 'hold', title: '留下一页安静的地方', text: '给想念留一盏灯，也给明天留扇门。', reply: '阿拾在书页画了扇小窗。归先生随时能回来看，小鲸负责守灯，不负责上锁。' },
    ],
  },
};

export const ENDINGS = {
  dawn: { id: 'dawn', eyebrow: 'ENDING 01 · 一起向前', title: '天亮了。你也还在。', color: '#f7cc8c', text: ['第一班列车带来晨风。归先生捧着茶走下楼梯，终于赶上答应小满的日出。', '阿拾轻扣头盖骨。小火车载着嫩芽、纸月亮和小鲸，绕那轮太阳开了整整一圈。', '拾光把“未完待续”挂在脑内剧场门口。阿拾收好小满的信，又接过一封新的。'], lastLine: '头盖骨不再锁住明天。下一封信，出发。' },
  tender: { id: 'tender', eyebrow: 'ENDING 02 · 慢慢天亮', title: '不用一下子，走出长夜。', color: '#cfb5ec', text: ['黎明先落在窗沿。归先生让钟多走一秒，阿拾就把头顶的窗再推开一点。', '还没寄出的信住在靠窗的位置。小鲸替它压住折角，嫩芽负责每天报一次天气。', '拾光没催谁出发。它陪阿拾把小满的字读完，再给明天留出一张空白信纸。'], lastLine: '盖子可以慢慢开，明天不必再锁着。' },
  lanterns: { id: 'lanterns', eyebrow: 'ENDING 03 · 长夜有灯', title: '这一夜，不再只有你。', color: '#a9dfd4', text: ['太阳还没升起，小镇已经摆好长桌。归先生把守钟的椅子搬来，坐在朋友中间。', '阿拾掀起头盖骨，请大家看脑内小剧场。纸月亮亮着，小鲸笨拙地谢了三次幕。', '小满的信放在空座旁。拾光替还没准备出发的人留灯，也替想去远方的人开窗。'], lastLine: '头顶的窗开着。明天，随时可以进来。' },
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
