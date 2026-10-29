import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { renderEndingScene } from '../dist/dream-ending-art.js';
import { ENDINGS, getEnding, validateDreamSave } from '../dist/dream-story.js';

test('all real story choices resolve to distinct, stable, self-contained ending scenes', () => {
  const scenes = new Set();
  for (const [letter, clock, id] of [
    ['send', 'release', 'dawn'], ['keep', 'hold', 'lanterns'],
    ['send', 'hold', 'tender'], ['keep', 'release', 'tender'],
  ]) {
    const save = validateDreamSave({});
    save.chapters[5].completed = true;
    save.choices = { letter, clock };
    const ending = getEnding(save), before = JSON.stringify(save);
    assert.equal(ending.id, id);
    const html = renderEndingScene(ending.id);
    assert.equal(JSON.stringify(save), before);
    assert.equal(html, renderEndingScene(ending.id));
    assert.ok(html.includes(`data-ending-scene="${id}"`));
    assert.ok(html.includes('viewBox="0 0 640 340"'));
    assert.ok(html.includes('data-character="ashi"'));
    assert.ok(html.includes('data-character="shiguang"'));
    assert.ok(html.includes('data-art="post-office"'));
    assert.ok(html.length > 9000 && html.length < 30000);
    scenes.add(html);
  }
  assert.equal(scenes.size, 3);
});

test('each epilogue expresses its own story action, including a sunless lantern night', () => {
  const dawn = renderEndingScene('dawn');
  const night = renderEndingScene('lanterns');
  const tender = renderEndingScene('tender');
  assert.match(dawn, /data-art="rising-sun"/);
  assert.match(dawn, /data-art="delivery-slot"/);
  assert.match(dawn, /data-art="first-train"/);
  assert.doesNotMatch(night, /data-art="rising-sun"/);
  assert.equal((night.match(/data-art="paper-lantern"/g) || []).length, 3);
  assert.match(night, /data-art="empty-chair"/);
  assert.match(night, /data-pose="inviting"/);
  assert.match(tender, /data-art="reading-bench"/);
  assert.match(tender, /data-pose="reading"/);
  assert.match(tender, /data-art="blank-page"/);
  assert.match(tender, /data-art="folded-whale"/);
  assert.doesNotMatch(tender, /data-art="rising-sun"|data-art="delivery-slot"/);
});

test('invalid and hostile values produce no false ending or injected markup', () => {
  const hostile = { toString() { throw new Error('must not coerce'); } };
  for (const value of [undefined, null, false, 0, NaN, '', 'DAWN', 'constructor', '__proto__', 'toString', '<script>alert(1)</script>', hostile, ['dawn'], Symbol('dawn')]) {
    assert.equal(renderEndingScene(value), '');
  }
});

test('the static illustrations have accessible names and only internal SVG references', () => {
  const allIds = new Set();
  for (const id of Object.keys(ENDINGS)) {
    const html = renderEndingScene(id);
    assert.doesNotMatch(html, /<(?:script|iframe|foreignObject|image|animate|set|audio|video)\b|\son\w+\s*=|javascript:|(?:href|src)\s*=/i);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const svgId of ids) {
      assert.ok(!allIds.has(svgId), 'different ending scenes do not share SVG IDs');
      allIds.add(svgId);
    }
    for (const ref of html.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref[1]));
    for (const url of html.matchAll(/url\(([^)]+)\)/g)) assert.ok(url[1].startsWith('#'));
    const names = html.match(/aria-labelledby="([^"]+)"/)[1].split(' ');
    for (const name of names) assert.ok(ids.includes(name));
    assert.match(html, /role="img"/);
    assert.match(html, /<title[^>]*>[^<]+<\/title>/);
    assert.match(html, /<desc[^>]*>[^<]+<\/desc>/);
  }
});

test('ending styles are isolated, readable on phones, scrollable and respect both reduced-motion sources', async () => {
  const css = await readFile(new URL('../dist/dream-ending.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\binfinite\b|position:\s*(?:fixed|absolute)/);
  assert.doesNotMatch(css.match(/#ending-dialog\s*\{([^}]+)\}/)[1], /overflow:\s*hidden/);
  assert.match(css, /overflow:\s*auto/);
  assert.match(css, /max-height:\s*calc\(100dvh/);
  assert.match(css, /#ending-dialog \.ending-text p\s*\{\s*font-size:\s*14px;/);
  assert.match(css, /#ending-dialog \.ending-collection\s*\{\s*font-size:\s*11px;/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /#ending-dialog\[open\]\[data-reduced-motion="true"\]/);
  assert.match(css, /animation:\s*none/);
  // Every qualified selector is scoped to the existing ending dialog; the
  // two keyframe steps are local to its single, finite entrance animation.
  for (const selector of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)) {
    const text = selector[1].trim();
    if (text.startsWith('@') || ['from', 'to'].includes(text)) continue;
    assert.ok(text.split(',').every(part => part.includes('#ending-dialog')), text);
  }
});

test('OS and both app reduced-motion selectors override the actual open-dialog animation specificity', async () => {
  const css = await readFile(new URL('../dist/dream-ending.css', import.meta.url), 'utf8');
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const active = rules.find(([, , body]) => /animation:\s*tougaigu-ending-arrive/.test(body));
  assert.ok(active);
  // These intentionally simple qualified selectors contain only IDs,
  // classes and attributes. Attribute values do not contain selector tokens.
  const weight = selector => [
    (selector.match(/#[\w-]+/g) || []).length,
    (selector.match(/\.[\w-]+|\[[^\]]+\]/g) || []).length,
  ];
  const normal = weight(active[1]);
  let overrides = 0;
  for (const [, selectors, body] of rules.filter(([, , body]) => /animation:\s*none/.test(body))) {
    for (const selector of selectors.split(',')) {
      const specific = weight(selector);
      assert.ok(specific[0] > normal[0] || (specific[0] === normal[0] && specific[1] >= normal[1]), `Reduced motion must win against the open-dialog rule: ${selector}`);
      assert.ok(css.indexOf(selectors) > css.indexOf(active[1]), 'equal-specificity reduced-motion declarations follow the entrance');
      overrides++;
    }
  }
  assert.equal(overrides, 3, 'OS preference, dialog setting and ancestor setting all disable the entrance');
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*#ending-dialog\[open\] \.ending-vignette-art\s*\{\s*animation:\s*none;/);
});
