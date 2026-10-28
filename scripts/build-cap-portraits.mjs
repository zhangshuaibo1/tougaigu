import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Original, editable vector portraits. Seasonal costumes intentionally stay in
// build-festival-portraits.mjs; these expressions belong to the main story.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist/assets');
await mkdir(output, { recursive: true });

const ink = '#514253';
const gold = '#f2cc90';
const mint = '#c4f3dc';

function star(x, y, size = 5, fill = gold, opacity = 1) {
  const a = size * .29;
  return `<path d="M${x} ${y - size} ${x + a} ${y - a} ${x + size} ${y} ${x + a} ${y + a} ${x} ${y + size} ${x - a} ${y + a} ${x - size} ${y} ${x - a} ${y - a}Z" fill="${fill}" opacity="${opacity}"/>`;
}

const definitions = `<defs>
  <radialGradient id="bg" cx=".44" cy=".35" r=".8"><stop stop-color="#554363"/><stop offset=".57" stop-color="#30283e"/><stop offset="1" stop-color="#201f30"/></radialGradient>
  <radialGradient id="aura"><stop stop-color="#b6f4d5" stop-opacity=".28"/><stop offset=".6" stop-color="#8bdecc" stop-opacity=".12"/><stop offset="1" stop-color="#8bdecc" stop-opacity="0"/></radialGradient>
  <linearGradient id="bone" x1="78" y1="66" x2="166" y2="186" gradientUnits="userSpaceOnUse"><stop stop-color="#fff6dc"/><stop offset=".48" stop-color="#f1dfbb"/><stop offset="1" stop-color="#d6b68d"/></linearGradient>
  <linearGradient id="capBone" x1="102" y1="43" x2="164" y2="110" gradientUnits="userSpaceOnUse"><stop stop-color="#fff8e2"/><stop offset=".58" stop-color="#f0ddba"/><stop offset="1" stop-color="#cbae87"/></linearGradient>
  <linearGradient id="coat" x1="84" y1="176" x2="165" y2="236" gradientUnits="userSpaceOnUse"><stop stop-color="#a18bb2"/><stop offset=".47" stop-color="#796183"/><stop offset="1" stop-color="#51415f"/></linearGradient>
  <linearGradient id="scarf" x1="82" y1="173" x2="149" y2="198" gradientUnits="userSpaceOnUse"><stop stop-color="#efb18a"/><stop offset="1" stop-color="#bf795f"/></linearGradient>
  <linearGradient id="bag" x1="152" y1="194" x2="186" y2="222" gradientUnits="userSpaceOnUse"><stop stop-color="#b78366"/><stop offset="1" stop-color="#815743"/></linearGradient>
  <radialGradient id="socket" cx=".5" cy=".34"><stop stop-color="#544356"/><stop offset="1" stop-color="#342c40"/></radialGradient>
  <linearGradient id="soul" x1="110" y1="36" x2="152" y2="206" gradientUnits="userSpaceOnUse"><stop stop-color="#f2ffe7"/><stop offset=".48" stop-color="#bff1d8"/><stop offset="1" stop-color="#78c6b9"/></linearGradient>
  <linearGradient id="miniSoul" x1="-10" y1="-38" x2="12" y2="30" gradientUnits="userSpaceOnUse"><stop stop-color="#f3ffe5"/><stop offset=".55" stop-color="#c2f4d9"/><stop offset="1" stop-color="#72cabb"/></linearGradient>
  <linearGradient id="soulEdge" x1="77" y1="78" x2="175" y2="182" gradientUnits="userSpaceOnUse"><stop stop-color="#f4ffe5"/><stop offset="1" stop-color="#c6f3d9"/></linearGradient>
  <radialGradient id="blush"><stop stop-color="#eaaf99" stop-opacity=".7"/><stop offset="1" stop-color="#eaaf99" stop-opacity="0"/></radialGradient>
  <radialGradient id="soulBlush"><stop stop-color="#f6d5ad" stop-opacity=".8"/><stop offset="1" stop-color="#f6d5ad" stop-opacity="0"/></radialGradient>
  <linearGradient id="inside" x1="128" y1="86" x2="128" y2="117" gradientUnits="userSpaceOnUse"><stop stop-color="#192d40"/><stop offset=".65" stop-color="#364b55"/><stop offset="1" stop-color="#9cd0b3"/></linearGradient>
  <clipPath id="round"><circle cx="128" cy="128" r="116"/></clipPath>
</defs>`;

