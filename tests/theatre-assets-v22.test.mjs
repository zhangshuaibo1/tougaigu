import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEATRE_PAINT_URL, THEATRE_FALLBACK_URL, createTheatrePaintedAssets
} from '../dist/dream-theatre-painted.js';
import { DreamGame } from '../dist/dream-engine.js';

const theatre=Object.freeze({mode:'story',chapterIndex:2});
const station=Object.freeze({mode:'story',chapterIndex:0});
const greenhouse=Object.freeze({mode:'story',chapterIndex:1});
const festival=Object.freeze({mode:'festival',chapterIndex:2});
const painting=Object.freeze({complete:true,naturalWidth:3072,naturalHeight:1024});
const svg=Object.freeze({complete:true,naturalWidth:2400,naturalHeight:750});
function deferred(){
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}

test('only a real third story chapter requests the primary, sharing one pending load',async()=>{
  assert.match(THEATRE_PAINT_URL,/\/assets\/theatre-painted-v22\.webp$/);
  assert.match(THEATRE_FALLBACK_URL,/\/assets\/theatre-painted-v20\.svg$/);
  const sources=[],wait=deferred();
  const assets=createTheatrePaintedAssets({loadImage:src=>{sources.push(src);return wait.promise;}});
  for(const context of [null,station,greenhouse,festival,{mode:'story',chapterIndex:3}]){
    assert.equal(await assets.request(context),false);
    assert.equal(assets.getImage(context),null);
  }
  assert.deepEqual(sources,[]);assert.equal(assets.getStatus(),'idle');assert.equal(assets.getSource(),null);
  const first=assets.request(theatre),second=assets.request(theatre);
  assert.equal(first,second);assert.equal(assets.getStatus(),'loading');
  assert.equal(assets.getImage(theatre),null);assert.equal(assets.getSource(),null);
  await Promise.resolve();assert.deepEqual(sources,[THEATRE_PAINT_URL]);
  wait.resolve(painting);assert.equal(await first,true);
  assert.equal(assets.getStatus(),'ready');assert.equal(assets.getSource(),THEATRE_PAINT_URL);
  assert.equal(assets.getImage(theatre),painting);
  assert.equal(await assets.request(theatre),true);
  assert.deepEqual(sources,[THEATRE_PAINT_URL],'a working painting never requests its fallback');
});

test('primary rejection, synchronous throw and invalid pixels each use the original SVG once',async()=>{
  const invalid=[null,{},
    {complete:false,naturalWidth:3072,naturalHeight:1024},
    {complete:true,naturalWidth:0,naturalHeight:1024,width:3072,height:1024},
    {complete:true,naturalWidth:3072,naturalHeight:NaN},
    {width:Infinity,height:1024},
    {get naturalWidth(){throw new Error('bad image accessor');},naturalHeight:1024}
  ];
  const failures=[()=>Promise.reject(new Error('decode unavailable')),
    ()=>{throw new Error('loader threw');},...invalid.map(value=>()=>value)];
  for(const fail of failures){
    const sources=[];
    const assets=createTheatrePaintedAssets({loadImage:src=>{
      sources.push(src);return src===THEATRE_PAINT_URL?fail():svg;
    }});
    assert.equal(await assets.request(theatre),true);
    assert.equal(assets.getImage(theatre),svg);assert.equal(assets.getStatus(),'ready');
    assert.equal(assets.getSource(),THEATRE_FALLBACK_URL);
    for(let i=0;i<8;i++)assert.equal(await assets.request(theatre),true);
    assert.deepEqual(sources,[THEATRE_PAINT_URL,THEATRE_FALLBACK_URL]);
  }
});

test('both sources failing remain on procedural fallback with no request or timer retry',async()=>{
  for(const failure of [()=>Promise.reject(new Error('offline')),
    ()=>{throw new Error('decode threw');},()=>({complete:true,naturalWidth:0,naturalHeight:0})]){
    const sources=[];
    const assets=createTheatrePaintedAssets({loadImage:src=>{sources.push(src);return failure();}});
    assert.equal(await assets.request(theatre),false);
    assert.equal(assets.getStatus(),'failed');assert.equal(assets.getImage(theatre),null);
    assert.equal(assets.getSource(),null);
    for(let i=0;i<8;i++)assert.equal(await assets.request(theatre),false);
    await assets.request(station);await assets.request(theatre);
    assert.deepEqual(sources,[THEATRE_PAINT_URL,THEATRE_FALLBACK_URL]);
  }
});

