import test from 'node:test';
import assert from 'node:assert/strict';
import { drawTravelerCoat, getTravelerMotion } from '../dist/dream-traveler-art.js';
import { getOutfitPalette } from '../dist/dream-festival-art.js';

function painter() {
  let depth=0,strokeStyle='',fillStyle='';
  const strokes=[],fills=[];
  const c={
    strokes,fills,balanced(){assert.equal(depth,0);},
    save(){depth++;},restore(){assert.ok(depth>0);depth--;},
    beginPath(){},closePath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},
    bezierCurveTo(){},roundRect(){},ellipse(){},
    createLinearGradient(){return {addColorStop(){}};},
    stroke(){strokes.push(strokeStyle);},fill(){fills.push(fillStyle);},
  };
  Object.defineProperties(c,{
    strokeStyle:{get(){return strokeStyle;},set(v){strokeStyle=v;}},
    fillStyle:{get(){return fillStyle;},set(v){fillStyle=v;}},
    lineWidth:{writable:true,value:1},
    lineCap:{writable:true,value:'butt'},
    lineJoin:{writable:true,value:'miter'}
  });
  return c;
}
test('the actual everyday Canvas coat displays two rucksack straps and a blue collar, not the old cross-body mailbag',()=>{
  const c=painter();
  drawTravelerCoat(c,getTravelerMotion({grounded:true,vx:70,walk:.6}),getOutfitPalette(null));
  c.balanced();
  assert.equal(c.strokes.filter(x=>x==='#304d69').length,2);
  assert.equal(c.strokes.filter(x=>x==='#6d94ae').length,2);
  assert.equal(c.strokes.filter(x=>x==='#b5d2e2').length,1);
  assert.equal(c.strokes.includes('#987a60'),false);
});
test('festival outfits keep their original scarf and diagonal strap',()=>{
  const c=painter();
  drawTravelerCoat(c,getTravelerMotion({grounded:true,vx:0,walk:0},{reducedMotion:true}),getOutfitPalette('spring'));
  c.balanced();
  assert.ok(c.strokes.includes('#987a60'));
  assert.ok(!c.strokes.includes('#304d69'));
});
test('reduced-motion everyday jacket has no independent fabric clock',()=>{
  const render=time=>{
    const c=painter();
    drawTravelerCoat(c,getTravelerMotion({grounded:true,vx:200,walk:time},{time,reducedMotion:true}),getOutfitPalette(null));
    c.balanced();
    return c.strokes;
  };
  assert.deepEqual(render(0),render(100));
});
