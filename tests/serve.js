/* Tiny static server for the lab + helpers shared by the browser tests.
   The CDN scripts (MathLive, Konva, CodeMirror) are served from ../vendor/node_modules when the network is closed. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const VENDOR = process.env.NED_VENDOR || path.join(ROOT, '..', 'vendor', 'node_modules');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
function start(port) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
      if (!p.startsWith(ROOT)) { rsp.statusCode = 403; return rsp.end(); }
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) { rsp.statusCode = 404; return rsp.end('nf'); }
      rsp.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream');
      fs.createReadStream(p).pipe(rsp);
    }).listen(port, () => res(srv));
  });
}
async function routeCdn(page, opts) {
  const map = [[/cdn\.jsdelivr\.net\/npm\/mathlive/, 'mathlive/mathlive.min.js'], [/konva/, 'konva/konva.min.js'], [/codemirror.*\.js/, 'codemirror/lib/codemirror.js'], [/codemirror.*\.css/, 'codemirror/lib/codemirror.css']];
  await page.route(/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/, route => {
    const u = route.request().url();
    if (opts && opts.noMath && /mathlive/.test(u)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* mathlive blocked for the fallback test */' });
    const hit = map.find(m => m[0].test(u));
    const f = hit && path.join(VENDOR, hit[1]);
    if (f && fs.existsSync(f)) return route.fulfill({ status: 200, contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) });
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  });
}
module.exports = { start, routeCdn };
