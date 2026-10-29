// Original, self-contained epilogue illustrations. Presentation only: the
// caller supplies the ending already resolved by the existing story rules.
// No storage, clocks, timers, external assets, or gameplay state live here.
const SCENES = Object.freeze({
  dawn: Object.freeze({
    title: '一起向前 · 日出的第一封信',
    description: '铜顶邮局迎来晨光。阿拾把一封新信送进投递口，拾光陪在身边，远处的第一班列车正驶向天亮。',
    caption: '下一封信，带着我们一起出发。',
    action: 'posting', sky: ['#25384f', '#ca9692', '#f6d4a6'],
    hills: ['#747d92', '#52677e'], ground: ['#81929c', '#394d62'],
  }),
  lanterns: Object.freeze({
    title: '长夜有灯 · 留给明天的座位',
    description: '太阳还没有升起。纸灯照亮邮局长桌，阿拾打开头顶的小剧场，拾光守着小满的信和一张留给朋友的空椅。',
    caption: '不急着天亮，也有人为你留灯。',
    action: 'paper-lights', sky: ['#17253e', '#384969', '#627387'],
    hills: ['#435976', '#33465f'], ground: ['#607f87', '#293e55'],
  }),
  tender: Object.freeze({
    title: '慢慢天亮 · 并肩读完这一页',
    description: '淡紫色的拂晓停在窗沿。阿拾和拾光并肩读信，小鲸压住窗台上信纸的折角，邮局为明天留着一扇亮窗。',
    caption: '这一页慢慢读，明天慢慢来。',
    action: 'companionship', sky: ['#31314d', '#9b88ad', '#d5b5bc'],
    hills: ['#827e9b', '#5a667f'], ground: ['#90909e', '#42475f'],
  }),
});