function frame(content, character) {
  const isSoul = character === 'soul';
  return `<circle cx="128" cy="128" r="121" stroke="${isSoul ? '#b8e2ce' : '#c7aacd'}" stroke-width="1.4" stroke-opacity=".28"/>
<circle cx="128" cy="128" r="116" fill="url(#bg)"/>
<circle cx="128" cy="128" r="111" stroke="${gold}" stroke-width=".6" stroke-opacity=".13"/>
<g clip-path="url(#round)" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="128" cy="103" rx="92" ry="94" fill="url(#aura)"/>
  <path d="M39 135c-4-26 5-53 21-69M207 173c12-19 16-40 12-61" stroke="${mint}" stroke-width="1" stroke-opacity=".18" stroke-dasharray="2 7"/>
  <path d="m43 76 14-12 12 4M198 58l10 17-5 17" stroke="${gold}" stroke-width=".75" stroke-opacity=".22"/>
  <g fill="${gold}" opacity=".58"><circle cx="43" cy="76" r="1.5"/><circle cx="57" cy="64" r="1.5"/><circle cx="69" cy="68" r="1.3"/><circle cx="198" cy="58" r="1.3"/><circle cx="208" cy="75" r="1.5"/></g>
  ${content}
</g>
${star(36, 107, 5.5)}${star(215, 170, 5, '#d9eac5')}
<g fill="${mint}" opacity=".76"><circle cx="54" cy="178" r="1.8"/><circle cx="203" cy="99" r="1.7"/><circle cx="81" cy="40" r="1.4"/></g>`;
}

