// Give every browser module dependency the same release identity. The inline
// import map precedes the entry module; source imports and Node module identity
// stay unchanged. Updating only an entry URL cannot invalidate its imports.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, extname, relative } from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const version=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Expected a numeric release version.');
const check=process.argv.includes('--check');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]);
const dist=join(root,'dist'),files=walk(dist);
const imports=Object.fromEntries(files.filter(path=>extname(path)==='.js').sort().map(path=>{
  const key='./'+relative(dist,path).replaceAll('\\','/');return [key,key+'?v='+version];
}));
const mapTag='<script type="importmap" id="release-modules">'+JSON.stringify({imports})+'</script>';
const stamp=ref=>{
  if(!ref.startsWith('./')&&!ref.startsWith('../'))return ref;
  const [beforeHash,...hash]=ref.split('#'),base=beforeHash.split('?')[0];
  if(!/\.(?:js|css)$/.test(base))return ref;
  return base+'?v='+version+(hash.length?'#'+hash.join('#'):'');
};
let refs=0,changed=0;
for(const path of files){
  const extension=extname(path);if(extension!=='.html')continue;
  const before=readFileSync(path,'utf8');
  let after=before.replace(/(<meta\s+name=["']application-version["']\s+content=["'])[^"']+(["'])/g,'$1'+version+'$2');
  after=after.replace(/(\b(?:src|href)\s*=\s*["'])([^"']+)(["'])/g,(match,prefix,ref,suffix)=>{
    const next=stamp(ref);if(next!==ref||/\.(?:js|css)(?:[?#]|$)/.test(ref))refs++;
    return prefix+next+suffix;
  });
  if(/<script\b[^>]*\btype=["']module["']/.test(after)){
    after=after.replace(/<script\b[^>]*\bid=["']release-modules["'][^>]*>[\s\S]*?<\/script>\s*/g,'');
    after=after.replace(/(?=<script\b[^>]*\btype=["']module["'])/,mapTag+'\n');
    refs+=Object.keys(imports).length;
  }
  if(after!==before){changed++;if(check)console.error('Stale release reference: '+path.slice(root.length));else writeFileSync(path,after);}
}
if(check&&changed)process.exitCode=1;
else console.log(`${check?'Verified':'Stamped'} ${refs} asset references for ${version}; ${changed} files ${check?'need changes':'updated'}.`);
