import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
let failed = false;
let scripts = 0;
let references = 0;
for (const path of walk(dist)) {
  if (extname(path) === '.js') {
    scripts++;
    const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
    if (result.status !== 0) failed = true;
  }
  if (!['.html', '.js'].includes(extname(path))) continue;
  const content = readFileSync(path, 'utf8');
  const pattern = extname(path) === '.html' ? /\b(?:src|href)=["']([^"']+)["']/g : /\bfrom\s+["'](\.[^"']+)["']/g;
  for (const [, value] of content.matchAll(pattern)) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(value)) continue;
    const local = value.split(/[?#]/)[0];
    if (!local) continue;
    references++;
    if (local.startsWith('/') || !existsSync(resolve(dirname(path), local))) {
      console.error(`Invalid static reference: ${path} → ${value}`);
      failed = true;
    }
  }
}
if (failed) process.exitCode = 1;
else console.log(`Checked ${scripts} JavaScript modules and ${references} local references.`);
