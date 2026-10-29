// Asset inspection only: crop and resize the unchanged background pixels.
// This is not a production layout, game render or browser screenshot.
import {createRequire} from 'node:module';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const directory=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(directory,'../../..');
let output=null,nativeOnly=false;
for(let i=2;i<process.argv.length;i++){
  const argument=process.argv[i];
  if(argument==='--output'){
    if(!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw new Error('--output needs a directory');
    output=resolve(process.argv[++i]);
  }else if(argument==='--native-only')nativeOnly=true;
  else if(argument==='--help'){
    process.stdout.write('Usage: node docs/art/library-v26/inspect-crops.mjs [--output DIRECTORY] [--native-only]\n');
    process.stdout.write('Default: inspect 13 windows and 5 comparison sheets in a new temporary directory.\n');
    process.stdout.write('--native-only: export one full-size decoded WebP inspection PNG, with no cropping or scaling.\n');
    process.exit(0);
  }else throw new Error('Unknown argument: '+argument);
}
const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{
  // Same optional Canvas lookup used by the project's offline renderers,
  // with the checkout root included so invocation need not run from its cwd.
  paths:[repoRoot,process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']
}));
const image=await loadImage(resolve(directory,'library-painted-v26.webp'));
const out=output||await mkdtemp(join(tmpdir(),'tougaigu-v26-crops-'));
await mkdir(out,{recursive:true});
const background={width:2400,height:800,y:-52};
const report={
  purpose:'Unmodified background crop/resize inspection; no game state, gameplay objects or HUD. Not a browser/device test.',
  mode:nativeOnly?'native-size':'window-crops',
  productionLayoutImplemented:false,
  gameCompositionPerformed:false,
  source:'docs/art/library-v26/library-painted-v26.webp',
  sourcePixels:{width:image.width,height:image.height},
  previewLayout:nativeOnly?null:background,
  note:'Canvas heights reuse prior offline review sizes only. Fractions sample the image itself, not the actual game camera/parallax mapping.',
  crops:[]
};
let comparisonSheets=0;
if(nativeOnly){
  const canvas=createCanvas(image.width,image.height);
  canvas.getContext('2d').drawImage(image,0,0);
  const file='source-native-size.png';
  await writeFile(resolve(out,file),await canvas.encode('png'));
  report.crops.push({file,width:image.width,height:image.height,position:'native',scale:1,
    sourceRect:{x:0,y:0,width:image.width,height:image.height}});
}else{
for(const [label,width,height] of [['desktop',1100,640],['phone-390',390,595],['phone-320',320,431]]){
  const scale=height/640,viewWidth=width/scale;
  const sheet=createCanvas(width*3,height),sc=sheet.getContext('2d');
  for(const [index,position] of ['left','middle','right'].entries()){
    const fraction=index/2;
    const horizontalOffset=fraction*(background.width-viewWidth);
    const canvas=createCanvas(width,height),c=canvas.getContext('2d');
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.setTransform(scale,0,0,scale,0,0);
    c.drawImage(image,-horizontalOffset,background.y,background.width,background.height);
    const pixels=c.getImageData(0,0,width,height);
    sc.putImageData(pixels,index*width,0);
    const file=label+'-'+position+'.png';
    await writeFile(resolve(out,file),await canvas.encode('png'));
    report.crops.push({file,width,height,position,scale,viewWidth,horizontalOffset,
      sourceRect:{x:horizontalOffset/background.width*image.width,y:-background.y/background.height*image.height,
        width:viewWidth/background.width*image.width,height:640/background.height*image.height}});
  }
  await writeFile(resolve(out,label+'-left-middle-right.png'),await sheet.encode('png'));
  comparisonSheets++;
  if(label.startsWith('phone')){
    const warmSheet=createCanvas(width*2,height),warmContext=warmSheet.getContext('2d');
    for(const [index,center] of [.27,.77].entries()){
      const horizontalOffset=center*background.width-viewWidth/2;
      const canvas=createCanvas(width,height),c=canvas.getContext('2d');
      c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
      c.setTransform(scale,0,0,scale,0,0);
      c.drawImage(image,-horizontalOffset,background.y,background.width,background.height);
      warmContext.putImageData(c.getImageData(0,0,width,height),index*width,0);
      const file=label+'-paper-window-'+(index+1)+'.png';
      await writeFile(resolve(out,file),await canvas.encode('png'));
      report.crops.push({file,width,height,position:'paper-window-'+(index+1),
        approximateSourceCenterX:center,scale,viewWidth,horizontalOffset});
    }
    await writeFile(resolve(out,label+'-paper-windows.png'),await warmSheet.encode('png'));
    comparisonSheets++;
  }
}
}
// Keep the archived historical crop report and original assets untouched.
const reportPath=resolve(out,'inspection-report.json');
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify({crops:report.crops.length,comparisonSheets,output:out,report:reportPath})+'\n');
