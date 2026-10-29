// Background-only inspection: unmodified source pixels are cropped/scaled into
// comparison windows. This is not a game composition or a device/browser test.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const directory=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(directory,'../../..');
const output=resolve(directory,'inspection');
const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{
  paths:[repoRoot,process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']
}));
await mkdir(output,{recursive:true});
const source=await loadImage(resolve(directory,'coast-painted-v27.webp'));
const layout={width:2400,height:800,y:-52};
const report={
  purpose:'Background-only left/middle/right crop inspection, not gameplay, HUD, browser or device validation.',
  source:'docs/art/coast-v27/coast-painted-v27.webp',
  sourcePixels:{width:source.width,height:source.height},
  previewLayout:layout,
  productionLayoutImplemented:false,
  gameCompositionPerformed:false,
  note:'Preview dimensions reuse prior offline review sizes. Positions sample the image, not the actual game camera or parallax.',
  sheets:[]
};
for(const [label,width,height] of [['desktop',1100,640],['phone-390',390,595],['phone-320',320,431]]){
  const scale=height/640;
  const viewWidth=width/scale;
  const sheet=createCanvas(width*3,height);
  const sheetContext=sheet.getContext('2d');
  const windows=[];
  for(const [index,position] of ['left','middle','right'].entries()){
    const horizontalOffset=index/2*(layout.width-viewWidth);
    const canvas=createCanvas(width,height);
    const context=canvas.getContext('2d');
    context.imageSmoothingEnabled=true;
    context.imageSmoothingQuality='high';
    context.setTransform(scale,0,0,scale,0,0);
    context.drawImage(source,-horizontalOffset,layout.y,layout.width,layout.height);
    const pixels=context.getImageData(0,0,width,height);
    let transparentPixels=0;
    for(let i=3;i<pixels.data.length;i+=4)if(pixels.data[i]!==255)transparentPixels++;
    sheetContext.putImageData(pixels,index*width,0);
    windows.push({position,scale,viewWidth,horizontalOffset,transparentPixels,
      sourceRect:{
        x:horizontalOffset/layout.width*source.width,
        y:-layout.y/layout.height*source.height,
        width:viewWidth/layout.width*source.width,
        height:640/layout.height*source.height
      }
    });
  }
  const file=label+'-left-middle-right.png';
  await writeFile(resolve(output,file),await sheet.encode('png'));
  report.sheets.push({file:'docs/art/coast-v27/inspection/'+file,width:width*3,height,windows});
}
await writeFile(resolve(directory,'crop-report-v27.json'),JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify({sourcePixels:report.sourcePixels,sheets:report.sheets.map(x=>x.file),windows:9,
  allWindowsOpaque:report.sheets.every(x=>x.windows.every(w=>w.transparentPixels===0))})+'\n');
