// Actual raster envelopes of Bluepage's production painter. These explicit
// painter-view combinations test geometry, not dialogue unlock or saved facts.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url)),output=resolve(process.argv[2]||'/tmp/tougaigu-v27-library-npc-pixels.json');
const require=createRequire(import.meta.url),{createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[root,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const {drawStoryNPC,STORY_NPC_BOUNDS}=await import(pathToFileURL(resolve(root,'dist/dream-encounter-art.js')));
const {getStoryNPC}=await import(pathToFileURL(resolve(root,'dist/dream-encounters.js')));
const hash=x=>createHash('sha256').update(x).digest('hex'),anchor={x:160,y:190},samples=[];
for(const seals of [0,1,2])for(const form of ['body','soul'])for(const talking of [false,true])for(const time of [0,.7,2.8,5.2]){
  const c=createCanvas(320,240),ctx=c.getContext('2d'),view={...getStoryNPC(3),chapterIndex:3,near:true,form,talking,seals,capOpen:form==='soul'?1:0,look:{x:120,y:470}};
  const before=JSON.stringify(view);ctx.translate(anchor.x-view.x,anchor.y-view.y);drawStoryNPC(ctx,view,time,false);assert.equal(JSON.stringify(view),before);
  const rgba=ctx.getImageData(0,0,320,240).data;let left=320,right=-1,top=240,bottom=-1,pixels=0;
  for(let y=0;y<240;y++)for(let x=0;x<320;x++)if(rgba[(y*320+x)*4+3]>=1){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);pixels++;}
  assert.ok(pixels>0&&left>0&&top>0&&right<319&&bottom<239,'Measurement canvas must not clip the figure');
  const relative={left:left-anchor.x,right:right-anchor.x,top:top-anchor.y,bottom:bottom-anchor.y};
  const within=relative.left>=STORY_NPC_BOUNDS.left-1&&relative.right<=STORY_NPC_BOUNDS.right+1&&relative.top>=STORY_NPC_BOUNDS.top-1&&relative.bottom<=STORY_NPC_BOUNDS.bottom+1;
  samples.push({seals,form,talking,time,alphaThreshold:1,relative,pixels,withinAuthoredBounds:within,pixelSha256:hash(rgba)});
}
const report={scope:'Production Bluepage painter rendered to real Node Canvas across 48 explicit view/time fixtures: 0/1/2 lamps, body/soul-open, idle/talking and four times. No game geometry, physics, save, unlock or dialog behavior inferred.',fontLimitation:'Chinese glyphs are unavailable in this offline host. This result covers actually drawn vector character/prop/shadow/label-background geometry, not Chinese label glyphs; browser CI remains authoritative for labels.',sourceSha256:hash(await readFile(resolve(root,'dist/dream-encounter-art.js'))),authoredBounds:STORY_NPC_BOUNDS,antialiasAllowance:1,samples,allWithinAuthoredBounds:samples.every(s=>s.withinAuthoredBounds),union:{left:Math.min(...samples.map(s=>s.relative.left)),right:Math.max(...samples.map(s=>s.relative.right)),top:Math.min(...samples.map(s=>s.relative.top)),bottom:Math.max(...samples.map(s=>s.relative.bottom))}};
await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,samples:samples.length,allWithinAuthoredBounds:report.allWithinAuthoredBounds,union:report.union}));
assert.equal(report.allWithinAuthoredBounds,true,'Actual Bluepage vector pixels must stay inside the established silhouette');
