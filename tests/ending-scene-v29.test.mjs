import test from 'node:test';
import assert from 'node:assert/strict';
import { createDreamSave, chooseStoryReply, getEnding, rememberEnding } from '../dist/dream-story.js';
import { getEndingScene, renderEndingScene } from '../dist/dream-ending-scene.js';

function completed() {
  const save=createDreamSave();
  for(const chapter of save.chapters)chapter.completed=true;
  return save;
}
function fakeRoot() {
  const nodes={
    '[data-ending-letter-label]':{textContent:''},
    '[data-ending-clock-label]':{textContent:''},
    '[data-ending-sky-label]':{textContent:''},
  };
  return {dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;},querySelector(k){return nodes[k];},nodes};
}

test('four actual saved choices have three existing endings and four legible postcard combinations',()=>{
  const combinations=[
    ['send','release','dawn','晨光正升起','信已寄出','钟声向前'],
    ['send','hold','tender','晨光刚抵达窗沿','信已寄出','为想念留灯'],
    ['keep','release','tender','晨光刚抵达窗沿','信留窗边','钟声向前'],
    ['keep','hold','lanterns','长夜的窗灯亮着，太阳尚未升起','信留窗边','为想念留灯'],
  ];
  for(const [letter,clock,id,sky,letterLabel,clockLabel] of combinations){
    const save=completed();assert.equal(chooseStoryReply(save,'letter',letter),true);assert.equal(chooseStoryReply(save,'clock',clock),true);
    const prior=structuredClone(save),scene=getEndingScene(save);
    assert.equal(scene.id,getEnding(save).id);assert.deepEqual([scene.id,scene.sky,scene.letterLabel,scene.clockLabel],[id,sky,letterLabel,clockLabel]);
    assert.deepEqual(save,prior,'view model must never edit player progress');
    const root=fakeRoot();assert.equal(renderEndingScene(root,save),true);
    assert.deepEqual(root.dataset,{ending:id,letter,clock});
    assert.ok(root.attributes['aria-label'].includes(sky));
    assert.equal(root.nodes['[data-ending-sky-label]'].textContent,sky);
    assert.equal(root.nodes['[data-ending-letter-label]'].textContent,letterLabel);
    assert.equal(root.nodes['[data-ending-clock-label]'].textContent,clockLabel);
    assert.deepEqual(save,prior,'scene rendering must not grant or duplicate rewards');
    assert.equal(rememberEnding(save).id,id);assert.equal(rememberEnding(save).id,id);
    assert.deepEqual(save.discoveredEndings,[id],'one discovery per canonical ending');
  }
});

test('unfinished, unchosen or invalid saves do not invent a final scene',()=>{
  const save=createDreamSave(),root=fakeRoot();
  assert.equal(getEndingScene(save),null);assert.equal(renderEndingScene(root,save),false);
  for(const chapter of save.chapters)chapter.completed=true;
  save.choices={letter:'bad',clock:'hold'};
  assert.equal(getEndingScene(save),null);
  save.choices={letter:'keep',clock:'hold'};
  assert.equal(getEndingScene(save).id,'lanterns');
  assert.equal(renderEndingScene(null,save),false);
});