test('offline Canvas images are supported and identical configured sources are not retried',async()=>{
  const canvas=Object.freeze({width:3072,height:1024}),sources=[];
  const assets=createTheatrePaintedAssets({loadImage:src=>{sources.push(src);return canvas;}});
  assert.equal(await assets.request(theatre),true);assert.equal(assets.getImage(theatre),canvas);
  assert.deepEqual(sources,[THEATRE_PAINT_URL]);
  const duplicate=[];
  const failed=createTheatrePaintedAssets({src:'same.svg',fallbackSrc:'same.svg',loadImage:src=>{
    duplicate.push(src);throw new Error('unavailable');
  }});
  assert.equal(await failed.request(theatre),false);assert.deepEqual(duplicate,['same.svg']);
});

test('destroy before the first microtask skips both requests and cannot restart',async()=>{
  const sources=[];
  const assets=createTheatrePaintedAssets({loadImage:src=>{sources.push(src);return painting;}});
  const pending=assets.request(theatre);assets.destroy();
  assert.equal(await pending,false);assert.deepEqual(sources,[]);
  assert.equal(assets.getStatus(),'destroyed');assert.equal(assets.getImage(theatre),null);
  assert.equal(assets.getSource(),null);
  assets.destroy();assert.equal(await assets.request(theatre),false);
  assert.equal(assets.getStatus(),'destroyed');assert.deepEqual(sources,[]);
});

test('destroy during a pending primary makes late success and rejection inert',async()=>{
  for(const fails of [false,true]){
    const sources=[],wait=deferred();
    const assets=createTheatrePaintedAssets({loadImage:src=>{sources.push(src);return wait.promise;}});
    const pending=assets.request(theatre);await Promise.resolve();assets.destroy();
    if(fails)wait.reject(new Error('late rejection'));else wait.resolve(painting);
    assert.equal(await pending,false);assert.equal(assets.getStatus(),'destroyed');
    assert.equal(assets.getImage(theatre),null);assert.equal(assets.getSource(),null);
    assert.equal(await assets.request(theatre),false);
    assert.deepEqual(sources,[THEATRE_PAINT_URL],'late primary failure must not start an SVG request');
  }
});

test('destruction in the boundary after primary failure cancels the fallback request',async()=>{
  const sources=[],wait=deferred();
  const assets=createTheatrePaintedAssets({loadImage:src=>{sources.push(src);return wait.promise;}});
  const pending=assets.request(theatre);await Promise.resolve();
  wait.reject(new Error('primary failed'));await Promise.resolve();assets.destroy();
  assert.equal(await pending,false);assert.equal(assets.getStatus(),'destroyed');
  assert.deepEqual(sources,[THEATRE_PAINT_URL]);assert.equal(assets.getSource(),null);
});

test('destruction while the SVG is pending rejects late fallback success and failure',async()=>{
  for(const fails of [false,true]){
    const sources=[],fallback=deferred(),started=deferred();
    const assets=createTheatrePaintedAssets({loadImage:src=>{
      sources.push(src);
      if(src===THEATRE_PAINT_URL)throw new Error('primary unavailable');
      started.resolve();return fallback.promise;
    }});
    const pending=assets.request(theatre);await started.promise;assets.destroy();
    if(fails)fallback.reject(new Error('late fallback failure'));else fallback.resolve(svg);
    assert.equal(await pending,false);assert.equal(assets.getStatus(),'destroyed');
    assert.equal(assets.getImage(theatre),null);assert.equal(assets.getSource(),null);
    assert.equal(await assets.request(theatre),false);
    assert.deepEqual(sources,[THEATRE_PAINT_URL,THEATRE_FALLBACK_URL]);
  }
});

test('destroy releases ready primary and fallback images, and a fresh cache may load again',async()=>{
  for(const fallback of [false,true]){
    const sources=[];
    const loader=src=>{sources.push(src);if(fallback&&src===THEATRE_PAINT_URL)throw new Error('primary');return fallback?svg:painting;};
    const assets=createTheatrePaintedAssets({loadImage:loader});
    assert.equal(await assets.request(theatre),true);assets.destroy();
    assert.equal(assets.getStatus(),'destroyed');assert.equal(assets.getImage(theatre),null);
    assert.equal(assets.getSource(),null);assert.equal(await assets.request(theatre),false);
    assert.equal(sources.length,fallback?2:1);
    const next=createTheatrePaintedAssets({loadImage:loader});
    assert.equal(await next.request(theatre),true);assert.equal(next.getImage(theatre),fallback?svg:painting);
    assert.equal(sources.length,fallback?4:2);next.destroy();
  }
});

