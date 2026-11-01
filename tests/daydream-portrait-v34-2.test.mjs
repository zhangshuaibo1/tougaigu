import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const moods = ['base', 'curious', 'open', 'joy', 'tender'];
const pathFor = mood => new URL('../dist/assets/portrait-hero' + (mood === 'base' ? '' : '-' + mood) + '.svg', import.meta.url);
const portraits = Object.fromEntries(moods.map(mood => [mood, readFileSync(pathFor(mood), 'utf8')]));

test('every production Ashi portrait is a self-contained, semantic, natural-face SVG', () => {
  for (const [mood, source] of Object.entries(portraits)) {
    assert.match(source, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, mood);
    assert.match(source, /viewBox="0 0 256 256"/, mood);
    assert.match(source, /aria-labelledby="title desc"/, mood);
    assert.match(source, /<title id="title">阿拾/, mood);
    assert.match(source, /<desc id="desc">原创清梦海岸邮差阿拾/, mood);
    assert.match(source, /id="skin"/, mood);
    assert.match(source, /id="hair"/, mood);
    assert.match(source, /id="scarf"/, mood);
    assert.match(source, /id="thought"/, mood);
    assert.match(source, /<circle cx="128" cy="128" r="116"/, mood);
    assert.match(source, /<\/svg>\s*$/, mood);
    assert.doesNotMatch(source, /<(?:script|image|foreignObject|animate|set)\b|(?:https?:)?\/\/(?!www\.w3\.org)|\bon(?:load|error|click)\s*=|(?:bone|skull|socket|helmet)/i, mood);
  }
});

test('four dialogue moods are genuine expressions, not renamed identical image files', () => {
  assert.equal(new Set(Object.values(portraits)).size, 5);
  assert.match(portraits.curious, /扬起眉毛/);
  assert.match(portraits.open, /眼中映出好奇的星光/);
  assert.match(portraits.joy, /闭眼露出真诚的笑容/);
  assert.match(portraits.tender, /缓缓垂眼倾听朋友/);
  assert.match(portraits.joy, /M101 139Q111 127 122 139/);
  assert.match(portraits.tender, /M101 140Q111 134 122 140/);
  assert.match(portraits.open, /<ellipse cx="130" cy="166"/);
});

test('live player portrait routes retain their pre-existing names, including bubble and archive', () => {
  const app = readFileSync(new URL('../dist/dream-app.js', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../dist/game-shell.js', import.meta.url), 'utf8');
  const cap = readFileSync(new URL('../dist/cap-book.js', import.meta.url), 'utf8');
  assert.match(app, /'portrait-' \+ \(line\.speaker === 'ashi' \? 'hero-' : 'soul-'\)/);
  assert.match(app, /portrait-hero\.svg/);
  assert.match(shell, /portrait-hero\.svg/);
  assert.match(cap, /portrait-hero-open\.svg/);
  for (const mood of moods) assert.ok(portraits[mood].length > 3000, 'missing painted layers: ' + mood);
});
