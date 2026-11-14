const { chromium } = require('playwright');
const { start, routeCdn } = require('./serve.js');
(async () => {
  const srv = await start(3210);
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text()));
  await routeCdn(page);
  await page.goto('http://localhost:3210/index.html'); await page.waitForTimeout(800);
  const ids = await page.evaluate(() => Object.keys(Ned.registry).map(id => [id, (Ned.registry[id].meta.samples || []).length]));
  console.log('math-field defined:', await page.evaluate(() => !!customElements.get('math-field')), 'konva:', await page.evaluate(() => typeof Konva));
  for (const [id, n] of ids) for (let s = 0; s < Math.max(1, n); s++) {
    const before = errs.length;
    await page.evaluate(([i, k]) => NedLab.load(i, k), [id, s]); await page.waitForTimeout(250);
    if (process.argv[2] === 'shots' && ['formula','mcq','match','table','prose','label','place','logic','flowfill','plot','econ','text'].includes(id)) await page.screenshot({ path: `/tmp/shot-${id}-${s}.png` });
    if (errs.length > before) console.log('ERR', id, s, errs.slice(before).join(' | '));
  }
  console.log(errs.join('\n')); console.log('interfaces:', ids.map(x => x[0]).join(', ')); console.log('errors:', errs.length);
  await b.close(); srv.close();
})();
