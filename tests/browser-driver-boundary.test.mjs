import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('browser input driver accepts stopped observations exactly on its input dead-zone boundary',()=>{
  // Exercise the actual Python controller with read-only observations. This
  // creates no browser, uses no Playwright package and injects no game state.
  // The first case reproduces the v21 docs CI failure at x=433, target=445.
  const script=String.raw`
import ast, asyncio, time
from pathlib import Path
source=ast.parse(Path('scripts/browser-smoke.py').read_text())
function=next(n for n in source.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='drive_to')
namespace={'time':time}
exec(compile(ast.Module(body=[function],type_ignores=[]),'browser-controller-fixture','exec'),namespace)
class Keyboard:
    async def up(self,key): raise AssertionError('a stopped boundary observation should require no input')
    async def down(self,key): raise AssertionError('a stopped boundary observation should require no input')
class Page:
    def __init__(self,point): self.point=point; self.keyboard=Keyboard(); self.reads=0
    async def evaluate(self,expression): self.reads+=1; return self.point
    async def wait_for_timeout(self,milliseconds):
        raise AssertionError('the controller entered the old dead-zone wait instead of arriving')
async def run():
    for x,y,target_x,target_y in [(433,560,445,None),(457,560,445,None),(515,273,515,285),(515,297,515,285)]:
        page=Page({'state':'playing','form':'body' if target_y is None else 'soul','x':x,'y':y,'vx':0,'vy':0})
        await namespace['drive_to'](page,target_x,target_y,limit=.02)
        assert page.reads==1
    print('four exact-boundary observations arrived without extra input or waiting')
asyncio.run(run())
`;
  const result=spawnSync('python3',['-c',script],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
  assert.match(result.stdout,/four exact-boundary observations/);
});