function svg(title, description, content, character) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none" role="img" aria-labelledby="title desc">
<title id="title">${title}</title>
<desc id="desc">${description}</desc>
${definitions}
${frame(content, character)}
</svg>\n`;
}

function smallSoul(x, y, scale, mood = 'peek') {
  let eyes = '<ellipse cx="-7" cy="0" rx="2.4" ry="4.4" fill="#47796d"/><ellipse cx="9" cy="-1" rx="2.4" ry="4.4" fill="#47796d"/><circle cx="-6.5" cy="-1.8" r=".8" fill="#f9ffe6"/><circle cx="9.5" cy="-2.8" r=".8" fill="#f9ffe6"/>';
  if (mood === 'joy') eyes = '<path d="M-11 0q4-6 8 0M5-1q4-6 8 0" stroke="#47796d" stroke-width="2.5"/>';
  if (mood === 'sleep') eyes = '<path d="M-11 0q4 4 8 0M5-1q4 4 8 0" stroke="#47796d" stroke-width="2.3"/>';
  return `<g transform="translate(${x} ${y}) scale(${scale})">
  <path d="M-16 14c-13-7-16-23-5-34 8-8 15-11 16-23 13 7 11 18 22 26 16 12 13 29-1 37-9 5-18 5-25 1-3 8-7 11-14 10 4-5 7-11 7-17Z" fill="url(#miniSoul)" stroke="#e4f9db" stroke-width="2.6"/>
  <path d="M-18-10q3-10 12-16" stroke="#f8ffe9" stroke-width="3.2"/>
  ${star(0, -19, 4.2, '#f4d8a0')}${eyes}
  <path d="M-3 10q4 4 8-1" stroke="#699b80" stroke-width="2"/>
  <path d="M-15 8h4M13 7h4" stroke="#e9ccaa" stroke-width="3.2" opacity=".75"/>
  <path d="M-21 6q-9-5-11 0m51 1q8-6 11-2" stroke="#d7f7d7" stroke-width="3.2"/>
  </g>`;
}

function heroBody() {
  return `<ellipse cx="129" cy="224" rx="54" ry="7" fill="#131d2b" opacity=".4"/>
  <path d="M91 174c-18 7-29 25-26 47 29 21 88 26 124 0 3-22-10-38-29-46Z" fill="url(#coat)" stroke="#3f344d" stroke-width="3.1"/>
  <path d="m93 188 29 18 32-20-4 28-22 23-22-22Z" fill="#826e98" opacity=".7"/>
  <path d="m91 190 31 16 35-17m-35 17 5 29" stroke="#d0b2ca" stroke-width="1.6" opacity=".7"/>
  <path d="M75 199q-6 11-2 20m109-19q4 10 1 18" stroke="#b19abb" stroke-width="2" opacity=".64"/>
  <path d="m91 181 77 49" stroke="#4b3443" stroke-width="9"/>
  <path d="m91 181 77 49" stroke="#c29679" stroke-width="5.7"/>
  <path d="m102 190 53 34" stroke="#edc29a" stroke-width=".9" stroke-dasharray="2 3"/>
  <path d="M91 181q-17 2-35-10 0 14 26 18l10-2" fill="url(#scarf)" stroke="#805664" stroke-width="2.1"/>
  <path d="m87 184-12 20q8 6 17 2l12-18Z" fill="url(#scarf)" stroke="#805664" stroke-width="2"/>
  <path d="m78 200 13 4M60 178l17 7" stroke="#f5c299" stroke-width="1.5"/>
  <path d="m81 193 8 2-2 8-8-2Z" fill="#d8b49a" stroke="#7f6270" stroke-width=".8"/>
  <path d="m82 193-1 2m5-1-1 2m3 1-2-.4m1 4-2-.4m-4 0-.6 2" stroke="#786070" stroke-width="1.1"/>
  <path d="M84 173q43 21 86 0l-2 16q-41 20-81-1Z" fill="url(#scarf)" stroke="#805664" stroke-width="2.4"/>
  <path d="M94 182q34 13 66-1" stroke="#ffd2a6" stroke-width="2"/>
  <path d="m145 188 3-7m-9 9 3-7" stroke="#aa705e" stroke-width="1.1"/>
  <g transform="rotate(-6 171 208)">
    <rect x="151" y="192" width="41" height="32" rx="6" fill="url(#bag)" stroke="#59404c" stroke-width="2.1"/>
    <path d="M152 195h39v7q-20 12-39 0Z" fill="#c29272" stroke="#674854" stroke-width="1.6"/>
    <path d="M156 211v8h30v-8" stroke="#e6b58e" stroke-width=".9" stroke-dasharray="2 2.5"/>
    ${star(172, 205, 6.4)}
    <circle cx="172" cy="205" r="1.6" fill="#fff2c8"/>
    <path d="m159 193 1-8 17 1 1 7" fill="#f2dfbb" stroke="#806154" stroke-width="1.1"/>
    <path d="m161 186 7 5 8-4" stroke="#a38270" stroke-width=".8"/>
  </g>
  <circle cx="129" cy="218" r="3.6" fill="${gold}" stroke="#725267" stroke-width="1.1"/>
  <path d="M128 217h2m-2 2h2" stroke="#8f6c63" stroke-width=".65"/>`;
}

function heroFace(mood) {
  const joy = mood === 'joy';
  const tender = mood === 'tender';
  const curious = mood === 'curious';
  let eyes;
  if (joy) {
    eyes = `<path d="M89 137q12-16 24-1m31-1q11-16 23-1" stroke="#f4d39a" stroke-width="4"/>
    <path d="M91 143q10 5 20 0m34-1q10 5 19-1" stroke="#957777" stroke-width="1.2" opacity=".7"/>`;
  } else if (tender) {
    eyes = `<path d="M88 134q13 12 25 0m31 0q12 11 23-1" stroke="#e3c28d" stroke-width="3.5"/>
    <path d="M91 138l-2 3m19-2 2 3m35-4-2 3m18-3 2 3" stroke="#e3c28d" stroke-width="1.4"/>`;
  } else {
    const px = curious ? 3.5 : 0;
    const py = curious ? -4 : -1;
    eyes = `<ellipse cx="${103 + px}" cy="${135 + py}" rx="6.5" ry="10" fill="#e5b779"/>
    <ellipse cx="${151 + px}" cy="${134 + py}" rx="6.5" ry="10" fill="#e5b779"/>
    <ellipse cx="${103 + px}" cy="${138 + py}" rx="3.7" ry="5.3" fill="#d7a06b"/>
    <ellipse cx="${151 + px}" cy="${137 + py}" rx="3.7" ry="5.3" fill="#d7a06b"/>
    <ellipse cx="${104 + px}" cy="${130 + py}" rx="2.2" ry="3.5" fill="#fff5d4"/>
    <ellipse cx="${152 + px}" cy="${129 + py}" rx="2.2" ry="3.5" fill="#fff5d4"/>
    <circle cx="${99 + px}" cy="${140 + py}" r="1.2" fill="${mint}"/>
    <circle cx="${147 + px}" cy="${139 + py}" r="1.2" fill="${mint}"/>`;
  }
  return `<path d="M73 103c-6 11-7 24-4 37 3 16 12 27 23 32v15q36 22 70 0l1-15c15-7 24-20 26-36 2-14-1-25-7-33Z" fill="url(#bone)" stroke="${ink}" stroke-width="3"/>
  <path d="M78 117q-4 18 4 30" stroke="#fff9e7" stroke-width="3.1" opacity=".9"/>
  <path d="M179 129q2 19-8 29m-70 29q26 14 50 0" stroke="#be9d7e" stroke-width="1.3" opacity=".65"/>
  <path d="M82 121q17-20 37-6m20 0q17-16 34 4" stroke="#d1b493" stroke-width="1.8"/>
  <ellipse cx="101" cy="135" rx="18.5" ry="21" fill="url(#socket)"/>
  <ellipse cx="155" cy="134" rx="18.5" ry="20.5" fill="url(#socket)"/>
  <path d="M88 121q10-9 20-5m35-1q11-6 21 2" stroke="#77616b" stroke-width="1.4" opacity=".55"/>
  ${eyes}
  <ellipse cx="84" cy="156" rx="12" ry="7" fill="url(#blush)"/>
  <ellipse cx="174" cy="155" rx="12" ry="7" fill="url(#blush)"/>
  <path d="m79 155 2 2m4-3 2 2m83-1 2 2m4-3 2 2" stroke="#c69580" stroke-width=".9" opacity=".65"/>
  <path d="M128 150c-2 1-6 7-5 9 2 2 4-1 6-1s4 2 5 0c1-2-4-8-6-8Z" fill="#9f8072"/>
  <path d="M96 170q32 ${joy ? 23 : 18} 65-1" stroke="#a88a70" stroke-width="2.1"/>
  <path d="M109 177v11m13-8v12m14-12v12m13-15v11" stroke="#ad8f76" stroke-width="1.7"/>
  <path d="m96 168-3 4m68-6 3 4" stroke="#a88a70" stroke-width="1.6"/>
  ${curious ? '<path d="M86 113q10-8 21-5m40 0q10-4 20 1" stroke="#a68575" stroke-width="1.5"/>' : ''}`;
}

function insideHead(mood) {
  return `<ellipse cx="128" cy="104" rx="55" ry="13" fill="#b69983" stroke="${ink}" stroke-width="2.4"/>
  <ellipse cx="128" cy="102.5" rx="48.5" ry="9.7" fill="url(#inside)"/>
  <path d="M85 103q41 13 85 0" stroke="#c4f0d0" stroke-width="1.3" opacity=".72"/>
  <path d="M91 101q14-8 25-1t24 0 23 0" stroke="#92bdb0" stroke-width=".65" opacity=".55"/>
  ${mood === 'open' ? `<path d="M84 101V86q8-9 16-1v17" fill="#71658b" stroke="#c1a5bd" stroke-width="1"/>
    <path d="M84 87q5 8 5 14m11-15q-5 6-5 15" stroke="#c1a5bd" stroke-width="1"/>
    <path d="M94 80a7 7 0 1 0 5 12c-7 0-10-6-5-12Z" fill="#f2d59c"/>
    <path d="m149 93 10-2 1 7-10 2Z" fill="#f5ddb0" stroke="#897878" stroke-width=".8"/>
    <path d="m150 94 5 2 4-3" stroke="#967c77" stroke-width=".7"/>
    ${star(119, 57, 4, '#e8d79d')}${star(89, 69, 3, '#cbebcb')}
    <path d="M89 69q5-9 14-10" stroke="#b7decb" stroke-width=".8" stroke-dasharray="2 3" opacity=".5"/>` : ''}
  ${star(90, 101, 2.1, '#e5e4ac')}${star(164, 100, 2.7, '#f4d79d')}${star(145, 106, 2, '#c7f1d1')}`;
}

function lid(angle) {
  // The fully raised cap recedes slightly in perspective; its silhouette stays
  // inside the circular portrait instead of relying on the frame to crop it.
  const perspective = angle > 40 ? .86 : 1;
  return `<g transform="translate(182 103) rotate(${angle}) scale(${perspective}) translate(-182 -103)">
  <path d="M72 99c1-34 20-56 53-57 35-1 55 20 59 57-27 14-82 16-112 0Z" fill="url(#capBone)" stroke="${ink}" stroke-width="2.9"/>
  <path d="M73 99v6q55 19 110-1v-5q-55 16-110 0Z" fill="#c8aa84" stroke="${ink}" stroke-width="1.8"/>
  <path d="M79 101q48 13 96 0" stroke="#f5deb1" stroke-width="1.3"/>
  <path d="M83 81q8-23 30-28" stroke="#fffbea" stroke-width="4"/>
  <path d="M88 86q4-8 8-12" stroke="#fffbea" stroke-width="1.2" opacity=".75"/>
  <path d="m128 47-6 12 7 6-3 9 8 6" stroke="#b69b7e" stroke-width="1.3"/>
  <path d="m147 69 4 5 7-2" stroke="#c4a587" stroke-width=".8"/>
  <circle cx="147" cy="69" r="1.4" fill="#b7957a"/><circle cx="158" cy="72" r="1.3" fill="#b7957a"/>
  <path d="M121 104v-4q5-5 10 0v4" fill="${gold}" stroke="#8c725b" stroke-width="1.1"/>
  <path d="M124 101h4" stroke="#fff2c7" stroke-width="1"/>
  </g>
  <g transform="rotate(-10 182 105)">
    <rect x="178" y="96" width="9" height="14" rx="3" fill="#cb9e66" stroke="#785f55" stroke-width="1.2"/>
    <path d="M179 100h7m-7 5h7" stroke="#ffe6ad" stroke-width="1.4"/>
    <circle cx="182.5" cy="97.8" r="1" fill="#886b54"/><circle cx="182.5" cy="108" r="1" fill="#886b54"/>
  </g>
  <path d="M122 111v5q5 4 10 0v-5" fill="${gold}" stroke="#8b6b59" stroke-width="1.1"/>
  <circle cx="127" cy="113" r="1.2" fill="#977451"/>
  <path d="M125 112h4" stroke="#ffebbb" stroke-width=".8"/>`;
}

function heroHand(mood) {
  if (mood === 'open') return `<path d="M175 180q17-16 21-35l16 5q-3 27-24 43" fill="url(#coat)" stroke="${ink}" stroke-width="2.5"/>
  <path d="m195 144 17 6-3 8-17-7Z" fill="#b095b3" stroke="${ink}" stroke-width="1.7"/>
  <path d="M199 145q4-17-4-31l8-5q12 17 6 38Z" fill="url(#bone)" stroke="${ink}" stroke-width="2"/>
  <path d="M197 116c-8-4-9-12-6-18l-1-9c0-4 5-4 6-1l2 10 4-3 1-8c0-4 5-3 5 0l-1 14c7 6 4 13-2 16Z" fill="url(#bone)" stroke="${ink}" stroke-width="2"/>
  <path d="m196 101 3 4m5-5-3 6m-4 7 5-2M202 122l3 15" stroke="#baa07e" stroke-width="1.1"/>`;
  if (mood === 'tender') return `<path d="M178 184q14-11 14-27l12 4q0 25-19 34" fill="url(#coat)" stroke="${ink}" stroke-width="2.4"/>
  <path d="m190 155 15 5-2 8-16-6Z" fill="#b196b2" stroke="${ink}" stroke-width="1.6"/>
  <path d="M193 156q-2-16-10-27l7-6q15 12 13 36Z" fill="url(#bone)" stroke="${ink}" stroke-width="2"/>
  <path d="M185 131q-9-3-11-12l-5-9q-2-4 2-5l9 11-2-12q0-4 4-3l5 14 1-10q1-3 4-1l1 18q-1 6-8 9Z" fill="url(#bone)" stroke="${ink}" stroke-width="1.8"/>
  <path d="m181 119 5 5m5 13 6 14" stroke="#b99c7e" stroke-width="1"/>`;
  return `<path d="M73 211q1-6 8-6l10 5q4 3 0 7l-9 3q-8-1-9-9Z" fill="url(#bone)" stroke="${ink}" stroke-width="1.9"/>
  <path d="m80 209 2 6m3-4 2 5" stroke="#ba9b7e" stroke-width="1.1"/>`;
}

const heroes = {
  default: { title: '阿拾 · 掀开一点月光', description: '骨色头盖沿金色铰链轻轻掀开，拾光从缝隙探头。邮差阿拾戴着缝补过的橙色围巾，背着星扣邮包。', angle: 18, soul: [104, 88, .5, 'peek'] },
  curious: { title: '阿拾 · 头盖里的小秘密', description: '阿拾好奇地抬起眼睛，头盖斜斜掀起。拾光从铰链另一侧探出，小星星照亮头盖下的秘密。', angle: 25, soul: [107, 84, .61, 'peek'] },
  open: { title: '阿拾 · 脑袋里的星空剧场', description: '阿拾用手扶起独立的骨色头盖，露出金色铰链、脑袋里的月亮剧场和星光信件。薄荷色拾光从里面钻出来。', angle: 43, soul: [120, 77, .85, 'peek'] },
  joy: { title: '阿拾 · 笑得星星跑出来', description: '阿拾笑弯了眼睛，掀起的头盖里跳出开心的拾光。金色小星星围着头盖和缝补围巾打转。', angle: 30, soul: [113, 82, .71, 'joy'] },
  tender: { title: '阿拾 · 轻轻把光接回家', description: '阿拾温柔地扶着头盖，准备让困倦的拾光回到脑袋里。金色搭扣还没有合上，星光仍从细缝流出。', angle: 9, soul: [102, 93, .43, 'sleep'] },
};

function hero(mood, settings) {
  let detail = '';
  if (mood === 'joy') detail = `${star(60, 91, 6.5)}${star(196, 61, 5.4)}${star(52, 135, 3.3, mint)}<path d="m64 78 3-5m132-4 5-1m-151 62-5 1" stroke="${gold}" stroke-width="1.2"/>`;
  if (mood === 'curious') detail = `<path d="M59 87q-5-9 4-14 7-4 11 2 3 5-3 9l-3 3" stroke="${gold}" stroke-width="1.7"/><circle cx="66" cy="94" r="1.8" fill="${gold}"/>`;
  if (mood === 'tender') detail = `<path d="M61 98q9 5 17 0m-15 7 12-2" stroke="${mint}" stroke-width="1.3" opacity=".48"/>${star(64, 81, 4, '#dacb9d', .7)}`;
  return svg(settings.title, settings.description,
    `${heroBody()}${heroFace(mood)}${insideHead(mood)}${smallSoul(...settings.soul)}${lid(settings.angle)}${heroHand(mood)}${detail}`, 'hero');
}

const spiritOutline = 'M96 178c-31-16-40-53-22-81 11-19 30-27 42-43 6-8 9-17 8-27 26 13 25 37 43 54 24 21 29 44 23 65-6 23-27 39-50 38-12 0-20-2-27-6-5 18-20 31-36 29 11-10 18-20 19-29Z';

function soulEyes(mood) {
  if (mood === 'joy') return `<path d="M98 124q10-14 20 0m25-1q10-14 20 0" stroke="#41796d" stroke-width="4.2"/>
  <path d="M122 144q9 16 18-1Z" fill="#5f9580" stroke="#568875" stroke-width="1.5"/>
  <path d="M126 148q5-3 10 0" stroke="#e0cfaa" stroke-width="3"/>`;
  if (mood === 'sleep') return `<path d="M97 128q10 8 20 0m25-1q10 8 20 0" stroke="#538c7a" stroke-width="3.1"/>
  <path d="m99 130-2 3m7-1-1 3m53-4 2 3m-8-2 1 3" stroke="#538c7a" stroke-width="1.3"/>
  <ellipse cx="131" cy="146" rx="3.7" ry="2.4" fill="#6b9d85"/>`;
  const dx = mood === 'peek' ? 4 : mood === 'brave' ? 1 : 0;
  return `<ellipse cx="${108 + dx}" cy="123" rx="6.8" ry="11.6" fill="#41776b"/>
  <ellipse cx="${153 + dx}" cy="122" rx="6.8" ry="11.6" fill="#41776b"/>
  <ellipse cx="${109 + dx}" cy="119" rx="2" ry="3.8" fill="#efffe2"/>
  <ellipse cx="${154 + dx}" cy="118" rx="2" ry="3.8" fill="#efffe2"/>
  <circle cx="${105 + dx}" cy="128" r="1.2" fill="#aacfb2"/><circle cx="${150 + dx}" cy="127" r="1.2" fill="#aacfb2"/>
  <path d="M122 144q8 ${mood === 'brave' ? 6 : 10} 17-1" stroke="#568a77" stroke-width="2.8"/>
  ${mood === 'brave' ? '<path d="m100 106 14 3m31-1 15-4" stroke="#6ea38b" stroke-width="1.7"/>' : ''}`;
}

function soulHands(mood) {
  if (mood === 'joy') return `<path d="M83 146q-14-4-20-18-2-5-6-3-7 9 8 22l15 7m99-8q13-7 18-19 2-5 7-2 6 8-9 22l-13 7" fill="#b5ecd1" stroke="#e5f9db" stroke-width="2.4"/>`;
  if (mood === 'peek') return `<path d="M83 151q-13-5-15 3 1 8 16 4m86-22q11-12 16-6 3 6-10 14" fill="#b7efd3" stroke="#e5f9db" stroke-width="2.4"/>
  <path d="m176 132 2 4" stroke="#9ccdb6" stroke-width="1.2"/>`;
  if (mood === 'brave') return `<path d="M83 151q-18-7-19 0 2 8 19 7m95-3q11-3 20 0 7 1 6-6-4-6-22-2" fill="#b7efd3" stroke="#e5f9db" stroke-width="2.4"/>
  <path d="m197 132-1 17" stroke="#d7bb88" stroke-width="1.7"/>
  ${star(198, 127, 11, '#f3d9a0')}${star(198, 127, 5.6, '#fff5cf')}`;
  if (mood === 'sleep') return `<path d="M87 155q14 12 27 4m61-5q-15 13-28 6" stroke="#dff7d6" stroke-width="8"/>
  <path d="M88 156q14 10 26 4m61-5q-14 10-27 6" stroke="#a2d8bb" stroke-width="1.2"/>`;
  return `<path d="M84 151q-17-7-20 0-1 8 19 8m95-6q17-7 20 0 1 8-20 8" fill="#b7efd3" stroke="#e5f9db" stroke-width="2.4"/>
  <path d="m67 152 6 2m114 1 6-1" stroke="#92c8b1" stroke-width="1.1"/>`;
}

const souls = {
  default: { title: '拾光 · 住在头盖里的星光', description: '薄荷色的小幽灵拾光漂在月夜里，头顶戴着小星形额饰，眼睛闪亮，尾巴弯出一抹笑意。', transform: '' },
  peek: { title: '拾光 · 我可以探头吗', description: '拾光歪着身子偷偷探头，一只小手靠着脸颊，眼神望向阿拾掀开的头盖。额头星光和弯尾轻轻亮着。', transform: 'rotate(-9 128 132) translate(3 4)' },
  joy: { title: '拾光 · 一高兴就冒星星', description: '拾光开心地举起双手，眼睛笑成弯月，小小的嘴巴张开。薄荷色弯尾和金色星星一起跳舞。', transform: 'rotate(5 128 130) translate(-1 -2)' },
  brave: { title: '拾光 · 借你一点勇敢', description: '拾光挺起圆润的小身子，手举一盏金色星灯，明亮的眼睛带着勇气，准备照亮头盖外面的路。', transform: 'translate(0 -1)' },
  sleep: { title: '拾光 · 困了就回脑袋里', description: '拾光安静地合上眼睛，小手收在身前，尾尖软软卷起。身边一弯月亮提醒阿拾轻轻收好头盖。', transform: 'translate(128 137) scale(.89) rotate(-8) translate(-128 -128)' },
};

function soul(mood, settings) {
  let ornaments = `${star(51, 86, 7, gold, .84)}${star(195, 66, 5, '#d5edcd', .9)}${star(176, 209, 4, gold, .8)}`;
  if (mood === 'joy') ornaments += `${star(57, 116, 5)}${star(199, 106, 7)}<path d="m51 105-4-3m151-12 4-3m-18 107 4 3" stroke="${gold}" stroke-width="1.4"/>`;
  if (mood === 'brave') ornaments += `<path d="m188 109 2 3m19 1 2-3m4 16 4 1" stroke="${gold}" stroke-width="1.2"/>`;
  if (mood === 'sleep') ornaments = `<path d="M191 59a14 14 0 1 0 11 24c-13 1-20-12-11-24Z" fill="#e8d2a5" opacity=".85"/>
    <g fill="${mint}" opacity=".5"><circle cx="190" cy="104" r="3.2"/><circle cx="198" cy="95" r="2"/><circle cx="204" cy="89" r="1"/></g>
    ${star(55, 98, 4.2, gold, .55)}${star(172, 207, 3, mint, .55)}`;
  const content = `<ellipse cx="129" cy="220" rx="43" ry="7" fill="#9adfc4" opacity=".09"/>
  <ellipse cx="130" cy="129" rx="82" ry="89" fill="url(#aura)"/>
  <g transform="${settings.transform}">
  <path d="${spiritOutline}" fill="url(#soul)" stroke="url(#soulEdge)" stroke-width="3"/>
  <path d="M83 116q0-24 25-41c10-7 16-16 18-28" stroke="#faffec" stroke-width="5" opacity=".88"/>
  <path d="M172 156q11-13 12-28m-83 63-10 9" stroke="#e6f8d9" stroke-width="3" opacity=".6"/>
  <path d="M104 177q11-12 24-8 8 3 9 10" stroke="#92cdb5" stroke-width="1.1" opacity=".6"/>
  <ellipse cx="92" cy="143" rx="12" ry="6.2" fill="url(#soulBlush)"/>
  <ellipse cx="170" cy="141" rx="12" ry="6.2" fill="url(#soulBlush)"/>
  <path d="m87 142 2 1m4-2 2 1m70-1 2 1m4-2 2 1" stroke="#d3bfa0" stroke-width="1" opacity=".7"/>
  <path d="m118 87 10-3 12 2" stroke="#d9e7be" stroke-width="1" opacity=".75"/>
  ${star(130, 84, 8, '#edd6a6')}${star(130, 84, 3.5, '#fff6d1')}
  ${soulEyes(mood)}
  ${soulHands(mood)}
  <path d="m127 162 7-1 1 6-7 1Z" fill="#ecdfb8" stroke="#9fb9a0" stroke-width=".7"/>
  <path d="m128 163 3 2 3-3" stroke="#aab19a" stroke-width=".6"/>
  </g>
  ${ornaments}`;
  return svg(settings.title, settings.description, content, 'soul');
}

for (const [mood, settings] of Object.entries(heroes)) {
  const name = `portrait-hero${mood === 'default' ? '' : `-${mood}`}.svg`;
  await writeFile(resolve(output, name), hero(mood, settings));
  console.log(name);
}
for (const [mood, settings] of Object.entries(souls)) {
  const name = `portrait-soul${mood === 'default' ? '' : `-${mood}`}.svg`;
  await writeFile(resolve(output, name), soul(mood, settings));
  console.log(name);
}