const gradient = (id, colors, attrs = 'x1="0" y1="0" x2="0" y2="1"') =>
  `<linearGradient id="${id}" ${attrs}>${colors.map((color, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${color}"/>`).join('')}</linearGradient>`;
const paint = (prefix, id) => `url(#${prefix}-${id})`;
const star = (x, y, size, color = '#ffedc7', opacity = 1) =>
  `<path d="M${x} ${y - size} Q${x + 1} ${y - 1} ${x + size} ${y} Q${x + 1} ${y + 1} ${x} ${y + size} Q${x - 1} ${y + 1} ${x - size} ${y} Q${x - 1} ${y - 1} ${x} ${y - size}Z" fill="${color}" opacity="${opacity}"/>`;

function definitions(prefix, scene) {
  const g = (id, colors, attrs) => gradient(`${prefix}-${id}`, colors, attrs);
  return `<defs>
    ${g('sky', scene.sky)}${g('ground', scene.ground)}
    ${g('roof', ['#e5c29e', '#b88178', '#655a70'])}
    ${g('stone', ['#d2c0b0', '#938e9a', '#657285'], 'x1="0" y1="0" x2="1" y2="1"')}
    ${g('brass', ['#f3d6a3', '#d7ae76', '#94755c'], 'x1="0" y1="0" x2="1" y2="1"')}
    ${g('skull', ['#fff6db', '#efdfbc', '#c9b79e'], 'x1="0" y1="0" x2="1" y2="1"')}
    ${g('cap', ['#fff9e5', '#ead6ae'])}
    ${g('coat', ['#aa99bd', '#796b96', '#4b476c'], 'x1="0" y1="0" x2="1" y2="1"')}
    ${g('scarf', ['#f3c898', '#d9997f', '#ad6f68'])}
    ${g('soul', ['#fcfff2', '#d4f4dc', '#81c5bf'], 'x1="0" y1="0" x2=".6" y2="1"')}
    ${g('paper', ['#fff6d9', '#ead3ac'], 'x1="0" y1="0" x2=".8" y2="1"')}
    ${g('mailbox', ['#879c9e', '#4b727b', '#2c4e60'], 'x1="0" y1="0" x2="1" y2="1"')}
    ${g('lamp', ['#fff7d8', '#ffdb92', '#d8a76f'])}
    <radialGradient id="${prefix}-halo"><stop stop-color="#ffe8b5" stop-opacity=".65"/><stop offset="1" stop-color="#ffe8b5" stop-opacity="0"/></radialGradient>
    <radialGradient id="${prefix}-spirit-halo"><stop stop-color="#b6f0d9" stop-opacity=".4"/><stop offset="1" stop-color="#b6f0d9" stop-opacity="0"/></radialGradient>
    <linearGradient id="${prefix}-haze" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e6dcce" stop-opacity="0"/><stop offset="1" stop-color="#e6dcce" stop-opacity=".35"/></linearGradient>
    <pattern id="${prefix}-grain" width="31" height="29" patternUnits="userSpaceOnUse"><circle cx="3" cy="8" r=".6" fill="#fff8df" opacity=".14"/><circle cx="22" cy="25" r=".7" fill="#102d46" opacity=".12"/></pattern>
    <clipPath id="${prefix}-frame"><rect x="1" y="1" width="638" height="338" rx="22"/></clipPath>
  </defs>`;
}

function envelope(prefix, x, y, scale = 1, angle = 0, open = false) {
  return `<g data-art="letter" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">
    ${open ? `<path d="M-24 -8L0 -29 24 -8Z" fill="#d4b88f" stroke="#b99c7d" stroke-width="1.2"/><path d="M-19 -24H19V7H-19Z" fill="${paint(prefix, 'paper')}"/><path d="M-13 -18H11M-13 -12H14M-13 -6H6" stroke="#a6978d" stroke-width="1.3"/>` : ''}
    <rect x="-25" y="-12" width="50" height="32" rx="3" fill="${paint(prefix, 'paper')}" stroke="#b99c7d" stroke-width="1.4"/>
    <path d="M-23 18L-4 2Q0 -1 4 2L23 18" fill="#f5e6c9" stroke="#c5ad90" stroke-width="1"/>
    ${!open ? '<path d="M-24 -10L-3 6Q0 8 3 6L24 -10" fill="#fff4d7" stroke="#c5ad90" stroke-width="1.1"/>' : ''}
    <circle cx="0" cy="6" r="4.5" fill="#c18477"/><circle cx="0" cy="5.5" r="2.5" fill="none" stroke="#e7b79a" stroke-width=".8"/>
  </g>`;
}

function soul(prefix, x, y, scale = 1, pose = 'happy') {
  return `<g data-character="shiguang" transform="translate(${x} ${y}) scale(${scale})">
    <circle cx="0" cy="3" r="64" fill="${paint(prefix, 'spirit-halo')}"/>
    <path d="M-24 8C-37 -13 -25 -34 -8 -36Q3 -40 4 -51C15 -46 11 -38 19 -34C34 -30 35 -16 29 -11C37 14 17 34 -2 43Q5 21 -24 8Z" fill="${paint(prefix, 'soul')}" stroke="#b6e8d5" stroke-width="1.6"/>
    <path d="M-22 -25Q-17 -31 -9 -32M-13 20Q0 29 -2 39" fill="none" stroke="#fffdf0" stroke-opacity=".7" stroke-width="2"/>
    ${pose === 'rest' ? '<path d="M-13 -7Q-8 -13 -3 -7M7 -7Q12 -13 17 -7" fill="none" stroke="#365865" stroke-width="2.5"/>' : '<ellipse cx="-9" cy="-10" rx="5" ry="6.6" fill="#365865"/><ellipse cx="12" cy="-10" rx="5" ry="6.6" fill="#365865"/><circle cx="-7.5" cy="-12" r="1.7" fill="#fff9df"/><circle cx="13.5" cy="-12" r="1.7" fill="#fff9df"/>'}
    <path d="M-3 5Q3 13 9 5" fill="none" stroke="#568e89" stroke-width="1.8"/>
    <ellipse cx="-18" cy="1" rx="5" ry="2" fill="#e9b4a4" opacity=".65"/><ellipse cx="22" cy="1" rx="5" ry="2" fill="#e9b4a4" opacity=".65"/>
    ${star(2, -28, 5.2, '#e8c780')}
  </g>`;
}

function ashi(prefix, x, y, { scale = 1, pose = 'posting', open = false } = {}) {
  const sitting = pose === 'reading';
  const arms = pose === 'posting'
    ? '<path d="M-18 -59Q-29 -42 -18 -34M18 -59Q32 -68 50 -75"/><circle cx="-20" cy="-44" r="3"/><circle cx="33" cy="-69" r="3"/>'
    : sitting ? '<path d="M-19 -57Q-27 -41 -10 -37M19 -57Q29 -41 11 -37"/><circle cx="-23" cy="-46" r="3"/><circle cx="24" cy="-46" r="3"/>'
      : '<path d="M-19 -58Q-42 -66 -40 -91M19 -58Q34 -52 44 -63"/><circle cx="-37" cy="-73" r="3"/><circle cx="31" cy="-53" r="3"/>';
  return `<g data-character="ashi" data-pose="${pose}" transform="translate(${x} ${y}) scale(${scale})">
    <ellipse cy="1" rx="43" ry="7" fill="#162c43" opacity=".3"/>
    <g transform="translate(-29 -43) rotate(-9)"><rect x="-10" y="-11" width="27" height="35" rx="5" fill="#b88c6f" stroke="#735b53" stroke-width="1.5"/><path d="M-9 -9H16V2Q4 11 -9 2Z" fill="#d4aa7c"/><path d="M-5 11V19H11" fill="none" stroke="#e6c79d" stroke-width="1"/><rect x="1" y="0" width="6" height="8" rx="1.5" fill="${paint(prefix, 'brass')}"/></g>
    <path d="M-15 -66C-36 -65 -45 -81 -62 -75L-57 -62Q-34 -67 -15 -57Z" fill="${paint(prefix, 'scarf')}"/><path d="M-59 -73Q-42 -76 -26 -67" fill="none" stroke="#f9dab1" stroke-width="1.2"/>
    <g fill="none" stroke="#d9cfb6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      ${sitting ? '<path d="M-12 -30L-22 -17 -21 -2M12 -30L24 -18 27 -2"/>' : '<path d="M-11 -31L-12 -16 -15 -2M11 -31L16 -17 20 -2"/>'}
    </g>
    <path d="M-23 -7Q-17 -11 -11 -6L-6 -3Q-5 1 -11 2H-25Z" fill="#a5bbad" stroke="#49676f" stroke-width="1.3"/>
    <path d="M${sitting ? 20 : 13} -6Q25 -10 29 -4L35 -2Q37 2 30 3H${sitting ? 18 : 11}Z" fill="#a5bbad" stroke="#49676f" stroke-width="1.3"/>
    <g fill="#eee1c3" stroke="#c7b99e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${arms}</g>
    <path d="M-20 -65Q1 -77 21 -63L26 -29Q2 -19 -25 -30Z" fill="${paint(prefix, 'coat')}" stroke="#514969" stroke-width="1.4"/>
    <path d="M-19 -58L-19 -32M1 -58V-29M20 -52L22 -32M-22 -29Q0 -23 23 -29" fill="none" stroke="#d2bfcb" stroke-opacity=".65" stroke-width="1.3"/>
    <path d="M-16 -48H-6V-40Q-11 -36 -16 -40Z" fill="#9986ab" stroke="#c1acb8" stroke-width="1"/>
    <path d="M15 -65Q-4 -47 -26 -34" fill="none" stroke="#624e50" stroke-width="6"/><path d="M14 -66Q-5 -47 -26 -35" fill="none" stroke="#c4a17d" stroke-width="3.3"/>
    <g fill="${paint(prefix, 'brass')}"><circle cx="5" cy="-53" r="2.2"/><circle cx="5" cy="-43" r="2.2"/><circle cx="5" cy="-33" r="2.2"/></g>
    <rect x="-23" y="-70" width="46" height="11" rx="5.5" fill="${paint(prefix, 'scarf')}"/><path d="M-17 -65H13" stroke="#f7d7ac" stroke-opacity=".55" stroke-width="1.2"/>
    <g data-art="skull">
      ${open ? `<ellipse cx="0" cy="-100" rx="32" ry="8" fill="#3a3a58" stroke="#ba9c74" stroke-width="2"/><path d="M-20 -101Q0 -119 20 -101" fill="#78838b" opacity=".6"/><path d="M8 -123A10 10 0 1 0 19 -108A9 9 0 0 1 8 -123Z" fill="#f3dfab"/>${star(-12, -113, 3, '#e9d5e9')}` : ''}
      <path d="M-31 -101C-36 -81 -30 -68 -20 -63L-18 -54Q0 -47 18 -54L20 -63C30 -68 36 -81 31 -101Z" fill="${paint(prefix, 'skull')}" stroke="#c6b89c" stroke-width="1.5"/>
      <g transform="${open ? 'translate(-31 -100) rotate(-42) translate(31 100)' : ''}">
        <path d="M-31 -101C-30 -140 29 -140 31 -101Z" fill="${paint(prefix, 'cap')}" stroke="#bba98b" stroke-width="1.5"/>
        <path d="M-30 -101H30" stroke="#a98b63" stroke-width="4"/><path d="M-26 -102H27" stroke="#f5dfb3" stroke-width="1.3"/>
        <path d="M-7 -127L-2 -119 -8 -112 -1 -109" fill="none" stroke="#afa089" stroke-width="1.4"/><path d="M-23 -118Q-15 -127 -7 -128" fill="none" stroke="#fffdf0" stroke-width="3"/>
        ${star(14, -116, 3.4, '#c3a779')}
      </g>
      <ellipse cx="-13" cy="-82" rx="9.5" ry="11.5" fill="#303447"/><ellipse cx="13" cy="-82" rx="9.5" ry="11.5" fill="#303447"/>
      <ellipse cx="${pose === 'posting' ? -10 : -12}" cy="-84" rx="3.2" ry="4" fill="#ffe4af"/><ellipse cx="${pose === 'posting' ? 16 : 14}" cy="-84" rx="3.2" ry="4" fill="#ffe4af"/>
      <circle cx="-10.5" cy="-87" r="1.3" fill="#fff8e5"/><circle cx="15.5" cy="-87" r="1.3" fill="#fff8e5"/>
      <path d="M0 -72L-4 -65H4Z" fill="#877875"/><path d="M-12 -60Q0 -53 12 -60M-10 -57V-51M0 -55V-50M10 -57V-51" fill="none" stroke="#a68b77" stroke-width="1.4"/>
      <ellipse cx="-25" cy="-71" rx="5" ry="2.2" fill="#d69e8e" opacity=".55"/><ellipse cx="25" cy="-71" rx="5" ry="2.2" fill="#d69e8e" opacity=".55"/>
      <circle cx="-31" cy="-100" r="4.5" fill="${paint(prefix, 'brass')}"/><path d="M-33 -102L-29 -98" stroke="#8a755e" stroke-width="1"/>
    </g>
    ${pose === 'reading' ? envelope(prefix, 1, -39, .78, -4, true) : ''}
    <g fill="#f5e8c8" stroke="#bda98e" stroke-width="1">
      ${pose === 'posting' ? '<ellipse cx="50" cy="-75" rx="5.4" ry="5.2"/><ellipse cx="-18" cy="-34" rx="5" ry="5.5"/>' : sitting ? '<ellipse cx="-15" cy="-37" rx="4.7" ry="5"/><ellipse cx="16" cy="-38" rx="4.7" ry="5"/>' : '<ellipse cx="-40" cy="-91" rx="5" ry="5.4"/><ellipse cx="44" cy="-63" rx="5" ry="5.4"/>'}
    </g>
  </g>`;
}

function house(prefix, x, y, scale = 1, lit = true) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" data-art="post-office">
    <path d="M0 109V12Q58 -2 116 12V109Z" fill="${paint(prefix, 'stone')}" stroke="#52627b" stroke-width="2"/>
    <path d="M-9 15L22 -17Q58 -27 93 -17L125 15Z" fill="${paint(prefix, 'roof')}" stroke="#655e74" stroke-width="2"/>
    <path d="M-4 13H121M24 -15L13 9M49 -22L46 9M77 -22L80 9M92 -15L106 9" fill="none" stroke="#edc7a2" stroke-opacity=".6" stroke-width="1.4"/>
    <path d="M20 108V54Q20 27 58 25Q96 27 96 54V108Z" fill="#2c405b" stroke="#d7bea0" stroke-width="5"/>
    <path d="M28 103V55Q28 33 58 33Q88 33 88 55V103Z" fill="${lit ? paint(prefix, 'lamp') : '#53637e'}" opacity=".8"/>
    <path d="M58 33V104M28 68H88" stroke="#8f827f" stroke-width="4"/>
    <path d="M14 112H103M0 30H16M99 28H116M0 57H14M101 57H116M0 84H14M101 83H116" stroke="#d9c7ae" stroke-opacity=".55" stroke-width="2"/>
    <rect x="14" y="105" width="88" height="7" rx="2" fill="#e2c5a3"/><circle cx="58" cy="15" r="6" fill="${paint(prefix, 'brass')}"/>
  </g>`;
}

function backdrop(prefix, scene, endingId) {
  const night = endingId === 'lanterns';
  return `<rect width="640" height="340" fill="${paint(prefix, 'sky')}"/>
    ${endingId === 'dawn' ? `<g data-art="rising-sun"><circle cx="468" cy="88" r="113" fill="${paint(prefix, 'halo')}"/><circle cx="468" cy="88" r="37" fill="#ffe5ad"/><path d="M432 97Q468 105 504 97" stroke="#f8cda5" stroke-width="2" fill="none"/></g>` : ''}
    ${endingId !== 'dawn' ? `<g data-art="night-sky">${[[58, 51, 2], [201, 47, 3], [424, 39, 2], [550, 74, 2.5], [334, 70, 1.7], [103, 91, 1.5]].map(([x, y, s]) => star(x, y, s, '#ede0cc', night ? .8 : .35)).join('')}</g>` : ''}
    <path d="M0 160Q95 93 194 150Q279 88 381 138Q475 111 640 153V246H0Z" fill="${scene.hills[0]}"/>
    <path d="M0 192Q80 155 179 179Q286 142 361 176Q489 143 640 184V259H0Z" fill="${scene.hills[1]}"/>
    <g opacity=".65" fill="#3b526e"><path d="M220 179V123L242 112 265 124V179ZM265 179V140L285 126 307 140V179ZM362 178V125L391 104 420 125V178ZM423 187V144L452 124 482 144V187Z"/><path d="M240 113V97H246V114M387 107V81H395V107"/></g>
    <g fill="#f9d2a0" opacity="${night ? '.65' : '.4'}"><rect x="237" y="142" width="7" height="12" rx="3"/><rect x="279" y="149" width="7" height="12" rx="3"/><rect x="385" y="131" width="10" height="16" rx="4"/><rect x="447" y="153" width="8" height="12" rx="3"/></g>
    <rect y="156" width="640" height="84" fill="${paint(prefix, 'haze')}"/>
    ${house(prefix, 52, 138, 1.08, true)}${house(prefix, 492, 129, .72, night)}
    <path d="M0 245Q196 215 334 235Q480 215 640 234V340H0Z" fill="${paint(prefix, 'ground')}"/>
    <path d="M-10 297Q174 259 337 274T655 262L655 282Q498 308 339 294T-10 324Z" fill="#b6b0a2" opacity=".18"/>
    <g fill="none" stroke="#d1c3ad" stroke-opacity=".18" stroke-width="1.2"><path d="M34 303H100M132 292H179M484 291H538M553 309H608M226 320H286M369 313H416M91 329H127"/><path d="M151 291L158 311M534 291L526 312M283 319L277 334"/></g>
    <g fill="#253e54" opacity=".5"><path d="M0 284Q20 279 35 289L42 340H0ZM604 299Q621 280 640 285V340H597Z"/></g>
    <g stroke="#829e94" stroke-width="2" fill="none"><path d="M31 315Q29 295 18 291M31 315Q41 297 50 298M606 317Q610 298 619 294"/></g>
    <g fill="#b7c4a2"><ellipse cx="18" cy="292" rx="7" ry="3" transform="rotate(30 18 292)"/><ellipse cx="49" cy="298" rx="7" ry="3" transform="rotate(-26 49 298)"/><ellipse cx="619" cy="294" rx="7" ry="3" transform="rotate(-28 619 294)"/></g>`;
}

function lantern(prefix, x, y, scale = 1) {
  return `<g data-art="paper-lantern" transform="translate(${x} ${y}) scale(${scale})">
    <circle cy="16" r="61" fill="${paint(prefix, 'halo')}"/>
    <path d="M-17 -8Q-27 15 -16 38Q0 45 16 38Q27 15 17 -8Z" fill="${paint(prefix, 'lamp')}" stroke="#c9a97e" stroke-width="1.5"/>
    <path d="M-10 -8Q-18 16 -9 39M0 -8V42M10 -8Q18 16 9 39M-21 7H21M-21 25H21" fill="none" stroke="#d6af7b" stroke-width="1"/>
    <path d="M-15 -9H15M-14 39H14" stroke="#81736f" stroke-width="4"/><path d="M0 42V51M-3 53H3" stroke="#dabb8a" stroke-width="2"/>
  </g>`;
}

function dawn(prefix) {
  return `<g data-art="first-train" transform="translate(241 150)" fill="#4b5b72" stroke="#c6b49e" stroke-width="1"><path d="M-8 11H79M1 7V-8H20V7ZM23 7V-8H43V7ZM46 7V-8H68L73 7Z"/><path d="M4 -5H16V0H4ZM27 -5H39V0H27ZM50 -5H63V0H50Z" fill="#e8c297"/><circle cx="6" cy="8" r="3"/><circle cx="18" cy="8" r="3"/><circle cx="28" cy="8" r="3"/><circle cx="40" cy="8" r="3"/><circle cx="53" cy="8" r="3"/><circle cx="68" cy="8" r="3"/></g>
    <ellipse cx="463" cy="303" rx="68" ry="10" fill="#243b51" opacity=".28"/>
    <g data-art="delivery-slot" transform="translate(432 164)"><path d="M0 134V32Q0 0 34 0Q68 0 68 32V134Z" fill="${paint(prefix, 'mailbox')}" stroke="#d5bc96" stroke-width="3"/><path d="M5 132V32Q5 7 34 7Q63 7 63 32V132" fill="none" stroke="#afc4bc" stroke-opacity=".4" stroke-width="1.5"/><rect x="11" y="44" width="46" height="15" rx="3" fill="${paint(prefix, 'brass')}"/><rect x="15" y="49" width="38" height="5" rx="2" fill="#20384f"/><path d="M18 87H50V108H18Z" fill="#5e7c85" stroke="#b8bea5" stroke-width="1.3"/><path d="M20 90L34 99 48 90" fill="none" stroke="#dfcfaa" stroke-width="1.6"/><circle cx="34" cy="25" r="10" fill="${paint(prefix, 'brass')}"/>${star(34, 25, 6, '#6d7775')}<rect x="-5" y="130" width="78" height="10" rx="3" fill="#a7a599"/></g>
    <path d="M225 180Q290 135 358 179T446 214" fill="none" stroke="#ffe5b4" stroke-opacity=".45" stroke-width="2" stroke-dasharray="2 9"/>
    ${soul(prefix, 226, 178, .83)}${ashi(prefix, 345, 303, { scale: 1.18, pose: 'posting' })}
    ${envelope(prefix, 418, 211, .88, -13)}
    ${star(409, 179, 5, '#ffe8bb')}${star(511, 221, 3, '#ffe8bb', .7)}
    <g data-art="new-morning" stroke="#f6d9aa" stroke-width="1.5" opacity=".7"><path d="M129 86Q136 78 143 86Q150 78 157 86M168 72Q173 67 178 72Q183 67 188 72" fill="none"/></g>`;
}

function lanterns(prefix) {
  return `<g data-art="night-gathering"><path d="M62 70Q166 98 292 73T581 91" fill="none" stroke="#baaa92" stroke-width="1.5"/><path d="M126 82V108M467 77V103M552 87V143" stroke="#baa78c" stroke-width="1.5"/>
    ${lantern(prefix, 126, 116, .84)}${lantern(prefix, 467, 112, .92)}${lantern(prefix, 552, 153, .65)}
    <g data-art="empty-chair" transform="translate(438 219)"><path d="M-21 65V6Q-21 -5 -10 -5H10Q21 -5 21 6V65M-20 36H20M-13 2V29M0 2V29M13 2V29" fill="none" stroke="#b48f7e" stroke-width="5"/><path d="M-25 36H26V43H-25Z" fill="#dfba93"/><path d="M-23 38H24" stroke="#fff0c7" stroke-width="1.2"/></g>
    <g data-art="long-table"><path d="M164 268L168 310M483 268L487 310" stroke="#665968" stroke-width="8"/><path d="M152 260H500L492 274H160Z" fill="${paint(prefix, 'roof')}" stroke="#7a6b73" stroke-width="1.4"/><path d="M157 262H495" stroke="#edd3ad" stroke-width="2"/></g>
    ${envelope(prefix, 438, 248, .55, 7)}
    <g transform="translate(202 250)"><ellipse cy="7" rx="16" ry="3" fill="#5b606f" opacity=".4"/><path d="M-8 -8H8L6 7H-6Z" fill="#a7b9af" stroke="#e0d3b6" stroke-width="1.4"/><path d="M8 -5Q18 -5 12 3H7" fill="none" stroke="#e0d3b6" stroke-width="2"/><path d="M-2 -13Q-7 -19 -1 -25" fill="none" stroke="#e6d9bd" stroke-opacity=".4" stroke-width="1.3"/></g>
    ${ashi(prefix, 311, 314, { scale: 1.12, pose: 'inviting', open: true })}${soul(prefix, 388, 191, .72, 'rest')}
    ${star(246, 173, 4, '#efdbad')}${star(361, 141, 2.5, '#f2dfbe')}
  </g>`;
}

function tender(prefix) {
  return `<g data-art="window-dawn"><path d="M104 180L220 280H79L76 181Z" fill="#ffdda3" opacity=".12"/><path d="M94 181L178 272" stroke="#fff0c5" stroke-width="1" opacity=".2"/>
    <g data-art="folded-whale" transform="translate(111 247)"><path d="M-20 -4Q-16 -17 2 -15Q16 -13 20 -3L31 -10 28 1 18 5Q1 13 -17 4Z" fill="#a5c7ce" stroke="#7795af" stroke-width="1.3"/><path d="M-17 2Q0 9 18 3L1 -9Z" fill="#d0e0dc"/><path d="M1 -9L8 3 -4 5" fill="#8facbe"/><circle cx="-10" cy="-4" r="1.4" fill="#3e5871"/></g>
    ${envelope(prefix, 113, 252, .58, -5)}
    <g data-art="reading-bench"><path d="M217 277L209 316M438 277L447 316" stroke="#4c4b63" stroke-width="8"/><path d="M213 275V224Q213 215 223 215H432Q442 215 442 224V275" fill="none" stroke="#967a80" stroke-width="7"/><path d="M218 231H438M218 247H438" stroke="#bd9a91" stroke-width="9"/><path d="M218 228H438M218 244H438" stroke="#ebc4aa" stroke-width="1.5"/><path d="M202 276H454V284H202Z" fill="${paint(prefix, 'roof')}" stroke="#635569" stroke-width="1.4"/></g>
    ${ashi(prefix, 296, 312, { scale: 1.06, pose: 'reading' })}${soul(prefix, 384, 239, .83, 'rest')}
    <g data-art="blank-page" transform="translate(423 272) rotate(9)"><path d="M-13 -24H13V8H-13Z" fill="${paint(prefix, 'paper')}" stroke="#bfa68d" stroke-width="1"/><path d="M6 -24V-17H13" fill="#d9bf9c"/></g>
    <path d="M356 291Q373 294 391 286" stroke="#e1e9cd" stroke-opacity=".5" stroke-width="1.4" fill="none"/>
    ${star(375, 175, 3, '#f1dfb8', .6)}${star(415, 207, 2.5, '#e6e5cb', .6)}
  </g>`;
}

/** Return one bounded static scene for a real ending; unknown values render nothing. */
export function renderEndingScene(endingId) {
  // Do not coerce objects or interpolate caller-provided strings into markup.
  if (typeof endingId !== 'string' || !Object.hasOwn(SCENES, endingId)) return '';
  const scene = SCENES[endingId], prefix = `tgg-ending-${endingId}`;
  const illustration = endingId === 'dawn' ? dawn(prefix) : endingId === 'lanterns' ? lanterns(prefix) : tender(prefix);
  return `<figure class="ending-vignette" data-ending-scene="${endingId}" data-ending-action="${scene.action}">
    <svg class="ending-vignette-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 340" width="640" height="340" role="img" aria-labelledby="${prefix}-title ${prefix}-description" focusable="false">
      <title id="${prefix}-title">${scene.title}</title><desc id="${prefix}-description">${scene.description}</desc>
      ${definitions(prefix, scene)}
      <g clip-path="url(#${prefix}-frame)" stroke-linecap="round" stroke-linejoin="round">
        ${backdrop(prefix, scene, endingId)}<g class="ending-vignette-cast">${illustration}</g>
        <rect width="640" height="340" fill="${paint(prefix, 'grain')}" pointer-events="none"/>
        <rect x="8" y="8" width="624" height="324" rx="17" fill="none" stroke="#f4ddbc" stroke-opacity=".3"/>
        <path d="M22 38V24H36M604 24H618V38M22 302V316H36M604 316H618V302" fill="none" stroke="#edcf9d" stroke-opacity=".7" stroke-width="1.2"/>
      </g>
    </svg>
    <figcaption class="ending-vignette-caption"><span>${scene.caption}</span><span class="ending-choice-labels"><span data-ending-sky-label></span><span data-ending-letter-label></span><span data-ending-clock-label></span></span></figcaption>
  </figure>`;
}
