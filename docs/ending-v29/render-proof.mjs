// Reproducible offline proof of the actual static SVG returned by production.
// This does not test browser layout, Chinese font rendering, touch or gameplay.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderEndingScene } from '../../dist/dream-ending-art.js';

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(require.resolve('@napi-rs/canvas', {
  paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || ''],
}));
const output = resolve(process.argv[2] || '/tmp/tougaigu-v29-ending-art');
await mkdir(output, { recursive: true });
const sha = data => createHash('sha256').update(data).digest('hex');
const rows = [];
// Actual light-halo pixels outside the character silhouette. This protects
// the observed SVG renderer regression in which an ellipse radial fill
// incorrectly became an opaque black disk; the supported circle stays light.
const haloSample = { dawn: [184, 180], lanterns: [351, 191], tender: [343, 239] };
for (const id of ['dawn', 'lanterns', 'tender']) {
  const markup = renderEndingScene(id);
  const svg = markup.match(/<svg\b[\s\S]*?<\/svg>/)[0];
  const image = await loadImage(Buffer.from(svg));
  assert.equal(image.width, 640); assert.equal(image.height, 340);
  for (const [label, width, height] of [['native', 640, 340], ['phone-art', 260, 138]]) {
    const canvas = createCanvas(width, height), c = canvas.getContext('2d');
    c.drawImage(image, 0, 0, width, height);
    const buffer = await canvas.encode('png');
    const name = `${id}-${label}.png`;
    await writeFile(resolve(output, name), buffer);
    const pixels = c.getImageData(0, 0, width, height).data;
    const [sampleX, sampleY] = haloSample[id].map((v, axis) => Math.floor(v * (axis ? height / 340 : width / 640)));
    const at = (sampleY * width + sampleX) * 4;
    const haloPixel = Array.from(pixels.subarray(at, at + 4));
    assert.ok(haloPixel[0] + haloPixel[1] + haloPixel[2] > 130, 'the actual spirit halo must not render an opaque black disk');
    let opaque = 0, colors = new Set();
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] >= 250) opaque++;
      colors.add(`${pixels[i]}:${pixels[i+1]}:${pixels[i+2]}:${pixels[i+3]}`);
    }
    assert.ok(opaque / (width * height) > .96);
    assert.ok(colors.size > 1500, 'gradients, outlines and texture actually render');
    rows.push({ id, label, name, width, height, bytes: buffer.length,
      sha256: sha(buffer), markupSha256: sha(markup), svgSha256: sha(svg),
      opaqueFraction: opaque / (width * height), distinctColors: colors.size, haloPixel });
  }
}
const moduleBytes = await readFile(new URL('../../dist/dream-ending-art.js', import.meta.url));
const report = { scope: 'Offline rasterization of production SVG. Not browser, dialog, Chinese-text, input, animation, or real-device evidence.',
  moduleSha256: sha(moduleBytes), files: rows };
await writeFile(resolve(output, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