test('a late decode is cached across chapters but cannot paint outside the theatre',async()=>{
  for(const fallback of [false,true]){
    const sources=[],wait=deferred(),started=deferred();
    const assets=createTheatrePaintedAssets({loadImage:src=>{
      sources.push(src);
      if(fallback&&src===THEATRE_PAINT_URL)throw new Error('primary');
      started.resolve();return wait.promise;
    }});
    const pending=assets.request(theatre);await started.promise;
    for(const elsewhere of [station,greenhouse,festival]){
      assert.equal(await assets.request(elsewhere),false);assert.equal(assets.getImage(elsewhere),null);
    }
    wait.resolve(fallback?svg:painting);assert.equal(await pending,true);
    for(const elsewhere of [station,greenhouse,festival])assert.equal(assets.getImage(elsewhere),null);
    assert.equal(await assets.request(theatre),true);
    assert.equal(assets.getImage(theatre),fallback?svg:painting);
    assert.equal(assets.getSource(),fallback?THEATRE_FALLBACK_URL:THEATRE_PAINT_URL);
    assert.deepEqual(sources,fallback?[THEATRE_PAINT_URL,THEATRE_FALLBACK_URL]:[THEATRE_PAINT_URL]);
  }
});

test('browser handlers exist before src and are cleared after success, errors and setter throws',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'Image');
  try{
    for(const primary of ['ready','error','throw','invalid']){
      const images=[];
      globalThis.Image=class {
        constructor(){images.push(this);this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}
        set src(value){
          this.source=value;assert.equal(typeof this.onload,'function');assert.equal(typeof this.onerror,'function');
          if(value===THEATRE_PAINT_URL&&primary==='throw')throw new Error('src setter failed');
          queueMicrotask(()=>{
            if(value===THEATRE_PAINT_URL&&primary==='error'){this.onerror();return;}
            this.complete=true;
            if(value!==THEATRE_PAINT_URL||primary!=='invalid'){
              this.naturalWidth=value===THEATRE_PAINT_URL?3072:2400;
              this.naturalHeight=value===THEATRE_PAINT_URL?1024:750;
            }
            this.onload();
          });
        }
      };
      const assets=createTheatrePaintedAssets();assert.equal(await assets.request(theatre),true);
      const expected=primary==='ready'?[THEATRE_PAINT_URL]:[THEATRE_PAINT_URL,THEATRE_FALLBACK_URL];
      assert.deepEqual(images.map(image=>image.source),expected);
      assert.equal(assets.getSource(),expected.at(-1));assert.equal(assets.getImage(theatre),images.at(-1));
      for(const image of images){assert.equal(image.decoding,'async');assert.equal(image.onload,null);assert.equal(image.onerror,null);}
      assets.destroy();
    }
  }finally{if(original)Object.defineProperty(globalThis,'Image',original);else delete globalThis.Image;}
});

test('missing browser Image fails harmlessly and stays on procedural fallback',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'Image');
  try{
    delete globalThis.Image;
    const assets=createTheatrePaintedAssets();
    assert.equal(await assets.request(theatre),false);assert.equal(assets.getStatus(),'failed');
    assert.equal(assets.getImage(theatre),null);assert.equal(assets.getSource(),null);
    assert.equal(await assets.request(theatre),false);assets.destroy();
  }finally{if(original)Object.defineProperty(globalThis,'Image',original);else delete globalThis.Image;}
});

test('resolving either source or failing both never changes a paused live run or its real lamps',async()=>{
  const names=['window','document','requestAnimationFrame','cancelAnimationFrame'];
  const previous=names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]);
  const noop=()=>{};
  globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
  globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
  const context=new Proxy({measureText:text=>({width:String(text).length*8}),
    createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})
  },{get:(target,key)=>key in target?target[key]:noop});
  const state=game=>JSON.stringify({snapshot:game.getSnapshot(),body:game.body,soul:game.soul,
    cap:game.cap,runId:game.runId,lanterns:game.lanterns,memories:game.memories,movers:game.movers,
    light:game.theatreLight,level:game.level,input:game.input,options:game.options});
  try{
    for(const result of ['primary','fallback','failed']){
      const wait=deferred(),sources=[];
      const game=new DreamGame({getContext:()=>context,getBoundingClientRect:()=>({width:390,height:640})},{},{
        loadTheatreImage:src=>{sources.push(src);if(src===THEATRE_PAINT_URL)return wait.promise;
          if(result==='failed')throw new Error('fallback also failed');return svg;}
      });
      try{
        game.start({chapterIndex:2,sound:false});game.pause();
        const pending=game.theatreScenes.request(theatre),before=state(game);
        if(result==='primary')wait.resolve(painting);else wait.reject(new Error('primary failed'));
        assert.equal(await pending,result!=='failed');
        assert.equal(state(game),before,'image completion must not advance or rewrite the run');
        assert.deepEqual(game.lanterns.map(lamp=>lamp.lit),[false,false]);
        assert.deepEqual(sources,result==='primary'?[THEATRE_PAINT_URL]:[THEATRE_PAINT_URL,THEATRE_FALLBACK_URL]);
      }finally{game.destroy();}
    }
  }finally{
    for(const [name,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
  }
});
